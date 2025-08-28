import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface ContinuousVoiceCallProps {
  userId: string;
  tenantId?: string;
}

export const ContinuousVoiceCall: React.FC<ContinuousVoiceCallProps> = ({ 
  userId, 
  tenantId 
}) => {
  // State management
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<Array<{role: string, text: string}>>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Array<ArrayBuffer>>([]);
  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCallActive) {
        endCall();
      }
    };
  }, []);
  
  // Start continuous voice call
  const startCall = async () => {
    setIsConnecting(true);
    
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      mediaStreamRef.current = stream;
      
      // Setup audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create processor for continuous audio streaming
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      // Connect WebSocket for bidirectional streaming
      const token = localStorage.getItem('authToken') || '';
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//localhost:8000/ws/voice/continuous?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Voice WebSocket connected');
        setIsConnecting(false);
        setIsCallActive(true);
        callStartTimeRef.current = new Date();
        startDurationTimer();
        toast.success('Voice call started - speak naturally!');
        
        // Send initial connection data
        ws.send(JSON.stringify({
          type: 'start_call',
          user_id: userId,
          tenant_id: tenantId
        }));
      };
      
      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'greeting':
            // AI's initial greeting
            addToTranscript('AI', data.text);
            playAudioResponse(data.audio);
            break;
            
          case 'user_transcript':
            // Show what user said
            addToTranscript('You', data.text);
            break;
            
          case 'ai_audio':
            // AI is speaking
            setIsAISpeaking(true);
            addToTranscript('AI', data.text);
            playAudioResponse(data.audio);
            break;
            
          case 'ai_complete':
            // AI finished speaking
            setIsAISpeaking(false);
            break;
            
          case 'ai_interrupted':
            // User interrupted AI
            setIsAISpeaking(false);
            stopAudioPlayback();
            break;
            
          case 'ping':
            // Keepalive
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed');
        endCall();
      };
      
      // Process audio continuously
      processor.onaudioprocess = (e) => {
        if (!isCallActive || !ws || ws.readyState !== WebSocket.OPEN) return;
        
        // Get audio data
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate audio level for visualization
        const level = calculateAudioLevel(inputData);
        setAudioLevel(level);
        
        // Convert to 16-bit PCM
        const pcmData = convertTo16BitPCM(inputData);
        
        // Send audio chunk to server
        ws.send(JSON.stringify({
          type: 'audio_chunk',
          audio: arrayBufferToBase64(pcmData)
        }));
      };
      
      // Connect audio nodes
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      // Start visualization
      startVisualization();
      
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start voice call');
      setIsConnecting(false);
    }
  };
  
  // End the call
  const endCall = () => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    // Close WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_call' }));
      wsRef.current.close();
    }
    
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    
    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    // Stop visualization
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Reset state
    setIsCallActive(false);
    setIsAISpeaking(false);
    setAudioLevel(0);
    
    toast.success('Call ended');
  };
  
  // Add message to transcript
  const addToTranscript = (role: string, text: string) => {
    setTranscript(prev => [...prev, { role, text }]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      const element = document.getElementById('transcript-container');
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  };
  
  // Play AI audio response
  const playAudioResponse = async (audioBase64: string) => {
    try {
      // Decode base64 to array buffer
      const audioData = base64ToArrayBuffer(audioBase64);
      
      // Create audio buffer
      const audioBuffer = await audioContextRef.current?.decodeAudioData(audioData);
      
      if (audioBuffer) {
        const source = audioContextRef.current?.createBufferSource();
        if (source && audioContextRef.current) {
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current.destination);
          source.start(0);
          
          // Update speaking state when audio ends
          source.onended = () => {
            setIsAISpeaking(false);
          };
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };
  
  // Stop audio playback (for interruptions)
  const stopAudioPlayback = () => {
    // In production, you'd track and stop active audio sources
    audioQueueRef.current = [];
  };
  
  // Audio level calculation for visualization
  const calculateAudioLevel = (data: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += Math.abs(data[i]);
    }
    return Math.min(1, sum / data.length * 10);
  };
  
  // Audio format conversion
  const convertTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };
  
  // Base64 utilities
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };
  
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };
  
  // Duration timer
  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000);
        setCallDuration(elapsed);
      }
    }, 1000);
  };
  
  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Audio visualization
  const startVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw audio level bars
      const barWidth = canvas.width / 20;
      const barSpacing = 2;
      
      for (let i = 0; i < 20; i++) {
        const height = audioLevel * canvas.height * (0.5 + Math.random() * 0.5);
        const x = i * (barWidth + barSpacing);
        const y = (canvas.height - height) / 2;
        
        // Gradient based on speaking state
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (isAISpeaking) {
          gradient.addColorStop(0, '#764ba2');
          gradient.addColorStop(1, '#667eea');
        } else {
          gradient.addColorStop(0, '#00d464');
          gradient.addColorStop(1, '#00a651');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, height);
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };
  
  return (
    <div className="voice-call-container">
      <div className="call-header">
        <h2>🎤 Natural Voice Conversation</h2>
        <p>No buttons needed - just talk naturally like a phone call!</p>
      </div>
      
      {/* Call Interface */}
      <div className="call-interface">
        {!isCallActive ? (
          <div className="call-start">
            <button 
              className="call-button"
              onClick={startCall}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <div className="connecting">
                  <div className="spinner"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <>
                  <span className="call-icon">📞</span>
                  <span>Start Voice Call</span>
                </>
              )}
            </button>
            
            <div className="instructions">
              <h3>How it works:</h3>
              <ul>
                <li>✅ Click "Start Voice Call"</li>
                <li>✅ Allow microphone access</li>
                <li>✅ Start talking naturally</li>
                <li>✅ AI responds when you pause</li>
                <li>✅ Interrupt anytime by speaking</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="active-call">
            {/* Call Status */}
            <div className="call-status">
              <div className="status-indicator active"></div>
              <span>Call Active</span>
              <span className="duration">{formatDuration(callDuration)}</span>
            </div>
            
            {/* Audio Visualization */}
            <canvas 
              ref={canvasRef}
              className="audio-visualizer"
              width={600}
              height={100}
            />
            
            {/* Speaking Indicator */}
            <div className="speaking-indicator">
              {isAISpeaking ? (
                <div className="ai-speaking">
                  <div className="pulse"></div>
                  <span>AI is speaking...</span>
                </div>
              ) : (
                <div className="user-speaking">
                  <div className={`mic-indicator ${audioLevel > 0.1 ? 'active' : ''}`}>
                    🎤
                  </div>
                  <span>Listening...</span>
                </div>
              )}
            </div>
            
            {/* Transcript */}
            <div id="transcript-container" className="transcript">
              <h3>Conversation:</h3>
              {transcript.map((msg, idx) => (
                <div key={idx} className={`transcript-message ${msg.role.toLowerCase()}`}>
                  <span className="role">{msg.role}:</span>
                  <span className="text">{msg.text}</span>
                </div>
              ))}
            </div>
            
            {/* End Call Button */}
            <button className="end-call-button" onClick={endCall}>
              <span>🔴</span>
              End Call
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .voice-call-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .call-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .call-interface {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .call-button {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 0 auto;
          transition: all 0.3s;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        
        .call-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.6);
        }
        
        .call-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .call-icon {
          font-size: 48px;
        }
        
        .connecting {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .instructions {
          margin-top: 40px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
        }
        
        .instructions h3 {
          margin-bottom: 15px;
          color: #333;
        }
        
        .instructions ul {
          list-style: none;
          padding: 0;
        }
        
        .instructions li {
          padding: 8px 0;
          color: #666;
        }
        
        .active-call {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .call-status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          background: #f8f9fa;
          border-radius: 30px;
          width: fit-content;
          margin: 0 auto;
        }
        
        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ccc;
        }
        
        .status-indicator.active {
          background: #00d464;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 212, 100, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(0, 212, 100, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 212, 100, 0); }
        }
        
        .duration {
          font-weight: bold;
          color: #667eea;
        }
        
        .audio-visualizer {
          width: 100%;
          height: 100px;
          background: #f8f9fa;
          border-radius: 10px;
        }
        
        .speaking-indicator {
          display: flex;
          justify-content: center;
          padding: 20px;
        }
        
        .ai-speaking, .user-speaking {
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 18px;
        }
        
        .pulse {
          width: 20px;
          height: 20px;
          background: #764ba2;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }
        
        .mic-indicator {
          font-size: 30px;
          opacity: 0.5;
          transition: all 0.3s;
        }
        
        .mic-indicator.active {
          opacity: 1;
          transform: scale(1.2);
          filter: drop-shadow(0 0 10px #00d464);
        }
        
        .transcript {
          max-height: 300px;
          overflow-y: auto;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
        }
        
        .transcript h3 {
          margin-bottom: 15px;
          color: #333;
        }
        
        .transcript-message {
          margin: 10px 0;
          padding: 10px;
          border-radius: 8px;
          background: white;
        }
        
        .transcript-message.you {
          background: rgba(102, 126, 234, 0.1);
          margin-left: 20%;
        }
        
        .transcript-message.ai {
          background: rgba(118, 75, 162, 0.1);
          margin-right: 20%;
        }
        
        .transcript-message .role {
          font-weight: bold;
          color: #667eea;
          margin-right: 10px;
        }
        
        .end-call-button {
          padding: 15px 40px;
          background: #ff4757;
          color: white;
          border: none;
          border-radius: 30px;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 20px auto;
          transition: all 0.3s;
        }
        
        .end-call-button:hover {
          background: #ff3838;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};