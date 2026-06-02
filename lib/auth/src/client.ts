import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const metaEnv = (import.meta as { env?: Record<string, string> }).env ?? {};
const url = metaEnv.VITE_SUPABASE_URL;
const anonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("@home/auth: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
}

export const supabase: SupabaseClient = createClient(url ?? "", anonKey ?? "");
