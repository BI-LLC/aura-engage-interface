import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX, 
  Minimize2,
  X,
  MessageSquare,
  Wifi,
  WifiOff,
  AlertCircle,
  LogIn
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAura } from "@/hooks/useAura";
import { useAuth } from "@/contexts/AuthContext";

type VoiceStatus = "idle" | "listening" | "thinking" | "responding" | "muted" | "connecting" | "error";

interface VoiceWidgetProps {
  className?: string;
}

export default function VoiceWidget({ className }: VoiceWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTalkModeActive, setIsTalkModeActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [waveformBars] = useState(Array.from({ length: 5 }, (_, i) => i));
  
  // Get authentication state
  const { user, loading } = useAuth();
  
  // Use Aura API hook only if authenticated
  const { 
    messages, 
    status, 
    currentTranscript, 
    isInitialized,
    startListening, 
    stopListening, 
    sendMessage,
    reconnect
  } = useAura();

  console.log('VoiceWidget render - status:', status, 'isInitialized:', isInitialized);

  // Map Aura status to voice status
  const voiceStatus: VoiceStatus = status.status;
  const conversation = messages;

  const getStatusColor = (status: VoiceStatus) => {
    switch (status) {
      case "listening":
        return "text-voice-listening";
      case "thinking":
        return "text-voice-thinking";  
      case "responding":
        return "text-voice-speaking";
      case "connecting":
        return "text-primary";
      case "error":
        return "text-destructive";
      case "muted":
        return "text-voice-muted";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusText = (voiceStatus: VoiceStatus) => {
    switch (voiceStatus) {
      case "listening":
        return "Listening...";
      case "thinking":
        return "Thinking...";
      case "responding":
        return "Responding...";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Connection Error";
      case "muted":
        return "Muted";
      default:
        return status.isConnected ? "Ready to talk" : "Disconnected";
    }
  };

  const getStatusGlow = (status: VoiceStatus) => {
    switch (status) {
      case "listening":
        return "shadow-emerald-400/50";
      case "thinking":
        return "shadow-amber-400/50";
      case "responding":
        return "shadow-purple-400/50";
      case "connecting":
        return "shadow-primary/50";
      case "error":
        return "shadow-destructive/50";
      default:
        return "";
    }
  };

  const handleTalkModeToggle = async () => {
    // Check authentication first
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    if (!status.isConnected && !isTalkModeActive) {
      await reconnect();
      return;
    }

    setIsTalkModeActive(!isTalkModeActive);
    if (!isTalkModeActive) {
      await startListening();
    } else {
      stopListening();
    }
  };

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        {/* Floating Button */}
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className={`w-16 h-16 rounded-full gradient-primary text-primary-foreground floating-shadow hover:scale-105 transition-bounce ${
            isTalkModeActive ? `animate-pulse shadow-lg ${getStatusGlow(voiceStatus)}` : ""
          } ${!user ? "opacity-60" : ""}`}
        >
          {!user ? <LogIn className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <Card className="w-96 max-w-[calc(100vw-3rem)] floating-shadow">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
                {status.isConnected ? (
                  <Wifi className="absolute -bottom-1 -right-1 w-3 h-3 text-voice-listening bg-background rounded-full p-0.5" />
                ) : (
                  <WifiOff className="absolute -bottom-1 -right-1 w-3 h-3 text-destructive bg-background rounded-full p-0.5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Aura</h3>
                  {voiceStatus === 'error' && (
                    <AlertCircle className="w-3 h-3 text-destructive" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {status.isConnected ? 'Voice AI Assistant' : 'Connecting...'}
                </p>
              </div>
            </div>
          <div className="flex items-center gap-1">
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
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized ? (
          <CardContent className="p-4 space-y-4">
            {/* Authentication Check */}
            {!user && !loading && (
              <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 rounded-lg p-4 border border-destructive/20">
                <div className="flex items-start gap-3 mb-2">
                  <LogIn className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive">Sign In Required</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      You need to sign in to use the voice assistant.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.href = '/auth'}
                      className="mt-2 border-destructive/20 text-destructive hover:bg-destructive/10"
                    >
                      Sign In
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            {user && showWelcome && conversation.length === 0 && (
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-primary">Welcome to Aura! 👋</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowWelcome(false)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Your AI voice assistant is ready to chat! Aura can have natural conversations using voice or text.
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• <strong>Click "Call"</strong> to start a voice conversation</p>
                  <p>• <strong>Speak naturally</strong> - Aura will listen and respond</p>
                  <p>• <strong>End the call</strong> anytime by clicking "End Talk"</p>
                </div>
              </div>
            )}

            {/* Status Indicator with Enhanced Visual Feedback */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-4 h-4 rounded-full bg-current ${getStatusColor(voiceStatus)} ${
                    voiceStatus !== "idle" ? "animate-pulse" : ""
                  }`}></div>
                  {voiceStatus !== "idle" && (
                    <div className={`absolute inset-0 w-4 h-4 rounded-full bg-current ${getStatusColor(voiceStatus)} animate-ping opacity-75`}></div>
                  )}
                </div>
                <span className={`text-sm font-medium ${getStatusColor(voiceStatus)}`}>
                  {getStatusText(voiceStatus)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                Aura AI
              </Badge>
            </div>

            {/* Waveform Visualization */}
            <div className="bg-muted/30 rounded-lg p-4 min-h-[80px] flex items-center justify-center">
              {voiceStatus === "listening" && (
                <div className="flex items-center justify-center gap-1">
                  {waveformBars.map((_, index) => (
                    <div
                      key={index}
                      className="w-1 bg-voice-listening rounded-full animate-wave-listening"
                      style={{ 
                        height: '8px',
                        animationDelay: `${index * 0.1}s`,
                        animationDuration: '0.6s'
                      }}
                    ></div>
                  ))}
                </div>
              )}
              
              {voiceStatus === "thinking" && (
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-voice-thinking border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {voiceStatus === "responding" && (
                <div className="flex items-center justify-center gap-1">
                  {waveformBars.map((_, index) => (
                    <div
                      key={index}
                      className="w-1 bg-voice-speaking rounded-full animate-pulse"
                      style={{ 
                        height: `${12 + (index % 3) * 4}px`,
                        animationDelay: `${index * 0.15}s`
                      }}
                    ></div>
                  ))}
                </div>
              )}

              {voiceStatus === "connecting" && (
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {voiceStatus === "error" && (
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                  <p className="text-xs text-destructive px-2">
                    {status.error || 'Connection error - please check your backend deployment'}
                  </p>
                </div>
              )}
              
              {currentTranscript && (
                <p className="text-sm text-center text-muted-foreground px-2">
                  "{currentTranscript}"
                </p>
              )}
              
              {voiceStatus === "idle" && (
                <p className="text-sm text-center text-muted-foreground">
                  Ready for conversation
                </p>
              )}
            </div>

            {/* Conversation Trail */}
            {conversation.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>Conversation</span>
                </div>
                {conversation.slice(-3).map((message) => (
                  <div
                    key={message.id}
                    className={`text-xs p-2 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-secondary text-secondary-foreground ml-4' 
                        : 'bg-primary/10 text-primary mr-4'
                    }`}
                  >
                    <span className="font-medium">
                      {message.type === 'user' ? 'You: ' : 'Aura: '}
                    </span>
                    {message.content}
                  </div>
                ))}
              </div>
            )}

            {/* Talk Mode Control */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={isTalkModeActive ? "default" : "outline"}
                size="lg"
                onClick={handleTalkModeToggle}
                disabled={!user || !isInitialized || voiceStatus === 'connecting'}
                className={`flex-1 ${
                  isTalkModeActive 
                    ? `gradient-primary text-primary-foreground shadow-lg ${getStatusGlow(voiceStatus)}` 
                    : ""
                } transition-all duration-300`}
              >
                {!user ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In to Use
                  </>
                ) : voiceStatus === 'connecting' ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : isTalkModeActive ? (
                  <>
                    <PhoneOff className="w-4 h-4 mr-2" />
                    End Talk
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    {status.isConnected ? 'Start Talking' : 'Call'}
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsMuted(!isMuted)}
                disabled={!user || !isTalkModeActive}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-center">
              <div className={`text-xs ${getStatusColor(voiceStatus)}`}>
                {getStatusText(voiceStatus)}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}