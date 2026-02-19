
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Trash2, Edit, MessageCircle, Users, Check, Zap, X, AlertTriangle, LogOut, Settings, CreditCard, Layers, PlusCircle, Save, Camera, Radio, Mic, Award, TrendingUp, Star, Search, Lock, Unlock, HelpCircle
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
    const [plans, setPostsPlans] = useState<Plan[]>([]);
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
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');

    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean,
        title: string,
        message: string,
        onConfirm: () => void,
        variant?: 'danger' | 'primary'
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const showToast = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 3000);
    };

    const triggerConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            },
            variant
        });
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
            if (pl) setPostsPlans(pl);
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
            console.error("Erro ao sincronizar dados:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { refreshData(); }, []);

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Até breve!");
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
                id: editingPost.id || undefined,
                authorId: editingPost.authorId || currentUser.id,
                authorName: editingPost.authorName || currentUser.name,
                whatsapp: editingPost.whatsapp || currentUser.phone,
                phone: editingPost.phone || currentUser.phone,
                createdAt: editingPost.createdAt || new Date().toISOString(),
            } as Post;
            await db.savePost(postData);
            await refreshData();
            setEditingPost(null);
            showToast("Publicação salva!");
        } catch (err) {
            showToast("Erro ao salvar anúncio.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTogglePayment = (user: User) => {
        const isApproving = user.paymentStatus !== PaymentStatus.CONFIRMED;
        const action = isApproving ? "Liberar Pagamento" : "Bloquear Acesso";
        const msg = isApproving 
            ? `Deseja liberar o acesso de ${user.name}?` 
            : `Deseja bloquear o acesso de ${user.name}?`;

        triggerConfirm(action, msg, async () => {
            try {
                const updatedUser = { 
                    ...user, 
                    paymentStatus: isApproving ? PaymentStatus.CONFIRMED : PaymentStatus.AWAITING 
                };
                await db.updateUser(updatedUser);
                showToast("Status atualizado!");
                // Aguarda um breve momento para o Supabase processar antes do refresh
                setTimeout(refreshData, 300);
            } catch (e) { showToast("Erro ao processar", "error"); }
        }, isApproving ? 'primary' : 'danger');
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await db.updateConfig(siteConfig);
            showToast("Configurações atualizadas!");
            refreshData();
        } catch (e) { showToast("Erro ao salvar", "error"); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans overflow-x-hidden">
            <Navbar 
                currentUser={currentUser} 
                setCurrentView={setCurrentView} 
                currentView={currentView} 
                onLogout={handleLogout} 
                config={siteConfig} 
                isOnline={!isLoadingData} 
            />
            
            <main className="flex-1">
                {currentView === 'HOME' && (
                    <div className="animate-in fade-in duration-1000">
                        <section className="relative pt-48 pb-32">
                            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                <div className="space-y-8 text-center lg:text-left">
                                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold">
                                        <Star size={14} className="animate-pulse" /> Qualidade Hélio Júnior
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                                        Onde sua Marca <span className="text-transparent bg-clip-text gold-gradient">Ganha Voz</span>
                                    </h1>
                                    <p className="text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                                        {siteConfig.heroSubtitle} Anuncie na maior vitrine de radialismo digital.
                                    </p>
                                    <div className="flex flex-wrap gap-6 pt-4 justify-center lg:justify-start">
                                        <button onClick={() => setCurrentView('REGISTER')} className="h-20 px-12 gold-gradient text-brand-dark rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-105 transition-all">Começar Agora</button>
                                        <button onClick={() => document.getElementById('vitrine')?.scrollIntoView({behavior:'smooth'})} className="h-20 px-12 bg-white/5 border border-white/10 text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all">Ver Anúncios</button>
                                    </div>
                                </div>
                                <div className="relative animate-float">
                                    <div className="glass-panel p-3 rounded-[60px] border-white/10 shadow-3xl rotate-2">
                                        <img src={siteConfig.heroImageUrl} className="w-full aspect-video object-cover rounded-[50px] shadow-2xl" alt="Radialista" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="py-20 bg-black/20 border-y border-white/5">
                            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                                <div><p className="text-4xl font-black text-white">{allUsers.length + 50}</p><p className="text-[10px] font-bold uppercase text-brand-gold tracking-widest mt-2">Parceiros</p></div>
                                <div><p className="text-4xl font-black text-white">{posts.length + 100}</p><p className="text-[10px] font-bold uppercase text-brand-gold tracking-widest mt-2">Classificados</p></div>
                                <div><p className="text-4xl font-black text-white">24h</p><p className="text-[10px] font-bold uppercase text-brand-gold tracking-widest mt-2">Disponibilidade</p></div>
                                <div><p className="text-4xl font-black text-white">100%</p><p className="text-[10px] font-bold uppercase text-brand-gold tracking-widest mt-2">Garantia VIP</p></div>
                            </div>
                        </section>

                        <section className="py-32">
                            <div className="max-w-7xl mx-auto px-6 text-center mb-20">
                                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">Planos Assinatura</h2>
                            </div>
                            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                                {plans.map((p, i) => (
                                    <div key={p.id} className={`glass-panel p-16 rounded-[80px] flex flex-col items-center border-white/5 shadow-2xl transition-all hover:border-brand-primary/40 ${i === 1 ? 'scale-105 border-brand-primary/50' : ''}`}>
                                        <h3 className="text-2xl font-black uppercase text-white mb-6">{p.name}</h3>
                                        <div className="text-5xl font-black text-white mb-8 tracking-tighter">R$ {Number(p.price).toFixed(2)}</div>
                                        <ul className="space-y-4 mb-12 text-sm text-gray-500 font-medium">
                                            <li className="flex items-center gap-3"><Check size={18} className="text-brand-gold"/> {p.durationDays} dias no ar</li>
                                            <li className="flex items-center gap-3"><Check size={18} className="text-brand-gold"/> Locução IA</li>
                                            <li className="flex items-center gap-3"><Check size={18} className="text-brand-gold"/> Suporte VIP</li>
                                        </ul>
                                        <Button className="w-full h-16 uppercase font-black" onClick={() => setCurrentView('REGISTER')}>Assinar</Button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section id="vitrine" className="max-w-7xl mx-auto px-6 py-32 bg-brand-panel/20 rounded-[100px] mb-32 border border-white/5">
                            <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20 px-10">
                                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Vitrine VIP</h2>
                                <div className="flex flex-wrap gap-3">
                                    {categories.map(c => <span key={c.id} className="px-5 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase text-gray-500">{c.name}</span>)}
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

                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-dark to-brand-panel pt-32">
                        <div className="glass-panel p-20 rounded-[100px] w-full max-w-xl text-center shadow-3xl">
                            <h2 className="text-5xl font-black text-white uppercase mb-8 tracking-tighter">{currentView === 'LOGIN' ? 'Entrar' : 'Cadastro'}</h2>
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
                                            refreshData();
                                        } else showToast("Acesso negado.", "error");
                                    } else {
                                        const newUser = { 
                                            name: fd.get('name'), email: fd.get('email'), password: fd.get('password'), 
                                            phone: fd.get('phone'), profession: fd.get('profession'), 
                                            role: UserRole.ADVERTISER, createdAt: new Date().toISOString(), 
                                            paymentStatus: PaymentStatus.AWAITING,
                                            planId: fd.get('planId') || 'p_free'
                                        };
                                        const saved = await db.addUser(newUser);
                                        if (saved) { setCurrentUser(saved); localStorage.setItem(SESSION_KEY, JSON.stringify(saved)); setCurrentView('DASHBOARD'); refreshData(); }
                                    }
                                } finally { setIsLoggingIn(false); }
                            }} className="space-y-6">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="NOME OU EMPRESA" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                        <input name="phone" required placeholder="WHATSAPP" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <select name="profession" required className="bg-brand-dark border border-white/10 p-7 rounded-[35px] text-white outline-none font-black uppercase text-[10px]">
                                                <option value="">RAMO</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                            <select name="planId" required className="bg-brand-dark border border-white/10 p-7 rounded-[35px] text-white outline-none font-black uppercase text-[10px]">
                                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="E-MAIL" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none" />
                                <input name="password" required type="password" placeholder="SENHA" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none" />
                                <Button type="submit" className="w-full h-20 text-sm font-black uppercase" isLoading={isLoggingIn}>Confirmar</Button>
                            </form>
                        </div>
                    </div>
                )}

                {currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && (
                    <div className="flex flex-col md:flex-row min-h-screen pt-32 bg-brand-dark">
                        <aside className="w-full md:w-80 border-r border-white/5 p-10 space-y-4">
                            {[
                                { id: 'INICIO', label: 'Início', icon: Layers },
                                { id: 'CLIENTES', label: 'Assinantes', icon: Users },
                                { id: 'PLANOS', label: 'Planos', icon: CreditCard },
                                { id: 'CATEGORIAS', label: 'Ramos', icon: Layers },
                                { id: 'AJUSTES', label: 'Ajustes', icon: Settings },
                            ].map(item => (
                                <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`w-full flex items-center gap-6 p-6 rounded-[30px] transition-all ${adminSubView === item.id ? 'bg-brand-primary text-white shadow-xl' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={20} /><span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                            <button onClick={handleLogout} className="w-full flex items-center gap-6 p-6 rounded-[30px] text-red-500 hover:bg-red-500/10 mt-10"><LogOut size={20}/> <span className="text-[10px] font-black uppercase">Sair</span></button>
                        </aside>
                        
                        <main className="flex-1 p-16 overflow-y-auto">
                            {adminSubView === 'INICIO' && (
                                <div className="space-y-12">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Dashboard Admin</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="glass-panel p-10 rounded-[40px] border-white/5">
                                            <p className="text-[10px] font-black uppercase text-gray-500">Usuários</p>
                                            <h4 className="text-4xl font-black mt-2 text-white">{allUsers.length}</h4>
                                        </div>
                                        <div className="glass-panel p-10 rounded-[40px] border-white/5">
                                            <p className="text-[10px] font-black uppercase text-gray-500">Anúncios</p>
                                            <h4 className="text-4xl font-black mt-2 text-white">{posts.length}</h4>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CLIENTES' && (
                                <div className="space-y-10">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Gestão de Assinantes</h2>
                                    <div className="glass-panel rounded-[40px] overflow-hidden border-white/5">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[10px] font-black uppercase text-gray-500">
                                                <tr><th className="p-8">Assinante</th><th className="p-8">Status</th><th className="p-8">Ações</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {allUsers.filter(u => u.id !== 'admin').map(u => (
                                                    <tr key={u.id} className="hover:bg-white/2 transition-colors">
                                                        <td className="p-8 font-black text-white">{u.name}<br/><span className="text-[10px] text-gray-500 font-medium lowercase">{u.email}</span></td>
                                                        <td className="p-8">
                                                            <span className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase border ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                                                                {u.paymentStatus}
                                                            </span>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleTogglePayment(u)} className={`p-4 rounded-xl transition-all ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-red-600/10 text-red-500 hover:bg-red-600' : 'bg-green-600/10 text-green-500 hover:bg-green-600'} hover:text-white`}>
                                                                    {u.paymentStatus === PaymentStatus.CONFIRMED ? <Lock size={16}/> : <Unlock size={16}/>}
                                                                </button>
                                                                <button onClick={() => triggerConfirm("Excluir Usuário", "Deletar conta permanentemente?", async () => { await db.deleteUser(u.id); setTimeout(refreshData, 300); }, 'danger')} className="p-4 bg-white/5 text-gray-500 rounded-xl hover:bg-red-600 hover:text-white"><Trash2 size={16}/></button>
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
                                <div className="space-y-10">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Planos</h2>
                                        <Button onClick={() => setEditingPlan({ name: '', price: 0, durationDays: 30, description: '' })} className="h-14"><PlusCircle size={20}/> Novo Plano</Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {plans.map(p => (
                                            <div key={p.id} className="glass-panel p-10 rounded-[40px] border-white/5 relative group">
                                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => setEditingPlan(p)} className="p-3 bg-brand-primary rounded-xl text-white shadow-lg"><Edit size={16}/></button>
                                                    <button onClick={() => triggerConfirm("Remover Plano", "Deseja excluir este plano?", async () => { await db.deletePlan(p.id); setTimeout(refreshData, 300); }, 'danger')} className="p-3 bg-red-600 rounded-xl text-white shadow-lg"><Trash2 size={16}/></button>
                                                </div>
                                                <h3 className="text-2xl font-black uppercase text-white mb-4">{p.name}</h3>
                                                <div className="text-4xl font-black text-brand-gold mb-6 tracking-tighter">R$ {Number(p.price).toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CATEGORIAS' && (
                                <div className="space-y-10 max-w-4xl">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Ramos de Atuação</h2>
                                        <Button onClick={() => setEditingCategory({ name: '' })} className="h-14 font-black"><PlusCircle size={20}/> Novo Ramo</Button>
                                    </div>
                                    <div className="glass-panel rounded-[40px] overflow-hidden border-white/5 divide-y divide-white/5">
                                        {categories.map(c => (
                                            <div key={c.id} className="p-8 flex items-center justify-between group hover:bg-white/2 transition-all">
                                                <span className="text-sm font-black uppercase tracking-widest text-white">{c.name}</span>
                                                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => setEditingCategory(c)} className="p-3 bg-white/5 text-gray-400 hover:text-white rounded-xl hover:bg-brand-primary transition-all"><Edit size={16}/></button>
                                                    <button onClick={() => triggerConfirm("Remover Ramo", "Excluir esta categoria?", async () => { await db.deleteCategory(c.id); setTimeout(refreshData, 300); }, 'danger')} className="p-3 bg-white/5 text-gray-400 hover:text-white rounded-xl hover:bg-red-600 transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'AJUSTES' && (
                                <form onSubmit={handleSaveConfig} className="space-y-12 max-w-4xl animate-in fade-in">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Ajustes</h2>
                                    <div className="glass-panel p-12 rounded-[50px] space-y-10 border-white/10 shadow-2xl">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-gray-500">Nome do Radialista</label>
                                            <input value={siteConfig.heroLabel} onChange={e => setSiteConfig({...siteConfig, heroLabel: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white font-bold" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-gray-500">Imagem Hero</label>
                                            <div className="aspect-video bg-black/40 rounded-[40px] overflow-hidden relative group border border-white/10">
                                                <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => document.getElementById('heroUp')?.click()} className="absolute inset-0 bg-brand-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center font-black uppercase tracking-widest text-xs transition-all text-white">Alterar</button>
                                                <input id="heroUp" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setSiteConfig({...siteConfig, heroImageUrl: b}))} />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-20 text-lg uppercase font-black" isLoading={isSaving}><Save size={24}/> Salvar Alterações</Button>
                                    </div>
                                </form>
                            )}
                        </main>
                    </div>
                )}

                {currentView === 'DASHBOARD' && currentUser && (
                   <div className="pt-48 pb-56 max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-24 border-b border-white/5 pb-20">
                            <div className="flex items-center gap-10">
                                <div className="w-32 h-32 bg-gradient-to-br from-brand-primary to-purple-800 rounded-[45px] flex items-center justify-center text-white font-black text-5xl transform -rotate-3">{currentUser.name[0]}</div>
                                <div className="space-y-2">
                                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{currentUser.name}</h2>
                                    <span className={`text-[10px] font-black uppercase px-6 py-2 rounded-full shadow-lg ${currentUser.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}>{currentUser.paymentStatus}</span>
                                </div>
                            </div>
                            <Button className="h-20 px-14 text-lg uppercase font-black" onClick={() => setEditingPost({ title: '', content: '', category: currentUser.profession || 'Geral' })}><PlusCircle size={24}/> Novo Anúncio</Button>
                        </div>

                        <div className="glass-panel rounded-[80px] p-16 border-brand-primary/20 mb-32 shadow-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Mic size={240} className="text-brand-primary"/></div>
                            <div className="relative z-10 space-y-10">
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Assistente de Locução IA</h2>
                                <div className="flex flex-col md:flex-row gap-6">
                                    <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="O que vamos vender hoje?" className="flex-1 bg-white/5 border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary text-lg" />
                                    <Button className="h-20 px-16 uppercase font-black" onClick={async () => {
                                        if(!magicPrompt) return;
                                        setIsGeneratingAi(true);
                                        try {
                                          const res = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
                                          const data = typeof res === 'object' ? res : { title: 'Destaque VIP', content: res };
                                          setEditingPost({ ...editingPost, title: data.title, content: data.content });
                                          showToast("Texto gerado pela IA!");
                                        } finally { setIsGeneratingAi(false); }
                                    }} isLoading={isGeneratingAi}>Gerar Script</Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
                            {posts.filter(p => p.authorId === currentUser.id).map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-6 right-6 z-20 flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingPost(p)} className="p-4 bg-brand-primary rounded-2xl text-white shadow-xl"><Edit size={16}/></button>
                                        <button onClick={() => triggerConfirm("Excluir", "Remover anúncio?", async () => { await db.deletePost(p.id); refreshData(); }, 'danger')} className="p-4 bg-red-600 rounded-2xl text-white shadow-xl"><Trash2 size={16}/></button>
                                    </div>
                                    <PostCard post={p} />
                                </div>
                            ))}
                        </div>
                   </div>
                )}
            </main>

            {editingPlan && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl animate-in zoom-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        try { await db.savePlan(editingPlan); setTimeout(refreshData, 300); setEditingPlan(null); showToast("Plano salvo!"); } catch { showToast("Erro", "error"); }
                        finally { setIsSaving(false); }
                    }} className="glass-panel p-16 rounded-[80px] w-full max-w-xl space-y-10 border-white/10 shadow-3xl">
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Configurar Plano</h3>
                        <div className="space-y-6">
                            <input value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} placeholder="NOME DO PLANO" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white font-bold" required />
                            <div className="grid grid-cols-2 gap-6">
                                <input type="number" step="0.01" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} placeholder="PREÇO" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white font-bold" required />
                                <input type="number" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: Number(e.target.value)})} placeholder="DIAS" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white font-bold" required />
                            </div>
                        </div>
                        <div className="flex gap-4"><Button type="button" variant="outline" onClick={() => setEditingPlan(null)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1" isLoading={isSaving}>Salvar</Button></div>
                    </form>
                </div>
            )}

            {editingCategory && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl animate-in zoom-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        try { await db.saveCategory(editingCategory); setTimeout(refreshData, 300); setEditingCategory(null); showToast("Ramo salvo!"); } catch { showToast("Erro", "error"); }
                        finally { setIsSaving(false); }
                    }} className="glass-panel p-16 rounded-[80px] w-full max-w-md space-y-10 border-white/10">
                        <h3 className="text-3xl font-black uppercase text-white">Ramo de Atuação</h3>
                        <input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="NOME DO RAMO" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white font-bold outline-none" required />
                        <Button type="submit" className="w-full h-20 uppercase font-black" isLoading={isSaving}>Confirmar</Button>
                    </form>
                </div>
            )}

            {editingPost && (
                <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <form onSubmit={handleSavePost} className="glass-panel p-16 rounded-[100px] w-full max-w-4xl space-y-12 border-white/10 shadow-3xl">
                        <div className="flex justify-between items-center border-b border-white/5 pb-10">
                            <h4 className="text-4xl font-black uppercase text-white tracking-tighter">Editor de Vitrine</h4>
                            <button type="button" onClick={() => setEditingPost(null)} className="p-6 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={32}/></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="TÍTULO DO ANÚNCIO" className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white outline-none font-bold" required />
                                <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="CONTEÚDO..." className="w-full bg-white/5 border border-white/10 p-7 rounded-[35px] text-white h-48 resize-none outline-none" required />
                            </div>
                            <div className="space-y-8">
                                <div className="aspect-video bg-black/40 rounded-[50px] overflow-hidden border border-white/10 relative group">
                                    {editingPost.imageUrl && <img src={editingPost.imageUrl} className="w-full h-full object-cover" />}
                                    <button type="button" onClick={() => document.getElementById('adFile')?.click()} className="absolute inset-0 bg-brand-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center font-black uppercase text-white transition-all backdrop-blur-sm">Mudar Foto</button>
                                    <input id="adFile" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setEditingPost({...editingPost, imageUrl: b}))} />
                                </div>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-24 uppercase font-black text-lg" isLoading={isSaving}>Publicar Agora</Button>
                    </form>
                </div>
            )}

            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-200">
                    <div className="glass-panel p-16 rounded-[80px] w-full max-w-lg border-white/10 shadow-3xl text-center space-y-8">
                        <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${confirmModal.variant === 'danger' ? 'bg-red-600/20 text-red-500' : 'bg-brand-primary/20 text-brand-primary'}`}>
                            {confirmModal.variant === 'danger' ? <AlertTriangle size={48}/> : <HelpCircle size={48}/>}
                        </div>
                        <div>
                            <h3 className="text-3xl font-black uppercase text-white tracking-tighter mb-4">{confirmModal.title}</h3>
                            <p className="text-gray-400 font-medium leading-relaxed">{confirmModal.message}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 h-20 rounded-3xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all">Cancelar</button>
                            <button onClick={confirmModal.onConfirm} className={`flex-1 h-20 rounded-3xl text-[10px] font-black uppercase tracking-widest text-white transition-all ${confirmModal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-primary/80'}`}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[600] px-12 py-8 rounded-[50px] shadow-3xl animate-in slide-in-from-bottom-20 duration-500 border border-white/10 backdrop-blur-3xl ${toast.t === 'success' ? 'bg-brand-primary text-white' : 'bg-red-600 text-white'}`}>
                    <span className="font-black uppercase text-[10px] tracking-[0.2em]">{toast.m}</span>
                </div>
            )}

            <footer className="bg-brand-dark py-32 text-center border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center space-y-12">
                    <div className="flex items-center gap-6 text-white/20">
                      <Radio size={40} />
                      <span className="text-3xl font-black uppercase tracking-tighter">{siteConfig.heroLabel}</span>
                    </div>
                    <div className="flex gap-8">
                         <div className="w-12 h-12 rounded-[22px] bg-white/5 border border-white/10 flex items-center justify-center hover:text-brand-gold transition-all cursor-pointer text-white"><MessageCircle size={20}/></div>
                         <div className="w-12 h-12 rounded-[22px] bg-white/5 border border-white/10 flex items-center justify-center hover:text-brand-gold transition-all cursor-pointer text-white"><TrendingUp size={20}/></div>
                         <div className="w-12 h-12 rounded-[22px] bg-white/5 border border-white/10 flex items-center justify-center hover:text-brand-gold transition-all cursor-pointer text-white"><Award size={20}/></div>
                    </div>
                    <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.8em]">Credibilidade em cada palavra</p>
                    <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-10">© 2025 {siteConfig.heroLabel} - Todos os direitos reservados</p>
                </div>
            </footer>
        </div>
    );
};

export default App;
