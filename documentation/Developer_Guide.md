# AURA Voice AI - Complete Developer Guide

**Version:** 4.0.0  
**Last Updated:** August 2025  
**Status:** Active Development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Backend Structure](#3-backend-structure)
4. [Frontend Structure](#4-frontend-structure)
5. [API Documentation](#5-api-documentation)
6. [Service Layer Details](#6-service-layer-details)
7. [Database & Models](#7-database--models)
8. [Authentication & Security](#8-authentication--security)
9. [Multi-Tenant Architecture](#9-multi-tenant-architecture)
10. [Voice Processing Pipeline](#10-voice-processing-pipeline)
11. [File Connections & Dependencies](#11-file-connections--dependencies)
12. [Deployment Guide](#12-deployment-guide)
13. [Development Setup](#13-development-setup)
14. [Testing Strategy](#14-testing-strategy)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Project Overview

### 1.1 What is AURA Voice AI?
AURA Voice AI is a multi-tenant voice-enabled AI assistant platform that provides personalized AI experiences for organizations. Each tenant (organization) gets their own isolated AI assistant with custom knowledge bases, user management, and voice capabilities.

### 1.2 Key Features
- **Multi-Tenant Architecture**: Complete data isolation per organization
- **Voice Processing**: Speech-to-text and text-to-speech capabilities
- **Knowledge Base Management**: Document upload and intelligent search
- **Real-time Streaming**: WebSocket-based conversations
- **User Personalization**: Adaptive AI behavior per user
- **Admin Dashboard**: Comprehensive management interface

### 1.3 Technology Stack
```
Frontend:  React 18 + TypeScript + Modern CSS
Backend:   Python 3.11 + FastAPI + Pydantic
AI APIs:   OpenAI GPT-4, Whisper, ElevenLabs, Grok
Storage:   JSON (dev) / PostgreSQL (prod)
Deploy:    Docker + Docker Compose
```

---

## 2. Architecture Overview

### 2.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    AURA Voice AI Platform                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Chat UI     │ │ Voice UI    │ │ Admin Panel │           │
│  │ Settings    │ │ Streaming   │ │ Documents   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  Backend (FastAPI + Python)                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ API Routes  │ │ Services    │ │ Middleware  │           │
│  │ Auth        │ │ AI Pipeline │ │ Tenant Mgmt │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ OpenAI      │ │ ElevenLabs  │ │ Grok        │           │
│  │ GPT-4+Whisper│ │ TTS        │ │ Reasoning   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Relationships
```
main.py (FastAPI App)
├── Middleware (Tenant Isolation)
├── Routers (API Endpoints)
│   ├── chat.py → SmartRouter + MemoryEngine
│   ├── voice.py → VoicePipeline + SmartRouter
│   ├── admin.py → TenantManager + Analytics
│   ├── documents.py → DataIngestion + Search
│   └── streaming.py → WebSocket + VoicePipeline
├── Services (Business Logic)
│   ├── smart_router.py → OpenAI + Grok APIs
│   ├── voice_pipeline.py → Whisper + ElevenLabs
│   ├── data_ingestion.py → Document Processing
│   ├── memory_engine.py → Conversation Storage
│   └── tenant_manager.py → Multi-tenant Logic
└── Models (Data Structures)
    ├── tenant.py → Organization + User Models
    ├── conversation.py → Chat History Models
    └── user.py → User Preference Models
```

---

## 3. Backend Structure

### 3.1 Directory Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration settings
│   ├── middleware/
│   │   └── tenant_middleware.py # Tenant isolation middleware
│   ├── models/
│   │   ├── tenant.py           # Tenant and user data models
│   │   ├── conversation.py     # Chat history models
│   │   └── user.py             # User preference models
│   ├── routers/
│   │   ├── chat.py             # Chat API endpoints
│   │   ├── voice.py            # Voice processing endpoints
│   │   ├── admin.py            # Admin dashboard endpoints
│   │   ├── documents.py        # Document management endpoints
│   │   ├── memory.py           # Memory management endpoints
│   │   ├── streaming.py        # WebSocket streaming endpoints
│   │   ├── continuous_voice.py # Continuous voice conversations
│   │   └── tenant_admin.py     # Tenant administration
│   └── services/
│       ├── smart_router.py     # LLM routing and health monitoring
│       ├── voice_pipeline.py   # Speech processing pipeline
│       ├── data_ingestion.py   # Document processing and search
│       ├── memory_engine.py    # Conversation memory management
│       ├── persona_manager.py  # User personalization
│       ├── tenant_manager.py   # Multi-tenant management
│       ├── auth_service.py     # Authentication service
│       ├── streaming_handler.py # Real-time streaming logic
│       └── tenant_aware_services.py # Tenant-isolated services
├── data/
│   └── knowledge_base/         # Document storage (development)
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container configuration
└── venv/                       # Virtual environment
```

### 3.2 Key Backend Files

#### 3.2.1 main.py - Application Entry Point
**Purpose**: FastAPI application initialization and configuration
**Key Functions**:
- Application lifecycle management
- Router registration
- Service initialization
- Middleware setup
- CORS configuration

**Connections**:
```python
# Imports all routers
from app.routers import chat, voice, admin, memory, streaming, documents, continuous_voice, tenant_admin

# Imports all services
from app.services import smart_router, memory_engine, voice_pipeline, persona_manager, data_ingestion

# Imports tenant management
from app.services.tenant_manager import TenantManager
from app.services.auth_service import TenantAuthService
```

#### 3.2.2 Routers Directory

**chat.py**
- **Purpose**: Chat conversation endpoints
- **Dependencies**: SmartRouter, MemoryEngine, PersonaManager, DataIngestionService
- **Key Endpoints**:
  - `POST /chat/` - Send message and get AI response
  - `POST /chat/feedback` - Provide response feedback
  - `GET /chat/history/{user_id}` - Get conversation history
  - `GET /chat/context/{user_id}` - Get user context

**voice.py**
- **Purpose**: Voice processing endpoints
- **Dependencies**: VoicePipeline, SmartRouter, MemoryEngine
- **Key Endpoints**:
  - `GET /voice/status` - Check voice pipeline status
  - `POST /voice/transcribe` - Convert speech to text
  - `POST /voice/synthesize` - Convert text to speech
  - `GET /voice/voices` - Get available voices

**admin.py**
- **Purpose**: Administrative dashboard endpoints
- **Dependencies**: SmartRouter, MemoryEngine, VoicePipeline
- **Key Endpoints**:
  - `GET /admin/dashboard` - Get system statistics
  - `GET /admin/health` - Detailed health check
  - `GET /admin/costs` - Get API usage costs

#### 3.2.3 Services Directory

**smart_router.py**
- **Purpose**: Intelligent LLM routing and health monitoring
- **Key Classes**: `SmartRouter`, `LLMResponse`
- **Functions**:
  - Route messages to appropriate LLM (GPT-4 vs Grok)
  - Health monitoring of external APIs
  - Cost tracking and rate limiting
  - Streaming response support

**voice_pipeline.py**
- **Purpose**: Complete voice processing pipeline
- **Key Classes**: `VoicePipeline`, `AudioTranscription`, `AudioSynthesis`
- **Functions**:
  - Speech-to-text using OpenAI Whisper
  - Text-to-speech using ElevenLabs
  - Audio format handling
  - Voice pipeline testing

**data_ingestion.py**
- **Purpose**: Document processing and knowledge base management
- **Key Classes**: `DataIngestionService`, `Document`
- **Functions**:
  - File ingestion (PDF, DOCX, TXT, MD, JSON)
  - Content extraction and cleaning
  - Document chunking for retrieval
  - Semantic search within documents

---

## 4. Frontend Structure

### 4.1 Directory Structure
```
frontend/
├── public/
│   ├── index.html              # Main HTML template
│   └── test.html               # Test interface
├── src/
│   ├── App.tsx                 # Main application component
│   ├── index.tsx               # React application entry point
│   ├── index.css               # Global styles
│   ├── components/
│   │   ├── ChatInterface.tsx   # Main chat window
│   │   ├── VoiceCall.tsx       # Voice conversation interface
│   │   ├── PersonalizationSettings.tsx # User settings
│   │   ├── AdminDashboard.tsx  # Admin management panel
│   │   └── ContinuousVoiceCall.tsx # Continuous voice chat
│   ├── hooks/
│   │   └── useVoiceCall.ts     # Voice call management hook
│   └── services/
│       └── api.ts              # API communication service
├── package.json                # Node.js dependencies
├── package-lock.json           # Dependency lock file
├── Dockerfile                  # Container configuration
└── node_modules/               # Installed dependencies
```

### 4.2 Key Frontend Components

#### 4.2.1 App.tsx - Main Application
**Purpose**: Top-level application component with navigation
**Features**:
- Tab-based navigation (Chat, Voice, Settings, Admin)
- State management for current view
- Responsive layout with modern styling

#### 4.2.2 ChatInterface.tsx
**Purpose**: Main chat window where users interact with AI
**Features**:
- Real-time message display
- Message history with timestamps
- Loading states and error handling
- Auto-scroll to latest messages

#### 4.2.3 PersonalizationSettings.tsx
**Purpose**: User settings and document management interface
**Features**:
- Persona configuration (formality, detail level, energy)
- Document upload with drag-and-drop
- File management (view, delete documents)
- Settings preview and real-time updates

---

## 5. API Documentation

### 5.1 Authentication Endpoints

#### POST /api/login
**Purpose**: Authenticate tenant users
**Parameters**:
- `email`: User email address
- `password`: User password
- `tenant_subdomain`: Organization subdomain

**Response**:
```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "user_id": "user_uuid",
  "tenant_id": "tenant_uuid",
  "organization": "Company Name"
}
```

### 5.2 Chat Endpoints

#### POST /chat/
**Purpose**: Send message and receive AI response
**Headers**: `Authorization: Bearer <token>`
**Body**:
```json
{
  "message": "What is machine learning?",
  "user_id": "user_uuid",
  "use_memory": true,
  "use_persona": true,
  "search_knowledge": true
}
```

**Response**:
```json
{
  "response": "Machine learning is...",
  "session_id": "session_uuid",
  "model_used": "gpt-4-turbo",
  "response_time": 1.23,
  "cost": 0.0045,
  "persona_applied": true,
  "knowledge_used": true,
  "sources": ["document1.pdf", "document2.txt"]
}
```

### 5.3 Voice Endpoints

#### POST /voice/transcribe
**Purpose**: Convert speech to text
**Content-Type**: `multipart/form-data`
**Body**: Audio file + language parameter

**Response**:
```json
{
  "success": true,
  "text": "Hello, how are you today?",
  "language": "en",
  "confidence": 0.95
}
```

#### POST /voice/synthesize
**Purpose**: Convert text to speech
**Body**: `text` parameter in form data

**Response**:
```json
{
  "success": true,
  "audio": "base64_encoded_audio_data",
  "characters": 25,
  "duration": 2.1
}
```

---

## 6. Service Layer Details

### 6.1 SmartRouter Service

**File**: `backend/app/services/smart_router.py`

**Purpose**: Intelligent routing of messages to appropriate LLM providers with health monitoring and cost tracking.

**Key Components**:

```python
class SmartRouter:
    def __init__(self):
        # API health tracking
        self.api_health = {
            "grok": {"status": "unknown", "last_check": None, "failures": 0},
            "openai": {"status": "unknown", "last_check": None, "failures": 0}
        }
        # Cost tracking
        self.costs = {"grok": 0.0, "openai": 0.0}
        # Rate limiting
        self.request_counts = {"grok": [], "openai": []}
```

**Key Methods**:
- `route_message(message, user_context)`: Main routing logic
- `route_message_stream(message, user_context)`: Streaming responses
- `_classify_query(message)`: Determines best LLM for query
- `_check_api_health()`: Monitors API availability
- `get_health_status()`: Returns current health metrics
- `get_cost_summary()`: Returns usage costs

**Routing Logic**:
```python
def _classify_query(self, message: str) -> str:
    message_lower = message.lower()
    word_count = len(message.split())
    
    # Quick factual queries → GPT-4-turbo
    quick_keywords = ["what is", "define", "when", "where", "who", "how many"]
    if word_count < 100 and any(kw in message_lower for kw in quick_keywords):
        return "openai"
    
    # Complex reasoning → Grok
    complex_keywords = ["analyze", "compare", "explain", "why", "reasoning", "solve"]
    if word_count > 200 or any(kw in message_lower for kw in complex_keywords):
        return "grok"
    
    return "openai"  # Default
```

### 6.2 VoicePipeline Service

**File**: `backend/app/services/voice_pipeline.py`

**Purpose**: Complete voice processing pipeline handling speech-to-text and text-to-speech operations.

**Key Components**:

```python
@dataclass
class AudioTranscription:
    text: str
    language: str = "en"
    duration: float = 0.0
    confidence: float = 0.0

@dataclass
class AudioSynthesis:
    audio_base64: str
    content_type: str = "audio/mpeg"
    duration: float = 0.0
    characters_used: int = 0

class VoicePipeline:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
        self.elevenlabs_voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
```

**Key Methods**:
- `transcribe_audio(audio_data, audio_format)`: STT using Whisper
- `synthesize_speech(text, voice_id, voice_settings)`: TTS using ElevenLabs
- `get_available_voices()`: List available ElevenLabs voices
- `process_voice_message(audio_data, audio_format)`: Complete pipeline
- `get_pipeline_status()`: Check component availability

### 6.3 DataIngestionService

**File**: `backend/app/services/data_ingestion.py`

**Purpose**: Document processing and knowledge base management with support for multiple file formats.

**Supported Formats**:
- PDF (via PyPDF2)
- DOCX (via python-docx)
- TXT (plain text)
- MD (Markdown with HTML stripping)
- JSON (formatted output)

**Key Methods**:
- `ingest_file(file_path, user_id, metadata)`: Process and store document
- `search_documents(query, user_id, limit)`: Search user's documents
- `get_user_documents(user_id)`: List user's documents
- `delete_document(doc_id, user_id)`: Remove document
- `_extract_content(file_path)`: Extract text from various formats
- `_chunk_content(content)`: Split content for retrieval

**Document Processing Pipeline**:
```python
async def ingest_file(self, file_path: str, user_id: str, metadata: Optional[Dict] = None) -> Document:
    # 1. Validate file
    if not self._validate_file(file_path):
        raise ValueError(f"Invalid file: {file_path}")
    
    # 2. Extract content
    content = await self._extract_content(file_path)
    
    # 3. Clean and preprocess
    cleaned_content = self._clean_content(content)
    
    # 4. Create chunks for retrieval
    chunks = self._chunk_content(cleaned_content)
    
    # 5. Generate document ID and store
    doc_id = self._generate_doc_id(user_id, file_path)
    document = Document(...)
    
    return document
```

---

## 7. Database & Models

### 7.1 Data Models

**File**: `backend/app/models/tenant.py`

#### TenantModel
```python
class TenantModel(BaseModel):
    tenant_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_name: str
    admin_email: str
    subscription_tier: str = "standard"  # standard, premium, enterprise
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Limits based on subscription
    max_users: int = 10
    max_storage_gb: int = 10
    max_api_calls_monthly: int = 10000
    
    # Custom settings per tenant
    custom_settings: Dict = Field(default_factory=dict)
    api_keys: Dict = Field(default_factory=dict)
    
    # Branding
    custom_logo: Optional[str] = None
    brand_colors: Optional[Dict] = None
    
    # Status
    is_active: bool = True
    expires_at: Optional[datetime] = None
```

#### TenantUserModel
```python
class TenantUserModel(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str  # Links to tenant
    email: str
    role: str = "user"  # admin, manager, user
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    # User's personal AI settings
    persona_settings: Dict = Field(default_factory=dict)
    voice_preference: Optional[str] = None
    
    # Access control
    can_upload_documents: bool = True
    can_modify_ai_settings: bool = False
    can_view_analytics: bool = False
```

### 7.2 Document Model

**File**: `backend/app/services/data_ingestion.py`

```python
@dataclass
class Document:
    doc_id: str
    user_id: str
    filename: str
    content: str
    metadata: Dict
    chunks: List[str]
    upload_time: datetime
    doc_type: str
```

### 7.3 Storage Strategy

**Development Environment**:
- JSON files for simple prototyping
- File-based storage with tenant isolation
- In-memory caching for performance

**Production Environment**:
- PostgreSQL with proper indexing
- Document storage with cloud integration
- Redis caching layer
- Backup and replication

---

## 8. Authentication & Security

### 8.1 Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    participant Tenant

    Client->>API: POST /api/login
    API->>Auth: Validate credentials
    Auth->>Tenant: Get tenant context
    Tenant-->>Auth: Tenant info
    Auth-->>API: JWT token + user info
    API-->>Client: Authentication response

    Client->>API: API Request + JWT
    API->>Auth: Validate token
    Auth-->>API: User + Tenant context
    API->>API: Process with tenant isolation
    API-->>Client: Response
```

### 8.2 JWT Token Structure

```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "organization": "Company Name",
  "role": "admin|manager|user",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### 8.3 Tenant Isolation Middleware

**File**: `backend/app/middleware/tenant_middleware.py`

```python
class TenantMiddleware:
    def __init__(self, auth_service: TenantAuthService):
        self.auth_service = auth_service

    async def __call__(self, request: Request, call_next):
        # Skip auth for public endpoints
        public_paths = ["/", "/health", "/login", "/signup"]
        if request.url.path in public_paths:
            return await call_next(request)

        # Extract and validate JWT token
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authentication")

        token = authorization.split(" ")[1]
        payload = self.auth_service.verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Inject tenant context into request state
        request.state.tenant_id = payload["tenant_id"]
        request.state.user_id = payload["user_id"]
        request.state.organization = payload["organization"]
        request.state.user_role = payload["role"]

        return await call_next(request)
```

---

## 9. Multi-Tenant Architecture

### 9.1 Tenant Isolation Strategy

**Data Isolation**:
- Each tenant has separate data storage
- Database queries filtered by tenant_id
- File storage organized by tenant directories
- In-memory caches partitioned by tenant

**Service Isolation**:
```python
# Tenant-aware services in tenant_aware_services.py
class TenantAwareDataIngestion:
    def __init__(self, tenant_manager: TenantManager):
        self.tenant_manager = tenant_manager
    
    async def ingest_file(self, file_path: str, tenant_id: str, user_id: str, metadata: Optional[Dict] = None) -> Document:
        # Validate tenant access
        if not self.tenant_manager.validate_tenant_access(tenant_id, user_id, "documents"):
            raise PermissionError("Access denied")
        
        # Get tenant-specific storage path
        storage_path = self.tenant_manager.get_tenant_storage_path(tenant_id, "documents")
        
        # Process with tenant isolation
        # ... processing logic ...
```

### 9.2 Tenant Management

**File**: `backend/app/services/tenant_manager.py`

**Key Functions**:
- `create_tenant()`: Onboard new organization
- `get_tenant_by_subdomain()`: Resolve tenant from URL
- `validate_tenant_access()`: Check user permissions
- `get_tenant_storage_path()`: Get isolated storage location
- `get_tenant_context()`: Retrieve tenant-specific data

### 9.3 Subdomain Routing

**DNS Configuration**:
```
*.aura-voice-ai.com → Load Balancer
├── company1.aura-voice-ai.com → Tenant: company1
├── company2.aura-voice-ai.com → Tenant: company2
└── admin.aura-voice-ai.com → System Admin
```

**Subdomain Resolution**:
```python
async def resolve_tenant_from_request(request: Request) -> Optional[TenantModel]:
    host = request.headers.get("host", "")
    if "." in host:
        subdomain = host.split(".")[0]
        return await tenant_manager.get_tenant_by_subdomain(subdomain)
    return None
```

---

## 10. Voice Processing Pipeline

### 10.1 Speech-to-Text Flow

```mermaid
flowchart TD
    A[Audio Input] --> B[Format Validation]
    B --> C[OpenAI Whisper API]
    C --> D[Transcription Result]
    D --> E[Confidence Check]
    E --> F[Return Text]
    
    B --> G[Error: Unsupported Format]
    C --> H[Error: API Failure]
    E --> I[Error: Low Confidence]
```

### 10.2 Text-to-Speech Flow

```mermaid
flowchart TD
    A[Text Input] --> B[Text Validation]
    B --> C[Voice Selection]
    C --> D[ElevenLabs API]
    D --> E[Audio Generation]
    E --> F[Base64 Encoding]
    F --> G[Return Audio Data]
    
    B --> H[Error: Invalid Text]
    D --> I[Error: API Failure]
    E --> J[Error: Generation Failed]
```

### 10.3 Continuous Voice Conversation

**WebSocket Flow**:
```python
@app.websocket("/api/voice/continuous")
async def continuous_voice_conversation(websocket: WebSocket, token: str):
    await websocket.accept()
    
    # Verify token and get tenant info
    payload = auth_service.verify_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    tenant_id = payload["tenant_id"]
    user_id = payload["user_id"]
    
    # Initialize conversation context with tenant's data
    tenant_context = await tenant_manager.get_tenant_context(tenant_id)
    
    conversation_state = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "session_id": f"voice_{datetime.now().timestamp()}",
        "context": tenant_context,
        "conversation_history": [],
        "is_speaking": False
    }
    
    # Continuous conversation loop
    while True:
        data = await websocket.receive_json()
        
        if data["type"] == "audio_chunk":
            # Process audio in real-time
            audio_data = data["audio"]
            transcript = await voice_pipeline.transcribe_streaming(audio_data)
            
            if transcript and not conversation_state["is_speaking"]:
                # Generate response using ONLY tenant's data
                response_text = await generate_tenant_specific_response(
                    user_input=transcript,
                    tenant_context=tenant_context,
                    conversation_history=conversation_state["conversation_history"],
                    tenant_id=tenant_id
                )
                
                # Stream response audio back
                audio_response = await voice_pipeline.synthesize_speech(response_text)
                
                await websocket.send_json({
                    "type": "response",
                    "text": response_text,
                    "audio": audio_response,
                    "sources": extract_sources(response_text, tenant_context)
                })
```

---

## 11. File Connections & Dependencies

### 11.1 Import Dependency Graph

```
main.py
├── Import Routers
│   ├── chat.py → SmartRouter, MemoryEngine, PersonaManager, DataIngestionService
│   ├── voice.py → VoicePipeline, SmartRouter, MemoryEngine
│   ├── admin.py → SmartRouter, MemoryEngine, VoicePipeline
│   ├── documents.py → DataIngestionService, TenantManager
│   ├── memory.py → MemoryEngine, ConversationSummary
│   ├── streaming.py → StreamingHandler, SmartRouter, VoicePipeline
│   ├── continuous_voice.py → VoicePipeline, TenantManager
│   └── tenant_admin.py → TenantManager, TenantAuthService
├── Import Services
│   ├── smart_router.py → OpenAI, Grok APIs
│   ├── voice_pipeline.py → OpenAI Whisper, ElevenLabs
│   ├── data_ingestion.py → PyPDF2, docx, markdown
│   ├── memory_engine.py → Conversation storage
│   ├── persona_manager.py → User preferences
│   ├── tenant_manager.py → TenantModel
│   ├── auth_service.py → JWT, bcrypt
│   └── tenant_aware_services.py → All tenant services
├── Import Models
│   ├── tenant.py → Pydantic models
│   ├── conversation.py → Chat models
│   └── user.py → User models
└── Import Middleware
    └── tenant_middleware.py → TenantAuthService
```

### 11.2 Service Dependencies

**SmartRouter Dependencies**:
```python
# External APIs
import openai          # GPT-4 and Whisper
import httpx          # Grok API calls

# Configuration
from app.config import settings

# Internal
from dataclasses import dataclass
from datetime import datetime, timedelta
```

**VoicePipeline Dependencies**:
```python
# External APIs
import openai          # Whisper STT
import httpx          # ElevenLabs TTS

# Audio processing
import io
import base64

# Async support
import asyncio
```

**DataIngestionService Dependencies**:
```python
# Document processing
import PyPDF2         # PDF extraction
import docx          # DOCX extraction
import markdown      # Markdown processing

# File handling
import os
import json
import hashlib

# Text processing
import re
```

### 11.3 Frontend Dependencies

**React Component Dependencies**:
```typescript
// App.tsx
import { ChatInterface } from './components/ChatInterface';
import { PersonalizationSettings } from './components/PersonalizationSettings';
import { VoiceCall } from './components/VoiceCall';
import { AdminDashboard } from './components/AdminDashboard';

// ChatInterface.tsx
import { api } from '../services/api';

// PersonalizationSettings.tsx
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { api } from '../services/api';

// API Service
// services/api.ts - Handles all backend communication
```

---

## 12. Deployment Guide

### 12.1 Docker Configuration

**Backend Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 12.2 Docker Compose

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
      - GROK_API_KEY=${GROK_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./backend/data:/app/data
    depends_on:
      - database

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  database:
    image: postgres:15
    environment:
      - POSTGRES_DB=aura_voice_ai
      - POSTGRES_USER=aura_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 12.3 Environment Variables

**Required Environment Variables**:
```bash
# API Keys
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
GROK_API_KEY=...

# Security
JWT_SECRET=your-secret-key-change-in-production
INTERNAL_API_KEY=internal-system-key

# Database (Production)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_PASSWORD=secure-password

# Optional
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
GROK_API_URL=https://api.grok.x.ai/v1
```

---

## 13. Development Setup

### 13.1 Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- Docker (optional)

### 13.2 Backend Setup

```bash
# Clone repository
git clone <repository-url>
cd aura-voice-ai/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 13.3 Frontend Setup

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 13.4 Testing the Setup

1. **Backend Health Check**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Frontend Access**:
   ```
   http://localhost:3000
   ```

3. **Test Interface**:
   ```
   http://localhost:8000/test
   ```

---

## 14. Testing Strategy

### 14.1 Backend Testing

**Test Files Location**: `backend/test/`

**Key Test Files**:
- `test_voice.py` - Voice pipeline testing
- `test_router.py` - Smart router testing
- `test_memory.py` - Memory engine testing
- `test_document.py` - Document processing testing
- `test_tts.py` - Text-to-speech testing

**Running Tests**:
```bash
cd backend
python -m pytest test/ -v
```

### 14.2 API Testing

**Using the Built-in Test Interface**:
1. Navigate to `http://localhost:8000/test`
2. Test each component:
   - System Health Check
   - Chat functionality
   - Text-to-Speech
   - Admin dashboard

**Manual API Testing**:
```bash
# Health check
curl -X GET http://localhost:8000/health

# Chat test
curl -X POST http://localhost:8000/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, AURA!", "user_id": "test_user"}'

# Voice status
curl -X GET http://localhost:8000/voice/status
```

### 14.3 Frontend Testing

**Component Testing**:
```bash
cd frontend
npm test
```

**E2E Testing** (Future):
- Cypress or Playwright for full user journey testing
- Voice interaction testing
- Multi-tenant isolation testing

---

## 15. Troubleshooting

### 15.1 Common Issues

**Backend Issues**:

1. **Import Errors**:
   ```
   ModuleNotFoundError: No module named 'app.services'
   ```
   **Solution**: Ensure you're running from the correct directory and PYTHONPATH is set

2. **API Key Errors**:
   ```
   OpenAI API error: Invalid API key
   ```
   **Solution**: Check environment variables and API key validity

3. **Port Already in Use**:
   ```
   OSError: [Errno 48] Address already in use
   ```
   **Solution**: Kill existing process or use different port

**Frontend Issues**:

1. **CORS Errors**:
   ```
   Access to fetch blocked by CORS policy
   ```
   **Solution**: Ensure backend CORS is configured for frontend URL

2. **API Connection Failed**:
   ```
   Network Error: Failed to fetch
   ```
   **Solution**: Check backend is running and accessible

### 15.2 Debugging Tools

**Backend Debugging**:
```python
# Add to any service for detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug("Debug message here")
```

**Frontend Debugging**:
```typescript
// Add to components for debugging
console.log('Component state:', state);
console.error('API Error:', error);
```

### 15.3 Health Monitoring

**System Health Endpoint**:
```
GET /health
```

**Response Example**:
```json
{
  "status": "healthy",
  "mode": "multi-tenant",
  "services": {
    "tenant_manager": true,
    "auth_service": true,
    "smart_router": true,
    "memory": true,
    "voice": true,
    "persona": true,
    "data_service": true
  },
  "tenant_services": {
    "data_ingestion": true,
    "smart_router": true,
    "voice_pipeline": true
  },
  "apis": {
    "grok": {"status": "healthy", "failures": 0},
    "openai": {"status": "healthy", "failures": 0}
  }
}
```

---

## Conclusion

This developer guide provides comprehensive documentation for the AURA Voice AI platform. The system is designed with modularity, scalability, and maintainability in mind, featuring:

- **Clear separation of concerns** between frontend, backend, and services
- **Comprehensive multi-tenant architecture** with complete data isolation
- **Robust voice processing pipeline** with multiple AI provider support
- **Flexible document management** with multiple format support
- **Real-time streaming capabilities** for instant interactions
- **Comprehensive testing strategy** for reliability
- **Production-ready deployment** configuration

For additional support or questions, refer to the individual service documentation, API endpoints, or the test interface at `/test`.

---

**Document Maintenance:**
- **Last Updated**: August 2025
- **Version**: 4.0.0
- **Maintainer**: AURA Voice AI Development Team
- **Next Review**: September 2025
