
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Verifica se a URL é válida
const isConfigured = 
  supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('placeholder-project');

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseReady = () => !!supabase;

/**
 * Funções Genéricas de Acesso a Dados
 */
export const db = {
  // Configurações do Site
  async getConfig() {
    if (!supabase) return null;
    const { data, error } = await supabase.from('site_config').select('*').single();
    if (error) return null;
    return data;
  },
  async updateConfig(config: any) {
    if (!supabase) return;
    const { error } = await supabase.from('site_config').upsert({ id: 1, ...config });
    if (error) console.error("Erro ao salvar config no Supabase:", error);
  },

  // Usuários / Perfis
  async getUsers() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('profiles').select('*');
    return error ? [] : data;
  },
  async updateUser(user: any) {
    if (!supabase) return;
    await supabase.from('profiles').upsert(user);
  },
  async findUserByEmail(email: string) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
    return error ? null : data;
  },

  // Posts / Anúncios
  async getPosts() {
    if (!supabase) return [];
    // Usando "createdAt" entre aspas duplas para respeitar o Case Sensitivity do PostgreSQL quando definido via SQL
    const { data, error } = await supabase.from('posts').select('*').order('createdAt', { ascending: false });
    return error ? [] : data;
  },
  async addPost(post: any) {
    if (!supabase) return;
    await supabase.from('posts').insert(post);
  },
  async updatePost(post: any) {
    if (!supabase) return;
    await supabase.from('posts').update(post).eq('id', post.id);
  },
  async deletePost(id: string) {
    if (!supabase) return;
    await supabase.from('posts').delete().eq('id', id);
  },

  // Categorias
  async getCategories() {
    if (!supabase) return null;
    const { data, error } = await supabase.from('categories').select('name');
    return error ? null : data.map(c => c.name);
  },
  async saveCategories(categories: string[]) {
    if (!supabase) return;
    // Remove antigas e insere novas
    await supabase.from('categories').delete().neq('name', '___');
    await supabase.from('categories').insert(categories.map(name => ({ name })));
  }
};
