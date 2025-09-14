import { getBackendToken } from './api';

// Use the backend WebSocket URL from environment variables
const WS_BASE = 'wss://iaura.ai/ws';

export interface VoiceSocketOptions {
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

/**
 * Open a WebSocket connection to the voice endpoint with authentication
 */
export const openVoiceSocket = async (options: VoiceSocketOptions = {}): Promise<WebSocket> => {
  try {
    console.log('🔌 Opening voice WebSocket connection...');
    
    const backendToken = await getBackendToken();
    const wsUrl = `${WS_BASE}/continuous?token=${encodeURIComponent(backendToken)}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = (event) => {
      console.log('✅ Voice WebSocket connected');
      options.onOpen?.();
    };
    
    ws.onmessage = (event) => {
      console.log('📨 Voice WebSocket message received');
      options.onMessage?.(event);
    };
    
    ws.onclose = (event) => {
      if (event.code === 1008 || event.code === 1011) {
        console.error('❌ Voice WebSocket closed with error:', event.code, event.reason);
      } else {
        console.log('🔌 Voice WebSocket closed:', event.code, event.reason);
      }
      options.onClose?.(event);
    };
    
    ws.onerror = (event) => {
      console.error('❌ Voice WebSocket error:', event);
      options.onError?.(event);
    };
    
    return ws;
  } catch (error) {
    console.error('❌ Failed to open voice WebSocket:', error);
    throw error;
  }
};

/**
 * Test WebSocket connectivity
 */
export const testWebSocketConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const ws = await openVoiceSocket({
      onOpen: () => {
        console.log('🧪 WebSocket test: Connection successful');
        ws.close();
      }
    });
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ success: false, error: 'Connection timeout' });
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ success: true });
      };
      
      ws.onerror = () => {
        clearTimeout(timeout);
        resolve({ success: false, error: 'Connection failed' });
      };
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
};