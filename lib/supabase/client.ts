import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

// Keep static generation from crashing when a local build does not load the
// project environment file. Vercel/v0 replaces these with the real values.
const runtimeUrl = supabaseUrl ?? 'https://placeholder.supabase.co';
const runtimeKey = supabaseAnonKey ?? 'placeholder-anon-key';

export const supabase = createClient(runtimeUrl, runtimeKey);
