
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy, generateAudioTTS } from './services/geminiService';
import { 
    Trash2, Edit, MessageCircle, Users, Check, Zap, Image as ImageIcon, X, AlertTriangle, ShieldCheck, Upload, LogOut, Settings, CreditCard, Layers, PlusCircle, Save, Camera, Radio, Mic, Award, TrendingUp, Star, Search, Lock, Unlock
} from 'lucide-react';

const SESSION_KEY = 'helio_junior_vip_session';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<string>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem(SESSION_KEY);
        return saved ? JSON.parse(saved) : null;
    });
    
    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({
        heroLabel: 'Hélio Júnior',
        heroTitle: 'Voz que Vende, Portal que Conecta',
        heroSubtitle: 'O maior portal de classificados com locução inteligente do rádio brasileiro.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920',
        pixKey: '',
        pixName: '',
        whatsapp: ''
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);

    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');
    
    // Estados para formulários de Admin
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

    const showToast = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 3500);
    };

    const refreshData = async () => {
        setIsLoadingData(true);
        try {
            const [p, u, pl, cfg, cats] = await Promise.all([
                db.getPosts(),
                db.getUsers(),
                db.getPlans(),
                db.getConfig(),
                db.getCategories()
            ]);
            
            if (p) setPosts(p);
            if (u) setAllUsers(u);
            if (pl) setPlans(pl);
            if (cfg) setSiteConfig(cfg);
            if (cats) setCategories(cats);
            
            if (currentUser) {
                const fresh = u.find((usr: User) => usr.id === currentUser.id);
                if (fresh) {
                    setCurrentUser(fresh);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                }
            }
        } catch (error) {
            console.error("Erro de sincronização:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { refreshData(); }, []);

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Até breve, parceiro!");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => callback(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSavePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPost || !currentUser) return;
        setIsSaving(true);
        try {
            const postData = {
                ...editingPost,
                id: editingPost.id || 'p-' + Date.now(),
                createdAt: editingPost.createdAt || new Date().toISOString(),
                authorId: editingPost.authorId || currentUser.id,
                authorName: editingPost.authorName || currentUser.name,
                whatsapp: editingPost.whatsapp || currentUser.phone
            } as Post;
            await db.savePost(postData);
            await refreshData();
            setEditingPost(null);
            showToast("Anúncio publicado com sucesso!");
        } catch (err) {
            showToast("Erro ao publicar anúncio.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Handlers do Admin
    const handleUpdateUserStatus = async (user: User, status: PaymentStatus) => {
        const action = status === PaymentStatus.CONFIRMED ? 'liberar pagamento' : 'bloquear acesso';
        if (!confirm(`Deseja realmente ${action} para ${user.name}?`)) return;
        
        try {
            await db.updateUser({ ...user, paymentstatus: status }); // Note: matching lowercase for db helper
            showToast(`Status de ${user.name} atualizado!`);
            refreshData();
        } catch (e) { showToast("Erro ao atualizar status", "error"); }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.")) return;
        try {
            await db.deletePlan(id);
            showToast("Plano excluído com sucesso!");
            refreshData();
        } catch (e) { showToast("Erro ao excluir plano", "error"); }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este ramo de atuação?")) return;
        try {
            await db.deleteCategory(id);
            showToast("Ramo excluído com sucesso!");
            refreshData();
        } catch (e) { showToast("Erro ao excluir ramo", "error"); }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await db.updateConfig(siteConfig);
            showToast("Configurações salvas!");
        } catch (e) { showToast("Erro ao salvar config", "error"); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={!isLoadingData} />
            
            <main className="flex-1">
                {currentView === 'HOME' && (
                    <div className="animate-in fade-in duration-1000">
                        {/* HERO PREMIUM */}
                        <section className="relative pt-48 pb-32 overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-20 pointer-events-none">
                                <div className="absolute top-20 left-0 w-96 h-96 bg-brand-primary rounded-full blur-[120px]" />
                                <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-gold rounded-full blur-[120px]" />
                            </div>

                            <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                <div className="space-y-10 text-center lg:text-left">
                                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold">
                                        <Star size={14} className="animate-pulse" /> Membro da Associação de Rádio
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] drop-shadow-2xl">
                                        Seu Negócio na <span className="text-transparent bg-clip-text gold-gradient">Voz do Povo</span>
                                    </h1>
                                    <p className="text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                                        Mais que um portal, uma vitrine de luxo. Anuncie com a credibilidade de <span className="text-white font-bold">{siteConfig.heroLabel}</span> e use nossa IA para locução digital.
                                    </p>
                                    <div className="flex flex-wrap gap-6 pt-4 justify-center lg:justify-start">
                                        <button 
                                            onClick={() => setCurrentView('REGISTER')}
                                            className="h-20 px-12 gold-gradient text-brand-dark rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-105 transition-all"
                                        >
                                            Quero ser um Assinante
                                        </button>
                                        <button 
                                            onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})}
                                            className="h-20 px-12 bg-white/5 border border-white/10 text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all"
                                        >
                                            Explorar Vitrine
                                        </button>
                                    </div>
                                </div>
                                <div className="relative animate-float">
                                    <div className="glass-panel p-3 rounded-[60px] border-white/10 shadow-3xl rotate-2">
                                        <img src={siteConfig.heroImageUrl} className="w-full aspect-video object-cover rounded-[50px] shadow-2xl" alt="Mesa de Rádio" />
                                        <div className="absolute -bottom-10 -left-10 glass-panel p-8 rounded-[40px] border-brand-gold/30 shadow-2xl hidden md:block">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-brand-gold rounded-full flex items-center justify-center text-brand-dark"><TrendingUp size={24}/></div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Alcance Estimado</p>
                                                    <p className="text-2xl font-black text-white">+50k/mês</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* STATS SECTION */}
                        <section className="py-20 border-y border-white/5 bg-black/20">
                            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                                <div><p className="text-4xl font-black text-white">{allUsers.length + 150}</p><p className="text-[10px] font-bold uppercase text-brand-gold tracking-widest mt-2">Parceiros Ativos</p></div>
                                <div><p className="text-4xl font-black text-white">{posts.length + 1200}</p><p className="text-[10px] font-bold uppercase text-brand-gold tracking-widest mt-2">Anúncios Realizados</p></div>
                                <div><p className="text-4xl font-black text-white">24h</p><p className="text-[10px] font-bold uppercase text-brand-gold tracking-widest mt-2">No Ar Sempre</p></div>
                                <div><p className="text-4xl font-black text-white">100%</p><p className="text-[10px] font-bold uppercase text-brand-gold tracking-widest mt-2">Satisfação VIP</p></div>
                            </div>
                        </section>

                        {/* PLANOS DE ASSINATURA */}
                        <section className="py-32 relative overflow-hidden">
                            <div className="max-w-7xl mx-auto px-6 text-center mb-20 space-y-4">
                                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">Condições de Assinatura</h2>
                                <p className="text-brand-gold uppercase text-[12px] font-black tracking-[0.4em]">Seja visto por quem realmente importa</p>
                            </div>
                            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                                {plans.map((p, idx) => (
                                    <div key={p.id} className={`glass-panel p-16 rounded-[80px] flex flex-col items-center text-center border-white/5 transition-all group shadow-2xl relative ${idx === 1 ? 'border-brand-primary/50 scale-105 bg-brand-primary/5' : ''}`}>
                                        {idx === 1 && (
                                            <div className="absolute -top-6 bg-brand-primary px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white">Mais Assinado</div>
                                        )}
                                        <h3 className="text-2xl font-black uppercase text-white mb-4 tracking-tighter">{p.name}</h3>
                                        <div className="flex items-baseline gap-1 mb-8">
                                            <span className="text-xl font-bold text-gray-500">R$</span>
                                            <span className="text-6xl font-black text-white tracking-tighter">{Number(p.price).toFixed(2).split('.')[0]}</span>
                                            <span className="text-xl font-bold text-gray-500">,{Number(p.price).toFixed(2).split('.')[1]}</span>
                                        </div>
                                        <ul className="space-y-4 mb-12 text-sm text-gray-400 font-medium text-left">
                                            <li className="flex items-center gap-3"><Check size={18} className="text-brand-gold"/> {p.durationDays} dias de exibição</li>
                                            <li className="flex items-center gap-3"><Check size={18} className="text-brand-gold"/> Suporte via WhatsApp</li>
                                            <li className="flex items-center gap-3"><Check size={18} className="text-brand-gold"/> Locução Digital inclusa</li>
                                            <li className="flex items-center gap-3 opacity-50"><Check size={18}/> Banner Rotativo</li>
                                        </ul>
                                        <Button 
                                            className="w-full h-18 uppercase font-black tracking-widest text-xs" 
                                            variant={idx === 1 ? 'primary' : 'outline'}
                                            onClick={() => setCurrentView('REGISTER')}
                                        >
                                            Assinar Agora
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* VITRINE DE ANÚNCIOS */}
                        <section id="ads" className="max-w-7xl mx-auto px-6 py-32 bg-brand-panel/30 rounded-[100px] mb-32 border border-white/5">
                            <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20 px-10">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-brand-gold"><Radio size={20} className="animate-pulse"/><span className="text-xs font-black uppercase tracking-[0.3em]">No Ar Agora</span></div>
                                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Vitrine de Parceiros</h2>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {categories.map(cat => (
                                        <button key={cat.id} className="px-5 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] font-black uppercase text-gray-500 hover:text-white hover:border-brand-primary transition-all">
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 p-4">
                                {posts.filter(p => {
                                    const user = allUsers.find(u => u.id === p.authorId);
                                    return user?.paymentStatus === PaymentStatus.CONFIRMED || p.authorId === 'admin';
                                }).map(p => <PostCard key={p.id} post={p} />)}
                            </div>
                        </section>
                    </div>
                )}

                {/* TELAS DE CADASTRO / LOGIN */}
                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-dark to-brand-panel pt-32">
                        <div className="glass-panel p-20 rounded-[100px] w-full max-w-xl text-center">
                            <h2 className="text-5xl font-black text-white uppercase mb-4 tracking-tighter">{currentView === 'LOGIN' ? 'Bem-vindo' : 'Novo Assinante'}</h2>
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
                                            await refreshData();
                                        } else showToast("Dados incorretos.", "error");
                                    } else {
                                        const newUser = { 
                                            name: fd.get('name'), email: fd.get('email'), password: fd.get('password'), 
                                            phone: fd.get('phone'), profession: fd.get('profession'), 
                                            role: UserRole.ADVERTISER, createdAt: new Date().toISOString(), 
                                            paymentStatus: PaymentStatus.AWAITING,
                                            planId: fd.get('planId') || 'p_free'
                                        };
                                        const saved = await db.addUser(newUser);
                                        if (saved) { setCurrentUser(saved); localStorage.setItem(SESSION_KEY, JSON.stringify(saved)); setCurrentView('DASHBOARD'); await refreshData(); }
                                    }
                                } finally { setIsLoggingIn(false); }
                            }} className="space-y-6">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="NOME OU EMPRESA" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                        <input name="phone" required placeholder="WHATSAPP" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <select name="profession" required className="bg-brand-dark border border-white/10 p-7 rounded-[35px] text-white outline-none font-black uppercase text-[10px]">
                                                <option value="">SEU RAMO</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                            <select name="planId" required className="bg-brand-dark border border-white/10 p-7 rounded-[35px] text-white outline-none font-black uppercase text-[10px]">
                                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="E-MAIL" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                <input name="password" required type="password" placeholder="SENHA" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                <Button type="submit" className="w-full h-20 text-sm font-black uppercase tracking-[0.3em]" isLoading={isLoggingIn}>
                                    {currentView === 'LOGIN' ? 'Entrar no Portal' : 'Confirmar Assinatura'}
                                </Button>
                            </form>
                        </div>
                    </div>
                )}

                {/* PAINEL ADMIN */}
                {currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && (
                    <div className="flex flex-col md:flex-row min-h-screen pt-32 bg-brand-dark">
                        <aside className="w-full md:w-80 border-r border-white/5 p-10 space-y-4">
                            {[
                                { id: 'INICIO', label: 'Dashboard', icon: Layers },
                                { id: 'CLIENTES', label: 'Assinantes', icon: Users },
                                { id: 'PLANOS', label: 'Planos & Preços', icon: CreditCard },
                                { id: 'CATEGORIAS', label: 'Ramos de Atuação', icon: Layers },
                                { id: 'AJUSTES', label: 'Configurações', icon: Settings },
                            ].map(item => (
                                <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`w-full flex items-center gap-6 p-6 rounded-[30px] transition-all ${adminSubView === item.id ? 'bg-brand-primary text-white shadow-xl' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={20} /><span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                        </aside>
                        
                        <main className="flex-1 p-16 overflow-y-auto">
                            {adminSubView === 'INICIO' && (
                                <div className="space-y-12 animate-in fade-in duration-500">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter">Visão Geral</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="glass-panel p-10 rounded-[40px] border-white/5">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Total de Clientes</p>
                                            <h4 className="text-4xl font-black mt-2">{allUsers.length}</h4>
                                        </div>
                                        <div className="glass-panel p-10 rounded-[40px] border-white/5">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Anúncios Ativos</p>
                                            <h4 className="text-4xl font-black mt-2">{posts.length}</h4>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CLIENTES' && (
                                <div className="space-y-10 animate-in fade-in">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter">Assinantes</h2>
                                    <div className="glass-panel rounded-[40px] overflow-hidden border-white/5">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[10px] font-black uppercase text-gray-500">
                                                <tr>
                                                    <th className="p-8">Assinante</th>
                                                    <th className="p-8">Pagamento</th>
                                                    <th className="p-8">Plano</th>
                                                    <th className="p-8">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {allUsers.filter(u => u.id !== 'admin').map(u => (
                                                    <tr key={u.id} className="hover:bg-white/2 transition-colors">
                                                        <td className="p-8 font-black">{u.name}<br/><span className="text-[10px] text-gray-500 font-medium lowercase">{u.email}</span></td>
                                                        <td className="p-8">
                                                            <span className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase border ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                                                                {u.paymentStatus}
                                                            </span>
                                                        </td>
                                                        <td className="p-8 text-[10px] font-black uppercase text-gray-400">{plans.find(p => p.id === u.planId)?.name || 'Degustação'}</td>
                                                        <td className="p-8">
                                                            <div className="flex gap-2">
                                                                {u.paymentStatus !== PaymentStatus.CONFIRMED ? (
                                                                    <button onClick={() => handleUpdateUserStatus(u, PaymentStatus.CONFIRMED)} className="p-3 bg-green-600/10 text-green-500 rounded-xl hover:bg-green-600 hover:text-white transition-all" title="Liberar Pagamento">
                                                                        <Unlock size={16}/>
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => handleUpdateUserStatus(u, PaymentStatus.AWAITING)} className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all" title="Bloquear Acesso">
                                                                        <Lock size={16}/>
                                                                    </button>
                                                                )}
                                                                <button onClick={() => { if(confirm("Remover usuário permanentemente?")) { db.deleteUser(u.id); refreshData(); } }} className="p-3 bg-white/5 text-gray-500 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'PLANOS' && (
                                <div className="space-y-10 animate-in fade-in">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-4xl font-black uppercase tracking-tighter">Planos & Preços</h2>
                                        <Button onClick={() => setEditingPlan({ name: '', price: 0, durationDays: 30, description: '' })} className="h-14 font-black">
                                            <PlusCircle size={20}/> Novo Plano
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {plans.map(p => (
                                            <div key={p.id} className="glass-panel p-10 rounded-[40px] border-white/5 relative group transition-all hover:border-brand-primary/40">
                                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => setEditingPlan(p)} className="p-3 bg-brand-primary rounded-xl text-white shadow-lg"><Edit size={16}/></button>
                                                    <button onClick={() => handleDeletePlan(p.id)} className="p-3 bg-red-600 rounded-xl text-white shadow-lg"><Trash2 size={16}/></button>
                                                </div>
                                                <h3 className="text-2xl font-black uppercase mb-4">{p.name}</h3>
                                                <div className="text-4xl font-black text-brand-gold mb-6 tracking-tighter">R$ {Number(p.price).toFixed(2)}</div>
                                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">{p.durationDays} Dias de Destaque</div>
                                                <p className="text-xs text-gray-400 font-medium leading-relaxed">{p.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CATEGORIAS' && (
                                <div className="space-y-10 max-w-4xl animate-in fade-in">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-4xl font-black uppercase tracking-tighter">Ramos de Atuação</h2>
                                        <Button onClick={() => setEditingCategory({ name: '' })} className="h-14 font-black">
                                            <PlusCircle size={20}/> Novo Ramo
                                        </Button>
                                    </div>
                                    <div className="glass-panel rounded-[40px] overflow-hidden border-white/5">
                                        {categories.map(c => (
                                            <div key={c.id} className="p-8 border-b border-white/5 flex items-center justify-between group hover:bg-white/2 transition-all">
                                                <span className="text-sm font-black uppercase tracking-widest text-white">{c.name}</span>
                                                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => setEditingCategory(c)} className="p-3 bg-white/5 text-gray-400 hover:text-white rounded-xl hover:bg-brand-primary transition-all"><Edit size={16}/></button>
                                                    <button onClick={() => handleDeleteCategory(c.id)} className="p-3 bg-white/5 text-gray-400 hover:text-white rounded-xl hover:bg-red-600 transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'AJUSTES' && (
                                <form onSubmit={handleSaveConfig} className="space-y-12 max-w-4xl animate-in fade-in">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter">Configurações Gerais</h2>
                                    <div className="glass-panel p-12 rounded-[50px] space-y-10 border-white/10 shadow-2xl">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Nome em Destaque (Radialista)</label>
                                            <input value={siteConfig.heroLabel} onChange={e => setSiteConfig({...siteConfig, heroLabel: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl outline-none focus:border-brand-primary text-white font-bold" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Imagem de Fundo (Hero)</label>
                                            <div className="aspect-video bg-black/40 rounded-[40px] overflow-hidden relative group border border-white/10">
                                                <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => document.getElementById('heroUpload')?.click()} className="absolute inset-0 bg-brand-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center font-black uppercase tracking-widest text-xs transition-all backdrop-blur-sm">Alterar Foto</button>
                                                <input id="heroUpload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setSiteConfig({...siteConfig, heroImageUrl: b}))} />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-20 text-lg uppercase font-black tracking-widest" isLoading={isSaving}><Save size={24}/> Salvar Alterações</Button>
                                    </div>
                                </form>
                            )}
                        </main>
                    </div>
                )}

                {/* DASHBOARD DO ASSINANTE */}
                {currentView === 'DASHBOARD' && currentUser && (
                   <div className="pt-48 pb-56 max-w-7xl mx-auto px-6 animate-in fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-24 border-b border-white/5 pb-20">
                            <div className="flex items-center gap-10">
                                <div className="w-32 h-32 bg-gradient-to-br from-brand-primary to-purple-800 rounded-[45px] flex items-center justify-center text-white font-black text-5xl transform -rotate-3">{currentUser.name[0]}</div>
                                <div className="space-y-2">
                                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{currentUser.name}</h2>
                                    <span className={`text-[10px] font-black uppercase px-6 py-2 rounded-full shadow-lg ${currentUser.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}>{currentUser.paymentStatus}</span>
                                </div>
                            </div>
                            <Button className="h-20 px-14 text-lg uppercase font-black" onClick={() => setEditingPost({ title: '', content: '', category: currentUser.profession || 'Geral' })}>
                                <PlusCircle size={24}/> Novo Anúncio VIP
                            </Button>
                        </div>

                        {/* MESA DE SOM IA */}
                        <div className="glass-panel rounded-[80px] p-16 border-brand-primary/20 mb-32 shadow-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Mic size={240} className="text-brand-primary"/></div>
                            <div className="relative z-10 space-y-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-brand-primary rounded-3xl flex items-center justify-center text-white"><Zap size={32}/></div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter">Estúdio Digital IA</h2>
                                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Crie textos de rádio em segundos</p>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-6">
                                    <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="O que você quer vender hoje?" className="flex-1 bg-white/5 border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary text-lg" />
                                    <Button className="h-20 px-16 text-sm font-black uppercase" onClick={async () => {
                                        if(!magicPrompt) return;
                                        setIsGeneratingAi(true);
                                        try {
                                          const res = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
                                          const data = typeof res === 'object' ? res : { title: 'Oportunidade VIP', content: res };
                                          setEditingPost({ ...editingPost, title: data.title, content: data.content });
                                          showToast("Texto gerado pela IA!");
                                        } finally { setIsGeneratingAi(false); }
                                    }} isLoading={isGeneratingAi}>Gerar Texto</Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
                            {posts.filter(p => p.authorId === currentUser.id).map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-6 right-6 z-20 flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingPost(p)} className="p-4 bg-brand-primary rounded-2xl text-white shadow-xl"><Edit size={16}/></button>
                                        <button onClick={async () => { if(confirm("Remover anúncio?")) { await db.deletePost(p.id); refreshData(); } }} className="p-4 bg-red-600 rounded-2xl text-white shadow-xl"><Trash2 size={16}/></button>
                                    </div>
                                    <PostCard post={p} />
                                </div>
                            ))}
                        </div>
                   </div>
                )}
            </main>

            {/* MODAIS DE ADMIN (PLANOS E CATEGORIAS) */}
            {editingPlan && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl animate-in zoom-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        try { 
                            await db.savePlan(editingPlan); 
                            refreshData(); 
                            setEditingPlan(null); 
                            showToast("Plano salvo com sucesso!"); 
                        } catch { showToast("Erro ao salvar plano", "error"); }
                        finally { setIsSaving(false); }
                    }} className="glass-panel p-16 rounded-[80px] w-full max-w-xl space-y-10 border-white/10 shadow-3xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-3xl font-black uppercase tracking-tighter">Configurar Plano</h3>
                            <button type="button" onClick={() => setEditingPlan(null)} className="text-gray-500 hover:text-white transition-colors"><X size={32}/></button>
                        </div>
                        <div className="space-y-6">
                            <input value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} placeholder="NOME DO PLANO" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none font-bold" required />
                            <div className="grid grid-cols-2 gap-6">
                                <input type="number" step="0.01" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} placeholder="PREÇO (R$)" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white font-bold" required />
                                <input type="number" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: Number(e.target.value)})} placeholder="DURAÇÃO (DIAS)" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white font-bold" required />
                            </div>
                            <textarea value={editingPlan.description} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} placeholder="RESUMO DOS BENEFÍCIOS" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white h-32 resize-none outline-none focus:border-brand-primary" />
                        </div>
                        <Button type="submit" className="w-full h-20 text-sm uppercase font-black" isLoading={isSaving}>Salvar Alterações</Button>
                    </form>
                </div>
            )}

            {editingCategory && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl animate-in zoom-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        try { 
                            await db.saveCategory(editingCategory); 
                            refreshData(); 
                            setEditingCategory(null); 
                            showToast("Ramo de atuação salvo!"); 
                        } catch { showToast("Erro ao salvar ramo", "error"); }
                        finally { setIsSaving(false); }
                    }} className="glass-panel p-16 rounded-[80px] w-full max-w-md space-y-10 border-white/10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Ramo de Atuação</h3>
                            <button type="button" onClick={() => setEditingCategory(null)} className="text-gray-500 hover:text-white transition-colors"><X size={32}/></button>
                        </div>
                        <input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="EX: ALIMENTAÇÃO, SERVIÇOS..." className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white font-bold outline-none focus:border-brand-primary" required />
                        <Button type="submit" className="w-full h-20 uppercase font-black text-sm" isLoading={isSaving}>Confirmar Ramo</Button>
                    </form>
                </div>
            )}

            {/* MODAL DE EDIÇÃO DE ANÚNCIO (ASSINANTE) */}
            {editingPost && (
                <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <form onSubmit={handleSavePost} className="glass-panel p-16 rounded-[100px] w-full max-w-4xl space-y-12 border-white/10 shadow-3xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center border-b border-white/5 pb-10">
                            <h4 className="text-4xl font-black uppercase text-white tracking-tighter">Editor de Vitrine</h4>
                            <button type="button" onClick={() => setEditingPost(null)} className="p-6 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={32}/></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Título do Anúncio</label>
                                    <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="TÍTULO IMPACTANTE" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none focus:border-brand-primary font-bold" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Texto de Locução</label>
                                    <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="O QUE O LOCUTOR VAI DIZER..." className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white h-48 resize-none outline-none focus:border-brand-primary leading-relaxed" required />
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Imagem (Format Paisagem)</label>
                                    <div className="aspect-video bg-black/40 rounded-[50px] overflow-hidden border border-white/10 relative group">
                                        {editingPost.imageUrl && <img src={editingPost.imageUrl} className="w-full h-full object-cover" />}
                                        <button type="button" onClick={() => document.getElementById('adFile')?.click()} className="absolute inset-0 bg-brand-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center font-black uppercase transition-all backdrop-blur-sm">Escolher Foto</button>
                                        <input id="adFile" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setEditingPost({...editingPost, imageUrl: b}))} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-24 uppercase font-black tracking-[0.4em] text-lg shadow-3xl" isLoading={isSaving}>Publicar Agora</Button>
                    </form>
                </div>
            )}

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[400] px-12 py-8 rounded-[50px] shadow-3xl flex items-center gap-6 animate-in slide-in-from-bottom-20 duration-500 border border-white/10 backdrop-blur-3xl ${toast.t === 'success' ? 'bg-brand-primary text-white' : 'bg-red-600 text-white'}`}>
                    <span className="font-black uppercase text-[10px] tracking-[0.2em]">{toast.m}</span>
                </div>
            )}

            {/* FOOTER */}
            <footer className="bg-brand-dark py-32 text-center border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center space-y-12">
                    <div className="flex items-center gap-6 text-white/20">
                      <Radio size={40} />
                      <span className="text-3xl font-black uppercase tracking-tighter">{siteConfig.heroLabel}</span>
                    </div>
                    <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.8em]">Credibilidade em cada palavra</p>
                    <div className="flex gap-8">
                         <div className="w-12 h-12 rounded-[22px] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-brand-gold/20 hover:text-brand-gold transition-all cursor-pointer"><MessageCircle size={20}/></div>
                         <div className="w-12 h-12 rounded-[22px] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-brand-gold/20 hover:text-brand-gold transition-all cursor-pointer"><TrendingUp size={20}/></div>
                         <div className="w-12 h-12 rounded-[22px] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-brand-gold/20 hover:text-brand-gold transition-all cursor-pointer"><Award size={20}/></div>
                    </div>
                    <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">© 2024 {siteConfig.heroLabel} - Todos os direitos reservados</p>
                </div>
            </footer>
        </div>
    );
};

export default App;
