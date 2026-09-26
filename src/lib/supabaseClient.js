import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase ayarları eksik. .env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekle (bkz. .env.example).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
