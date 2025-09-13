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
 * Exchange Supabase token for backend JWT token
 * Sends the user's Supabase JWT to backend for validation and gets proper backend token
 */
export async function exchangeSupabaseToken(supabaseToken: string): Promise<string> {
  const config = getAuraConfig();
  
  try {
    const response = await fetch(`${config.backendUrl}/api/auth/exchange-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseToken}`
      },
      body: JSON.stringify({
        supabase_token: supabaseToken
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    return data.backend_token || data.token;
  } catch (error) {
    console.error('Token exchange failed:', error);
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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