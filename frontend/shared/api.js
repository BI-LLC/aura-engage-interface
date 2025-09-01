// Shared API module for AURA Voice AI
class AuraAPI {
    constructor() {
        this.baseURL = 'http://localhost:8080';
        this.token = localStorage.getItem('aura_token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('aura_token', token);
    }

    // Clear authentication token
    clearToken() {
        this.token = null;
        localStorage.removeItem('aura_token');
    }

    // Get headers for API requests
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: this.getHeaders(),
                ...options
            };

            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.clearToken();
                    window.location.href = '/admin/';
                    throw new Error('Unauthorized - Please login again');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    async login(username, password) {
        const response = await this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ 
                email: username, 
                password: password,
                tenant_subdomain: 'demo'  // Default tenant for testing
            })
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearToken();
        }
    }

    // Document Management
    async uploadDocument(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseURL}/api/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return await response.json();
    }

    async getDocuments() {
        return await this.request('/api/documents');
    }

    async deleteDocument(fileId) {
        return await this.request(`/api/documents/${fileId}`, {
            method: 'DELETE'
        });
    }

    // Voice Call API
    async startVoiceCall(userId) {
        return await this.request('/voice/start', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
    }

    async sendVoiceMessage(audioData, userId) {
        const formData = new FormData();
        formData.append('audio', audioData);
        formData.append('user_id', userId);

        const response = await fetch(`${this.baseURL}/voice/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Voice processing failed: ${response.statusText}`);
        }

        return await response.json();
    }

    // User Management
    async getUsers() {
        return await this.request('/admin/users');
    }

    async getUser(userId) {
        return await this.request(`/admin/users/${userId}`);
    }

    // System Status
    async getSystemStatus() {
        return await this.request('/admin/status');
    }
}

// Create global API instance
window.AuraAPI = new AuraAPI();
