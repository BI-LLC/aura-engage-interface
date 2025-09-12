import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TestTube2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Copy,
  ExternalLink,
  Settings,
  Globe
} from 'lucide-react';
import { auraAPI } from '@/services/aura-api';
import { useToast } from '@/hooks/use-toast';
import { getAuraConfig, setBackendUrl } from '@/config/aura';

interface ConnectionDiagnosticsProps {
  className?: string;
}

export default function ConnectionDiagnostics({ className }: ConnectionDiagnosticsProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [newBackendUrl, setNewBackendUrl] = useState('');
  const [config, setConfig] = useState(getAuraConfig());
  const { toast } = useToast();

  const diagnostics = auraAPI.getDiagnostics();

  // Update config when it changes
  useEffect(() => {
    const updateConfig = () => setConfig(getAuraConfig());
    window.addEventListener('aura-config-changed', updateConfig);
    return () => window.removeEventListener('aura-config-changed', updateConfig);
  }, []);

  useEffect(() => {
    setNewBackendUrl(config.backendUrl);
  }, [config.backendUrl]);

  const runConnectionTest = async () => {
    setIsTestingConnection(true);
    try {
      console.log('🚀 Starting connection test...');
      const results = await auraAPI.testConnection();
      setTestResults(results);
      
      if (results.success) {
        toast({
          title: "Connection Test Passed ✅",
          description: "WebSocket connection is working",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Connection Test Failed ❌",
          description: results.error || "Unknown error",
        });
      }
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({
        success: false,
        error: error.message,
        details: { error }
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const copyDiagnostics = () => {
    const diagnosticsText = JSON.stringify({ diagnostics, testResults, config }, null, 2);
    navigator.clipboard.writeText(diagnosticsText);
    toast({
      title: "Diagnostics Copied",
      description: "Diagnostic information copied to clipboard",
    });
  };

  const updateBackendUrl = () => {
    try {
      new URL(newBackendUrl); // Validate URL
      setBackendUrl(newBackendUrl);
      setShowConfig(false);
      toast({
        title: "Backend URL Updated",
        description: "Backend configuration has been updated",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com)",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-500';
      case 'CONNECTING': return 'bg-yellow-500';
      case 'CLOSING': case 'CLOSED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube2 className="w-5 h-5" />
          Connection Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Backend Configuration */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Backend Configuration</span>
            <div className="flex items-center gap-2">
              {config.isNgrok && (
                <Badge variant="secondary">ngrok tunnel</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {showConfig && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
              <Label htmlFor="backend-url" className="text-xs">Backend URL</Label>
              <div className="flex gap-2">
                <Input
                  id="backend-url"
                  value={newBackendUrl}
                  onChange={(e) => setNewBackendUrl(e.target.value)}
                  placeholder="https://your-backend.com"
                  className="text-xs"
                />
                <Button size="sm" onClick={updateBackendUrl}>
                  Update
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You can also use URL parameter: ?backend=https://your-backend.com
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 px-2 py-1 bg-muted rounded text-xs break-all">
              {config.backendUrl}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(config.backendUrl, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="mt-1">
            <code className="px-2 py-1 bg-muted rounded text-xs break-all text-muted-foreground">
              WebSocket: {config.wsUrl}/ws/voice/continuous
            </code>
          </div>
        </div>

        <Separator />

        {/* Connection Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium">WebSocket State</span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(diagnostics.wsStateText)}`} />
              <span className="text-sm">{diagnostics.wsStateText || 'Not Connected'}</span>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Audio Context</span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${diagnostics.audioContext === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">{diagnostics.audioContext || 'Not initialized'}</span>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div>
          <span className="text-sm font-medium">Current Status</span>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={diagnostics.status.isConnected ? "default" : "destructive"}>
              {diagnostics.status.status}
            </Badge>
            {diagnostics.status.error && (
              <span className="text-xs text-muted-foreground">
                {diagnostics.status.error}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Test Connection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Test</span>
            <Button
              variant="outline"
              size="sm"
              onClick={runConnectionTest}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube2 className="w-3 h-3 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </div>

          {testResults && (
            <div className={`p-3 rounded-lg border ${
              testResults.success 
                ? 'border-green-200 bg-green-50 text-green-800' 
                : 'border-red-200 bg-red-50 text-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {testResults.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {testResults.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
              </div>
              {testResults.error && (
                <p className="text-sm">{testResults.error}</p>
              )}
              {testResults.details && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer">View Details</summary>
                  <pre className="text-xs mt-1 p-2 bg-white/50 rounded overflow-auto">
                    {JSON.stringify(testResults.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Troubleshooting Tips */}
        {(!diagnostics.status.isConnected || (testResults && !testResults.success)) && (
          <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Troubleshooting Tips</span>
            </div>
            <ul className="text-sm text-yellow-700 space-y-1 ml-6 list-disc">
              <li>Check if your backend server is running and accessible</li>
              <li>Verify the backend URL is accessible via HTTPS (test with the link above)</li>
              <li>Ensure WebSocket endpoint `/ws/voice/continuous` is available</li>
              <li>Check browser console for WebSocket error details</li>
              <li>Verify SSL certificate is valid for secure WebSocket connections</li>
              <li>If using ngrok, ensure the tunnel is active and not expired</li>
              <li>Try configuring a different backend URL using the settings above</li>
            </ul>
          </div>
        )}

        <Separator />

        {/* Copy Diagnostics */}
        <Button
          variant="outline"
          size="sm"
          onClick={copyDiagnostics}
          className="w-full"
        >
          <Copy className="w-3 h-3 mr-2" />
          Copy Diagnostics to Clipboard
        </Button>
      </CardContent>
    </Card>
  );
}