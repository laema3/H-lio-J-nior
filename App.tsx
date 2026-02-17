
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG } from './services/storage';
import { db, isSupabaseReady, reinitializeSupabase } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy, chatWithAssistant } from './services/geminiService';
import { 
    Check, Camera, Trash2, AlertTriangle, Plus, Settings, CreditCard, Tag,
    Instagram, Facebook, Youtube, MessageCircle, Send, X, Bot, Loader2, 
    Image as ImageIcon, Users, CheckCircle2, Layers, BarChart3, Mail, Terminal, Key, Link2, MapPin, PhoneCall, ArrowRight,
    Database, Activity, Globe, ShieldCheck, Copy, Info
} from 'lucide-react';

type AdminSubView = 'INICIO' | 'CLIENTES' | 'PAGAMENTOS' | 'ANUNCIOS' | 'CATEGORIAS' | 'PLANOS' | 'AJUSTES';

const SQL_HELP_SCRIPT = `-- COPIE E COLE ISSO NO 'SQL EDITOR' DO SUPABASE
CREATE TABLE IF NOT EXISTS site_config (
  id BIGINT PRIMARY KEY,
  heroTitle TEXT,
  heroSubtitle TEXT,
  heroImageUrl TEXT,
  heroLabel TEXT,
  headerLogoUrl TEXT,
  footerLogoUrl TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagramUrl TEXT,
  facebookUrl TEXT,
  youtubeUrl TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT,
  profession TEXT,
  phone TEXT,
  planId TEXT,
  paymentStatus TEXT,
  expiresAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  authorId TEXT,
  authorName TEXT,
  category TEXT,
  title TEXT,
  content TEXT,
  whatsapp TEXT,
  phone TEXT,
  imageUrl TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY
);

INSERT INTO site_config (id, heroTitle, heroSubtitle, heroImageUrl, heroLabel)
VALUES (1, 'Portal de Classificados', 'Destaque sua marca com a credibilidade de quem entende de comunicação.', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc', 'Hélio Júnior')
ON CONFLICT (id) DO NOTHING;
`;

const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 675;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
};

const Toast: React.FC<{ message: string, type: 'success' | 'error', onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 5000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${
            type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
        }`}>
            {type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
            <span className="font-bold text-sm uppercase tracking-wider">{message}</span>
        </div>
    );
};

const AIChat: React.FC<{ config: SiteConfig }> = ({ config }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
        { role: 'model', text: `Olá! Sou o assistente virtual do Hélio Júnior. Como posso ajudar você hoje?` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isTyping]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;
        const msg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setIsTyping(true);
        const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        const response = await chatWithAssistant(msg, history);
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'model', text: response }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-brand-dark border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
                    <div className="bg-gradient-to-r from-brand-primary to-purple-600 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bot className="text-white" />
                            <span className="text-white font-black text-sm uppercase tracking-tighter">Hélio Bot</span>
                        </div>
                        <button onClick={() => setIsOpen(false)}><X size={20} className="text-white/60"/></button>
                    </div>
                    <button onClick={() => window.open(`https://wa.me/${config.whatsapp?.replace(/\D/g,'')}`, '_blank')} className="bg-green-500/10 text-green-400 py-3 text-[10px] font-black uppercase tracking-widest border-b border-white/5 flex items-center justify-center gap-2">
                        <MessageCircle size={14} /> Falar com um Humano
                    </button>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-brand-dark/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-xs ${m.role === 'user' ? 'bg-brand-primary text-white rounded-tr-none' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && <div className="text-[10px] text-gray-500 font-bold animate-pulse">Hélio Bot está digitando...</div>}
                    </div>
                    <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte algo..." className="flex-1 bg-brand-dark border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"/>
                        <button type="submit" className="bg-brand-primary p-2 rounded-xl"><Send size={18}/></button>
                    </form>
                </div>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all ${isOpen ? 'bg-red-500' : 'bg-brand-primary shadow-brand-primary/40'}`}>
                {isOpen ? <X size={28}/> : <Bot size={28}/>}
            </button>
        </div>
    );
};

const Footer: React.FC<{ config: SiteConfig, setCurrentView: (v: ViewState) => void }> = ({ config, setCurrentView }) => (
    <footer className="relative bg-[#0b1120] overflow-hidden pt-24 pb-12 mt-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
                <div className="md:col-span-4 space-y-8 text-center md:text-left">
                    <div 
                        className="inline-block h-16 w-56 bg-white/5 rounded-2xl border border-white/5 overflow-hidden p-2 cursor-pointer hover:bg-white/10 transition-all"
                        onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setCurrentView('HOME'); }}
                    >
                        {config.footerLogoUrl ? <img src={config.footerLogoUrl} className="w-full h-full object-contain" /> : <span className="font-black text-white text-lg uppercase tracking-tighter flex items-center justify-center h-full">{config.heroLabel}</span>}
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed italic max-w-sm mx-auto md:mx-0">
                        "{config.heroSubtitle}"
                    </p>
                    <div className="flex justify-center md:justify-start gap-4">
                        {config.instagramUrl && <a href={config.instagramUrl} target="_blank" className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 transition-all border border-white/5"><Instagram size={20}/></a>}
                        {config.facebookUrl && <a href={config.facebookUrl} target="_blank" className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 transition-all border border-white/5"><Facebook size={20}/></a>}
                        {config.youtubeUrl && <a href={config.youtubeUrl} target="_blank" className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 transition-all border border-white/5"><Youtube size={20}/></a>}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-6 text-center md:text-left">
                    <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-8">Navegação</h3>
                    <ul className="space-y-4">
                        <li><button onClick={() => setCurrentView('HOME')} className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2 group"><ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" /> Início</button></li>
                        <li><button onClick={() => setCurrentView('LOGIN')} className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2 group"><ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" /> Acessar Conta</button></li>
                        <li><button onClick={() => setCurrentView('REGISTER')} className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2 group"><ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" /> Quero Anunciar</button></li>
                    </ul>
                </div>

                <div className="md:col-span-3 space-y-6 text-center md:text-left">
                    <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-8">Fale Conosco</h3>
                    <div className="space-y-5">
                        <div className="flex flex-col md:flex-row items-center gap-3 text-sm text-gray-400 group">
                            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all"><MapPin size={16}/></div>
                            <span className="text-xs">{config.address || 'Endereço não configurado'}</span>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-3 text-sm text-gray-400 group">
                            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all"><PhoneCall size={16}/></div>
                            <span className="text-xs font-bold">{config.phone || '(00) 0000-0000'}</span>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-3 text-sm text-gray-400 group">
                            <div className="p-2 bg-green-500/10 rounded-xl text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all"><MessageCircle size={16}/></div>
                            <span className="text-xs font-black">{config.whatsapp || '(00) 00000-0000'}</span>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-8">
                    <div className="glass-panel p-6 rounded-[32px] border border-white/5 space-y-4">
                        <h4 className="text-xs font-black text-brand-accent uppercase tracking-widest">Segurança & IA</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight leading-relaxed">
                            Anúncios verificados e assistente inteligente para sua melhor performance.
                        </p>
                    </div>
                </div>
            </div>
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                    © {new Date().getFullYear()} Portal Hélio Júnior.
                </p>
            </div>
        </div>
    </footer>
);

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const [isTestingConn, setIsTestingConn] = useState(false);
    const [testLogs, setTestLogs] = useState<string[]>([]);
    const [diagInfo, setDiagInfo] = useState<any>(null);
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<AdminSubView>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => getFromLocal(STORAGE_KEYS.SESSION, null));
    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);

    const sUrlRef = useRef<HTMLInputElement>(null);
    const sKeyRef = useRef<HTMLInputElement>(null);

    const refresh = async () => {
        setIsOnline(isSupabaseReady());
        const [p, u, c, cfg, diag] = await Promise.all([
            storageService.getPosts(),
            storageService.getUsers(),
            storageService.getCategories(),
            storageService.getConfig(),
            db.getDiagnostic()
        ]);
        setPosts(p); setAllUsers(u); setCategories(c); setSiteConfig(cfg); 
        setPlans(storageService.getPlans()); setDiagInfo(diag);
        
        const session = getFromLocal(STORAGE_KEYS.SESSION, null);
        if (session) {
            const freshUser = u.find(user => user.id === session.id);
            if (freshUser) { setCurrentUser(freshUser); saveToLocal(STORAGE_KEYS.SESSION, freshUser); }
            else if (session.role === UserRole.ADMIN) { setCurrentUser(session); }
        }
        setIsLoading(false);
    };

    useEffect(() => { 
        storageService.init().then(async () => {
            await refresh();
            const conn = await db.testConnection();
            setIsOnline(conn.success);
        });
    }, []);

    const handleLogin = (user: User) => {
        saveToLocal(STORAGE_KEYS.SESSION, user);
        refresh().then(() => { setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD'); });
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        setCurrentUser(null); setCurrentView('HOME');
    };

    const handleTestSupabase = async () => {
        setIsTestingConn(true);
        const result = await db.testConnection();
        const diag = await db.getDiagnostic();
        setIsTestingConn(false);
        setTestLogs(result.logs);
        setDiagInfo(diag);
        setIsOnline(result.success);
        if (result.success) setToast({ m: "Supabase Conectado!", t: "success" });
        else setToast({ m: "Problemas na conexão", t: "error" });
    };

    const handleSaveSupabaseManual = () => {
        const urlInput = sUrlRef.current?.value?.trim() || '';
        const keyInput = sKeyRef.current?.value?.trim() || '';
        if (reinitializeSupabase(urlInput, keyInput)) {
            setToast({ m: "Configurações Salvas!", t: "success" });
            handleTestSupabase();
        } else {
            setToast({ m: "URL ou Chave inválida. Verifique o formato.", t: "error" });
        }
    };

    const handleConfirmPayment = async (user: User) => {
        const plan = plans.find(p => p.id === user.planId);
        const days = plan?.durationDays || 30;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        
        await storageService.updateUser({
            ...user,
            paymentStatus: PaymentStatus.CONFIRMED,
            expiresAt: expiry.toISOString()
        });
        setToast({ m: "Pagamento Confirmado!", t: "success" });
        refresh();
    };

    const renderView = () => {
        switch(currentView) {
            case 'HOME':
                const visiblePosts = posts.filter(p => {
                    const auth = allUsers.find(u => u.id === p.authorId);
                    if (p.authorId === 'admin') return true;
                    return auth?.paymentStatus === PaymentStatus.CONFIRMED;
                });
                const filtered = filterCategory === 'ALL' ? visiblePosts : visiblePosts.filter(p => p.category === filterCategory);
                return (
                    <div className="animate-in fade-in duration-700">
                        <section className="relative pt-32 pb-20 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-dark to-brand-secondary/5" />
                            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                                <div className="text-center lg:text-left">
                                    <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-brand-accent uppercase tracking-widest mb-6">{siteConfig.heroLabel}</div>
                                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-none">{siteConfig.heroTitle}</h1>
                                    <p className="text-xl text-gray-400 mb-10 italic">"{siteConfig.heroSubtitle}"</p>
                                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                                        <Button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})}>Ver Anúncios</Button>
                                        <Button variant="outline" onClick={() => setCurrentView('REGISTER')}>Quero Anunciar</Button>
                                    </div>
                                </div>
                                <div className="aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative group">
                                    <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Banner" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent" />
                                </div>
                            </div>
                        </section>
                        <section className="max-w-7xl mx-auto px-4 mb-16 relative z-10">
                            <div className="flex flex-wrap justify-center gap-2">
                                <button onClick={() => setFilterCategory('ALL')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === 'ALL' ? 'bg-white text-brand-dark border-white' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>Todos</button>
                                {categories.map(c => <button key={c} onClick={() => setFilterCategory(c)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === c ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>{c}</button>)}
                            </div>
                        </section>
                        <section id="ads" className="max-w-7xl mx-auto px-4 pb-24 min-h-[400px]">
                            {filtered.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filtered.map(p => <PostCard key={p.id} post={p} author={allUsers.find(u => u.id === p.authorId)} />)}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/5">
                                    <ImageIcon size={48} className="mx-auto text-gray-600 mb-4 opacity-20" />
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhum anúncio ativo no momento.</p>
                                </div>
                            )}
                        </section>
                    </div>
                );

            case 'ADMIN':
                if (currentUser?.role !== UserRole.ADMIN) return null;
                const advertisersList = allUsers.filter(u => u.role === UserRole.ADVERTISER);
                const awaitingList = advertisersList.filter(u => u.paymentStatus === PaymentStatus.AWAITING);

                return (
                    <div className="min-h-screen bg-brand-dark pt-20 flex">
                        <aside className="w-72 border-r border-white/5 bg-brand-dark/80 backdrop-blur-2xl flex flex-col p-6 gap-3 hidden md:flex shrink-0">
                            <div className="mb-8 px-4">
                                <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">Broadcaster v3</p>
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter">Painel de Controle</h2>
                            </div>
                            
                            {[
                                { id: 'INICIO', label: 'Resumo', icon: BarChart3 },
                                { id: 'CLIENTES', label: 'Clientes', icon: Users },
                                { id: 'PAGAMENTOS', label: 'Pagamentos', icon: CreditCard, count: awaitingList.length },
                                { id: 'ANUNCIOS', label: 'Anúncios', icon: ImageIcon },
                                { id: 'CATEGORIAS', label: 'Nichos', icon: Tag },
                                { id: 'PLANOS', label: 'Planos', icon: Layers },
                                { id: 'AJUSTES', label: 'Configurações', icon: Settings }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setAdminSubView(item.id as AdminSubView)}
                                    className={`flex items-center justify-between p-4 rounded-2xl transition-all group border ${adminSubView === item.id ? 'bg-brand-primary border-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} className={adminSubView === item.id ? 'text-white' : 'text-gray-500 group-hover:text-brand-primary transition-colors'} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    {item.count ? <span className="bg-brand-secondary text-[10px] px-2 py-0.5 rounded-full text-white font-black">{item.count}</span> : null}
                                </button>
                            ))}
                        </aside>

                        <main className="flex-1 p-10 overflow-y-auto">
                            {adminSubView === 'AJUSTES' && (
                                <div className="space-y-10 animate-in fade-in duration-500 pb-20">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl font-black uppercase text-brand-accent">Sincronização e Identidade</h2>
                                        <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase flex items-center gap-2 ${isOnline ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-red-500 text-red-500 bg-red-500/10'}`}>
                                            <Activity size={14} className={isOnline ? 'animate-pulse' : ''} />
                                            Status: {isOnline ? 'Online na Nuvem' : 'Modo Offline'}
                                        </div>
                                    </div>

                                    <div className="glass-panel p-8 rounded-[40px] border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="md:col-span-1 space-y-4">
                                            <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><ShieldCheck size={16}/> Checklist</h3>
                                            <div className="space-y-3">
                                                {[
                                                    { label: 'URL Configurada', status: diagInfo?.urlValid },
                                                    { label: 'Chave API Válida', status: diagInfo?.keyValid },
                                                    { label: 'Tabela Config', status: diagInfo?.tableConfig },
                                                    { label: 'Tabela Perfis', status: diagInfo?.tableProfiles },
                                                    { label: 'Tabela Posts', status: diagInfo?.tablePosts }
                                                ].map((c, i) => (
                                                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${c.status ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                                        <span className="text-[10px] font-bold uppercase tracking-tight">{c.label}</span>
                                                        {c.status ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {(!diagInfo?.tableConfig || !diagInfo?.tableProfiles) && (
                                                <div className="mt-6 p-5 bg-brand-primary/10 border border-brand-primary/20 rounded-3xl space-y-3">
                                                    <h4 className="text-[10px] font-black uppercase text-brand-primary flex items-center gap-2"><Info size={14}/> Tabelas faltando?</h4>
                                                    <button onClick={() => { navigator.clipboard.writeText(SQL_HELP_SCRIPT); setToast({m: "Script SQL Copiado!", t: "success"}); }} className="w-full py-2 bg-brand-primary text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2">
                                                        <Copy size={12}/> Copiar Script SQL
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="md:col-span-2 space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-brand-primary/20 rounded-2xl text-brand-primary"><Database size={24} /></div>
                                                    <div>
                                                        <h3 className="text-sm font-black uppercase">Credenciais Supabase</h3>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Conecte seu banco para ficar online.</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <input ref={sUrlRef} defaultValue={localStorage.getItem('supabase_url_manual') || ''} placeholder="Project URL" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none" />
                                                    <input ref={sKeyRef} defaultValue={localStorage.getItem('supabase_key_manual') || ''} type="password" placeholder="Anon Key" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none" />
                                                </div>
                                                <div className="flex gap-4">
                                                    <Button onClick={handleSaveSupabaseManual} className="flex-1">Salvar</Button>
                                                    <Button onClick={handleTestSupabase} isLoading={isTestingConn} variant="outline" className="flex-1">Diagnóstico</Button>
                                                </div>
                                            </div>
                                            {testLogs.length > 0 && (
                                                <div className="bg-black/40 rounded-3xl p-6 font-mono text-[10px] border border-white/5 space-y-1 overflow-y-auto max-h-40">
                                                    {testLogs.map((log, i) => <div key={i}>{log}</div>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'INICIO' && (
                                <div className="space-y-10 animate-in fade-in duration-500">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Olá, Hélio Júnior</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-2">Clientes</p>
                                            <p className="text-5xl font-black text-white">{advertisersList.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5 border-l-brand-secondary border-l-4">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-2">Pendentes</p>
                                            <p className="text-5xl font-black text-brand-secondary">{awaitingList.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-2">Anúncios</p>
                                            <p className="text-5xl font-black text-brand-primary">{posts.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-2">Categorias</p>
                                            <p className="text-5xl font-black text-white">{categories.length}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CLIENTES' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <h2 className="text-3xl font-black uppercase text-white">Clientes</h2>
                                    <div className="glass-panel rounded-[32px] overflow-hidden border border-white/5">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10">
                                                <tr className="text-[10px] font-black uppercase text-gray-500"><th className="px-8 py-5">Nome</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Ação</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {advertisersList.map(u => (
                                                    <tr key={u.id}>
                                                        <td className="px-8 py-6"><p className="text-sm font-black text-white">{u.name}</p><p className="text-[10px] text-gray-500">{u.email}</p></td>
                                                        <td className="px-8 py-6"><span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{u.paymentStatus}</span></td>
                                                        <td className="px-8 py-6 text-right"><button onClick={() => storageService.updateUser({...u, paymentStatus: PaymentStatus.AWAITING}).then(refresh)} className="text-red-500"><Trash2 size={18}/></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'PAGAMENTOS' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <h2 className="text-3xl font-black uppercase text-white">Pendentes</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {awaitingList.map(u => (
                                            <div key={u.id} className="glass-panel p-8 rounded-[32px] border border-white/5">
                                                <p className="text-lg font-black text-white mb-4">{u.name}</p>
                                                <Button onClick={() => handleConfirmPayment(u)} className="w-full">Confirmar Recebimento</Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>
                );

            case 'LOGIN':
            case 'REGISTER':
                return (
                    <div className="pt-32 pb-20 max-w-md mx-auto px-4 animate-in zoom-in duration-500">
                        <div className="glass-panel p-10 rounded-[40px] shadow-2xl">
                            <h2 className="text-4xl font-black text-center mb-8 uppercase tracking-tighter text-white">
                                {currentView === 'LOGIN' ? 'Acessar' : 'Novo Cadastro'}
                            </h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.target as any;
                                const email = form.email.value;
                                if (currentView === 'LOGIN') {
                                    const user = await storageService.findUserByEmail(email);
                                    if (user) handleLogin(user); else setToast({ m: "Não encontrado", t: "error"});
                                } else {
                                    const userExists = await storageService.findUserByEmail(email);
                                    if (userExists) setToast({ m: "E-mail já cadastrado", t: "error"});
                                    else {
                                        const newUser = await storageService.addUser({ 
                                            name: form.name.value, 
                                            email, 
                                            role: UserRole.ADVERTISER, 
                                            profession: form.profession.value, 
                                            phone: form.phone.value, 
                                            paymentStatus: PaymentStatus.AWAITING 
                                        });
                                        handleLogin(newUser);
                                    }
                                }
                            }} className="space-y-4">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="Seu Nome ou Empresa" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                        <select name="profession" className="w-full bg-brand-dark border border-white/10 p-4 rounded-2xl text-white font-bold">
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input name="phone" required placeholder="WhatsApp" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                    </>
                                )}
                                <input name="email" type="email" required placeholder="Seu E-mail" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                <input name="password" type="password" required placeholder="Sua Senha" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                <Button type="submit" className="w-full h-14 uppercase font-black">{currentView === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</Button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-xs text-gray-500 font-bold mt-4 uppercase tracking-widest">
                                    {currentView === 'LOGIN' ? 'Criar uma nova conta' : 'Já tenho uma conta'}
                                </button>
                            </form>
                        </div>
                    </div>
                );

            case 'DASHBOARD':
                if (!currentUser) return null;
                const userPostsList = posts.filter(p => p.authorId === currentUser.id);
                return (
                    <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom duration-500">
                        <div className="lg:col-span-8 space-y-8">
                            <div className="glass-panel p-10 rounded-[40px]">
                                <h2 className="text-2xl font-black mb-8 uppercase text-white">Novo Anúncio</h2>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as any;
                                    const imgVal = (document.getElementById('postImgInput') as HTMLInputElement).value;
                                    await storageService.addPost({ 
                                        id: 'p-'+Date.now(), 
                                        authorId: currentUser.id, 
                                        authorName: currentUser.name, 
                                        category: currentUser.profession || 'Geral', 
                                        title: form.title.value, 
                                        content: form.content.value, 
                                        imageUrl: imgVal, 
                                        whatsapp: currentUser.phone, 
                                        phone: currentUser.phone, 
                                        createdAt: new Date().toISOString() 
                                    });
                                    refresh(); setToast({m: "Publicado!", t: "success"}); form.reset();
                                }} className="space-y-6">
                                    <input name="title" required placeholder="Título" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                    <textarea name="content" required placeholder="Descrição" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white h-32 outline-none focus:border-brand-primary" />
                                    <div onClick={() => document.getElementById('postFilePicker')?.click()} className="aspect-video bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden relative">
                                        <img id="postImgPreview" className="w-full h-full object-contain hidden" />
                                        <div id="postImgPlaceholder"><Camera className="text-gray-500" size={32} /></div>
                                        <input id="postImgInput" type="hidden" /><input id="postFilePicker" type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                            const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); (document.getElementById('postImgInput') as HTMLInputElement).value = comp; const pr = document.getElementById('postImgPreview') as HTMLImageElement; pr.src = comp; pr.classList.remove('hidden'); document.getElementById('postImgPlaceholder')?.classList.add('hidden'); }; r.readAsDataURL(f); }
                                        }} />
                                    </div>
                                    <Button type="submit" className="w-full h-16 uppercase">Publicar</Button>
                                </form>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {userPostsList.map(p => <PostCard key={p.id} post={p} author={currentUser} />)}
                            </div>
                        </div>
                        <div className="lg:col-span-4 glass-panel p-8 rounded-[40px] text-center h-fit sticky top-24">
                            <h3 className="font-black text-xl mb-4 text-brand-accent uppercase">Sua Conta</h3>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6 text-[10px] font-black uppercase text-gray-400">{currentUser.paymentStatus}</div>
                            <Button onClick={() => setCurrentView('PAYMENT')} variant="secondary" className="w-full py-4 text-[10px] font-black uppercase">Alterar Plano</Button>
                        </div>
                    </div>
                );

            case 'PAYMENT':
                return (
                    <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 text-center animate-in zoom-in duration-500">
                        <h2 className="text-5xl font-black mb-12 uppercase text-white">Planos de Exposição</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map(p => (
                                <div key={p.id} onClick={() => {
                                    storageService.updateUser({...currentUser!, planId: p.id, paymentStatus: PaymentStatus.AWAITING}).then(() => { refresh(); setCurrentView('DASHBOARD'); setToast({m: "Interesse enviado!", t: "success"}); });
                                }} className="glass-panel p-8 rounded-[40px] border-2 border-white/5 hover:border-brand-primary transition-all cursor-pointer group">
                                    <h3 className="font-black uppercase mb-4 text-white">{p.name}</h3>
                                    <div className="text-4xl font-black text-brand-secondary mb-2">R$ {p.price.toFixed(2)}</div>
                                    <p className="text-[10px] text-gray-500 uppercase">{p.durationDays} Dias</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 font-sans flex flex-col selection:bg-brand-primary/30">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={isOnline} />
            <main className="flex-1 flex flex-col">{renderView()}</main>
            {currentView !== 'ADMIN' && <Footer config={siteConfig} setCurrentView={setCurrentView} />}
            <AIChat config={siteConfig} />
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
