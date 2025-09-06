// Aura API Service - Real-time voice communication with Aura backend

// Simple browser-compatible EventEmitter
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

export interface AuraMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audio?: string; // Base64 encoded audio data
}

export interface AuraStatus {
  status: 'idle' | 'listening' | 'thinking' | 'responding' | 'muted' | 'connecting' | 'error';
  isConnected: boolean;
  error?: string;
}

export interface AudioSettings {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

export class AuraAPIService extends SimpleEventEmitter {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private status: AuraStatus = { status: 'idle', isConnected: false };
  private reconnectTimeout: number | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlayingAudio = false;

  private readonly BACKEND_URL = 'ws://localhost:8880/ws'; // Aura backend WebSocket
  private readonly AUDIO_SETTINGS: AudioSettings = {
    sampleRate: 24000,
    channels: 1,
    bitsPerSample: 16
  };

  constructor() {
    super();
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new AudioContext({
        sampleRate: this.AUDIO_SETTINGS.sampleRate
      });
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      this.updateStatus({ status: 'error', isConnected: false, error: 'Audio initialization failed' });
    }
  }

  private updateStatus(newStatus: Partial<AuraStatus>) {
    this.status = { ...this.status, ...newStatus };
    this.emit('status', this.status);
  }

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.updateStatus({ status: 'connecting' });

    try {
      this.ws = new WebSocket(this.BACKEND_URL);
      
      this.ws.onopen = () => {
        console.log('Connected to Aura backend');
        this.updateStatus({ status: 'idle', isConnected: true });
        this.clearReconnectTimeout();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from Aura backend');
        this.updateStatus({ status: 'idle', isConnected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateStatus({ status: 'error', isConnected: false, error: 'Connection failed' });
      };

    } catch (error) {
      console.error('Failed to connect to Aura backend:', error);
      this.updateStatus({ status: 'error', isConnected: false, error: 'Connection failed' });
    }
  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'status':
          this.updateStatus({ status: data.status });
          break;
          
        case 'audio':
          this.handleAudioData(data.audio);
          break;
          
        case 'transcript':
          this.emit('transcript', data.text);
          break;
          
        case 'message':
          const message: AuraMessage = {
            id: data.id || Date.now().toString(),
            type: data.sender || 'assistant',
            content: data.content,
            timestamp: new Date(data.timestamp || Date.now()),
            audio: data.audio
          };
          this.emit('message', message);
          break;
          
        case 'error':
          console.error('Aura backend error:', data.error);
          this.updateStatus({ status: 'error', error: data.error });
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private async handleAudioData(base64Audio: string) {
    if (!this.audioContext) return;

    try {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create WAV header for PCM audio
      const wavBuffer = this.createWAVFromPCM(bytes.buffer);
      const audioBuffer = await this.audioContext.decodeAudioData(wavBuffer);
      
      this.audioQueue.push(audioBuffer);
      if (!this.isPlayingAudio) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error('Failed to process audio data:', error);
    }
  }

  private createWAVFromPCM(pcmBuffer: ArrayBuffer): ArrayBuffer {
    const pcmView = new DataView(pcmBuffer);
    const wavBuffer = new ArrayBuffer(44 + pcmBuffer.byteLength);
    const wavView = new DataView(wavBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        wavView.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    wavView.setUint32(4, 36 + pcmBuffer.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    wavView.setUint32(16, 16, true);
    wavView.setUint16(20, 1, true);
    wavView.setUint16(22, this.AUDIO_SETTINGS.channels, true);
    wavView.setUint32(24, this.AUDIO_SETTINGS.sampleRate, true);
    wavView.setUint32(28, this.AUDIO_SETTINGS.sampleRate * 2, true);
    wavView.setUint16(32, 2, true);
    wavView.setUint16(34, this.AUDIO_SETTINGS.bitsPerSample, true);
    writeString(36, 'data');
    wavView.setUint32(40, pcmBuffer.byteLength, true);

    // Copy PCM data
    const pcmArray = new Uint8Array(pcmBuffer);
    const wavArray = new Uint8Array(wavBuffer);
    wavArray.set(pcmArray, 44);

    return wavBuffer;
  }

  private async playNextAudio() {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return;
    }

    this.isPlayingAudio = true;
    const audioBuffer = this.audioQueue.shift()!;

    try {
      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext!.destination);
      
      source.onended = () => {
        this.playNextAudio();
      };
      
      source.start(0);
    } catch (error) {
      console.error('Failed to play audio:', error);
      this.playNextAudio(); // Continue with next audio
    }
  }

  async startListening() {
    if (!this.audioContext || this.status.status === 'listening') return;

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.AUDIO_SETTINGS.sampleRate,
          channelCount: this.AUDIO_SETTINGS.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.sendAudioData(event.data);
        }
      };

      this.mediaRecorder.start(100); // Send data every 100ms
      this.updateStatus({ status: 'listening' });
      
    } catch (error) {
      console.error('Failed to start listening:', error);
      this.updateStatus({ status: 'error', error: 'Microphone access denied' });
    }
  }

  stopListening() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    this.updateStatus({ status: 'idle' });
  }

  private async sendAudioData(audioBlob: Blob) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      this.ws.send(JSON.stringify({
        type: 'audio',
        audio: base64Audio,
        format: 'webm'
      }));
    } catch (error) {
      console.error('Failed to send audio data:', error);
    }
  }

  sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'text',
      content: text,
      timestamp: new Date().toISOString()
    };

    this.ws.send(JSON.stringify(message));
    
    // Emit user message
    this.emit('message', {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    } as AuraMessage);
  }

  private scheduleReconnect() {
    this.clearReconnectTimeout();
    this.reconnectTimeout = window.setTimeout(() => {
      console.log('Attempting to reconnect to Aura backend...');
      this.connect();
    }, 3000);
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  disconnect() {
    this.stopListening();
    this.clearReconnectTimeout();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.updateStatus({ status: 'idle', isConnected: false });
  }

  getStatus(): AuraStatus {
    return this.status;
  }
}

// Singleton instance
export const auraAPI = new AuraAPIService();