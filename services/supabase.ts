
import { createClient } from '@supabase/supabase-js';
import { PaymentStatus, UserRole, Plan, Category, Post, SiteConfig, User, PaymentMethod } from '../types';

const SUPABASE_URL = 'https://yzufoswsajzbovmcwscl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dWZvc3dzYWp6Ym92bWN3c2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzI4MTMsImV4cCI6MjA4NjkwODgxM30.R8pCkQQbe4ezyFyDmQBHanPhjsKJF-qX3KLsyxHHNsM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEYS = {
  CONFIG: 'hj_fallback_config_v2',
  PLANS: 'hj_fallback_plans_v2',
  USERS: 'hj_fallback_users_v2',
  POSTS: 'hj_fallback_posts_v2',
  CATEGORIES: 'hj_fallback_categories_v2',
  PAYMENT_METHODS: 'hj_fallback_payment_methods_v2'
};









async function resilientUpsert(table: string, payload: Record<string, any>): Promise<void> {
    const { error } = await supabase.from(table).upsert(payload);
    if (error) {
        console.error(`Supabase error on table ${table}:`, error);
        throw new Error(`Falha ao salvar dados na tabela ${table}: ${error.message}`);
    }
}

export const db = {
  async init() {
    try {
      // Check if admin user exists, create if not
      const { data: adminUser, error: adminError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'admin@helio.com')
        .maybeSingle();

      if (adminError) {
        console.error('Supabase init admin check error:', adminError);
        throw new Error('Failed to check admin user.');
      }

      if (!adminUser) {
        const newAdmin = {
          id: 'admin_id',
          name: 'Admin',
          email: 'admin@helio.com'.toLowerCase(),
          password: 'admin',
          role: UserRole.ADMIN,
          phone: '5534999982000',
          paymentStatus: PaymentStatus.CONFIRMED,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        await resilientUpsert('profiles', newAdmin);
        console.log('Admin user created successfully.');
      }

      // Check if second admin user exists, create if not
      const { data: secondAdminUser, error: secondAdminError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'lazaro@helio.com')
        .maybeSingle();

      if (secondAdminError) {
        console.error('Supabase init second admin check error:', secondAdminError);
        throw new Error('Failed to check second admin user.');
      }

      if (!secondAdminUser) {
        const newSecondAdmin = {
          id: 'second_admin_id',
          name: 'Second Admin',
          email: 'lazaro@helio.com'.toLowerCase(),
          password: 'admlsg*30*',
          role: UserRole.ADMIN,
          phone: '5534999982000',
          paymentStatus: PaymentStatus.CONFIRMED,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        await resilientUpsert('profiles', newSecondAdmin);
        console.log('Second admin user created successfully.');
      }
    } catch (error: any) {
      console.error('Supabase init error:', error);
      throw new Error(`Initialization failed: ${error.message}`);
    }
  },

  async getConfig(): Promise<SiteConfig> {
    const fallback = {
        heroLabel: 'Hélio Júnior',
        heroTitle: 'Voz que Vende',
        heroSubtitle: 'Seu portal de classificados com o impacto do rádio digital.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920',
        maintenanceMode: false
    };

    try {
      const { data, error } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
      if (error || !data) return fallback;
      return { ...fallback, ...data, maintenanceMode: !!data.maintenancemode };
    } catch (error: any) { 
        console.error("Supabase getConfig error:", error);
        return fallback; 
    }
  },

  async updateConfig(config: SiteConfig) {
    const { error } = await supabase.from('site_config').upsert({ id: 1, ...config, maintenancemode: config.maintenanceMode });
    if (error) {
        console.error('Supabase updateConfig error:', error);
        throw new Error(`Falha ao salvar configurações: ${error.message}`);
    }
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data, error } = await supabase.from('payment_methods').select('*');
    if (error) {
        console.error('Supabase getPaymentMethods error:', error);
        return [];
    }
    return data || [];
  },

  async savePaymentMethod(method: Partial<PaymentMethod>) {
    const newId = method.id || String(Date.now());
    const newMethod = { ...method, id: newId } as PaymentMethod;
    await resilientUpsert('payment_methods', { id: newId, name: newMethod.name, details: newMethod.details, enabled: newMethod.enabled });
  },

  async deletePaymentMethod(id: string) {
    await supabase.from('payment_methods').delete().match({ id });
  },

  async getPlans(): Promise<Plan[]> {
    const { data, error } = await supabase.from('plans').select('*');
    if (error) {
        console.error('Supabase getPlans error:', error);
        return [];
    }
    return data ? data.map(p => ({...p, durationDays: p.duration_days, price: Number(p.price) || 0})) : [];
  },

  async savePlan(plan: Partial<Plan>) {
    const newId = plan.id || String(Date.now());
    const newPlan = { ...plan, id: newId } as Plan;
    await resilientUpsert('plans', { id: newId, name: newPlan.name, price: newPlan.price, duration_days: newPlan.durationDays, description: newPlan.description });
  },

  // Added deletePlan method to fix errors in index.tsx and App.tsx
  async deletePlan(id: string) {
    
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Supabase deletePlan error:", error);
    }
  },

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error('Supabase getUsers error:', error);
        return [];
    }
    return data ? data.map(u => ({ 
        ...u, 
        id: String(u.id), 
        role: u.role as UserRole,
        planId: u.plan_id,
        expiresAt: u.expires_at,
    })) : [];
  },

  async authenticate(email: string, pass: string): Promise<User | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('password', pass)
            .maybeSingle();

        if (error) {
            console.error("Supabase authentication error:", error);
            return null;
        }

        if (data && data.status !== 'BLOCKED') {
            return { 
                ...data, 
                id: String(data.id), 
                role: data.role as UserRole,
                planId: data.plan_id,
                expiresAt: data.expires_at
            };
        }
    } catch (error: any) { 
        console.error("Exception in authentication:", error);
    }

    return null;
  },

  async addUser(user: Partial<User>) {
    const { data, error } = await supabase.from('profiles').select('*').eq('email', user.email?.toLowerCase()).maybeSingle();
    if (error) {
        console.error('Supabase addUser error:', error);
        throw new Error('Erro ao verificar e-mail.');
    }
    if (data) {
        throw new Error('Este e-mail já está em uso. Tente fazer login.');
    }
    const newId = String(Date.now());
    const newUser = { ...user, id: newId, createdAt: new Date().toISOString(), status: 'ACTIVE' } as User;
    await resilientUpsert('profiles', { id: newId, name: newUser.name, email: newUser.email, password: newUser.password, role: newUser.role, status: newUser.status });
    return newUser;
  },

  async updateUser(user: User) {
    
    const { id, name, status, planId, expiresAt } = user;
    await resilientUpsert('profiles', { id, name, status, plan_id: planId, expires_at: expiresAt });
  },

  // Added deleteUser method to fix errors in index.tsx and App.tsx
  async deleteUser(id: string) {
    
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Supabase deleteUser error:", error);
    }
  },

  async getPosts(): Promise<Post[]> {
    const { data, error } = await supabase.from('posts').select('*').order('id', { ascending: false });
    if (error) {
        console.error('Supabase getPosts error:', error);
        return [];
    }
    return data ? data.map(p => {
        console.log("Raw post data from Supabase:", p);
        return { ...p, id: String(p.id), logoUrl: p.logo_url, imageUrls: p.imageurls || [], phone: p.phone, whatsapp: p.whatsapp, website: p.website, approved: p.approved, category: p.category ? (p.category as string).toLowerCase().trim() : undefined };
    }) : [];
  },

  async savePost(post: Partial<Post>) {
    const newId = post.id || String(Date.now());
    const newPost = { ...post, id: newId, createdAt: post.createdAt || new Date().toISOString() } as Post;
    await resilientUpsert('posts', { id: newId, title: newPost.title, content: newPost.content, category: newPost.category ? newPost.category.toLowerCase().trim() : undefined, logo_url: newPost.logoUrl, phone: newPost.phone, whatsapp: newPost.whatsapp, website: newPost.website, approved: newPost.approved });
  },

  async deletePost(id: string) {
    
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Supabase deletePost error:", error);
    }
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
        console.error('Supabase getCategories error:', error);
        return [];
    }
    return data ? data.map(c => ({ ...c, name: c.name ? c.name.toLowerCase().trim() : undefined })) : [];
  },

  async saveCategory(category: Partial<Category>) {
    const newId = category.id || String(Date.now());
    const newCategory = { ...category, id: newId } as Category;
    await resilientUpsert('categories', { id: newId, name: newCategory.name ? newCategory.name.toLowerCase().trim() : undefined });
  },

  async deleteCategory(id: string) {
    await supabase.from('categories').delete().match({ id });
  },
};
