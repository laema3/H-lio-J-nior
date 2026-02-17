
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Verifica se a URL é válida e não é o placeholder padrão
const isConfigured = 
  supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('placeholder-project');

let client = null;
if (isConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.warn("Falha ao inicializar Supabase:", e);
  }
}

export const supabase = client;
export const isSupabaseReady = () => !!client;
