# Configuration for AURA Voice AI
# Centralized environment-backed settings used across the backend.

from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import os

# Force load .env file from current directory
load_dotenv(verbose=True)

class Settings(BaseSettings):
    # Simple configuration - uses .env for local development secrets.
    # Create a .env file in backend/ directory with your API keys.
    
    # API keys
    GROK_API_KEY: str = os.getenv("GROK_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # API URLs
    GROK_API_URL: str = "https://api.x.ai/v1"
    OPENAI_API_URL: str = "https://api.openai.com/v1"
    
    # Health check settings
    HEALTH_CHECK_INTERVAL: int = 15  # Check every 15 seconds
    API_TIMEOUT: int = 30  # 30 second timeout for API calls
    
    # Rate limits (requests per minute)
    GROK_RATE_LIMIT: int = 100
    OPENAI_RATE_LIMIT: int = 500
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Global settings instance (import and use as a singleton)
settings = Settings()

# Minimal startup visibility for configuration presence (keys are not printed)
print(f"Config loaded - GROK configured: {bool(settings.GROK_API_KEY)}")
print(f"Config loaded - OpenAI configured: {bool(settings.OPENAI_API_KEY)}")