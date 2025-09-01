import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Mic, 
  MessageSquare, 
  Brain, 
  Zap, 
  Shield, 
  Globe,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">A</span>
            </div>
            <span className="font-bold text-xl">Aura</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/train">
              <Button variant="outline" size="sm">
                Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 animate-float">
              <Sparkles className="w-3 h-3 mr-1" />
              Powered by Advanced AI
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Meet{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Aura
              </span>
              <br />
              Your Voice AI Assistant
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience natural conversations with AI through voice. Aura understands context, 
              responds intelligently, and learns from every interaction to provide better assistance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="gradient-primary text-primary-foreground px-8 py-6 text-lg transition-bounce hover:scale-105"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Talking
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
                <MessageSquare className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 gradient-primary rounded-full opacity-10 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 gradient-voice rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose Aura?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of AI interaction with voice-first technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-smooth">
              <CardHeader>
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle>Natural Voice Interaction</CardTitle>
                <CardDescription>
                  Speak naturally and get instant, intelligent responses. No typing required.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-smooth">
              <CardHeader>
                <div className="w-16 h-16 gradient-thinking rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle>Context-Aware Intelligence</CardTitle>
                <CardDescription>
                  Aura remembers your conversation context and provides relevant, thoughtful responses.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-smooth">
              <CardHeader>
                <div className="w-16 h-16 gradient-voice rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  Get instant responses with real-time voice processing and minimal latency.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-smooth">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <CardTitle>Privacy First</CardTitle>
                <CardDescription>
                  Your conversations are processed securely with enterprise-grade encryption.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-smooth">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <CardTitle>Always Available</CardTitle>
                <CardDescription>
                  Access Aura from anywhere, anytime. Cross-platform support for all devices.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-smooth">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <CardTitle>Continuously Learning</CardTitle>
                <CardDescription>
                  Aura improves over time, learning from interactions to serve you better.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="gradient-primary text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Experience Voice AI?
              </h3>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of users who have already transformed their AI interaction experience with Aura's natural voice interface.
              </p>
              <Button size="lg" variant="secondary" className="px-8 py-6 text-lg">
                <Mic className="w-5 h-5 mr-2" />
                Get Started Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <span className="font-semibold">Aura AI Assistant</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Aura. Powered by advanced voice AI technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}