// Aura Backend Configuration
// Allows runtime configuration of backend URL

export interface AuraConfig {
  backendUrl: string;
  wsUrl: string;
  isNgrok: boolean;
}

const DEFAULT_BACKEND_URL = 'https://iaura.ai';

/**
 * Get the configured backend URL from various sources:
 * 1. URL parameter (?backend=https://example.com)
 * 2. localStorage setting
 * 3. Default production URL
 */
export function getBackendUrl(): string {
  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const urlBackend = urlParams.get('backend');
  if (urlBackend) {
    localStorage.setItem('aura_backend_url', urlBackend);
    return urlBackend;
  }

  // Check localStorage
  const storedBackend = localStorage.getItem('aura_backend_url');
  if (storedBackend) {
    return storedBackend;
  }

  // Return default
  return DEFAULT_BACKEND_URL;
}

/**
 * Set the backend URL and store it in localStorage
 */
export function setBackendUrl(url: string): void {
  localStorage.setItem('aura_backend_url', url);
  window.dispatchEvent(new CustomEvent('aura-config-changed'));
}

/**
 * Get complete Aura configuration
 */
export function getAuraConfig(): AuraConfig {
  const backendUrl = getBackendUrl();
  const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  const isNgrok = backendUrl.includes('ngrok') || backendUrl.includes('ngrok-free.app');

  return {
    backendUrl,
    wsUrl,
    isNgrok
  };
}

/**
 * Generate a demo JWT token for testing
 * Note: This is insecure for production - tokens should be issued by the backend
 */
export async function generateDemoToken(): Promise<string> {
  // For now, return a simple demo token without client-side signing
  // This should be replaced with proper backend authentication
  const payload = {
    user_id: 'demo_user_123',
    tenant_id: 'demo_tenant_123',
    role: 'user',
    organization: 'Demo Organization',
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days from now
  };
  
  // Return base64 encoded payload for testing (NOT secure for production)
  return btoa(JSON.stringify(payload));
}

/**
 * Test if the backend HTTPS endpoint is reachable
 */
export async function testHttpsReachability(backendUrl: string): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    const response = await fetch(backendUrl, { 
      method: 'GET',
      mode: 'no-cors' // Avoid CORS issues for basic reachability test
    });
    
    return {
      success: true,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}