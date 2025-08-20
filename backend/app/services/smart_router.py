# Smart Router
# Provides simple keyword-based routing between Grok and OpenAI models,
# includes a background health monitor, naive rate limiting, and basic cost tracking.

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, List
import httpx
import openai
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class LLMResponse:
    # Response payload used by router calls
    content: str
    model_used: str
    response_time: float
    cost: float
    error: Optional[str] = None

class SmartRouter:
    def __init__(self):
        # Initialize the router and its tracking structures
        # Track API health status and failure counts
        self.api_health = {
            "grok": {"status": "unknown", "last_check": None, "failures": 0},
            "openai": {"status": "unknown", "last_check": None, "failures": 0}
        }
        
        # Track estimated costs per provider
        self.costs = {"grok": 0.0, "openai": 0.0}
        
        # Track timestamps of recent requests for simple rate limiting
        self.request_counts = {"grok": [], "openai": []}
        self.total_requests = 0
        
        # Track recent errors for error-rate reporting
        self.error_window = []  # Track errors in last 5 minutes
        
        # Background task handle for health monitor loop
        self.health_monitor_task = None
    
    async def start_health_monitor(self):
        # Start the health monitor task; call after event loop is running
        if self.health_monitor_task is None:
            self.health_monitor_task = asyncio.create_task(self._health_monitor_loop())
            logger.info("Health monitor started")
    
    async def _health_monitor_loop(self):
        # Periodically marks provider status based on configuration or quick checks
        await asyncio.sleep(2)  # Initial delay to let everything start
        while True:
            try:
                await self._check_api_health()
                await asyncio.sleep(15)  # Check every 15 seconds as per spec
            except Exception as e:
                logger.error(f"Health monitor error: {e}")
                await asyncio.sleep(15)
    
    async def _check_api_health(self):
        # Refresh provider health based on availability of credentials
        # Check Grok
        try:
            from app.config import settings
            if settings.GROK_API_KEY:
                # For now, mark as healthy if key exists; real ping could be added later
                self.api_health["grok"]["status"] = "healthy"
                self.api_health["grok"]["last_check"] = datetime.now()
                logger.debug("Grok health check: healthy")
        except Exception as e:
            logger.error(f"Grok health check failed: {e}")
            self.api_health["grok"]["status"] = "unhealthy"
            self.api_health["grok"]["failures"] += 1
        
        # Check OpenAI
        try:
            from app.config import settings
            if settings.OPENAI_API_KEY:
                # Quick test with OpenAI
                client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                # Check that client can be constructed; defer real API ping
                self.api_health["openai"]["status"] = "healthy"
                self.api_health["openai"]["last_check"] = datetime.now()
                logger.debug("OpenAI health check: healthy")
        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            self.api_health["openai"]["status"] = "unhealthy"
            self.api_health["openai"]["failures"] += 1
    
    def _classify_query(self, message: str) -> str:
        # Classify the query into a preferred provider using simple keyword rules
        message_lower = message.lower()
        word_count = len(message.split())
        
        # Quick factual queries → GPT-4-turbo (faster, cheaper)
        quick_keywords = ["what is", "define", "when", "where", "who", "how many"]
        if word_count < 100 and any(kw in message_lower for kw in quick_keywords):
            return "openai"
        
        # Complex reasoning → Grok (better at complex tasks)
        complex_keywords = ["analyze", "compare", "explain", "why", "reasoning", "solve"]
        if word_count > 200 or any(kw in message_lower for kw in complex_keywords):
            return "grok"
        
        # Default to GPT-4-turbo for general queries (cheaper)
        return "openai"
    
    def _check_rate_limit(self, provider: str) -> bool:
        # Naive per-provider rate limiting based on moving one-minute window
        now = datetime.now()
        one_minute_ago = now - timedelta(minutes=1)
        
        # Clean old requests
        self.request_counts[provider] = [
            req_time for req_time in self.request_counts[provider] 
            if req_time > one_minute_ago
        ]
        
        # Simple limits
        limits = {
            "grok": 100,    # 100 requests per minute
            "openai": 500   # 500 requests per minute
        }
        
        return len(self.request_counts[provider]) < limits.get(provider, 100)
    
    async def _call_grok(self, message: str) -> LLMResponse:
        # Call Grok chat completion endpoint
        from app.config import settings
        
        start_time = time.time()
        
        try:
            # Track request for rate limiting
            self.request_counts["grok"].append(datetime.now())
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{settings.GROK_API_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}"},
                    json={
                        "model": "grok-beta",
                        "messages": [{"role": "user", "content": message}],
                        "max_tokens": 1000,
                        "temperature": 0.7
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    # Rough cost estimate (token approximation by word count)
                    cost = len(message.split()) * 0.00002 + len(content.split()) * 0.00006
                    self.costs["grok"] += cost
                    
                    return LLMResponse(
                        content=content,
                        model_used="grok-beta",
                        response_time=time.time() - start_time,
                        cost=cost
                    )
                else:
                    raise Exception(f"Grok API error: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Grok API call failed: {e}")
            self.api_health["grok"]["failures"] += 1
            return LLMResponse(
                content="",
                model_used="grok-beta",
                response_time=time.time() - start_time,
                cost=0.0,
                error=str(e)
            )
    
    async def _call_openai(self, message: str) -> LLMResponse:
        # Call OpenAI Chat Completions API
        from app.config import settings
        
        start_time = time.time()
        
        try:
            # Track request for rate limiting
            self.request_counts["openai"].append(datetime.now())
            
            client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            response = await client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": message}],
                max_tokens=1000,
                temperature=0.3  # Lower temperature for factual responses
            )
            
            content = response.choices[0].message.content
            
            # Rough cost estimate (token approximation by word count)
            cost = len(message.split()) * 0.00001 + len(content.split()) * 0.00003
            self.costs["openai"] += cost
            
            return LLMResponse(
                content=content,
                model_used="gpt-4-turbo",
                response_time=time.time() - start_time,
                cost=cost
            )
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            self.api_health["openai"]["failures"] += 1
            return LLMResponse(
                content="",
                model_used="gpt-4-turbo",
                response_time=time.time() - start_time,
                cost=0.0,
                error=str(e)
            )
    
    async def route_message(self, message: str) -> LLMResponse:
        # Main routing function - picks best LLM and handles failover
        self.total_requests += 1
        
        # Classify the query
        preferred_provider = self._classify_query(message)
        logger.info(f"Query classified for: {preferred_provider}")
        
        # Check rate limits and health
        providers_to_try = []
        
        if preferred_provider == "openai":
            providers_to_try = ["openai", "grok"]  # Try OpenAI first, then Grok
        else:
            providers_to_try = ["grok", "openai"]  # Try Grok first, then OpenAI
        
        # Try each provider
        for provider in providers_to_try:
            # Check if provider is healthy and not rate limited
            if self.api_health[provider]["status"] == "unknown":
                logger.info(f"{provider} health unknown, trying anyway...")
            elif self.api_health[provider]["status"] != "healthy":
                logger.warning(f"{provider} is unhealthy, skipping")
                continue
                
            if not self._check_rate_limit(provider):
                logger.warning(f"{provider} rate limited, skipping")
                continue
            
            # Make the API call
            logger.info(f"Routing to {provider}...")
            if provider == "grok":
                response = await self._call_grok(message)
            else:
                response = await self._call_openai(message)
            
            # If successful, return
            if not response.error:
                logger.info(f"Successfully routed to {provider}")
                return response
            
            # Track error
            self.error_window.append(datetime.now())
            logger.error(f"{provider} failed: {response.error}")
        
        # All providers failed
        logger.error("All providers failed!")
        return LLMResponse(
            content="I'm sorry, I'm having technical difficulties. Please try again in a moment.",
            model_used="fallback",
            response_time=0.0,
            cost=0.0,
            error="All providers failed"
        )
    
    async def get_health_status(self) -> Dict:
        # Compute current health snapshot for all providers
        # Clean up old errors (keep last 5 minutes)
        five_min_ago = datetime.now() - timedelta(minutes=5)
        self.error_window = [e for e in self.error_window if e > five_min_ago]
        
        # Calculate error rate
        error_rate = len(self.error_window) / max(self.total_requests, 1)
        
        return {
            "grok": {
                "status": self.api_health["grok"]["status"],
                "failures": self.api_health["grok"]["failures"],
                "last_check": self.api_health["grok"]["last_check"].isoformat() if self.api_health["grok"]["last_check"] else None
            },
            "openai": {
                "status": self.api_health["openai"]["status"],
                "failures": self.api_health["openai"]["failures"],
                "last_check": self.api_health["openai"]["last_check"].isoformat() if self.api_health["openai"]["last_check"] else None
            },
            "error_rate": f"{error_rate:.2%}",
            "errors_last_5min": len(self.error_window)
        }
    
    def get_cost_summary(self) -> Dict[str, float]:
        # Return rounded cost totals per provider and aggregate
        return {
            "grok": round(self.costs["grok"], 4),
            "openai": round(self.costs["openai"], 4),
            "total": round(self.costs["grok"] + self.costs["openai"], 4)
        }
    
    def get_request_count(self) -> int:
        # Return total request count handled by the router
        return self.total_requests