"""
Continuous Conversation Manager
Handles natural back-and-forth dialogue without button pressing
"""

import asyncio
import logging
from typing import AsyncGenerator, Optional, Dict, List
from datetime import datetime
import json
import time

logger = logging.getLogger(__name__)

class ContinuousConversationManager:
    def __init__(
        self,
        voice_pipeline,
        smart_router,
        tenant_manager=None
    ):
        """Initialize continuous conversation system"""
        self.voice_pipeline = voice_pipeline
        self.smart_router = smart_router
        self.tenant_manager = tenant_manager
        self.vad = VoiceActivityDetector()
        
        # Conversation state
        self.active_sessions = {}
        
        # Interruption handling
        self.allow_interruptions = True
        self.ai_speaking = False
        
        logger.info("Continuous conversation manager initialized")
    
    async def start_continuous_session(
        self,
        websocket,
        user_id: str,
        tenant_id: Optional[str] = None
    ):
        """
        Start a continuous voice conversation session
        No buttons - just natural talking
        """
        session_id = f"voice_{user_id}_{datetime.now().timestamp()}"
        
        # Initialize session state
        session = {
            "session_id": session_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "start_time": datetime.now(),
            "conversation_history": [],
            "context": {},
            "is_ai_speaking": False,
            "audio_buffer": [],
            "last_activity": time.time()
        }
        
        # Load tenant context if multi-tenant
        if tenant_id and self.tenant_manager:
            session["context"] = await self.tenant_manager.get_tenant_context(tenant_id)
        
        self.active_sessions[session_id] = session
        
        try:
            # Send initial greeting
            await self._send_greeting(websocket, session)
            
            # Main conversation loop
            await self._conversation_loop(websocket, session)
            
        except Exception as e:
            logger.error(f"Conversation error: {e}")
        finally:
            # Cleanup
            await self._end_session(session_id)
    
    async def _conversation_loop(self, websocket, session: Dict):
        """
        Main conversation loop - handles continuous audio flow
        """
        logger.info(f"Starting continuous conversation for user {session['user_id']}")
        
        # Create parallel tasks for receiving and processing
        receive_task = asyncio.create_task(self._receive_audio_stream(websocket, session))
        process_task = asyncio.create_task(self._process_audio_stream(websocket, session))
        
        try:
            # Run both tasks concurrently
            await asyncio.gather(receive_task, process_task)
            
        except asyncio.CancelledError:
            logger.info("Conversation tasks cancelled")
        except Exception as e:
            logger.error(f"Conversation loop error: {e}")
    
    async def _receive_audio_stream(self, websocket, session: Dict):
        """
        Continuously receive audio from user
        """
        while True:
            try:
                # Receive audio chunk
                data = await websocket.receive_json()
                
                if data["type"] == "audio_chunk":
                    # Add to buffer for processing
                    audio_bytes = data["audio"]
                    session["audio_buffer"].append(audio_bytes)
                    session["last_activity"] = time.time()
                    
                elif data["type"] == "end_call":
                    logger.info("User ended call")
                    break
                    
            except Exception as e:
                logger.error(f"Receive error: {e}")
                break
    
    async def _process_audio_stream(self, websocket, session: Dict):
        """
        Process audio buffer and handle conversation
        """
        while True:
            try:
                # Check if we have audio to process
                if session["audio_buffer"] and not session["is_ai_speaking"]:
                    # Get audio chunk
                    audio_chunk = session["audio_buffer"].pop(0)
                    
                    # Detect voice activity
                    is_speaking, speech_complete, complete_audio = self.vad.process_audio_chunk(
                        audio_chunk
                    )
                    
                    if speech_complete and complete_audio:
                        # User finished speaking - process their input
                        await self._handle_user_speech(
                            websocket,
                            session,
                            complete_audio
                        )
                    
                    elif is_speaking:
                        # User is still speaking
                        # If AI is talking, handle interruption
                        if session["is_ai_speaking"] and self.allow_interruptions:
                            await self._handle_interruption(websocket, session)
                
                # Small delay to prevent CPU spinning
                await asyncio.sleep(0.01)
                
                # Check for timeout (no activity for 30 seconds)
                if time.time() - session["last_activity"] > 30:
                    await self._send_keepalive(websocket)
                    session["last_activity"] = time.time()
                    
            except Exception as e:
                logger.error(f"Process error: {e}")
                break
    
    async def _handle_user_speech(
        self,
        websocket,
        session: Dict,
        audio_data: bytes
    ):
        """
        Handle complete user speech input
        """
        try:
            # Transcribe user's speech
            transcription = await self.voice_pipeline.transcribe_audio(
                audio_data,
                audio_format="raw"
            )
            
            if not transcription.text:
                return
            
            logger.info(f"User said: {transcription.text}")
            
            # Add to conversation history
            session["conversation_history"].append({
                "role": "user",
                "content": transcription.text,
                "timestamp": datetime.now().isoformat()
            })
            
            # Send transcription to frontend (optional)
            await websocket.send_json({
                "type": "user_transcript",
                "text": transcription.text
            })
            
            # Generate AI response
            await self._generate_and_speak_response(
                websocket,
                session,
                transcription.text
            )
            
        except Exception as e:
            logger.error(f"Speech handling error: {e}")
    
    async def _generate_and_speak_response(
        self,
        websocket,
        session: Dict,
        user_input: str
    ):
        """
        Generate AI response and speak it
        """
        session["is_ai_speaking"] = True
        
        try:
            # Build context from conversation history
            context = self._build_conversation_context(session)
            
            # Add tenant context if available
            if session.get("context"):
                context += f"\nOrganization Context: {session['context'].get('organization', '')}"
            
            # Generate response
            full_prompt = f"{context}\n\nUser: {user_input}\n\nAssistant:"
            
            # Get streaming response from LLM
            response_text = ""
            sentence_buffer = ""
            
            async for chunk in self.smart_router.route_message_stream(full_prompt):
                if not session["is_ai_speaking"]:
                    # User interrupted
                    break
                
                response_text += chunk
                sentence_buffer += chunk
                
                # Check for complete sentence
                if any(punct in sentence_buffer for punct in ['.', '!', '?']):
                    # Synthesize and send this sentence
                    audio_result = await self.voice_pipeline.synthesize_speech(
                        sentence_buffer.strip()
                    )
                    
                    # Send audio to user
                    await websocket.send_json({
                        "type": "ai_audio",
                        "audio": audio_result.audio_base64,
                        "text": sentence_buffer.strip()
                    })
                    
                    sentence_buffer = ""
            
            # Send any remaining text
            if sentence_buffer.strip():
                audio_result = await self.voice_pipeline.synthesize_speech(
                    sentence_buffer.strip()
                )
                
                await websocket.send_json({
                    "type": "ai_audio",
                    "audio": audio_result.audio_base64,
                    "text": sentence_buffer.strip()
                })
            
            # Add to conversation history
            session["conversation_history"].append({
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now().isoformat()
            })
            
            # Mark AI as done speaking
            session["is_ai_speaking"] = False
            
            # Send completion signal
            await websocket.send_json({
                "type": "ai_complete",
                "full_response": response_text
            })
            
        except Exception as e:
            logger.error(f"Response generation error: {e}")
            session["is_ai_speaking"] = False
    
    async def _handle_interruption(self, websocket, session: Dict):
        """
        Handle user interrupting AI
        """
        logger.info("User interrupted AI")
        
        # Stop AI from speaking
        session["is_ai_speaking"] = False
        
        # Send interruption signal
        await websocket.send_json({
            "type": "ai_interrupted",
            "message": "AI stopped speaking"
        })
        
        # Clear any pending audio
        session["audio_buffer"].clear()
    
    def _build_conversation_context(self, session: Dict) -> str:
        """
        Build context from recent conversation
        """
        # Get last 5 exchanges
        recent_history = session["conversation_history"][-10:]
        
        if not recent_history:
            return "This is the start of the conversation."
        
        context = "Recent conversation:\n"
        for msg in recent_history:
            role = "User" if msg["role"] == "user" else "AI"
            context += f"{role}: {msg['content']}\n"
        
        return context
    
    async def _send_greeting(self, websocket, session: Dict):
        """
        Send initial greeting when call starts
        """
        greeting = "Hello! I'm AURA, your AI assistant. How can I help you today?"
        
        if session.get("context") and session["context"].get("organization"):
            greeting = f"Hello! I'm AURA, your {session['context']['organization']} assistant. How can I help you today?"
        
        # Synthesize greeting
        audio_result = await self.voice_pipeline.synthesize_speech(greeting)
        
        # Send to user
        await websocket.send_json({
            "type": "greeting",
            "text": greeting,
            "audio": audio_result.audio_base64
        })
        
        # Add to history
        session["conversation_history"].append({
            "role": "assistant",
            "content": greeting,
            "timestamp": datetime.now().isoformat()
        })
    
    async def _send_keepalive(self, websocket):
        """
        Send keepalive ping to maintain connection
        """
        await websocket.send_json({
            "type": "ping",
            "timestamp": datetime.now().isoformat()
        })
    
    async def _end_session(self, session_id: str):
        """
        Clean up session when call ends
        """
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            
            # Save conversation summary
            summary = {
                "session_id": session_id,
                "user_id": session["user_id"],
                "duration": (datetime.now() - session["start_time"]).total_seconds(),
                "message_count": len(session["conversation_history"]),
                "conversation": session["conversation_history"]
            }
            
            # Save to database/storage
            await self._save_conversation_summary(summary)
            
            # Remove from active sessions
            del self.active_sessions[session_id]
            
            logger.info(f"Session {session_id} ended")
    
    async def _save_conversation_summary(self, summary: Dict):
        """
        Save conversation summary for future reference
        """
        # Save to database or file system
        # This would integrate with your memory engine
        pass