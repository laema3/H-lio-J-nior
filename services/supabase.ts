
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

// Estado interno para ignorar tabelas que não existem no projeto Supabase do usuário
const missingTables = new Set<string>();

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
    console.warn("Storage local cheio ou indisponível.");
  }
};

const cleanId = (id: any): any => {
    if (typeof id === 'string') {
        const numeric = id.replace(/\D/g, '');
        return numeric ? Number(numeric) : id;
    }
    return id;
};

/**
 * Função utilitária para tentar o upsert de forma recursiva removendo colunas inexistentes.
 */
async function resilientUpsert(table: string, payload: any, attempt = 1): Promise<void> {
    if (missingTables.has(table)) return;
    if (attempt > 10) return;

    const { error } = await supabase.from(table).upsert(payload);

    if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found') || (error as any).status === 404) {
            console.warn(`Tabela '${table}' não encontrada no Supabase. Usando modo offline para esta tabela.`);
            missingTables.add(table);
            return;
        }

        if (error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('not found')) {
            const match = error.message.match(/'([^']+)'/);
            const missingCol = match ? match[1] : null;

            if (missingCol && payload.hasOwnProperty(missingCol)) {
                console.warn(`Coluna '${missingCol}' ausente na tabela '${table}'. Removendo e tentando novamente (Tentativa ${attempt})...`);
                const newPayload = { ...payload };
                delete newPayload[missingCol];
                return resilientUpsert(table, newPayload, attempt + 1);
            }
        }
    }
}

export const db = {
  async init() {
    const users = getLocal(STORAGE_KEYS.USERS, []);
    if (!users.find((u: any) => u.email === 'admin@helio.com')) {
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
    }
  },

  async getConfig(): Promise<SiteConfig> {
    const fallback = getLocal(STORAGE_KEYS.CONFIG, {
        heroLabel: 'Hélio Júnior',
        heroTitle: 'Voz que Vende',
        heroSubtitle: 'O maior portal de classificados com locução inteligente.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920'
    });

    if (missingTables.has('site_config')) return fallback;

    try {
      const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
      
      if (error) {
          if (error.message.includes('not found') || (error as any).status === 404) {
              missingTables.add('site_config');
          }
          return fallback;
      }
      
      if (!data) return fallback;
      
      return {
        heroLabel: data.herolabel || data.hero_label || fallback.heroLabel,
        heroTitle: data.herotitle || data.hero_title || fallback.heroTitle,
        heroSubtitle: data.herosubtitle || data.hero_subtitle || fallback.heroSubtitle,
        heroImageUrl: data.heroimageurl || data.hero_image_url || fallback.heroImageUrl,
        headerLogoUrl: data.headerlogourl || data.header_logo_url || data.logo_url,
        bannerFooterUrl: data.bannerfooterurl || data.banner_footer_url,
        whatsapp: data.whatsapp,
        phone: data.phone,
        instagram: data.instagram,
        facebook: data.facebook,
        pixKey: data.pixkey || data.pix_key,
        pixName: data.pixname || data.pix_name
      };
    } catch { return fallback; }
  },

  async updateConfig(cfg: SiteConfig) {
    saveLocal(STORAGE_KEYS.CONFIG, cfg);
    
    const payload: any = {
      id: 1,
      herolabel: cfg.heroLabel,
      herotitle: cfg.heroTitle,
      herosubtitle: cfg.heroSubtitle,
      heroimageurl: cfg.heroImageUrl,
      headerlogourl: cfg.headerLogoUrl,
      bannerfooterurl: cfg.bannerFooterUrl,
      whatsapp: cfg.whatsapp,
      phone: cfg.phone,
      instagram: cfg.instagram,
      facebook: cfg.facebook,
      pixkey: cfg.pixKey,
      pixname: cfg.pixName
    };

    await resilientUpsert('site_config', payload);
  },

  async getPlans(): Promise<Plan[]> {
    const local = getLocal(STORAGE_KEYS.PLANS, []);
    if (missingTables.has('plans')) return local;

    try {
      const { data, error } = await supabase.from('plans').select('*').order('price');
      if (error) {
          if (error.message.includes('not found') || (error as any).status === 404) {
              missingTables.add('plans');
          }
          return local;
      }
      if (!data) return local;
      return data.map(p => ({
        id: String(p.id),
        name: p.name,
        price: Number(p.price),
        durationDays: p.durationdays || p.duration_days,
        description: p.description
      }));
    } catch { return local; }
  },

  async savePlan(plan: Partial<Plan>) {
    const plans = await this.getPlans();
    const newId = plan.id || String(Date.now());
    const newPlan = { ...plan, id: newId } as Plan;
    saveLocal(STORAGE_KEYS.PLANS, plans.some(p => p.id === newId) ? plans.map(p => p.id === newId ? newPlan : p) : [...plans, newPlan]);
    
    const payload = {
      id: cleanId(newId),
      name: newPlan.name,
      price: newPlan.price,
      durationdays: newPlan.durationDays,
      description: newPlan.description
    };
    await resilientUpsert('plans', payload);
  },

  async deletePlan(id: string) {
    const plans = await this.getPlans();
    saveLocal(STORAGE_KEYS.PLANS, plans.filter(p => p.id !== id));
    if (missingTables.has('plans')) return;
    try { await supabase.from('plans').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getUsers(): Promise<User[]> {
    const local = getLocal(STORAGE_KEYS.USERS, []);
    if (missingTables.has('profiles')) return local;

    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
          if (error.message.includes('not found') || (error as any).status === 404) {
              missingTables.add('profiles');
          }
          return local;
      }
      if (!data) return local;
      return data.map(u => ({
        ...u,
        id: String(u.id),
        planId: u.planid || u.plan_id,
        paymentStatus: (u.paymentstatus || u.payment_status) as PaymentStatus,
        role: (u.role || UserRole.ADVERTISER) as UserRole,
        status: u.status || 'ACTIVE'
      }));
    } catch { return local; }
  },

  async authenticate(email: string, pass: string): Promise<User | null> {
    const local = getLocal(STORAGE_KEYS.USERS, []);
    const found = local.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (found) return found.status === 'BLOCKED' ? null : found;

    if (missingTables.has('profiles')) return null;

    try {
      const { data, error } = await supabase.from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('password', pass)
        .maybeSingle();
        
      if (error || !data || data.status === 'BLOCKED') return null;
      
      return { 
        ...data, 
        id: String(data.id), 
        role: data.role as UserRole,
        planId: data.planid || data.plan_id
      };
    } catch { return null; }
  },

  async addUser(user: Partial<User>) {
    const users = await this.getUsers();
    const newId = String(Date.now());
    const newUser = { ...user, id: newId, createdAt: new Date().toISOString(), status: 'ACTIVE' } as User;
    saveLocal(STORAGE_KEYS.USERS, [...users, newUser]);
    
    const payload = {
      id: cleanId(newId),
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      phone: newUser.phone,
      role: newUser.role,
      status: 'ACTIVE',
      createdat: newUser.createdAt
    };
    await resilientUpsert('profiles', payload);
    return newUser;
  },

  async updateUser(user: User) {
    const users = await this.getUsers();
    saveLocal(STORAGE_KEYS.USERS, users.map(u => u.id === user.id ? user : u));
    
    const { id } = user;
    const payload: any = { id: cleanId(id) };
    if (user.name) payload.name = user.name;
    if (user.status) payload.status = user.status;
    if (user.role) payload.role = user.role;
    if (user.phone) payload.phone = user.phone;
    if (user.email) payload.email = user.email;
    
    await resilientUpsert('profiles', payload);
  },

  async deleteUser(id: string) {
    const users = await this.getUsers();
    saveLocal(STORAGE_KEYS.USERS, users.filter(u => u.id !== id));
    if (missingTables.has('profiles')) return;
    try { await supabase.from('profiles').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getPosts(): Promise<Post[]> {
    const local = getLocal(STORAGE_KEYS.POSTS, []);
    if (missingTables.has('posts')) return local;

    try {
      const { data, error } = await supabase.from('posts').select('*').order('id', { ascending: false });
      if (error) {
          if (error.message.includes('not found') || (error as any).status === 404) {
              missingTables.add('posts');
          }
          return local;
      }
      if (!data) return local;
      return data.map(p => ({
        ...p,
        id: String(p.id),
        authorId: String(p.authorid || p.author_id),
        imageUrls: p.imageurls || p.image_urls || []
      }));
    } catch { return local; }
  },

  async savePost(post: Partial<Post>) {
    const posts = await this.getPosts();
    const newId = post.id || String(Date.now());
    const newPost = { ...post, id: newId, createdAt: post.createdAt || new Date().toISOString() } as Post;
    saveLocal(STORAGE_KEYS.POSTS, posts.some(p => p.id === newId) ? posts.map(p => p.id === newId ? newPost : p) : [newPost, ...posts]);

    const payload = {
      id: cleanId(newId),
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      authorname: newPost.authorName,
      authorid: cleanId(newPost.authorId),
      whatsapp: newPost.whatsapp,
      phone: newPost.phone,
      imageurls: newPost.imageUrls,
      createdat: newPost.createdAt,
      expiresat: newPost.expiresAt
    };
    await resilientUpsert('posts', payload);
  },

  async deletePost(id: string) {
    const posts = await this.getPosts();
    saveLocal(STORAGE_KEYS.POSTS, posts.filter(p => p.id !== id));
    if (missingTables.has('posts')) return;
    try { await supabase.from('posts').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getCategories(): Promise<Category[]> {
    const local = getLocal(STORAGE_KEYS.CATEGORIES, []);
    if (missingTables.has('categories')) return local;

    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) {
          if (error.message.includes('not found') || (error as any).status === 404) {
              missingTables.add('categories');
          }
          return local;
      }
      if (!data) return local;
      return data.map(c => ({ id: String(c.id), name: c.name }));
    } catch { return local; }
  }
};
