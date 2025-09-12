import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Settings, AlertTriangle } from 'lucide-react';
import { getAuraConfig } from '@/config/aura';

interface BackendStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function BackendStatus({ className, showDetails = false }: BackendStatusProps) {
  const [config, setConfig] = useState(getAuraConfig());

  useEffect(() => {
    const updateConfig = () => setConfig(getAuraConfig());
    window.addEventListener('aura-config-changed', updateConfig);
    return () => window.removeEventListener('aura-config-changed', updateConfig);
  }, []);

  const getDomainName = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Backend:</span>
        <Badge variant={config.isNgrok ? "secondary" : "default"}>
          {getDomainName(config.backendUrl)}
        </Badge>
        {config.isNgrok && (
          <div title="Using ngrok tunnel">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </div>
        )}
      </div>
      
      {showDetails && (
        <div className="mt-2 text-xs text-muted-foreground">
          <div>HTTPS: {config.backendUrl}</div>
          <div>WebSocket: {config.wsUrl}/ws/voice/continuous</div>
        </div>
      )}
    </div>
  );
}