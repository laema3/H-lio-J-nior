
import { User, Post, UserRole, PaymentStatus, SiteConfig, Plan } from '../types';
import { db, isSupabaseReady } from './supabase';

const KEY_PREFIX = 'helio_v4_';

export const STORAGE_KEYS = {
  CONFIG: `${KEY_PREFIX}config`,
  PLANS: `${KEY_PREFIX}plans`,
  USERS: `${KEY_PREFIX}users`,
  POSTS: `${KEY_PREFIX}posts`,
  SESSION: `${KEY_PREFIX}session`,
  CATEGORIES: `${KEY_PREFIX}categories`
};

const DEFAULT_PLANS: Plan[] = [
  { id: 'p_free', name: 'Degustação', price: 0, durationDays: 30, description: '30 dias grátis para novos usuários' },
  { id: 'p_mon', name: 'Mensal', price: 49.90, durationDays: 30, description: 'Exposição mensal no portal' }
];

export const DEFAULT_CONFIG: SiteConfig = {
  heroLabel: 'Hélio Júnior',
  heroTitle: 'Portal de Classificados',
  heroSubtitle: 'Destaque sua marca com a credibilidade de quem entende de rádio.',
  heroImageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200',
  address: 'Sua Cidade - Estado',
  phone: '(00) 0000-0000',
  whatsapp: '(00) 90000-0000',
  pixKey: '',
  pixName: ''
};

export const INITIAL_CATEGORIES = ['Comércio', 'Serviços', 'Saúde', 'Educação', 'Eventos', 'Outros'];

export const saveToLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
export const getFromLocal = (key: string, defaultValue: any) => {
  const item = localStorage.getItem(key);
  if (!item) return defaultValue;
  try { return JSON.parse(item); } catch { return defaultValue; }
};

export const storageService = {
  init: async () => {
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) saveToLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) saveToLocal(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  async getPlans(): Promise<Plan[]> {
    const local = getFromLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
    if (isSupabaseReady()) {
      try {
        const remote = await db.getPlans();
        if (remote && remote.length > 0) {
          saveToLocal(STORAGE_KEYS.PLANS, remote);
          return remote as Plan[];
        } else if (local.length > 0) {
          // Se o banco estiver vazio mas houver local, sobe para o banco
          for (const p of local) await db.savePlan(p);
        }
      } catch {}
    }
    return local;
  },

  async savePlan(plan: Plan) {
    if (isSupabaseReady()) await db.savePlan(plan);
    const plans = await this.getPlans();
    const updated = plans.some(p => p.id === plan.id) 
      ? plans.map(p => p.id === plan.id ? plan : p)
      : [...plans, plan];
    saveToLocal(STORAGE_KEYS.PLANS, updated);
  },

  async deletePlan(id: string) {
    if (isSupabaseReady()) await db.deletePlan(id);
    const plans = await this.getPlans();
    saveToLocal(STORAGE_KEYS.PLANS, plans.filter(p => p.id !== id));
  },

  async getConfig(): Promise<SiteConfig> {
    const local = getFromLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    if (isSupabaseReady()) {
      try {
        const remote = await db.getConfig();
        if (remote) return remote as SiteConfig;
      } catch {}
    }
    return local;
  },

  async updateConfig(config: SiteConfig) {
    saveToLocal(STORAGE_KEYS.CONFIG, config);
    if (isSupabaseReady()) await db.updateConfig(config);
  },

  async getUsers(): Promise<User[]> {
    if (isSupabaseReady()) return await db.getUsers() as any;
    return getFromLocal(STORAGE_KEYS.USERS, []);
  },

  async getPosts(): Promise<Post[]> {
    if (isSupabaseReady()) return await db.getPosts() as any;
    return getFromLocal(STORAGE_KEYS.POSTS, []);
  },

  async findUserByEmail(email: string): Promise<User | undefined> {
    if (email.toLowerCase() === 'admin@helio.com') {
      return { id: 'admin', name: 'Hélio Júnior', email: 'admin@helio.com', role: UserRole.ADMIN, paymentStatus: PaymentStatus.NOT_APPLICABLE, createdAt: new Date().toISOString() };
    }
    if (isSupabaseReady()) return await db.findUserByEmail(email) as any;
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    return users.find((u: User) => u.email === email.toLowerCase());
  },

  async addUser(userData: any) {
    const newUser: User = { ...userData, id: 'u-' + Date.now(), createdAt: new Date().toISOString() };
    if (isSupabaseReady()) await db.updateUser(newUser);
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    saveToLocal(STORAGE_KEYS.USERS, [...users, newUser]);
    return newUser;
  },

  async updateUser(user: User) {
    if (isSupabaseReady()) await db.updateUser(user);
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    saveToLocal(STORAGE_KEYS.USERS, users.map((u: User) => u.id === user.id ? user : u));
    const session = getFromLocal(STORAGE_KEYS.SESSION, null);
    if (session?.id === user.id) saveToLocal(STORAGE_KEYS.SESSION, user);
  },

  async addPost(post: Post) {
    if (isSupabaseReady()) await db.addPost(post);
    const posts = getFromLocal(STORAGE_KEYS.POSTS, []);
    saveToLocal(STORAGE_KEYS.POSTS, [post, ...posts]);
  },

  async deletePost(id: string) {
    if (isSupabaseReady()) await db.deletePost(id);
    const posts = getFromLocal(STORAGE_KEYS.POSTS, []);
    saveToLocal(STORAGE_KEYS.POSTS, posts.filter((p: Post) => p.id !== id));
  }
};
