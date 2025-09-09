// Aura API Service - Real-time voice communication with Aura backend
// Implements the audio processing pipeline from your developer guide

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
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioStream: MediaStream | null = null;
  private status: AuraStatus = { status: 'idle', isConnected: false };
  private reconnectTimeout: number | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlayingAudio = false;

  // Updated to match your backend specifications  
  private readonly BACKEND_URL = 'wss://157.245.192.221:8880/ws/voice/continuous';
  private readonly AUDIO_SETTINGS: AudioSettings = {
    sampleRate: 16000, // 16kHz as specified in your guide
    channels: 1,       // Mono
    bitsPerSample: 16  // 16-bit PCM
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
      // Handle both binary and text messages based on your backend protocol
      if (event.data instanceof ArrayBuffer) {
        // Binary audio response from backend
        this.handleBinaryAudioData(event.data);
        return;
      }

      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'transcript':
          this.emit('transcript', data.text);
          break;
          
        case 'audio':
          // Base64 encoded audio from backend
          this.handleAudioData(data.audio);
          break;
          
        case 'error':
          console.error('Aura backend error:', data.text);
          this.updateStatus({ status: 'error', error: data.text });
          break;

        default:
          // Handle other message types as needed
          console.log('Received message:', data);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private async handleBinaryAudioData(audioData: ArrayBuffer) {
    if (!this.audioContext) return;

    try {
      // Create WAV header for PCM audio
      const wavBuffer = this.createWAVFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavBuffer);
      
      this.audioQueue.push(audioBuffer);
      if (!this.isPlayingAudio) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error('Failed to process binary audio data:', error);
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
      // Get microphone access with 16kHz configuration
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.AUDIO_SETTINGS.sampleRate,
          channelCount: this.AUDIO_SETTINGS.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Use ScriptProcessor for real-time audio streaming (as per your guide)
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Real-time audio processing and streaming
      this.scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(inputData.length);
        
        // Convert Float32 to Int16 (as specified in your guide)
        for (let i = 0; i < inputData.length; i++) {
          int16Array[i] = inputData[i] * 32767;
        }
        
        // Send binary audio data directly via WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(int16Array.buffer);
        }
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.updateStatus({ status: 'listening' });
      
    } catch (error) {
      console.error('Failed to start listening:', error);
      this.updateStatus({ status: 'error', error: 'Microphone access denied' });
    }
  }

  stopListening() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    this.updateStatus({ status: 'idle' });
  }

  sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Send text message as JSON (for non-audio messages)
    const message = {
      type: 'text',
      text: text
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