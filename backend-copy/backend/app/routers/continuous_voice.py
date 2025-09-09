"""
WebSocket routes for continuous natural voice conversation
No push-to-talk - flows like a real phone call
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
import logging
import json
import asyncio
from typing import Optional

from app.services.continuous_conversation import ContinuousConversationManager
from app.services.voice_pipeline import VoicePipeline
from app.services.smart_router import SmartRouter
from app.services.tenant_manager import TenantManager
from app.services.auth_service import TenantAuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/voice", tags=["continuous-voice"])

# Service instances (set from main)
conversation_manager = None
auth_service = None

def set_services(cm: ContinuousConversationManager, auth: TenantAuthService):
    """Set service instances from main app"""
    global conversation_manager, auth_service
    conversation_manager = cm
    auth_service = auth

@router.websocket("/continuous")
async def continuous_voice_conversation(
    websocket: WebSocket,
    token: str = Query(...)  # Auth token as query param
):
    """
    WebSocket endpoint for continuous natural voice conversation
    - No push-to-talk needed
    - Natural turn-taking
    - Interruption support
    - Context maintained throughout call
    """
    await websocket.accept()
    
    session = None
    
    try:
        # Verify authentication
        if not auth_service:
            await websocket.send_json({
                "type": "error",
                "message": "Auth service not initialized"
            })
            await websocket.close()
            return
        
        payload = auth_service.verify_token(token)
        if not payload:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid or expired token"
            })
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Extract user info
        user_id = payload["user_id"]
        tenant_id = payload.get("tenant_id")
        organization = payload.get("organization", "AURA")
        
        logger.info(f"Continuous voice call started: User {user_id} from {organization}")
        
        # Start continuous conversation session
        await conversation_manager.start_continuous_session(
            websocket=websocket,
            user_id=user_id,
            tenant_id=tenant_id
        )
        
    except WebSocketDisconnect:
        logger.info("Voice call disconnected by client")
    except Exception as e:
        logger.error(f"Voice call error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        logger.info(f"Voice call ended for user {user_id if 'user_id' in locals() else 'unknown'}")