# Configuration for AURA Voice AI
# Voice pipeline settings and configuration

from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import os

# Force load .env file from current directory
load_dotenv(verbose=True)

class Settings(BaseSettings):
    # Simple configuration - use .env file for secrets
    
    # API Keys
    GROK_API_KEY: str = os.getenv("GROK_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Voice API Keys
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Rachel voice default
    
    # API URLs
    GROK_API_URL: str = "https://api.x.ai/v1"
    OPENAI_API_URL: str = "https://api.openai.com/v1"
    ELEVENLABS_API_URL: str = "https://api.elevenlabs.io/v1"
    
    # Health Check Settings
    HEALTH_CHECK_INTERVAL: int = 15
    API_TIMEOUT: int = 30
    
    # Rate Limits
    GROK_RATE_LIMIT: int = 100
    OPENAI_RATE_LIMIT: int = 500
    
    # Redis URL
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Future: Social Media API Keys
    # YOUTUBE_API_KEY: Optional[str] = None
    # LINKEDIN_ACCESS_TOKEN: Optional[str] = None
    # X_BEARER_TOKEN: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Create global settings instance
settings = Settings()

# Debug output (remove after testing)
print(f"Config loaded - Voice configured: {bool(settings.ELEVENLABS_API_KEY)}")