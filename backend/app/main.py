# Main FastAPI application
# Multi-tenant voice AI platform with isolated data per organization

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, List
import logging
import os
import asyncio
import uuid

# Configure logging for the app
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Multi-tenant system components
from app.services.tenant_manager import TenantManager
from app.services.auth_service import TenantAuthService
from app.middleware.tenant_middleware import TenantMiddleware
from app.models.tenant import TenantModel, TenantUserModel

# Shared service instances
tenant_manager = None
auth_service = None
tenant_aware_services = {}
smart_router = None
memory_engine = None
voice_pipeline = None

data_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start up all the multi-tenant services
    global tenant_manager, auth_service, tenant_aware_services
    global smart_router, memory_engine, voice_pipeline, data_service, persona_manager
    
    # PREVENT DUPLICATE INITIALIZATION
    if smart_router is None:  # Only initialize once
        logger.info("🚀 AURA Voice AI starting up...")
        
        try:
            # Initialize core services
            tenant_manager = TenantManager()
            auth_service = TenantAuthService()
            
            # Initialize tenant-aware services
            from app.services.tenant_aware_services import (
                TenantAwareDataIngestion,
                TenantAwareSmartRouter,
                TenantAwareVoicePipeline
            )
            
            tenant_aware_services = {
                "data_ingestion": TenantAwareDataIngestion(tenant_manager),
                "smart_router": TenantAwareSmartRouter(tenant_manager),
                "voice_pipeline": TenantAwareVoicePipeline(tenant_manager)
            }
        
            # Initialize regular services for non-tenant endpoints
            from app.services.smart_router import SmartRouter
            from app.services.memory_engine import MemoryEngine
            from app.services.voice_pipeline import VoicePipeline
            from app.services.data_ingestion import DataIngestionService
            from app.services.continuous_conversation import ContinuousConversationManager
            from app.services.persona_manager import PersonaManager
            
            smart_router = SmartRouter()
            memory_engine = MemoryEngine()
            voice_pipeline = VoicePipeline()
            persona_manager = PersonaManager()
            data_service = DataIngestionService()
            
            # Initialize continuous conversation manager
            conversation_manager = ContinuousConversationManager(
                voice_pipeline=voice_pipeline,
                smart_router=smart_router,
                tenant_manager=tenant_manager
            )
            
            # Start health monitor
            await smart_router.start_health_monitor()
        
            logger.info("AURA Voice AI services initialized successfully")
            
            # Import and setup all routers
            from app.routers import (
                chat, voice, admin, memory, streaming, 
                documents, continuous_voice, tenant_admin
            )
            
            # Set services in routers that need them
            if hasattr(chat, 'set_services'):
                chat.set_services(smart_router, memory_engine)
            if hasattr(voice, 'set_services'):
                voice.set_services(smart_router, memory_engine)
            if hasattr(admin, 'set_services'):
                admin.set_services(smart_router, memory_engine, voice_pipeline)
            if hasattr(streaming, 'set_services'):
                streaming.set_services(smart_router, voice_pipeline, memory_engine)
            
            # Set services for continuous voice router
            if hasattr(continuous_voice, 'set_services'):
                continuous_voice.set_services(conversation_manager, auth_service)
        
            # Add all routers to app
            app.include_router(chat.router)
            app.include_router(voice.router)
            app.include_router(admin.router)
            app.include_router(memory.router)
            app.include_router(streaming.router)
            app.include_router(documents.router)
            app.include_router(continuous_voice.router)
            app.include_router(tenant_admin.router)
        
            logger.info("✅ AURA Voice AI: All routers and services connected successfully!")
            
            # Log configuration status
            try:
                from app.config import settings
                logger.info("API Configuration Status:")
                logger.info(f"  - OpenAI: {'✓' if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY else '✗'}")
                logger.info(f"  - ElevenLabs: {'✓' if hasattr(settings, 'ELEVENLABS_API_KEY') and settings.ELEVENLABS_API_KEY else '✗'}")
                logger.info(f"  - Grok: {'✓' if hasattr(settings, 'GROK_API_KEY') and settings.GROK_API_KEY else '✗'}")
            except ImportError:
                logger.warning("Config module not found - using environment variables")
        
        except Exception as e:
            logger.error(f"Startup error: {e}")
            import traceback
            traceback.print_exc()
    else:
        logger.info("♻️ Services already initialized, skipping...")
    
    yield
    
    logger.info("Shutting down AURA Voice AI...")

# Create FastAPI app
app = FastAPI(
    title="AURA Voice AI - Multi-Tenant",
    description="Personalized AI for Every Organization",
    version="4.0.0",
    lifespan=lifespan
)

# Add tenant isolation middleware
# app.add_middleware(TenantMiddleware, auth_service=auth_service)

# CORS for subdomains and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://*.iaura.com", 
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:5173",  # Vite default port
        "http://localhost:4173",  # Vite preview port
        "http://127.0.0.1:4173",  # Vite preview port
        "http://localhost:8080",  # Frontend port
        "http://127.0.0.1:8080",  # Frontend port
        "http://157.245.192.221:3000",  # DigitalOcean frontend
        "http://157.245.192.221:8000",  # DigitalOcean API
        "http://157.245.192.221:8765",  # DigitalOcean WebSocket
        "*"  # Allow all origins for development (remove in production)
    ],  # Allow subdomains, local dev, and DigitalOcean
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with system info"""
    return {
        "name": "AURA Voice AI",
        "status": "running",
        "version": "4.0.0",
        "mode": "multi-tenant",
        "endpoints": {
            "chat": "/chat/",
            "voice": "/voice/status",
            "admin": "/admin/dashboard",
            "documents": "/documents/upload",
            "health": "/health",
            "test_ui": "/test"
        }
    }

# Authentication endpoints

@app.post("/api/login")
async def login(email: str, password: str, tenant_subdomain: str):
    # Login endpoint for tenant users
    # Get tenant by subdomain
    tenant = await tenant_manager.get_tenant_by_subdomain(tenant_subdomain)
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Authenticate within tenant
    result = await auth_service.login(email, password, tenant.tenant_id)
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return result

# Chat endpoints with tenant isolation

@app.post("/api/chat")
async def chat_with_tenant_context(
    request: Request,
    message: str
):
    # Process chat using only tenant's data
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    # Get tenant's knowledge context
    router = tenant_aware_services["smart_router"]
    
    # Route message with tenant isolation
    response = await router.route_message(
        message=message,
        tenant_id=tenant_id,
        user_id=user_id
    )
    
    return {
        "response": response.content,
        "model_used": response.model_used,
        "tenant": request.state.organization,
        "sources": response.sources
    }

@app.get("/health")
async def health_check():
    # Basic health check endpoint
    health_data = {
        "status": "healthy",
        "mode": "multi-tenant",
        "services": {
            "tenant_manager": tenant_manager is not None,
            "auth_service": auth_service is not None,
            "smart_router": smart_router is not None,
            "memory": memory_engine is not None,
            "voice": voice_pipeline is not None,
            "persona": persona_manager is not None,
            "data_service": data_service is not None
        },
        "tenant_services": {
            "data_ingestion": "data_ingestion" in tenant_aware_services,
            "smart_router": "smart_router" in tenant_aware_services,
            "voice_pipeline": "voice_pipeline" in tenant_aware_services
        },
        "tenants_active": len(tenant_manager.tenants) if tenant_manager else 0
    }
    
    # Add API health if available
    if smart_router:
        try:
            health_data["apis"] = await smart_router.get_health_status()
        except Exception as e:
            health_data["api_check_error"] = str(e)
    
    return health_data

@app.get("/stats")
async def get_stats():
    """Get system statistics - ENSURE ALWAYS RETURNS JSON"""
    try:
        if not smart_router:
            return {
                "status": "initializing",
                "message": "System starting up",
                "costs": {},
                "total_requests": 0,
                "health": {},
                "memory": {"connected": False},
                "voice": {"functional": False}
            }
        
        # Get stats safely with error handling
        costs = {}
        total_requests = 0
        health = {}
        
        try:
            costs = smart_router.get_cost_summary() if hasattr(smart_router, 'get_cost_summary') else {}
        except Exception as e:
            logger.error(f"Cost summary error: {e}")
        
        try:
            total_requests = smart_router.get_request_count() if hasattr(smart_router, 'get_request_count') else 0
        except Exception as e:
            logger.error(f"Request count error: {e}")
        
        try:
            health = await smart_router.get_health_status() if smart_router else {}
        except Exception as e:
            logger.error(f"Health status error: {e}")
            health = {"error": str(e)}
        
        memory_stats = {
            "connected": memory_engine.connected if memory_engine else False,
            "using_redis": not memory_engine.use_fallback if memory_engine else False
        }
        
        voice_stats = voice_pipeline.get_pipeline_status() if voice_pipeline else {"functional": False}
        
        return {
            "status": "operational",
            "costs": costs,
            "total_requests": total_requests,
            "health": health,
            "memory": memory_stats,
            "voice": voice_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        # ALWAYS return JSON, never plain text
        logger.error(f"Stats error: {e}")
        return {
            "status": "error",
            "error": str(e),
            "message": "Error retrieving system statistics",
            "costs": {},
            "total_requests": 0,
            "health": {},
            "memory": {"connected": False},
            "voice": {"functional": False}
        }

# Document management endpoints

@app.post("/api/documents/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...)
):
    # Upload document to tenant's knowledge base
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    # Validate file
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large")
    
    # Process with tenant isolation
    data_service = tenant_aware_services["data_ingestion"]
    
    # Save to tenant's isolated storage
    temp_path = f"/tmp/{tenant_id}_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    
    # Ingest into tenant's knowledge base
    document = await data_service.ingest_file(
        file_path=temp_path,
        tenant_id=tenant_id,
        user_id=user_id,
        metadata={
            "original_name": file.filename,
            "uploaded_by": user_id,
            "organization": request.state.organization
        }
    )
    
    # Clean up
    os.remove(temp_path)
    
    return {
        "success": True,
        "document_id": document.doc_id,
        "message": f"Added to {request.state.organization}'s knowledge base"
    }

@app.get("/api/documents")
async def get_tenant_documents(request: Request):
    # Get documents for current tenant
    tenant_id = request.state.tenant_id
    
    data_service = tenant_aware_services["data_ingestion"]
    documents = await data_service.get_tenant_documents(tenant_id)
    
    return {
        "organization": request.state.organization,
        "documents": documents,
        "count": len(documents)
    }

# Tenant onboarding endpoints

@app.post("/internal/onboard-tenant")
async def onboard_new_tenant(
    organization_name: str,
    admin_email: str,
    subscription_tier: str,
    api_key: str
):
    # Create new tenant organization
    # Verify internal API key
    if api_key != os.getenv("INTERNAL_API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    # Create tenant
    tenant = await tenant_manager.create_tenant(
        organization_name=organization_name,
        admin_email=admin_email,
        subscription_tier=subscription_tier
    )
    
    # Create admin account
    temp_password = generate_secure_password()
    admin = await auth_service.create_tenant_admin(
        tenant_id=tenant.tenant_id,
        email=admin_email,
        password=temp_password,
        organization_name=organization_name
    )
    
    # Send welcome email
    await send_welcome_email(
        admin_email,
        organization_name,
        tenant.tenant_id,
        temp_password
    )
    
    return {
        "success": True,
        "tenant_id": tenant.tenant_id,
        "login_url": f"https://{organization_name.lower().replace(' ', '-')}.aura-voice-ai.com"
    }

# Helper functions

def generate_secure_password() -> str:
    # Generate random password for new tenants
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))

async def send_welcome_email(email: str, org_name: str, tenant_id: str, password: str):
    # Send welcome email to new tenant admin
    logger.info(f"Sending welcome email to {email} for organization {org_name}")
    pass

@app.get("/test", response_class=HTMLResponse)
async def test_interface():
    """Interactive test interface"""
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>AURA Voice AI - Voice & Document Tests</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            
            .container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            
            h1 {
                color: #333;
                margin-bottom: 30px;
                text-align: center;
            }
            
            .test-section {
                background: #f8f9fa;
                padding: 25px;
                margin: 25px 0;
                border-radius: 12px;
                border-left: 5px solid #667eea;
            }
            
            .test-section h3 {
                color: #333;
                margin-bottom: 20px;
                font-size: 1.4em;
            }
            
            button {
                background: #667eea;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s;
                margin: 10px 5px;
            }
            
            button:hover {
                background: #5a67d8;
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            
            .btn-danger {
                background: #e74c3c;
            }
            
            .btn-danger:hover {
                background: #c0392b;
            }
            
            .btn-success {
                background: #27ae60;
            }
            
            .btn-success:hover {
                background: #229954;
            }
            
            .result {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-top: 20px;
                border-left: 4px solid #ddd;
                font-family: monospace;
                white-space: pre-wrap;
                max-height: 400px;
                overflow-y: auto;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            input, textarea {
                width: 100%;
                padding: 15px;
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                margin: 15px 0;
                box-sizing: border-box;
                font-size: 16px;
            }
            
            .file-upload {
                border: 2px dashed #667eea;
                padding: 30px;
                text-align: center;
                border-radius: 8px;
                background: #f8f9ff;
                margin: 20px 0;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .file-upload:hover {
                background: #e8eaff;
                border-color: #5a67d8;
            }
            
            .file-upload.dragover {
                background: #e8eaff;
                border-color: #5a67d8;
                transform: scale(1.02);
            }
            
            .voice-interface {
                text-align: center;
                padding: 30px;
                background: linear-gradient(135deg, #f8f9ff 0%, #e8eaff 100%);
                border-radius: 12px;
                margin: 20px 0;
            }
            
            .voice-avatar {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 48px;
                transition: all 0.3s;
                box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                margin: 20px;
            }
            
            .voice-avatar:hover {
                transform: scale(1.1);
                box-shadow: 0 12px 35px rgba(0,0,0,0.3);
            }
            
            .voice-avatar.recording {
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .status-ok { color: #27ae60; border-left-color: #27ae60; }
            .status-error { color: #e74c3c; border-left-color: #e74c3c; }
            .status-info { color: #3498db; border-left-color: #3498db; }
            
            .uploaded-files {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .file-card {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e1e5e9;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .file-card h4 {
                margin: 0 0 10px 0;
                color: #333;
            }
            
            .file-info {
                color: #666;
                font-size: 14px;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎤 AURA Voice AI - Voice & Document Tests</h1>
            
            <!-- Voice Conversation Test -->
            <div class="test-section">
                <h3>🎤 1. Continuous Voice Conversation Test</h3>
                <div class="voice-interface">
                    <div id="voice-avatar" class="voice-avatar" onclick="toggleVoiceCall()">
                        <span id="voice-icon">🎤</span>
                    </div>
                    <div id="voice-status" style="font-size: 18px; color: #666; margin: 20px 0;">
                        Click to start a continuous voice conversation
                    </div>
                    <div id="voice-instructions" style="color: #666; max-width: 600px; margin: 0 auto;">
                        <strong>How it works:</strong><br/>
                        1. Click the microphone to start the conversation<br/>
                        2. AURA will listen continuously and respond naturally<br/>
                        3. Just talk naturally like you're on the phone<br/>
                        4. AURA automatically searches your uploaded documents for answers<br/>
                        5. Click again to end the conversation
                    </div>
                </div>
                <div id="voice-result" class="result"></div>
            </div>
            
            <!-- Document Upload & AI Search Test -->
            <div class="test-section">
                <h3>📚 2. Document Upload & AI Search Test</h3>
                <div class="file-upload" onclick="document.getElementById('file-input').click()" 
                     ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                    <input type="file" id="file-input" multiple accept=".pdf,.docx,.txt,.md" style="display: none;" onchange="handleFileSelect(event)">
                    <div style="font-size: 18px; color: #667eea; margin-bottom: 10px;">
                        📁 Click to upload or drag & drop files here
                    </div>
                    <div style="color: #666; font-size: 14px;">
                        Supported: PDF, DOCX, TXT, Markdown files
                    </div>
                </div>
                
                <div id="uploaded-files" class="uploaded-files"></div>
                
                <div style="margin: 20px 0;">
                    <h4>Ask AURA about your documents:</h4>
                    <textarea id="document-question" placeholder="Ask AURA to search through your uploaded documents..." rows="3">What are the main topics covered in my documents?</textarea>
                    <div style="margin: 10px 0;">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="allow-external-knowledge" style="transform: scale(1.2);">
                            <span><strong>Allow External Knowledge:</strong> Enable internet/external knowledge (disabled by default)</span>
                        </label>
                    </div>
                    <button onclick="askAboutDocuments()" class="btn-success">Ask AURA (Document-Only)</button>
                    <button onclick="askAboutDocuments(false, true)" class="btn-warning">Ask AURA (With External Knowledge)</button>
                </div>
                
                <div id="document-result" class="result"></div>
            </div>
            
            <!-- System Status -->
            <div class="test-section">
                <h3>🔧 3. System Status Check</h3>
                <button onclick="checkSystemStatus()">Check All Systems</button>
                <div id="system-result" class="result"></div>
            </div>
        </div>
        
        <script>
            // Global variables
            let isInCall = false;
            let uploadedFiles = [];
            
            // Voice Conversation Functions
            async function toggleVoiceCall() {
                console.log('🎤 Toggle voice call clicked');
                const voiceAvatar = document.getElementById('voice-avatar');
                const voiceIcon = document.getElementById('voice-icon');
                const voiceStatus = document.getElementById('voice-status');
                const voiceResult = document.getElementById('voice-result');
                
                if (!isInCall) {
                    try {
                        console.log('🔍 Checking voice system status...');
                        const response = await fetch('/voice/status');
                        const voiceData = await response.json();
                        console.log('🎤 Voice status:', voiceData);
                        
                        if (!voiceData.components || !voiceData.components.fully_functional) {
                            voiceStatus.textContent = 'Voice system not ready. Check API keys.';
                            voiceResult.textContent = 'Error: Voice system needs OpenAI and ElevenLabs API keys to function.';
                            return;
                        }
                        
                        console.log('✅ Voice system ready, starting conversation...');
                        isInCall = true;
                        voiceAvatar.classList.add('recording');
                        voiceIcon.textContent = '🔴';
                        voiceStatus.textContent = 'In conversation... Click to hang up';
                        voiceResult.textContent = '🎉 Conversation started! Just talk naturally...\\n\\nAURA is listening continuously and will respond to your voice.';
                        
                        // Get microphone access
                        console.log('🎤 Requesting microphone access...');
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        console.log('✅ Microphone access granted');
                        
                        // For now, just show success
                        voiceResult.textContent = '🎉 Voice conversation started!\\n\\nMicrophone access granted.\\n\\nVoice system is ready for continuous conversation.';
                        
                    } catch (error) {
                        console.error('❌ Voice error:', error);
                        voiceStatus.textContent = 'Error: ' + error.message;
                        voiceResult.textContent = 'Voice system error: ' + error.message;
                        resetVoiceState();
                    }
                } else {
                    console.log('🛑 Ending voice conversation...');
                    endVoiceCall();
                }
            }
            
            function resetVoiceState() {
                isInCall = false;
                document.getElementById('voice-avatar').classList.remove('recording');
                document.getElementById('voice-icon').textContent = '🎤';
                document.getElementById('voice-status').textContent = 'Click to start a continuous voice conversation';
            }
            
            function endVoiceCall() {
                isInCall = false;
                resetVoiceState();
            }
            
            // Document Upload Functions
            function handleFileSelect(event) {
                const files = Array.from(event.target.files);
                handleFiles(files);
            }
            
            function handleDrop(event) {
                event.preventDefault();
                const files = Array.from(event.dataTransfer.files);
                handleFiles(files);
            }
            
            function handleDragOver(event) {
                event.preventDefault();
                event.currentTarget.classList.add('dragover');
            }
            
            function handleDragLeave(event) {
                event.currentTarget.classList.remove('dragover');
            }
            
            async function handleFiles(files) {
                console.log('📁 Handling files:', files.length, 'files');
                
                for (const file of files) {
                    try {
                        console.log('📤 Uploading file:', file.name, 'Size:', file.size);
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('user_id', 'test_user');
                        
                        const response = await fetch('/documents/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        console.log('📡 Upload response status:', response.status);
                        
                        if (response.ok) {
                            const data = await response.json();
                            console.log('✅ Upload successful:', data);
                            uploadedFiles.push({
                                id: data.document.id,
                                name: file.name,
                                size: file.size,
                                type: file.type
                            });
                            
                            displayUploadedFiles();
                        } else {
                            const errorData = await response.json();
                            console.error('❌ Upload failed for:', file.name, errorData);
                        }
                    } catch (error) {
                        console.error('❌ Error uploading:', file.name, error);
                    }
                }
            }
            
            function displayUploadedFiles() {
                const uploadedFilesDiv = document.getElementById('uploaded-files');
                uploadedFilesDiv.innerHTML = '';
                
                uploadedFiles.forEach(file => {
                    const fileCard = document.createElement('div');
                    fileCard.className = 'file-card';
                    fileCard.innerHTML = `
                        <h4>${file.name}</h4>
                        <div class="file-info">
                            Size: ${(file.size / 1024).toFixed(1)} KB<br/>
                            Type: ${file.type}
                        </div>
                        <button onclick="deleteFile('${file.id}')" class="btn-danger">Delete</button>
                    `;
                    uploadedFilesDiv.appendChild(fileCard);
                });
            }
            
            async function deleteFile(fileId) {
                try {
                    const response = await fetch(`/documents/${fileId}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
                        displayUploadedFiles();
                    }
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }
            
            async function askAboutDocuments(allowExternal = false, forceExternal = false) {
                const question = document.getElementById('document-question').value;
                const resultDiv = document.getElementById('document-result');
                const checkbox = document.getElementById('allow-external-knowledge');
                
                // Use checkbox state if not explicitly passed
                if (!forceExternal) {
                    allowExternal = checkbox.checked;
                }
                
                if (!question.trim()) {
                    resultDiv.textContent = 'Please enter a question about your documents.';
                    return;
                }
                
                if (uploadedFiles.length === 0) {
                    resultDiv.textContent = 'Please upload some documents first before asking questions.';
                    return;
                }
                
                const modeText = allowExternal ? ' (With External Knowledge)' : ' (Document-Only Mode)';
                resultDiv.textContent = 'Asking AURA about your documents' + modeText + '...';
                
                try {
                    const response = await fetch('/chat/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: question,
                            user_id: 'test_user',
                            use_memory: true,
                            use_persona: true,
                            search_knowledge: true,
                            allow_external_knowledge: allowExternal
                        })
                    });
                    
                    const data = await response.json();
                    let responseText = 'Question: "' + question + '"\\n\\n';
                    responseText += 'AURA\'s Answer: "' + data.response + '"\\n\\n';
                    responseText += 'Model Used: ' + data.model_used + '\\n';
                    responseText += 'Cost: $' + (data.cost || 0).toFixed(4) + '\\n';
                    
                    responseText += 'External Knowledge Used: ' + (data.external_knowledge_used ? 'Yes' : 'No') + '\\n';
                    responseText += 'Document Found: ' + (data.document_found ? 'Yes' : 'No') + '\\n';
                    
                    if (data.sources && data.sources.length > 0) {
                        responseText += 'Sources: ' + data.sources.join(', ') + '\\n';
                    }
                    
                    resultDiv.textContent = responseText;
                    
                    // Color code based on mode and success
                    if (!data.external_knowledge_used) {
                        resultDiv.className = data.document_found ? 'result status-ok' : 'result status-warning';
                    } else {
                        resultDiv.className = 'result status-ok';
                    }
                    
                } catch (error) {
                    resultDiv.textContent = 'Error asking about documents: ' + error.message;
                    resultDiv.className = 'result status-error';
                }
            }
            
            // System Status Functions
            async function checkSystemStatus() {
                const resultDiv = document.getElementById('system-result');
                resultDiv.textContent = 'Checking system status...';
                console.log('🔧 Checking system status...');
                
                try {
                    console.log('📡 Making API calls...');
                    const [healthResponse, voiceResponse, statsResponse] = await Promise.all([
                        fetch('/health'),
                        fetch('/voice/status'),
                        fetch('/stats')
                    ]);
                    
                    console.log('✅ API calls completed');
                    const health = await healthResponse.json();
                    const voice = await voiceResponse.json();
                    const stats = await statsResponse.json();
                    
                    console.log('📊 Health:', health);
                    console.log('🎤 Voice:', voice);
                    console.log('📈 Stats:', stats);
                    
                    resultDiv.textContent = JSON.stringify({
                        health: health,
                        voice: voice,
                        stats: stats
                    }, null, 2);
                    
                    resultDiv.className = 'result status-ok';
                    
                } catch (error) {
                    console.error('❌ System status error:', error);
                    resultDiv.textContent = 'Error checking system status: ' + error.message;
                    resultDiv.className = 'result status-error';
                }
            }
            
            // Initialize on page load
            window.onload = function() {
                console.log('🚀 Page loaded, initializing...');
                checkSystemStatus();
            };
        </script>
    </body>
    </html>
    """)



@app.get("/debug", response_class=HTMLResponse)
async def debug_interface():
    """Comprehensive debugging interface"""
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>AURA Voice AI - Debug Interface</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            
            .container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            
            h1 {
                color: #333;
                margin-bottom: 30px;
                text-align: center;
            }
            
            .debug-section {
                background: #f8f9fa;
                padding: 25px;
                margin: 25px 0;
                border-radius: 12px;
                border-left: 5px solid #667eea;
            }
            
            .debug-section h3 {
                color: #333;
                margin-bottom: 20px;
                font-size: 1.4em;
            }
            
            button {
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s;
                margin: 5px;
            }
            
            button:hover {
                background: #5a67d8;
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            
            .btn-success { background: #27ae60; }
            .btn-success:hover { background: #229954; }
            .btn-danger { background: #e74c3c; }
            .btn-danger:hover { background: #c0392b; }
            .btn-warning { background: #f39c12; }
            .btn-warning:hover { background: #e67e22; }
            
            .result {
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-top: 15px;
                border-left: 4px solid #ddd;
                font-family: monospace;
                white-space: pre-wrap;
                max-height: 300px;
                overflow-y: auto;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                font-size: 12px;
            }
            
            .status-ok { color: #27ae60; border-left-color: #27ae60; }
            .status-error { color: #e74c3c; border-left-color: #e74c3c; }
            .status-warning { color: #f39c12; border-left-color: #f39c12; }
            
            .test-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            
            .test-card {
                background: white;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e1e5e9;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .test-card h4 {
                margin: 0 0 15px 0;
                color: #333;
            }
            
            .progress-bar {
                width: 100%;
                height: 20px;
                background: #e1e5e9;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .log-container {
                background: #1a1a1a;
                color: #00ff00;
                padding: 15px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                max-height: 200px;
                overflow-y: auto;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔧 AURA Voice AI - Debug Interface</h1>
            
            <!-- System Status -->
            <div class="debug-section">
                <h3>📊 1. System Status Check</h3>
                <button onclick="runSystemCheck()" class="btn-success">Run Full System Check</button>
                <button onclick="checkHealth()">Health Check</button>
                <button onclick="checkVoice()">Voice Status</button>
                <button onclick="checkStats()">System Stats</button>
                <div id="system-result" class="result"></div>
            </div>
            
            <!-- API Testing -->
            <div class="debug-section">
                <h3>🔌 2. API Endpoint Testing</h3>
                <div class="test-grid">
                    <div class="test-card">
                        <h4>Chat API</h4>
                        <button onclick="testChatAPI()">Test Chat</button>
                        <button onclick="testChatWithMemory()">Test with Memory</button>
                        <div id="chat-api-result" class="result"></div>
                    </div>
                    
                    <div class="test-card">
                        <h4>Voice API</h4>
                        <button onclick="testVoiceStatus()">Voice Status</button>
                        <button onclick="testTTS()">Text-to-Speech</button>
                        <button onclick="testSTT()">Speech-to-Text</button>
                        <div id="voice-api-result" class="result"></div>
                    </div>
                    
                    <div class="test-card">
                        <h4>Document API</h4>
                        <button onclick="testDocumentList()">List Documents</button>
                        <button onclick="testDocumentUpload()">Test Upload</button>
                        <button onclick="testDocumentSearch()">Test Search</button>
                        <div id="document-api-result" class="result"></div>
                    </div>
                    
                    <div class="test-card">
                        <h4>Admin API</h4>
                        <button onclick="testAdminStatus()">Admin Status</button>
                        <button onclick="testAdminDashboard()">Admin Dashboard</button>
                        <div id="admin-api-result" class="result"></div>
                    </div>
                </div>
            </div>
            
            <!-- Multi-Tenant Testing -->
            <div class="debug-section">
                <h3>🏢 3. Multi-Tenant Testing</h3>
                <button onclick="testTenantIsolation()" class="btn-warning">Test Tenant Isolation</button>
                <button onclick="testTenantCreation()" class="btn-warning">Test Tenant Creation</button>
                <div id="tenant-result" class="result"></div>
            </div>
            
            <!-- Frontend Testing -->
            <div class="debug-section">
                <h3>🎨 4. Frontend Testing</h3>
                <button onclick="testJavaScript()" class="btn-success">Test JavaScript</button>
                <button onclick="testDOM()" class="btn-success">Test DOM Elements</button>
                <button onclick="testFetch()" class="btn-success">Test Fetch API</button>
                <div id="frontend-result" class="result"></div>
            </div>
            
            <!-- Live Logs -->
            <div class="debug-section">
                <h3>📝 5. Live Debug Logs</h3>
                <button onclick="clearLogs()" class="btn-danger">Clear Logs</button>
                <div id="debug-logs" class="log-container"></div>
            </div>
        </div>
        
        <script>
            // Global variables
            let debugLogs = [];
            
            // Logging function
            function log(message, type = 'info') {
                const timestamp = new Date().toLocaleTimeString();
                const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
                debugLogs.push(logEntry);
                
                const logContainer = document.getElementById('debug-logs');
                logContainer.innerHTML = debugLogs.join('\\n');
                logContainer.scrollTop = logContainer.scrollHeight;
                
                console.log(logEntry);
            }
            
            // Clear logs
            function clearLogs() {
                debugLogs = [];
                document.getElementById('debug-logs').innerHTML = '';
            }
            
            // System Status Functions
            async function runSystemCheck() {
                log('🚀 Starting comprehensive system check...');
                const resultDiv = document.getElementById('system-result');
                resultDiv.textContent = 'Running system check...';
                
                try {
                    const checks = [
                        { name: 'Health', endpoint: '/health' },
                        { name: 'Voice', endpoint: '/voice/status' },
                        { name: 'Stats', endpoint: '/stats' },
                        { name: 'Admin', endpoint: '/admin/status' }
                    ];
                    
                    const results = {};
                    
                    for (const check of checks) {
                        log(`Checking ${check.name} endpoint...`);
                        try {
                            const response = await fetch(check.endpoint);
                            const data = await response.json();
                            results[check.name] = { status: response.status, data: data };
                            log(`✅ ${check.name}: ${response.status}`, 'success');
                        } catch (error) {
                            results[check.name] = { status: 'error', error: error.message };
                            log(`❌ ${check.name}: ${error.message}`, 'error');
                        }
                    }
                    
                    resultDiv.textContent = JSON.stringify(results, null, 2);
                    resultDiv.className = 'result status-ok';
                    
                } catch (error) {
                    log(`System check failed: ${error.message}`, 'error');
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                }
            }
            
            async function checkHealth() {
                log('Checking health endpoint...');
                const resultDiv = document.getElementById('system-result');
                
                try {
                    const response = await fetch('/health');
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('Health check completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`Health check failed: ${error.message}`, 'error');
                }
            }
            
            async function checkVoice() {
                log('Checking voice status...');
                const resultDiv = document.getElementById('system-result');
                
                try {
                    const response = await fetch('/voice/status');
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('Voice status check completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`Voice check failed: ${error.message}`, 'error');
                }
            }
            
            async function checkStats() {
                log('Checking system stats...');
                const resultDiv = document.getElementById('system-result');
                
                try {
                    const response = await fetch('/stats');
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('Stats check completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`Stats check failed: ${error.message}`, 'error');
                }
            }
            
            // API Testing Functions
            async function testChatAPI() {
                log('Testing chat API...');
                const resultDiv = document.getElementById('chat-api-result');
                
                try {
                    const response = await fetch('/chat/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: 'Hello, this is a test message',
                            user_id: 'debug_user',
                            use_memory: false,
                            search_knowledge: false
                        })
                    });
                    
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('Chat API test completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`Chat API test failed: ${error.message}`, 'error');
                }
            }
            
            async function testVoiceStatus() {
                log('Testing voice status API...');
                const resultDiv = document.getElementById('voice-api-result');
                
                try {
                    const response = await fetch('/voice/status');
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('Voice status test completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`Voice status test failed: ${error.message}`, 'error');
                }
            }
            
            async function testDocumentList() {
                log('Testing document list API...');
                const resultDiv = document.getElementById('document-api-result');
                
                try {
                    const response = await fetch('/documents/list');
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('Document list test completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`Document list test failed: ${error.message}`, 'error');
                }
            }
            
            async function testAdminStatus() {
                log('Testing admin status API...');
                const resultDiv = document.getElementById('admin-api-result');
                
                try {
                    const response = await fetch('/admin/status');
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('Admin status test completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`Admin status test failed: ${error.message}`, 'error');
                }
            }
            
            // Frontend Testing Functions
            function testJavaScript() {
                log('Testing JavaScript functionality...');
                const resultDiv = document.getElementById('frontend-result');
                
                try {
                    // Test basic JavaScript
                    const testResults = {
                        date: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        windowSize: `${window.innerWidth}x${window.innerHeight}`,
                        fetchAvailable: typeof fetch !== 'undefined',
                        consoleAvailable: typeof console !== 'undefined'
                    };
                    
                    resultDiv.textContent = JSON.stringify(testResults, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('JavaScript test completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`JavaScript test failed: ${error.message}`, 'error');
                }
            }
            
            function testDOM() {
                log('Testing DOM elements...');
                const resultDiv = document.getElementById('frontend-result');
                
                try {
                    const elements = [
                        'system-result',
                        'chat-api-result',
                        'voice-api-result',
                        'document-api-result',
                        'admin-api-result',
                        'frontend-result',
                        'debug-logs'
                    ];
                    
                    const testResults = {};
                    elements.forEach(id => {
                        const element = document.getElementById(id);
                        testResults[id] = element ? 'Found' : 'Missing';
                    });
                    
                    resultDiv.textContent = JSON.stringify(testResults, null, 2);
                    resultDiv.className = 'result status-ok';
                    log('DOM test completed', 'success');
                } catch (error) {
                    resultDiv.textContent = `Error: ${error.message}`;
                    resultDiv.className = 'result status-error';
                    log(`DOM test failed: ${error.message}`, 'error');
                }
            }
            
            // Initialize on page load
            window.onload = function() {
                log('🚀 Debug interface loaded');
                log('Browser: ' + navigator.userAgent);
                log('Window size: ' + window.innerWidth + 'x' + window.innerHeight);
                
                // Auto-run basic tests
                setTimeout(() => {
                    testJavaScript();
                    testDOM();
                }, 1000);
            };
        </script>
    </body>
    </html>
    """)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)