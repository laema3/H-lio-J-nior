
import { User, Post, UserRole, PaymentStatus, SiteConfig, Plan } from '../types';

const KEY_PREFIX = 'helio_v3_';

export const STORAGE_KEYS = {
  CONFIG: `${KEY_PREFIX}config`,
  PLANS: `${KEY_PREFIX}plans`,
  USERS: `${KEY_PREFIX}users`,
  POSTS: `${KEY_PREFIX}posts`,
  SESSION: `${KEY_PREFIX}session`,
  CATEGORIES: `${KEY_PREFIX}categories`
};

export const DEFAULT_CONFIG: SiteConfig = {
  heroLabel: 'Hélio Júnior',
  heroTitle: 'Portal de Classificados',
  heroSubtitle: 'Destaque sua marca com a credibilidade de quem entende de comunicação.',
  heroImageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=1200&h=675'
};

export const INITIAL_CATEGORIES = [
  'Construção e Reformas',
  'Educação',
  'Festas e Eventos',
  'Jurídico',
  'Outros',
  'Radialista/Mídia',
  'Saúde e Bem-estar',
  'Tecnologia e Design'
];

const DEFAULT_PLANS: Plan[] = [
  { id: 'p_free', name: 'Grátis', price: 0, durationDays: 30, description: '30 dias de teste' },
  { id: 'p_mon', name: 'Mensal', price: 49.90, durationDays: 30, description: 'Plano de 30 dias' },
  { id: 'p_tri', name: 'Trimestral', price: 129.90, durationDays: 90, description: 'Plano de 90 dias' },
  { id: 'p_sem', name: 'Semestral', price: 229.90, durationDays: 180, description: 'Plano de 180 dias' },
  { id: 'p_ann', name: 'Anual', price: 399.90, durationDays: 365, description: 'Plano de 365 dias' }
];

export const saveToLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getFromLocal = (key: string, defaultValue: any) => {
  const item = localStorage.getItem(key);
  if (!item) return defaultValue;
  try {
    const parsed = JSON.parse(item);
    return parsed;
  } catch {
    return defaultValue;
  }
};

export const storageService = {
  init: () => {
    // Inicialização síncrona para garantir que os dados existam antes do React renderizar
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) saveToLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    if (!localStorage.getItem(STORAGE_KEYS.PLANS)) saveToLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) saveToLocal(STORAGE_KEYS.USERS, []);
    if (!localStorage.getItem(STORAGE_KEYS.POSTS)) saveToLocal(STORAGE_KEYS.POSTS, []);
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) saveToLocal(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  getConfig: (): SiteConfig => {
    return getFromLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  },

  updateConfig: async (config: SiteConfig): Promise<void> => {
    saveToLocal(STORAGE_KEYS.CONFIG, config);
  },

  getCategories: (): string[] => {
    const categories = getFromLocal(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    return [...categories].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  saveCategories: async (categories: string[]): Promise<void> => {
    saveToLocal(STORAGE_KEYS.CATEGORIES, categories);
  },

  getPlans: (): Plan[] => {
    return getFromLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
  },

  savePlans: async (plans: Plan[]): Promise<void> => {
    saveToLocal(STORAGE_KEYS.PLANS, plans);
  },

  getUsers: (): User[] => {
    return getFromLocal(STORAGE_KEYS.USERS, []);
  },

  getPosts: (): Post[] => {
    return getFromLocal(STORAGE_KEYS.POSTS, []);
  },

  findUserByEmail: (email: string): User | undefined => {
    if (email.toLowerCase() === 'admin@helio.com') {
      return { id: 'admin', name: 'Administrador', email: 'admin@helio.com', role: UserRole.ADMIN, paymentStatus: PaymentStatus.NOT_APPLICABLE, createdAt: new Date().toISOString() };
    }
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    return users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
  },

  addUser: async (userData: any) => {
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    const newUser: User = { ...userData, id: 'u-' + Date.now(), createdAt: new Date().toISOString() };
    saveToLocal(STORAGE_KEYS.USERS, [...users, newUser]);
    return newUser;
  },

  updateUser: async (updatedUser: User) => {
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    const newList = users.map((u: User) => u.id === updatedUser.id ? updatedUser : u);
    saveToLocal(STORAGE_KEYS.USERS, newList);
    
    const session = getFromLocal(STORAGE_KEYS.SESSION, null);
    if (session && session.id === updatedUser.id) saveToLocal(STORAGE_KEYS.SESSION, updatedUser);
  },

  addPost: async (post: Post) => {
    const posts = getFromLocal(STORAGE_KEYS.POSTS, []);
    saveToLocal(STORAGE_KEYS.POSTS, [post, ...posts]);
  },

  updatePost: async (post: Post) => {
    const posts = getFromLocal(STORAGE_KEYS.POSTS, []);
    saveToLocal(STORAGE_KEYS.POSTS, posts.map((p: Post) => p.id === post.id ? post : p));
  },

  deletePost: async (id: string) => {
    const posts = getFromLocal(STORAGE_KEYS.POSTS, []);
    saveToLocal(STORAGE_KEYS.POSTS, posts.filter((p: Post) => p.id !== id));
  }
};
