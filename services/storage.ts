
import { User, Post, UserRole, ProfessionCategory, PaymentStatus, SiteConfig, Plan } from '../types';
import { supabase, isSupabaseReady } from './supabase';

const STORAGE_KEYS = {
  CONFIG: 'helio_config_v1',
  PLANS: 'helio_plans_v1',
  USERS: 'helio_users_v1',
  POSTS: 'helio_posts_v1',
  SESSION: 'helio_session_v1'
};

export const DEFAULT_CONFIG: SiteConfig = {
  heroLabel: 'Hélio Júnior',
  heroTitle: 'Portal de Classificados',
  heroSubtitle: 'Destaque para sua empresa e serviços com a credibilidade de quem entende de comunicação.',
  heroImageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=800'
};

const DEFAULT_PLANS: Plan[] = [
  { id: 'p0', name: 'Plano Gratuito', price: 0.00, description: 'Experimente por 30 dias sem custo.' },
  { id: 'p1', name: 'Plano Bronze', price: 49.90, description: 'Anúncio simples por 30 dias.' },
  { id: 'p2', name: 'Plano Prata', price: 89.90, description: 'Destaque nas buscas e 30 dias.' },
  { id: 'p3', name: 'Plano Ouro', price: 129.90, description: 'Topo do portal e IA ilimitada.' }
];

const SEED_POSTS: Post[] = [
  {
    id: 'seed-1',
    authorId: 'admin',
    authorName: 'Hélio Júnior',
    category: ProfessionCategory.RADIO,
    title: 'Publicidade em Rádio e Carro de Som',
    content: 'Leve sua marca para toda a cidade com a voz que o povo confia. Gravação de spots e campanhas profissionais.',
    whatsapp: '5500999999999',
    phone: '00999999999',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=400',
    createdAt: new Date().toISOString(),
    likes: 12
  }
];

// Helper para persistência segura
const saveToLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Erro ao salvar no LocalStorage (${key}):`, e);
  }
};

const getFromLocal = (key: string, defaultValue: any) => {
  const item = localStorage.getItem(key);
  if (!item) return defaultValue;
  try {
    return JSON.parse(item);
  } catch (e) {
    console.error(`Erro ao ler do LocalStorage (${key}):`, e);
    return defaultValue;
  }
};

export const storageService = {
  init: async () => {
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) saveToLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    if (!localStorage.getItem(STORAGE_KEYS.PLANS)) saveToLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
    if (!localStorage.getItem(STORAGE_KEYS.POSTS)) saveToLocal(STORAGE_KEYS.POSTS, SEED_POSTS);
    
    if (isSupabaseReady()) {
      try {
        await storageService.checkExpirations();
      } catch (e) {}
    }
  },

  checkExpirations: async () => {
    if (!supabase) return;
    try {
      const { data: users } = await supabase.from('users').select('*').eq('payment_status', PaymentStatus.CONFIRMED);
      if (!users) return;
      const now = new Date();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      for (const user of users) {
        if (user.role === UserRole.ADMIN) continue;
        if (user.payment_confirmed_at) {
          const confirmedDate = new Date(user.payment_confirmed_at);
          if (now.getTime() - confirmedDate.getTime() > thirtyDaysInMs) {
            await supabase.from('users').update({ payment_status: PaymentStatus.AWAITING, payment_confirmed_at: null }).eq('id', user.id);
          }
        }
      }
    } catch (e) {}
  },

  getConfig: async (): Promise<SiteConfig> => {
    const local = getFromLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    if (isSupabaseReady()) {
      try {
        const { data } = await supabase!.from('site_config').select('*').single();
        if (data) {
          const remote = { heroTitle: data.hero_title, heroSubtitle: data.hero_subtitle, heroImageUrl: data.hero_image_url, heroLabel: data.hero_label };
          saveToLocal(STORAGE_KEYS.CONFIG, remote);
          return remote;
        }
      } catch (e) {}
    }
    return local;
  },

  getPlans: async (): Promise<Plan[]> => {
    const local = getFromLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
    if (isSupabaseReady()) {
      try {
        const { data } = await supabase!.from('plans').select('*').order('price', { ascending: true });
        if (data && data.length > 0) {
          saveToLocal(STORAGE_KEYS.PLANS, data);
          return data;
        }
      } catch (e) {}
    }
    return local;
  },

  getUsers: async (): Promise<User[]> => {
    const local = getFromLocal(STORAGE_KEYS.USERS, []);
    if (isSupabaseReady()) {
      try {
        const { data } = await supabase!.from('users').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          const users = data.map((u: any) => ({ ...u, paymentStatus: u.payment_status, paymentConfirmedAt: u.payment_confirmed_at, createdAt: u.created_at, planId: u.plan_id }));
          saveToLocal(STORAGE_KEYS.USERS, users);
          return users;
        }
      } catch (e) {}
    }
    return local;
  },

  getPosts: async (): Promise<Post[]> => {
    const local = getFromLocal(STORAGE_KEYS.POSTS, SEED_POSTS);
    if (isSupabaseReady()) {
      try {
        const { data } = await supabase!.from('posts').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          const posts = data.map((p: any) => ({ ...p, authorId: p.author_id, authorName: p.author_name, imageUrl: p.image_url, createdAt: p.created_at }));
          saveToLocal(STORAGE_KEYS.POSTS, posts);
          return posts;
        }
      } catch (e) {}
    }
    return local;
  },

  findUserByEmail: async (email: string): Promise<User | undefined> => {
    if (email === 'admin@helio.com') {
      return { id: 'admin', name: 'Administrador', email: 'admin@helio.com', role: UserRole.ADMIN, paymentStatus: PaymentStatus.NOT_APPLICABLE, createdAt: new Date().toISOString() };
    }
    const users = await storageService.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  updateConfig: async (config: SiteConfig) => {
    saveToLocal(STORAGE_KEYS.CONFIG, config);
    if (isSupabaseReady()) {
      try {
        await supabase!.from('site_config').update({ hero_title: config.heroTitle, hero_subtitle: config.heroSubtitle, hero_image_url: config.heroImageUrl, hero_label: config.heroLabel }).eq('id', 1);
      } catch (e) {}
    }
  },

  addUser: async (user: any) => {
    const newUser: User = { ...user, id: 'u-' + Date.now(), createdAt: new Date().toISOString() };
    const users = await storageService.getUsers();
    const updated = [...users, newUser];
    saveToLocal(STORAGE_KEYS.USERS, updated);
    if (isSupabaseReady()) {
      try {
        await supabase!.from('users').insert([{ id: newUser.id, name: user.name, email: user.email, password: user.password, role: user.role, profession: user.profession, payment_status: user.paymentStatus }]);
      } catch (e) {}
    }
    return newUser;
  },

  updateUser: async (updatedUser: User) => {
    const users = await storageService.getUsers();
    const updatedList = users.map((u: User) => u.id === updatedUser.id ? updatedUser : u);
    if (!users.find((u: User) => u.id === updatedUser.id)) updatedList.push(updatedUser);
    saveToLocal(STORAGE_KEYS.USERS, updatedList);
    
    // Atualiza a sessão local se for o usuário logado
    const session = getFromLocal(STORAGE_KEYS.SESSION, null);
    if (session && session.id === updatedUser.id) {
      saveToLocal(STORAGE_KEYS.SESSION, updatedUser);
    }

    if (isSupabaseReady()) {
      try {
        await supabase!.from('users').update({ 
          name: updatedUser.name, 
          payment_status: updatedUser.paymentStatus, 
          profession: updatedUser.profession, 
          plan_id: updatedUser.planId, 
          payment_confirmed_at: updatedUser.paymentStatus === PaymentStatus.CONFIRMED ? (updatedUser.paymentConfirmedAt || new Date().toISOString()) : null 
        }).eq('id', updatedUser.id);
      } catch (e) {}
    }
  },

  addPost: async (post: Post) => {
    const posts = await storageService.getPosts();
    
    // Verificações de limite apenas para anunciantes comuns
    if (post.authorId !== 'admin') {
      const userPosts = posts.filter((p: Post) => p.authorId === post.authorId);
      const now = new Date();
      
      // 1. Limite de 4 anúncios nos últimos 30 dias
      const last30Days = userPosts.filter((p: Post) => {
        const pDate = new Date(p.createdAt);
        const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      });

      if (last30Days.length >= 4) {
        throw new Error("Você atingiu o limite de 4 anúncios por mês.");
      }

      // 2. Limite de 1 anúncio a cada 7 dias
      if (userPosts.length > 0) {
        const latestPost = userPosts.reduce((prev: Post, curr: Post) => 
          new Date(prev.createdAt) > new Date(curr.createdAt) ? prev : curr
        );
        const latestDate = new Date(latestPost.createdAt);
        const diffDays = (now.getTime() - latestDate.getTime()) / (1000 * 3600 * 24);
        
        if (diffDays < 7) {
          const daysLeft = Math.ceil(7 - diffDays);
          throw new Error(`Limite de 1 anúncio por semana. Aguarde mais ${daysLeft} dia(s).`);
        }
      }
    }

    const newList = [post, ...posts];
    saveToLocal(STORAGE_KEYS.POSTS, newList);
    
    if (isSupabaseReady()) {
      try {
        await supabase!.from('posts').insert([{ 
          id: post.id, 
          author_id: post.authorId, 
          author_name: post.authorName, 
          category: post.category, 
          title: post.title, 
          content: post.content, 
          image_url: post.imageUrl, 
          whatsapp: post.whatsapp, 
          phone: post.phone 
        }]);
      } catch (e) {}
    }
  },

  updatePost: async (post: Post) => {
    const posts = await storageService.getPosts();
    const updated = posts.map((p: Post) => p.id === post.id ? post : p);
    saveToLocal(STORAGE_KEYS.POSTS, updated);
    if (isSupabaseReady()) {
      try {
        await supabase!.from('posts').update({ 
          category: post.category, 
          title: post.title, 
          content: post.content, 
          image_url: post.imageUrl, 
          whatsapp: post.whatsapp, 
          phone: post.phone 
        }).eq('id', post.id);
      } catch (e) {}
    }
  },

  deletePost: async (postId: string) => {
    const posts = await storageService.getPosts();
    const filtered = posts.filter((p: Post) => p.id !== postId);
    saveToLocal(STORAGE_KEYS.POSTS, filtered);
    if (isSupabaseReady()) {
      try {
        await supabase!.from('posts').delete().eq('id', postId);
      } catch (e) {}
    }
  },

  updatePlans: async (plans: Plan[]) => {
    saveToLocal(STORAGE_KEYS.PLANS, plans);
    if (isSupabaseReady()) {
      try {
        await supabase!.from('plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (plans.length > 0) {
          const payload = plans.map(p => ({ 
            id: p.id.includes('plan-') ? undefined : p.id, 
            name: p.name, 
            price: p.price, 
            description: p.description 
          }));
          await supabase!.from('plans').insert(payload);
        }
      } catch (e) {}
    }
  }
};
