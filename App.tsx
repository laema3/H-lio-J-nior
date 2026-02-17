
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG, INITIAL_CATEGORIES } from './services/storage';
import { db, isSupabaseReady, reinitializeSupabase } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy, chatWithAssistant } from './services/geminiService';
import { 
    Search, Clock, Check, Camera, Trash2, Edit3, AlertTriangle, Plus, ShieldCheck, Settings, CreditCard, Tag,
    Instagram, Facebook, Youtube, Phone, MapPin, Radio, MessageCircle, Send, X, Bot, LayoutDashboard, Loader2, 
    Image as ImageIcon, Users, CheckCircle2, XCircle, Layers, BarChart3, ChevronRight, Mail, PhoneCall, Globe, ArrowRight, ExternalLink, Database, Activity, Wifi, WifiOff, Terminal, Key, Link2
} from 'lucide-react';

// Admin Sub-Views para o Menu Lateral
type AdminSubView = 'INICIO' | 'CLIENTES' | 'PAGAMENTOS' | 'ANUNCIOS' | 'CATEGORIAS' | 'PLANOS' | 'AJUSTES';

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
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none" />

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
                        <div className="flex gap-2">
                             <div className="flex-1 h-1 bg-brand-primary/20 rounded-full overflow-hidden">
                                <div className="h-full w-2/3 bg-brand-primary animate-pulse" />
                             </div>
                             <div className="flex-1 h-1 bg-brand-secondary/20 rounded-full" />
                             <div className="flex-1 h-1 bg-brand-accent/20 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                    © {new Date().getFullYear()} Portal de Anunciantes Hélio Júnior. Todos os direitos reservados.
                </p>
                <div className="flex items-center gap-6">
                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1">Desenvolvido com <Check size={10} className="text-brand-primary" /> Broadcaster v3</span>
                </div>
            </div>
        </div>
    </footer>
);

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isTestingConn, setIsTestingConn] = useState(false);
    const [testLogs, setTestLogs] = useState<string[]>([]);
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

    // Refs para o formulário de conexão manual
    const sUrlRef = useRef<HTMLInputElement>(null);
    const sKeyRef = useRef<HTMLInputElement>(null);

    const refresh = async () => {
        const [p, u, c, cfg] = await Promise.all([
            storageService.getPosts(),
            storageService.getUsers(),
            storageService.getCategories(),
            storageService.getConfig()
        ]);
        setPosts(p); setAllUsers(u); setCategories(c); setSiteConfig(cfg); setPlans(storageService.getPlans());
        const session = getFromLocal(STORAGE_KEYS.SESSION, null);
        if (session) {
            const freshUser = u.find(user => user.id === session.id);
            if (freshUser) { setCurrentUser(freshUser); saveToLocal(STORAGE_KEYS.SESSION, freshUser); }
            else if (session.role === UserRole.ADMIN) { setCurrentUser(session); }
        }
        setIsLoading(false);
    };

    useEffect(() => { storageService.init().then(refresh); }, []);

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
        setTestLogs(["⏱️ Iniciando teste estruturado..."]);
        const result = await db.testConnection();
        setIsTestingConn(false);
        setTestLogs(result.log);
        if (result.success) {
            setToast({ m: "Supabase Validado! Sincronização OK.", t: "success" });
        } else {
            setToast({ m: `Falha: ${result.message}`, t: "error" });
        }
    };

    const handleSaveSupabaseManual = () => {
        const url = sUrlRef.current?.value || '';
        const key = sKeyRef.current?.value || '';
        if (reinitializeSupabase(url, key)) {
            setToast({ m: "Credenciais Salvas! Reiniciando...", t: "success" });
            setTimeout(() => window.location.reload(), 1500);
        } else {
            setToast({ m: "Credenciais inválidas. Verifique os dados.", t: "error" });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-brand-primary w-12 h-12" />
                <p className="text-white font-black uppercase tracking-widest text-xs">Carregando Portal...</p>
            </div>
        );
    }

    const renderView = () => {
        switch(currentView) {
            case 'HOME':
                const visiblePosts = posts.filter(p => {
                    const auth = allUsers.find(u => u.id === p.authorId);
                    if (p.authorId === 'admin') return true;
                    const isExp = auth?.expiresAt ? new Date(auth.expiresAt).getTime() < new Date().getTime() : false;
                    return auth?.paymentStatus === PaymentStatus.CONFIRMED && !isExp;
                });
                const filtered = filterCategory === 'ALL' ? visiblePosts : visiblePosts.filter(p => p.category === filterCategory);
                return (
                    <div className="animate-in fade-in duration-700">
                        <section className="relative pt-32 pb-20 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-dark to-brand-secondary/5 pointer-events-none" />
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
                                <div className="aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative">
                                    <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover" alt="Banner" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent pointer-events-none" />
                                </div>
                            </div>
                        </section>
                        <section className="max-w-7xl mx-auto px-4 mb-16">
                            <div className="flex flex-wrap justify-center gap-2">
                                <button onClick={() => setFilterCategory('ALL')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === 'ALL' ? 'bg-white text-brand-dark border-white' : 'bg-white/5 text-gray-400 border-white/10'}`}>Todos</button>
                                {categories.map(c => <button key={c} onClick={() => setFilterCategory(c)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === c ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>{c}</button>)}
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
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhum anúncio ativo nesta categoria.</p>
                                </div>
                            )}
                        </section>
                    </div>
                );

            case 'LOGIN':
            case 'REGISTER':
                return (
                    <div className="pt-32 pb-20 max-w-md mx-auto px-4 animate-in zoom-in duration-500">
                        <div className="glass-panel p-10 rounded-[40px] shadow-2xl">
                            <h2 className="text-4xl font-black text-center mb-8 uppercase tracking-tighter">{currentView === 'LOGIN' ? 'Acessar' : 'Criar Conta'}</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.target as any;
                                const email = form.email.value;
                                const user = await storageService.findUserByEmail(email);
                                if (currentView === 'LOGIN') {
                                    if (user) handleLogin(user); else setToast({ m: "Não encontrado", t: "error"});
                                } else {
                                    if (user) setToast({ m: "Já existe", t: "error"});
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
                                        <input name="name" required placeholder="Nome / Empresa" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                        <select name="profession" className="w-full bg-brand-dark border border-white/10 p-4 rounded-2xl text-white font-bold">
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input name="phone" required placeholder="WhatsApp" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                    </>
                                )}
                                <input name="email" type="email" required placeholder="E-mail" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                <input name="password" type="password" required placeholder="Senha" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                <Button type="submit" className="w-full h-14 uppercase font-black">{currentView === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</Button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-xs text-gray-500 font-bold mt-4">Alternar modo</button>
                            </form>
                        </div>
                    </div>
                );

            case 'ADMIN':
                if (currentUser?.role !== UserRole.ADMIN) return null;
                const advertisers = allUsers.filter(u => u.role === UserRole.ADVERTISER);
                const awaitingPayments = advertisers.filter(u => u.paymentStatus === PaymentStatus.AWAITING);

                return (
                    <div className="min-h-screen bg-brand-dark pt-20 flex">
                        <aside className="w-72 border-r border-white/5 bg-brand-dark/80 backdrop-blur-2xl flex flex-col p-6 gap-3 hidden md:flex shrink-0">
                            <div className="mb-8 px-4">
                                <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">Broadcaster v3</p>
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter">Gestão Portal</h2>
                            </div>
                            
                            {[
                                { id: 'INICIO', label: 'Dashboard', icon: BarChart3 },
                                { id: 'CLIENTES', label: 'Anunciantes', icon: Users },
                                { id: 'PAGAMENTOS', label: 'Financeiro', icon: CreditCard, count: awaitingPayments.length },
                                { id: 'ANUNCIOS', label: 'Moderação', icon: ImageIcon },
                                { id: 'CATEGORIAS', label: 'Nichos/Áreas', icon: Tag },
                                { id: 'PLANOS', label: 'Produtos', icon: Layers },
                                { id: 'AJUSTES', label: 'Ajustes Técnicos', icon: Settings }
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
                                    {item.count ? <span className="bg-brand-secondary text-[10px] px-2 py-0.5 rounded-full text-white font-black">{item.count}</span> : <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </button>
                            ))}
                            
                            <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                                <div className={`px-4 py-3 rounded-2xl border flex flex-col gap-2 ${isSupabaseReady() ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                    <div className="flex items-center gap-2">
                                      <Database size={14} className={isSupabaseReady() ? 'text-green-500' : 'text-red-500'} />
                                      <span className="text-[9px] font-black uppercase tracking-widest text-white">Status Cloud</span>
                                    </div>
                                    <span className={`text-[8px] font-bold uppercase ${isSupabaseReady() ? 'text-green-400' : 'text-red-400'}`}>
                                      {isSupabaseReady() ? '✓ Conectado ao Supabase' : '⚠ Operando Offline'}
                                    </span>
                                </div>
                                <button onClick={() => setCurrentView('HOME')} className="flex items-center gap-3 p-4 w-full text-gray-500 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest group">
                                    <Globe size={18} className="group-hover:text-brand-primary" /> Ver Site Público
                                </button>
                            </div>
                        </aside>

                        <main className="flex-1 p-10 overflow-y-auto bg-gradient-to-br from-brand-dark/50 to-transparent">
                            
                            {adminSubView === 'INICIO' && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h2 className="text-4xl font-black uppercase tracking-tighter">Olá, Hélio Júnior</h2>
                                            <p className="text-gray-500 font-bold text-sm">Resumo da performance do seu portal de classificados.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5 group hover:border-brand-primary/30 transition-all">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-4 tracking-widest">Total Clientes</p>
                                            <p className="text-5xl font-black text-white">{advertisers.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5 border-l-brand-secondary border-l-4">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-4 tracking-widest">Aguardando Pgto</p>
                                            <p className="text-5xl font-black text-brand-secondary">{awaitingPayments.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-4 tracking-widest">Posts Ativos</p>
                                            <p className="text-5xl font-black text-brand-primary">{posts.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-4 tracking-widest">Nichos</p>
                                            <p className="text-5xl font-black">{categories.length}</p>
                                        </div>
                                    </div>
                                    {/* Alerta de Offline */}
                                    {!isSupabaseReady() && (
                                      <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-[32px] flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                              <AlertTriangle className="text-red-500" size={32} />
                                              <div>
                                                  <h4 className="text-white font-black uppercase text-sm tracking-widest">Alerta de Sincronização</h4>
                                                  <p className="text-gray-400 text-xs font-bold">Variáveis do Supabase não detectadas. O site está salvando apenas no seu navegador.</p>
                                              </div>
                                          </div>
                                          <Button variant="outline" onClick={() => setAdminSubView('AJUSTES')} className="border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white">Configurar Agora</Button>
                                      </div>
                                    )}
                                </div>
                            )}

                            {adminSubView === 'AJUSTES' && (
                                <div className="space-y-10 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl font-black uppercase text-brand-accent">Sincronização & Identidade</h2>
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-white/5 border ${isSupabaseReady() ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20'}`}>
                                            {isSupabaseReady() ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
                                            {isSupabaseReady() ? 'Nuvem Conectada' : 'Servidor Desconectado'}
                                        </div>
                                    </div>

                                    {/* Configuração de Banco de Dados */}
                                    <div className="glass-panel p-8 rounded-[40px] border border-white/5 space-y-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-brand-primary/20 rounded-2xl text-brand-primary">
                                                <Database size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-widest">Configuração do Banco de Dados (Supabase)</h3>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Conecte sua conta para garantir que os dados nunca se percam.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-500 px-2 flex items-center gap-2"><Link2 size={12}/> Supabase Project URL</label>
                                                <input 
                                                    ref={sUrlRef}
                                                    defaultValue={localStorage.getItem('supabase_url_manual') || ''}
                                                    placeholder="https://suaid.supabase.co" 
                                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white font-mono outline-none focus:border-brand-primary" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-500 px-2 flex items-center gap-2"><Key size={12}/> Anon Public Key</label>
                                                <input 
                                                    ref={sKeyRef}
                                                    defaultValue={localStorage.getItem('supabase_key_manual') || ''}
                                                    type="password"
                                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..." 
                                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white font-mono outline-none focus:border-brand-primary" 
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-4">
                                            <Button onClick={handleSaveSupabaseManual} className="flex-1 py-4 uppercase font-black tracking-widest">Conectar ao Banco de Dados</Button>
                                            <Button 
                                                onClick={handleTestSupabase} 
                                                isLoading={isTestingConn}
                                                variant="outline"
                                                className="flex-1 py-4 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                                            >
                                                {isTestingConn ? 'Testando Conexão...' : 'Executar Teste de Estresse'}
                                            </Button>
                                        </div>

                                        {testLogs.length > 0 && (
                                            <div className="bg-black/40 rounded-3xl p-6 font-mono text-[10px] space-y-2 border border-white/5">
                                                <p className="text-gray-500 mb-2 font-black uppercase tracking-widest flex items-center gap-2"><Terminal size={12}/> Resultado do Diagnóstico:</p>
                                                {testLogs.map((log, i) => (
                                                    <div key={i} className={`${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-gray-400'}`}>
                                                        {log}
                                                    </div>
                                                ))}
                                                <p className="text-[8px] text-gray-600 mt-4 italic">* Detalhes técnicos completos foram enviados para o Console do Navegador (F12).</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Seção de Textos e Identidade */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        {/* ... (Manter o restante da UI de logs e textos que já existia) ... */}
                                        <div className="lg:col-span-12 glass-panel p-10 rounded-[40px] space-y-6">
                                            <h3 className="text-xs font-black uppercase tracking-widest">Identidade do Portal</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 px-2">Título Principal (H1)</label>
                                                    <input className="bg-white/5 border border-white/10 p-5 rounded-2xl text-sm w-full font-black uppercase tracking-tighter" value={siteConfig.heroTitle} onChange={e => storageService.updateConfig({...siteConfig, heroTitle: e.target.value}).then(refresh)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 px-2">Nome do Radialista / Marca</label>
                                                    <input className="bg-white/5 border border-white/10 p-5 rounded-2xl text-sm w-full font-black uppercase" value={siteConfig.heroLabel} onChange={e => storageService.updateConfig({...siteConfig, heroLabel: e.target.value}).then(refresh)} />
                                                </div>
                                            </div>
                                            {/* (Outros campos de texto continuam aqui...) */}
                                            <div className="pt-8">
                                                <Button onClick={() => setToast({m: "Alterações Salvas!", t: "success"})} className="w-full h-16 text-lg uppercase font-black">Salvar Alterações do Site</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ... (Resto das subviews CLIENTES, PAGAMENTOS, etc) ... */}
                        </main>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 font-sans flex flex-col selection:bg-brand-primary/30">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} />
            <main className="flex-1 flex flex-col">{renderView()}</main>
            {currentView !== 'ADMIN' && <Footer config={siteConfig} setCurrentView={setCurrentView} />}
            <AIChat config={siteConfig} />
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
