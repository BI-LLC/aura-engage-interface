# backend/app/__init__.py
"""AURA Voice AI - Main Application Package"""
__version__ = "3.0.0"
__author__ = "AURA Team"

# backend/app/services/__init__.py
"""AURA Service Modules"""
from .smart_router import SmartRouter
from .memory_engine import MemoryEngine
from .voice_pipeline import VoicePipeline
from .streaming_handler import StreamingHandler
from .persona_manager import PersonaManager
from .data_ingestion import DataIngestionService

__all__ = [
    'SmartRouter',
    'MemoryEngine', 
    'VoicePipeline',
    'StreamingHandler',
    'PersonaManager',
    'DataIngestionService'
]

# backend/app/routers/__init__.py
"""AURA API Route Handlers"""
from . import voice
from . import streaming
from . import memory
from . import admin
from . import chat

__all__ = [
    'voice',
    'streaming',
    'memory',
    'admin',
    'chat'
]

# backend/app/models/__init__.py
"""AURA Data Models and Schemas"""
from .user import (
    UserPreferencesModel,
    UserPreferencesUpdate,
    SessionContext,
    ConversationSummaryModel,
    UserDataExport,
    DeleteUserDataRequest
)
from .conversation import (
    ChatMessage,
    LLMResponse,
    HealthStatus
)

__all__ = [
    'UserPreferencesModel',
    'UserPreferencesUpdate',
    'SessionContext',
    'ConversationSummaryModel',
    'UserDataExport',
    'DeleteUserDataRequest',
    'ChatMessage',
    'LLMResponse',
    'HealthStatus'
]