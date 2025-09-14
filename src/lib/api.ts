import { getSupabaseToken } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  throw new Error('VITE_API_BASE environment variable is required');
}

let cachedBackendToken: string | null = null;

/**
 * Exchange Supabase token for backend JWT token
 */
export const getBackendToken = async (): Promise<string> => {
  // Return cached token if available
  if (cachedBackendToken) {
    return cachedBackendToken;
  }

  try {
    const supabaseToken = await getSupabaseToken();
    
    console.log('🔄 Exchanging Supabase token for backend JWT...');
    
    // Try different endpoint variations - first try /auth/token/exchange
    console.log('🔄 Trying endpoint: /auth/token/exchange');
    let response = await fetch(`${API_BASE}/auth/token/exchange`, {
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

    // If that fails, try /auth/exchange
    if (!response.ok && response.status === 404) {
      console.log('🔄 Trying endpoint: /auth/exchange');
      response = await fetch(`${API_BASE}/auth/exchange`, {
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
    }

    // If that fails, try /token/exchange
    if (!response.ok && response.status === 404) {
      console.log('🔄 Trying endpoint: /token/exchange');
      response = await fetch(`${API_BASE}/token/exchange`, {
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
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token exchange failed:', response.status, errorText);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const backendToken = data.token || data.backend_token;
    
    if (!backendToken) {
      throw new Error('No token received from backend');
    }
    
    cachedBackendToken = backendToken;
    console.log('✅ Backend token obtained successfully');
    
    return backendToken;
  } catch (error) {
    console.error('❌ Backend token exchange error:', error);
    throw error;
  }
};

/**
 * Clear cached backend token (call on logout or auth errors)
 */
export const clearBackendToken = () => {
  cachedBackendToken = null;
  console.log('🗑️ Backend token cleared');
};

/**
 * Authenticated fetch wrapper that automatically handles backend JWT tokens
 */
export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  
  try {
    const backendToken = await getBackendToken();
    
    const response = await fetch(url, {
      ...init,
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
        'Authorization': `Bearer ${backendToken}`
      }
    });

    // Handle token expiration
    if (response.status === 401 || response.status === 403) {
      console.log('🔄 Token expired, clearing cache and retrying...');
      clearBackendToken();
      
      // Retry once with fresh token
      const newBackendToken = await getBackendToken();
      return fetch(url, {
        ...init,
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
          'Authorization': `Bearer ${newBackendToken}`
        }
      });
    }

    return response;
  } catch (error) {
    console.error('❌ API fetch error:', error);
    throw error;
  }
};

/**
 * Health check for the backend
 */
export const checkBackendHealth = async (): Promise<{ status: 'ok' | 'error'; message: string }> => {
  try {
    console.log('🏥 Checking backend health...');
    
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      credentials: 'omit'
    });

    if (response.ok) {
      console.log('✅ Backend: OK');
      return { status: 'ok', message: 'Backend is healthy' };
    } else {
      console.log('⚠️ Backend: Unhealthy', response.status);
      return { status: 'error', message: `Backend returned ${response.status}` };
    }
  } catch (error) {
    console.error('❌ Backend: Down', error);
    return { status: 'error', message: `Backend is unreachable: ${error.message}` };
  }
};