# AURA Voice AI 🎯

An intelligent voice AI assistant that combines multiple LLMs (Grok & GPT-4), realistic voice synthesis (ElevenLabs), and personalized memory for natural conversations.

## 🌟 Features

- **Smart LLM Routing**: Intelligently routes between Grok-4 and GPT-4-turbo based on query type
- **Voice Synthesis**: Ultra-realistic voice output using ElevenLabs
- **Memory System**: Remembers user preferences and conversation context
- **Streaming Audio**: Real-time audio generation for fast responses
- **Admin Dashboard**: Manage knowledge base and system settings
- **GDPR Compliant**: Full data export and deletion capabilities

- **Multi-tenant Architecture**: Support for multiple organizations with isolated data
- **React Frontend**: Modern TypeScript React application with voice interface
- **Continuous Voice Processing**: Real-time voice activity detection and processing
- **Document Processing**: AI-powered document ingestion and knowledge extraction

## 🚀 Quick Start

### 🚨 **IMPORTANT: Before You Start**
Make sure you have these API keys ready:
- **xAI API Key** (for Grok AI) - [Get it here](https://x.ai/)
- **OpenAI API Key** (for GPT-4 & Whisper) - [Get it here](https://platform.openai.com/)
- **ElevenLabs API Key** (for voice synthesis) - [Get it here](https://elevenlabs.io/)

**Without these keys, the AI will not work!**

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Redis (optional, will use in-memory fallback)
- API Keys for:
  - Grok (xAI)
  - OpenAI (GPT-4-turbo & Whisper)
  - ElevenLabs (Text-to-speech)

### Installation

1. **Clone the repository with submodules**
```bash
git clone --recurse-submodules https://github.com/yourusername/aura-voice-ai.git
cd aura-voice-ai
```

**⚠️ IMPORTANT: If you already cloned without submodules, run:**
```bash
git submodule update --init --recursive
```

2. **Set up backend environment variables**
```bash
cd backend
cp env.example .env
# Edit .env with your API keys
```

**⚠️ CRITICAL: You MUST add your own API keys to make the AI work!**
- **GROK_API_KEY**: Get from [xAI](https://x.ai/) (for Grok AI)
- **OPENAI_API_KEY**: Get from [OpenAI](https://platform.openai.com/) (for GPT-4 and Whisper)
- **ELEVENLABS_API_KEY**: Get from [ElevenLabs](https://elevenlabs.io/) (for voice synthesis)

Without these API keys, the voice AI will not respond to any requests!

3. **Install backend dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up frontend**
```bash
cd ../frontend/aura-react-frontend
npm install
```

5. **Start the backend server**
```bash
cd ../../backend
python -m app.main
# Server runs on http://localhost:8000
```

6. **Start the frontend development server**
```bash
cd ../frontend/aura-react-frontend
npm run dev
# Frontend runs on http://localhost:5173
```

7. **Test the system**
```bash
# Backend test interface:
http://localhost:8000/test

# Frontend application:
http://localhost:5173
```

## 📁 Project Structure

```
aura-voice-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application
│   │   ├── config.py                  # Configuration
│   │   ├── routers/                   # API endpoints
│   │   │   ├── chat.py               # Chat endpoints
│   │   │   ├── voice.py              # Voice processing
│   │   │   ├── continuous_voice.py   # Real-time voice processing
│   │   │   ├── streaming.py          # Streaming endpoints
│   │   │   ├── documents.py          # Document processing
│   │   │   ├── memory.py             # Memory management
│   │   │   ├── admin.py              # Admin dashboard
│   │   │   ├── tenant_admin.py       # Tenant management
│   │   │   └── streaming.py          # Streaming endpoints
│   │   ├── services/                  # Core services
│   │   │   ├── smart_router.py       # LLM routing
│   │   │   ├── memory_engine.py      # User memory
│   │   │   ├── voice_pipeline.py     # STT/TTS
│   │   │   ├── streaming_handler.py  # Audio streaming
│   │   │   ├── persona_manager.py    # Personalization
│   │   │   ├── tenant_manager.py     # Multi-tenant support
│   │   │   ├── document_processor.py # Document AI processing
│   │   │   ├── enhanced_voice_activity_detector.py # Voice detection
│   │   │   └── continuous_conversation.py # Real-time conversation
│   │   ├── models/                    # Data models
│   │   │   ├── user.py               # User model
│   │   │   ├── tenant.py             # Tenant model
│   │   │   └── conversation.py       # Conversation model
│   │   └── middleware/                # Middleware
│   │       └── tenant_middleware.py  # Tenant isolation
├── frontend/
│   ├── aura-react-frontend/          # React TypeScript app (git submodule)
│   │   ├── src/
│   │   │   ├── components/           # React components
│   │   │   ├── pages/                # Page components
│   │   │   ├── contexts/             # React contexts
│   │   │   └── hooks/                # Custom hooks
│   │   ├── package.json              # Frontend dependencies
│   │   └── README.md                 # Frontend documentation
│   ├── admin/                        # Admin dashboard
│   └── widget/                       # Voice widget
├── test/                             # Test scripts
├── docker-compose.yml                # Docker configuration
├── docker-compose.multi-tenant.yml   # Multi-tenant Docker setup
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

# Database
DATABASE_URL=postgresql://user:password@localhost/aura_db

# Optional
REDIS_URL=redis://localhost:6379
```

### Frontend Configuration

The React frontend is configured with:
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **TypeScript** for type safety
- **Supabase** for backend integration

## 🧪 Testing

### Interactive Web Interface
```bash
# Start backend server and open:
http://localhost:8000/test
```

### Frontend Development
```bash
cd frontend/aura-react-frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Run Test Scripts
```bash
cd test
python test_router.py              # Test LLM routing
python test_memory.py              # Test memory system
python test_voice.py               # Test voice pipeline
python test_tts.py                 # Test text-to-speech
python test_continuous_voice.py    # Test real-time voice
python test_document.py            # Test document processing
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

# Test continuous voice
curl -X POST http://localhost:8000/continuous-voice/start \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user"}'
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

### Continuous Voice (NEW)
- `POST /continuous-voice/start` - Start real-time voice session
- `POST /continuous-voice/process` - Process voice input
- `POST /continuous-voice/stop` - Stop voice session

### Documents (NEW)
- `POST /documents/upload` - Upload and process documents
- `GET /documents/{doc_id}` - Get document information
- `DELETE /documents/{doc_id}` - Delete document

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
- **Real-time Voice Processing**: < 100ms latency

## 🛠️ Development Roadmap

### Phase 1: Foundation ✅
- [x] Smart LLM routing
- [x] Memory system
- [x] Basic API endpoints

### Phase 2: Voice ✅
- [x] Speech-to-text (Whisper)
- [x] Text-to-speech (ElevenLabs)
- [x] Audio streaming

### Phase 3: Intelligence ✅
- [x] Persona management
- [x] Knowledge base integration
- [x] Document processing with AI
- [x] Multi-tenant architecture

### Phase 4: Frontend ✅
- [x] React TypeScript UI
- [x] Voice call interface
- [x] Admin dashboard
- [x] Real-time voice processing

### Phase 5: Advanced 🚧
- [x] Continuous voice conversation
- [x] Enhanced voice activity detection
- [x] Document AI processing
- [ ] Social media integration
- [ ] Fine-tuning pipeline
- [ ] Multi-language support

## 🐛 Troubleshooting

### Common Issues

**Submodule Issues (Frontend not loading)**
```bash
# If frontend directory is empty or incomplete:
git submodule update --init --recursive

# Or navigate to frontend and initialize:
cd frontend/aura-react-frontend
git submodule update --init
```

**Voice AI Not Responding (Most Common Issue)**
```bash
# Check if you have API keys configured:
cd backend
python debug_env.py

# If you see "✗" for any API key, you need to:
# 1. Copy the example file:
cp env.example .env

# 2. Edit .env and add your API keys:
# GROK_API_KEY=xai-your-actual-key
# OPENAI_API_KEY=sk-your-actual-key  
# ELEVENLABS_API_KEY=sk_your-actual-key

# 3. Restart the backend server
```

**API Key Errors**
```bash
# Check your .env file
cat backend/.env
# Ensure all keys are set correctly
```

**Frontend Dependencies**
```bash
# If npm install fails in frontend:
cd frontend/aura-react-frontend
rm -rf node_modules package-lock.json
npm install
```

**Redis Connection Failed**
```bash
# System will use in-memory fallback
# Or install Redis:
docker-compose up redis
```

**Port Already in Use**
```bash
# Use a different port for backend
uvicorn app.main:app --port 8001

# Use a different port for frontend
cd frontend/aura-react-frontend
npm run dev -- --port 3000
```

### Development Workflow

**For Backend Changes:**
```bash
# Make changes in backend/
git add .
git commit -m "Your backend changes"
git push
```

**For Frontend Changes:**
```bash
# Make changes in frontend/aura-react-frontend/
cd frontend/aura-react-frontend
git add .
git commit -m "Your frontend changes"
git push

# Then update main repo to track new frontend commit
cd ../..
git add frontend/aura-react-frontend
git commit -m "Update frontend submodule"
git push
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

**Note for Contributors:**
- Backend changes go in the main repository
- Frontend changes go in the `frontend/aura-react-frontend` submodule
- Always update submodule references when frontend changes are made

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check the test interface at `/test`
- Review logs for debugging
- Check frontend console for frontend issues

## 🚀 Deployment

### Production Checklist
- [ ] All API keys configured
- [ ] Database configured for production
- [ ] Redis configured for production
- [ ] HTTPS enabled
- [ ] Monitoring set up
- [ ] Backup strategy defined
- [ ] Rate limiting configured
- [ ] Security audit completed
- [ ] Frontend built and deployed
- [ ] Submodules properly configured

### Docker Deployment
```bash
# Multi-tenant deployment
docker-compose -f docker-compose.multi-tenant.yml up -d

# Standard deployment
docker-compose up -d
```

---

**Aura property** - Multi-tenant Voice AI Platform
