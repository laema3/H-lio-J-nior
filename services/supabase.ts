
import { createClient } from '@supabase/supabase-js';

const getCredentials = () => {
  const localUrl = localStorage.getItem('supabase_url_manual');
  const localKey = localStorage.getItem('supabase_key_manual');
  
  return {
    url: process.env.SUPABASE_URL || localUrl || '',
    key: process.env.SUPABASE_ANON_KEY || localKey || ''
  };
};

const isValidUrl = (u: string) => u && u.startsWith('https://') && u.includes('.supabase.co');
const isValidKey = (k: string) => k && k.length > 20;

let { url, key } = getCredentials();
export let supabase = (isValidUrl(url) && isValidKey(key)) ? createClient(url, key) : null;

export const isSupabaseReady = () => !!supabase;

export const reinitializeSupabase = (newUrl: string, newKey: string) => {
  if (isValidUrl(newUrl) && isValidKey(newKey)) {
    localStorage.setItem('supabase_url_manual', newUrl);
    localStorage.setItem('supabase_key_manual', newKey);
    url = newUrl;
    key = newKey;
    supabase = createClient(newUrl, newKey);
    return true;
  }
  return false;
};

export const db = {
  async getDiagnostic() {
    const { url: currentUrl, key: currentKey } = getCredentials();
    
    const checks = {
      urlValid: isValidUrl(currentUrl),
      keyValid: isValidKey(currentKey),
      tableConfig: false,
      tableProfiles: false,
      tablePosts: false,
      connection: false
    };

    if (!supabase || !checks.urlValid || !checks.keyValid) return checks;

    try {
      // Teste individual para identificar qual tabela falta
      const confRes = await supabase.from('site_config').select('id').limit(1);
      checks.tableConfig = !confRes.error;

      const profRes = await supabase.from('profiles').select('id').limit(1);
      checks.tableProfiles = !profRes.error;

      const postRes = await supabase.from('posts').select('id').limit(1);
      checks.tablePosts = !postRes.error;

      checks.connection = checks.tableConfig && checks.tableProfiles && checks.tablePosts;
    } catch (e) {
      console.error("Erro no diagnóstico:", e);
    }

    return checks;
  },

  async testConnection() {
    const logs: string[] = [];
    const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
      const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '🔹';
      logs.push(`${emoji} ${msg}`);
    };

    const diag = await this.getDiagnostic();
    
    if (!diag.urlValid) addLog("A URL do projeto está vazia ou no formato errado.", "error");
    else addLog("URL do projeto configurada corretamente.", "success");

    if (!diag.keyValid) addLog("A Chave API (Anon Key) está vazia ou é muito curta.", "error");
    else addLog("Chave API detectada.", "success");

    if (diag.urlValid && diag.keyValid) {
      if (diag.tableConfig) addLog("Conexão com 'site_config' estabelecida.", "success");
      else addLog("Tabela 'site_config' não encontrada no banco.", "error");

      if (diag.tableProfiles) addLog("Conexão com 'profiles' estabelecida.", "success");
      else addLog("Tabela 'profiles' não encontrada no banco.", "error");

      if (diag.tablePosts) addLog("Conexão com 'posts' estabelecida.", "success");
      else addLog("Tabela 'posts' não encontrada no banco.", "error");
    }

    return { success: diag.connection, logs };
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
    const { data, error } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
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
