
import { createClient } from '@supabase/supabase-js';
import { PaymentStatus, UserRole } from '../types';

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

// Converte camelCase para lowercase para o Supabase
const toDb = (obj: any) => {
  const dbObj: any = {};
  for (const key in obj) {
    if (key === 'password' && !obj[key]) continue;
    // Mapeamentos específicos
    const dbKey = key.toLowerCase();
    dbObj[dbKey] = obj[key];
  }
  return dbObj;
};

// Tenta converter ID para número se for possível, caso contrário mantém string
const cleanId = (id: any) => {
    if (typeof id === 'string' && /^\d+$/.test(id)) return parseInt(id, 10);
    return id;
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
    const { error } = await client.from('site_config').upsert({ id: 1, ...payload });
    if (error) console.error("Erro updateConfig:", error);
  },

  async getUsers() {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client.from('profiles').select('*').order('id', { ascending: false });
    if (error) { console.error("Erro getUsers:", error); return []; }
    return (data || []).map((u: any) => ({
      ...u,
      id: String(u.id),
      planId: u.planid || 'p_free',
      paymentStatus: u.paymentstatus || PaymentStatus.AWAITING,
      role: u.role || UserRole.ADVERTISER,
      createdAt: u.createdat,
      expiresAt: u.expiresat
    }));
  },

  async authenticate(email: string, pass: string) {
    const client = getSupabase();
    if (!client) return null;
    const { data, error } = await client.from('profiles').select('*').eq('email', email.toLowerCase()).eq('password', pass).maybeSingle();
    if (error || !data) return null;
    return {
      ...data,
      id: String(data.id),
      planId: data.planid || 'p_free',
      paymentStatus: data.paymentstatus || PaymentStatus.AWAITING,
      createdAt: data.createdat,
      expiresAt: data.expiresat
    };
  },

  async addUser(user: any) {
    const client = getSupabase();
    if (!client) return null;
    const payload = toDb(user);
    if (payload.id) delete payload.id;
    const { data, error } = await client.from('profiles').insert(payload).select().single();
    if (error) throw error;
    return {
      ...data,
      id: String(data.id),
      planId: data.planid || 'p_free',
      paymentStatus: data.paymentstatus || PaymentStatus.AWAITING,
      createdAt: data.createdat,
      expiresAt: data.expiresat
    };
  },

  async updateUser(user: any) {
    const client = getSupabase();
    if (!client) return;
    const id = cleanId(user.id);
    const { id: _, ...clean } = user;
    const payload = toDb(clean);
    const { error } = await client.from('profiles').update(payload).eq('id', id);
    if (error) console.error("Erro updateUser:", error);
  },

  async deleteUser(id: string) {
    const client = getSupabase();
    if (!client) return;
    const { error } = await client.from('profiles').delete().eq('id', cleanId(id));
    if (error) console.error("Erro deleteUser:", error);
  },

  async getPlans() {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client.from('plans').select('*').order('price', { ascending: true });
    if (error) { console.error("Erro getPlans:", error); return []; }
    return (data || []).map((p: any) => ({
      ...p,
      id: String(p.id),
      durationDays: p.durationdays || 30
    }));
  },

  async savePlan(plan: any) {
    const client = getSupabase();
    if (!client) return;
    const payload = toDb(plan);
    if (payload.id) {
        payload.id = cleanId(payload.id);
        const { error } = await client.from('plans').upsert(payload);
        if (error) console.error("Erro savePlan (update):", error);
    } else {
        const { error } = await client.from('plans').insert(payload);
        if (error) console.error("Erro savePlan (insert):", error);
    }
  },

  async deletePlan(id: string) {
    const client = getSupabase();
    if (!client) return;
    const { error } = await client.from('plans').delete().eq('id', cleanId(id));
    if (error) console.error("Erro deletePlan:", error);
  },

  async getPosts() {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client.from('posts').select('*').order('id', { ascending: false });
    if (error) { console.error("Erro getPosts:", error); return []; }
    return (data || []).map((p: any) => ({
      ...p,
      id: String(p.id),
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
    if (payload.id) payload.id = cleanId(payload.id);
    const { error } = await client.from('posts').upsert(payload);
    if (error) console.error("Erro savePost:", error);
  },

  async deletePost(id: string) {
    const client = getSupabase();
    if (!client) return;
    const { error } = await client.from('posts').delete().eq('id', cleanId(id));
    if (error) console.error("Erro deletePost:", error);
  },

  async getCategories() {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client.from('categories').select('*').order('name', { ascending: true });
    if (error) { console.error("Erro getCategories:", error); return []; }
    return (data || []).map((c: any) => ({ ...c, id: String(c.id) }));
  },

  async saveCategory(cat: any) {
    const client = getSupabase();
    if (!client) return;
    const payload = toDb(cat);
    if (payload.id) {
        payload.id = cleanId(payload.id);
        const { error } = await client.from('categories').upsert(payload);
        if (error) console.error("Erro saveCategory (update):", error);
    } else {
        const { error } = await client.from('categories').insert(payload);
        if (error) console.error("Erro saveCategory (insert):", error);
    }
  },

  async deleteCategory(id: string) {
    const client = getSupabase();
    if (!client) return;
    const { error } = await client.from('categories').delete().eq('id', cleanId(id));
    if (error) console.error("Erro deleteCategory:", error);
  }
};
