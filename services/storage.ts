
import { User, Post, UserRole, PaymentStatus, SiteConfig, Plan, Category } from '../types';

const KEY_PREFIX = 'helio_junior_radialista_v4_';

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
  heroTitle: 'Portal VIP de Classificados',
  heroSubtitle: 'Credibilidade e alcance para o seu negócio com o toque de quem entende de comunicação.',
  heroImageUrl: 'https://images.unsplash.com/photo-1478737270239-2fccd27ee10f?auto=format&fit=crop&q=80&w=1920',
  whatsapp: '5500000000000',
  pixKey: 'pix@heliojunior.com',
  pixName: 'Hélio Júnior',
  headerLogoUrl: '',
  footerLogoUrl: ''
};

const DEFAULT_PLANS: Plan[] = [
  { id: 'p_free', name: 'Degustação Grátis', price: 0, durationDays: 30, description: 'Teste por 30 dias sem custo.' },
  { id: 'p_gold', name: 'Plano Mensal Gold', price: 49.90, durationDays: 30, description: 'Destaque total por um mês.' },
  { id: 'p_vip', name: 'Plano VIP Trimestral', price: 129.90, durationDays: 90, description: 'Melhor visibilidade e locução IA.' }
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Comércio' },
  { id: 'c2', name: 'Serviços' },
  { id: 'c3', name: 'Alimentação' },
  { id: 'c4', name: 'Saúde' },
  { id: 'c5', name: 'Tecnologia' }
];

export const saveToLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
export const getFromLocal = (key: string, defaultValue: any) => {
  const item = localStorage.getItem(key);
  if (!item) return defaultValue;
  try { return JSON.parse(item); } catch { return defaultValue; }
};

export const storageService = {
  init: async () => {
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) saveToLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    if (!localStorage.getItem(STORAGE_KEYS.PLANS)) saveToLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) saveToLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    if (!users.find((u: any) => u.email === 'admin@helio.com')) {
      users.push({
        id: 'admin',
        name: 'Hélio Júnior',
        email: 'admin@helio.com',
        password: 'admin',
        role: UserRole.ADMIN,
        paymentStatus: PaymentStatus.NOT_APPLICABLE,
        createdAt: new Date().toISOString()
      });
      saveToLocal(STORAGE_KEYS.USERS, users);
    }
  },

  async authenticate(email: string, pass: string): Promise<User | null> {
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    return users.find((u: User) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass) || null;
  },

  async addUser(userData: any) {
    const users = getFromLocal(STORAGE_KEYS.USERS, []);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newUser: User = { 
      ...userData, 
      id: 'u-' + Date.now(), 
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      planId: 'p_free',
      usedFreeTrial: true,
      paymentStatus: PaymentStatus.CONFIRMED 
    };
    saveToLocal(STORAGE_KEYS.USERS, [...users, newUser]);
    return newUser;
  },

  async getConfig(): Promise<SiteConfig> { return getFromLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG); },
  async getPlans(): Promise<Plan[]> { return getFromLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS); },
  async getUsers(): Promise<User[]> { return getFromLocal(STORAGE_KEYS.USERS, []); },
  async getPosts(): Promise<Post[]> { return getFromLocal(STORAGE_KEYS.POSTS, []); },
  async getCategories(): Promise<Category[]> { return getFromLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES); },

  async savePost(post: Post) {
    const posts = await this.getPosts();
    const updated = posts.some(p => p.id === post.id) ? posts.map(p => p.id === post.id ? post : p) : [post, ...posts];
    saveToLocal(STORAGE_KEYS.POSTS, updated);
  },

  async deletePost(id: string) {
    const posts = await this.getPosts();
    saveToLocal(STORAGE_KEYS.POSTS, posts.filter(p => p.id !== id));
  },

  async updateUser(user: User) {
    const users = await this.getUsers();
    saveToLocal(STORAGE_KEYS.USERS, users.map(u => u.id === user.id ? user : u));
  },

  async deleteUser(id: string) {
    const users = await this.getUsers();
    saveToLocal(STORAGE_KEYS.USERS, users.filter(u => u.id !== id));
  },

  async savePlan(plan: Plan) {
    const plans = await this.getPlans();
    const planToSave = { ...plan, id: plan.id || 'pl-' + Date.now() };
    const updated = plans.some(p => p.id === planToSave.id) ? plans.map(p => p.id === planToSave.id ? planToSave : p) : [...plans, planToSave];
    saveToLocal(STORAGE_KEYS.PLANS, updated);
  },

  async deletePlan(id: string) {
    const plans = await this.getPlans();
    saveToLocal(STORAGE_KEYS.PLANS, plans.filter(p => p.id !== id));
  },

  async saveCategory(cat: Category) {
    const cats = await this.getCategories();
    const catToSave = { ...cat, id: cat.id || 'cat-' + Date.now() };
    const updated = cats.some(c => c.id === catToSave.id) ? cats.map(c => c.id === catToSave.id ? catToSave : c) : [...cats, catToSave];
    saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
  },

  async deleteCategory(id: string) {
    const cats = await this.getCategories();
    saveToLocal(STORAGE_KEYS.CATEGORIES, cats.filter(c => c.id !== id));
  },

  async updateConfig(config: SiteConfig) { saveToLocal(STORAGE_KEYS.CONFIG, config); }
};
