
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

// O createClient pode lançar erro se a URL não for válida, então protegemos a exportação
let client;
try {
  client = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.warn("Supabase não configurado corretamente. O site funcionará em modo demonstração local.");
  client = null;
}

export const supabase = client;
