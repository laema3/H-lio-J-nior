
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  where,
  limit
} from "firebase/firestore";

const getCredentials = () => {
  const localConfig = localStorage.getItem('firebase_config_manual');
  if (localConfig) {
    try {
      return JSON.parse(localConfig);
    } catch (e) {
      return null;
    }
  }
  return null;
};

let app: any = null;
let dbInstance: any = null;

const initFirebase = () => {
  const config = getCredentials();
  if (config && config.apiKey && config.projectId) {
    try {
      app = getApps().length > 0 ? getApp() : initializeApp(config);
      dbInstance = getFirestore(app);
      return true;
    } catch (e) {
      console.error("Erro ao inicializar Firebase:", e);
      return false;
    }
  }
  return false;
};

initFirebase();

export const isFirebaseReady = () => !!dbInstance;

export const reinitializeFirebase = (configJson: string) => {
  try {
    const config = JSON.parse(configJson);
    if (config.apiKey && config.projectId) {
      localStorage.setItem('firebase_config_manual', configJson);
      // Forçar reinicialização limpando o app anterior se existir
      if (getApps().length > 0) {
          // Firebase apps are immutable once initialized, but we can restart context
          location.reload(); 
          return true;
      }
      return initFirebase();
    }
  } catch (e) {
    console.error("JSON de configuração inválido");
  }
  return false;
};

export const db = {
  async testConnection() {
    if (!dbInstance) return { success: false, logs: ["Firebase não configurado. Vá em Admin > Ajustes e cole as credenciais."] };
    try {
      await getDocs(query(collection(dbInstance, "site_config"), limit(1)));
      return { success: true, logs: ["Conectado ao Firebase Firestore com sucesso!"] };
    } catch (e: any) {
      return { success: false, logs: [`Erro de conexão: ${e.message}. Verifique se as Regras do Firestore permitem leitura/escrita.`] };
    }
  },

  async getConfig() {
    if (!dbInstance) return null;
    const snap = await getDoc(doc(dbInstance, "site_config", "global"));
    return snap.exists() ? snap.data() : null;
  },

  async updateConfig(config: any) {
    if (!dbInstance) return;
    const { id, ...data } = config;
    await setDoc(doc(dbInstance, "site_config", "global"), data);
  },

  async getUsers() {
    if (!dbInstance) return [];
    const snap = await getDocs(collection(dbInstance, "profiles"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateUser(user: any) {
    if (!dbInstance) return;
    const { id, ...data } = user;
    await setDoc(doc(dbInstance, "profiles", id), data);
  },

  async findUserByEmail(email: string) {
    if (!dbInstance) return null;
    const q = query(collection(dbInstance, "profiles"), where("email", "==", email.toLowerCase()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  async getPosts() {
    if (!dbInstance) return [];
    try {
        const q = query(collection(dbInstance, "posts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        // Se o índice não existir, o Firestore pode falhar. Retornamos sem order para garantir.
        const snap = await getDocs(collection(dbInstance, "posts"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  },

  async addPost(post: any) {
    if (!dbInstance) return;
    const { id, ...data } = post;
    await setDoc(doc(dbInstance, "posts", id), data);
  },

  async deletePost(id: string) {
    if (!dbInstance) return;
    await deleteDoc(doc(dbInstance, "posts", id));
  },

  async getCategories() {
    if (!dbInstance) return null;
    const snap = await getDocs(collection(dbInstance, "categories"));
    return snap.empty ? null : snap.docs.map(d => (d.data() as any).name);
  },

  async saveCategories(categories: string[]) {
    if (!dbInstance) return;
    // No Firestore NoSQL, deletamos e recriamos para manter sincronia
    for (const name of categories) {
      await setDoc(doc(dbInstance, "categories", name), { name });
    }
  }
};
