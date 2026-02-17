
import { createClient } from '@supabase/supabase-js';

const getCredentials = () => {
  const localUrl = localStorage.getItem('supabase_url_manual');
  const localKey = localStorage.getItem('supabase_key_manual');
  
  return {
    url: (localUrl || process.env.SUPABASE_URL || '').trim(),
    key: (localKey || process.env.SUPABASE_ANON_KEY || '').trim()
  };
};

const isValidUrl = (u: string) => u && u.startsWith('https://') && u.includes('.supabase.co');
const isValidKey = (k: string) => k && k.length > 20;

let { url, key } = getCredentials();
export let supabase = (isValidUrl(url) && isValidKey(key)) ? createClient(url, key, {
  auth: { persistSession: true },
  global: { headers: { 'x-application-name': 'helio-junior-portal' } }
}) : null;

export const isSupabaseReady = () => !!supabase;

export const reinitializeSupabase = (newUrl: string, newKey: string) => {
  const u = newUrl.trim();
  const k = newKey.trim();
  if (isValidUrl(u) && isValidKey(k)) {
    localStorage.setItem('supabase_url_manual', u);
    localStorage.setItem('supabase_key_manual', k);
    // Pequeno delay para garantir gravação síncrona em alguns browsers antes do reload
    setTimeout(() => {
        window.location.reload();
    }, 100);
    return true;
  }
  return false;
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('supabase_url_manual');
  localStorage.removeItem('supabase_key_manual');
  window.location.reload();
};

export const db = {
  async testConnection() {
    const logs: string[] = [];
    const { url: currentUrl, key: currentKey } = getCredentials();

    if (!isValidUrl(currentUrl)) {
      logs.push("❌ Erro: URL do Supabase está vazia ou no formato incorreto.");
      return { success: false, logs };
    }
    if (!isValidKey(currentKey)) {
      logs.push("❌ Erro: A Anon Key (chave) está vazia ou é curta demais.");
      return { success: false, logs };
    }

    logs.push("⏳ Tentando conectar ao projeto...");

    try {
      if (!supabase) throw new Error("Cliente Supabase não inicializado.");

      // Teste de conexão básico consultando uma tabela que deve existir
      const { data, error } = await supabase.from('site_config').select('id').limit(1);

      if (error) {
        if (error.message.includes("project not found") || error.message.includes("Invalid API key") || error.code === 'PGRST301') {
          logs.push("❌ Erro Crítico: Acesso negado ao projeto.");
          logs.push("👉 Verifique se a URL e a KEY estão corretas e se o projeto não está PAUSADO no site do Supabase.");
          return { success: false, logs };
        }
        
        if (error.code === '42P01') {
          logs.push("⚠️ Aviso: Conectado, mas a tabela 'site_config' não existe.");
          logs.push("👉 Você precisa rodar o script SQL no painel do Supabase.");
          return { success: false, logs };
        }

        logs.push(`⚠️ Erro do Supabase: ${error.message} (Código: ${error.code})`);
        return { success: false, logs };
      }

      logs.push("✅ Conexão estabelecida com sucesso!");
      logs.push("✅ Tabelas detectadas e acessíveis.");
      return { success: true, logs };

    } catch (e: any) {
      logs.push(`❌ Erro Inesperado: ${e.message}`);
      return { success: false, logs };
    }
  },

  async getConfig() {
    if (!supabase) return null;
    const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
    return error ? null : data;
  },
  async updateConfig(config: any) {
    if (!supabase) return;
    const { id, updated_at, ...cleanConfig } = config;
    await supabase.from('site_config').upsert({ id: 1, ...cleanConfig });
  },
  async getUsers() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('profiles').select('*');
    return error ? [] : data;
  },
  async updateUser(user: any) {
    if (!supabase) return;
    await supabase.from('profiles').upsert(user);
  },
  async findUserByEmail(email: string) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
    return error ? null : data;
  },
  async getPosts() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select('*').order('createdAt', { ascending: false });
    return error ? [] : data;
  },
  async addPost(post: any) {
    if (!supabase) return;
    await supabase.from('posts').insert(post);
  },
  async deletePost(id: string) {
    if (!supabase) return;
    await supabase.from('posts').delete().eq('id', id);
  },
  async getCategories() {
    if (!supabase) return null;
    const { data, error } = await supabase.from('categories').select('name');
    return (error || !data) ? null : data.map(c => c.name);
  },
  async saveCategories(categories: string[]) {
    if (!supabase) return;
    await supabase.from('categories').delete().neq('name', '___');
    await supabase.from('categories').insert(categories.map(name => ({ name })));
  }
};
