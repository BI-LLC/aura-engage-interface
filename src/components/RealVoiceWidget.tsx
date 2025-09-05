import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, X, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { backendConnection } from '@/utils/BackendConnection';
import { useToast } from '@/components/ui/use-toast';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RealVoiceWidgetProps {
  className?: string;
}

const RealVoiceWidget: React.FC<RealVoiceWidgetProps> = ({ className }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Initialize connection
  const initializeConnection = async () => {
    try {
      setConnectionStatus('connecting');
      
      await backendConnection.connectWebSocket(
        handleWebSocketMessage,
        () => {
          setConnectionStatus('connected');
          toast({
            title: "Connected",
            description: "Successfully connected to voice AI backend",
          });
        },
        () => {
          setConnectionStatus('error');
          toast({
            title: "Connection Error",
            description: "Failed to connect to voice AI backend",
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      setConnectionStatus('error');
    }
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    console.log('📥 Received message:', data);

    switch (data.type) {
      case 'voice_status':
        setVoiceStatus(data.status);
        break;
      
      case 'transcript_update':
        setCurrentTranscript(data.transcript);
        break;
      
      case 'conversation_message':
        setMessages(prev => [...prev, {
          id: data.id || Date.now().toString(),
          type: data.role,
          content: data.content,
          timestamp: new Date(data.timestamp || Date.now())
        }]);
        break;
      
      case 'audio_data':
        // Handle audio playback
        playAudioData(data.audioData);
        break;
      
      case 'error':
        toast({
          title: "Backend Error",
          description: data.message,
          variant: "destructive",
        });
        break;
    }
  };

  // Play audio data from backend
  const playAudioData = async (audioData: string) => {
    try {
      // Convert base64 audio to blob and play
      const audioBlob = new Blob([
        Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
      ], { type: 'audio/wav' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // Start/stop voice interaction
  const toggleVoiceMode = () => {
    if (connectionStatus !== 'connected') {
      initializeConnection();
      return;
    }

    const newListeningState = !isListening;
    setIsListening(newListeningState);
    
    backendConnection.sendMessage({
      type: newListeningState ? 'start_listening' : 'stop_listening'
    });
  };

  // Mute/unmute
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    backendConnection.sendMessage({
      type: 'toggle_mute',
      muted: newMuteState
    });
  };

  // Close widget and disconnect
  const closeWidget = () => {
    setIsOpen(false);
    setIsListening(false);
    backendConnection.disconnect();
    setConnectionStatus('disconnected');
  };

  // Status color helpers
  const getConnectionStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getVoiceStatusColor = (status: VoiceStatus) => {
    switch (status) {
      case 'listening': return 'text-blue-500';
      case 'thinking': return 'text-yellow-500';
      case 'speaking': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      backendConnection.disconnect();
    };
  }, []);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-lg",
          "bg-primary hover:bg-primary/90 text-white",
          "transition-all duration-300 hover:scale-110",
          className
        )}
      >
        <Mic className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 w-96 shadow-2xl border-0",
      "bg-background/95 backdrop-blur-sm",
      isMinimized ? "h-16" : "h-[500px]",
      "transition-all duration-300",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              "w-3 h-3 rounded-full",
              getConnectionStatusColor(connectionStatus)
            )} />
            {connectionStatus === 'connected' && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">Aura AI</h3>
            <p className="text-xs text-muted-foreground capitalize">
              {connectionStatus} • {voiceStatus}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeWidget}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[300px]">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Press the microphone to start talking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "p-3 rounded-lg max-w-[80%]",
                      message.type === 'user'
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Current transcript */}
            {currentTranscript && (
              <div className="mt-3 p-2 bg-muted rounded-lg border-dashed border-2">
                <p className="text-sm text-muted-foreground italic">
                  {currentTranscript}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
                disabled={connectionStatus !== 'connected'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <Button
                onClick={toggleVoiceMode}
                disabled={connectionStatus === 'connecting'}
                className={cn(
                  "rounded-full w-12 h-12",
                  isListening && connectionStatus === 'connected'
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              
              <Badge variant="outline" className="text-xs">
                {connectionStatus === 'connected' ? '🟢 Live' : '🔴 Offline'}
              </Badge>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default RealVoiceWidget;