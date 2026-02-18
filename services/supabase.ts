
import { createClient } from '@supabase/supabase-js';

const getCredentials = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  return {
    url: (localStorage.getItem('supabase_url_manual') || "").trim(),
    key: (localStorage.getItem('supabase_key_manual') || "").trim()
  };
};

const isValidUrl = (u: string) => u && u.startsWith('https://') && u.includes('.supabase.co');
const isValidKey = (k: string) => k && k.length > 20;

export const createSupabaseClient = () => {
  const { url, key } = getCredentials();
  if (isValidUrl(url) && isValidKey(key)) {
    try {
      return createClient(url, key, {
        auth: { persistSession: true },
        global: { headers: { 'x-application-name': 'helio-junior-portal' } }
      });
    } catch (e) {
      console.error("Erro ao criar cliente Supabase:", e);
      return null;
    }
  }
  return null;
};

export let supabase = createSupabaseClient();

export const isSupabaseReady = () => !!supabase;

export const reinitializeSupabase = (newUrl: string, newKey: string) => {
  localStorage.setItem('supabase_url_manual', newUrl.trim());
  localStorage.setItem('supabase_key_manual', newKey.trim());
  supabase = createSupabaseClient();
  return !!supabase;
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('supabase_url_manual');
  localStorage.removeItem('supabase_key_manual');
  window.location.reload();
};

export const db = {
  async testConnection() {
    const logs: string[] = [];
    const { url, key } = getCredentials();
    
    logs.push(`[${new Date().toLocaleTimeString()}] 🔍 Iniciando Diagnóstico de Conexão...`);
    
    if (!url) logs.push("❌ ERRO: Nenhuma URL do Supabase encontrada no sistema.");
    if (!key) logs.push("❌ ERRO: Nenhuma API Key (Anon Key) encontrada.");
    
    if (!url || !key) {
      logs.push("💡 Dica: Vá no painel do Supabase > Project Settings > API e copie os dados.");
      return { success: false, logs };
    }

    try {
      logs.push(`📡 Conectando ao endpoint: ${url.substring(0, 25)}...`);
      const tempClient = createClient(url, key);
      
      // Teste de Handshake real
      const start = Date.now();
      const { data, error, status, statusText } = await tempClient.from('site_config').select('id').limit(1);
      const duration = Date.now() - start;

      if (error) {
        logs.push(`❌ RESPOSTA DA API: Erro ${status} (${error.code})`);
        logs.push(`📝 Mensagem: ${error.message}`);
        
        if (status === 401 || status === 403) {
          logs.push("🔑 CAUSA PROVÁVEL: Sua API Key (Anon Key) está incorreta.");
        } else if (status === 404) {
          logs.push("🌐 CAUSA PROVÁVEL: A URL do projeto está errada ou o projeto foi pausado.");
        } else if (status === 0) {
          logs.push("🛡️ CAUSA PROVÁVEL: Bloqueio de Rede (CORS) ou a URL não existe.");
        } else if (error.code === '42P01') {
          logs.push("✅ CONEXÃO OK! Porém, a tabela 'site_config' não foi encontrada. O banco está vazio.");
          return { success: true, logs };
        }
        return { success: false, logs };
      }

      logs.push(`✅ SUCESSO! Conexão estável em ${duration}ms.`);
      logs.push(`🌍 Status: ${status} - ${statusText || 'OK'}`);
      return { success: true, logs };
    } catch (e: any) {
      logs.push(`💥 ERRO CRÍTICO NO NAVEGADOR: ${e.message}`);
      return { success: false, logs };
    }
  },

  async getConfig() {
    if (!supabase) return null;
    try {
      const { data } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
      return data;
    } catch { return null; }
  },
  async updateConfig(config: any) {
    if (!supabase) return;
    const { id, updated_at, ...clean } = config;
    await supabase.from('site_config').upsert({ id: 1, ...clean });
  },
  async getUsers() {
    if (!supabase) return [];
    try {
      const { data } = await supabase.from('profiles').select('*').order('createdAt', { ascending: false });
      return data || [];
    } catch { return []; }
  },
  async updateUser(user: any) {
    if (!supabase) return;
    await supabase.from('profiles').upsert(user);
  },
  async deleteUser(id: string) {
    if (!supabase) return;
    await supabase.from('profiles').delete().eq('id', id);
  },
  async findUserByEmail(email: string) {
    if (!supabase) return null;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
      return data;
    } catch { return null; }
  },
  async getPosts() {
    if (!supabase) return [];
    try {
      const { data } = await supabase.from('posts').select('*').order('createdAt', { ascending: false });
      return data || [];
    } catch { return []; }
  },
  async addPost(post: any) {
    if (!supabase) return;
    await supabase.from('posts').insert(post);
  },
  async updatePost(post: any) {
    if (!supabase) return;
    const { id, ...data } = post;
    await supabase.from('posts').update(data).eq('id', id);
  },
  async deletePost(id: string) {
    if (!supabase) return;
    await supabase.from('posts').delete().eq('id', id);
  },
  async getCategories() {
    if (!supabase) return null;
    try {
      const { data } = await supabase.from('categories').select('name');
      return data ? data.map(c => c.name) : null;
    } catch { return null; }
  },
  async saveCategories(categories: string[]) {
    if (!supabase) return;
    try {
      await supabase.from('categories').delete().neq('name', '___');
      await supabase.from('categories').insert(categories.map(name => ({ name })));
    } catch {}
  }
};
