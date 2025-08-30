# AURA Voice AI 🎯

An intelligent voice AI assistant that combines multiple LLMs (Grok & GPT-4), realistic voice synthesis (ElevenLabs), and personalized memory for natural conversations.

## 🌟 Features

- **Smart LLM Routing**: Intelligently routes between Grok-4 and GPT-4-turbo based on query type
- **Voice Synthesis**: Ultra-realistic voice output using ElevenLabs
- **Memory System**: Remembers user preferences and conversation context
- **Streaming Audio**: Real-time audio generation for fast responses
- **Admin Dashboard**: Manage knowledge base and system settings
- **GDPR Compliant**: Full data export and deletion capabilities

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Redis (optional, will use in-memory fallback)
- API Keys for:
  - Grok (xAI)
  - OpenAI (GPT-4-turbo & Whisper)
  - ElevenLabs (Text-to-speech)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/aura-voice-ai.git
cd aura-voice-ai
```

2. **Set up environment variables**
```bash
cd backend
cp .env.example .env
# Edit .env with your API keys
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Start the server**
```bash
python -m app.main
# Server runs on http://localhost:8000
```

5. **Test the system**
```bash
# Open browser to:
http://localhost:8000/test
```

## 📁 Project Structure

```
aura-voice-ai/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Configuration
│   │   ├── routers/          # API endpoints
│   │   │   ├── chat.py       # Chat endpoints
│   │   │   ├── voice.py      # Voice processing
│   │   │   ├── admin.py      # Admin dashboard
│   │   │   ├── memory.py     # Memory management
│   │   │   └── streaming.py  # Streaming endpoints
│   │   ├── services/         # Core services
│   │   │   ├── smart_router.py     # LLM routing
│   │   │   ├── memory_engine.py    # User memory
│   │   │   ├── voice_pipeline.py   # STT/TTS
│   │   │   ├── streaming_handler.py # Audio streaming
│   │   │   └── persona_manager.py  # Personalization
│   │   └── models/           # Data models
├── test/                     # Test scripts
├── docker-compose.yml        # Docker configuration
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# LLM APIs
GROK_API_KEY=xai-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Voice APIs
ELEVENLABS_API_KEY=sk_your-key-here
ELEVENLABS_VOICE_ID=your-voice-id

# Optional
REDIS_URL=redis://localhost:6379
```

### Docker Setup (Optional)

```bash
# Start with Docker Compose
docker-compose up

# Or run specific services
docker-compose up redis
```

## 🧪 Testing

### Interactive Web Interface
```bash
# Start server and open:
http://localhost:8000/test
```

### Run Test Scripts
```bash
cd test
python test_router.py   # Test LLM routing
python test_memory.py   # Test memory system
python test_voice.py    # Test voice pipeline
python test_tts.py      # Test text-to-speech
```

### API Testing with cURL
```bash
# Health check
curl http://localhost:8000/health

# Send chat message
curl -X POST http://localhost:8000/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, AURA!"}'

# Generate speech
curl -X POST http://localhost:8000/voice/synthesize \
  -F "text=Hello, this is AURA speaking" \
  --output audio.mp3
```

## 📊 API Endpoints

### Core Endpoints
- `GET /` - System info
- `GET /health` - Health check
- `GET /test` - Interactive test interface

### Chat
- `POST /chat/message` - Send message
- `GET /chat/history/{user_id}` - Get chat history

### Voice
- `POST /voice/synthesize` - Text to speech
- `POST /voice/transcribe` - Speech to text
- `GET /voice/status` - Voice system status

### Admin
- `GET /admin/dashboard` - System statistics
- `POST /admin/upload-knowledge` - Upload knowledge files
- `GET /admin/knowledge` - List knowledge base

### Memory
- `GET /memory/preferences/{user_id}` - Get user preferences
- `PUT /memory/preferences/{user_id}` - Update preferences
- `GET /memory/export/{user_id}` - Export user data
- `DELETE /memory/delete/{user_id}` - Delete user data

## 🎯 Performance Targets

- **Response Time**: < 2 seconds
- **Voice Quality**: MOS > 4.0
- **Uptime**: 99.5%
- **Memory Retrieval**: < 100ms
- **API Success Rate**: > 95%

## 🛠️ Development Roadmap

### Phase 1: Foundation ✅
- [x] Smart LLM routing
- [x] Memory system
- [x] Basic API endpoints

### Phase 2: Voice ✅
- [x] Speech-to-text (Whisper)
- [x] Text-to-speech (ElevenLabs)
- [x] Audio streaming

### Phase 3: Intelligence 🚧
- [x] Persona management
- [ ] Knowledge base integration
- [ ] Learning from feedback

### Phase 4: Frontend 📅
- [ ] React TypeScript UI
- [ ] Voice call interface
- [ ] Admin dashboard

### Phase 5: Advanced 📅
- [ ] Social media integration
- [ ] Fine-tuning pipeline
- [ ] Multi-language support

## 🐛 Troubleshooting

### Common Issues

**API Key Errors**
```bash
# Check your .env file
cat backend/.env
# Ensure all keys are set correctly
```

**Redis Connection Failed**
```bash
# System will use in-memory fallback
# Or install Redis:
docker-compose up redis
```

**Port Already in Use**
```bash
# Use a different port
uvicorn app.main:app --port 8001
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check the test interface at `/test`
- Review logs for debugging

## 🚀 Deployment

### Production Checklist
- [ ] All API keys configured
- [ ] Redis configured for production
- [ ] HTTPS enabled
- [ ] Monitoring set up
- [ ] Backup strategy defined
- [ ] Rate limiting configured
- [ ] Security audit completed

---

Aura property
