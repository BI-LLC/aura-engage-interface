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

# Shared service instances
tenant_manager = None
auth_service = None
tenant_aware_services = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start up all the multi-tenant services
    global tenant_manager, auth_service, tenant_aware_services
    
    logger.info("Starting AURA Multi-Tenant System...")
    
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
    
    logger.info("Multi-tenant services initialized successfully")
    
    yield
    
    logger.info("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="AURA Voice AI - Multi-Tenant",
    description="Personalized AI for Every Organization",
    version="4.0.0",
    lifespan=lifespan
)

# Add tenant isolation middleware
app.add_middleware(TenantMiddleware, auth_service=auth_service)

# CORS for subdomains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://*.aura-ai.com"],  # Allow all subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Voice conversation endpoints

@app.websocket("/api/voice/continuous")
async def continuous_voice_conversation(
    websocket: WebSocket,
    token: str
):
    # WebSocket endpoint for continuous voice chat
    await websocket.accept()
    
    # Verify token and get tenant info
    payload = auth_service.verify_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    tenant_id = payload["tenant_id"]
    user_id = payload["user_id"]
    organization = payload["organization"]
    
    logger.info(f"Voice call started: {organization} ({user_id})")
    
    # Get voice pipeline
    voice_pipeline = tenant_aware_services["voice_pipeline"]
    
    # Create session for continuous conversation
    session_id = f"voice_{datetime.now().timestamp()}"
    
    try:
        # Initialize conversation context with tenant's data
        tenant_context = await tenant_manager.get_tenant_context(tenant_id)
        
        conversation_state = {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "session_id": session_id,
            "context": tenant_context,
            "conversation_history": [],
            "is_speaking": False
        }
        
        # Send initial greeting using tenant's style
        greeting = f"Hello! I'm your AI assistant for {organization}. How can I help you today?"
        await websocket.send_json({
            "type": "greeting",
            "text": greeting,
            "audio": await voice_pipeline.synthesize_speech(greeting)
        })
        
        # Continuous conversation loop
        while True:
            # Receive audio chunk from user
            data = await websocket.receive_json()
            
            if data["type"] == "audio_chunk":
                # Process audio in real-time
                audio_data = data["audio"]
                
                # Transcribe
                transcript = await voice_pipeline.transcribe_streaming(audio_data)
                
                if transcript and not conversation_state["is_speaking"]:
                    # User finished speaking, generate response
                    conversation_state["is_speaking"] = True
                    
                    # Add to conversation history
                    conversation_state["conversation_history"].append({
                        "role": "user",
                        "content": transcript
                    })
                    
                    # Generate contextual response using ONLY tenant's data
                    response_text = await generate_tenant_specific_response(
                        user_input=transcript,
                        tenant_context=tenant_context,
                        conversation_history=conversation_state["conversation_history"],
                        tenant_id=tenant_id
                    )
                    
                    # Add AI response to history
                    conversation_state["conversation_history"].append({
                        "role": "assistant",
                        "content": response_text
                    })
                    
                    # Stream response audio back
                    audio_response = await voice_pipeline.synthesize_speech(response_text)
                    
                    await websocket.send_json({
                        "type": "response",
                        "text": response_text,
                        "audio": audio_response,
                        "sources": extract_sources(response_text, tenant_context)
                    })
                    
                    conversation_state["is_speaking"] = False
            
            elif data["type"] == "end_call":
                # Save conversation summary
                await save_conversation_summary(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    session_id=session_id,
                    history=conversation_state["conversation_history"]
                )
                break
    
    except WebSocketDisconnect:
        logger.info(f"Voice call ended: {organization}")
    except Exception as e:
        logger.error(f"Voice call error: {e}")
        await websocket.close(code=1011, reason=str(e))

# Helper functions

async def generate_tenant_specific_response(
    user_input: str,
    tenant_context: Dict,
    conversation_history: List,
    tenant_id: str
) -> str:
    # Generate AI response using tenant's knowledge base only
    
    # Search tenant's documents for relevant info
    data_service = tenant_aware_services["data_ingestion"]
    relevant_docs = await data_service.search_documents(
        query=user_input,
        tenant_id=tenant_id,
        user_id="system",
        limit=3
    )
    
    # Build prompt with tenant's knowledge only
    prompt = f"""
    You are an AI assistant for {tenant_context['organization']}.
    You MUST only use information from their uploaded documents.
    
    Their Knowledge Base Contains:
    {format_relevant_documents(relevant_docs)}
    
    Recent Conversation:
    {format_conversation_history(conversation_history[-5:])}
    
    User Question: {user_input}
    
    Instructions:
    1. Answer using ONLY information from their documents
    2. Be conversational and natural
    3. If information isn't in their documents, say "I don't have that information in your knowledge base"
    4. Maintain context from the conversation history
    
    Response:
    """
    
    # Get response from LLM
    router = tenant_aware_services["smart_router"]
    response = await router.route_message(prompt, tenant_id, "system")
    
    return response.content

def format_relevant_documents(docs: List) -> str:
    # Format document content for AI prompt
    if not docs:
        return "No relevant documents found."
    
    formatted = []
    for doc in docs:
        formatted.append(f"[Document: {doc.get('filename', 'Unknown')}]\n{doc.get('content', '')[:500]}...")
    
    return "\n\n".join(formatted)

def format_conversation_history(history: List) -> str:
    # Format chat history for context
    if not history:
        return "No previous conversation."
    
    formatted = []
    for msg in history:
        role = msg.get('role', 'unknown')
        content = msg.get('content', '')
        formatted.append(f"{role.title()}: {content}")
    
    return "\n".join(formatted)

def extract_sources(response_text: str, tenant_context: Dict) -> List[str]:
    # Extract document sources from AI response
    sources = []
    if "[Document:" in response_text:
        import re
        matches = re.findall(r'\[Document: (.*?)\]', response_text)
        sources = list(set(matches))[:3]
    return sources

async def save_conversation_summary(tenant_id: str, user_id: str, session_id: str, history: List):
    # Save conversation summary to tenant storage
    logger.info(f"Saving conversation summary for tenant {tenant_id}, session {session_id}")
    pass

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

# Admin dashboard endpoints

@app.get("/api/admin/dashboard")
async def get_tenant_dashboard(request: Request):
    # Admin dashboard for tenant management
    tenant_id = request.state.tenant_id
    
    # Verify admin role
    if request.state.user_role != "tenant_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get tenant-specific stats
    stats = {
        "organization": request.state.organization,
        "tenant_id": tenant_id,
        "users": await tenant_manager.get_tenant_users(tenant_id),
        "documents": await tenant_manager.get_tenant_document_count(tenant_id),
        "conversations": await tenant_manager.get_tenant_conversation_count(tenant_id),
        "storage_used_gb": await tenant_manager.get_tenant_storage_usage(tenant_id),
        "api_calls_this_month": await tenant_manager.get_tenant_api_usage(tenant_id),
        "subscription": await tenant_manager.get_tenant_subscription(tenant_id)
    }
    
    return stats

# System health endpoints

@app.get("/health")
async def health_check():
    # Basic health check endpoint
    return {
        "status": "healthy",
        "mode": "multi-tenant",
        "tenants_active": len(tenant_manager.tenants) if tenant_manager else 0
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
        "login_url": f"https://{organization_name.lower().replace(' ', '-')}.aura-ai.com"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)