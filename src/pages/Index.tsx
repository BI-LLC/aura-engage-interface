import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Mic, Brain, Zap, ArrowRight, TestTube } from "lucide-react";
import { testBackendConnection, testCORS } from '@/utils/backend-test';

export default function Index() {
  const [backendStatus, setBackendStatus] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  
  const handleTestBackend = async () => {
    setTesting(true);
    console.log('🔍 Testing DigitalOcean backend...');
    try {
      const health = await testBackendConnection();
      const cors = await testCORS();
      setBackendStatus({ health, cors, timestamp: new Date().toISOString() });
      console.log('Backend Test Results:', { health, cors });
    } catch (error) {
      console.error('Test failed:', error);
      setBackendStatus({ error: error.message });
    } finally {
      setTesting(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">A</span>
            </div>
            <span className="font-bold text-xl">Aura</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestBackend}
              disabled={testing}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {testing ? 'Testing...' : 'Test Backend'}
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/train">
              <Button variant="outline" size="sm">Admin</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Meet{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Aura
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Your voice AI assistant for natural conversations and intelligent responses.
            </p>

            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-primary-foreground px-8">
                <Mic className="w-5 h-5 mr-2" />
                Train Your Aura
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center border-0 shadow-none">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">Natural Voice</CardTitle>
                <CardDescription>
                  Speak naturally, get intelligent responses instantly.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-0 shadow-none">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 gradient-thinking rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">Context Aware</CardTitle>
                <CardDescription>
                  Remembers context for meaningful conversations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-0 shadow-none">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 gradient-voice rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">Lightning Fast</CardTitle>
                <CardDescription>
                  Real-time processing with minimal latency.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Backend Status Display */}
      {backendStatus && (
        <section className="container py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                DigitalOcean Backend Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Health Check (https://api.iaura.ai/health):</h4>
                  <pre className="text-sm bg-muted p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(backendStatus.health, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium">CORS Test:</h4>
                  <pre className="text-sm bg-muted p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(backendStatus.cors, null, 2)}
                  </pre>
                </div>
                {backendStatus.error && (
                  <div>
                    <h4 className="font-medium text-destructive">Error:</h4>
                    <p className="text-sm text-destructive mt-1">{backendStatus.error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container">
          <div className="flex justify-center items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <span className="font-medium">Aura</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}