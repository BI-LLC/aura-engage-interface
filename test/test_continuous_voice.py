#!/usr/bin/env python3
"""
Test script for continuous voice conversation system
"""

import asyncio
import websockets
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_continuous_voice():
    """Test the continuous voice WebSocket endpoint"""
    
    # Test WebSocket connection
    uri = "ws://localhost:8000/ws/voice/continuous?token=demo_token"
    
    try:
        logger.info(f"Connecting to {uri}")
        
        async with websockets.connect(uri) as websocket:
            logger.info("✅ WebSocket connected successfully!")
            
            # Wait for greeting message
            try:
                greeting = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"📨 Received greeting: {greeting}")
                
                # Send a test message
                test_message = {"type": "ping"}
                await websocket.send(json.dumps(test_message))
                logger.info("📤 Sent ping message")
                
                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"📨 Received response: {response}")
                
                # Send end call
                end_message = {"type": "end_call"}
                await websocket.send(json.dumps(end_message))
                logger.info("📤 Sent end call message")
                
            except asyncio.TimeoutError:
                logger.error("❌ Timeout waiting for response")
                
    except Exception as e:
        logger.error(f"❌ WebSocket connection failed: {e}")

async def test_voice_pipeline():
    """Test the voice pipeline components"""
    
    try:
        from app.services.voice_pipeline import VoicePipeline
        
        # Initialize voice pipeline
        pipeline = VoicePipeline()
        
        # Check status
        status = pipeline.get_pipeline_status()
        logger.info(f"🎤 Voice pipeline status: {status}")
        
        # Test TTS
        if status["elevenlabs_available"]:
            logger.info("Testing text-to-speech...")
            result = await pipeline.synthesize_speech("Hello, this is a test of the voice system.")
            if result.audio_base64:
                logger.info(f"✅ TTS successful: {len(result.audio_base64)} chars")
            else:
                logger.error("❌ TTS failed")
        else:
            logger.warning("⚠️ ElevenLabs not available")
            
        # Test STT availability
        if status["whisper_available"]:
            logger.info("✅ Whisper (STT) available")
        else:
            logger.warning("⚠️ Whisper not available")
            
    except Exception as e:
        logger.error(f"❌ Voice pipeline test failed: {e}")

async def main():
    """Run all tests"""
    logger.info("🚀 Starting continuous voice system tests...")
    
    # Test voice pipeline first
    await test_voice_pipeline()
    
    # Test WebSocket connection
    await test_continuous_voice()
    
    logger.info("🏁 Tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
