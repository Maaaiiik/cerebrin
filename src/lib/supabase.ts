import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

// Client for client-side usage (public)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side usage (service role)
// ONLY use this in server components or API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
