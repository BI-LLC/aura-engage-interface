# AURA Voice AI - Main FastAPI Application
# Clean, working prototype for startup

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict
from typing import Dict, Optional
import logging
from contextlib import asynccontextmanager
import uuid
from datetime import datetime

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances - will be initialized in lifespan
smart_router = None
memory_engine = None
voice_pipeline = None
streaming_handler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global smart_router, memory_engine, voice_pipeline, streaming_handler
    
    logger.info("🚀 AURA Voice AI starting up...")
    
    try:
        # Import services here to avoid circular imports
        from app.services.smart_router import SmartRouter
        from app.services.memory_engine import MemoryEngine
        from app.services.voice_pipeline import VoicePipeline
        from app.config import settings
        
        # Initialize services
        smart_router = SmartRouter()
        memory_engine = MemoryEngine()
        voice_pipeline = VoicePipeline()
        
        logger.info(f"Grok API configured: {bool(getattr(settings, 'GROK_API_KEY', None))}")
        logger.info(f"OpenAI API configured: {bool(getattr(settings, 'OPENAI_API_KEY', None))}")
        logger.info(f"ElevenLabs API configured: {bool(getattr(settings, 'ELEVENLABS_API_KEY', None))}")
        
        # Connect memory engine
        await memory_engine.connect()
        
        # Start health monitor
        await smart_router.start_health_monitor()
        
        logger.info("✅ AURA Voice AI started successfully!")
        
    except Exception as e:
        logger.error(f"Failed to start AURA Voice AI: {e}")
        # Continue anyway for development
    
    yield
    
    # Shutdown
    logger.info("Shutting down AURA Voice AI...")

# Create FastAPI app
app = FastAPI(
    title="AURA Voice AI",
    description="AI Voice Assistant - Clean Startup Prototype",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    use_memory: bool = True
    stream: bool = False

class ChatResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    response: str
    model_used: str
    response_time: float
    cost: float
    session_id: str
    memory_used: bool
    streaming_available: bool = True

# Basic endpoints
@app.get("/")
async def root():
    return {
        "name": "AURA Voice AI",
        "status": "running",
        "version": "1.0.0",
        "phase": "Clean Startup Prototype",
        "features": [
            "Smart LLM Routing",
            "Memory System", 
            "Voice Input (STT)",
            "Voice Output (TTS)",
            "Streaming Audio"
        ]
    }

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    if not smart_router:
        return {"status": "starting", "message": "Services are initializing"}
    
    try:
        health_status = await smart_router.get_health_status()
        memory_status = "connected" if memory_engine and memory_engine.connected else "disconnected"
        voice_status = voice_pipeline.get_pipeline_status() if voice_pipeline else {}
        
        healthy_count = sum(1 for k, v in health_status.items() 
                           if isinstance(v, dict) and v.get("status") == "healthy")
        
        return {
            "status": "healthy" if healthy_count >= 1 else "degraded",
            "apis": health_status,
            "memory": memory_status,
            "voice": {
                "whisper": voice_status.get("whisper_available", False),
                "elevenlabs": voice_status.get("elevenlabs_available", False),
                "functional": voice_status.get("fully_functional", False)
            },
            "healthy_apis": f"{healthy_count}/2"
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint with LLM routing"""
    if not smart_router:
        raise HTTPException(status_code=503, detail="System starting up")
    
    try:
        # Generate session ID
        session_id = request.session_id or str(uuid.uuid4())
        
        # Check if streaming is requested
        if request.stream:
            return ChatResponse(
                response="Use /stream/chat endpoint for streaming responses",
                model_used="streaming",
                response_time=0.0,
                cost=0.0,
                session_id=session_id,
                memory_used=request.use_memory,
                streaming_available=True
            )
        
        # Get memory context if needed
        context = {}
        memory_used = False
        
        if request.use_memory and request.user_id and memory_engine:
            try:
                preferences = await memory_engine.get_user_preferences(request.user_id)
                if preferences:
                    context["user_preferences"] = {
                        "communication_style": preferences.communication_style,
                        "response_pace": preferences.response_pace,
                        "expertise_areas": preferences.expertise_areas[:3] if preferences.expertise_areas else [],
                        "preferred_examples": preferences.preferred_examples
                    }
                    memory_used = True
                    
                    # Add context to message
                    context_prompt = f"""
                    User preferences:
                    - Communication style: {preferences.communication_style}
                    - Response pace: {preferences.response_pace}
                    - Areas of interest: {', '.join(preferences.expertise_areas[:3]) if preferences.expertise_areas else 'general'}
                    
                    User message: {request.message}
                    
                    Please respond according to the user's preferences.
                    """
                    result = await smart_router.route_message(context_prompt)
                else:
                    result = await smart_router.route_message(request.message)
            except Exception as e:
                logger.warning(f"Memory system error: {e}")
                result = await smart_router.route_message(request.message)
        else:
            result = await smart_router.route_message(request.message)
        
        if result.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {result.error}")
        
        # Store session context if user provided
        if request.user_id and memory_engine:
            try:
                await memory_engine.store_session_context(
                    session_id,
                    request.user_id,
                    {
                        "last_message": request.message,
                        "last_response": result.content[:500],
                        "model_used": result.model_used,
                        "timestamp": datetime.now().isoformat()
                    }
                )
            except Exception as e:
                logger.warning(f"Failed to store session context: {e}")
        
        return ChatResponse(
            response=result.content,
            model_used=result.model_used,
            response_time=result.response_time,
            cost=result.cost,
            session_id=session_id,
            memory_used=memory_used,
            streaming_available=True
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Get system statistics"""
    if not smart_router:
        return {"message": "System starting up"}
    
    try:
        memory_stats = {
            "connected": memory_engine.connected if memory_engine else False,
            "using_redis": not memory_engine.use_fallback if memory_engine else False
        }
        
        voice_stats = voice_pipeline.get_pipeline_status() if voice_pipeline else {}
        
        return {
            "costs": smart_router.get_cost_summary() if hasattr(smart_router, 'get_cost_summary') else {},
            "total_requests": smart_router.get_request_count() if hasattr(smart_router, 'get_request_count') else 0,
            "health": await smart_router.get_health_status(),
            "memory": memory_stats,
            "voice": voice_stats
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {"error": str(e)}

def voice_call_page():
    """Simple voice call interface - NOT async"""
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>AURA Voice Call</title>
        <meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
            }
            
            .call-container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 30px;
                padding: 40px;
                text-align: center;
                min-width: 400px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            }
            
            .avatar {
                width: 150px;
                height: 150px;
                margin: 0 auto 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 60px;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.05); opacity: 1; }
            }
            
            .call-button {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: none;
                background: #ff4757;
                color: white;
                font-size: 30px;
                cursor: pointer;
                transition: all 0.3s;
                margin: 30px auto;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 30px rgba(255, 71, 87, 0.5);
            }
            
            .call-button.active {
                background: #00d464;
                animation: pulse 1.5s infinite;
                box-shadow: 0 10px 30px rgba(0, 212, 100, 0.5);
            }
            
            .call-button:hover {
                transform: scale(1.1);
            }
            
            .status {
                font-size: 18px;
                margin: 20px 0;
                opacity: 0.9;
            }
            
            .transcript {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 15px;
                padding: 20px;
                margin-top: 30px;
                max-height: 200px;
                overflow-y: auto;
                text-align: left;
            }
            
            .message {
                margin: 10px 0;
                padding: 10px;
                border-radius: 10px;
                animation: fadeIn 0.3s;
            }
            
            .message.user {
                background: rgba(102, 126, 234, 0.3);
                margin-left: 20%;
            }
            
            .message.ai {
                background: rgba(118, 75, 162, 0.3);
                margin-right: 20%;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    </head>
    <body>
        <div class="call-container">
            <div class="avatar">
                <span>🎤</span>
            </div>
            
            <h1 style="margin-bottom: 10px;">AURA Voice Assistant</h1>
            <div class="status">Click to start talking</div>
            
            <button class="call-button" onclick="startCall()">
                <span>📞</span>
            </button>
            
            <div class="transcript">
                <div style="text-align: center; opacity: 0.5;">Voice functionality coming soon...</div>
            </div>
        </div>
        
        <script>
            function startCall() {
                const button = document.querySelector('.call-button');
                const status = document.querySelector('.status');
                
                if (button.classList.contains('active')) {
                    // End call
                    button.classList.remove('active');
                    button.innerHTML = '<span>📞</span>';
                    status.textContent = 'Call ended';
                } else {
                    // Start call
                    button.classList.add('active');
                    button.innerHTML = '<span>📱</span>';
                    status.textContent = 'Voice features coming soon!';
                    
                    // Add a message to transcript
                    const transcript = document.querySelector('.transcript');
                    transcript.innerHTML = `
                        <div class="message ai">
                            <strong>AI:</strong> Hello! Voice features are being implemented. 
                            For now, please use the text chat interface.
                        </div>
                    `;
                }
            }
        </script>
    </body>
    </html>
    """)

# Add this endpoint to your main.py
@app.get("/call", response_class=HTMLResponse)
def call_interface():
    """Voice call interface endpoint"""
    return voice_call_page()

# Simple test endpoint
@app.get("/test")
async def test_endpoint():
    return {"message": "AURA Voice AI is running!", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)