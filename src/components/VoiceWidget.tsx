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
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceStatus = "idle" | "listening" | "thinking" | "responding" | "muted";

interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceWidgetProps {
  className?: string;
}

export default function VoiceWidget({ className }: VoiceWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTalkModeActive, setIsTalkModeActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [waveformBars] = useState(Array.from({ length: 5 }, (_, i) => i));

  // Simulate conversation flow
  useEffect(() => {
    if (isTalkModeActive && voiceStatus === "listening") {
      // Simulate user speaking after a delay
      const speakingTimer = setTimeout(() => {
        if (isTalkModeActive) {
          setCurrentTranscript("Hello Aura, how are you today?");
          setVoiceStatus("thinking");
          
          // Simulate AI thinking
          setTimeout(() => {
            if (isTalkModeActive) {
              setVoiceStatus("responding");
              const newMessage: ConversationMessage = {
                id: Date.now().toString(),
                type: 'assistant',
                content: "Hello! I'm doing great, thank you for asking. How can I assist you today?",
                timestamp: new Date()
              };
              
              // Add user message first
              setConversation(prev => [...prev, {
                id: (Date.now() - 1).toString(),
                type: 'user',
                content: currentTranscript,
                timestamp: new Date()
              }, newMessage]);
              
              // Reset to listening after response
              setTimeout(() => {
                if (isTalkModeActive) {
                  setVoiceStatus("listening");
                  setCurrentTranscript("");
                }
              }, 3000);
            }
          }, 2000);
        }
      }, 3000);
      
      return () => clearTimeout(speakingTimer);
    }
  }, [isTalkModeActive, voiceStatus, currentTranscript]);

  const getStatusColor = (status: VoiceStatus) => {
    switch (status) {
      case "listening":
        return "text-emerald-500";
      case "thinking":
        return "text-amber-500";  
      case "responding":
        return "text-purple-500";
      case "muted":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusText = (status: VoiceStatus) => {
    switch (status) {
      case "listening":
        return "Listening...";
      case "thinking":
        return "Thinking...";
      case "responding":
        return "Responding...";
      case "muted":
        return "Muted";
      default:
        return "Ready to talk";
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
      default:
        return "";
    }
  };

  const handleTalkModeToggle = () => {
    setIsTalkModeActive(!isTalkModeActive);
    if (!isTalkModeActive) {
      setVoiceStatus("listening");
    } else {
      setVoiceStatus("idle");
      setCurrentTranscript("");
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
          }`}
        >
          <Phone className="w-6 h-6" />
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
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Aura</h3>
              <p className="text-xs text-muted-foreground">Voice AI Assistant</p>
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
                      className="w-1 bg-emerald-500 rounded-full animate-wave-listening"
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
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {voiceStatus === "responding" && (
                <div className="flex items-center justify-center gap-1">
                  {waveformBars.map((_, index) => (
                    <div
                      key={index}
                      className="w-1 bg-purple-500 rounded-full animate-pulse"
                      style={{ 
                        height: `${12 + (index % 3) * 4}px`,
                        animationDelay: `${index * 0.15}s`
                      }}
                    ></div>
                  ))}
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
                className={`flex-1 ${
                  isTalkModeActive 
                    ? `gradient-primary text-primary-foreground shadow-lg ${getStatusGlow(voiceStatus)}` 
                    : ""
                } transition-all duration-300`}
              >
                {isTalkModeActive ? (
                  <>
                    <PhoneOff className="w-4 h-4 mr-2" />
                    End Talk
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Start Talking
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsMuted(!isMuted)}
                disabled={!isTalkModeActive}
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