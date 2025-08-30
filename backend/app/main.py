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
persona_manager = None
data_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start up all the multi-tenant services
    global tenant_manager, auth_service, tenant_aware_services
    global smart_router, memory_engine, voice_pipeline, persona_manager, data_service
    
    logger.info("Starting AURA Voice AI Multi-Tenant System...")
    
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
        from app.services.persona_manager import PersonaManager
        from app.services.data_ingestion import DataIngestionService
        
        smart_router = SmartRouter()
        memory_engine = MemoryEngine()
        voice_pipeline = VoicePipeline()
        persona_manager = PersonaManager()
        data_service = DataIngestionService()
        
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

# CORS for subdomains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://*.aura-voice-ai.com", "http://localhost:3000", "http://127.0.0.1:3000"],  # Allow subdomains and local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with system info"""
    return {
        "name": "AURA Voice AI - Multi-Tenant",
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
        <title>AURA Test Interface</title>
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
            }
            
            .test-section {
                margin: 20px 0;
                padding: 20px;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
            }
            
            .test-section h3 {
                margin-top: 0;
                color: #667eea;
            }
            
            button {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin: 5px;
            }
            
            button:hover {
                background: #764ba2;
            }
            
            .result {
                margin-top: 10px;
                padding: 10px;
                background: #f5f5f5;
                border-radius: 5px;
                font-family: monospace;
                white-space: pre-wrap;
                max-height: 300px;
                overflow-y: auto;
            }
            
            input, textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                margin: 10px 0;
                box-sizing: border-box;
            }
            
            .status-ok { color: green; }
            .status-error { color: red; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 AURA Voice AI - Test Interface</h1>
            
            <!-- Health Check -->
            <div class="test-section">
                <h3>1. System Health Check</h3>
                <button onclick="testHealth()">Check Health</button>
                <div id="health-result" class="result"></div>
            </div>
            
            <!-- Chat Test -->
            <div class="test-section">
                <h3>2. Chat Test</h3>
                <textarea id="chat-input" placeholder="Enter your message..." rows="3">
What is machine learning?</textarea>
                <button onclick="testChat()">Send Message</button>
                <div id="chat-result" class="result"></div>
            </div>
            
            <!-- TTS Test -->
            <div class="test-section">
                <h3>3. Text-to-Speech Test</h3>
                <input id="tts-input" type="text" value="Hello, I am AURA, your AI assistant!" />
                <button onclick="testTTS()">Generate Speech</button>
                <div id="tts-result" class="result"></div>
            </div>
            
            <!-- Admin Dashboard -->
            <div class="test-section">
                <h3>4. Admin Dashboard</h3>
                <button onclick="testAdmin()">Get Stats</button>
                <div id="admin-result" class="result"></div>
            </div>
        </div>
        
        <script>
            const API_BASE = '';
            
            async function testHealth() {
                const resultDiv = document.getElementById('health-result');
                resultDiv.textContent = 'Testing...';
                
                try {
                    const response = await fetch('/health');
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.className = 'result ' + (data.status === 'healthy' ? 'status-ok' : 'status-error');
                } catch (error) {
                    resultDiv.textContent = 'Error: ' + error.message;
                    resultDiv.className = 'result status-error';
                }
            }
            
            async function testChat() {
                const resultDiv = document.getElementById('chat-result');
                const input = document.getElementById('chat-input').value;
                resultDiv.textContent = 'Sending...';
                
                try {
                    const response = await fetch('/chat/message', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            message: input,
                            user_id: 'test_user',
                            use_memory: true
                        })
                    });
                    const data = await response.json();
                    resultDiv.textContent = 'Response: ' + data.response + '\\n\\nModel: ' + data.model_used + '\\nCost: $' + data.cost.toFixed(4);
                } catch (error) {
                    resultDiv.textContent = 'Error: ' + error.message;
                    resultDiv.className = 'result status-error';
                }
            }
            
            async function testTTS() {
                const resultDiv = document.getElementById('tts-result');
                const input = document.getElementById('tts-input').value;
                resultDiv.textContent = 'Generating...';
                
                try {
                    const formData = new FormData();
                    formData.append('text', input);
                    
                    const response = await fetch('/voice/synthesize', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        // Create audio element
                        const audio = new Audio('data:audio/mpeg;base64,' + data.audio);
                        audio.play();
                        resultDiv.textContent = 'Audio generated! Playing...\\nCharacters: ' + data.characters;
                    } else {
                        resultDiv.textContent = 'Failed to generate audio';
                    }
                } catch (error) {
                    resultDiv.textContent = 'Error: ' + error.message;
                    resultDiv.className = 'result status-error';
                }
            }
            
            async function testAdmin() {
                const resultDiv = document.getElementById('admin-result');
                resultDiv.textContent = 'Loading...';
                
                try {
                    const response = await fetch('/admin/dashboard');
                    const data = await response.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    resultDiv.textContent = 'Error: ' + error.message;
                    resultDiv.className = 'result status-error';
                }
            }
            
            // Test health on load
            window.onload = () => testHealth();
        </script>
    </body>
    </html>
    """)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)