
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzufoswsajzbovmcwscl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dWZvc3dzYWp6Ym92bWN3c2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzI4MTMsImV4cCI6MjA4NjkwODgxM30.R8pCkQQbe4ezyFyDmQBHanPhjsKJF-qX3KLsyxHHNsM';

let supabaseInstance: any = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseInstance;
  }
  return null;
};

// Converte objetos CamelCase para o padrão de colunas do banco (lowercase)
const toDb = (obj: any) => {
  const dbObj: any = {};
  for (const key in obj) {
    if (key === 'password' && !obj[key]) continue;
    dbObj[key.toLowerCase()] = obj[key];
  }
  return dbObj;
};

export const db = {
  async getConfig() {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await client.from('site_config').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        heroTitle: data.herotitle || '',
        heroSubtitle: data.herosubtitle || '',
        heroImageUrl: data.heroimageurl || '',
        heroLabel: data.herolabel || 'Portal VIP',
        whatsapp: data.whatsapp || '',
        pixKey: data.pixkey || '',
        pixName: data.pixname || '',
        headerLogoUrl: data.headerlogourl || ''
      };
    } catch (err) { return null; }
  },

  async updateConfig(config: any) {
    const client = getSupabase();
    if (!client) return;
    const payload = toDb(config);
    delete payload.id;
    await client.from('site_config').upsert({ id: 1, ...payload });
  },

  async getUsers() {
    const client = getSupabase();
    if (!client) return [];
    const { data } = await client.from('profiles').select('*').order('id', { ascending: false });
    return (data || []).map((u: any) => ({
      ...u,
      id: String(u.id),
      planId: u.planid || 'p_free',
      paymentStatus: u.paymentstatus || 'AGUARDANDO PAGAMENTO',
      createdAt: u.createdat,
      expiresAt: u.expiresat
    }));
  },

  async authenticate(email: string, pass: string) {
    const client = getSupabase();
    if (!client) return null;
    const { data } = await client.from('profiles').select('*').eq('email', email.toLowerCase()).eq('password', pass).maybeSingle();
    if (!data) return null;
    return {
      ...data,
      id: String(data.id),
      planId: data.planid || 'p_free',
      paymentStatus: data.paymentstatus || 'AGUARDANDO PAGAMENTO',
      createdAt: data.createdat,
      expiresAt: data.expiresat
    };
  },

  async addUser(user: any) {
    const client = getSupabase();
    if (!client) return null;
    const payload = toDb(user);
    const { data, error } = await client.from('profiles').insert(payload).select().single();
    if (error) throw error;
    return {
      ...data,
      id: String(data.id),
      planId: data.planid || 'p_free',
      paymentStatus: data.paymentstatus || 'AGUARDANDO PAGAMENTO',
      createdAt: data.createdat,
      expiresAt: data.expiresat
    };
  },

  async updateUser(user: any) {
    const client = getSupabase();
    if (!client) return;
    const { id, ...clean } = user;
    const payload = toDb(clean);
    await client.from('profiles').update(payload).eq('id', id);
  },

  async deleteUser(id: string) {
    const client = getSupabase();
    if (!client) return;
    await client.from('profiles').delete().eq('id', id);
  },

  async getPlans() {
    const client = getSupabase();
    if (!client) return [];
    const { data } = await client.from('plans').select('*').order('price', { ascending: true });
    return (data || []).map((p: any) => ({
      ...p,
      durationDays: p.durationdays || 30
    }));
  },

  async savePlan(plan: any) {
    const client = getSupabase();
    if (!client) return;
    const payload = toDb(plan);
    await client.from('plans').upsert(payload);
  },

  async deletePlan(id: string) {
    const client = getSupabase();
    if (!client) return;
    await client.from('plans').delete().eq('id', id);
  },

  async getPosts() {
    const client = getSupabase();
    if (!client) return [];
    const { data } = await client.from('posts').select('*').order('id', { ascending: false });
    return (data || []).map((p: any) => ({
      ...p,
      authorId: String(p.authorid || 'unknown'),
      authorName: p.authorname || 'Anunciante VIP',
      imageUrl: p.imageurl || '',
      logoUrl: p.logourl || '',
      createdAt: p.createdat || new Date().toISOString()
    }));
  },

  async savePost(post: any) {
    const client = getSupabase();
    if (!client) return;
    const payload = toDb(post);
    await client.from('posts').upsert(payload);
  },

  async deletePost(id: string) {
    const client = getSupabase();
    if (!client) return;
    await client.from('posts').delete().eq('id', id);
  },

  async getCategories() {
    const client = getSupabase();
    if (!client) return [];
    const { data } = await client.from('categories').select('*').order('name', { ascending: true });
    return data || [];
  },

  async saveCategory(cat: any) {
    const client = getSupabase();
    if (!client) return;
    const payload = toDb(cat);
    await client.from('categories').upsert(payload);
  },

  async deleteCategory(id: string) {
    const client = getSupabase();
    if (!client) return;
    await client.from('categories').delete().eq('id', id);
  }
};
