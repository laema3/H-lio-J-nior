
import { createClient } from '@supabase/supabase-js';

// =========================================================
// CONFIGURAÇÕES DO BANCO DE DADOS (SUPABASE)
// Substitua os valores abaixo pelas suas credenciais reais
// =========================================================
const SUPABASE_URL = 'https://yzufoswsajzbovmcwscl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dWZvc3dzYWp6Ym92bWN3c2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzI4MTMsImV4cCI6MjA4NjkwODgxM30.R8pCkQQbe4ezyFyDmQBHanPhjsKJF-qX3KLsyxHHNsM';
// =========================================================

const getCredentials = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  
  // Prioriza as chaves fixas no código
  const url = SUPABASE_URL.includes('supabase.co') ? SUPABASE_URL : (localStorage.getItem('supabase_url_manual') || "");
  const key = SUPABASE_ANON_KEY.length > 20 ? SUPABASE_ANON_KEY : (localStorage.getItem('supabase_key_manual') || "");
  
  return { url: url.trim(), key: key.trim() };
};

const isValidUrl = (u: string) => u && u.startsWith('https://') && u.includes('.supabase.co');
const isValidKey = (k: string) => k && k.length > 20;

let supabaseInstance: any = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;
  const { url, key } = getCredentials();
  if (isValidUrl(url) && isValidKey(key)) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      return supabaseInstance;
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const isSupabaseReady = () => {
  const { url, key } = getCredentials();
  return isValidUrl(url) && isValidKey(key);
};

export const reinitializeSupabase = (newUrl: string, newKey: string) => {
  if (!isValidUrl(newUrl) || !isValidKey(newKey)) return false;
  localStorage.setItem('supabase_url_manual', newUrl.trim());
  localStorage.setItem('supabase_key_manual', newKey.trim());
  supabaseInstance = createClient(newUrl.trim(), newKey.trim(), { auth: { persistSession: true } });
  return true;
};

export const db = {
  async testConnection() {
    const logs: string[] = [];
    const { url, key } = getCredentials();
    logs.push(`[${new Date().toLocaleTimeString()}] 🛠️ Iniciando Diagnóstico...`);
    
    if (!isValidUrl(url)) logs.push("❌ URL Inválida ou não configurada no código.");
    if (!isValidKey(key)) logs.push("❌ Anon Key Inválida ou não configurada no código.");
    
    if (!isValidUrl(url) || !isValidKey(key)) return { success: false, logs };

    try {
      const client = createClient(url, key);
      const { error } = await client.from('profiles').select('id').limit(1);
      if (error && error.code !== '42P01') throw error;
      
      logs.push("✅ CONEXÃO ESTABELECIDA COM SUCESSO!");
      logs.push(`📡 Conectado em: ${url}`);
      if (error?.code === '42P01') logs.push("⚠️ Nota: Tabela 'profiles' não encontrada (rode o SQL no painel Supabase).");
      
      return { success: true, logs };
    } catch (e: any) {
      return { success: false, logs: [...logs, `💥 Erro de Rede: ${e.message}`] };
    }
  },

  // Planos
  async getPlans() {
    const client = getSupabase();
    if (!client) return [];
    const { data } = await client.from('plans').select('*').order('price', { ascending: true });
    return data || [];
  },
  async savePlan(plan: any) {
    const client = getSupabase();
    if (!client) return;
    await client.from('plans').upsert(plan);
  },
  async deletePlan(id: string) {
    const client = getSupabase();
    if (!client) return;
    await client.from('plans').delete().eq('id', id);
  },

  // Config e Outros
  async getConfig() {
    const client = getSupabase();
    if (!client) return null;
    const { data } = await client.from('site_config').select('*').eq('id', 1).maybeSingle();
    return data;
  },
  async updateConfig(config: any) {
    const client = getSupabase();
    if (!client) return;
    const { id, updated_at, ...clean } = config;
    await client.from('site_config').upsert({ id: 1, ...clean });
  },
  async getUsers() {
    const client = getSupabase();
    if (!client) return [];
    const { data } = await client.from('profiles').select('*').order('createdAt', { ascending: false });
    return data || [];
  },
  async updateUser(user: any) {
    const client = getSupabase();
    if (!client) return;
    await client.from('profiles').upsert(user);
  },
  async deleteUser(id: string) {
    const client = getSupabase();
    if (!client) return;
    await client.from('profiles').delete().eq('id', id);
  },
  async findUserByEmail(email: string) {
    const client = getSupabase();
    if (!client) return null;
    const { data } = await client.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
    return data;
  },
  async getPosts() {
    const client = getSupabase();
    if (!client) return [];
    const { data } = await client.from('posts').select('*').order('createdAt', { ascending: false });
    return data || [];
  },
  async addPost(post: any) {
    const client = getSupabase();
    if (!client) return;
    await client.from('posts').insert(post);
  },
  async updatePost(post: any) {
    const client = getSupabase();
    if (!client) return;
    const { id, ...data } = post;
    await client.from('posts').update(data).eq('id', id);
  },
  async deletePost(id: string) {
    const client = getSupabase();
    if (!client) return;
    await client.from('posts').delete().eq('id', id);
  },
  async getCategories() {
    const client = getSupabase();
    if (!client) return null;
    const { data } = await client.from('categories').select('name');
    return data ? data.map(c => c.name) : null;
  },
  async saveCategories(categories: string[]) {
    const client = getSupabase();
    if (!client) return;
    await client.from('categories').delete().neq('name', '___');
    await client.from('categories').insert(categories.map(name => ({ name })));
  }
};
