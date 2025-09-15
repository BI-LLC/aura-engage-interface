import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rmqohckqlpkwtpzqimxk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcW9oY2txbHBrd3RwenFpbXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Mjc5NjUsImV4cCI6MjA3MjMwMzk2NX0.rmVQ2tFrQQ1f3llsuhxDMGZynxru4UrFWfW-prNgFKM";

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