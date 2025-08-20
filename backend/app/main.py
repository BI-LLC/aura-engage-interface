# AURA Voice AI - FastAPI application entrypoint
# Provides HTTP endpoints, initializes the smart router and memory engine,
# and wires up the memory management API routes.

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import Dict, Optional
import logging
from contextlib import asynccontextmanager
import uuid

# Import our services
from app.services.smart_router import SmartRouter
from app.services.memory_engine import MemoryEngine, ConversationSummary
from app.config import settings

# Import routers
from app.routers import memory

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances
smart_router = None
memory_engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Manage application lifecycle
    global smart_router, memory_engine
    
    logger.info("AURA Voice AI starting up...")
    logger.info(f"Grok API configured: {bool(settings.GROK_API_KEY)}")
    logger.info(f"OpenAI API configured: {bool(settings.OPENAI_API_KEY)}")
    
    # Initialize services
    smart_router = SmartRouter()
    memory_engine = MemoryEngine()
    
    # Connect memory engine
    await memory_engine.connect()
    
    # Start health monitor
    await smart_router.start_health_monitor()
    
    logger.info("AURA Voice AI started successfully with memory system.")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AURA Voice AI...")

# Create FastAPI app
app = FastAPI(
    title="AURA Voice AI",
    description="AI Voice Assistant with Memory - Week 3-4",
    version="0.2.0",
    lifespan=lifespan
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(memory.router)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    use_memory: bool = True  # Whether to include user preference context in routing

class ChatResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    response: str
    model_used: str
    response_time: float
    cost: float
    session_id: str  # Server-generated session identifier
    memory_used: bool  # True if user preference context was applied

@app.get("/")
async def root():
    return {
        "name": "AURA Voice AI",
        "status": "running",
        "version": "0.2.0",
        "phase": "Week 3-4 with Memory System"
    }

@app.get("/health")
async def health_check():
    if not smart_router:
        return {"status": "starting"}
    
    health_status = await smart_router.get_health_status()
    
    # Check Redis/Memory status
    memory_status = "connected" if memory_engine and memory_engine.connected else "disconnected"
    
    healthy_count = sum(1 for k, v in health_status.items() 
                       if isinstance(v, dict) and v.get("status") == "healthy")
    
    return {
        "status": "healthy" if healthy_count == 2 else "degraded",
        "apis": health_status,
        "memory": memory_status,
        "healthy_apis": f"{healthy_count}/2"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    # Chat endpoint that optionally applies user preferences from memory
    if not smart_router:
        raise HTTPException(status_code=503, detail="System starting up")
    
    try:
        # Generate or use session ID
        session_id = request.session_id or memory_engine.generate_session_id(request.user_id)
        
        # Prepare context with memory if enabled
        context = {}
        memory_used = False
        
        if request.use_memory and request.user_id:
            # Get user preferences
            preferences = await memory_engine.get_user_preferences(request.user_id)
            
            if preferences:
                # Add preferences to context
                context["user_preferences"] = {
                    "communication_style": preferences.communication_style,
                    "response_pace": preferences.response_pace,
                    "expertise_areas": preferences.expertise_areas,
                    "preferred_examples": preferences.preferred_examples
                }
                memory_used = True
                
                # Modify the message with context
                context_prompt = f"""
                User preferences:
                - Communication style: {preferences.communication_style}
                - Response pace: {preferences.response_pace}
                - Areas of interest: {', '.join(preferences.expertise_areas[:3]) if preferences.expertise_areas else 'general'}
                - Example style: {preferences.preferred_examples}
                
                User message: {request.message}
                
                Please respond according to the user's preferences.
                """
                
                # Use context-enhanced prompt
                result = await smart_router.route_message(context_prompt)
            else:
                # No preferences found, use original message
                result = await smart_router.route_message(request.message)
        else:
            # Memory not used
            result = await smart_router.route_message(request.message)
        
        if result.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {result.error}")
        
        # Store session context if user_id provided
        if request.user_id:
            await memory_engine.store_session_context(
                session_id,
                request.user_id,
                {
                    "last_message": request.message,
                    "last_response": result.content[:500],  # Store first 500 chars
                    "model_used": result.model_used
                }
            )
            
            # Add conversation summary (simple for now)
            summary = ConversationSummary(
                session_id=session_id,
                user_id=request.user_id,
                summary=f"Discussed: {request.message[:100]}",
                key_topics=[request.message.split()[0] if request.message else "general"],
                timestamp=datetime.now().isoformat(),
                message_count=1
            )
            await memory_engine.add_conversation_summary(request.user_id, summary)
        
        return ChatResponse(
            response=result.content,
            model_used=result.model_used,
            response_time=result.response_time,
            cost=result.cost,
            session_id=session_id,
            memory_used=memory_used
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    if not smart_router:
        return {"message": "System starting up"}
    
    # Enhanced stats with memory info
    memory_stats = {
        "connected": memory_engine.connected if memory_engine else False,
        "using_redis": not memory_engine.use_fallback if memory_engine else False
    }
    
    return {
        "costs": smart_router.get_cost_summary(),
        "total_requests": smart_router.get_request_count(),
        "health": await smart_router.get_health_status(),
        "memory": memory_stats
    }

# Import datetime for conversation summaries
from datetime import datetime

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )