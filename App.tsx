
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Trash2, Edit, Users, Check, X, AlertTriangle, Settings, CreditCard, Layers, PlusCircle, Save, Radio, Mic, Star, Lock, Unlock, Phone, Image as ImageIcon, Zap, LayoutDashboard, Shield, Loader2, Send, LogOut, Clock, Instagram, Facebook, Crown, ArrowRight
} from 'lucide-react';

const SESSION_KEY = 'helio_junior_vip_session_v7';
const ADMIN_WHATSAPP = '5534999982000';

export const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<string>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({
        heroLabel: 'Hélio Júnior',
        heroTitle: 'Voz que Vende',
        heroSubtitle: 'Seu portal de classificados com o impacto do rádio digital.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920',
        whatsapp: '5534999982000',
        phone: '34999982000',
        instagram: '@heliojunior',
        facebook: 'heliojunior'
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Comércio');

    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);

    const showToast = useCallback((m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64Array: string[]) => void, multiple = true) => {
        const files = Array.from(e.target.files || []).slice(0, multiple ? 5 : 1);
        const results: string[] = [];
        let processed = 0;
        if (files.length === 0) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                results.push(reader.result as string);
                processed++;
                if (processed === files.length) callback(results);
            };
            reader.readAsDataURL(file);
        });
    };

    const notifyNewUser = (user: User) => {
        const msg = encodeURIComponent(`🎙️ *NOVO ASSINANTE NO PORTAL*\n\n👤 Nome: ${user.name}\n📧 Email: ${user.email}\n📱 WhatsApp: ${user.phone}\n🚀 Status: Aguardando Boas-vindas`);
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${msg}`, '_blank');
    };

    const refreshData = async () => {
        setIsLoadingData(true);
        try {
            await db.init(); 
            const [p, u, pl, cfg, cats] = await Promise.all([
                db.getPosts(), db.getUsers(), db.getPlans(), db.getConfig(), db.getCategories()
            ]);
            if (p) setPosts(p);
            if (u) setAllUsers(u);
            if (pl) setPlans(pl);
            if (cfg && cfg.heroTitle) setSiteConfig(prev => ({...prev, ...cfg}));
            if (cats) setCategories(cats);
            
            if (currentUser) {
                const fresh = u.find((usr: User) => usr.email.toLowerCase() === currentUser.email.toLowerCase());
                if (fresh) {
                    setCurrentUser(fresh);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                }
            }
        } finally { setIsLoadingData(false); }
    };

    useEffect(() => { refreshData(); }, []);

    const isTrialExpired = useMemo(() => {
        if (!currentUser?.expiresAt) return false;
        return new Date() > new Date(currentUser.expiresAt);
    }, [currentUser]);

    const planCountdown = useMemo(() => {
        if (!currentUser?.expiresAt) return null;
        const diff = new Date(currentUser.expiresAt).getTime() - new Date().getTime();
        if (diff <= 0) return "Plano Expirado";
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        return `${days}d ${hours}h restantes`;
    }, [currentUser]);

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Até breve!");
    };

    const userPostsThisMonth = useMemo(() => {
        if (!currentUser) return [];
        return posts.filter(p => p.authorId === currentUser.id);
    }, [posts, currentUser]);

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={!isLoadingData} />
            
            <main className="flex-1">
                {currentView === 'HOME' && (
                    <div className="animate-in fade-in duration-700">
                        {/* Hero Section - Reduced Spacing */}
                        <section className="pt-24 pb-8 lg:pt-28 lg:pb-10 px-6">
                            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div className="space-y-5 text-center lg:text-left">
                                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-orange-600/10 border border-orange-600/20 text-[9px] font-black uppercase tracking-[0.3em] text-orange-500">
                                        <Radio size={14} className="animate-pulse" /> {siteConfig.heroLabel}
                                    </div>
                                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                                        Voz que <span className="text-orange-600">Vende</span> e Conecta
                                    </h1>
                                    <p className="text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                                        {siteConfig.heroSubtitle}
                                    </p>
                                    <div className="flex flex-wrap gap-4 pt-4 justify-center lg:justify-start">
                                        <button onClick={() => setCurrentView('REGISTER')} className="h-14 px-10 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-orange-600/20 transition-all transform hover:-translate-y-1">Anunciar Agora</button>
                                        <button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})} className="h-14 px-10 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-white/10 transition-all">Ver Parceiros</button>
                                    </div>
                                </div>
                                <div className="relative glass-panel p-2 rounded-[35px] overflow-hidden aspect-video border-white/10 hidden lg:block">
                                    <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover rounded-[30px]" alt="Hero Image" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent" />
                                </div>
                            </div>
                        </section>

                        {/* Block 2: Verified Advertisers */}
                        <section id="ads" className="max-w-7xl mx-auto px-6 py-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
                                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Tempo Real</span>
                                    </div>
                                    <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Parceiros VIP</h2>
                                </div>
                                <button onClick={() => setCurrentView('REGISTER')} className="text-[10px] font-black uppercase text-gray-400 hover:text-white flex items-center gap-2 group transition-all">
                                    Quero aparecer aqui <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                            {posts.length === 0 ? (
                                <div className="text-center py-20 bg-white/[0.02] rounded-[40px] border border-dashed border-white/10">
                                    <p className="opacity-30 italic font-black uppercase text-[10px] tracking-widest">Aguardando novos anúncios...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {posts.map(p => <PostCard key={p.id} post={p} />)}
                                </div>
                            )}
                        </section>

                        {/* Block 3: Plans Section */}
                        <section className="bg-white/[0.02] border-y border-white/5 py-16 px-6">
                            <div className="max-w-7xl mx-auto">
                                <div className="text-center mb-16">
                                    <h3 className="text-4xl font-black uppercase text-white tracking-tighter mb-4">Escolha seu Plano</h3>
                                    <p className="text-gray-500 max-w-2xl mx-auto text-sm">Alcance milhares de ouvintes e leitores com a tecnologia do rádio digital.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {plans.map(plan => (
                                        <div key={plan.id} className={`glass-panel p-10 rounded-[40px] border-white/10 flex flex-col items-center text-center transition-all hover:border-orange-600/50 ${plan.price === 0 ? 'opacity-80' : 'scale-105 border-orange-600/20 shadow-2xl shadow-orange-600/5'}`}>
                                            <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-500 mb-6">
                                                {plan.price === 0 ? <Star size={24}/> : <Crown size={24}/>}
                                            </div>
                                            <h4 className="text-xl font-black uppercase text-white mb-2">{plan.name}</h4>
                                            <p className="text-4xl font-black text-white mb-6">
                                                <span className="text-sm font-bold align-top">R$</span> {plan.price.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-400 mb-8 leading-relaxed">{plan.description}</p>
                                            <button onClick={() => setCurrentView('REGISTER')} className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-orange-600 hover:border-transparent text-white text-[11px] font-black uppercase transition-all">
                                                Começar agora
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-dark pt-16">
                        <div className="glass-panel p-10 md:p-14 rounded-[50px] w-full max-w-xl text-center shadow-3xl border-orange-600/10">
                            <h2 className="text-4xl font-black text-white uppercase mb-8 tracking-tighter">{currentView === 'LOGIN' ? 'Login VIP' : 'Cadastro VIP'}</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                setIsLoggingIn(true);
                                try {
                                    if (currentView === 'LOGIN') {
                                        const u = await db.authenticate(fd.get('email') as string, fd.get('password') as string);
                                        if (u) {
                                            setCurrentUser(u);
                                            localStorage.setItem(SESSION_KEY, JSON.stringify(u));
                                            setCurrentView(u.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
                                        } else showToast("Acesso Negado", "error");
                                    } else {
                                        const exp = new Date(); exp.setDate(exp.getDate() + 30);
                                        const newUser = { 
                                            name: fd.get('name') as string, email: fd.get('email') as string, password: fd.get('password') as string, 
                                            phone: fd.get('phone') as string, role: UserRole.ADVERTISER, paymentStatus: PaymentStatus.CONFIRMED,
                                            planId: 'p_free', expiresAt: exp.toISOString(), createdAt: new Date().toISOString()
                                        };
                                        const saved = await db.addUser(newUser);
                                        if (saved) { 
                                            setCurrentUser(saved); localStorage.setItem(SESSION_KEY, JSON.stringify(saved));
                                            notifyNewUser(saved as User);
                                            setCurrentView('DASHBOARD'); 
                                        }
                                    }
                                } finally { setIsLoggingIn(false); }
                            }} className="space-y-4">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="NOME OU EMPRESA" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 uppercase text-[10px] font-black tracking-widest" />
                                        <input name="phone" required placeholder="WHATSAPP (DDD)" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 uppercase text-[10px] font-black tracking-widest" />
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="E-MAIL" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 uppercase text-[10px] font-black tracking-widest" />
                                <input name="password" required type="password" placeholder="SENHA" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 uppercase text-[10px] font-black tracking-widest" />
                                <button type="submit" className="w-full h-14 bg-orange-600 text-white rounded-[20px] font-black uppercase text-[11px] shadow-xl flex items-center justify-center gap-3 hover:bg-orange-700 transition-all">
                                    {isLoggingIn && <Loader2 className="animate-spin" size={20}/>} {currentView === 'LOGIN' ? 'Entrar Agora' : 'Finalizar Cadastro'}
                                </button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-6 hover:text-white transition-colors">
                                    {currentView === 'LOGIN' ? 'Não tem conta? Cadastre-se aqui' : 'Já sou assinante'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {currentView === 'DASHBOARD' && currentUser && (
                   <div className="pt-24 pb-32 max-w-7xl mx-auto px-6">
                        {/* Header Dashboard */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12 border-b border-white/5 pb-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-orange-600 rounded-[20px] flex items-center justify-center text-white font-black text-2xl shadow-xl">{currentUser.name[0]}</div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{currentUser.name}</h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-600/10 border border-orange-600/30 rounded-full">
                                            <Clock size={10} className="text-orange-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">{planCountdown}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{currentUser.email}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                {isTrialExpired ? (
                                    <button onClick={() => window.open(`https://wa.me/${siteConfig.whatsapp}?text=Quero renovar meu plano VIP`, '_blank')} className="h-14 px-8 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center gap-2 animate-pulse">
                                        <ArrowRight size={16}/> Renovar Plano
                                    </button>
                                ) : (
                                    <Button className="h-14 px-8 rounded-2xl" onClick={() => {
                                        if (userPostsThisMonth.length >= 4) {
                                            showToast("Limite de 4 anúncios por mês atingido", "error");
                                            return;
                                        }
                                        setEditingPost({ title: '', content: '', category: 'Comércio', imageUrls: [] });
                                    }}>
                                        <PlusCircle size={20}/> Criar Anúncio
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Usage Counter */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                            <div className="glass-panel p-6 rounded-3xl border-white/10">
                                <p className="text-[9px] font-black text-gray-500 uppercase mb-2">Anúncios no Mês</p>
                                <p className="text-2xl font-black text-white">{userPostsThisMonth.length} / 4</p>
                                <div className="w-full bg-white/5 h-1.5 rounded-full mt-3">
                                    <div className="bg-orange-600 h-full rounded-full" style={{width: `${(userPostsThisMonth.length / 4) * 100}%`}} />
                                </div>
                            </div>
                        </div>

                        {/* AI Assistant */}
                        <div className="glass-panel rounded-[35px] p-8 border-orange-600/20 mb-12 shadow-3xl bg-orange-600/[0.02]">
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center text-orange-500"><Mic size={20}/></div>
                                <h3 className="text-xl font-black uppercase text-white tracking-tighter">Locutor Virtual IA</h3>
                             </div>
                             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    <textarea value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Descreva sua promoção aqui e a IA criará o texto de rádio para você..." className="w-full bg-brand-dark border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 min-h-[100px] text-sm" />
                                </div>
                                <div className="space-y-3">
                                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-brand-dark border border-white/10 p-5 rounded-xl text-white uppercase font-black text-[10px]">
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <Button className="w-full h-14 uppercase font-black text-[10px]" onClick={async () => {
                                        setIsGeneratingAi(true);
                                        try {
                                          const res = await generateAdCopy(selectedCategory, magicPrompt, 'short');
                                          const data = typeof res === 'object' ? res : { title: 'Oferta Especial', content: res };
                                          setEditingPost({ title: data.title, content: data.content, category: selectedCategory, imageUrls: [] });
                                        } finally { setIsGeneratingAi(false); }
                                    }} isLoading={isGeneratingAi}><Zap size={16}/> Gerar Texto VIP</Button>
                                </div>
                             </div>
                        </div>

                        {/* List My Ads */}
                        <h3 className="text-2xl font-black uppercase text-white mb-8 tracking-tighter">Meus Anúncios Ativos</h3>
                        {userPostsThisMonth.length === 0 ? (
                            <div className="text-center py-16 bg-white/[0.02] rounded-[30px] border border-dashed border-white/10 opacity-30 font-black uppercase text-[10px] tracking-widest">Ainda não há anúncios ativos.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {userPostsThisMonth.map(p => (
                                    <div key={p.id} className="relative group">
                                        <div className="absolute top-6 right-6 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => setEditingPost(p)} className="p-3 bg-orange-600 rounded-xl text-white shadow-xl hover:scale-110"><Edit size={16}/></button>
                                            <button onClick={async () => { if(confirm('Excluir anúncio?')) { await db.deletePost(p.id); refreshData(); } }} className="p-3 bg-red-600 rounded-xl text-white shadow-xl hover:scale-110"><Trash2 size={16}/></button>
                                        </div>
                                        <PostCard post={p} />
                                    </div>
                                ))}
                            </div>
                        )}
                   </div>
                )}

                {currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && (
                    <div className="flex flex-col md:flex-row min-h-screen pt-20">
                        <aside className="w-full md:w-80 border-r border-white/5 p-8 space-y-3">
                            <h3 className="text-[9px] font-black uppercase text-orange-500 tracking-[0.4em] mb-10 pl-2">Configurações Gerais</h3>
                            {[
                                { id: 'INICIO', label: 'Dashboard', icon: LayoutDashboard },
                                { id: 'CLIENTES', label: 'Clientes', icon: Users },
                                { id: 'AJUSTES', label: 'Identidade Site', icon: Settings },
                            ].map(item => (
                                <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${adminSubView === item.id ? 'bg-orange-600 text-white shadow-xl' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                        </aside>
                        <main className="flex-1 p-8 lg:p-12">
                            {adminSubView === 'INICIO' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="glass-panel p-8 rounded-[30px] text-center">
                                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2">Assinantes</p>
                                        <h4 className="text-5xl font-black text-orange-500">{allUsers.length}</h4>
                                    </div>
                                    <div className="glass-panel p-8 rounded-[30px] text-center">
                                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2">Classificados</p>
                                        <h4 className="text-5xl font-black text-white">{posts.length}</h4>
                                    </div>
                                </div>
                            )}
                            {adminSubView === 'AJUSTES' && (
                                <div className="max-w-4xl space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase text-gray-500">Logo Portal</label>
                                            <div onClick={() => document.getElementById('upLogoT')?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden">
                                                {siteConfig.headerLogoUrl ? <img src={siteConfig.headerLogoUrl} className="w-full h-full object-contain" /> : <ImageIcon size={24} className="text-gray-600" />}
                                                <input id="upLogoT" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (arr) => setSiteConfig({...siteConfig, headerLogoUrl: arr[0]}), false)} />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase text-gray-500">Banner Principal</label>
                                            <div onClick={() => document.getElementById('upBanner')?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden">
                                                {siteConfig.heroImageUrl ? <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-gray-600" />}
                                                <input id="upBanner" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (arr) => setSiteConfig({...siteConfig, heroImageUrl: arr[0]}), false)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input value={siteConfig.instagram} onChange={e => setSiteConfig({...siteConfig, instagram: e.target.value})} placeholder="INSTAGRAM" className="bg-white/5 border border-white/10 p-5 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-orange-500" />
                                        <input value={siteConfig.facebook} onChange={e => setSiteConfig({...siteConfig, facebook: e.target.value})} placeholder="FACEBOOK" className="bg-white/5 border border-white/10 p-5 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-orange-500" />
                                    </div>
                                    <Button onClick={async () => { await db.updateConfig(siteConfig); showToast("Configurações Salvas"); refreshData(); }} className="w-full h-14 rounded-2xl"><Save size={18}/> Atualizar Identidade</Button>
                                </div>
                            )}
                        </main>
                    </div>
                )}
            </main>

            {/* Modal Edit/Create Post */}
            {editingPost && (
                <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in zoom-in duration-300 overflow-y-auto">
                    <form onSubmit={async (e) => {
                        e.preventDefault(); setIsSaving(true);
                        try {
                            const expiresAt = new Date();
                            expiresAt.setDate(expiresAt.getDate() + 7); // Anúncio dura 1 semana por padrão
                            await db.savePost({ 
                                ...editingPost, 
                                authorId: currentUser?.id, 
                                authorName: currentUser?.name, 
                                whatsapp: currentUser?.phone, 
                                phone: currentUser?.phone,
                                expiresAt: expiresAt.toISOString(),
                                createdAt: editingPost.createdAt || new Date().toISOString()
                            });
                            refreshData(); setEditingPost(null);
                            showToast("Anúncio Publicado!");
                        } finally { setIsSaving(false); }
                    }} className="glass-panel p-8 md:p-12 rounded-[40px] w-full max-w-3xl space-y-6 border-white/10 my-auto shadow-3xl">
                        <h3 className="text-2xl font-black uppercase text-white tracking-tighter text-center">Criar Meu Anúncio VIP</h3>
                        <div className="space-y-4">
                            <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="TÍTULO CHAMATIVO" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 font-bold uppercase text-[11px]" required />
                            <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="O QUE VOCÊ ESTÁ OFERECENDO?" rows={4} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 text-sm" required />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select value={editingPost.category} onChange={e => setEditingPost({...editingPost, category: e.target.value})} className="bg-brand-dark border border-white/10 p-5 rounded-2xl text-white uppercase font-black text-[10px]">
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <div className="space-y-2">
                                    <button type="button" onClick={() => document.getElementById('adUpV7')?.click()} className="w-full p-5 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl text-white font-black text-[10px] uppercase hover:bg-white/10 flex items-center justify-center gap-3">
                                        <ImageIcon size={18}/> {editingPost.imageUrls?.length ? `${editingPost.imageUrls.length} Fotos Adicionadas` : 'Enviar Fotos (Máx 5)'}
                                    </button>
                                    <input id="adUpV7" type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (arr) => setEditingPost({...editingPost, imageUrls: arr}))} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button type="submit" className="flex-1 h-14 rounded-2xl" isLoading={isSaving}>Lançar Anúncio</Button>
                            <button type="button" onClick={() => setEditingPost(null)} className="flex-1 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors">Fechar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Redesigned Footer */}
            <footer className="bg-brand-panel/60 border-t border-white/5 pt-16 pb-10 mt-auto">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Radio className="text-orange-600" size={32} />
                                <span className="text-xl font-black text-white uppercase tracking-tighter">Hélio Júnior</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed uppercase font-bold tracking-widest">Publicidade digital com credibilidade e o impacto do rádio que você conhece.</p>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.3em]">Navegação</h4>
                            <ul className="space-y-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <li><button onClick={() => setCurrentView('HOME')} className="hover:text-orange-500 transition-colors">Página Inicial</button></li>
                                <li><button onClick={() => setCurrentView('REGISTER')} className="hover:text-orange-500 transition-colors">Ver Planos</button></li>
                                <li><button onClick={() => setCurrentView('LOGIN')} className="hover:text-orange-500 transition-colors">Login Membro</button></li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.3em]">Atendimento</h4>
                            <ul className="space-y-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <li className="flex items-center gap-3"><Phone size={14} className="text-orange-500"/> {siteConfig.phone}</li>
                                <li className="flex items-center gap-3 text-green-500 cursor-pointer" onClick={() => window.open(`https://wa.me/${siteConfig.whatsapp}`, '_blank')}><Send size={14}/> Falar no WhatsApp</li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.3em]">Social</h4>
                            <div className="flex gap-4">
                                <button onClick={() => window.open(`https://instagram.com/${siteConfig.instagram?.replace('@','')}`)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-orange-600 hover:text-white transition-all"><Instagram size={20}/></button>
                                <button onClick={() => window.open(`https://facebook.com/${siteConfig.facebook}`)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-orange-600 hover:text-white transition-all"><Facebook size={20}/></button>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-white/5 pt-8 text-[9px] font-black uppercase text-gray-600 tracking-[0.3em] flex flex-col md:flex-row justify-between items-center gap-4">
                        <p>&copy; 2024 HÉLIO JÚNIOR - VOZ QUE VENDE. TODOS OS DIREITOS RESERVADOS.</p>
                        <p className="flex items-center gap-2">PLATAFORMA DIGITAL <Zap size={10} className="text-orange-500"/></p>
                    </div>
                </div>
            </footer>

            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-full font-black uppercase text-[9px] tracking-[0.2em] shadow-2xl animate-in slide-in-from-bottom duration-300 flex items-center gap-3 ${toast.t === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.t === 'success' ? <Check size={14}/> : <X size={14}/>} {toast.m}
                </div>
            )}
        </div>
    );
};

export default App;
