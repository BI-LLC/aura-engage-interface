# backend/app/main.py
"""
AURA Voice AI - Main FastAPI Application
Phase 3: Integrated with Document Processing & Knowledge Base
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from typing import Dict, Optional
import logging
from contextlib import asynccontextmanager
import uuid
from datetime import datetime
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global service instances
smart_router = None
memory_engine = None
voice_pipeline = None
streaming_handler = None
doc_processor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global smart_router, memory_engine, voice_pipeline, streaming_handler, doc_processor
    
    logger.info("🚀 AURA Voice AI starting up...")
    logger.info("📚 Phase 3: Document Processing & Knowledge Base")
    
    try:
        # Import services
        from app.services.smart_router import SmartRouter
        from app.services.memory_engine import MemoryEngine
        from app.services.voice_pipeline import VoicePipeline
        from app.services.streaming_handler import StreamingHandler
        from app.services.document_processor import DocumentProcessor
        from app.config import settings
        
        # Initialize core services
        smart_router = SmartRouter()
        memory_engine = MemoryEngine()
        voice_pipeline = VoicePipeline()
        streaming_handler = StreamingHandler(voice_pipeline)
        doc_processor = DocumentProcessor()
        
        # Log configuration status
        logger.info(f"✅ Smart Router: Grok={bool(settings.GROK_API_KEY)}, OpenAI={bool(settings.OPENAI_API_KEY)}")
        logger.info(f"✅ Voice Pipeline: ElevenLabs={bool(settings.ELEVENLABS_API_KEY)}")
        logger.info(f"✅ Document Processor: Initialized with {len(doc_processor.documents)} existing documents")
        
        # Connect memory engine
        await memory_engine.connect()
        
        # Start health monitor
        await smart_router.start_health_monitor()
        
        # Setup routers with services
        from app.routers import chat, voice, memory, streaming
        from app.routers import documents  # New document router
        
        # Inject services into routers
        chat.set_services(smart_router, memory_engine, doc_processor)
        voice.set_services(smart_router, memory_engine)
        memory.memory_engine = memory_engine
        streaming.set_services(streaming_handler, smart_router, voice_pipeline, memory_engine)
        documents.doc_processor = doc_processor
        
        logger.info("✅ AURA Voice AI started successfully!")
        logger.info("📄 Document upload endpoint ready at /documents/upload")
        
    except Exception as e:
        logger.error(f"Failed to start AURA Voice AI: {e}")
        # Continue anyway for development
    
    yield
    
    # Shutdown
    logger.info("Shutting down AURA Voice AI...")

# Create FastAPI app
app = FastAPI(
    title="AURA Voice AI",
    description="AI Voice Assistant with Personal Knowledge Base",
    version="3.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.routers import chat, voice, memory, streaming, documents

app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(memory.router)
app.include_router(streaming.router)
app.include_router(documents.router)  # New document router

# Request/Response models for root endpoints
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    use_memory: bool = True
    use_documents: bool = True  # New field
    stream: bool = False

class ChatResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    response: str
    model_used: str
    response_time: float
    cost: float
    session_id: str
    memory_used: bool
    documents_used: bool
    streaming_available: bool = True

# Root endpoint
@app.get("/")
async def root():
    """Main API information endpoint"""
    doc_count = len(doc_processor.documents) if doc_processor else 0
    
    return {
        "name": "AURA Voice AI",
        "version": "3.0.0",
        "status": "running",
        "phase": "Phase 3: Document Processing & Knowledge Base",
        "features": [
            "Smart LLM Routing (Grok + GPT-4)",
            "Memory System (Preferences & History)",
            "Voice Input/Output (STT + TTS)",
            "Streaming Audio",
            "📚 Personal Knowledge Base (NEW)",
            "📄 Document Processing (PDF, Word, TXT, MD)"
        ],
        "knowledge_base": {
            "documents": doc_count,
            "ready": doc_count > 0
        },
        "endpoints": {
            "chat": "/chat",
            "documents": "/documents/upload",
            "voice": "/voice",
            "knowledge": "/documents/list"
        }
    }

@app.get("/health")
async def health_check():
    """Enhanced health check with document processor status"""
    if not smart_router:
        return {"status": "starting", "message": "Services are initializing"}
    
    try:
        # Get service statuses
        health_status = await smart_router.get_health_status()
        memory_status = "connected" if memory_engine and memory_engine.connected else "disconnected"
        voice_status = voice_pipeline.get_pipeline_status() if voice_pipeline else {}
        
        # Document processor status
        doc_status = {
            "initialized": doc_processor is not None,
            "documents": len(doc_processor.documents) if doc_processor else 0,
            "embeddings_enabled": bool(doc_processor.openai_key) if doc_processor else False
        }
        
        healthy_count = sum(1 for k, v in health_status.items() 
                           if isinstance(v, dict) and v.get("status") == "healthy")
        
        return {
            "status": "healthy" if healthy_count >= 1 else "degraded",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "llm_routing": health_status,
                "memory": memory_status,
                "voice": {
                    "stt": voice_status.get("whisper_available", False),
                    "tts": voice_status.get("elevenlabs_available", False),
                    "functional": voice_status.get("fully_functional", False)
                },
                "documents": doc_status
            },
            "healthy_apis": f"{healthy_count}/2"
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Enhanced chat endpoint with document knowledge integration
    Now searches your personal documents to provide better answers
    """
    if not smart_router:
        raise HTTPException(status_code=503, detail="System starting up")
    
    try:
        # Generate session ID
        session_id = request.session_id or str(uuid.uuid4())[:8]
        user_id = request.user_id or "default_user"
        
        # Build context
        enhanced_message = request.message
        documents_used = False
        memory_used = False
        
        # Add document context if available
        if request.use_documents and doc_processor:
            doc_context = doc_processor.get_context_for_chat(
                query=request.message,
                user_id=user_id
            )
            if doc_context:
                enhanced_message = f"{doc_context}\n\n{request.message}"
                documents_used = True
                logger.info(f"Using document context for query: {request.message[:50]}...")
        
        # Add memory context if available
        if request.use_memory and request.user_id and memory_engine:
            preferences = await memory_engine.get_user_preferences(request.user_id)
            if preferences:
                memory_used = True
                # Context already added in chat router
        
        # Route to LLM
        result = await smart_router.route_message(enhanced_message)
        
        if result.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {result.error}")
        
        # Store session if user provided
        if request.user_id and memory_engine:
            await memory_engine.store_session_context(
                session_id,
                request.user_id,
                {
                    "message": request.message,
                    "response": result.content[:500],
                    "model": result.model_used,
                    "documents_used": documents_used,
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        return ChatResponse(
            response=result.content,
            model_used=result.model_used,
            response_time=result.response_time,
            cost=result.cost,
            session_id=session_id,
            memory_used=memory_used,
            documents_used=documents_used,
            streaming_available=True
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Enhanced statistics including document processing"""
    if not smart_router:
        return {"message": "System starting up"}
    
    try:
        # Memory stats
        memory_stats = {
            "connected": memory_engine.connected if memory_engine else False,
            "using_redis": not memory_engine.use_fallback if memory_engine else False
        }
        
        # Voice stats
        voice_stats = voice_pipeline.get_pipeline_status() if voice_pipeline else {}
        
        # Document stats
        doc_stats = {
            "total_documents": len(doc_processor.documents) if doc_processor else 0,
            "embeddings_cached": len(doc_processor.embeddings_cache) if doc_processor else 0,
            "storage_path": str(doc_processor.storage_dir) if doc_processor else None
        }
        
        return {
            "timestamp": datetime.now().isoformat(),
            "costs": smart_router.get_cost_summary() if hasattr(smart_router, 'get_cost_summary') else {},
            "total_requests": smart_router.get_request_count() if hasattr(smart_router, 'get_request_count') else 0,
            "health": await smart_router.get_health_status(),
            "memory": memory_stats,
            "voice": voice_stats,
            "documents": doc_stats,
            "phase": "Phase 3: Document Processing Active"
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {"error": str(e)}

# Simple web interface for testing
@app.get("/test", response_class=HTMLResponse)
async def test_interface():
    """Simple test interface for document upload"""
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>AURA - Document Upload Test</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                margin-bottom: 10px;
            }
            .subtitle {
                color: #666;
                margin-bottom: 30px;
            }
            .upload-area {
                border: 2px dashed #ddd;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                background: #f8f9fa;
            }
            .upload-area:hover {
                border-color: #667eea;
                background: #f0f0ff;
            }
            .upload-area.dragover {
                border-color: #667eea;
                background: #e8e8ff;
            }
            input[type="file"] {
                display: none;
            }
            .file-list {
                margin-top: 30px;
            }
            .file-item {
                padding: 10px;
                background: #f8f9fa;
                border-radius: 5px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .status {
                padding: 10px;
                border-radius: 5px;
                margin-top: 20px;
                display: none;
            }
            .status.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .status.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            button {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
            }
            button:hover {
                background: #5a67d8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📚 AURA Knowledge Base</h1>
            <p class="subtitle">Upload documents to enhance AI responses</p>
            
            <div class="upload-area" onclick="document.getElementById('fileInput').click()">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p style="margin-top: 20px; color: #666;">Drop files here or click to upload</p>
                <p style="font-size: 14px; color: #999;">PDF, Word, TXT, or Markdown (max 10MB)</p>
            </div>
            
            <input type="file" id="fileInput" accept=".pdf,.docx,.doc,.txt,.md" onchange="uploadFile(this)">
            
            <div class="status" id="status"></div>
            
            <div class="file-list" id="fileList">
                <h3>Your Documents</h3>
                <p style="color: #999;">Loading...</p>
            </div>
        </div>
        
        <script>
            // Drag and drop
            const uploadArea = document.querySelector('.upload-area');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, preventDefaults, false);
            });
            
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('dragover');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('dragover');
                }, false);
            });
            
            uploadArea.addEventListener('drop', handleDrop, false);
            
            function handleDrop(e) {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    uploadFile({ files: [files[0]] });
                }
            }
            
            async function uploadFile(input) {
                const file = input.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                
                const status = document.getElementById('status');
                status.className = 'status';
                status.textContent = 'Uploading and processing...';
                status.style.display = 'block';
                
                try {
                    const response = await fetch('/documents/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        status.className = 'status success';
                        status.textContent = `✓ ${file.name} uploaded successfully!`;
                        loadDocuments();
                    } else {
                        status.className = 'status error';
                        status.textContent = data.detail || 'Upload failed';
                    }
                } catch (error) {
                    status.className = 'status error';
                    status.textContent = 'Upload failed: ' + error.message;
                }
                
                // Clear file input
                input.value = '';
            }
            
            async function loadDocuments() {
                try {
                    const response = await fetch('/documents/list');
                    const data = await response.json();
                    
                    const fileList = document.getElementById('fileList');
                    
                    if (data.documents && data.documents.length > 0) {
                        fileList.innerHTML = '<h3>Your Documents</h3>' + 
                            data.documents.map(doc => `
                                <div class="file-item">
                                    <div>
                                        <strong>${doc.filename}</strong>
                                        <br>
                                        <small style="color: #999;">
                                            ${doc.chunk_count} chunks • ${doc.total_tokens} tokens
                                        </small>
                                    </div>
                                    <button onclick="deleteDoc('${doc.document_id}')">Delete</button>
                                </div>
                            `).join('');
                    } else {
                        fileList.innerHTML = '<h3>Your Documents</h3><p style="color: #999;">No documents uploaded yet</p>';
                    }
                } catch (error) {
                    console.error('Failed to load documents:', error);
                }
            }
            
            async function deleteDoc(docId) {
                if (!confirm('Delete this document?')) return;
                
                try {
                    await fetch(`/documents/${docId}`, { method: 'DELETE' });
                    loadDocuments();
                } catch (error) {
                    console.error('Failed to delete:', error);
                }
            }
            
            // Load documents on page load
            loadDocuments();
        </script>
    </body>
    </html>
    """)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)