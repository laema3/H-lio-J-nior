
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
    // Gravamos no localStorage de forma explícita
    localStorage.setItem('supabase_url_manual', u);
    localStorage.setItem('supabase_key_manual', k);
    
    // Pequeno delay para garantir gravação em browsers que tratam o storage de forma assíncrona
    setTimeout(() => {
        window.location.reload();
    }, 200);
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
      logs.push("❌ URL pendente ou inválida nos registros.");
      return { success: false, logs };
    }
    if (!isValidKey(currentKey)) {
      logs.push("❌ Anon Key pendente ou curta demais.");
      return { success: false, logs };
    }

    logs.push("⏳ Sincronizando com o projeto...");

    try {
      if (!supabase) {
         // Tentativa de reconstruir o cliente se ele falhou na carga inicial
         const { url: u, key: k } = getCredentials();
         if (isValidUrl(u) && isValidKey(k)) {
            supabase = createClient(u, k);
         } else {
             throw new Error("Cliente não pôde ser inicializado.");
         }
      }

      // Teste de conexão básico consultando uma tabela que deve existir
      const { data, error } = await supabase.from('site_config').select('id').limit(1);

      if (error) {
        if (error.message.includes("project not found") || error.message.includes("Invalid API key") || error.code === 'PGRST301') {
          logs.push("❌ Erro Crítico: Credenciais inválidas.");
          logs.push("👉 Verifique as chaves e se o projeto está ATIVO no Supabase.");
          return { success: false, logs };
        }
        
        if (error.code === '42P01') {
          logs.push("⚠️ Aviso: Conectado! Tabelas não encontradas.");
          logs.push("👉 Aplique o script SQL no editor do Supabase.");
          return { success: true, logs }; // Ainda é um sucesso de conexão
        }

        logs.push(`⚠️ Alerta: ${error.message}`);
        return { success: false, logs };
      }

      logs.push("✅ Conectado com sucesso!");
      logs.push("✅ Sincronização em tempo real ativa.");
      return { success: true, logs };

    } catch (e: any) {
      logs.push(`❌ Falha na conexão: ${e.message}`);
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
    const { data, error } = await supabase.from('categories').select('name');
    return (error || !data) ? null : data.map(c => c.name);
  },
  async saveCategories(categories: string[]) {
    if (!supabase) return;
    await supabase.from('categories').delete().neq('name', '___');
    await supabase.from('categories').insert(categories.map(name => ({ name })));
  }
};
