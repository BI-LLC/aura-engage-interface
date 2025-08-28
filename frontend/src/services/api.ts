// API service for frontend-backend communication

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add auth token to requests
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
  
  // Chat API methods
  async sendMessage(message: string) {
    const response = await this.client.post('/api/chat', { message });
    return response.data;
  }
  
  async getChatHistory(userId: string, limit = 10) {
    const response = await this.client.get(`/chat/history/${userId}`, {
      params: { limit },
    });
    return response.data;
  }
  
  async getUserContext(userId: string) {
    const response = await this.client.get(`/chat/context/${userId}`);
    return response.data;
  }
  
  // Persona endpoints
  async getPersona(userId: string) {
    const response = await this.client.get(`/admin/persona/${userId}`);
    return response.data;
  }
  
  async updatePersona(userId: string, settings: any) {
    const response = await this.client.put(`/admin/persona/${userId}`, settings);
    return response.data;
  }
  
  // Document/Knowledge base endpoints
  async uploadDocument(file: File, userId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    
    const response = await this.client.post('/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
  
  async getUserDocuments(userId: string) {
    const response = await this.client.get(`/admin/documents/${userId}`);
    return response.data;
  }
  
  async deleteDocument(docId: string, userId: string) {
    const response = await this.client.delete(`/admin/documents/${docId}`, {
      params: { user_id: userId },
    });
    return response.data;
  }
  
  async searchKnowledge(query: string, userId: string, limit = 5) {
    const response = await this.client.get('/admin/search', {
      params: { query, user_id: userId, limit },
    });
    return response.data;
  }
  
  // Voice endpoints
  async transcribeAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const response = await this.client.post('/voice/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
  
  async synthesizeSpeech(text: string, voiceId?: string) {
    const formData = new FormData();
    formData.append('text', text);
    if (voiceId) {
      formData.append('voice_id', voiceId);
    }
    
    const response = await this.client.post('/voice/synthesize', formData);
    return response.data;
  }
  
  async processVoiceMessage(
    audioBlob: Blob,
    userId?: string,
    sessionId?: string
  ) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    if (userId) formData.append('user_id', userId);
    if (sessionId) formData.append('session_id', sessionId);
    formData.append('use_memory', 'true');
    
    const response = await this.client.post('/voice/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
  
  // Memory endpoints
  async getUserPreferences(userId: string) {
    const response = await this.client.get(`/memory/preferences/${userId}`);
    return response.data;
  }
  
  async updateUserPreferences(userId: string, preferences: any) {
    const response = await this.client.put(`/memory/preferences/${userId}`, preferences);
    return response.data;
  }
  
  async exportUserData(userId: string) {
    const response = await this.client.get(`/memory/export/${userId}`);
    return response.data;
  }
  
  async deleteUserData(userId: string) {
    const response = await this.client.delete(`/memory/delete/${userId}`, {
      data: { user_id: userId, confirmation: true },
    });
    return response.data;
  }
  
  // Admin methods
  async getAdminDashboard() {
    const response = await this.client.get('/api/admin/dashboard');
    return response.data;
  }
  
  async getTrainingData(userId: string) {
    const response = await this.client.get(`/admin/training-data/${userId}`);
    return response.data;
  }
  
  async clearCache() {
    const response = await this.client.post('/admin/clear-cache');
    return response.data;
  }
  
  // System methods
  async getHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }
  
  async getStats() {
    const response = await this.client.get('/stats');
    return response.data;
  }
  
  // Streaming endpoints
  async createStreamingChat(message: string, userId?: string) {
    const response = await this.client.post('/stream/chat', {
      message,
      user_id: userId,
      streaming: true,
    });
    return response.data;
  }
  
  // WebSocket connection for voice streaming
  createVoiceWebSocket(userId?: string): WebSocket {
    const wsUrl = API_BASE_URL.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/stream/voice`);
    
    ws.onopen = () => {
      console.log('Voice WebSocket connected');
    };
    
    ws.onerror = (error) => {
      console.error('Voice WebSocket error:', error);
    };
    
    return ws;
  }
}

// Export singleton instance
export const api = new APIService();