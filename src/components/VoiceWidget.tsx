import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX, 
  Play,
  Pause,
  Minimize2,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoiceWidgetProps {
  className?: string;
}

export default function VoiceWidget({ className }: VoiceWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [volume, setVolume] = useState(80);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleMicToggle = () => {
    if (voiceStatus === 'listening') {
      setVoiceStatus('thinking');
      // Simulate processing
      setTimeout(() => {
        setVoiceStatus('speaking');
        setResponse("Hi! I'm Aura, your AI assistant. How can I help you today?");
        setTimeout(() => setVoiceStatus('idle'), 3000);
      }, 1500);
    } else {
      setVoiceStatus('listening');
      setTranscript("Listening...");
    }
  };

  const handleCallToggle = () => {
    setIsCallActive(!isCallActive);
    if (!isCallActive) {
      setVoiceStatus('listening');
    } else {
      setVoiceStatus('idle');
      setTranscript("");
      setResponse("");
    }
  };

  const getStatusIndicator = () => {
    switch (voiceStatus) {
      case 'listening':
        return (
          <div className="flex items-center gap-1">
            <div className="w-1 bg-voice-listening rounded-full animate-wave-listening"></div>
            <div className="w-1 bg-voice-listening rounded-full animate-wave-listening" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 bg-voice-listening rounded-full animate-wave-listening" style={{ animationDelay: '0.2s' }}></div>
          </div>
        );
      case 'thinking':
        return (
          <div className="w-4 h-4 rounded-full voice-thinking"></div>
        );
      case 'speaking':
        return (
          <div className="w-4 h-4 rounded-full voice-speaking"></div>
        );
      default:
        return (
          <div className="w-4 h-4 rounded-full bg-muted"></div>
        );
    }
  };

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="gradient-primary text-primary-foreground rounded-full w-16 h-16 floating-shadow animate-float hover:scale-110 transition-smooth"
        >
          <Mic className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <Card className="w-96 max-w-[calc(100vw-3rem)] floating-shadow">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Aura</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {getStatusIndicator()}
                  <span className="capitalize">{voiceStatus}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Transcript Area */}
          {(transcript || response) && (
            <div className="mb-4 space-y-2">
              {transcript && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">You said:</p>
                  <p className="text-sm">{transcript}</p>
                </div>
              )}
              {response && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-primary font-medium">Aura:</p>
                    <Button variant="ghost" size="sm">
                      <Play className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm">{response}</p>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mic Button */}
              <Button
                variant={voiceStatus === 'listening' ? "default" : "outline"}
                size="sm"
                onClick={handleMicToggle}
                disabled={isCallActive}
                className={cn(
                  "transition-smooth",
                  voiceStatus === 'listening' && "voice-listening border-0"
                )}
              >
                {voiceStatus === 'listening' ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>

              {/* Call Button */}
              <Button
                variant={isCallActive ? "destructive" : "outline"}
                size="sm"
                onClick={handleCallToggle}
                className="transition-smooth"
              >
                {isCallActive ? (
                  <PhoneOff className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
              </Button>

              {/* Mute Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className={cn("transition-smooth", isMuted && "text-muted-foreground")}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Status Text */}
            <div className="text-xs text-muted-foreground">
              {isCallActive ? "In Call" : "Ready"}
            </div>
          </div>

          {/* Volume Control */}
          {!isMuted && (
            <div className="mt-4 flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <span className="text-xs text-muted-foreground w-8">{volume}%</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}