# Configuration for AURA Voice AI
# Voice pipeline settings and configuration

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from dotenv import load_dotenv
import os
from pathlib import Path

# Try to find .env file in multiple locations
env_paths = [
    Path(".env"),  # Current directory
    Path("backend/.env"),  # Backend directory
    Path("../backend/.env"),  # Parent/backend
    Path("../../backend/.env"),  # Grandparent/backend
    Path(__file__).parent / ".env",  # Same as config.py
    Path(__file__).parent.parent / ".env",  # Backend root
]

env_loaded = False
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path, verbose=True)
        print(f"✅ Loaded .env from: {env_path.absolute()}")
        env_loaded = True
        break

if not env_loaded:
    print("⚠️ No .env file found, using environment variables only")

class Settings(BaseSettings):
    # allow .env extras so we don't crash on unused vars
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # <--- this is the key line
    )
    
    # API Keys
    GROK_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # Voice API Keys
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Default fallback
    
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
    REDIS_URL: str = "redis://localhost:6379"
    
    # JWT Secret for Supabase token verification
    SUPABASE_JWT_SECRET: str = ""
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    # Future: Social Media API Keys
    # YOUTUBE_API_KEY: Optional[str] = None
    # LINKEDIN_ACCESS_TOKEN: Optional[str] = None
    # X_BEARER_TOKEN: Optional[str] = None

# Create global settings instance
settings = Settings()

# Debug output (remove after testing)
print(f"Config loaded - Voice configured: {bool(settings.ELEVENLABS_API_KEY)}")