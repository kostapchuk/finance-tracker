import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not set. Using offline mode. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null

export function isSupabaseConfigured(): boolean {
  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as unknown as { __TEST_SUPABASE_CONFIGURED__?: boolean })
      .__TEST_SUPABASE_CONFIGURED__ === true
  ) {
    return true
  }
  return supabase !== null
}
