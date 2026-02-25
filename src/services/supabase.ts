import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Post, Plan, Category, SiteConfig, PaymentMethod } from '../types';

interface Database {
    public: {
        Tables: {
            users: { Row: User; Insert: Partial<User>; Update: Partial<User>; };
            posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post>; };
            plans: { Row: Plan; Insert: Partial<Plan>; Update: Partial<Plan>; };
            categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category>; };
            site_config: { Row: SiteConfig; Insert: Partial<SiteConfig>; Update: Partial<SiteConfig>; };
            payment_methods: { Row: PaymentMethod; Insert: Partial<PaymentMethod>; Update: Partial<PaymentMethod>; };
        };
    };
}

class SupabaseService {
    private supabase: SupabaseClient<Database> | null = null;

    async init() {
        if (!this.supabase) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                console.error('Supabase URL or Anon Key is missing. Please check your .env.example and .env files.');
                // Fallback to a dummy client or throw error if Supabase is critical
                return;
            }
            this.supabase = createClient(supabaseUrl, supabaseAnonKey);
        }
    }

    // --- Auth --- //
    async authenticate(email: string, password: string): Promise<User | null> {
        // Dummy implementation for now
        console.log('Authenticating user:', email);
        const { data, error } = await this.supabase!.from('users').select('*').eq('email', email).single();
        if (error) { console.error('Auth error:', error.message); return null; }
        // In a real app, you'd verify password here
        if (data && data.password === password) { return data; }
        return null;
    }

    async addUser(user: Partial<User>): Promise<User | null> {
        // Dummy implementation for now
        console.log('Adding user:', user.email);
        const { data, error } = await this.supabase!.from('users').insert(user).select().single();
        if (error) { console.error('Add user error:', error.message); return null; }
        return data;
    }

    async updateUser(user: Partial<User>): Promise<User | null> {
        // Dummy implementation for now
        console.log('Updating user:', user.id);
        const { data, error } = await this.supabase!.from('users').update(user).eq('id', user.id!).select().single();
        if (error) { console.error('Update user error:', error.message); return null; }
        return data;
    }

    async deleteUser(id: string): Promise<void> {
        console.log('Deleting user:', id);
        const { error } = await this.supabase!.from('users').delete().eq('id', id);
        if (error) { console.error('Delete user error:', error.message); }
    }

    async getUsers(): Promise<User[]> {
        console.log('Getting users');
        const { data, error } = await this.supabase!.from('users').select('*');
        if (error) { console.error('Get users error:', error.message); return []; }
        return data;
    }

    // --- Posts --- //
    async getPosts(): Promise<Post[]> {
        console.log('Getting posts');
        const { data, error } = await this.supabase!.from('posts').select('*');
        if (error) { console.error('Get posts error:', error.message); return []; }
        return data;
    }

    async savePost(post: Partial<Post>): Promise<Post | null> {
        console.log('Saving post:', post.title);
        if (post.id) {
            const { data, error } = await this.supabase!.from('posts').update(post).eq('id', post.id).select().single();
            if (error) { console.error('Update post error:', error.message); return null; }
            return data;
        } else {
            const { data, error } = await this.supabase!.from('posts').insert(post).select().single();
            if (error) { console.error('Insert post error:', error.message); return null; }
            return data;
        }
    }

    async deletePost(id: string): Promise<void> {
        console.log('Deleting post:', id);
        const { error } = await this.supabase!.from('posts').delete().eq('id', id);
        if (error) { console.error('Delete post error:', error.message); }
    }

    // --- Plans --- //
    async getPlans(): Promise<Plan[]> {
        console.log('Getting plans');
        const { data, error } = await this.supabase!.from('plans').select('*');
        if (error) { console.error('Get plans error:', error.message); return []; }
        return data;
    }

    async savePlan(plan: Partial<Plan>): Promise<Plan | null> {
        console.log('Saving plan:', plan.name);
        if (plan.id) {
            const { data, error } = await this.supabase!.from('plans').update(plan).eq('id', plan.id).select().single();
            if (error) { console.error('Update plan error:', error.message); return null; }
            return data;
        } else {
            const { data, error } = await this.supabase!.from('plans').insert(plan).select().single();
            if (error) { console.error('Insert plan error:', error.message); return null; }
            return data;
        }
    }

    async deletePlan(id: string): Promise<void> {
        console.log('Deleting plan:', id);
        const { error } = await this.supabase!.from('plans').delete().eq('id', id);
        if (error) { console.error('Delete plan error:', error.message); }
    }

    // --- Categories --- //
    async getCategories(): Promise<Category[]> {
        console.log('Getting categories');
        const { data, error } = await this.supabase!.from('categories').select('*');
        if (error) { console.error('Get categories error:', error.message); return []; }
        return data;
    }

    async saveCategory(category: Partial<Category>): Promise<Category | null> {
        console.log('Saving category:', category.name);
        if (category.id) {
            const { data, error } = await this.supabase!.from('categories').update(category).eq('id', category.id).select().single();
            if (error) { console.error('Update category error:', error.message); return null; }
            return data;
        } else {
            const { data, error } = await this.supabase!.from('categories').insert(category).select().single();
            if (error) { console.error('Insert category error:', error.message); return null; }
            return data;
        }
    }

    async deleteCategory(id: string): Promise<void> {
        console.log('Deleting category:', id);
        const { error } = await this.supabase!.from('categories').delete().eq('id', id);
        if (error) { console.error('Delete category error:', error.message); }
    }

    // --- Site Config --- //
    async getConfig(): Promise<SiteConfig | null> {
        console.log('Getting site config');
        const { data, error } = await this.supabase!.from('site_config').select('*').single();
        if (error) { console.error('Get config error:', error.message); return null; }
        return data;
    }

    async saveConfig(config: Partial<SiteConfig>): Promise<SiteConfig | null> {
        console.log('Saving site config');
        const { data, error } = await this.supabase!.from('site_config').update(config).eq('id', '1').select().single(); // Assuming a single config entry with ID '1'
        if (error) { console.error('Save config error:', error.message); return null; }
        return data;
    }

    // --- Payment Methods --- //
    async getPaymentMethods(): Promise<PaymentMethod[]> {
        console.log('Getting payment methods');
        const { data, error } = await this.supabase!.from('payment_methods').select('*');
        if (error) { console.error('Get payment methods error:', error.message); return []; }
        return data;
    }

    async savePaymentMethod(method: Partial<PaymentMethod>): Promise<PaymentMethod | null> {
        console.log('Saving payment method:', method.name);
        if (method.id) {
            const { data, error } = await this.supabase!.from('payment_methods').update(method).eq('id', method.id).select().single();
            if (error) { console.error('Update payment method error:', error.message); return null; }
            return data;
        } else {
            const { data, error } = await this.supabase!.from('payment_methods').insert(method).select().single();
            if (error) { console.error('Insert payment method error:', error.message); return null; }
            return data;
        }
    }

    async deletePaymentMethod(id: string): Promise<void> {
        console.log('Deleting payment method:', id);
        const { error } = await this.supabase!.from('payment_methods').delete().eq('id', id);
        if (error) { console.error('Delete payment method error:', error.message); }
    }
}

export const db = new SupabaseService();
