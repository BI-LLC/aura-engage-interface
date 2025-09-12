import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TestTube2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { auraAPI } from '@/services/aura-api';
import { useToast } from '@/hooks/use-toast';

interface ConnectionDiagnosticsProps {
  className?: string;
}

export default function ConnectionDiagnostics({ className }: ConnectionDiagnosticsProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  const diagnostics = auraAPI.getDiagnostics();

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
    const diagnosticsText = JSON.stringify({ diagnostics, testResults }, null, 2);
    navigator.clipboard.writeText(diagnosticsText);
    toast({
      title: "Diagnostics Copied",
      description: "Diagnostic information copied to clipboard",
    });
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
        {/* Backend URL */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Backend URL</span>
            {diagnostics.isNgrok && (
              <Badge variant="secondary">ngrok tunnel</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 bg-muted rounded text-xs break-all">
              {diagnostics.backendUrl}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(diagnostics.backendUrl.replace('wss://', 'https://'), '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
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
              <li>Check if your Digital Ocean backend server is running</li>
              <li>Verify the backend URL is accessible via HTTPS</li>
              <li>Ensure WebSocket endpoint `/ws/voice/continuous` is available</li>
              <li>Check browser console for WebSocket error details</li>
              <li>Verify SSL certificate is valid for secure WebSocket connections</li>
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