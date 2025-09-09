# AURA Voice AI 🎯

An intelligent, multi-tenant voice AI assistant that combines cutting-edge LLMs (Grok & GPT-4), ultra-realistic voice synthesis (ElevenLabs), and personalized memory for natural, real-time conversations. Built with modern architecture using FastAPI, React TypeScript, and Supabase for enterprise-grade scalability and security.

## 🌟 Features

### 🧠 **Intelligent AI Capabilities**
- **Smart LLM Routing**: Intelligently routes between Grok-4 and GPT-4-turbo based on query complexity and type
- **Real-time Streaming**: Token-by-token response generation for natural conversation flow
- **Context Awareness**: Maintains conversation history and user preferences across sessions
- **Multi-modal Support**: Seamless integration of voice, text, and function calling

### 🎤 **Advanced Voice Technology**
- **Ultra-realistic Voice Synthesis**: High-quality text-to-speech using ElevenLabs
- **Real-time Speech Recognition**: Accurate speech-to-text with OpenAI Whisper
- **Voice Activity Detection**: Smart detection of speech start/end with WebRTC VAD
- **Continuous Conversation**: Natural back-and-forth dialogue without push-to-talk
- **Interruption Handling**: Users can naturally interrupt AI responses

### 🏢 **Enterprise Features**
- **Multi-tenant Architecture**: Complete data isolation for multiple organizations
- **Scalable Infrastructure**: Built for high-volume, concurrent voice sessions
- **GDPR Compliant**: Full data export, deletion, and privacy controls
- **Admin Dashboard**: Comprehensive management interface for system administration
- **Document Processing**: AI-powered document ingestion and knowledge extraction
- **Real-time Analytics**: Usage tracking and performance monitoring

### 🚀 **Modern Technology Stack**
- **Backend**: FastAPI with async/await for high performance
- **Frontend**: React TypeScript with modern UI components
- **Database**: Supabase with real-time subscriptions and RLS
- **Voice Pipeline**: WebSocket-based real-time audio streaming
- **Deployment**: Docker-ready with multi-environment support

## 🚀 Quick Start

### 🚨 **IMPORTANT: Before You Start**
Make sure you have these API keys ready:
- **xAI API Key** (for Grok AI) - [Get it here](https://x.ai/)
- **OpenAI API Key** (for GPT-4 & Whisper) - [Get it here](https://platform.openai.com/)
- **ElevenLabs API Key** (for voice synthesis) - [Get it here](https://elevenlabs.io/)

**Without these keys, the AI will not work!**

### Prerequisites

- Python 3.12+
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
│   │   │   └── tenant_admin.py       # Tenant management
│   │   ├── services/                  # Core services
│   │   │   ├── smart_router.py       # LLM routing (OpenAI/Grok)
│   │   │   ├── memory_engine.py      # User memory
│   │   │   ├── voice_pipeline.py     # STT/TTS pipeline
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
│   │   ├── middleware/                # Middleware
│   │   │   └── tenant_middleware.py  # Tenant isolation
│   │   └── supabase_client.py        # Supabase integration
│   ├── database/
│   │   ├── init.sql                  # Database initialization
│   │   └── supabase_migration.sql    # Supabase migration
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Backend container
│   └── simple_test.py               # Development server
├── frontend/
│   ├── aura-react-frontend/          # React TypeScript app
│   │   ├── src/
│   │   │   ├── components/           # React components
│   │   │   ├── pages/                # Page components
│   │   │   ├── contexts/             # React contexts
│   │   │   └── hooks/                # Custom hooks
│   │   └── package.json              # Frontend dependencies
│   ├── admin/                        # Admin dashboard (HTML/JS)
│   ├── widget/                       # Voice widget (HTML/JS)
│   └── shared/                       # Shared utilities
├── test/                             # Test scripts
│   ├── test_api_keys.py             # API key testing
│   ├── test_complete_pipeline.py    # Full pipeline testing
│   ├── test_continuous_voice.py     # Voice conversation testing
│   ├── test_streaming.py            # Streaming functionality testing
│   ├── test_voice_pipeline.py       # Voice pipeline testing
│   └── test_*.py                     # Other test files
├── docs/                             # Documentation
│   ├── SYSTEM_ARCHITECTURE.md       # System architecture
│   ├── DEVELOPER_GUIDE.md           # Developer documentation
│   ├── CONTINUOUS_VOICE_GUIDE.md    # Voice system guide
│   ├── IMPLEMENTATION_ROADMAP.md    # Development roadmap
│   ├── TROUBLESHOOTING_GUIDE.md     # Troubleshooting
│   ├── QUICK_REFERENCE.md           # Quick reference
│   └── websocket-api.md             # WebSocket API docs
├── deployment/                       # Deployment configs
├── scripts/                          # Utility scripts
├── docker-compose.yml               # Docker configuration
├── SUPABASE_SETUP_GUIDE.md          # Supabase setup guide
└── README.md                        # This file
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
python test_api_keys.py            # Test API key configuration
python test_complete_pipeline.py   # Test full voice pipeline
python test_continuous_voice.py    # Test real-time voice conversation
python test_streaming.py           # Test streaming functionality
python test_voice_pipeline.py      # Test voice pipeline components
python test_router.py              # Test LLM routing
python test_memory.py              # Test memory system
python test_voice.py               # Test voice components
python test_tts.py                 # Test text-to-speech
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

Proprietary Software License - See [LICENSE](LICENSE) file for details

**⚠️ RESTRICTED USE**: This software is proprietary and confidential to Aura Team. Unauthorized use is prohibited.

## 🤝 Contributing

This is proprietary software developed exclusively by Aura Team. External contributions are not accepted.

**For Aura Team Members:**
- Backend changes go in the main repository
- Frontend changes go in the `frontend/aura-react-frontend` submodule
- Always update submodule references when frontend changes are made
- Follow internal development guidelines and code review processes

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Documentation Index](docs/README.md)** - Navigate all documentation
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Complete development documentation
- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** - Technical architecture
- **[Continuous Voice Guide](docs/CONTINUOUS_VOICE_GUIDE.md)** - Voice system guide
- **[Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md)** - Common issues and solutions
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Essential commands
- **[WebSocket API](docs/websocket-api.md)** - Real-time communication protocol

## 📧 Support

For issues and questions:
- Check the [Documentation Index](docs/README.md) for guidance
- Review the [Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md) for common issues
- Open an issue on GitHub
- Check the test interface at `/test`
- Review logs for debugging
- Check frontend console for frontend issues

## 🚀 Deployment

### Docker Deployment
```bash
# Multi-tenant deployment
docker-compose -f docker-compose.multi-tenant.yml up -d

# Standard deployment
docker-compose up -d
```

---

## 📄 License

This software is proprietary and confidential to Aura Team. All rights reserved.

**⚠️ IMPORTANT**: This software is NOT open source. It is proprietary software owned exclusively by Aura Team. Unauthorized use, copying, distribution, or modification is strictly prohibited and may result in legal action.

For licensing inquiries, contact: [contact@aurateam.com]

---

**Made with ❤️ by Aura Team** - Multi-tenant Voice AI Platform
