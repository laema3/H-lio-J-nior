
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG, INITIAL_CATEGORIES } from './services/storage';
import { isSupabaseReady } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy, chatWithAssistant } from './services/geminiService';
import { 
    Search, Clock, Check, Camera, Trash2, Edit3, AlertTriangle, Plus, ShieldCheck, Settings, CreditCard, Tag,
    Instagram, Facebook, Youtube, Phone, MapPin, Radio, MessageCircle, Send, X, Bot, LayoutDashboard, Loader2, 
    Image as ImageIcon, Users, CheckCircle2, XCircle, Layers, BarChart3, ChevronRight, Mail, PhoneCall, Globe, ArrowRight, ExternalLink, Database
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
        const t = setTimeout(onClose, 3000);
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
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter">Painel de Gestão</h2>
                            </div>
                            
                            {[
                                { id: 'INICIO', label: 'Resumo Geral', icon: BarChart3 },
                                { id: 'CLIENTES', label: 'Clientes', icon: Users },
                                { id: 'PAGAMENTOS', label: 'Pagamentos', icon: CreditCard, count: awaitingPayments.length },
                                { id: 'ANUNCIOS', label: 'Anúncios', icon: ImageIcon },
                                { id: 'CATEGORIAS', label: 'Categorias', icon: Tag },
                                { id: 'PLANOS', label: 'Planos de Venda', icon: Layers },
                                { id: 'AJUSTES', label: 'Ajustes do Site', icon: Settings }
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
                                <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${isSupabaseReady() ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    <Database size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{isSupabaseReady() ? 'Cloud Conectado' : 'Modo Offline (Local)'}</span>
                                </div>
                                <button onClick={() => setCurrentView('HOME')} className="flex items-center gap-3 p-4 w-full text-gray-500 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest">
                                    <Globe size={18} /> Ver Site Público
                                </button>
                            </div>
                        </aside>

                        <main className="flex-1 p-10 overflow-y-auto bg-gradient-to-br from-brand-dark/50 to-transparent">
                            
                            {adminSubView === 'INICIO' && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h2 className="text-4xl font-black uppercase tracking-tighter">Bem-vindo, Hélio</h2>
                                            <p className="text-gray-500 font-bold text-sm">Estatísticas em tempo real do seu portal.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5 group hover:border-brand-primary/30 transition-all">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-4 tracking-widest">Anunciantes</p>
                                            <p className="text-5xl font-black text-white">{advertisers.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5 border-l-brand-secondary border-l-4">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-4 tracking-widest">Pendentes</p>
                                            <p className="text-5xl font-black text-brand-secondary">{awaitingPayments.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-4 tracking-widest">Anúncios</p>
                                            <p className="text-5xl font-black text-brand-primary">{posts.length}</p>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[32px] border border-white/5">
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-4 tracking-widest">Categorias</p>
                                            <p className="text-5xl font-black">{categories.length}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="glass-panel p-8 rounded-[40px] space-y-6">
                                            <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2"><Users size={16} className="text-brand-primary"/> Novos Cadastros</h3>
                                            <div className="space-y-1">
                                                {advertisers.slice(0, 5).map(u => (
                                                    <div key={u.id} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 group">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black uppercase group-hover:text-brand-primary transition-colors">{u.name}</span>
                                                            <span className="text-[10px] text-gray-500 font-medium">{u.email}</span>
                                                        </div>
                                                        <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{u.paymentStatus}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[40px] space-y-6">
                                            <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2"><ImageIcon size={16} className="text-brand-secondary"/> Últimos Anúncios</h3>
                                            <div className="space-y-3">
                                                {posts.slice(0, 5).map(p => (
                                                    <div key={p.id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                                                        <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden border border-white/5">
                                                            <img src={p.imageUrl} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black uppercase line-clamp-1">{p.title}</span>
                                                            <span className="text-[10px] text-gray-500">por {p.authorName}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CLIENTES' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl font-black uppercase">Listagem de Clientes</h2>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                            <input placeholder="Buscar cliente..." className="bg-white/5 border border-white/10 rounded-full py-2 pl-12 pr-6 text-xs font-bold outline-none focus:border-brand-primary w-64" />
                                        </div>
                                    </div>
                                    <div className="glass-panel rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10">
                                                <tr className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                                    <th className="px-8 py-5">Nome / Empresa</th>
                                                    <th className="px-8 py-5">Contatos</th>
                                                    <th className="px-8 py-5">Área de Atuação</th>
                                                    <th className="px-8 py-5 text-center">Status</th>
                                                    <th className="px-8 py-5 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {advertisers.map(u => (
                                                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-8 py-6">
                                                            <p className="text-sm font-black text-white group-hover:text-brand-primary transition-colors">{u.name}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold tracking-tight">{u.email}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex gap-2">
                                                                <a href={`mailto:${u.email}`} className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all"><Mail size={16}/></a>
                                                                <a href={`tel:${u.phone}`} className="p-2 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"><PhoneCall size={16}/></a>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">{u.profession || 'Geral'}</td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>{u.paymentStatus}</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <button onClick={() => { if(confirm("Deseja remover este cliente permanentemente?")) { storageService.updateUser({...u, paymentStatus: PaymentStatus.AWAITING}).then(refresh); setToast({m: "Cliente Desativado", t: "error"}); } }} className="text-red-500 hover:bg-red-500/10 p-2.5 rounded-xl transition-all"><Trash2 size={18}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'PAGAMENTOS' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div>
                                        <h2 className="text-3xl font-black uppercase">Fila de Liberação</h2>
                                        <p className="text-gray-500 font-bold text-sm">Confirme o recebimento para ativar os anúncios.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        {awaitingPayments.length > 0 ? awaitingPayments.map(u => (
                                            <div key={u.id} className="glass-panel p-8 rounded-[32px] flex items-center justify-between border-l-4 border-l-yellow-500 shadow-xl">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                                        <CreditCard size={28} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black uppercase tracking-tighter">{u.name}</span>
                                                        <div className="flex items-center gap-4 mt-1">
                                                            <span className="text-xs text-gray-500 font-bold">Plano: {plans.find(p => p.id === u.planId)?.name || 'Especial'}</span>
                                                            <span className="text-xs text-brand-secondary font-black">R$ {plans.find(p => p.id === u.planId)?.price.toFixed(2) || '0.00'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => {
                                                            const exp = new Date(); exp.setDate(exp.getDate() + 30);
                                                            storageService.updateUser({...u, paymentStatus: PaymentStatus.CONFIRMED, expiresAt: exp.toISOString()}).then(refresh);
                                                            setToast({m: "Assinatura Ativada!", t: "success"});
                                                        }}
                                                        className="flex items-center gap-2 bg-green-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase shadow-2xl shadow-green-500/30 hover:scale-105 transition-transform"
                                                    >
                                                        <CheckCircle2 size={18}/> Confirmar Recebimento
                                                    </button>
                                                    <button className="p-3.5 bg-white/5 text-gray-500 rounded-2xl hover:text-white transition-colors border border-white/5"><X size={20}/></button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-24 glass-panel rounded-[40px] border border-dashed border-white/10">
                                                <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4 opacity-20" />
                                                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Sem pendências financeiras.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'ANUNCIOS' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl font-black uppercase">Moderação</h2>
                                        <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">{posts.length} Ativos</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {posts.map(p => (
                                            <div key={p.id} className="relative group">
                                                <PostCard post={p} author={allUsers.find(u => u.id === p.authorId)} />
                                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20 scale-90 group-hover:scale-100">
                                                    <button onClick={() => storageService.deletePost(p.id).then(refresh)} className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:bg-red-600 transition-all"><Trash2 size={18}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CATEGORIAS' && (
                                <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
                                    <h2 className="text-3xl font-black uppercase">Gerenciar Nichos</h2>
                                    <div className="glass-panel p-10 rounded-[40px] space-y-8 border border-white/5">
                                        <div className="flex gap-3">
                                            <input id="newCatAdmin" placeholder="Nova Categoria..." className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest outline-none focus:border-brand-primary" />
                                            <Button onClick={() => {
                                                const v = (document.getElementById('newCatAdmin') as HTMLInputElement).value;
                                                if(v) { storageService.saveCategories([...categories, v]).then(() => { refresh(); (document.getElementById('newCatAdmin') as HTMLInputElement).value = ''; }); setToast({m: "Categoria Salva", t: "success"}); }
                                            }} className="px-10"><Plus/></Button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {categories.map(c => (
                                                <div key={c} className="bg-brand-dark/50 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-brand-primary/50 transition-all">
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-300">{c}</span>
                                                    <button onClick={() => storageService.saveCategories(categories.filter(cat => cat !== c)).then(refresh)} className="text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'PLANOS' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <h2 className="text-3xl font-black uppercase">Venda de Exposição</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {plans.map(p => (
                                            <div key={p.id} className="glass-panel p-10 rounded-[40px] border border-white/5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4"><Layers size={24} className="text-white/5" /></div>
                                                <h4 className="font-black text-[10px] text-brand-primary uppercase mb-6 tracking-widest">{p.name}</h4>
                                                <div className="flex items-baseline gap-1 mb-8">
                                                    <span className="text-lg font-black text-brand-secondary">R$</span>
                                                    <span className="text-5xl font-black text-white tracking-tighter">{p.price.toFixed(2)}</span>
                                                </div>
                                                <div className="space-y-4 mb-10">
                                                    <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-tight"><Check size={16} className="text-green-500"/> {p.durationDays} Dias de Anúncio</div>
                                                    <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-tight"><Check size={16} className="text-green-500"/> Criador IA Ilimitado</div>
                                                </div>
                                                <Button variant="outline" className="w-full text-[11px] uppercase font-black py-4 border-white/10 hover:border-brand-primary transition-all">Configurar Valor</Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'AJUSTES' && (
                                <div className="space-y-10 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl font-black uppercase text-brand-accent">Identidade do Portal</h2>
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isSupabaseReady() ? 'text-green-500' : 'text-red-500'}`}>
                                            <Database size={14} /> {isSupabaseReady() ? 'Cloud Synced' : 'Local Only'}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-4 space-y-6">
                                            <div className="glass-panel p-8 rounded-[40px] space-y-6">
                                                <h3 className="text-xs font-black uppercase tracking-widest">Logotipos</h3>
                                                <div className="space-y-4">
                                                    <div onClick={() => document.getElementById('h-logo-s')?.click()} className="aspect-[3/1] bg-black/40 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden cursor-pointer group hover:border-brand-primary transition-all">
                                                        {siteConfig.headerLogoUrl ? <img src={siteConfig.headerLogoUrl} className="w-full h-full object-contain p-2" /> : <><Plus className="text-gray-500 mb-1"/><span className="text-[9px] font-black uppercase text-gray-600">Logo Topo</span></>}
                                                        <input id="h-logo-s" type="file" className="hidden" onChange={async (e) => {
                                                            const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); storageService.updateConfig({...siteConfig, headerLogoUrl: comp}).then(refresh); }; r.readAsDataURL(f); }
                                                        }} />
                                                    </div>
                                                    <div onClick={() => document.getElementById('f-logo-s')?.click()} className="aspect-[3/1] bg-black/40 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden cursor-pointer group hover:border-brand-primary transition-all">
                                                        {siteConfig.footerLogoUrl ? <img src={siteConfig.footerLogoUrl} className="w-full h-full object-contain p-2" /> : <><Plus className="text-gray-500 mb-1"/><span className="text-[9px] font-black uppercase text-gray-600">Logo Rodapé</span></>}
                                                        <input id="f-logo-s" type="file" className="hidden" onChange={async (e) => {
                                                            const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); storageService.updateConfig({...siteConfig, footerLogoUrl: comp}).then(refresh); }; r.readAsDataURL(f); }
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="glass-panel p-8 rounded-[40px] space-y-4">
                                                <h3 className="text-xs font-black uppercase tracking-widest">Banner Principal</h3>
                                                <div onClick={() => document.getElementById('hero-img-s')?.click()} className="aspect-video bg-black/40 rounded-2xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden cursor-pointer group hover:border-brand-primary transition-all">
                                                    {siteConfig.heroImageUrl ? <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-500" />}
                                                    <input id="hero-img-s" type="file" className="hidden" onChange={async (e) => {
                                                        const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); storageService.updateConfig({...siteConfig, heroImageUrl: comp}).then(refresh); }; r.readAsDataURL(f); }
                                                    }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-8 glass-panel p-10 rounded-[40px] space-y-6">
                                            <h3 className="text-xs font-black uppercase tracking-widest">Textos e Contatos</h3>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 px-2">Título Grande (H1)</label>
                                                    <input className="bg-white/5 border border-white/10 p-5 rounded-2xl text-sm w-full font-black uppercase tracking-tighter" value={siteConfig.heroTitle} onChange={e => storageService.updateConfig({...siteConfig, heroTitle: e.target.value}).then(refresh)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-gray-500 px-2">Slogan do Portal</label>
                                                    <textarea className="bg-white/5 border border-white/10 p-5 rounded-2xl text-sm h-32 w-full italic" value={siteConfig.heroSubtitle} onChange={e => storageService.updateConfig({...siteConfig, heroSubtitle: e.target.value}).then(refresh)} />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-gray-500 px-2">WhatsApp Suporte</label>
                                                        <input className="bg-white/5 border border-white/10 p-4 rounded-2xl text-xs w-full font-bold" value={siteConfig.whatsapp} onChange={e => storageService.updateConfig({...siteConfig, whatsapp: e.target.value}).then(refresh)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-gray-500 px-2">Instagram URL</label>
                                                        <input className="bg-white/5 border border-white/10 p-4 rounded-2xl text-xs w-full font-bold" value={siteConfig.instagramUrl} onChange={e => storageService.updateConfig({...siteConfig, instagramUrl: e.target.value}).then(refresh)} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-8">
                                                <Button onClick={() => setToast({m: "Sincronizado com Supabase!", t: "success"})} className="w-full h-16 text-lg">Salvar Todas Alterações</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>
                );

            case 'DASHBOARD':
                if (!currentUser) return null;
                const userPosts = posts.filter(p => p.authorId === currentUser.id);
                return (
                    <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom duration-500">
                        <div className="lg:col-span-8 space-y-8">
                            <div className="glass-panel p-10 rounded-[40px]">
                                <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter">Novo Anúncio</h2>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as any;
                                    const imgVal = (document.getElementById('postImgInput') as HTMLInputElement).value;
                                    if (!imgVal) { setToast({m: "Escolha uma imagem!", t: "error"}); return; }
                                    await storageService.addPost({
                                        id: 'p-'+Date.now(), authorId: currentUser.id, authorName: currentUser.name, category: currentUser.profession || 'Outros', title: form.title.value, content: form.content.value, imageUrl: imgVal, whatsapp: currentUser.phone, phone: currentUser.phone, createdAt: new Date().toISOString()
                                    });
                                    refresh(); form.reset();
                                    (document.getElementById('postImgInput') as HTMLInputElement).value = '';
                                    (document.getElementById('postImgPreview') as HTMLImageElement).classList.add('hidden');
                                    (document.getElementById('postImgPlaceholder') as HTMLElement).classList.remove('hidden');
                                    setToast({m: "Anúncio Publicado!", t: "success"});
                                }} className="space-y-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-500 uppercase px-2">Título do Anúncio</p>
                                        <input name="title" required placeholder="Ex: Serviços de Pintura em Geral" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold focus:border-brand-primary outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-2">
                                            <p className="text-[10px] font-black text-gray-500 uppercase">Texto (IA Inteligente)</p>
                                            <button type="button" onClick={async () => {
                                                const k = (document.getElementById('ia-keywords') as HTMLInputElement).value;
                                                if(k) { const txt = await generateAdCopy(currentUser.profession || '', k); (document.getElementsByName('content')[0] as HTMLTextAreaElement).value = txt; }
                                                else { setToast({m: "Resuma o que você faz abaixo!", t: "error"}); }
                                            }} className="text-[9px] font-black uppercase text-brand-primary hover:text-brand-accent transition-colors flex items-center gap-1"><Bot size={12} /> Gerar Texto IA</button>
                                        </div>
                                        <textarea name="content" required placeholder="Dica: Use a IA abaixo para criar um texto matador..." className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white h-32 text-sm outline-none focus:border-brand-primary" />
                                        <input id="ia-keywords" placeholder="Digite palavras-chave: qualidade, rapidez, preço baixo..." className="w-full bg-brand-primary/10 border border-brand-primary/20 p-3 rounded-xl text-[10px] text-brand-primary font-bold placeholder:text-brand-primary/40 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-gray-500 uppercase px-2">Moldura da Foto (16:9)</p>
                                        <div onClick={() => document.getElementById('postFilePicker')?.click()} className="aspect-video bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden group relative">
                                            <img id="postImgPreview" className="w-full h-full object-contain hidden relative z-10" />
                                            <div id="postImgPlaceholder" className="flex flex-col items-center gap-2">
                                                <Camera className="text-gray-500 group-hover:text-brand-primary transition-all duration-300" size={32} />
                                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Clique para Enquadrar Foto</span>
                                            </div>
                                            <input id="postImgInput" type="hidden" />
                                            <input id="postFilePicker" type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                                const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); (document.getElementById('postImgInput') as HTMLInputElement).value = comp; const prev = document.getElementById('postImgPreview') as HTMLImageElement; prev.src = comp; prev.classList.remove('hidden'); (document.getElementById('postImgPlaceholder') as HTMLElement).classList.add('hidden'); }; r.readAsDataURL(f); }
                                            }} />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-16 uppercase font-black text-lg shadow-xl shadow-brand-primary/20">Publicar Agora</Button>
                                </form>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {userPosts.map(p => (
                                    <div key={p.id} className="relative group">
                                        <PostCard post={p} author={currentUser} />
                                        <button onClick={() => storageService.deletePost(p.id).then(refresh)} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl z-20"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-4 glass-panel p-8 rounded-[40px] text-center h-fit sticky top-24 border border-brand-accent/20">
                            <h3 className="font-black text-xl mb-4 text-brand-accent uppercase tracking-tighter">Sua Assinatura</h3>
                            <div className={`p-5 rounded-2xl border mb-6 text-xs font-black uppercase tracking-widest ${currentUser.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'}`}>{currentUser.paymentStatus}</div>
                            {currentUser.expiresAt && <p className="text-[10px] font-black text-gray-500 mb-8 uppercase">Acesso válido até: {new Date(currentUser.expiresAt).toLocaleDateString()}</p>}
                            <Button onClick={() => setCurrentView('PAYMENT')} variant="secondary" className="w-full py-4 text-xs font-black uppercase">Ver Planos de Exposição</Button>
                        </div>
                    </div>
                );

            case 'PAYMENT':
                return (
                    <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 text-center animate-in zoom-in duration-500">
                        <h2 className="text-5xl font-black mb-12 uppercase tracking-tighter">Planos de Visibilidade</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            {plans.map(p => (
                                <div key={p.id} onClick={() => {
                                    storageService.updateUser({...currentUser!, planId: p.id, paymentStatus: PaymentStatus.AWAITING}).then(() => { refresh(); setCurrentView('DASHBOARD'); setToast({m: "Interesse enviado!", t: "success"}); });
                                }} className="glass-panel p-8 rounded-[40px] border-2 border-white/5 hover:border-brand-primary transition-all cursor-pointer group hover:-translate-y-2">
                                    <h3 className="font-black uppercase mb-4 group-hover:text-brand-primary text-sm tracking-widest">{p.name}</h3>
                                    <div className="text-4xl font-black text-brand-secondary mb-2 tracking-tighter">R$ {p.price.toFixed(2)}</div>
                                    <p className="text-[10px] text-gray-500 uppercase font-black">{p.durationDays} Dias de Anúncio</p>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" onClick={() => setCurrentView('DASHBOARD')} className="font-black uppercase text-[10px] px-10 tracking-widest">Voltar ao Painel</Button>
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
