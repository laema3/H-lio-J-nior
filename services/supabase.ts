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

export const db = {
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
  async authenticate(email: string, pass: string) {
    const client = getSupabase();
    if (!client) return null;
    const { data } = await client.from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password', pass)
      .maybeSingle();
    return data;
  },
  async addUser(user: any) {
    const client = getSupabase();
    if (!client) return null;
    const { data, error } = await client.from('profiles').insert(user).select().single();
    if (error) throw error;
    return data;
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
  async getPosts() {
    const client = getSupabase();
    if (!client) return [];
    const { data } = await client.from('posts').select('*').order('createdAt', { ascending: false });
    return data || [];
  },
  async savePost(post: any) {
    const client = getSupabase();
    if (!client) return;
    await client.from('posts').upsert(post);
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
    await client.from('categories').upsert(cat);
  },
  async deleteCategory(id: string) {
    const client = getSupabase();
    if (!client) return;
    await client.from('categories').delete().eq('id', id);
  }
};