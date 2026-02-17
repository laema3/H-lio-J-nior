
import { createClient } from '@supabase/supabase-js';

// Tenta pegar do ambiente ou do LocalStorage (para permitir config via UI)
const getCredentials = () => {
  const localUrl = localStorage.getItem('supabase_url_manual');
  const localKey = localStorage.getItem('supabase_key_manual');
  
  return {
    url: process.env.SUPABASE_URL || localUrl || '',
    key: process.env.SUPABASE_ANON_KEY || localKey || ''
  };
};

let { url, key } = getCredentials();

const isConfigured = (u: string, k: string) => 
  u && u.startsWith('https://') && k && k.length > 20;

export let supabase = isConfigured(url, key) ? createClient(url, key) : null;

export const isSupabaseReady = () => !!supabase;

// Função para re-inicializar o cliente após salvar novas chaves via UI
export const reinitializeSupabase = (newUrl: string, newKey: string) => {
  if (isConfigured(newUrl, newKey)) {
    localStorage.setItem('supabase_url_manual', newUrl);
    localStorage.setItem('supabase_key_manual', newKey);
    supabase = createClient(newUrl, newKey);
    console.log("🚀 Supabase re-inicializado com novas credenciais.");
    return true;
  }
  return false;
};

export const db = {
  async testConnection() {
    console.group("%c🔍 TESTE DE CONEXÃO E INTEGRIDADE", "color: #4f46e5; font-weight: bold; font-size: 12px;");
    const result = { success: false, message: "", log: [] as string[] };
    
    const addLog = (m: string, color = "#94a3b8") => {
      const time = new Date().toLocaleTimeString();
      console.log(`%c[${time}] ${m}`, `color: ${color}`);
      result.log.push(m);
    };

    try {
      if (!supabase) {
        addLog("❌ ERRO: Supabase não está configurado. Vá em Ajustes Técnicos e insira sua URL e Key.", "#ef4444");
        throw new Error("Cliente não configurado");
      }

      addLog("📡 1. Testando Leitura de Dados (Tabela 'site_config')...", "#fbbf24");
      const { data: readData, error: readError } = await supabase.from('site_config').select('*').limit(1);
      
      if (readError) {
        addLog(`❌ Falha na Leitura: ${readError.message}`, "#ef4444");
        addLog("DICA: Verifique se a tabela 'site_config' existe no seu Supabase.", "#64748b");
        throw readError;
      }
      addLog(`✅ Leitura OK! Dados encontrados.`, "#10b981");

      addLog("✍️ 2. Testando Escrita (Atualizando Timestamp de Teste)...", "#fbbf24");
      const { error: writeError } = await supabase.from('site_config').upsert({ 
        id: 1, 
        heroLabel: readData?.[0]?.heroLabel || "Hélio Júnior" 
      });
      
      if (writeError) {
        addLog(`❌ Falha na Escrita: ${writeError.message}`, "#ef4444");
        addLog("DICA: Verifique as políticas RLS (Row Level Security) da tabela no painel do Supabase.", "#64748b");
        throw writeError;
      }
      addLog("✅ Escrita/Sincronização OK!", "#10b981");

      result.success = true;
      result.message = "Conexão estabelecida e permissões validadas!";
      addLog("🎉 TUDO PRONTO: Seu site agora está salvando na nuvem com segurança.", "#10b981");

    } catch (e: any) {
      result.message = e.message;
    } finally {
      console.groupEnd();
    }
    return result;
  },

  async getConfig() {
    if (!supabase) return null;
    const { data, error } = await supabase.from('site_config').select('*').single();
    return error ? null : data;
  },
  async updateConfig(config: any) {
    if (!supabase) return;
    await supabase.from('site_config').upsert({ id: 1, ...config });
  },
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
  async getPosts() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select('*').order('createdAt', { ascending: false });
    return error ? [] : data;
  },
  async addPost(post: any) {
    if (!supabase) return;
    await supabase.from('posts').insert(post);
  },
  async deletePost(id: string) {
    if (!supabase) return;
    await supabase.from('posts').delete().eq('id', id);
  },
  async getCategories() {
    if (!supabase) return null;
    const { data, error } = await supabase.from('categories').select('name');
    if (error) return null;
    return data.map(c => c.name);
  },
  async saveCategories(categories: string[]) {
    if (!supabase) return;
    await supabase.from('categories').delete().neq('name', '___');
    await supabase.from('categories').insert(categories.map(name => ({ name })));
  }
};
