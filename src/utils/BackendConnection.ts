export class BackendConnection {
  private wsUrl: string;
  private apiUrl: string;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    // Use proxy for API calls and direct connection for WebSocket in development
    this.apiUrl = import.meta.env.DEV ? '/api' : 'http://localhost:8880';
    this.wsUrl = import.meta.env.DEV ? 'ws://localhost:8880' : 'ws://localhost:8880';
  }

  // Connect to WebSocket with automatic reconnection
  async connectWebSocket(
    onMessage: (data: any) => void,
    onOpen?: () => void,
    onError?: (error: Event) => void
  ): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.wsUrl);

        this.socket.onopen = () => {
          console.log('✅ Connected to backend WebSocket');
          this.reconnectAttempts = 0;
          onOpen?.();
          resolve(this.socket!);
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          onError?.(error);
        };

        this.socket.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.handleReconnect(onMessage, onOpen, onError);
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  private handleReconnect(
    onMessage: (data: any) => void,
    onOpen?: () => void,
    onError?: (error: Event) => void
  ) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket(onMessage, onOpen, onError);
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  // Send message through WebSocket
  sendMessage(message: any): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    } else {
      console.error('❌ WebSocket not connected');
      return false;
    }
  }

  // HTTP API calls to backend
  async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ API call error:', error);
      throw error;
    }
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Get connection status
  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const backendConnection = new BackendConnection();