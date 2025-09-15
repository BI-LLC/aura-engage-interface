// Aura Backend Configuration - Production Environment
// Uses hardcoded production URLs from environment variables

export interface AuraConfig {
  backendUrl: string;
  wsUrl: string;
  apiBase: string;
  wsBase: string;
  isNgrok: boolean; // Legacy compatibility
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.iaura.ai/api';
const WS_BASE = import.meta.env.VITE_WS_BASE || 'wss://api.iaura.ai/ws';

// Debug logging
console.log('🔧 Aura Config Debug:');
console.log('  API_BASE:', API_BASE);
console.log('  WS_BASE:', WS_BASE);
console.log('  VITE_API_BASE env:', import.meta.env.VITE_API_BASE);
console.log('  VITE_WS_BASE env:', import.meta.env.VITE_WS_BASE);

/**
 * Get complete Aura configuration for production environment
 */
export function getAuraConfig(): AuraConfig {
  return {
    backendUrl: API_BASE.replace('/api', ''), // Legacy compatibility
    wsUrl: WS_BASE, // Legacy compatibility  
    apiBase: API_BASE,
    wsBase: WS_BASE,
    isNgrok: false // Production environment, not using ngrok
  };
}

/**
 * @deprecated Use new API infrastructure instead
 */
export function setBackendUrl(url: string): void {
  console.warn('setBackendUrl is deprecated - using production URLs only');
}

/**
 * Exchange Supabase token for backend JWT token
 * @deprecated Use getBackendToken from src/lib/api.ts instead
 */
export async function exchangeSupabaseToken(supabaseToken: string): Promise<string> {
  const config = getAuraConfig();
  
  try {
    const response = await fetch(`${config.apiBase}/auth/exchange-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseToken}`
      },
      credentials: 'omit',
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
 * @deprecated Use checkBackendHealth from src/lib/api.ts instead
 */
export async function testHttpsReachability(backendUrl: string): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    const response = await fetch(backendUrl, { 
      method: 'GET',
      credentials: 'omit'
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