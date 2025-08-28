# Chat API endpoints
# Handles conversations with personalization and knowledge search

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict
import logging
import uuid
from datetime import datetime

from app.services.smart_router import SmartRouter
from app.services.memory_engine import MemoryEngine, ConversationSummary
from app.services.persona_manager import PersonaManager
from app.services.data_ingestion import DataIngestionService

logger = logging.getLogger(__name__)

# Set up chat endpoints
router = APIRouter(prefix="/chat", tags=["chat"])

# Services that get injected from main app
smart_router = None
memory_engine = None
persona_manager = PersonaManager()
data_service = DataIngestionService()

# API data models
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    use_memory: bool = True
    use_persona: bool = True
    search_knowledge: bool = True

class ChatResponse(BaseModel):
    response: str
    session_id: str
    model_used: str
    response_time: float
    cost: float
    persona_applied: bool
    knowledge_used: bool
    sources: List[str] = []

def set_services(sr: SmartRouter, me: MemoryEngine):
    """Set service instances from main app"""
    global smart_router, memory_engine
    smart_router = sr
    memory_engine = me

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks
):
    """Enhanced chat endpoint with persona and knowledge integration"""
    try:
        if not smart_router:
            raise HTTPException(status_code=503, detail="Services not initialized")
        
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        user_id = request.user_id or "anonymous"
        
        # Step 1: Search knowledge base if enabled
        knowledge_context = ""
        sources = []
        
        if request.search_knowledge and user_id != "anonymous":
            search_results = await data_service.search_documents(
                request.message,
                user_id,
                limit=3
            )
            
            if search_results:
                knowledge_context = "\n\nRelevant information from your documents:\n"
                for result in search_results:
                    sources.append(result["filename"])
                    for chunk in result["relevant_chunks"][:2]:
                        knowledge_context += f"- {chunk['chunk'][:200]}...\n"
        
        # Step 2: Get memory context if enabled
        memory_context = ""
        
        if request.use_memory and user_id != "anonymous" and memory_engine:
            try:
                # Get user preferences
                preferences = await memory_engine.get_user_preferences(user_id)
                
                # Get recent conversation summaries
                summaries = await memory_engine.get_conversation_summaries(user_id, limit=3)
                
                if preferences or summaries:
                    memory_context = "\n\nUser context:\n"
                    
                    if preferences:
                        memory_context += f"- Communication style: {preferences.communication_style}\n"
                        memory_context += f"- Preferred pace: {preferences.response_pace}\n"
                        if preferences.expertise_areas:
                            memory_context += f"- Areas of interest: {', '.join(preferences.expertise_areas[:3])}\n"
                    
                    if summaries:
                        memory_context += "Recent conversations:\n"
                        for summary in summaries[-2:]:
                            memory_context += f"- {summary.summary[:100]}...\n"
                
            except Exception as e:
                logger.warning(f"Memory retrieval failed: {e}")
        
        # Step 3: Apply persona if enabled
        enhanced_message = request.message
        persona_applied = False
        
        if request.use_persona and user_id != "anonymous":
            try:
                enhanced_message = await persona_manager.apply_persona_to_message(
                    request.message,
                    user_id
                )
                persona_applied = True
            except Exception as e:
                logger.warning(f"Persona application failed: {e}")
        
        # Step 4: Combine all context
        full_message = enhanced_message
        
        if knowledge_context:
            full_message += knowledge_context
        
        if memory_context:
            full_message += memory_context
        
        # Step 5: Route to LLM
        llm_response = await smart_router.route_message(full_message)
        
        if llm_response.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {llm_response.error}")
        
        # Step 6: Store conversation in background
        if user_id != "anonymous" and memory_engine:
            background_tasks.add_task(
                store_conversation,
                session_id,
                user_id,
                request.message,
                llm_response.content,
                llm_response.model_used
            )
        
        # Step 7: Update persona based on interaction
        if request.use_persona and user_id != "anonymous":
            background_tasks.add_task(
                update_persona_feedback,
                user_id,
                request.message,
                llm_response.content
            )
        
        return ChatResponse(
            response=llm_response.content,
            session_id=session_id,
            model_used=llm_response.model_used,
            response_time=llm_response.response_time,
            cost=llm_response.cost,
            persona_applied=persona_applied,
            knowledge_used=bool(knowledge_context),
            sources=sources
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def provide_feedback(
    session_id: str,
    user_id: str,
    rating: int,
    feedback: Optional[str] = None
):
    """Collect user feedback on responses"""
    try:
        # Store feedback for persona learning
        if user_id != "anonymous":
            await persona_manager.update_persona(
                user_id,
                {
                    "satisfaction_rating": rating,
                    "feedback": feedback,
                    "session_id": session_id
                }
            )
        
        return {"success": True, "message": "Feedback received"}
        
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{user_id}")
async def get_chat_history(
    user_id: str,
    limit: int = 10
):
    """Get user's chat history"""
    try:
        if not memory_engine:
            return {"conversations": [], "message": "Memory not available"}
        
        summaries = await memory_engine.get_conversation_summaries(user_id, limit)
        
        return {
            "user_id": user_id,
            "conversations": [
                {
                    "session_id": s.session_id,
                    "summary": s.summary,
                    "topics": s.key_topics,
                    "timestamp": s.timestamp,
                    "messages": s.message_count
                }
                for s in summaries
            ]
        }
        
    except Exception as e:
        logger.error(f"History retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context/{user_id}")
async def get_user_context(user_id: str):
    """Get complete user context (memory, persona, knowledge)"""
    try:
        context = {
            "user_id": user_id,
            "memory": None,
            "persona": None,
            "documents": []
        }
        
        # Get memory preferences
        if memory_engine:
            preferences = await memory_engine.get_user_preferences(user_id)
            if preferences:
                context["memory"] = {
                    "communication_style": preferences.communication_style,
                    "response_pace": preferences.response_pace,
                    "expertise_areas": preferences.expertise_areas
                }
        
        # Get persona
        persona_stats = await persona_manager.get_persona_stats(user_id)
        context["persona"] = persona_stats
        
        # Get documents
        documents = await data_service.get_user_documents(user_id)
        context["documents"] = documents
        
        return context
        
    except Exception as e:
        logger.error(f"Context retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Background tasks
async def store_conversation(
    session_id: str,
    user_id: str,
    message: str,
    response: str,
    model_used: str
):
    """Store conversation in memory (background task)"""
    try:
        if not memory_engine:
            return
        
        # Store session context
        await memory_engine.store_session_context(
            session_id,
            user_id,
            {
                "message": message,
                "response": response[:500],
                "model": model_used,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # Create conversation summary
        summary = ConversationSummary(
            session_id=session_id,
            user_id=user_id,
            summary=f"Discussed: {message[:100]}",
            key_topics=extract_topics(message),
            timestamp=datetime.now().isoformat(),
            message_count=1
        )
        
        await memory_engine.add_conversation_summary(user_id, summary)
        
    except Exception as e:
        logger.error(f"Failed to store conversation: {e}")

async def update_persona_feedback(
    user_id: str,
    message: str,
    response: str
):
    """Update persona based on interaction (background task)"""
    try:
        # Simple feedback signals
        feedback = {
            "conversation_length": len(message.split()) + len(response.split()),
            "follow_up_questions": message.count("?"),
            "requested_examples": "example" in message.lower() or "show me" in message.lower()
        }
        
        await persona_manager.update_persona(user_id, feedback)
        
    except Exception as e:
        logger.error(f"Failed to update persona: {e}")

def extract_topics(text: str) -> List[str]:
    """Extract key topics from text (simple implementation)"""
    # Simple keyword extraction
    words = text.lower().split()
    
    # Filter common words
    stop_words = {"the", "is", "at", "which", "on", "and", "a", "an", "as", "are", "was", "were", "been", "be", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "could"}
    
    topics = []
    for word in words:
        if len(word) > 4 and word not in stop_words:
            topics.append(word)
    
    return list(set(topics))[:5]  # Return top 5 unique topics