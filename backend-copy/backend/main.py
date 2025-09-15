"""
FastAPI backend for multi-tenant voice AI system
Enhanced with proper CORS, WebSocket support, and JWT authentication
"""

from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import jwt
import requests
import logging
import asyncio
from typing import Optional, Dict, Any
import os

# Import your existing services
from app.services.auth_service import TenantAuthService
from app.services.continuous_conversation import ContinuousConversationManager
from app.routers import continuous_voice

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Multi-Tenant Voice AI Backend",
    description="Production backend for voice AI conversations",
    version="1.0.0"
)


origins = [
    "https://iaura.ai",
    "https://www.iaura.ai",
    "http://localhost:8880",   # add your local dev origin if needed
]

# CORS configuration - CRITICAL for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Use specific origins for security
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Handle OPTIONS requests explicitly
@app.options("/{path:path}")
async def handle_options(path: str):
    """Handle CORS preflight requests"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Initialize services
auth_service = TenantAuthService()
conversation_manager = ContinuousConversationManager()

# Set services for voice router
continuous_voice.set_services(conversation_manager, auth_service)

# Include routers
app.include_router(continuous_voice.router, prefix="/ws")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Backend is running"}

async def get_tenant_for_user(email: str, user_id: str) -> Optional[str]:
    """
    Map user to tenant based on your business logic
    For now, use a simple default tenant
    """
    # In production, implement your tenant mapping logic here
    # This could be based on email domain, user registration, etc.
    return "default_tenant"

@app.post("/api/auth/exchange-token")
async def exchange_supabase_token(authorization: str = Header(...)):
    """
    Exchange Supabase JWT token for backend-specific JWT token
    Fixed version with proper JWT verification
    """
    try:
        # Remove 'Bearer ' prefix if present
        supabase_token = authorization
        if supabase_token.startswith('Bearer '):
            supabase_token = supabase_token[7:]
        
        logger.info("🔐 Processing token exchange request")
        
        # Verify Supabase JWT token locally (SECURE)
        # Get your Supabase JWT secret from your Supabase dashboard -> Settings -> API
        SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')
        if not SUPABASE_JWT_SECRET:
            logger.error("❌ SUPABASE_JWT_SECRET not configured")
            raise HTTPException(status_code=500, detail="Server configuration error")
        
        try:
            # Decode and verify the Supabase JWT token
            payload = jwt.decode(
                supabase_token, 
                SUPABASE_JWT_SECRET, 
                algorithms=['HS256'],
                audience='authenticated'  # Supabase uses 'authenticated' as audience
            )
            
            user_id = payload.get('sub')  # 'sub' is the user ID in Supabase JWTs
            user_email = payload.get('email')
            
            if not user_id or not user_email:
                raise HTTPException(status_code=401, detail="Invalid token payload")
                
            logger.info(f"✅ Token verified for user: {user_email}")
            
        except jwt.ExpiredSignatureError:
            logger.error("❌ Token expired")
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            logger.error(f"❌ Invalid token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Map user to tenant
        tenant_id = await get_tenant_for_user(user_email, user_id)
        if not tenant_id:
            raise HTTPException(status_code=403, detail="User not assigned to any tenant")
        
        # Generate backend JWT token
        backend_payload = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "role": "user",
            "email": user_email,
            "organization": "AURA",
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        
        backend_token = auth_service.generate_token(backend_payload)
        
        logger.info(f"✅ Backend token generated for user {user_email}")
        
        return {
            "backend_token": backend_token,
            "user_id": user_id,
            "tenant_id": tenant_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Token exchange failed: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8880)
