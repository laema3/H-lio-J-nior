
import { createClient } from '@supabase/supabase-js';
import { PaymentStatus, UserRole, Plan, Category, Post, SiteConfig, User } from '../types';

const SUPABASE_URL = 'https://yzufoswsajzbovmcwscl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dWZvc3dzYWp6Ym92bWN3c2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzI4MTMsImV4cCI6MjA4NjkwODgxM30.R8pCkQQbe4ezyFyDmQBHanPhjsKJF-qX3KLsyxHHNsM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEYS = {
  CONFIG: 'hj_fallback_config',
  PLANS: 'hj_fallback_plans',
  USERS: 'hj_fallback_users',
  POSTS: 'hj_fallback_posts',
  CATEGORIES: 'hj_fallback_categories'
};

const getLocal = (key: string, def: any) => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : def;
};

const saveLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

const DEFAULT_PLANS: Plan[] = [
  { id: 'p_free', name: 'Degustação Grátis', price: 0, durationDays: 30, description: 'Teste por 30 dias sem custo.' },
  { id: 'p_gold', name: 'Plano Mensal Gold', price: 49.90, durationDays: 30, description: 'Destaque Mensal' }
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Comércio' }, { id: 'c2', name: 'Serviços' }, { id: 'c3', name: 'Saúde' }
];

const toDb = (obj: any) => {
  const out: any = {};
  for (const k in obj) {
    if (k === 'password' && !obj[k]) continue;
    out[k.toLowerCase()] = obj[k];
  }
  return out;
};

export const db = {
  async init() {
    const users = getLocal(STORAGE_KEYS.USERS, []);
    if (!users.find((u: any) => u.email === 'admin@helio.com')) {
      const admin: User = {
        id: 'admin',
        name: 'Hélio Júnior',
        email: 'admin@helio.com',
        password: 'admin',
        role: UserRole.ADMIN,
        paymentStatus: PaymentStatus.NOT_APPLICABLE,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };
      saveLocal(STORAGE_KEYS.USERS, [...users, admin]);
    }
    
    if (getLocal(STORAGE_KEYS.PLANS, []).length === 0) saveLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
    if (getLocal(STORAGE_KEYS.CATEGORIES, []).length === 0) saveLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },

  async getConfig(): Promise<SiteConfig> {
    try {
      const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
      if (error || !data) return getLocal(STORAGE_KEYS.CONFIG, {
        heroLabel: 'Hélio Júnior',
        heroTitle: 'Voz que Vende',
        heroSubtitle: 'O maior portal de classificados com locução inteligente.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920'
      });
      return {
        heroLabel: data.herolabel,
        heroTitle: data.herotitle,
        heroSubtitle: data.herosubtitle,
        heroImageUrl: data.heroimageurl,
        headerLogoUrl: data.headerlogourl,
        bannerFooterUrl: data.bannerfooterurl,
        whatsapp: data.whatsapp,
        phone: data.phone,
        instagram: data.instagram,
        facebook: data.facebook,
        pixKey: data.pixkey,
        pixName: data.pixname
      };
    } catch { return getLocal(STORAGE_KEYS.CONFIG, {}); }
  },

  async updateConfig(cfg: SiteConfig) {
    saveLocal(STORAGE_KEYS.CONFIG, cfg);
    try {
      await supabase.from('site_config').upsert({ id: 1, ...toDb(cfg) });
    } catch(e) {}
  },

  async getPlans(): Promise<Plan[]> {
    try {
      const { data, error } = await supabase.from('plans').select('*').order('price');
      if (error || !data || data.length === 0) return getLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
      return data.map(p => ({
        id: String(p.id),
        name: p.name,
        price: Number(p.price),
        durationDays: p.durationdays,
        description: p.description
      }));
    } catch { return getLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS); }
  },

  // Added missing getCategories method to fix App.tsx error
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error || !data || data.length === 0) return getLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      return data.map(c => ({
        id: String(c.id),
        name: c.name
      }));
    } catch { return getLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES); }
  },

  async savePlan(plan: Partial<Plan>) {
    const plans = await this.getPlans();
    const newPlan = { ...plan, id: plan.id || 'pl-' + Date.now() } as Plan;
    const updated = plans.some(p => p.id === newPlan.id) ? plans.map(p => p.id === newPlan.id ? newPlan : p) : [...plans, newPlan];
    saveLocal(STORAGE_KEYS.PLANS, updated);
    try { await supabase.from('plans').upsert(toDb(newPlan)); } catch(e) {}
  },

  async deletePlan(id: string) {
    const plans = await this.getPlans();
    saveLocal(STORAGE_KEYS.PLANS, plans.filter(p => p.id !== id));
    try { await supabase.from('plans').delete().eq('id', id); } catch(e) {}
  },

  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error || !data) return getLocal(STORAGE_KEYS.USERS, []);
      return data.map(u => ({
        ...u,
        id: String(u.id),
        planId: u.planid,
        paymentStatus: u.paymentstatus as PaymentStatus,
        role: u.role as UserRole,
        status: u.status || 'ACTIVE'
      }));
    } catch { return getLocal(STORAGE_KEYS.USERS, []); }
  },

  async authenticate(email: string, pass: string): Promise<User | null> {
    const localUsers = getLocal(STORAGE_KEYS.USERS, []);
    const foundLocal = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (foundLocal) {
        if (foundLocal.status === 'BLOCKED') return null;
        return foundLocal;
    }

    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).eq('password', pass).maybeSingle();
      if (error || !data) return null;
      if (data.status === 'BLOCKED') return null;
      return { ...data, id: String(data.id), planId: data.planid, paymentStatus: data.paymentstatus as PaymentStatus, role: data.role as UserRole };
    } catch { return null; }
  },

  async addUser(user: Partial<User>) {
    const users = await this.getUsers();
    const newUser = { ...user, id: user.id || 'u-' + Date.now(), createdAt: new Date().toISOString(), status: 'ACTIVE' } as User;
    saveLocal(STORAGE_KEYS.USERS, [...users, newUser]);
    try { await supabase.from('profiles').insert(toDb(newUser)); } catch(e) {}
    return newUser;
  },

  async updateUser(user: User) {
    const users = await this.getUsers();
    saveLocal(STORAGE_KEYS.USERS, users.map(u => u.id === user.id ? user : u));
    try { 
      const id = isNaN(Number(user.id)) ? user.id : Number(user.id);
      await supabase.from('profiles').update(toDb(user)).eq('id', id); 
    } catch(e) {}
  },

  async deleteUser(id: string) {
    const users = await this.getUsers();
    saveLocal(STORAGE_KEYS.USERS, users.filter(u => u.id !== id));
    try { await supabase.from('profiles').delete().eq('id', id); } catch(e) {}
  },

  async getPosts(): Promise<Post[]> {
    try {
      const { data, error } = await supabase.from('posts').select('*').order('id', { ascending: false });
      if (error || !data) return getLocal(STORAGE_KEYS.POSTS, []);
      return data.map(p => ({
        ...p,
        id: String(p.id),
        authorId: String(p.authorid),
        authorName: p.authorname,
        imageUrls: p.imageurls,
        createdAt: p.createdat,
        expiresAt: p.expiresat
      }));
    } catch { return getLocal(STORAGE_KEYS.POSTS, []); }
  },

  async savePost(post: Partial<Post>) {
    const posts = await this.getPosts();
    const newPost = { ...post, id: post.id || 'p-' + Date.now(), createdAt: post.createdAt || new Date().toISOString() } as Post;
    const updated = posts.some(p => p.id === newPost.id) ? posts.map(p => p.id === newPost.id ? newPost : p) : [newPost, ...posts];
    saveLocal(STORAGE_KEYS.POSTS, updated);
    try { await supabase.from('posts').upsert(toDb(newPost)); } catch(e) {}
  },

  async deletePost(id: string) {
    const posts = await this.getPosts();
    saveLocal(STORAGE_KEYS.POSTS, posts.filter(p => p.id !== id));
    try { await supabase.from('posts').delete().eq('id', id); } catch(e) {}
  }
};
