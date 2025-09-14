import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSupabaseSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting Supabase session:', error);
    throw new Error('Failed to get authentication session');
  }
  return session;
};

export const getSupabaseToken = async () => {
  const session = await getSupabaseSession();
  if (!session?.access_token) {
    throw new Error('No active Supabase session found. Please log in.');
  }
  return session.access_token;
};