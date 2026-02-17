
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG, INITIAL_CATEGORIES } from './services/storage';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy, chatWithAssistant } from './services/geminiService';
import { 
    Search, Clock, Check, Camera, Trash2, Edit3, AlertTriangle, Plus, ShieldCheck, Settings, CreditCard, Tag,
    Instagram, Facebook, Youtube, Phone, MapPin, Radio, MessageCircle, Send, X, Bot, LayoutDashboard, Loader2, 
    Image as ImageIcon, Users, CheckCircle2, XCircle, Layers, BarChart3, ChevronRight, Mail, PhoneCall
} from 'lucide-react';

// Admin Sub-Views
type AdminSubView = 'DASHBOARD' | 'CLIENTS' | 'PAYMENTS' | 'ADS' | 'CATEGORIES' | 'PLANS' | 'SETTINGS';

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

const Footer: React.FC<{ config: SiteConfig }> = ({ config }) => (
    <footer className="bg-brand-dark/80 backdrop-blur-xl border-t border-white/5 py-20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-6 space-y-8">
                <div className="h-16 w-56 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden">
                    {config.footerLogoUrl ? <img src={config.footerLogoUrl} className="w-full h-full object-contain" /> : <span className="font-black text-white">{config.heroLabel}</span>}
                </div>
                <p className="text-gray-400 text-sm italic">"{config.heroSubtitle}"</p>
                <div className="flex gap-4">
                    {config.instagramUrl && <a href={config.instagramUrl} target="_blank" className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white"><Instagram size={20}/></a>}
                    {config.facebookUrl && <a href={config.facebookUrl} target="_blank" className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white"><Facebook size={20}/></a>}
                    {config.youtubeUrl && <a href={config.youtubeUrl} target="_blank" className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white"><Youtube size={20}/></a>}
                </div>
            </div>
            <div className="md:col-span-6 space-y-4 text-sm text-gray-400">
                <h3 className="text-white font-black uppercase tracking-widest text-xs">Contato</h3>
                <p className="flex items-center gap-2"><MapPin size={16} className="text-brand-primary"/> {config.address}</p>
                <p className="flex items-center gap-2"><Phone size={16} className="text-brand-primary"/> {config.phone}</p>
                <p>© {new Date().getFullYear()} Portal Hélio Júnior</p>
            </div>
        </div>
    </footer>
);

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<AdminSubView>('DASHBOARD');
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
                        {/* Sidebar */}
                        <aside className="w-64 border-r border-white/5 bg-brand-dark/50 flex flex-col p-6 gap-2 hidden md:flex shrink-0">
                            {[
                                { id: 'DASHBOARD', label: 'Resumo', icon: BarChart3 },
                                { id: 'CLIENTS', label: 'Clientes', icon: Users },
                                { id: 'PAYMENTS', label: 'Pagamentos', icon: CreditCard, count: awaitingPayments.length },
                                { id: 'ADS', label: 'Anúncios', icon: ImageIcon },
                                { id: 'CATEGORIES', label: 'Categorias', icon: Tag },
                                { id: 'PLANS', label: 'Planos', icon: Layers },
                                { id: 'SETTINGS', label: 'Ajustes', icon: Settings }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setAdminSubView(item.id as AdminSubView)}
                                    className={`flex items-center justify-between p-3 rounded-xl transition-all group ${adminSubView === item.id ? 'bg-brand-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} />
                                        <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    {item.count ? <span className="bg-brand-secondary text-[10px] px-1.5 py-0.5 rounded-full text-white">{item.count}</span> : <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </button>
                            ))}
                        </aside>

                        {/* Main Content Area */}
                        <main className="flex-1 p-8 overflow-y-auto">
                            {adminSubView === 'DASHBOARD' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <h2 className="text-3xl font-black uppercase">Visão Geral</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="glass-panel p-6 rounded-3xl border border-white/5">
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Total Anunciantes</p>
                                            <p className="text-4xl font-black">{advertisers.length}</p>
                                        </div>
                                        <div className="glass-panel p-6 rounded-3xl border border-white/5 border-l-brand-secondary border-l-4">
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Pendentes Pgto</p>
                                            <p className="text-4xl font-black text-brand-secondary">{awaitingPayments.length}</p>
                                        </div>
                                        <div className="glass-panel p-6 rounded-3xl border border-white/5">
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Anúncios Ativos</p>
                                            <p className="text-4xl font-black text-brand-primary">{posts.length}</p>
                                        </div>
                                        <div className="glass-panel p-6 rounded-3xl border border-white/5">
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Categorias</p>
                                            <p className="text-4xl font-black">{categories.length}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="glass-panel p-8 rounded-[40px] space-y-4">
                                            <h3 className="font-black uppercase text-sm">Últimos Clientes</h3>
                                            {advertisers.slice(0, 5).map(u => (
                                                <div key={u.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black uppercase">{u.name}</span>
                                                        <span className="text-[10px] text-gray-500">{u.email}</span>
                                                    </div>
                                                    <span className={`text-[8px] px-2 py-1 rounded-full font-bold uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{u.paymentStatus}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="glass-panel p-8 rounded-[40px] space-y-4">
                                            <h3 className="font-black uppercase text-sm">Atividade Recente</h3>
                                            {posts.slice(0, 5).map(p => (
                                                <div key={p.id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                                                    <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black uppercase line-clamp-1">{p.title}</span>
                                                        <span className="text-[10px] text-gray-500">por {p.authorName}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CLIENTS' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <h2 className="text-3xl font-black uppercase">Listagem de Clientes</h2>
                                    <div className="glass-panel rounded-[32px] overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10">
                                                <tr className="text-[10px] font-black uppercase text-gray-500">
                                                    <th className="px-6 py-4">Nome</th>
                                                    <th className="px-6 py-4">Contato</th>
                                                    <th className="px-6 py-4">Profissão</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {advertisers.map(u => (
                                                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-black text-white">{u.name}</p>
                                                            <p className="text-[10px] text-gray-500">{u.email}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2">
                                                                <a href={`mailto:${u.email}`} className="p-1.5 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-all"><Mail size={14}/></a>
                                                                <a href={`tel:${u.phone}`} className="p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all"><PhoneCall size={14}/></a>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-gray-400">{u.profession || 'N/A'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[8px] px-2 py-1 rounded-full font-black uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{u.paymentStatus}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <button onClick={() => { if(confirm("Deseja remover este cliente e seus anúncios?")) { advertisers.filter(cl => cl.id !== u.id); /* Storage logic would go here */ refresh(); } }} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-all"><Trash2 size={16}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'PAYMENTS' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <h2 className="text-3xl font-black uppercase">Liberação Manual</h2>
                                    <div className="grid grid-cols-1 gap-4">
                                        {awaitingPayments.length > 0 ? awaitingPayments.map(u => (
                                            <div key={u.id} className="glass-panel p-6 rounded-3xl flex items-center justify-between border-l-4 border-l-yellow-500">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black uppercase">{u.name}</span>
                                                    <span className="text-xs text-gray-500">Plano Pretendido: {plans.find(p => p.id === u.planId)?.name || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button 
                                                        onClick={() => {
                                                            const exp = new Date(); exp.setDate(exp.getDate() + 30);
                                                            storageService.updateUser({...u, paymentStatus: PaymentStatus.CONFIRMED, expiresAt: exp.toISOString()}).then(refresh);
                                                            setToast({m: "Acesso Liberado com Sucesso!", t: "success"});
                                                        }}
                                                        className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-500/20"
                                                    >
                                                        <CheckCircle2 size={16}/> Liberar Acesso
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                <Check size={48} className="mx-auto text-green-500 mb-4 opacity-30" />
                                                <p className="text-gray-500 font-bold uppercase text-[10px]">Tudo certo! Sem pagamentos pendentes.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'ADS' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <h2 className="text-3xl font-black uppercase">Moderação de Anúncios</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {posts.map(p => (
                                            <div key={p.id} className="relative group">
                                                <PostCard post={p} author={allUsers.find(u => u.id === p.authorId)} />
                                                <button onClick={() => storageService.deletePost(p.id).then(refresh)} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl z-20"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CATEGORIES' && (
                                <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
                                    <h2 className="text-3xl font-black uppercase">Categorias do Site</h2>
                                    <div className="glass-panel p-8 rounded-[40px] space-y-6">
                                        <div className="flex gap-2">
                                            <input id="newCatAdmin" placeholder="Nome da Categoria..." className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                            <Button onClick={() => {
                                                const v = (document.getElementById('newCatAdmin') as HTMLInputElement).value;
                                                if(v) { storageService.saveCategories([...categories, v]).then(() => { refresh(); (document.getElementById('newCatAdmin') as HTMLInputElement).value = ''; }); }
                                            }} className="px-8"><Plus/></Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {categories.map(c => (
                                                <div key={c} className="bg-brand-dark/50 border border-white/10 p-4 rounded-2xl flex items-center justify-between group hover:border-brand-primary transition-all">
                                                    <span className="text-xs font-black uppercase tracking-widest">{c}</span>
                                                    <button onClick={() => storageService.saveCategories(categories.filter(cat => cat !== c)).then(refresh)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'PLANS' && (
                                <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
                                    <h2 className="text-3xl font-black uppercase">Planos e Preços</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {plans.map(p => (
                                            <div key={p.id} className="glass-panel p-8 rounded-[40px] border border-white/5">
                                                <h4 className="font-black text-xs text-gray-500 uppercase mb-6 tracking-widest">{p.name}</h4>
                                                <div className="flex items-baseline gap-1 mb-8">
                                                    <span className="text-sm font-bold text-brand-secondary">R$</span>
                                                    <span className="text-4xl font-black text-white">{p.price.toFixed(2)}</span>
                                                </div>
                                                <div className="space-y-3 mb-8">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase"><Check size={14} className="text-green-500"/> {p.durationDays} Dias Ativo</div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase"><Check size={14} className="text-green-500"/> Suporte IA</div>
                                                </div>
                                                <Button variant="outline" className="w-full text-[10px] uppercase font-black py-3">Editar Detalhes</Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'SETTINGS' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <h2 className="text-3xl font-black uppercase text-brand-accent">Ajustes Globais</h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="glass-panel p-8 rounded-[40px] space-y-6">
                                            <h3 className="text-sm font-black uppercase">Logos e Identidade</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div onClick={() => document.getElementById('h-logo-s')?.click()} className="aspect-[3/1] bg-brand-dark rounded-xl border border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer">
                                                    {siteConfig.headerLogoUrl ? <img src={siteConfig.headerLogoUrl} className="w-full h-full object-contain" /> : <div className="flex flex-col items-center"><Plus className="text-gray-500"/><span className="text-[8px] font-bold uppercase">Header</span></div>}
                                                    <input id="h-logo-s" type="file" className="hidden" onChange={async (e) => {
                                                        const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); storageService.updateConfig({...siteConfig, headerLogoUrl: comp}).then(refresh); }; r.readAsDataURL(f); }
                                                    }} />
                                                </div>
                                                <div onClick={() => document.getElementById('f-logo-s')?.click()} className="aspect-[3/1] bg-brand-dark rounded-xl border border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer">
                                                    {siteConfig.footerLogoUrl ? <img src={siteConfig.footerLogoUrl} className="w-full h-full object-contain" /> : <div className="flex flex-col items-center"><Plus className="text-gray-500"/><span className="text-[8px] font-bold uppercase">Footer</span></div>}
                                                    <input id="f-logo-s" type="file" className="hidden" onChange={async (e) => {
                                                        const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); storageService.updateConfig({...siteConfig, footerLogoUrl: comp}).then(refresh); }; r.readAsDataURL(f); }
                                                    }} />
                                                </div>
                                            </div>
                                            <div onClick={() => document.getElementById('hero-img-s')?.click()} className="aspect-video bg-brand-dark rounded-2xl border border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer group">
                                                {siteConfig.heroImageUrl ? <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-500" />}
                                                <input id="hero-img-s" type="file" className="hidden" onChange={async (e) => {
                                                    const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); storageService.updateConfig({...siteConfig, heroImageUrl: comp}).then(refresh); }; r.readAsDataURL(f); }
                                                }} />
                                            </div>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[40px] space-y-4">
                                            <h3 className="text-sm font-black uppercase">Informações da Home</h3>
                                            <input className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm w-full font-bold" value={siteConfig.heroTitle} onChange={e => storageService.updateConfig({...siteConfig, heroTitle: e.target.value}).then(refresh)} placeholder="Título da Home" />
                                            <textarea className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm h-32 w-full italic" value={siteConfig.heroSubtitle} onChange={e => storageService.updateConfig({...siteConfig, heroSubtitle: e.target.value}).then(refresh)} placeholder="Subtítulo" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <input className="bg-white/5 border border-white/10 p-3 rounded-xl text-[10px] w-full font-bold uppercase" value={siteConfig.whatsapp} onChange={e => storageService.updateConfig({...siteConfig, whatsapp: e.target.value}).then(refresh)} placeholder="WhatsApp" />
                                                <input className="bg-white/5 border border-white/10 p-3 rounded-xl text-[10px] w-full font-bold uppercase" value={siteConfig.instagramUrl} onChange={e => storageService.updateConfig({...siteConfig, instagramUrl: e.target.value}).then(refresh)} placeholder="Link Instagram" />
                                            </div>
                                            <Button onClick={() => setToast({m: "Sincronizado!", t: "success"})} className="w-full">Salvar Tudo</Button>
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
            {currentView !== 'ADMIN' && <Footer config={siteConfig} />}
            <AIChat config={siteConfig} />
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
