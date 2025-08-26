# Voice router for AURA Voice AI
# Week 5-6: Voice endpoints for STT and TTS

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict
import base64
import logging

from app.services.voice_pipeline import VoicePipeline, AudioTranscription, AudioSynthesis
from app.services.smart_router import SmartRouter
from app.services.memory_engine import MemoryEngine

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/voice", tags=["voice"])

# Initialize services
voice_pipeline = VoicePipeline()
smart_router = None  # Will be set from main
memory_engine = None  # Will be set from main

def set_services(sr: SmartRouter, me: MemoryEngine):
    """Set service instances from main app"""
    global smart_router, memory_engine
    smart_router = sr
    memory_engine = me

@router.get("/status")
async def get_voice_status():
    """Check voice pipeline status"""
    status = voice_pipeline.get_pipeline_status()
    return {
        "status": "operational" if status["fully_functional"] else "partial",
        "components": status,
        "message": "Voice pipeline ready" if status["fully_functional"] else "Some components missing"
    }

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form(default="en")
):
    """
    Convert speech to text
    Accepts audio file (webm, wav, mp3, etc.)
    """
    try:
        # Read audio data
        audio_data = await audio.read()
        
        # Get file extension
        audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        
        logger.info(f"Received audio for transcription: {len(audio_data)} bytes, format: {audio_format}")
        
        # Transcribe
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
    """
    Convert text to speech
    Returns audio as base64 encoded string
    """
    try:
        logger.info(f"Synthesizing speech for text: {text[:50]}...")
        
        # Voice settings
        voice_settings = {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": 0.0,
            "use_speaker_boost": True
        }
        
        # Synthesize
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
    """
    Complete voice processing:
    1. Speech to text
    2. Process with LLM
    3. Text to speech
    """
    try:
        if not smart_router:
            raise HTTPException(status_code=503, detail="Services not initialized")
        
        # Step 1: Transcribe audio
        audio_data = await audio.read()
        audio_format = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        
        transcription = await voice_pipeline.transcribe_audio(audio_data, audio_format)
        
        if not transcription.text:
            raise HTTPException(status_code=400, detail="Failed to transcribe audio")
        
        logger.info(f"Transcribed: {transcription.text[:50]}...")
        
        # Step 2: Process with LLM (reuse chat logic)
        message_text = transcription.text
        
        # Add memory context if available
        if use_memory and user_id and memory_engine:
            preferences = await memory_engine.get_user_preferences(user_id)
            if preferences:
                # Add context to message
                context_prompt = f"""
                User preferences:
                - Communication style: {preferences.communication_style}
                - Response pace: {preferences.response_pace}
                
                User said: {message_text}
                
                Please respond according to the user's preferences.
                """
                message_text = context_prompt
        
        # Get LLM response
        llm_response = await smart_router.route_message(message_text)
        
        if llm_response.error:
            raise HTTPException(status_code=503, detail=f"LLM Error: {llm_response.error}")
        
        logger.info(f"LLM response: {llm_response.content[:50]}...")
        
        # Step 3: Convert response to speech
        audio_synthesis = await voice_pipeline.synthesize_speech(llm_response.content, voice_id)
        
        # Store conversation if user_id provided
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

@router.get("/voices")
async def get_available_voices():
    """Get list of available voices from ElevenLabs"""
    try:
        voices = await voice_pipeline.get_available_voices()
        return {
            "success": True,
            "voices": voices,
            "count": len(voices)
        }
    except Exception as e:
        logger.error(f"Error getting voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_voice_pipeline():
    """Test the voice pipeline components"""
    try:
        results = await voice_pipeline.test_pipeline()
        return {
            "success": results["pipeline"],
            "components": results,
            "message": "All components working" if results["pipeline"] else "Some components not configured"
        }
    except Exception as e:
        logger.error(f"Test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))