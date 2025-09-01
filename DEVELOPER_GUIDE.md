# AURA Voice AI - Developer Guide

## 🏗️ Architecture Overview

AURA Voice AI is a real-time voice conversation system with the following architecture:

### Frontend (Vanilla JavaScript)
- **Location**: `frontend/`
- **Technology**: Vanilla JavaScript, HTML5, CSS3
- **Key Components**:
  - `widget/` - Floating voice widget for end users
  - `admin/` - Admin panel for document management
  - `shared/` - Shared API utilities

### Backend (Python/FastAPI)
- **Location**: `backend/`
- **Technology**: FastAPI, WebSockets, OpenAI Whisper, ElevenLabs TTS
- **Key Components**:
  - `app/main.py` - Main FastAPI application
  - `app/routers/` - API route handlers
  - `simple_test.py` - Development test server

## 📁 Project Structure

```
aura-voice-ai/
├── frontend/
│   ├── widget/
│   │   ├── index.html          # Voice widget interface
│   │   ├── widget.css          # Widget styling
│   │   └── widget.js           # Voice call functionality
│   ├── admin/
│   │   ├── index.html          # Admin login
│   │   ├── dashboard.html      # Admin dashboard
│   │   ├── login.js            # Login handler
│   │   ├── dashboard.js        # Dashboard functionality
│   │   └── style.css           # Admin styling
│   ├── shared/
│   │   └── api.js              # Shared API utilities
│   ├── test.html               # Demo page
│   └── index.html              # Main entry point
├── backend/
│   ├── app/
│   │   ├── main.py             # Main FastAPI app
│   │   └── routers/
│   │       └── continuous_voice.py
│   ├── simple_test.py          # Development server
│   └── requirements.txt       # Python dependencies
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd aura-voice-ai/backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional for demo)
export OPENAI_API_KEY="your_openai_key"
export ELEVENLABS_API_KEY="your_elevenlabs_key"

# Start development server
python simple_test.py
```

### 2. Frontend Setup

```bash
cd aura-voice-ai/frontend

# Open in browser (no build step required)
# Navigate to: http://localhost:8080
```

## 🎤 Voice Widget Implementation

### Audio Capture Flow

1. **Microphone Access**: Uses `navigator.mediaDevices.getUserMedia()`
2. **Audio Processing**: Web Audio API with `ScriptProcessorNode`
3. **Real-time Streaming**: Continuous audio chunks via WebSocket
4. **Audio Format**: 16-bit PCM, 16kHz, mono

### Key JavaScript Classes

#### VoiceWidget Class
```javascript
class VoiceWidget {
    constructor() {
        this.isCallActive = false;
        this.websocket = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.scriptProcessor = null;
    }
    
    async startCall() {
        // 1. Get microphone access
        // 2. Connect WebSocket
        // 3. Start audio capture
    }
    
    startAudioCapture() {
        // Real-time audio processing
        // Convert Float32 to Int16
        // Send via WebSocket
    }
    
    handleWebSocketMessage(data) {
        // Handle transcript and audio responses
    }
}
```

### Audio Processing Details

```javascript
// Audio capture configuration
const audioConfig = {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 16000,
    channelCount: 1
};

// Audio processing pipeline
this.scriptProcessor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    const int16Array = new Int16Array(inputData.length);
    
    // Convert Float32 to Int16
    for (let i = 0; i < inputData.length; i++) {
        int16Array[i] = inputData[i] * 32767;
    }
    
    // Send via WebSocket
    this.websocket.send(int16Array.buffer);
};
```

## 🔧 Backend Implementation

### WebSocket Endpoint

```python
@app.websocket("/ws/voice/continuous")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    while True:
        data = await websocket.receive()
        
        if "bytes" in data:
            # Handle binary audio data
            await process_audio_bytes(websocket, data["bytes"])
        elif "text" in data:
            # Handle text messages
            await process_text(websocket, data["text"])
```

### Audio Processing Pipeline

1. **Receive Audio**: Binary audio data from WebSocket
2. **Convert Format**: Raw bytes to WAV format for Whisper
3. **Transcribe**: OpenAI Whisper API for speech-to-text
4. **Generate Response**: GPT-3.5-turbo for AI responses
5. **Synthesize Speech**: ElevenLabs for text-to-speech
6. **Send Response**: Audio and transcript back via WebSocket

### API Integration

```python
# OpenAI Whisper
transcript = openai_client.audio.transcriptions.create(
    model="whisper-1",
    file=audio_file,
    response_format="text"
)

# OpenAI GPT
response = openai_client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "You are AURA..."},
        {"role": "user", "content": text}
    ]
)

# ElevenLabs TTS
audio = generate(
    text=text,
    voice="Rachel",
    model="eleven_monolingual_v1"
)
```

## 🔌 WebSocket Protocol

### Message Types

#### From Client to Server
```javascript
// Binary audio data
websocket.send(audioBuffer);

// Text messages
websocket.send(JSON.stringify({
    type: "text",
    text: "Hello AURA"
}));
```

#### From Server to Client
```javascript
// Transcript messages
{
    "type": "transcript",
    "text": "You said: Hello"
}

// Audio responses
{
    "type": "audio",
    "audio": "base64_encoded_audio_data"
}

// Error messages
{
    "type": "error",
    "text": "Error description"
}
```

## 🎨 UI Components

### Voice Widget Features
- **Floating Design**: Always-on-top widget
- **Minimize/Maximize**: Collapsible interface
- **Real-time Status**: Connection and call status
- **Transcript Display**: Live conversation history
- **Audio Controls**: Start/end call buttons
- **Settings Panel**: Configuration options

### Admin Panel Features
- **Login System**: Secure authentication
- **Document Upload**: File management
- **Dashboard**: Overview and statistics
- **Modern UI**: W3Schools-inspired design

## 🔐 Security Considerations

### Authentication
- Token-based WebSocket authentication
- JWT tokens for admin panel
- Secure API endpoints

### Audio Security
- Local audio processing
- Secure WebSocket connections
- No audio storage on server

## 🧪 Testing

### Development Server
```bash
# Start test server
python simple_test.py

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/
```

### Frontend Testing
1. Open `frontend/test.html`
2. Test voice widget functionality
3. Verify WebSocket connections
4. Check audio capture and playback

## 📊 Performance Considerations

### Audio Optimization
- **Buffer Size**: 4096 samples for ScriptProcessor
- **Sample Rate**: 16kHz for optimal Whisper performance
- **Channels**: Mono to reduce bandwidth
- **Format**: 16-bit PCM for compatibility

### WebSocket Optimization
- **Binary Messages**: Direct audio streaming
- **Buffering**: Client-side audio buffering
- **Error Handling**: Graceful connection recovery

## 🔄 Deployment

### Production Setup
1. **Backend**: Deploy FastAPI with uvicorn
2. **Frontend**: Serve static files via web server
3. **Environment**: Set production API keys
4. **SSL**: Enable HTTPS for WebSocket connections

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
```

## 📚 API Reference

### WebSocket Endpoints
- `ws://localhost:8080/ws/voice/continuous` - Voice call WebSocket

### HTTP Endpoints
- `GET /health` - Health check
- `GET /` - Root endpoint
- `POST /api/login` - Admin login
- `POST /api/documents/upload` - Document upload
- `GET /api/documents` - List documents

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Test with development server
4. Update documentation
5. Submit pull request

### Code Standards
- **JavaScript**: ES6+ with modern practices
- **Python**: PEP 8 with type hints
- **HTML/CSS**: Semantic HTML, modern CSS
- **Documentation**: Clear comments and README updates

---

**Last Updated**: December 2024
**Version**: 1.0.0
