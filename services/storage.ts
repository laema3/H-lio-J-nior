
import { User, Post, UserRole, PaymentStatus, SiteConfig, Plan } from '../types';
import { db, isSupabaseReady } from './supabase';

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
  heroImageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=1200&h=675',
  address: 'Sua Cidade - Estado',
  phone: '(00) 0000-0000',
  whatsapp: '(00) 90000-0000',
  instagramUrl: 'https://instagram.com',
  facebookUrl: 'https://facebook.com',
  youtubeUrl: 'https://youtube.com'
};

export const INITIAL_CATEGORIES = [
  'Construção e Reformas', 'Educação', 'Festas e Eventos', 'Jurídico', 'Outros', 
  'Radialista/Mídia', 'Saúde e Bem-estar', 'Tecnologia e Design'
];

export const saveToLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getFromLocal = (key: string, defaultValue: any) => {
  const item = localStorage.getItem(key);
  if (item === null) return defaultValue;
  try {
    return JSON.parse(item);
  } catch {
    return defaultValue;
  }
};

export const storageService = {
  init: async () => {
    if (localStorage.getItem(STORAGE_KEYS.CONFIG) === null) saveToLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    if (localStorage.getItem(STORAGE_KEYS.CATEGORIES) === null) saveToLocal(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  async getConfig(): Promise<SiteConfig> {
    const remote = await db.getConfig();
    if (remote) {
        saveToLocal(STORAGE_KEYS.CONFIG, remote);
        return remote;
    }
    return getFromLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  },
  
  async updateConfig(config: SiteConfig) {
    saveToLocal(STORAGE_KEYS.CONFIG, config);
    await db.updateConfig(config);
  },

  async getCategories(): Promise<string[]> {
    const remote = await db.getCategories();
    if (remote && remote.length > 0) {
        saveToLocal(STORAGE_KEYS.CATEGORIES, remote);
        return remote;
    }
    return getFromLocal(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  async saveCategories(categories: string[]) {
    saveToLocal(STORAGE_KEYS.CATEGORIES, categories);
    await db.saveCategories(categories);
  },

  async getUsers(): Promise<User[]> {
    const remote = await db.getUsers();
    if (remote && remote.length > 0) return remote;
    return getFromLocal(STORAGE_KEYS.USERS, []);
  },
  
  async getPosts(): Promise<Post[]> {
    const remote = await db.getPosts();
    if (remote && remote.length > 0) return remote;
    return getFromLocal(STORAGE_KEYS.POSTS, []);
  },

  async findUserByEmail(email: string): Promise<User | undefined> {
    // Admin Master sempre disponível via código se Supabase falhar
    if (email.toLowerCase() === 'admin@helio.com') {
      return { id: 'admin', name: 'Administrador', email: 'admin@helio.com', role: UserRole.ADMIN, paymentStatus: PaymentStatus.NOT_APPLICABLE, createdAt: new Date().toISOString() };
    }
    const remote = await db.findUserByEmail(email);
    if (remote) return remote;
    
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    return users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
  },

  async addUser(userData: any) {
    const newUser: User = { ...userData, id: 'u-' + Date.now(), createdAt: new Date().toISOString() };
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    saveToLocal(STORAGE_KEYS.USERS, [...users, newUser]);
    await db.updateUser(newUser);
    return newUser;
  },

  async updateUser(updatedUser: User) {
    await db.updateUser(updatedUser);
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    saveToLocal(STORAGE_KEYS.USERS, users.map((u: User) => u.id === updatedUser.id ? updatedUser : u));
    const session = getFromLocal(STORAGE_KEYS.SESSION, null);
    if (session && session.id === updatedUser.id) saveToLocal(STORAGE_KEYS.SESSION, updatedUser);
  },

  async addPost(post: Post) {
    const posts = getFromLocal(STORAGE_KEYS.POSTS, []);
    saveToLocal(STORAGE_KEYS.POSTS, [post, ...posts]);
    await db.addPost(post);
  },

  async deletePost(id: string) {
    const posts = getFromLocal(STORAGE_KEYS.POSTS, []);
    saveToLocal(STORAGE_KEYS.POSTS, posts.filter((p: Post) => p.id !== id));
    await db.deletePost(id);
  },

  getPlans(): Plan[] {
    return getFromLocal(STORAGE_KEYS.PLANS, [
        { id: 'p_mon', name: 'Mensal', price: 49.90, durationDays: 30, description: 'Plano de 30 dias' },
        { id: 'p_tri', name: 'Trimestral', price: 129.90, durationDays: 90, description: 'Plano de 90 dias' },
        { id: 'p_ann', name: 'Anual', price: 399.90, durationDays: 365, description: 'Plano de 365 dias' }
    ]);
  }
};
