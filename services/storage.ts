
import { User, Post, UserRole, ProfessionCategory, PaymentStatus, SiteConfig, Plan } from '../types';
import { supabase } from './supabase';

const DEFAULT_CONFIG: SiteConfig = {
  heroLabel: 'Hélio Júnior',
  heroTitle: 'Portal de Classificados',
  heroSubtitle: 'Destaque para sua empresa e serviços com a credibilidade de quem entende de comunicação.',
  heroImageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=800'
};

const DEFAULT_PLANS: Plan[] = [
  { id: 'p1', name: 'Plano Bronze', price: 49.90, description: 'Anúncio simples por 30 dias.' },
  { id: 'p2', name: 'Plano Prata', price: 89.90, description: 'Destaque nas buscas e 30 dias.' },
  { id: 'p3', name: 'Plano Ouro', price: 129.90, description: 'Topo do portal e IA ilimitada.' }
];

export const storageService = {
  init: async () => {
    try {
      if (!supabase) return;
      await storageService.checkExpirations();
    } catch (e) {
      console.error("Erro storage init:", e);
    }
  },

  checkExpirations: async () => {
    if (!supabase) return;
    try {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('payment_status', PaymentStatus.CONFIRMED);

      if (!users) return;

      const now = new Date();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      for (const user of users) {
        if (user.role === UserRole.ADMIN) continue;
        if (user.payment_confirmed_at) {
          const confirmedDate = new Date(user.payment_confirmed_at);
          const diff = now.getTime() - confirmedDate.getTime();
          if (diff > thirtyDaysInMs) {
            await supabase
              .from('users')
              .update({ payment_status: PaymentStatus.AWAITING, payment_confirmed_at: null })
              .eq('id', user.id);
          }
        }
      }
    } catch (e) {
      console.warn("Falha ao verificar expirações no Supabase.");
    }
  },

  getConfig: async (): Promise<SiteConfig> => {
    try {
      if (!supabase) return DEFAULT_CONFIG;
      const { data, error } = await supabase.from('site_config').select('*').single();
      if (error || !data) return DEFAULT_CONFIG;
      return {
        heroTitle: data.hero_title,
        heroSubtitle: data.hero_subtitle,
        heroImageUrl: data.hero_image_url,
        heroLabel: data.hero_label
      };
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  },

  getPlans: async (): Promise<Plan[]> => {
    // Primeiro tenta buscar do LocalStorage (cache rápido)
    const cached = localStorage.getItem('helio_plans_cache');
    let plans = cached ? JSON.parse(cached) : DEFAULT_PLANS;

    try {
      if (!supabase) return plans;
      const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true });
      if (!error && data && data.length > 0) {
        plans = data;
        localStorage.setItem('helio_plans_cache', JSON.stringify(plans));
      }
    } catch (e) {
      console.warn("Erro ao carregar planos do banco, usando cache/padrões.");
    }
    return plans;
  },

  getUsers: async (): Promise<User[]> => {
    try {
      if (!supabase) return [];
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      return (data || []).map(u => ({
        ...u,
        paymentStatus: u.payment_status,
        paymentConfirmedAt: u.payment_confirmed_at,
        createdAt: u.created_at,
        planId: u.plan_id
      }));
    } catch (e) {
      return [];
    }
  },

  getPosts: async (): Promise<Post[]> => {
    try {
      if (!supabase) return [];
      const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      return (data || []).map(p => ({
        ...p,
        authorId: p.author_id,
        authorName: p.author_name,
        imageUrl: p.image_url,
        createdAt: p.created_at
      }));
    } catch (e) {
      return [];
    }
  },

  findUserByEmail: async (email: string): Promise<User | undefined> => {
    try {
      if (email === 'admin@helio.com') {
          return { id: 'admin', name: 'Administrador', email: 'admin@helio.com', role: UserRole.ADMIN, paymentStatus: PaymentStatus.NOT_APPLICABLE, createdAt: new Date().toISOString() };
      }
      if (!supabase) return undefined;
      const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (!data) return undefined;
      return {
        ...data,
        paymentStatus: data.payment_status,
        paymentConfirmedAt: data.payment_confirmed_at,
        createdAt: data.created_at,
        planId: data.plan_id
      };
    } catch (e) {
      return undefined;
    }
  },

  updateConfig: async (config: SiteConfig) => {
    if (!supabase) return;
    try {
      await supabase.from('site_config').update({
        hero_title: config.heroTitle,
        hero_subtitle: config.heroSubtitle,
        hero_image_url: config.heroImageUrl,
        hero_label: config.heroLabel
      }).eq('id', 1);
    } catch (e) {
      console.error("Erro ao atualizar config:", e);
    }
  },

  addUser: async (user: any) => {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase.from('users').insert([{
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      profession: user.profession,
      payment_status: user.paymentStatus
    }]).select().single();
    if (error) throw error;
    return { ...data, paymentStatus: data.payment_status, createdAt: data.created_at };
  },

  updateUser: async (updatedUser: User) => {
    if (!supabase) return;
    try {
      const updateData: any = {
        name: updatedUser.name,
        payment_status: updatedUser.paymentStatus,
        profession: updatedUser.profession,
        plan_id: updatedUser.planId,
        payment_confirmed_at: updatedUser.paymentStatus === PaymentStatus.CONFIRMED ? new Date().toISOString() : null
      };
      await supabase.from('users').update(updateData).eq('id', updatedUser.id);
    } catch (e) {
      console.error("Erro ao atualizar usuário:", e);
    }
  },

  addPost: async (post: Post) => {
    if (!supabase) return;
    try {
      await supabase.from('posts').insert([{
        author_id: post.authorId,
        author_name: post.authorName,
        category: post.category,
        title: post.title,
        content: post.content,
        image_url: post.imageUrl
      }]);
    } catch (e) {
      console.error("Erro ao adicionar post:", e);
    }
  },
  
  deletePost: async (postId: string) => {
    if (!supabase) return;
    try {
      await supabase.from('posts').delete().eq('id', postId);
    } catch (e) {
      console.error("Erro ao deletar post:", e);
    }
  },

  updatePlans: async (plans: Plan[]) => {
    // Salva sempre no LocalStorage primeiro para garantir que a interface "funcione" imediatamente
    localStorage.setItem('helio_plans_cache', JSON.stringify(plans));

    if (!supabase) return;
    
    try {
      // Tenta limpar e reinserir no banco
      await supabase.from('plans').delete().neq('id', '_none_');
      if (plans.length > 0) {
        const payload = plans.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description
        }));
        const { error } = await supabase.from('plans').insert(payload);
        if (error) throw error;
      }
    } catch (e) {
      console.error("Erro ao sincronizar planos com Supabase:", e);
      // Não lançamos erro aqui para não travar a UI, já que o LocalStorage foi atualizado
    }
  }
};
