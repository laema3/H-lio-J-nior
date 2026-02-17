
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG, INITIAL_CATEGORIES } from './services/storage';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy, chatWithAssistant } from './services/geminiService';
import { 
    Search, Clock, Check, Camera, Trash2, Edit3, AlertTriangle, Plus, ShieldCheck, Settings, CreditCard, Tag,
    Instagram, Facebook, Youtube, Phone, MapPin, Radio, MessageCircle, Send, X, Bot, LayoutDashboard, Loader2
} from 'lucide-react';

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
        setPosts(p);
        setAllUsers(u);
        setCategories(c);
        setSiteConfig(cfg);
        setPlans(storageService.getPlans());
        setCurrentUser(getFromLocal(STORAGE_KEYS.SESSION, null));
        setIsLoading(false);
    };

    useEffect(() => {
        storageService.init().then(refresh);
    }, []);

    const handleLogin = (user: User) => {
        saveToLocal(STORAGE_KEYS.SESSION, user);
        refresh().then(() => {
            setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
        });
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        setCurrentUser(null);
        setCurrentView('HOME');
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
                                <div className="aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
                                    <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover" alt="Banner" />
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filtered.map(p => <PostCard key={p.id} post={p} author={allUsers.find(u => u.id === p.authorId)} />)}
                            </div>
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
                return (
                    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="glass-panel p-10 rounded-[40px] space-y-6">
                                <h3 className="text-2xl font-black uppercase flex items-center gap-2"><Settings className="text-brand-primary" /> Visual & Logos</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div onClick={() => document.getElementById('h-logo')?.click()} className="aspect-[3/1] bg-brand-dark rounded-xl border border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer">
                                            {siteConfig.headerLogoUrl ? <img src={siteConfig.headerLogoUrl} className="w-full h-full object-contain" /> : <Plus/>}
                                            <input id="h-logo" type="file" className="hidden" onChange={e => {
                                                const f = e.target.files?.[0]; if(f) {
                                                    const r = new FileReader(); r.onloadend = () => storageService.updateConfig({...siteConfig, headerLogoUrl: r.result as string}).then(refresh); r.readAsDataURL(f);
                                                }
                                            }} />
                                        </div>
                                        <div onClick={() => document.getElementById('f-logo')?.click()} className="aspect-[3/1] bg-brand-dark rounded-xl border border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer">
                                            {siteConfig.footerLogoUrl ? <img src={siteConfig.footerLogoUrl} className="w-full h-full object-contain" /> : <Plus/>}
                                            <input id="f-logo" type="file" className="hidden" onChange={e => {
                                                const f = e.target.files?.[0]; if(f) {
                                                    const r = new FileReader(); r.onloadend = () => storageService.updateConfig({...siteConfig, footerLogoUrl: r.result as string}).then(refresh); r.readAsDataURL(f);
                                                }
                                            }} />
                                        </div>
                                    </div>
                                    <input className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm w-full" value={siteConfig.heroTitle} onChange={e => storageService.updateConfig({...siteConfig, heroTitle: e.target.value}).then(refresh)} />
                                    <textarea className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm h-20 w-full" value={siteConfig.heroSubtitle} onChange={e => storageService.updateConfig({...siteConfig, heroSubtitle: e.target.value}).then(refresh)} />
                                    <Button onClick={() => setToast({m: "Sincronizado!", t: "success"})} className="w-full">Forçar Sincronização Supabase</Button>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="glass-panel p-8 rounded-[40px]">
                                    <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2"><Tag className="text-brand-accent"/> Categorias</h3>
                                    <div className="flex gap-2 mb-4">
                                        <input id="newCat" placeholder="Nova..." className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl text-sm" />
                                        <Button onClick={() => {
                                            const v = (document.getElementById('newCat') as HTMLInputElement).value;
                                            if(v) { storageService.saveCategories([...categories, v]).then(() => { refresh(); (document.getElementById('newCat') as HTMLInputElement).value = ''; }); }
                                        }}><Plus size={16}/></Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(c => (
                                            <div key={c} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
                                                <span>{c}</span>
                                                <button onClick={() => storageService.saveCategories(categories.filter(cat => cat !== c)).then(refresh)} className="text-red-500"><Trash2 size={12}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="glass-panel p-8 rounded-[40px] max-h-60 overflow-y-auto">
                                    <h3 className="text-xl font-black uppercase mb-4">Usuários Pendentes</h3>
                                    {allUsers.filter(u => u.paymentStatus === PaymentStatus.AWAITING).map(u => (
                                        <div key={u.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold">{u.name}</span>
                                            <Button onClick={() => {
                                                const exp = new Date(); exp.setDate(exp.getDate() + 30);
                                                storageService.updateUser({...u, paymentStatus: PaymentStatus.CONFIRMED, expiresAt: exp.toISOString()}).then(refresh);
                                            }} className="py-1 px-3 text-[10px]">Ativar</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'DASHBOARD':
                if (!currentUser) return null;
                const userPosts = posts.filter(p => p.authorId === currentUser.id);
                return (
                    <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom duration-500">
                        <div className="lg:col-span-8 space-y-8">
                            <div className="glass-panel p-10 rounded-[40px]">
                                <h2 className="text-2xl font-black mb-8 uppercase">Novo Anúncio</h2>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as any;
                                    await storageService.addPost({
                                        id: 'p-'+Date.now(),
                                        authorId: currentUser.id,
                                        authorName: currentUser.name,
                                        category: currentUser.profession || 'Outros',
                                        title: form.title.value,
                                        content: form.content.value,
                                        imageUrl: (document.getElementById('postImg') as HTMLInputElement).value,
                                        whatsapp: currentUser.phone,
                                        phone: currentUser.phone,
                                        createdAt: new Date().toISOString()
                                    });
                                    refresh();
                                    form.reset();
                                    setToast({m: "Publicado no Banco de Dados!", t: "success"});
                                }} className="space-y-4">
                                    <input name="title" required placeholder="Título" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold" />
                                    <textarea name="content" required placeholder="Conteúdo do anúncio..." className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white h-32" />
                                    <input id="postImg" type="hidden" />
                                    <Button type="submit" className="w-full h-16 uppercase font-black">Publicar Agora</Button>
                                </form>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {userPosts.map(p => (
                                    <div key={p.id} className="relative group">
                                        <PostCard post={p} author={currentUser} />
                                        <button onClick={() => storageService.deletePost(p.id).then(refresh)} className="absolute top-4 right-4 p-2 bg-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-4 glass-panel p-8 rounded-[40px] text-center h-fit">
                            <h3 className="font-black text-xl mb-4 text-brand-accent">Assinatura</h3>
                            <div className={`p-4 rounded-2xl border mb-6 text-xs font-black uppercase ${currentUser.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'}`}>{currentUser.paymentStatus}</div>
                            <Button onClick={() => setCurrentView('PAYMENT')} variant="secondary" className="w-full">Ver Planos</Button>
                        </div>
                    </div>
                );

            case 'PAYMENT':
                return (
                    <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 text-center">
                        <h2 className="text-5xl font-black mb-12 uppercase">Planos de Exposição</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            {plans.map(p => (
                                <div key={p.id} onClick={() => {
                                    storageService.updateUser({...currentUser!, planId: p.id, paymentStatus: PaymentStatus.AWAITING}).then(() => {
                                        refresh();
                                        setCurrentView('DASHBOARD');
                                        setToast({m: "Pedido Enviado!", t: "success"});
                                    });
                                }} className="glass-panel p-8 rounded-[40px] border-2 border-white/5 hover:border-brand-primary transition-all cursor-pointer group">
                                    <h3 className="font-black uppercase mb-4 group-hover:text-brand-primary">{p.name}</h3>
                                    <div className="text-3xl font-black text-brand-secondary mb-2">R$ {p.price}</div>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" onClick={() => setCurrentView('DASHBOARD')}>Voltar</Button>
                    </div>
                );
            
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 font-sans flex flex-col">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} />
            <main className="flex-1">{renderView()}</main>
            <Footer config={siteConfig} />
            <AIChat config={siteConfig} />
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
