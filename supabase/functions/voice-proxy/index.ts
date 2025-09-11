import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade, connection, sec-websocket-key, sec-websocket-protocol, sec-websocket-version',
};

// Configuration - Get backend URL from environment
const BACKEND_URL = Deno.env.get('BACKEND_URL');

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL environment variable is not set!');
  console.error('Please configure BACKEND_URL in Supabase Edge Functions secrets');
}

// Normalize backend URL
const normalizeBackendUrl = (url: string): string => {
  if (!url) return '';
  
  // Remove trailing slash
  const cleanUrl = url.replace(/\/$/, '');
  
  // Convert HTTP schemes to WebSocket schemes
  if (cleanUrl.startsWith('https://')) {
    return cleanUrl.replace('https://', 'wss://');
  } else if (cleanUrl.startsWith('http://')) {
    return cleanUrl.replace('http://', 'ws://');
  } else if (cleanUrl.startsWith('ws://') || cleanUrl.startsWith('wss://')) {
    return cleanUrl;
  }
  
  // Default to ws:// if no scheme provided
  return `ws://${cleanUrl}`;
};

const normalizedBackendUrl = BACKEND_URL ? normalizeBackendUrl(BACKEND_URL) : '';
console.log('🔧 Backend configuration:', {
  rawBackendUrl: BACKEND_URL,
  normalizedBackendUrl,
  isConfigured: !!BACKEND_URL
});

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if backend is configured before proceeding
  if (!normalizedBackendUrl) {
    console.error('❌ Cannot process request: BACKEND_URL not configured');
    return new Response('Backend not configured. Please set BACKEND_URL in Edge Functions secrets.', { 
      status: 500,
      headers: corsHeaders 
    });
  }

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  console.log('🔌 WebSocket upgrade request received');

  try {
    // Extract token from query parameters
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      console.error('❌ No authentication token provided');
      return new Response('Authentication token required', { status: 401 });
    }

    console.log('🔑 Token received, upgrading WebSocket connection');

    // Upgrade the incoming request to WebSocket
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    // Connect to the backend WebSocket using normalized URL
    const backendWsUrl = `${normalizedBackendUrl}/ws/voice/continuous?token=${encodeURIComponent(token)}`;
    console.log('🔗 Connecting to backend:', backendWsUrl.split('?')[0] + '?token=***');

    let backendSocket: WebSocket;

    clientSocket.onopen = () => {
      console.log('✅ Client WebSocket connected');
      
      try {
        // Connect to backend
        backendSocket = new WebSocket(backendWsUrl);

        backendSocket.onopen = () => {
          console.log('✅ Backend WebSocket connected');
        };

        backendSocket.onmessage = (event) => {
          console.log('📨 Message from backend:', typeof event.data);
          // Forward message from backend to client
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(event.data);
          }
        };

        backendSocket.onerror = (error) => {
          console.error('❌ Backend WebSocket error:', error);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
              type: 'error',
              message: 'Backend connection failed. Please ensure backend is deployed and accessible.'
            }));
          }
        };

        backendSocket.onclose = (event) => {
          console.log('🔌 Backend WebSocket closed:', event.code, event.reason);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.close(event.code, event.reason);
          }
        };

      } catch (error) {
        console.error('❌ Error connecting to backend:', error);
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'error',
            message: 'Failed to connect to backend server'
          }));
        }
      }
    };

    clientSocket.onmessage = (event) => {
      console.log('📨 Message from client:', typeof event.data);
      // Forward message from client to backend
      if (backendSocket && backendSocket.readyState === WebSocket.OPEN) {
        backendSocket.send(event.data);
      }
    };

    clientSocket.onerror = (error) => {
      console.error('❌ Client WebSocket error:', error);
    };

    clientSocket.onclose = (event) => {
      console.log('🔌 Client WebSocket closed:', event.code, event.reason);
      if (backendSocket && backendSocket.readyState === WebSocket.OPEN) {
        backendSocket.close(event.code, event.reason);
      }
    };

    return response;

  } catch (error) {
    console.error('❌ WebSocket setup error:', error);
    return new Response('WebSocket setup failed', { status: 500 });
  }
});