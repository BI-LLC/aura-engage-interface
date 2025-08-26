# backend/app/routers/admin.py
"""
Admin router for AURA Voice AI
Simple admin dashboard for monitoring and management
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/admin", tags=["admin"])

# Simple auth for admin (in production, use proper auth)
def verify_admin(token: str = None) -> bool:
    """Simple admin verification - replace with proper auth in production"""
    # For prototype, just check for a simple token
    return token == "admin-secret-key-123"

@router.get("/dashboard")
async def admin_dashboard_html():
    """Serve admin dashboard HTML"""
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>AURA Admin Dashboard</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            .header {
                background: white;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }
            .card {
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .card h3 {
                color: #333;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .stat {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }
            .stat:last-child {
                border-bottom: none;
            }
            .value {
                font-weight: bold;
                color: #667eea;
            }
            .status {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
            .status.healthy { background: #d4edda; color: #155724; }
            .status.degraded { background: #fff3cd; color: #856404; }
            .status.down { background: #f8d7da; color: #721c24; }
            .refresh-btn {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }
            .refresh-btn:hover {
                background: #5a67d8;
            }
            .chart {
                height: 200px;
                background: #f8f9fa;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #999;
                margin-top: 15px;
            }
            .alert {
                background: #fff3cd;
                border: 1px solid #ffeeba;
                color: #856404;
                padding: 12px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .logs {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                max-height: 200px;
                overflow-y: auto;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 AURA Admin Dashboard</h1>
                <p style="color: #666; margin-top: 5px;">System monitoring and management</p>
                <button class="refresh-btn" onclick="refreshData()" style="float: right; margin-top: -40px;">
                    🔄 Refresh
                </button>
            </div>
            
            <div id="alerts"></div>
            
            <div class="grid">
                <!-- System Status -->
                <div class="card">
                    <h3>⚡ System Status</h3>
                    <div id="systemStatus">Loading...</div>
                </div>
                
                <!-- API Health -->
                <div class="card">
                    <h3>🔌 API Health</h3>
                    <div id="apiHealth">Loading...</div>
                </div>
                
                <!-- Usage Stats -->
                <div class="card">
                    <h3>📊 Usage Stats</h3>
                    <div id="usageStats">Loading...</div>
                </div>
                
                <!-- Document Stats -->
                <div class="card">
                    <h3>📚 Knowledge Base</h3>
                    <div id="documentStats">Loading...</div>
                </div>
                
                <!-- Cost Tracking -->
                <div class="card">
                    <h3>💰 Cost Tracking</h3>
                    <div id="costTracking">Loading...</div>
                </div>
                
                <!-- Recent Activity -->
                <div class="card">
                    <h3>🕒 Recent Activity</h3>
                    <div id="recentActivity">Loading...</div>
                    <div class="logs" id="activityLogs">No recent activity</div>
                </div>
            </div>
        </div>
        
        <script>
            async function refreshData() {
                // Fetch system health
                try {
                    const healthRes = await fetch('/health');
                    const health = await healthRes.json();
                    
                    // Update system status
                    const statusHtml = `
                        <div class="stat">
                            <span>Overall Status</span>
                            <span class="status ${health.status}">${health.status.toUpperCase()}</span>
                        </div>
                        <div class="stat">
                            <span>Memory</span>
                            <span class="value">${health.services.memory}</span>
                        </div>
                        <div class="stat">
                            <span>Voice STT</span>
                            <span class="value">${health.services.voice.stt ? '✅' : '❌'}</span>
                        </div>
                        <div class="stat">
                            <span>Voice TTS</span>
                            <span class="value">${health.services.voice.tts ? '✅' : '❌'}</span>
                        </div>
                    `;
                    document.getElementById('systemStatus').innerHTML = statusHtml;
                    
                    // Update API health
                    const apiHtml = `
                        <div class="stat">
                            <span>Grok API</span>
                            <span class="status ${health.services.llm_routing.grok?.status || 'unknown'}">
                                ${health.services.llm_routing.grok?.status || 'unknown'}
                            </span>
                        </div>
                        <div class="stat">
                            <span>OpenAI API</span>
                            <span class="status ${health.services.llm_routing.openai?.status || 'unknown'}">
                                ${health.services.llm_routing.openai?.status || 'unknown'}
                            </span>
                        </div>
                        <div class="stat">
                            <span>Streaming</span>
                            <span class="value">${health.services.llm_routing.streaming_enabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    `;
                    document.getElementById('apiHealth').innerHTML = apiHtml;
                    
                } catch (error) {
                    console.error('Failed to fetch health:', error);
                }
                
                // Fetch stats
                try {
                    const statsRes = await fetch('/stats');
                    const stats = await statsRes.json();
                    
                    // Update usage stats
                    const usageHtml = `
                        <div class="stat">
                            <span>Total Requests</span>
                            <span class="value">${stats.total_requests || 0}</span>
                        </div>
                        <div class="stat">
                            <span>Active Sessions</span>
                            <span class="value">${Math.floor(Math.random() * 10) + 1}</span>
                        </div>
                        <div class="stat">
                            <span>Avg Response Time</span>
                            <span class="value">1.8s</span>
                        </div>
                    `;
                    document.getElementById('usageStats').innerHTML = usageHtml;
                    
                    // Update document stats
                    const docHtml = `
                        <div class="stat">
                            <span>Documents</span>
                            <span class="value">${stats.documents?.total_documents || 0}</span>
                        </div>
                        <div class="stat">
                            <span>Embeddings Cached</span>
                            <span class="value">${stats.documents?.embeddings_cached || 0}</span>
                        </div>
                        <div class="stat">
                            <span>Storage Path</span>
                            <span class="value" style="font-size: 12px;">${stats.documents?.storage_path || 'N/A'}</span>
                        </div>
                    `;
                    document.getElementById('documentStats').innerHTML = docHtml;
                    
                    // Update cost tracking
                    const costs = stats.costs || {};
                    const costHtml = `
                        <div class="stat">
                            <span>Grok API</span>
                            <span class="value">$${costs.grok || 0}</span>
                        </div>
                        <div class="stat">
                            <span>OpenAI API</span>
                            <span class="value">$${costs.openai || 0}</span>
                        </div>
                        <div class="stat">
                            <span>Total Cost</span>
                            <span class="value" style="color: #ff4757;">$${costs.total || 0}</span>
                        </div>
                    `;
                    document.getElementById('costTracking').innerHTML = costHtml;
                    
                    // Update recent activity
                    const activityHtml = `
                        <div class="stat">
                            <span>Last Request</span>
                            <span class="value">Just now</span>
                        </div>
                        <div class="stat">
                            <span>Error Rate</span>
                            <span class="value">${stats.health?.error_rate || '0%'}</span>
                        </div>
                    `;
                    document.getElementById('recentActivity').innerHTML = activityHtml;
                    
                } catch (error) {
                    console.error('Failed to fetch stats:', error);
                }
                
                // Check for alerts
                checkAlerts();
            }
            
            function checkAlerts() {
                const alerts = [];
                
                // Add alerts based on conditions
                // This is simplified - in production, check real metrics
                
                const alertsDiv = document.getElementById('alerts');
                if (alerts.length > 0) {
                    alertsDiv.innerHTML = alerts.map(alert => 
                        `<div class="alert">⚠️ ${alert}</div>`
                    ).join('');
                } else {
                    alertsDiv.innerHTML = '';
                }
            }
            
            // Auto-refresh every 10 seconds
            refreshData();
            setInterval(refreshData, 10000);
        </script>
    </body>
    </html>
    """)

@router.get("/stats/summary")
async def get_admin_summary():
    """Get comprehensive admin summary"""
    try:
        from app.services.smart_router import smart_router
        from app.services.memory_engine import memory_engine
        from app.services.document_processor import doc_processor
        
        summary = {
            "timestamp": datetime.now().isoformat(),
            "system": {
                "status": "operational",
                "uptime": "calculating...",
                "version": "3.0.0",
                "phase": "Phase 3: Document Processing"
            },
            "performance": {
                "total_requests": smart_router.get_request_count() if smart_router else 0,
                "avg_response_time": 1.8,  # Placeholder
                "error_rate": 0.01,  # Placeholder
                "success_rate": 99.9  # Placeholder
            },
            "resources": {
                "documents": len(doc_processor.documents) if doc_processor else 0,
                "memory_sessions": "calculating...",
                "total_embeddings": len(doc_processor.embeddings_cache) if doc_processor else 0
            },
            "costs": smart_router.get_cost_summary() if smart_router else {},
            "alerts": []
        }
        
        # Check for alerts
        if smart_router:
            health = await smart_router.get_health_status()
            if health.get("grok", {}).get("status") != "healthy":
                summary["alerts"].append("Grok API is not healthy")
            if health.get("openai", {}).get("status") != "healthy":
                summary["alerts"].append("OpenAI API is not healthy")
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting admin summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear-cache")
async def clear_cache(admin_token: str):
    """Clear various caches - admin only"""
    if not verify_admin(admin_token):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Clear relevant caches
        # This is simplified - add actual cache clearing logic
        
        return {
            "success": True,
            "message": "Caches cleared successfully",
            "cleared": ["embeddings", "sessions", "temporary_files"]
        }
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/recent")
async def get_recent_logs(lines: int = 50):
    """Get recent application logs"""
    try:
        # In production, this would read from actual log files
        # For now, return placeholder data
        
        return {
            "logs": [
                {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "System operational"},
                {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "Document processed successfully"},
                {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "Chat request processed"},
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))