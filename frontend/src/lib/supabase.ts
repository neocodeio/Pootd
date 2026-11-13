import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isUsableUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const protocolOk = url.protocol === 'https:' || (isLocal && url.protocol === 'http:')
    return protocolOk && (isLocal || url.hostname.includes('.'))
  } catch {
    return false
  }
}

export const isSupabaseConfigured = Boolean(
  isUsableUrl(supabaseUrl) &&
    supabaseAnonKey &&
    supabaseAnonKey.length >= 20 &&
    !supabaseUrl?.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-anon'),
)

// createClient throws on a malformed URL, which would white-screen the app
// instead of showing the setup screen. Fall back to a valid placeholder so a
// broken .env always lands on the setup page.
export const supabase = createClient(
  isUsableUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey && supabaseAnonKey.length >= 20
    ? supabaseAnonKey
    : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
