
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
 * Função utilitária aprimorada para tentar o upsert removendo colunas inexistentes de forma agressiva.
 */
async function resilientUpsert(table: string, payload: any, attempt = 1): Promise<void> {
    if (missingTables.has(table)) return;
    if (attempt > 15) return; // Aumentado limite de tentativas

    const { error } = await supabase.from(table).upsert(payload);

    if (error) {
        // Tabela inexistente
        if (error.code === 'PGRST116' || error.message.includes('not found') || (error as any).status === 404) {
            console.warn(`Tabela '${table}' não encontrada no Supabase.`);
            missingTables.add(table);
            return;
        }

        // Coluna inexistente
        if (error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('not found')) {
            const match = error.message.match(/'([^']+)'/);
            const missingCol = match ? match[1] : null;

            if (missingCol && payload.hasOwnProperty(missingCol)) {
                console.warn(`Coluna '${missingCol}' ausente em '${table}'. Tentativa ${attempt}.`);
                const newPayload = { ...payload };
                delete newPayload[missingCol];
                return resilientUpsert(table, newPayload, attempt + 1);
            } else {
              // Se o erro de coluna persiste mas não identificamos o nome, tentamos remover campos comuns que costumam falhar
              const commonProblemFields = ['bannerfooterurl', 'authorid', 'authorname', 'createdat', 'expiresat', 'imageurls', 'status'];
              let modified = false;
              const newPayload = { ...payload };
              for(const f of commonProblemFields) {
                if(newPayload.hasOwnProperty(f)) {
                  delete newPayload[f];
                  modified = true;
                }
              }
              if(modified) return resilientUpsert(table, newPayload, attempt + 1);
            }
        }
        console.error(`Erro fatal no Supabase (${table}):`, error.message);
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
      if (error || !data) return fallback;
      
      return {
        heroLabel: data.herolabel || data.hero_label || fallback.heroLabel,
        heroTitle: data.herotitle || data.hero_title || fallback.heroTitle,
        heroSubtitle: data.herosubtitle || data.hero_subtitle || fallback.heroSubtitle,
        heroImageUrl: data.heroimageurl || data.hero_image_url || fallback.heroImageUrl,
        headerLogoUrl: data.headerlogourl || data.header_logo_url,
        bannerFooterUrl: data.bannerfooterurl || data.banner_footer_url,
        whatsapp: data.whatsapp,
        phone: data.phone,
        instagram: data.instagram,
        facebook: data.facebook,
        pixKey: data.pixkey,
        pixName: data.pixname
      };
    } catch { return fallback; }
  },

  async updateConfig(cfg: SiteConfig) {
    saveLocal(STORAGE_KEYS.CONFIG, cfg);
    const payload = {
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
      facebook: cfg.facebook
    };
    await resilientUpsert('site_config', payload);
  },

  async getPlans(): Promise<Plan[]> {
    const local = getLocal(STORAGE_KEYS.PLANS, []);
    if (missingTables.has('plans')) return local;
    try {
      const { data, error } = await supabase.from('plans').select('*');
      if (error || !data) return local;
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
    await resilientUpsert('plans', { id: cleanId(newId), name: newPlan.name, price: newPlan.price, durationdays: newPlan.durationDays, description: newPlan.description });
  },

  async deletePlan(id: string) {
    const plans = await this.getPlans();
    saveLocal(STORAGE_KEYS.PLANS, plans.filter(p => p.id !== id));
    try { await supabase.from('plans').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getUsers(): Promise<User[]> {
    const local = getLocal(STORAGE_KEYS.USERS, []);
    if (missingTables.has('profiles')) return local;
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error || !data) return local;
      return data.map(u => ({ ...u, id: String(u.id), role: (u.role || UserRole.ADVERTISER) as UserRole, status: u.status || 'ACTIVE' }));
    } catch { return local; }
  },

  async authenticate(email: string, pass: string): Promise<User | null> {
    // FIX: Using await this.getUsers() to reference the method correctly within the db object.
    const local = (await this.getUsers()).find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (local) return local.status === 'BLOCKED' ? null : local;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).eq('password', pass).maybeSingle();
      if (error || !data || data.status === 'BLOCKED') return null;
      return { ...data, id: String(data.id), role: data.role as UserRole };
    } catch { return null; }
  },

  async addUser(user: Partial<User>) {
    const users = await this.getUsers();
    const newId = String(Date.now());
    const newUser = { ...user, id: newId, createdAt: new Date().toISOString(), status: 'ACTIVE' } as User;
    saveLocal(STORAGE_KEYS.USERS, [...users, newUser]);
    await resilientUpsert('profiles', { id: cleanId(newId), name: newUser.name, email: newUser.email, password: newUser.password, phone: newUser.phone, role: newUser.role, status: 'ACTIVE' });
    return newUser;
  },

  async updateUser(user: User) {
    const users = await this.getUsers();
    saveLocal(STORAGE_KEYS.USERS, users.map(u => u.id === user.id ? user : u));
    await resilientUpsert('profiles', { id: cleanId(user.id), name: user.name, status: user.status, role: user.role, phone: user.phone, email: user.email });
  },

  async deleteUser(id: string) {
    const users = await this.getUsers();
    saveLocal(STORAGE_KEYS.USERS, users.filter(u => u.id !== id));
    try { await supabase.from('profiles').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getPosts(): Promise<Post[]> {
    const local = getLocal(STORAGE_KEYS.POSTS, []);
    if (missingTables.has('posts')) return local;
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
    
    // Payload otimizado: se uma coluna falhar, o resilientUpsert a remove e tenta salvar o resto
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
    try { await supabase.from('posts').delete().eq('id', cleanId(id)); } catch(e) {}
  },

  async getCategories(): Promise<Category[]> {
    const local = getLocal(STORAGE_KEYS.CATEGORIES, [{id:'1', name:'Comércio'}, {id:'2', name:'Serviços'}, {id:'3', name:'Alimentação'}]);
    if (missingTables.has('categories')) return local;
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error || !data) return local;
      return data.map(c => ({ id: String(c.id), name: c.name }));
    } catch { return local; }
  }
};
