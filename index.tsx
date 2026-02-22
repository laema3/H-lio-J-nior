
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';

import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { ChatBot } from './components/ChatBot';
import { 
    Trash2, Edit, Users, Check, X, Settings, CreditCard, Layers, PlusCircle, Save, Radio, Phone, Image as ImageIcon, Zap, LayoutDashboard, Loader2, Send, Clock, Ban, Sparkles, Hammer, Eye, EyeOff, RefreshCw
} from 'lucide-react';

const SESSION_KEY = 'helio_junior_vip_session_v11';
const ADMIN_WHATSAPP = '5534999982000';

const App: React.FC = () => {
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
        bannerFooterUrl: 'https://images.unsplash.com/photo-1514320291944-9e1aabc932bb?auto=format&fit=crop&q=80&w=1920',
        whatsapp: '5534999982000',
        phone: '34999982000',
        instagram: '@heliojunior',
        facebook: 'heliojunior',
        maintenanceMode: false
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

    const showToast = useCallback((m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64Array: string[]) => void, multiple = true) => {
        const files = Array.from(e.target.files || []).slice(0, multiple ? 5 : 1);
        const results: string[] = [];
        let processed = 0;
        if (files.length === 0) return;

        files.forEach(file => {
            if (file.size > 2 * 1024 * 1024) {
                showToast(`Foto ${file.name} muito grande. Use fotos menores que 2MB.`, 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                results.push(reader.result as string);
                processed++;
                if (processed === files.length) callback(results);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
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
            if (cfg) setSiteConfig(prev => ({...prev, ...cfg}));
            if (cats) setCategories(cats);
            
            if (currentUser) {
                const fresh = u.find((usr: User) => usr.email.toLowerCase() === currentUser.email.toLowerCase());
                if (fresh) {
                    if (fresh.status === 'BLOCKED') {
                        handleLogout();
                        showToast("Sua conta foi bloqueada.", "error");
                        return;
                    }
                    setCurrentUser(fresh);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                }
            }
        } catch (err) {
            console.error("Erro ao carregar dados:", err);
        } finally { setIsLoadingData(false); }
    };

    useEffect(() => { refreshData(); }, []);

    const planCountdown = useMemo(() => {
        if (!currentUser?.expiresAt) return null;
        const diff = new Date(currentUser.expiresAt).getTime() - new Date().getTime();
        if (diff <= 0) return "Expirado";
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return `${days} dias restantes`;
    }, [currentUser]);

    const userPosts = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === UserRole.ADMIN) return posts;
        return posts.filter(p => p.authorId === currentUser.id);
    }, [posts, currentUser]);

    const handleSavePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPost) return;
        setIsSaving(true);
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); 
            await db.savePost({ 
                ...editingPost, 
                authorId: editingPost.authorId || currentUser?.id, 
                authorName: editingPost.authorName || currentUser?.name, 
                whatsapp: editingPost.whatsapp || currentUser?.phone, 
                phone: editingPost.phone || currentUser?.phone,
                expiresAt: editingPost.expiresAt || expiresAt.toISOString(),
                createdAt: editingPost.createdAt || new Date().toISOString()
            });
            await refreshData(); 
            setEditingPost(null);
            showToast("Anúncio Publicado com Sucesso!");
        } catch (e) {
            showToast("Falha ao salvar. Tente fotos menores.", "error");
        } finally { setIsSaving(false); }
    };

    const handleDeletePost = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir permanentemente este anúncio?')) {
            await db.deletePost(id);
            await refreshData();
            showToast("Anúncio removido.");
        }
    };

    if (siteConfig.maintenanceMode && currentUser?.role !== UserRole.ADMIN && currentView !== 'LOGIN' && currentView !== 'REGISTER') {
        return (
            <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-center">
                <div className="glass-panel p-12 md:p-20 rounded-[50px] max-w-2xl border-orange-600/20 shadow-3xl animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-orange-600/10 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-10 border border-orange-600/20 animate-bounce">
                        <Hammer size={48} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-6 leading-none">
                        Portal em <span className="text-orange-600">Manutenção</span>
                    </h1>
                    <p className="text-lg text-gray-400 font-light leading-relaxed mb-10">
                        Estamos realizando melhorias técnicas para oferecer a melhor experiência em locução e classificados. Volte em alguns instantes!
                    </p>
                    <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
                        <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
                        Ajustando as Frequências...
                    </div>
                </div>
                <button onClick={() => setCurrentView('LOGIN')} className="mt-8 text-[9px] font-black uppercase text-gray-700 tracking-widest hover:text-gray-500">Acesso Restrito</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={!isLoadingData} />
            
            <main className="flex-1">
                {currentView === 'HOME' && (
                    <div className="animate-in fade-in duration-700">
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

                        <section id="ads" className="max-w-7xl mx-auto px-6 py-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
                                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Tempo Real</span>
                                    </div>
                                    <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Parceiros VIP</h2>
                                </div>
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
                                            showToast(`Bem-vindo, ${u.name}!`);
                                        } else {
                                            showToast("Dados Incorretos. Verifique e-mail/senha.", "error");
                                        }
                                    } else {
                                        const newUser = await db.addUser({ 
                                            name: fd.get('name') as string, email: (fd.get('email') as string).toLowerCase(), password: fd.get('password') as string, 
                                            phone: fd.get('phone') as string, role: UserRole.ADVERTISER, paymentStatus: PaymentStatus.CONFIRMED,
                                            status: 'ACTIVE'
                                        });
                                        if (newUser) { 
                                            setCurrentUser(newUser); localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
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
                                <input name="email" required type="email" placeholder="E-MAIL" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 lowercase text-[10px] font-black tracking-widest" />
                                <div className="relative">
                                    <input 
                                        name="password" 
                                        required 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="SENHA" 
                                        className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 text-[10px] font-black tracking-widest" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <button type="submit" className="w-full h-14 bg-orange-600 text-white rounded-[20px] font-black uppercase text-[11px] shadow-xl flex items-center justify-center gap-3 hover:bg-orange-700 transition-all">
                                    {isLoggingIn && <Loader2 className="animate-spin" size={20}/>} {currentView === 'LOGIN' ? 'Entrar Agora' : 'Finalizar Cadastro'}
                                </button>
                                
                                <div className="pt-4 flex flex-col gap-4">
                                    <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-[10px] text-gray-500 font-black uppercase tracking-widest hover:text-white transition-colors">
                                        {currentView === 'LOGIN' ? 'Não tem conta? Cadastre-se aqui' : 'Já sou assinante'}
                                    </button>
                                    
                                    <button 
                                        type="button" 
                                        onClick={async () => {
                                            await db.init();
                                            showToast("Credenciais Admin Sincronizadas com o Navegador!");
                                        }}
                                        className="inline-flex items-center justify-center gap-2 text-[8px] font-black text-orange-500/50 uppercase tracking-widest hover:text-orange-500 transition-colors"
                                    >
                                        <RefreshCw size={10} /> Sincronizar Acesso Local
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {currentView === 'DASHBOARD' && currentUser && (
                   <div className="pt-24 pb-32 max-w-7xl mx-auto px-6">
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
                                    </div>
                                </div>
                            </div>
                            <button className="h-14 px-8 rounded-2xl bg-orange-600 text-white font-black uppercase text-[11px] flex items-center justify-center gap-2 hover:bg-orange-700 transition-all" onClick={() => setEditingPost({ title: '', content: '', category: 'Comércio', imageUrls: [] })}>
                                <PlusCircle size={20}/> Criar Anúncio
                            </button>
                        </div>

                        <h3 className="text-2xl font-black uppercase text-white mb-8 tracking-tighter">Meus Anúncios Publicados</h3>
                        {userPosts.length === 0 ? (
                            <div className="text-center py-20 bg-white/[0.02] rounded-[40px] border border-dashed border-white/10 opacity-30">Você ainda não criou nenhum anúncio no portal.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {userPosts.map(p => (
                                    <div key={p.id} className="relative group">
                                        <div className="absolute top-6 right-6 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => setEditingPost(p)} className="p-3 bg-orange-600 rounded-xl text-white shadow-xl hover:scale-110"><Edit size={16}/></button>
                                            <button onClick={() => handleDeletePost(p.id)} className="p-3 bg-red-600 rounded-xl text-white shadow-xl hover:scale-110"><Trash2 size={16}/></button>
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
                            <h3 className="text-[9px] font-black uppercase text-orange-500 tracking-[0.4em] mb-10 pl-2">Controle Mestre</h3>
                            {[
                                { id: 'INICIO', label: 'Resumo Geral', icon: LayoutDashboard },
                                { id: 'ANUNCIOS', label: 'Todos Anúncios', icon: Layers },
                                { id: 'PLANOS', label: 'Gestão Planos', icon: CreditCard },
                                { id: 'CLIENTES', label: 'Gestão Clientes', icon: Users },
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
                                    <div className="glass-panel p-8 rounded-[30px] text-center border-orange-600/10">
                                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2">Total Assinantes</p>
                                        <h4 className="text-5xl font-black text-orange-500">{allUsers.length}</h4>
                                    </div>
                                    <div className="glass-panel p-8 rounded-[30px] text-center border-orange-600/10">
                                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2">Anúncios Totais</p>
                                        <h4 className="text-5xl font-black text-white">{posts.length}</h4>
                                    </div>
                                    <div className="glass-panel p-8 rounded-[30px] text-center border-orange-600/10">
                                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2">Planos Criados</p>
                                        <h4 className="text-5xl font-black text-white">{plans.length}</h4>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'PLANOS' && (
                                <div className="space-y-8">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Configuração de Planos</h3>
                                        <button onClick={() => setEditingPlan({ name: '', price: 0, durationDays: 30, description: '' })} className="h-12 px-6 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-orange-700 transition-all"><PlusCircle size={18}/> Novo Plano</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {plans.map(pl => (
                                            <div key={pl.id} className="glass-panel p-6 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-lg font-black text-white uppercase">{pl.name}</h4>
                                                    <p className="text-[10px] text-gray-500 font-bold">R$ {pl.price.toFixed(2)} | {pl.durationDays} DIAS</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingPlan(pl)} className="p-3 bg-white/5 rounded-xl text-white hover:bg-orange-600"><Edit size={16}/></button>
                                                    <button onClick={async () => { if(confirm('Excluir este plano?')) { await db.deletePlan(pl.id); refreshData(); } }} className="p-3 bg-white/5 rounded-xl text-red-500 hover:bg-red-600 hover:text-white"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'ANUNCIOS' && (
                                <div className="space-y-8">
                                    <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Todos os Anúncios do Portal</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {posts.map(p => (
                                            <div key={p.id} className="relative group">
                                                <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => setEditingPost(p)} className="p-2 bg-orange-600 rounded-lg text-white"><Edit size={14}/></button>
                                                    <button onClick={() => handleDeletePost(p.id)} className="p-2 bg-red-600 rounded-lg text-white"><Trash2 size={14}/></button>
                                                </div>
                                                <PostCard post={p} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CLIENTES' && (
                                <div className="space-y-8">
                                    <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Assinantes VIP</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 text-[9px] font-black uppercase text-gray-500 tracking-widest">
                                                    <th className="p-4">Nome</th>
                                                    <th className="p-4">WhatsApp</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[10px] font-bold text-gray-300">
                                                {allUsers.map(u => (
                                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                                        <td className="p-4">{u.name}</td>
                                                        <td className="p-4">{u.phone}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${u.status === 'BLOCKED' ? 'bg-red-600/10 text-red-500' : 'bg-green-600/10 text-green-500'}`}>
                                                                {u.status === 'BLOCKED' ? 'Bloqueado' : 'Ativo'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 flex justify-end gap-2">
                                                            <button onClick={() => setEditingUser(u)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-orange-600"><Edit size={14}/></button>
                                                            <button onClick={async () => { 
                                                                const newStatus = u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
                                                                if(confirm(`${u.status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'} este cliente?`)) { 
                                                                    await db.updateUser({...u, status: newStatus}); 
                                                                    refreshData(); 
                                                                } 
                                                            }} className={`p-2 bg-white/5 rounded-lg transition-all ${u.status === 'BLOCKED' ? 'text-green-500 hover:bg-green-600 hover:text-white' : 'text-red-500 hover:bg-red-600 hover:text-white'}`}>
                                                                <Ban size={14}/>
                                                            </button>
                                                            <button onClick={async () => { if(confirm('Excluir este cliente definitivamente?')) { await db.deleteUser(u.id); refreshData(); } }} className="p-2 bg-white/5 rounded-lg text-white hover:bg-red-600"><Trash2 size={14}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'AJUSTES' && (
                                <div className="max-w-4xl space-y-10">
                                    <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Identidade Visual do Portal</h3>
                                    
                                    <div className="glass-panel p-6 rounded-3xl border-orange-600/20 bg-orange-600/5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${siteConfig.maintenanceMode ? 'bg-orange-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                                                <Hammer size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black uppercase text-white tracking-tight">Modo Manutenção</h4>
                                                <p className="text-[10px] text-gray-500 font-bold">Bloqueia o acesso de visitantes enquanto você edita.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSiteConfig({...siteConfig, maintenanceMode: !siteConfig.maintenanceMode})}
                                            className={`w-16 h-8 rounded-full transition-all relative p-1 ${siteConfig.maintenanceMode ? 'bg-orange-600' : 'bg-white/10'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all ${siteConfig.maintenanceMode ? 'translate-x-8' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase text-gray-500">Logo do Topo</label>
                                            <div onClick={() => document.getElementById('upLogoT')?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden relative">
                                                {siteConfig.headerLogoUrl ? <img src={siteConfig.headerLogoUrl} className="w-full h-full object-contain" /> : <ImageIcon size={24} className="text-gray-600" />}
                                                <input id="upLogoT" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (arr) => setSiteConfig({...siteConfig, headerLogoUrl: arr[0]}), false)} />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase text-gray-500">Banner Principal</label>
                                            <div onClick={() => document.getElementById('upBanner')?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden relative">
                                                {siteConfig.heroImageUrl ? <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-gray-600" />}
                                                <input id="upBanner" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (arr) => setSiteConfig({...siteConfig, heroImageUrl: arr[0]}), false)} />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase text-gray-500">Imagem Rodapé</label>
                                            <div onClick={() => document.getElementById('upFooter')?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden relative">
                                                {siteConfig.bannerFooterUrl ? <img src={siteConfig.bannerFooterUrl} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-gray-600" />}
                                                <input id="upFooter" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (arr) => setSiteConfig({...siteConfig, bannerFooterUrl: arr[0]}), false)} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-gray-500">WhatsApp Oficial</label>
                                            <input value={siteConfig.whatsapp} onChange={e => setSiteConfig({...siteConfig, whatsapp: e.target.value})} placeholder="WHATSAPP" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-orange-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-gray-500">Telefone Contato</label>
                                            <input value={siteConfig.phone} onChange={e => setSiteConfig({...siteConfig, phone: e.target.value})} placeholder="TELEFONE" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-orange-500" />
                                        </div>
                                    </div>

                                    <button onClick={async () => { 
                                        setIsSaving(true);
                                        try {
                                            await db.updateConfig(siteConfig); 
                                            showToast("Configurações Salvas!"); 
                                            await refreshData(); 
                                        } catch (e) {
                                            showToast("Erro ao salvar no banco.", "error");
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }} disabled={isSaving} className="w-full h-14 rounded-2xl bg-orange-600 text-white font-black uppercase text-[11px] flex items-center justify-center gap-3 hover:bg-orange-700 transition-all"><Save size={18}/> {isSaving ? 'Salvando...' : 'Salvar Todas as Alterações'}</button>
                                </div>
                            )}
                        </main>
                    </div>
                )}
            </main>

            {editingPost && (
                <div className="fixed inset-0 z-[600] bg-black/90 flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in zoom-in duration-300 overflow-y-auto">
                    <form onSubmit={handleSavePost} className="glass-panel p-8 md:p-12 rounded-[40px] w-full max-w-3xl space-y-6 border-white/10 my-auto shadow-3xl">
                        <h3 className="text-2xl font-black uppercase text-white tracking-tighter text-center">{editingPost.id ? 'Editar Anúncio VIP' : 'Configurar Novo Anúncio'}</h3>
                        <div className="space-y-4">
                            <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="TÍTULO CHAMATIVO" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 font-bold uppercase text-[11px]" required />
                            
                            <div className="relative group">
                                <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="O QUE VOCÊ ESTÁ OFERECENDO? (A IA PODE TE AJUDAR ->)" rows={4} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 text-sm pr-16" required />
                                <button 
                                    type="button"
                                    title="Gerar descrição mágica com IA"
                                    onClick={async () => {
                                        if(!editingPost.title) return showToast("Digite um título primeiro para a IA!", "error");
                                        setIsGeneratingAi(true);
                                        try {
                                            const copy = await generateAdCopy(editingPost.category || 'Vendas', editingPost.title, 'short');
                                            const newContent = typeof copy === 'object' ? copy.content : copy;
                                            setEditingPost({...editingPost, content: newContent});
                                            showToast("Mágica feita!");
                                        } finally { setIsGeneratingAi(false); }
                                    }}
                                    className="absolute right-4 top-4 p-3 bg-orange-600/20 text-orange-500 rounded-xl hover:bg-orange-600 hover:text-white transition-all border border-orange-600/30 group-hover:scale-105"
                                >
                                    {isGeneratingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select value={editingPost.category} onChange={e => setEditingPost({...editingPost, category: e.target.value})} className="bg-brand-dark border border-white/10 p-5 rounded-2xl text-white uppercase font-black text-[10px]">
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <div className="space-y-2">
                                    <button type="button" onClick={() => document.getElementById('adUpV7')?.click()} className="w-full p-5 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl text-white font-black text-[10px] uppercase hover:bg-white/10 flex items-center justify-center gap-3">
                                        <ImageIcon size={18}/> {editingPost.imageUrls?.length ? `${editingPost.imageUrls.length} Fotos Adicionadas` : 'Adicionar Fotos (Máx 5)'}
                                    </button>
                                    <input id="adUpV7" type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (arr) => setEditingPost({...editingPost, imageUrls: arr}))} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button type="submit" className="flex-1 h-14 bg-orange-600 text-white rounded-2xl font-black uppercase text-[11px] flex items-center justify-center gap-3 hover:bg-orange-700 transition-all" disabled={isSaving}>{isSaving ? 'Publicando...' : (editingPost.id ? 'Salvar Alterações' : 'Publicar Anúncio')}</button>
                            <button type="button" onClick={() => setEditingPost(null)} className="flex-1 text-[10px] font-black uppercase text-gray-500">Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {editingPlan && (
                <div className="fixed inset-0 z-[600] bg-black/90 flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault(); setIsSaving(true);
                        try {
                            await db.savePlan(editingPlan);
                            refreshData(); setEditingPlan(null); showToast("Plano Salvo!");
                        } finally { setIsSaving(false); }
                    }} className="glass-panel p-8 rounded-[40px] w-full max-w-lg space-y-6">
                        <h3 className="text-2xl font-black uppercase text-white text-center">Configurar Plano</h3>
                        <input value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} placeholder="NOME DO PLANO" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 font-bold uppercase text-[10px]" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input value={editingPlan.price} type="number" step="0.01" onChange={e => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})} placeholder="VALOR R$" className="bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 font-bold uppercase text-[10px]" required />
                            <input value={editingPlan.durationDays} type="number" onChange={e => setEditingPlan({...editingPlan, durationDays: parseInt(e.target.value)})} placeholder="DIAS DE PRAZO" className="bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 font-bold uppercase text-[10px]" required />
                        </div>
                        <div className="flex gap-4">
                            <button type="submit" className="flex-1 h-12 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-orange-700 transition-all" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                            <button type="button" onClick={() => setEditingPlan(null)} className="text-[10px] font-black uppercase text-gray-500">Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {editingUser && (
                <div className="fixed inset-0 z-[600] bg-black/90 flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault(); setIsSaving(true);
                        try {
                            await db.updateUser(editingUser as User);
                            refreshData(); setEditingUser(null); showToast("Cliente Atualizado!");
                        } finally { setIsSaving(false); }
                    }} className="glass-panel p-8 rounded-[40px] w-full max-w-lg space-y-6">
                        <h3 className="text-2xl font-black uppercase text-white text-center">Editar Cliente</h3>
                        <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="NOME" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 font-bold uppercase text-[10px]" required />
                        <input value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} placeholder="WHATSAPP" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-orange-500 font-bold uppercase text-[10px]" required />
                        <div className="flex gap-4">
                            <button type="submit" className="flex-1 h-12 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-orange-700 transition-all" disabled={isSaving}>{isSaving ? 'Atualizando...' : 'Atualizar'}</button>
                            <button type="button" onClick={() => setEditingUser(null)} className="text-[10px] font-black uppercase text-gray-500">Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            <footer className="bg-brand-panel border-t border-white/5 pt-16 pb-10 mt-auto">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                {siteConfig.headerLogoUrl ? <img src={siteConfig.headerLogoUrl} className="h-10 w-auto" /> : <Radio className="text-orange-600" size={32} />}
                                <span className="text-xl font-black text-white uppercase tracking-tighter">Hélio Júnior</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed uppercase font-bold tracking-widest">Publicidade digital com o impacto do rádio que você conhece.</p>
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
                                <li className="flex items-center gap-3 text-green-500 cursor-pointer" onClick={() => window.open(`https://wa.me/${siteConfig.whatsapp}`, '_blank')}><Send size={14}/> WhatsApp</li>
                            </ul>
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
            
            <ChatBot whatsapp={siteConfig.whatsapp || ADMIN_WHATSAPP} />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
}
export default App;
