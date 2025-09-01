#!/usr/bin/env python3
"""
Simple test server to verify backend functionality
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="AURA Test Server")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "AURA Test Server is running!"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "Test server is working",
        "endpoints": ["/", "/health", "/test"]
    }

@app.get("/test")
async def test():
    return {"test": "success", "message": "Backend is working!"}

if __name__ == "__main__":
    print("Starting AURA Test Server...")
    print("Server will be available at: http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
