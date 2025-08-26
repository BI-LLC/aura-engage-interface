# backend/app/routers/chat.py
"""
Chat router for AURA Voice AI with document knowledge integration
Handles text chat with memory and document context
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import uuid
import logging

from app.services.smart_router import SmartRouter
from app.services.memory_engine import MemoryEngine, ConversationSummary
from app.services.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/chat", tags=["chat"])

# Service instances (will be set from main)
smart_router = None
memory_engine = None
doc_processor = None

def set_services(sr: SmartRouter, me: MemoryEngine, dp: DocumentProcessor):
    """Set service instances from main app"""
    global smart_router, memory_engine, doc_processor
    smart_router = sr
    memory_engine = me
    doc_processor = dp

# Request/Response models
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    use_memory: bool = True
    use_documents: bool = True  # Enable document search
    stream: bool = False

class ChatResponse(BaseModel):
    response: str
    model_used: str
    response_time: float
    cost: float
    session_id: str
    memory_used: bool
    documents_used: bool
    sources: Optional[List[str]] = None  # Document sources if used

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    background_tasks: BackgroundTasks
):
    """
    Main chat endpoint with memory and document integration
    """
    if not smart_router:
        raise HTTPException(status_code=503, detail="Chat service not initialized")
    
    try:
        # Generate or use session ID
        session_id = request.session_id or str(uuid.uuid4())[:8]
        user_id = request.user_id or "default_user"
        
        # Build context for the message
        enhanced_message = request.message
        context_parts = []
        documents_used = False
        sources = []
        
        # 1. Add document context if enabled
        if request.use_documents and doc_processor:
            try:
                # Search for relevant documents
                doc_context = doc_processor.get_context_for_chat(
                    query=request.message,
                    user_id=user_id
                )
                
                if doc_context:
                    context_parts.append(doc_context)
                    documents_used = True
                    # Extract document names from context (simple parsing)
                    import re
                    doc_matches = re.findall(r'\[Document: (.*?)\]', doc_context)
                    sources = list(set(doc_matches))[:3]  # Top 3 unique sources
                    
            except Exception as e:
                logger.warning(f"Document search failed: {e}")
        
        # 2. Add memory context if enabled
        memory_used = False
        if request.use_memory and memory_engine:
            try:
                # Get user preferences
                preferences = await memory_engine.get_user_preferences(user_id)
                
                if preferences:
                    pref_context = f"""User preferences:
- Communication style: {preferences.communication_style}
- Response pace: {preferences.response_pace}
- Areas of expertise: {', '.join(preferences.expertise_areas[:3]) if preferences.expertise_areas else 'general'}"""
                    context_parts.append(pref_context)
                    memory_used = True
                
                # Get recent conversation summaries for context
                summaries = await memory_engine.get_conversation_summaries(user_id, limit=2)
                if summaries:
                    recent_context = "Recent conversation topics: " + ", ".join(
                        [s.key_topics[0] if s.key_topics else "general" for s in summaries]
                    )
                    context_parts.append(recent_context)
                    
            except Exception as e:
                logger.warning(f"Memory retrieval failed: {e}")
        
        # 3. Build enhanced message with all context
        if context_parts:
            context_str = "\n\n".join(context_parts)
            enhanced_message = f"""{context_str}

User's current question: {request.message}

Please provide a helpful response using any relevant context from above."""
        
        # 4. Get response from LLM
        logger.info(f"Processing chat with memory={memory_used}, documents={documents_used}")
        
        if request.stream:
            # Streaming not implemented in this simple version
            return ChatResponse(
                response="Streaming not yet implemented. Please use non-streaming mode.",
                model_used="none",
                response_time=0,
                cost=0,
                session_id=session_id,
                memory_used=False,
                documents_used=False
            )
        
        # Route to appropriate LLM
        result = await smart_router.route_message(enhanced_message)
        
        if result.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {result.error}")
        
        # 5. Store conversation in memory (background task)
        if memory_engine and user_id:
            background_tasks.add_task(
                store_conversation,
                session_id,
                user_id,
                request.message,
                result.content,
                result.model_used
            )
        
        # 6. Return response
        return ChatResponse(
            response=result.content,
            model_used=result.model_used,
            response_time=result.response_time,
            cost=result.cost,
            session_id=session_id,
            memory_used=memory_used,
            documents_used=documents_used,
            sources=sources if sources else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def store_conversation(
    session_id: str,
    user_id: str,
    user_message: str,
    ai_response: str,
    model_used: str
):
    """
    Background task to store conversation in memory
    """
    try:
        # Store session context
        await memory_engine.store_session_context(
            session_id=session_id,
            user_id=user_id,
            context={
                "messages": [
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": ai_response}
                ],
                "model_used": model_used,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # Create conversation summary (simple version)
        # Extract key topics (simplified - just use first few words)
        words = user_message.split()[:10]
        key_topics = [" ".join(words[:5])] if len(words) >= 5 else [user_message[:50]]
        
        summary = ConversationSummary(
            session_id=session_id,
            user_id=user_id,
            summary=f"Discussed: {user_message[:100]}...",
            key_topics=key_topics,
            timestamp=datetime.now().isoformat(),
            message_count=2
        )
        
        await memory_engine.add_conversation_summary(user_id, summary)
        
    except Exception as e:
        logger.error(f"Failed to store conversation: {e}")

@router.get("/history/{user_id}")
async def get_chat_history(
    user_id: str,
    limit: int = 10
):
    """
    Get user's chat history
    """
    if not memory_engine:
        raise HTTPException(status_code=503, detail="Memory service not initialized")
    
    try:
        summaries = await memory_engine.get_conversation_summaries(user_id, limit)
        
        return {
            "success": True,
            "user_id": user_id,
            "conversations": [
                {
                    "session_id": s.session_id,
                    "summary": s.summary,
                    "topics": s.key_topics,
                    "timestamp": s.timestamp,
                    "message_count": s.message_count
                }
                for s in summaries
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def submit_feedback(
    session_id: str,
    rating: int,  # 1-5
    feedback: Optional[str] = None
):
    """
    Submit feedback for a conversation
    """
    try:
        # Store feedback (simplified - just log for now)
        logger.info(f"Feedback for session {session_id}: Rating={rating}, Feedback={feedback}")
        
        return {
            "success": True,
            "message": "Thank you for your feedback!"
        }
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))