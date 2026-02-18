
import { createClient } from '@supabase/supabase-js';

const getCredentials = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  const url = localStorage.getItem('supabase_url_manual');
  const key = localStorage.getItem('supabase_key_manual');
  return {
    url: (url || "").trim(),
    key: (key || "").trim()
  };
};

const isValidUrl = (u: string) => u && u.startsWith('https://') && u.includes('.supabase.co');
const isValidKey = (k: string) => k && k.length > 20;

// Cliente mutável para permitir reinicialização
export let supabase: any = null;

export const isSupabaseReady = () => {
  if (supabase) return true;
  
  // Tenta recuperar se estiver nulo (Lazy Init)
  const { url, key } = getCredentials();
  if (isValidUrl(url) && isValidKey(key)) {
    try {
      supabase = createClient(url, key, {
        auth: { persistSession: true }
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
};

// Inicialização imediata no carregamento do script
isSupabaseReady();

export const reinitializeSupabase = (newUrl: string, newKey: string) => {
  if (!isValidUrl(newUrl) || !isValidKey(newKey)) return false;
  
  localStorage.setItem('supabase_url_manual', newUrl.trim());
  localStorage.setItem('supabase_key_manual', newKey.trim());
  
  supabase = createClient(newUrl.trim(), newKey.trim(), {
    auth: { persistSession: true }
  });
  
  return true;
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('supabase_url_manual');
  localStorage.removeItem('supabase_key_manual');
  supabase = null;
  window.location.reload();
};

export const db = {
  async testConnection() {
    const logs: string[] = [];
    const { url, key } = getCredentials();
    
    logs.push(`[${new Date().toLocaleTimeString()}] 🛰️ Iniciando teste de handshake...`);
    
    if (!isValidUrl(url) || !isValidKey(key)) {
      logs.push("❌ ERRO: URL ou Key inválidas no armazenamento local.");
      return { success: false, logs };
    }

    try {
      const tempClient = createClient(url, key);
      const { error } = await tempClient.from('profiles').select('id').limit(1);
      
      if (error && error.code !== '42P01') {
        logs.push(`❌ FALHA: ${error.message}`);
        return { success: false, logs };
      }

      logs.push("✅ SUCESSO: O banco de dados respondeu corretamente.");
      if (error?.code === '42P01') logs.push("⚠️ NOTA: A tabela 'profiles' ainda não existe, mas a conexão está OK.");
      
      return { success: true, logs };
    } catch (e: any) {
      logs.push(`💥 ERRO CRÍTICO: ${e.message}`);
      return { success: false, logs };
    }
  },

  async getConfig() {
    if (!isSupabaseReady()) return null;
    try {
      const { data } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
      return data;
    } catch { return null; }
  },

  async updateConfig(config: any) {
    if (!isSupabaseReady()) return;
    const { id, updated_at, ...clean } = config;
    await supabase.from('site_config').upsert({ id: 1, ...clean });
  },

  async getUsers() {
    if (!isSupabaseReady()) return [];
    try {
      const { data } = await supabase.from('profiles').select('*').order('createdAt', { ascending: false });
      return data || [];
    } catch { return []; }
  },

  async updateUser(user: any) {
    if (!isSupabaseReady()) return;
    await supabase.from('profiles').upsert(user);
  },

  async deleteUser(id: string) {
    if (!isSupabaseReady()) return;
    await supabase.from('profiles').delete().eq('id', id);
  },

  async findUserByEmail(email: string) {
    if (!isSupabaseReady()) return null;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
      return data;
    } catch { return null; }
  },

  async getPosts() {
    if (!isSupabaseReady()) return [];
    try {
      const { data } = await supabase.from('posts').select('*').order('createdAt', { ascending: false });
      return data || [];
    } catch { return []; }
  },

  async addPost(post: any) {
    if (!isSupabaseReady()) return;
    await supabase.from('posts').insert(post);
  },

  async updatePost(post: any) {
    if (!isSupabaseReady()) return;
    const { id, ...data } = post;
    await supabase.from('posts').update(data).eq('id', id);
  },

  async deletePost(id: string) {
    if (!isSupabaseReady()) return;
    await supabase.from('posts').delete().eq('id', id);
  },

  async getCategories() {
    if (!isSupabaseReady()) return null;
    try {
      const { data } = await supabase.from('categories').select('name');
      return data ? data.map(c => c.name) : null;
    } catch { return null; }
  },

  async saveCategories(categories: string[]) {
    if (!isSupabaseReady()) return;
    try {
      await supabase.from('categories').delete().neq('name', '___');
      await supabase.from('categories').insert(categories.map(name => ({ name })));
    } catch {}
  }
};
