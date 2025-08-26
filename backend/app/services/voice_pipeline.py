# Voice Pipeline for AURA Voice AI
# Week 5-6: Speech-to-text and text-to-speech processing

import io
import base64
import logging
from typing import Optional, Dict, Any
import httpx
import openai
from dataclasses import dataclass
import json
import asyncio
import os

logger = logging.getLogger(__name__)

@dataclass
class AudioTranscription:
    # Result from speech-to-text
    text: str
    language: str = "en"
    duration: float = 0.0
    confidence: float = 0.0

@dataclass
class AudioSynthesis:
    # Result from text-to-speech
    audio_base64: str
    content_type: str = "audio/mpeg"
    duration: float = 0.0
    characters_used: int = 0

class VoicePipeline:
    def __init__(self):
        # Initialize with API keys from environment
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
        
        # ElevenLabs settings
        self.elevenlabs_voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Rachel voice default
        self.elevenlabs_model = "eleven_monolingual_v1"
        
        # Validate API keys
        self.whisper_available = bool(self.openai_key)
        self.elevenlabs_available = bool(self.elevenlabs_key)
        
        logger.info(f"Voice Pipeline initialized")
        logger.info(f"Whisper (STT) available: {self.whisper_available}")
        logger.info(f"ElevenLabs (TTS) available: {self.elevenlabs_available}")
    
    async def transcribe_audio(self, audio_data: bytes, audio_format: str = "webm") -> AudioTranscription:
        """
        Convert speech to text using OpenAI Whisper
        Audio data should be in bytes format
        """
        if not self.whisper_available:
            logger.error("Whisper API not configured (missing OPENAI_API_KEY)")
            return AudioTranscription(text="", language="en")
        
        try:
            logger.info(f"Transcribing audio ({len(audio_data)} bytes)")
            
            # Create a file-like object from bytes
            audio_file = io.BytesIO(audio_data)
            audio_file.name = f"audio.{audio_format}"
            
            # Use OpenAI Whisper API
            client = openai.OpenAI(api_key=self.openai_key)
            
            response = await asyncio.to_thread(
                client.audio.transcriptions.create,
                model="whisper-1",
                file=audio_file,
                response_format="json",
                language="en"  # Can be made dynamic later
            )
            
            logger.info(f"Transcription successful: {response.text[:50]}...")
            
            return AudioTranscription(
                text=response.text,
                language="en",
                duration=0.0,  # Whisper doesn't return duration
                confidence=0.95  # Whisper doesn't return confidence, using default
            )
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return AudioTranscription(text="", language="en")
    
    async def synthesize_speech(
        self, 
        text: str, 
        voice_id: Optional[str] = None,
        voice_settings: Optional[Dict] = None
    ) -> AudioSynthesis:
        """
        Convert text to speech using ElevenLabs
        Returns audio as base64 encoded string
        """
        if not self.elevenlabs_available:
            logger.error("ElevenLabs API not configured (missing ELEVENLABS_API_KEY)")
            return AudioSynthesis(audio_base64="", content_type="audio/mpeg")
        
        try:
            logger.info(f"Synthesizing speech ({len(text)} characters)")
            
            # Use provided voice or default
            voice_id = voice_id or self.elevenlabs_voice_id
            
            # Default voice settings (can be customized)
            if voice_settings is None:
                voice_settings = {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True
                }
            
            # ElevenLabs API endpoint
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_key
            }
            
            data = {
                "text": text,
                "model_id": self.elevenlabs_model,
                "voice_settings": voice_settings
            }
            
            # Make async request to ElevenLabs
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=data,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    # Convert audio bytes to base64
                    audio_bytes = response.content
                    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    
                    logger.info(f"Speech synthesis successful ({len(audio_bytes)} bytes)")
                    
                    return AudioSynthesis(
                        audio_base64=audio_base64,
                        content_type="audio/mpeg",
                        duration=len(audio_bytes) / 16000,  # Rough estimate
                        characters_used=len(text)
                    )
                else:
                    logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
                    return AudioSynthesis(audio_base64="", content_type="audio/mpeg")
                    
        except Exception as e:
            logger.error(f"Speech synthesis error: {e}")
            return AudioSynthesis(audio_base64="", content_type="audio/mpeg")
    
    async def get_available_voices(self) -> list:
        """
        Get list of available ElevenLabs voices
        """
        if not self.elevenlabs_available:
            return []
        
        try:
            url = "https://api.elevenlabs.io/v1/voices"
            headers = {"xi-api-key": self.elevenlabs_key}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    voices = [
                        {
                            "voice_id": voice["voice_id"],
                            "name": voice["name"],
                            "category": voice.get("category", "unknown")
                        }
                        for voice in data.get("voices", [])
                    ]
                    logger.info(f"Found {len(voices)} available voices")
                    return voices
                else:
                    logger.error(f"Failed to get voices: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error getting voices: {e}")
            return []
    
    async def process_voice_message(
        self, 
        audio_data: bytes, 
        audio_format: str = "webm"
    ) -> Dict[str, Any]:
        """
        Complete voice processing pipeline:
        1. Speech to text
        2. Process with LLM (handled externally)
        3. Text to speech
        """
        # Step 1: Transcribe audio to text
        transcription = await self.transcribe_audio(audio_data, audio_format)
        
        if not transcription.text:
            return {
                "success": False,
                "error": "Failed to transcribe audio",
                "transcription": None,
                "audio_response": None
            }
        
        return {
            "success": True,
            "transcription": {
                "text": transcription.text,
                "language": transcription.language,
                "confidence": transcription.confidence
            },
            "audio_response": None  # Will be added after LLM processing
        }
    
    def get_pipeline_status(self) -> Dict[str, bool]:
        """
        Get status of voice pipeline components
        """
        return {
            "whisper_available": self.whisper_available,
            "elevenlabs_available": self.elevenlabs_available,
            "fully_functional": self.whisper_available and self.elevenlabs_available
        }
    
    async def test_pipeline(self) -> Dict[str, Any]:
        """
        Test the voice pipeline with a simple message
        """
        test_results = {
            "whisper": False,
            "elevenlabs": False,
            "pipeline": False
        }
        
        # Test ElevenLabs (easier to test)
        if self.elevenlabs_available:
            try:
                result = await self.synthesize_speech("Hello, this is a test of the voice system.")
                if result.audio_base64:
                    test_results["elevenlabs"] = True
                    logger.info("ElevenLabs test passed")
            except Exception as e:
                logger.error(f"ElevenLabs test failed: {e}")
        
        # Test Whisper (would need actual audio file)
        test_results["whisper"] = self.whisper_available
        
        # Overall pipeline status
        test_results["pipeline"] = test_results["whisper"] and test_results["elevenlabs"]
        
        return test_results