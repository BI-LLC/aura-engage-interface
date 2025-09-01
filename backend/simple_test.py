from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import asyncio
import base64
import io
import wave
import numpy as np
from openai import OpenAI
from elevenlabs import generate, save, set_api_key
import os

app = FastAPI()

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/health")
def health():
    return {"status": "healthy", "message": "Server is running!"}

# Initialize OpenAI and ElevenLabs clients
openai_client = None
elevenlabs_api_key = None

# For now, we'll use demo mode without API keys
print("🔧 Running in DEMO mode - API keys not required")
print("📝 Audio will be echoed back without processing")

@app.websocket("/ws/voice/continuous")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🔌 WebSocket connected")
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "transcript",
            "text": "Hello! I'm AURA Voice AI. How can I help you today?"
        })
        
        while True:
            # Receive message from client
            data = await websocket.receive()
            
            if data["type"] == "websocket.receive":
                if "text" in data:
                    # Handle text messages
                    message = json.loads(data["text"])
                    print(f"📝 Received text: {message}")
                    
                    if message.get("type") == "audio":
                        # Handle audio data
                        audio_base64 = message.get("audio")
                        if audio_base64:
                            await process_audio(websocket, audio_base64)
                    else:
                        # Handle regular text messages
                        await process_text(websocket, message.get("text", ""))
                        
                elif "bytes" in data:
                    # Handle binary audio data
                    audio_bytes = data["bytes"]
                    print(f"🎤 Received {len(audio_bytes)} bytes of audio")
                    await process_audio_bytes(websocket, audio_bytes)
                    
    except WebSocketDisconnect:
        print("🔌 WebSocket disconnected")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")

async def process_audio(websocket: WebSocket, audio_base64: str):
    """Process audio data from base64 string"""
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        
        # Convert to WAV format for Whisper
        audio_wav = convert_to_wav(audio_bytes)
        
        # Transcribe with Whisper
        if openai_client:
            transcript = await transcribe_audio(audio_wav)
            if transcript:
                await websocket.send_json({
                    "type": "transcript",
                    "text": f"You said: {transcript}"
                })
                
                # Generate AI response
                response = await generate_ai_response(transcript)
                if response:
                    await websocket.send_json({
                        "type": "transcript",
                        "text": f"AURA: {response}"
                    })
                    
                    # Generate speech
                    audio_response = await generate_speech(response)
                    if audio_response:
                        await websocket.send_json({
                            "type": "audio",
                            "audio": base64.b64encode(audio_response).decode()
                        })
        else:
            await websocket.send_json({
                "type": "transcript",
                "text": "Sorry, speech recognition is not available. Please set OPENAI_API_KEY."
            })
            
    except Exception as e:
        print(f"❌ Audio processing error: {e}")
        await websocket.send_json({
            "type": "error",
            "text": f"Audio processing failed: {str(e)}"
        })

async def process_audio_bytes(websocket: WebSocket, audio_bytes: bytes):
    """Process raw audio bytes"""
    try:
        print(f"🎤 Received {len(audio_bytes)} bytes of audio")
        
        # In demo mode, just echo back the audio
        await websocket.send_json({
            "type": "transcript",
            "text": f"Demo: Received {len(audio_bytes)} bytes of audio"
        })
        
        # Echo back the audio data
        await websocket.send_json({
            "type": "audio",
            "audio": base64.b64encode(audio_bytes).decode()
        })
            
    except Exception as e:
        print(f"❌ Audio processing error: {e}")

async def process_text(websocket: WebSocket, text: str):
    """Process text messages"""
    try:
        # Generate AI response
        response = await generate_ai_response(text)
        if response:
            await websocket.send_json({
                "type": "transcript",
                "text": f"AURA: {response}"
            })
            
            # Generate speech
            audio_response = await generate_speech(response)
            if audio_response:
                await websocket.send_json({
                    "type": "audio",
                    "audio": base64.b64encode(audio_response).decode()
                })
    except Exception as e:
        print(f"❌ Text processing error: {e}")

def convert_to_wav(audio_bytes: bytes) -> bytes:
    """Convert audio bytes to WAV format for Whisper"""
    try:
        # Create a simple WAV file
        with io.BytesIO() as wav_buffer:
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(16000)  # 16kHz
                wav_file.writeframes(audio_bytes)
            return wav_buffer.getvalue()
    except Exception as e:
        print(f"❌ WAV conversion error: {e}")
        return audio_bytes

async def transcribe_audio(audio_wav: bytes) -> str:
    """Transcribe audio using OpenAI Whisper"""
    try:
        if not openai_client:
            return None
            
        # Create a temporary file for the audio
        with io.BytesIO(audio_wav) as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
            return transcript.strip()
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        return None

async def generate_ai_response(text: str) -> str:
    """Generate AI response using OpenAI"""
    try:
        if not openai_client:
            return "I'm sorry, I'm not able to respond right now. Please check your API configuration."
            
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are AURA, a helpful voice AI assistant. Keep responses concise and conversational."},
                {"role": "user", "content": text}
            ],
            max_tokens=150
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"❌ AI response generation error: {e}")
        return "I'm sorry, I encountered an error while processing your request."

async def generate_speech(text: str) -> bytes:
    """Generate speech using ElevenLabs"""
    try:
        if not elevenlabs_api_key:
            return None
            
        audio = generate(
            text=text,
            voice="Rachel",
            model="eleven_monolingual_v1"
        )
        return audio
    except Exception as e:
        print(f"❌ Speech generation error: {e}")
        return None

if __name__ == "__main__":
    print("Starting AURA test server on port 8080...")
    print("WebSocket endpoint: ws://localhost:8080/ws/voice/continuous")
    uvicorn.run(app, host="0.0.0.0", port=8080)
