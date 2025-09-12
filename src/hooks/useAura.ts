// Custom hook for managing Aura API communication
import { useState, useEffect, useCallback } from 'react';
import { auraAPI, AuraMessage, AuraStatus } from '@/services/aura-api';

export const useAura = () => {
  const [messages, setMessages] = useState<AuraMessage[]>([]);
  const [status, setStatus] = useState<AuraStatus>({ status: 'idle', isConnected: false });
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize connection on mount
  useEffect(() => {
    console.log('useAura hook initializing...');
    
    const initializeConnection = async () => {
      try {
        console.log('Attempting to connect to Aura API...');
        await auraAPI.connect();
        console.log('Aura API connection initialized');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Aura connection:', error);
        setIsInitialized(true); // Still mark as initialized to prevent blocking
      }
    };

    // Don't immediately try to connect, just set up the hook
    setIsInitialized(true);
    console.log('useAura hook setup complete');

    // Set up event listeners
    const handleStatus = (newStatus: AuraStatus) => {
      setStatus(newStatus);
    };

    const handleMessage = (message: AuraMessage) => {
      setMessages(prev => [...prev, message]);
    };

    const handleTranscript = (text: string) => {
      setCurrentTranscript(text);
    };

    auraAPI.on('status', handleStatus);
    auraAPI.on('message', handleMessage);
    auraAPI.on('transcript', handleTranscript);

    // Cleanup on unmount
    return () => {
      auraAPI.off('status', handleStatus);
      auraAPI.off('message', handleMessage);
      auraAPI.off('transcript', handleTranscript);
      auraAPI.disconnect();
    };
  }, []);

  const startListening = useCallback(async () => {
    if (status.isConnected) {
      await auraAPI.startListening();
    }
  }, [status.isConnected]);

  const stopListening = useCallback(() => {
    auraAPI.stopListening();
    setCurrentTranscript('');
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (status.isConnected) {
      auraAPI.sendTextMessage(text);
    }
  }, [status.isConnected]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentTranscript('');
  }, []);

  const reconnect = useCallback(async () => {
    try {
      console.log('🔄 Attempting to reconnect...');
      // Disconnect first to reset connection state
      auraAPI.disconnect();
      await auraAPI.connect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }, []);

  const testConnection = useCallback(async () => {
    try {
      console.log('🧪 Testing connection...');
      return await auraAPI.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message, details: { error } };
    }
  }, []);

  return {
    messages,
    status,
    currentTranscript,
    isInitialized,
    startListening,
    stopListening,
    sendMessage,
    clearConversation,
    reconnect,
    testConnection
  };
};