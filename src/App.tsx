import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TrainPage from "./pages/TrainPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import VoiceWidget from "./components/VoiceWidget";
import { AuthProvider } from "./contexts/AuthContext";
import { useEffect } from "react";
import { checkBackendHealth } from "./lib/api";

const queryClient = new QueryClient();

const App = () => {
  console.log('App component loading...');
  
  // Health check on app initialization
  useEffect(() => {
    checkBackendHealth().then(({ status, message }) => {
      if (status === 'ok') {
        console.log('✅ Health: OK');
      } else {
        console.log('❌ Health: Error -', message);
      }
    });
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/train" element={<TrainPage />} />
              <Route path="/auth" element={<AuthPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <VoiceWidget />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
