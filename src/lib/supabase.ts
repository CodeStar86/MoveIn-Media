import { createClient } from "@supabase/supabase-js"

// Supabase publishable credentials are intentionally public client configuration.
// Environment variables can override these values per deployment, while the
// production defaults prevent the app from failing before React can mount.
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ||
  "https://jmsynpiuekvacnzwmuhy.supabase.co"

export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  "sb_publishable_HvV28mL81bCOHrTLSyEECQ_pL4UsXWp"

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
