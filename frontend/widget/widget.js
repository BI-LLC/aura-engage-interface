// AURA Voice Widget Handler
class VoiceWidget {
    constructor() {
        this.isCallActive = false;
        this.isMinimized = false;
        this.websocket = null;
        this.mediaStream = null;
        
        this.initializeWidget();
    }

    initializeWidget() {
        this.setupEventListeners();
        this.updateStatus('Ready', 'offline');
    }

    setupEventListeners() {
        document.getElementById('startCallBtn').addEventListener('click', () => this.startCall());
        document.getElementById('endCallBtn').addEventListener('click', () => this.endCall());
        document.getElementById('minimizeBtn').addEventListener('click', () => this.toggleMinimize());
        document.getElementById('closeBtn').addEventListener('click', () => this.closeWidget());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('clearTranscript').addEventListener('click', () => this.clearTranscript());
    }

    async startCall() {
        try {
            this.updateStatus('Connecting...', 'connecting');
            this.showToast('Starting voice call...', 'info');
            
            // Get microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true,
                    sampleRate: 16000,
                    channelCount: 1
                } 
            });
            
            // Connect WebSocket with token
            const token = localStorage.getItem('aura_token') || 'demo_token';
            this.websocket = new WebSocket(`ws://localhost:8000/ws/voice/continuous?token=${token}`);
            
            this.websocket.onopen = () => {
                this.isCallActive = true;
                document.getElementById('startCallBtn').style.display = 'none';
                document.getElementById('endCallBtn').style.display = 'flex';
                document.getElementById('callDuration').style.display = 'block';
                document.getElementById('transcriptContainer').style.display = 'block';
                
                this.updateStatus('Connected', 'online');
                this.showToast('Voice call started!', 'success');
                
                // Start audio capture
                this.startAudioCapture();
            };
            
            this.websocket.onmessage = (event) => {
                this.handleWebSocketMessage(event.data);
            };
            
            this.websocket.onerror = () => {
                this.showToast('Connection failed', 'error');
                this.updateStatus('Connection failed', 'offline');
            };
            
        } catch (error) {
            console.error('Failed to start call:', error);
            this.updateStatus('Connection failed', 'offline');
            this.showToast('Failed to start call: ' + error.message, 'error');
        }
    }

    startAudioCapture() {
        if (!this.mediaStream) return;
        
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // Create script processor for audio capture
        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        this.scriptProcessor.onaudioprocess = (event) => {
            if (!this.isCallActive || !this.websocket) return;
            
            const inputBuffer = event.inputBuffer;
            const inputData = inputBuffer.getChannelData(0);
            
            // Convert float32 to int16
            const int16Array = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16Array[i] = inputData[i] * 32767;
            }
            
            // Send binary audio data directly via WebSocket
            if (this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(int16Array.buffer);
            }
        };
        
        // Connect the audio nodes
        this.audioSource.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);
        
        console.log('🎤 Audio capture started');
    }

    handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('📨 Received message:', message);
            
            switch (message.type) {
                case 'greeting':
                    this.addToTranscript('ai', message.text);
                    if (message.audio) {
                        this.playAudio(message.audio);
                    }
                    break;
                    
                case 'user_transcript':
                    this.addToTranscript('user', message.text);
                    break;
                    
                case 'ai_audio':
                    this.addToTranscript('ai', message.text);
                    if (message.audio) {
                        this.playAudio(message.audio);
                    }
                    break;
                    
                case 'ai_complete':
                    console.log('AI response complete:', message.full_response);
                    break;
                    
                case 'ai_interrupted':
                    console.log('AI was interrupted by user');
                    break;
                    
                case 'pong':
                    // Keepalive response
                    break;
                    
                case 'error':
                    this.showToast('Error: ' + message.message, 'error');
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    playAudio(audioBase64) {
        try {
            // Convert base64 to audio blob
            const audioData = atob(audioBase64);
            const audioArray = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                audioArray[i] = audioData.charCodeAt(i);
            }
            
            const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create and play audio
            const audio = new Audio(audioUrl);
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.updateStatus('Ready for next input');
            };
            
            audio.play().catch(error => {
                console.error('Failed to play audio:', error);
                this.updateStatus('Audio playback failed');
            });
            
        } catch (error) {
            console.error('Error playing audio:', error);
            this.updateStatus('Audio playback error');
        }
    }

    addToTranscript(role, text) {
        const transcript = document.getElementById('transcript');
        const entry = document.createElement('div');
        entry.className = 'transcript-entry';
        entry.innerHTML = `<span class="transcript-${role}">${role === 'user' ? 'You' : 'AURA'}:</span> ${text}`;
        transcript.appendChild(entry);
        transcript.scrollTop = transcript.scrollHeight;
    }

    endCall() {
        this.isCallActive = false;
        
        if (this.websocket) {
            // Send end call message before closing
            try {
                this.websocket.send(JSON.stringify({ type: 'end_call' }));
            } catch (e) {
                console.log('Could not send end call message');
            }
            
            this.websocket.close();
            this.websocket = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // Clean up audio context
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        
        if (this.audioSource) {
            this.audioSource.disconnect();
            this.audioSource = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        document.getElementById('startCallBtn').style.display = 'flex';
        document.getElementById('endCallBtn').style.display = 'none';
        document.getElementById('callDuration').style.display = 'none';
        
        this.updateStatus('Ready', 'offline');
        this.showToast('Call ended', 'info');
        
        console.log('🔇 Audio capture stopped');
    }

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        const content = document.querySelector('.widget-content');
        const minimized = document.querySelector('.widget-minimized');
        
        if (this.isMinimized) {
            content.style.display = 'none';
            minimized.style.display = 'block';
            document.getElementById('minimizeBtn').textContent = '+';
        } else {
            content.style.display = 'block';
            minimized.style.display = 'none';
            document.getElementById('minimizeBtn').textContent = '−';
        }
    }

    closeWidget() {
        if (this.isCallActive) this.endCall();
        document.getElementById('voiceWidget').style.display = 'none';
    }

    openSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
    }

    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    clearTranscript() {
        document.getElementById('transcript').innerHTML = '';
    }

    updateStatus(text, status) {
        document.getElementById('statusText').textContent = text;
        document.getElementById('minimizedStatus').textContent = text;
        document.getElementById('connectionStatus').className = `status-dot ${status}`;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }

    updateStatus(status) {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = status;
        }
        console.log('Status:', status);
    }
    
    showTranscript(text) {
        const transcriptDiv = document.getElementById('transcript');
        if (transcriptDiv) {
            transcriptDiv.innerHTML = text;
            transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
        }
    }
}

// Initialize widget
document.addEventListener('DOMContentLoaded', () => {
    window.voiceWidget = new VoiceWidget();
});
