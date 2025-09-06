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
    const initializeConnection = async () => {
      try {
        await auraAPI.connect();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Aura connection:', error);
      }
    };

    initializeConnection();

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
      await auraAPI.connect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
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
    reconnect
  };
};