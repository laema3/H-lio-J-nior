
import { createClient } from '@supabase/supabase-js';
import { PaymentStatus, UserRole, Plan, Category, Post, SiteConfig, User } from '../types';

const SUPABASE_URL = 'https://yzufoswsajzbovmcwscl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dWZvc3dzYWp6Ym92bWN3c2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzI4MTMsImV4cCI6MjA4NjkwODgxM30.R8pCkQQbe4ezyFyDmQBHanPhjsKJF-qX3KLsyxHHNsM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEYS = {
  CONFIG: 'hj_fallback_config_v2',
  PLANS: 'hj_fallback_plans_v2',
  USERS: 'hj_fallback_users_v2',
  POSTS: 'hj_fallback_posts_v2',
  CATEGORIES: 'hj_fallback_categories_v2'
};

const getLocal = (key: string, def: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch (e) {
    return def;
  }
};

const saveLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage local cheio.");
  }
};

const cleanId = (id: any): any => {
    if (typeof id === 'string') {
        const numeric = id.replace(/\D/g, '');
        return numeric ? Number(numeric) : id;
    }
    return id;
};

// Tabelas que falharam anteriormente
const failedTables = new Set<string>();

async function resilientUpsert(table: string, payload: any): Promise<void> {
    if (failedTables.has(table)) return;
    try {
        const { error } = await supabase.from(table).upsert(payload);
        if (error) {
            console.warn(`Supabase ${table} fail:`, error.message);
            if (error.code === 'PGRST116' || (error as any).status === 404) {
                failedTables.add(table);
            }
        }
    } catch (e) {
        failedTables.add(table);
    }
}

export const db = {
  async init() {
    const users = getLocal(STORAGE_KEYS.USERS, []);
    const adminExists = users.find((u: any) => u.email.toLowerCase() === 'admin@helio.com');
    
    if (!adminExists) {
      const admin: User = {
        id: '1',
        name: 'Hélio Júnior',
        email: 'admin@helio.com',
        password: 'admin',
        role: UserRole.ADMIN,
        paymentStatus: PaymentStatus.NOT_APPLICABLE,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };
      saveLocal(STORAGE_KEYS.USERS, [...users, admin]);
      console.log("Usuário Admin Local Inicializado.");
    }
  },

  async getConfig(): Promise<SiteConfig> {
    const fallback = getLocal(STORAGE_KEYS.CONFIG, {
        heroLabel: 'Hélio Júnior',
        heroTitle: 'Voz que Vende',
        heroSubtitle: 'Seu portal de classificados com o impacto do rádio digital.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920',
        maintenanceMode: false
    });

    try {
      const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
      if (error || !data) return fallback;
      return { ...fallback, ...data, maintenanceMode: !!data.maintenancemode };
    } catch { return fallback; }
  },

  async updateConfig(cfg: SiteConfig) {
    saveLocal(STORAGE_KEYS.CONFIG, cfg);
    try {
        await resilientUpsert('site_config', {
            id: 1,
            herolabel: cfg.heroLabel,
            herotitle: cfg.heroTitle,
            herosubtitle: cfg.heroSubtitle,
            maintenancemode: cfg.maintenanceMode
        });
    } catch (e) {
        console.error("Supabase updateConfig error:", e);
    }
  },

  async getPlans(): Promise<Plan[]> {
    const local = getLocal(STORAGE_KEYS.PLANS, []);
    try {
      const { data, error } = await supabase.from('plans').select('*');
      if (error || !data || data.length === 0) return local;
      return data;
    } catch (e) { console.error("Supabase getPlans error:", e); return local; }
  },

  async savePlan(plan: Partial<Plan>) {
    const plans = await this.getPlans();
    const newId = plan.id || String(Date.now());
    const newPlan = { ...plan, id: newId } as Plan;
    saveLocal(STORAGE_KEYS.PLANS, plans.some(p => p.id === newId) ? plans.map(p => p.id === newId ? newPlan : p) : [...plans, newPlan]);
    await resilientUpsert('plans', { id: cleanId(newId), name: newPlan.name, price: newPlan.price });
  },

  // Added deletePlan method to fix errors in index.tsx and App.tsx
  async deletePlan(id: string) {
    const plans = await this.getPlans();
    saveLocal(STORAGE_KEYS.PLANS, plans.filter(p => p.id !== id));
    try { await supabase.from('plans').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getUsers(): Promise<User[]> {
    const local = getLocal(STORAGE_KEYS.USERS, []);
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error || !data || data.length === 0) return local;
      // Merge local with remote
      const remoteUsers = data.map(u => ({ ...u, id: String(u.id), role: u.role as UserRole }));
      const merged = [...local];
      remoteUsers.forEach(ru => {
          if (!merged.find(mu => mu.email.toLowerCase() === ru.email.toLowerCase())) {
              merged.push(ru);
          }
      });
      return merged;
    } catch { return local; }
  },

  async authenticate(email: string, pass: string): Promise<User | null> {
    // Tenta primeiro o Local Storage para garantir acesso admin rápido
    const users = await this.getUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    
    if (found) {
        if (found.status === 'BLOCKED') return null;
        return found;
    }

    // Tenta via Supabase caso o usuário tenha sido criado remotamente e não esteja no local
    try {
        const { data, error } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).eq('password', pass).maybeSingle();
        if (data && !error) {
            return { ...data, id: String(data.id), role: data.role as UserRole };
        }
    } catch (e) { console.error("Supabase authentication error:", e); }

    return null;
  },

  async addUser(user: Partial<User>) {
    const users = await this.getUsers();
    const newId = String(Date.now());
    const newUser = { ...user, id: newId, createdAt: new Date().toISOString(), status: 'ACTIVE' } as User;
    saveLocal(STORAGE_KEYS.USERS, [...users, newUser]);
    await resilientUpsert('profiles', { id: cleanId(newId), name: newUser.name, email: newUser.email, password: newUser.password });
    return newUser;
  },

  async updateUser(user: User) {
    const users = await this.getUsers();
    saveLocal(STORAGE_KEYS.USERS, users.map(u => u.id === user.id ? user : u));
    await resilientUpsert('profiles', { id: cleanId(user.id), name: user.name, status: user.status });
  },

  // Added deleteUser method to fix errors in index.tsx and App.tsx
  async deleteUser(id: string) {
    const users = await this.getUsers();
    saveLocal(STORAGE_KEYS.USERS, users.filter(u => u.id !== id));
    try { await supabase.from('profiles').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getPosts(): Promise<Post[]> {
    const local = getLocal(STORAGE_KEYS.POSTS, []);
    try {
      const { data, error } = await supabase.from('posts').select('*').order('id', { ascending: false });
      if (error || !data) return local;
      return data.map(p => ({ ...p, id: String(p.id), imageUrls: p.imageurls || [] }));
    } catch { return local; }
  },

  async savePost(post: Partial<Post>) {
    const posts = await this.getPosts();
    const newId = post.id || String(Date.now());
    const newPost = { ...post, id: newId, createdAt: post.createdAt || new Date().toISOString() } as Post;
    saveLocal(STORAGE_KEYS.POSTS, posts.some(p => p.id === newId) ? posts.map(p => p.id === newId ? newPost : p) : [newPost, ...posts]);
    await resilientUpsert('posts', { id: cleanId(newId), title: newPost.title, content: newPost.content });
  },

  async deletePost(id: string) {
    const posts = await this.getPosts();
    saveLocal(STORAGE_KEYS.POSTS, posts.filter(p => p.id !== id));
    try { await supabase.from('posts').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getCategories(): Promise<Category[]> {
    return getLocal(STORAGE_KEYS.CATEGORIES, [
        {id:'1', name:'Comércio'}, 
        {id:'2', name:'Serviços'}, 
        {id:'3', name:'Alimentação'}
    ]);
  }
};
