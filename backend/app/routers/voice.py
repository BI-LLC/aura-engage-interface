# backend/app/routers/voice.py
# Enhanced with real-time streaming support

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, Dict, AsyncGenerator
import base64
import logging
import json
import asyncio
import io

from app.services.voice_pipeline import VoicePipeline, AudioTranscription, AudioSynthesis
from app.services.smart_router import SmartRouter
from app.services.memory_engine import MemoryEngine

logger = logging.getLogger(__name__)

# Set up API routes
router = APIRouter(prefix="/voice", tags=["voice"])

# Voice processing services
voice_pipeline = VoicePipeline()
smart_router = None  # Gets injected from main app
memory_engine = None  # Gets injected from main app

def set_services(sr: SmartRouter, me: MemoryEngine):
    """Set service instances from main app"""
    global smart_router, memory_engine
    smart_router = sr
    memory_engine = me

# === EXISTING ENDPOINTS (keep all your current endpoints) ===

@router.get("/status")
async def get_voice_status():
    """Check voice pipeline status"""
    status = voice_pipeline.get_pipeline_status()
    return {
        "status": "operational" if status["fully_functional"] else "partial",
        "components": status,
        "message": "Voice pipeline ready" if status["fully_functional"] else "Some components missing"
    }

# === NEW STREAMING ENDPOINTS ===

@router.websocket("/stream")
async def websocket_streaming_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice streaming
    Handles continuous audio chunks and streams responses
    """
    await websocket.accept()
    logger.info("WebSocket streaming connection established")
    
    audio_buffer = bytearray()
    user_id = None
    session_id = None
    
    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()
            data = json.loads(message)
            
            if data["type"] == "audio_chunk":
                # Add audio to buffer
                audio_bytes = base64.b64decode(data["audio"])
                audio_buffer.extend(audio_bytes)
                
                # Set user info
                if not user_id:
                    user_id = data.get("user_id", "anonymous")
                
            elif data["type"] == "end_of_speech":
                # Process accumulated audio
                if len(audio_buffer) > 0:
                    # Transcribe
                    transcription = await voice_pipeline.transcribe_audio(
                        bytes(audio_buffer), 
                        audio_format="wav"
                    )
                    
                    if transcription.text:
                        # Send transcription back
                        await websocket.send_text(json.dumps({
                            "type": "transcription",
                            "text": transcription.text
                        }))
                        
                        # Get LLM response with streaming
                        response_generator = smart_router.route_message_stream(
                            transcription.text,
                            {"user_id": user_id} if user_id else None
                        )
                        
                        # Stream response chunks
                        full_response = ""
                        async for chunk in response_generator:
                            full_response += chunk
                            
                            # Generate TTS for chunk (if it's a complete sentence)
                            if any(punct in chunk for punct in ['.', '!', '?']):
                                audio_result = await voice_pipeline.synthesize_speech(
                                    chunk,
                                    voice_settings={
                                        "stability": 0.5,
                                        "similarity_boost": 0.75,
                                        "optimize_streaming_latency": 4
                                    }
                                )
                                
                                if audio_result.audio_base64:
                                    await websocket.send_text(json.dumps({
                                        "type": "audio_stream",
                                        "chunk": audio_result.audio_base64
                                    }))
                        
                        # Send completion
                        await websocket.send_text(json.dumps({
                            "type": "stream_complete",
                            "full_response": full_response
                        }))
                    
                    # Clear buffer
                    audio_buffer.clear()
            
            elif data["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))

@router.post("/stream/process")
async def streaming_voice_process(
    audio: UploadFile = File(...),
    user_id: Optional[str] = Form(default=None)
):
    """
    Process voice with streaming response
    Returns Server-Sent Events stream
    """
    async def generate():
        try:
            # Read and transcribe audio
            audio_data = await audio.read()
            audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'wav'
            
            transcription = await voice_pipeline.transcribe_audio(audio_data, audio_format)
            
            # Send transcription
            yield f"data: {json.dumps({'type': 'transcription', 'text': transcription.text})}\n\n"
            
            # Stream LLM response
            response_text = ""
            async for chunk in smart_router.route_message_stream(transcription.text):
                response_text += chunk
                
                # Send text chunk
                yield f"data: {json.dumps({'type': 'text_chunk', 'text': chunk})}\n\n"
                
                # Generate TTS for complete sentences
                if any(punct in chunk for punct in ['.', '!', '?']):
                    audio_result = await voice_pipeline.synthesize_speech(chunk)
                    if audio_result.audio_base64:
                        yield f"data: {json.dumps({'type': 'audio_chunk', 'audio': audio_result.audio_base64})}\n\n"
            
            # Send completion
            yield f"data: {json.dumps({'type': 'complete', 'full_text': response_text})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# === KEEP ALL YOUR EXISTING ENDPOINTS BELOW ===

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form(default="en")
):
    """Convert speech to text"""
    # ... (keep your existing implementation)
    try:
        audio_data = await audio.read()
        audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        logger.info(f"Received audio for transcription: {len(audio_data)} bytes, format: {audio_format}")
        
        result = await voice_pipeline.transcribe_audio(audio_data, audio_format)
        
        if not result.text:
            raise HTTPException(status_code=400, detail="Failed to transcribe audio")
        
        return {
            "success": True,
            "text": result.text,
            "language": result.language,
            "confidence": result.confidence
        }
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/synthesize")
async def synthesize_speech(
    text: str = Form(...),
    voice_id: Optional[str] = Form(default=None),
    stability: float = Form(default=0.5),
    similarity_boost: float = Form(default=0.75)
):
    """Convert text to speech"""
    # ... (keep your existing implementation)
    try:
        logger.info(f"Synthesizing speech for text: {text[:50]}...")
        
        voice_settings = {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": 0.0,
            "use_speaker_boost": True
        }
        
        result = await voice_pipeline.synthesize_speech(text, voice_id, voice_settings)
        
        if not result.audio_base64:
            raise HTTPException(status_code=400, detail="Failed to synthesize speech")
        
        return {
            "success": True,
            "audio": result.audio_base64,
            "content_type": result.content_type,
            "characters": result.characters_used
        }
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process")
async def process_voice_message(
    audio: UploadFile = File(...),
    user_id: Optional[str] = Form(default=None),
    session_id: Optional[str] = Form(default=None),
    use_memory: bool = Form(default=True),
    voice_id: Optional[str] = Form(default=None)
):
    """Complete voice processing (keep existing implementation)"""
    # ... (keep all your existing code)
    try:
        if not smart_router:
            raise HTTPException(status_code=503, detail="Services not initialized")
        
        audio_data = await audio.read()
        audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        
        transcription = await voice_pipeline.transcribe_audio(audio_data, audio_format)
        
        if not transcription.text:
            raise HTTPException(status_code=400, detail="Failed to transcribe audio")
        
        logger.info(f"Transcribed: {transcription.text[:50]}...")
        
        message_text = transcription.text
        
        if use_memory and user_id and memory_engine:
            preferences = await memory_engine.get_user_preferences(user_id)
            if preferences:
                context_prompt = f"""
                User preferences:
                - Communication style: {preferences.communication_style}
                - Response pace: {preferences.response_pace}
                
                User said: {message_text}
                
                Please respond according to the user's preferences.
                """
                message_text = context_prompt
        
        llm_response = await smart_router.route_message(message_text)
        
        if llm_response.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {llm_response.error}")
        
        logger.info(f"LLM response: {llm_response.content[:50]}...")
        
        audio_synthesis = await voice_pipeline.synthesize_speech(llm_response.content, voice_id)
        
        if user_id and memory_engine:
            session_id = session_id or memory_engine.generate_session_id(user_id)
            await memory_engine.store_session_context(
                session_id,
                user_id,
                {
                    "voice_input": transcription.text,
                    "llm_response": llm_response.content[:500],
                    "model_used": llm_response.model_used
                }
            )
        
        return {
            "success": True,
            "transcription": transcription.text,
            "response": llm_response.content,
            "audio": audio_synthesis.audio_base64,
            "model_used": llm_response.model_used,
            "response_time": llm_response.response_time,
            "cost": llm_response.cost,
            "session_id": session_id if user_id else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/stream/voice")
async def stream_voice_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice streaming
    Handles continuous audio chunks and streams responses
    """
    await websocket.accept()
    logger.info("WebSocket streaming connection established")
    
    audio_buffer = bytearray()
    user_id = None
    session_id = None
    
    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()
            data = json.loads(message)
            
            if data["type"] == "audio_chunk":
                # Add audio to buffer
                audio_bytes = base64.b64decode(data["audio"])
                audio_buffer.extend(audio_bytes)
                
                # Set user info
                if not user_id:
                    user_id = data.get("user_id", "anonymous")
                
            elif data["type"] == "end_of_speech":
                # Process accumulated audio
                if len(audio_buffer) > 0:
                    # Transcribe
                    transcription = await voice_pipeline.transcribe_audio(
                        bytes(audio_buffer), 
                        audio_format="wav"
                    )
                    
                    if transcription.text:
                        # Send transcription back
                        await websocket.send_text(json.dumps({
                            "type": "transcription",
                            "text": transcription.text
                        }))
                        
                        # Get LLM response with streaming
                        if smart_router:
                            response_generator = smart_router.route_message_stream(
                                transcription.text,
                                {"user_id": user_id} if user_id else None
                            )
                            
                            # Stream response chunks
                            full_response = ""
                            async for chunk in response_generator:
                                full_response += chunk
                                
                                # Generate TTS for chunk (if it's a complete sentence)
                                if any(punct in chunk for punct in ['.', '!', '?']):
                                    audio_result = await voice_pipeline.synthesize_speech(
                                        chunk,
                                        voice_settings={
                                            "stability": 0.5,
                                            "similarity_boost": 0.75,
                                            "optimize_streaming_latency": 4
                                        }
                                    )
                                    
                                    if audio_result.audio_base64:
                                        await websocket.send_text(json.dumps({
                                            "type": "audio_stream",
                                            "chunk": audio_result.audio_base64
                                        }))
                            
                            # Send completion
                            await websocket.send_text(json.dumps({
                                "type": "stream_complete",
                                "full_response": full_response
                            }))
                        else:
                            # Fallback if smart_router not available
                            await websocket.send_text(json.dumps({
                                "type": "error",
                                "message": "Smart router not available"
                            }))
                    
                    # Clear buffer
                    audio_buffer.clear()
            
            elif data["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))