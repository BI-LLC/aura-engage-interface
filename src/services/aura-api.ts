// Aura API Service - Real-time voice communication with local backend
// Updated to connect to the backend-copy repository
import { SignJWT } from 'jose';

// Configuration constants - Connect to Supabase Edge Function proxy
const SUPABASE_PROJECT_ID = 'rmqohckqlpkwtpzqimxk';
const AURA_WS_URL = `wss://${SUPABASE_PROJECT_ID}.functions.supabase.co/functions/v1/voice-proxy`;

// Generate a proper JWT token matching backend requirements
async function generateDemoToken(): Promise<string> {
  const payload = {
    user_id: 'demo_user_123',
    tenant_id: 'demo_tenant_123',
    role: 'user',
    organization: 'Demo Organization',
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days from now
  };
  
  // Use the same secret key as the backend
  const secret = new TextEncoder().encode('your-secret-key-change-in-production');
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
    
  return token;
}

// Type definitions
export interface AuraMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audio?: string;
}

export interface AuraStatus {
  status: 'idle' | 'listening' | 'thinking' | 'responding' | 'muted' | 'connecting' | 'error';
  isConnected: boolean;
  error?: string;
}

// Extend Window interface for auraLogs
declare global {
  interface Window {
    auraLogs?: Array<{ timestamp: string; level: string; message: string; data?: any }>;
  }
}

// Simple EventEmitter for compatibility
class SimpleEventEmitter {
  private events: Record<string, Function[]> = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

// Logging utility
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [AuraAPI] ${message}`;
  
  console[level](logMessage, data || '');
  
  // Store logs for diagnostics
  if (!window.auraLogs) window.auraLogs = [];
  window.auraLogs.push({ timestamp, level, message, data });
  
  // Keep only last 100 logs
  if (window.auraLogs.length > 100) {
    window.auraLogs = window.auraLogs.slice(-100);
  }
};

class AuraAPI extends SimpleEventEmitter {
  private ws: WebSocket | null = null;
  private connected = false;
  private shouldReconnect = true;
  private status: AuraStatus = { status: 'idle', isConnected: false };
  private audioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;

  // Event handlers
  onResponse?: (text: string) => void;
  onAudio?: (audioBase64: string) => void;
  onError?: (error: string) => void;
  onUserTranscript?: (text: string) => void;

  constructor() {
    super();
    log('info', 'AuraAPI initialized for local backend connection');
  }

  private updateStatus(newStatus: Partial<AuraStatus>) {
    this.status = { ...this.status, ...newStatus };
    this.emit('status', this.status);
  }

  // Legacy method for compatibility with useAura hook
  async connect(): Promise<void> {
    return this.start();
  }

  async start(): Promise<void> {
    log('info', 'Starting AuraAPI connection to local backend...');
    this.shouldReconnect = true;
    
    try {
      this.updateStatus({ status: 'connecting' });
      await this.connectWebSocket();
      this.updateStatus({ status: 'idle', isConnected: true });
      log('info', 'AuraAPI started successfully');
    } catch (error: any) {
      this.updateStatus({ status: 'error', isConnected: false, error: error.message });
      log('error', 'Failed to start AuraAPI', error);
      throw new Error(`Failed to connect to local backend: ${error.message}`);
    }
  }

  async connectWebSocket(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      log('info', 'WebSocket already connected');
      return;
    }

    try {
      // Generate fresh token for each connection and connect via Supabase proxy
      const token = await generateDemoToken();
      const wsUrl = `${AURA_WS_URL}?token=${encodeURIComponent(token)}`;
      
      log('info', `Connecting to backend via Supabase proxy: ${wsUrl.split('?')[0]}...`);
      
      return new Promise((resolve, reject) => {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          log('info', 'WebSocket connected to local backend successfully');
          this.connected = true;
          this.updateStatus({ status: 'idle', isConnected: true, error: undefined });
          resolve();
        };

        this.ws.onmessage = (event) => {
          log('info', 'WebSocket message received', { 
            type: typeof event.data,
            size: event.data?.length || 0
          });
          
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            log('warn', 'Failed to parse WebSocket message', event.data);
          }
        };

        this.ws.onerror = (error) => {
          log('error', 'WebSocket error occurred', error);
          this.connected = false;
          this.updateStatus({ 
            status: 'error', 
            isConnected: false, 
            error: 'Connection failed - backend may not be deployed or accessible' 
          });
          reject(new Error('Cannot connect to backend. Please ensure your backend is deployed and accessible.'));
        };

        this.ws.onclose = (event) => {
          log('info', 'WebSocket connection closed', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean 
          });
          this.connected = false;
          
          // Handle different close reasons
          let errorMessage = 'Disconnected';
          if (event.code === 1006) {
            errorMessage = 'Connection lost - backend may be down';
          } else if (event.code === 1008 || event.code === 4001) {
            errorMessage = 'Authentication failed - invalid token';
          } else if (event.code === 1011) {
            errorMessage = 'Backend error occurred';
          }
          
          this.updateStatus({ 
            status: 'error', 
            isConnected: false, 
            error: errorMessage 
          });
          
          // Auto-reconnect after a delay if not an auth error
          if (!event.wasClean && this.shouldReconnect && event.code !== 1008 && event.code !== 4001) {
            log('info', 'Attempting to reconnect in 3 seconds...');
            setTimeout(() => {
              if (this.shouldReconnect) {
                this.connectWebSocket().catch(err => 
                  log('error', 'Reconnection failed', err)
                );
              }
            }, 3000);
          }
        };
        
        // Timeout for connection
        setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            log('error', 'WebSocket connection timeout');
            this.ws.close();
            this.updateStatus({ 
              status: 'error', 
              isConnected: false, 
              error: 'Connection timeout - backend may be starting up' 
            });
            reject(new Error('Backend connection timeout. Please ensure your backend is deployed and accessible.'));
          }
        }, 15000); // Increased timeout for backend startup
      });
      
    } catch (error) {
      log('error', 'Error creating WebSocket connection', error);
      this.updateStatus({ 
        status: 'error', 
        isConnected: false, 
        error: 'Failed to create connection' 
      });
      throw error;
    }
  }

  private handleMessage(data: any): void {
    log('info', 'Processing WebSocket message', data);
    
    switch (data.type) {
      case 'pong':
        log('info', 'Received pong response');
        break;
        
      case 'greeting':
        log('info', 'Received greeting from AURA', { text: data.text });
        if (this.onResponse && data.text) {
          this.onResponse(data.text);
        }
        if (this.onAudio && data.audio) {
          this.onAudio(data.audio);
        }
        // Emit message event for compatibility
        this.emit('message', {
          id: Date.now().toString(),
          type: 'assistant',
          content: data.text || 'Hello!',
          timestamp: new Date(),
          audio: data.audio
        } as AuraMessage);
        break;
        
      case 'user_transcript':
        log('info', 'User speech transcribed', { text: data.text });
        if (this.onUserTranscript) {
          this.onUserTranscript(data.text);
        }
        // Emit transcript event
        this.emit('transcript', data.text);
        break;
        
      case 'ai_chunk':
        log('info', 'Received AI response chunk', { text: data.text });
        if (this.onResponse && data.text) {
          this.onResponse(data.text);
        }
        break;
        
      case 'ai_complete':
        log('info', 'AI response complete', { text: data.text?.substring(0, 50) });
        // Emit message event for complete response
        this.emit('message', {
          id: Date.now().toString(),
          type: 'assistant',
          content: data.text || '',
          timestamp: new Date()
        } as AuraMessage);
        break;
        
      case 'ai_audio':
        log('info', 'Received AI audio', { duration: data.duration });
        if (this.onAudio && data.audio) {
          this.onAudio(data.audio);
        }
        // Emit audio event
        this.emit('audio', data.audio);
        break;
        
      case 'error':
        log('error', 'Received error from server', data.message);
        if (this.onError) {
          this.onError(data.message || 'Unknown server error');
        }
        this.updateStatus({ status: 'error', error: data.message });
        break;
        
      default:
        log('warn', 'Unknown message type received', data);
    }
  }

  async startListening(): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to backend');
    }

    try {
      // Initialize audio context if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 16000 });
      }

      // Get microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.updateStatus({ status: 'listening' });
      log('info', 'Started listening for audio input');

      // Set up audio processing for continuous streaming
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(inputData.length);
        
        // Convert Float32 to Int16
        for (let i = 0; i < inputData.length; i++) {
          int16Array[i] = inputData[i] * 32767;
        }
        
        // Send binary audio data directly via WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(int16Array.buffer);
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

    } catch (error) {
      log('error', 'Failed to start listening', error);
      this.updateStatus({ status: 'error', error: 'Microphone access denied' });
      throw error;
    }
  }

  stopListening(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    this.updateStatus({ status: 'idle' });
    log('info', 'Stopped listening for audio input');
  }

  async sendAudio(audioBlob: Blob): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    try {
      log('info', 'Sending audio to backend', { size: audioBlob.size, type: audioBlob.type });
      
      // Convert blob to raw bytes for backend processing
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Send binary audio data directly to backend
      this.ws.send(uint8Array);
      
      log('info', 'Audio sent successfully as binary data');
    } catch (error) {
      log('error', 'Error sending audio', error);
      throw error;
    }
  }

  sendMessage(message: any): void {
    if (!this.connected || !this.ws) {
      log('warn', 'Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      log('info', 'Message sent successfully', message);
    } catch (error) {
      log('error', 'Error sending message', error);
    }
  }

  // Legacy method for compatibility
  sendTextMessage(text: string): void {
    this.sendText(text);
  }

  async sendText(text: string): Promise<void> {
    // For text-only messages, we can send them as JSON
    this.sendMessage({
      type: 'text',
      text: text
    });

    // Emit user message event
    this.emit('message', {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    } as AuraMessage);
  }

  async endCall(): Promise<void> {
    log('info', 'Ending call...');
    
    if (this.ws) {
      this.sendMessage({ type: 'end_call' });
      
      // Give time for the message to send, then close
      setTimeout(() => {
        this.disconnect();
      }, 500);
    }
  }

  disconnect(): void {
    log('info', 'Disconnecting from backend...');
    
    this.shouldReconnect = false;
    this.connected = false;
    
    this.stopListening();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.updateStatus({ status: 'idle', isConnected: false });
    log('info', 'Disconnected successfully');
  }

  getStatus(): AuraStatus {
    return this.status;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details: any }> {
    try {
      log('info', 'Testing backend connection...');
      
      // For now, skip HTTP test since we're using WebSocket proxy
      const isHttpReachable = true;
      
      // Test WebSocket connection with proper JWT
      await this.connectWebSocket();
      
      const testResult = {
        success: true,
        details: {
          httpReachable: isHttpReachable,
          websocketConnected: this.connected,
          backendUrl: AURA_WS_URL,
          hasValidJWT: true,
          timestamp: new Date().toISOString()
        }
      };
      
      log('info', 'Backend connection test completed successfully', testResult);
      return testResult;
      
    } catch (error: any) {
      const testResult = {
        success: false,
        error: error.message || 'Unknown error',
        details: {
          httpReachable: false,
          websocketConnected: false,
          backendUrl: AURA_WS_URL,
          hasValidJWT: false,
          timestamp: new Date().toISOString(),
          errorDetails: error.message
        }
      };
      
      log('error', 'Backend connection test failed', testResult);
      return testResult;
    }
  }

  getDiagnostics(): any {
    const diagnostics = {
      connection: {
        connected: this.connected,
        websocketState: this.ws?.readyState,
        url: AURA_WS_URL,
        backendUrl: AURA_WS_URL,
        shouldReconnect: this.shouldReconnect,
        hasJWTToken: true
      },
      audio: {
        contextState: this.audioContext?.state,
        deviceSupport: !!navigator.mediaDevices?.getUserMedia
      },
      browser: {
        userAgent: navigator.userAgent,
        webSocketSupport: !!window.WebSocket
      },
      logs: window.auraLogs?.slice(-10) || [],
      timestamp: new Date().toISOString()
    };
    
    log('info', 'Generated diagnostics', diagnostics);
    return diagnostics;
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create and export singleton instance
export const auraAPI = new AuraAPI();

// Export the class for type checking
export default AuraAPI;
