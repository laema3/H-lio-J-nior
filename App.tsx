
import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Trash2, Edit, Users, Check, X, AlertTriangle, Settings, CreditCard, Layers, PlusCircle, Save, Radio, Mic, Star, Lock, Unlock, Phone, Image as ImageIcon, Zap, LayoutDashboard, Shield
} from 'lucide-react';

const SESSION_KEY = 'helio_junior_vip_session';

const App: React.FC = () => {
    // Estados principais de navegação
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<string>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem(SESSION_KEY);
        return saved ? JSON.parse(saved) : null;
    });

    // Estados de dados sincronizados com DB
    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({
        heroLabel: 'Hélio Júnior',
        heroTitle: 'Portal VIP',
        heroSubtitle: 'O maior portal de classificados com locução inteligente.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920',
        pixKey: '',
        pixName: '',
        whatsapp: ''
    });

    // Estados de UI e Feedback
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');

    // Estados para modais de edição
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

    const showToast = useCallback((m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 3000);
    }, []);

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

    // Função centralizada para carregar dados
    const refreshData = async () => {
        setIsLoadingData(true);
        try {
            await db.init(); 
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
            
            // Sincroniza usuário logado (ex: aprovação de pagamento)
            if (currentUser) {
                const fresh = u.find((usr: User) => usr.email === currentUser.email);
                if (fresh) {
                    setCurrentUser(fresh);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                }
            }
        } catch (err) {
            console.error("Falha ao sincronizar:", err);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { refreshData(); }, []);

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Você saiu da área VIP");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => callback(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleQuickAdminLogin = async () => {
        setIsLoggingIn(true);
        try {
            const u = await db.authenticate('admin@helio.com', 'admin');
            if (u) {
                setCurrentUser(u);
                localStorage.setItem(SESSION_KEY, JSON.stringify(u));
                setCurrentView('ADMIN');
                showToast("Olá Hélio, Painel VIP aberto!");
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={!isLoadingData} />
            
            <main className="flex-1">
                {currentView === 'HOME' && (
                    <div className="animate-in fade-in duration-700">
                        {/* Hero Section */}
                        <section className="relative pt-48 pb-32">
                            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                <div className="space-y-8 text-center lg:text-left">
                                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">
                                        <Radio size={14} className="animate-pulse" /> {siteConfig.heroLabel} Radialista
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                                        {siteConfig.heroTitle} na <span className="text-transparent bg-clip-text gold-gradient">Voz VIP</span>
                                    </h1>
                                    <p className="text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                                        {siteConfig.heroSubtitle}
                                    </p>
                                    <div className="flex flex-wrap gap-6 pt-4 justify-center lg:justify-start">
                                        <button onClick={() => setCurrentView('REGISTER')} className="h-20 px-12 gold-gradient text-brand-dark rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-105 transition-all">Quero Assinar</button>
                                        <button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})} className="h-20 px-12 bg-white/5 border border-white/10 text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all">Ver Parceiros</button>
                                    </div>
                                </div>
                                <div className="relative animate-float">
                                    <div className="glass-panel p-3 rounded-[60px] border-white/10 shadow-3xl rotate-1 overflow-hidden">
                                        <img src={siteConfig.heroImageUrl} className="w-full aspect-video object-cover rounded-[50px]" alt="Hero" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Vitrine de Anúncios */}
                        <section id="ads" className="max-w-7xl mx-auto px-6 py-32 bg-brand-panel/30 rounded-[100px] mb-32 border border-white/5 shadow-2xl">
                            <div className="px-10 mb-20 text-center md:text-left">
                                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">Classificados VIP</h2>
                                <p className="text-gray-500 mt-2 font-bold uppercase text-[10px] tracking-[0.4em]">Anunciantes verificados</p>
                            </div>
                            
                            {posts.length === 0 ? (
                                <div className="text-center py-20 opacity-30 italic">Nenhum anúncio disponível no momento.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                    {posts.map(p => <PostCard key={p.id} post={p} />)}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-dark to-brand-panel pt-32">
                        <div className="glass-panel p-16 md:p-24 rounded-[80px] w-full max-w-2xl text-center shadow-3xl">
                            <h2 className="text-5xl font-black text-white uppercase mb-8 tracking-tighter">{currentView === 'LOGIN' ? 'Acesso VIP' : 'Nova Assinatura'}</h2>
                            
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
                                            showToast(`Bem-vindo, ${u.name}`);
                                            refreshData();
                                        } else showToast("E-mail ou senha incorretos", "error");
                                    } else {
                                        const newUser = { 
                                            name: fd.get('name') as string, email: fd.get('email') as string, password: fd.get('password') as string, 
                                            phone: fd.get('phone') as string, profession: fd.get('profession') as string, 
                                            role: UserRole.ADVERTISER, paymentStatus: PaymentStatus.AWAITING,
                                            planId: fd.get('planId') as string || 'p1'
                                        };
                                        const saved = await db.addUser(newUser);
                                        if (saved) { 
                                            setCurrentUser(saved); 
                                            localStorage.setItem(SESSION_KEY, JSON.stringify(saved)); 
                                            setCurrentView('DASHBOARD'); 
                                            showToast("Cadastro concluído!");
                                            refreshData(); 
                                        }
                                    }
                                } finally { setIsLoggingIn(false); }
                            }} className="space-y-6">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="NOME/EMPRESA" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary" />
                                        <input name="phone" required placeholder="WHATSAPP" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <select name="profession" required className="bg-brand-dark border border-white/10 p-8 rounded-[40px] text-white font-black uppercase text-[10px] outline-none">
                                                <option value="">Ramo de Atuação</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                            <select name="planId" required className="bg-brand-dark border border-white/10 p-8 rounded-[40px] text-white font-black uppercase text-[10px] outline-none">
                                                <option value="">Plano de Assinatura</option>
                                                {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R${p.price}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="E-MAIL" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary" />
                                <input name="password" required type="password" placeholder="SENHA" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary" />
                                
                                <Button type="submit" className="w-full h-24 text-lg font-black uppercase rounded-[45px] shadow-2xl" isLoading={isLoggingIn}>
                                    {currentView === 'LOGIN' ? 'Entrar Agora' : 'Finalizar Cadastro'}
                                </Button>
                                
                                <div className="flex flex-col gap-8 mt-12">
                                    <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-[10px] text-gray-500 font-black uppercase hover:text-white transition-all tracking-widest">
                                        {currentView === 'LOGIN' ? 'Não tem conta? Clique aqui' : 'Já sou Assinante'}
                                    </button>
                                    
                                    {currentView === 'LOGIN' && (
                                        <div className="pt-8 border-t border-white/5">
                                            <button type="button" onClick={handleQuickAdminLogin} className="flex items-center gap-3 mx-auto px-6 py-3 bg-white/5 rounded-full hover:bg-brand-primary transition-all group">
                                                <Shield className="w-4 h-4 text-brand-primary group-hover:text-white" />
                                                <span className="text-[9px] text-gray-400 group-hover:text-white font-black uppercase">Sou o Hélio Júnior</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && (
                    <div className="flex flex-col md:flex-row min-h-screen pt-32 bg-brand-dark">
                        <aside className="w-full md:w-96 border-r border-white/5 p-12 space-y-6">
                            <h3 className="text-[10px] font-black uppercase text-brand-primary tracking-[0.4em] mb-12">Gestão Master</h3>
                            {[
                                { id: 'INICIO', label: 'Resumo Geral', icon: LayoutDashboard },
                                { id: 'CLIENTES', label: 'Assinantes', icon: Users },
                                { id: 'PLANOS', label: 'Planos VIP', icon: CreditCard },
                                { id: 'CATEGORIAS', label: 'Categorias', icon: Layers },
                                { id: 'AJUSTES', label: 'Identidade Site', icon: Settings },
                            ].map(item => (
                                <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`w-full flex items-center gap-6 p-8 rounded-[35px] transition-all duration-300 ${adminSubView === item.id ? 'bg-brand-primary text-white shadow-2xl' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={20} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                        </aside>
                        
                        <main className="flex-1 p-12 md:p-24 overflow-y-auto">
                            {adminSubView === 'INICIO' && (
                                <div className="space-y-16 animate-in slide-in-from-right duration-500">
                                    <h2 className="text-5xl font-black uppercase tracking-tighter text-white">Olá, Hélio Júnior</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                        <div className="glass-panel p-12 rounded-[50px] border-white/5 text-center">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Total Clientes</p>
                                            <h4 className="text-7xl font-black mt-2 text-brand-primary">{allUsers.length - 1}</h4>
                                        </div>
                                        <div className="glass-panel p-12 rounded-[50px] border-white/5 text-center">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Anúncios no Ar</p>
                                            <h4 className="text-7xl font-black mt-2 text-brand-gold">{posts.length}</h4>
                                        </div>
                                        <div className="glass-panel p-12 rounded-[50px] border-white/5 text-center">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Planos Ativos</p>
                                            <h4 className="text-7xl font-black mt-2 text-green-500">{plans.length}</h4>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CLIENTES' && (
                                <div className="space-y-10 animate-in slide-in-from-right duration-500">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Controle de Assinantes</h2>
                                    <div className="glass-panel rounded-[50px] overflow-hidden border-white/5">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[10px] font-black uppercase text-gray-500">
                                                <tr><th className="p-10">Cliente</th><th className="p-10">Status</th><th className="p-10">Ações</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {allUsers.filter(u => u.id !== 'admin' && u.email !== 'admin@helio.com').map(u => (
                                                    <tr key={u.id} className="hover:bg-white/2 transition-colors">
                                                        <td className="p-10">
                                                            <div className="font-black text-white uppercase">{u.name}</div>
                                                            <div className="text-[10px] text-gray-500 lowercase">{u.email}</div>
                                                        </td>
                                                        <td className="p-10">
                                                            <span className={`px-5 py-2 rounded-full text-[8px] font-black uppercase border ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500 text-green-500 bg-green-500/5' : 'border-red-500 text-red-500 animate-pulse'}`}>
                                                                {u.paymentStatus}
                                                            </span>
                                                        </td>
                                                        <td className="p-10">
                                                            <div className="flex gap-4">
                                                                <button onClick={() => {
                                                                    const nextS = u.paymentStatus === PaymentStatus.CONFIRMED ? PaymentStatus.AWAITING : PaymentStatus.CONFIRMED;
                                                                    triggerConfirm("Alterar Status", `Deseja mudar o status de ${u.name}?`, async () => {
                                                                        await db.updateUser({...u, paymentStatus: nextS});
                                                                        refreshData();
                                                                    });
                                                                }} className="p-4 bg-white/5 text-gray-400 rounded-2xl hover:bg-brand-primary hover:text-white transition-all">
                                                                    {u.paymentStatus === PaymentStatus.CONFIRMED ? <Lock size={18}/> : <Unlock size={18}/>}
                                                                </button>
                                                                <button onClick={() => triggerConfirm("Remover", "Deseja apagar a conta?", async () => { await db.deleteUser(u.id); refreshData(); }, 'danger')} className="p-4 bg-white/5 text-gray-400 rounded-2xl hover:bg-red-600 transition-all"><Trash2 size={18}/></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'AJUSTES' && (
                                <div className="space-y-12 max-w-5xl animate-in slide-in-from-right duration-500">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Personalização do Site</h2>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        setIsSaving(true);
                                        await db.updateConfig(siteConfig);
                                        showToast("Site atualizado!");
                                        setIsSaving(false);
                                        refreshData();
                                    }} className="glass-panel p-16 rounded-[60px] border-white/10 space-y-10 shadow-3xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Chamada Principal</label>
                                                <input value={siteConfig.heroTitle} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary font-bold" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Nome da Marca</label>
                                                <input value={siteConfig.heroLabel} onChange={e => setSiteConfig({...siteConfig, heroLabel: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary font-bold" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Descrição do Portal</label>
                                            <textarea value={siteConfig.heroSubtitle} onChange={e => setSiteConfig({...siteConfig, heroSubtitle: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" rows={3} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">WhatsApp Vendas</label>
                                                <input value={siteConfig.whatsapp} onChange={e => setSiteConfig({...siteConfig, whatsapp: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" placeholder="55..." />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Chave PIX Recebimento</label>
                                                <input value={siteConfig.pixKey} onChange={e => setSiteConfig({...siteConfig, pixKey: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Foto de Fundo (Hero)</label>
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <input value={siteConfig.heroImageUrl} onChange={e => setSiteConfig({...siteConfig, heroImageUrl: e.target.value})} className="flex-1 bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" placeholder="URL da imagem" />
                                                <button type="button" onClick={() => document.getElementById('heroImgAdmin')?.click()} className="p-8 bg-brand-primary rounded-[35px] text-white hover:scale-105 transition-all shadow-xl"><ImageIcon size={20}/></button>
                                                <input id="heroImgAdmin" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setSiteConfig({...siteConfig, heroImageUrl: b}))} />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-24 text-lg font-black uppercase rounded-[45px] shadow-2xl" isLoading={isSaving}>
                                            <Save size={24}/> Aplicar Alterações
                                        </Button>
                                    </form>
                                </div>
                            )}

                            {/* Gestão de Planos e Categorias (CRUD Básico) */}
                            {(adminSubView === 'PLANOS' || adminSubView === 'CATEGORIAS') && (
                                <div className="space-y-12 animate-in slide-in-from-right duration-500">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-4xl font-black uppercase tracking-tighter text-white">{adminSubView === 'PLANOS' ? 'Gestão de Planos' : 'Ramos de Atuação'}</h2>
                                        <Button onClick={() => adminSubView === 'PLANOS' ? setEditingPlan({name:'', price:0, durationDays:30}) : setEditingCategory({name:''})} className="h-14 px-8 rounded-full"><PlusCircle size={20}/> Novo Item</Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {adminSubView === 'PLANOS' ? plans.map(p => (
                                            <div key={p.id} className="glass-panel p-10 rounded-[40px] border-white/5 relative group">
                                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => setEditingPlan(p)} className="p-3 bg-brand-primary rounded-xl"><Edit size={16}/></button>
                                                    <button onClick={() => triggerConfirm("Remover Plano", "Confirmar exclusão?", async () => { await db.deletePlan(p.id); refreshData(); }, 'danger')} className="p-3 bg-red-600 rounded-xl"><Trash2 size={16}/></button>
                                                </div>
                                                <h3 className="text-2xl font-black text-white uppercase mb-2">{p.name}</h3>
                                                <p className="text-3xl font-black text-brand-gold tracking-tighter">R${p.price}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-black mt-4">{p.durationDays} dias de duração</p>
                                            </div>
                                        )) : categories.map(c => (
                                            <div key={c.id} className="glass-panel p-8 rounded-[30px] border-white/5 relative group flex justify-between items-center">
                                                <span className="text-sm font-black text-white uppercase tracking-widest">{c.name}</span>
                                                <button onClick={() => triggerConfirm("Remover Categoria", "Deseja excluir?", async () => { await db.deleteCategory(c.id); refreshData(); }, 'danger')} className="p-3 bg-red-600/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>
                )}

                {currentView === 'DASHBOARD' && currentUser && (
                   <div className="pt-48 pb-56 max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-24 border-b border-white/5 pb-20">
                            <div className="flex items-center gap-10">
                                <div className="w-32 h-32 bg-gradient-to-br from-brand-primary to-purple-800 rounded-[45px] flex items-center justify-center text-white font-black text-5xl shadow-2xl">{currentUser.name[0]}</div>
                                <div className="space-y-2">
                                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{currentUser.name}</h2>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[10px] font-black uppercase px-6 py-2 rounded-full shadow-lg ${currentUser.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-600 text-white' : 'bg-red-600 text-white animate-pulse'}`}>{currentUser.paymentStatus}</span>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{currentUser.profession}</span>
                                    </div>
                                </div>
                            </div>
                            <Button className="h-20 px-14 text-lg uppercase font-black rounded-[40px] shadow-2xl" onClick={() => setEditingPost({ title: '', content: '', category: currentUser.profession || 'Geral' })}>
                                <PlusCircle size={28}/> Criar Anúncio
                            </Button>
                        </div>

                        <div className="glass-panel rounded-[80px] p-16 md:p-24 border-brand-primary/20 mb-32 shadow-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-all duration-1000"><Mic size={400} className="text-brand-primary"/></div>
                            <div className="relative z-10 space-y-10">
                                <h2 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-4"><Zap size={32} className="text-brand-gold" /> Estúdio IA Hélio Júnior</h2>
                                <p className="text-gray-400 text-lg max-w-2xl font-light">Digite o que deseja vender e a IA criará o roteiro perfeito para você publicar no portal.</p>
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Ex: Promoção de Bolos para o Dia das Mães..." className="flex-1 bg-white/5 border border-white/10 p-10 rounded-[45px] text-white outline-none focus:border-brand-primary text-xl" />
                                    <Button className="h-24 px-16 uppercase font-black rounded-[45px] text-lg shadow-2xl" onClick={async () => {
                                        if(!magicPrompt) return;
                                        setIsGeneratingAi(true);
                                        try {
                                          const res = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
                                          const data = typeof res === 'object' ? res : { title: 'Oferta Especial', content: res };
                                          setEditingPost({ title: data.title, content: data.content, category: currentUser.profession || 'Geral' });
                                          showToast("IA gerou seu conteúdo VIP!");
                                        } finally { setIsGeneratingAi(false); }
                                    }} isLoading={isGeneratingAi}>Gerar Script VIP</Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
                            {posts.filter(p => p.authorId === currentUser.id).map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-8 right-8 z-20 flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingPost(p)} className="p-5 bg-brand-primary rounded-[25px] text-white shadow-2xl hover:scale-110 active:scale-90 transition-all"><Edit size={20}/></button>
                                        <button onClick={() => triggerConfirm("Excluir Anúncio", "Remover este anúncio do portal?", async () => { await db.deletePost(p.id); refreshData(); }, 'danger')} className="p-5 bg-red-600 rounded-[25px] text-white shadow-2xl hover:scale-110 active:scale-90 transition-all"><Trash2 size={20}/></button>
                                    </div>
                                    <PostCard post={p} />
                                </div>
                            ))}
                        </div>
                   </div>
                )}
            </main>

            {/* Modais Globais de Edição */}
            {editingPost && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl animate-in zoom-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        try {
                            await db.savePost({
                                ...editingPost,
                                authorId: currentUser?.id,
                                authorName: currentUser?.name,
                                whatsapp: currentUser?.phone,
                                phone: currentUser?.phone
                            });
                            refreshData();
                            setEditingPost(null);
                            showToast("Anúncio salvo com sucesso!");
                        } finally { setIsSaving(false); }
                    }} className="glass-panel p-16 rounded-[60px] w-full max-w-4xl space-y-12 border-white/10 text-center shadow-3xl">
                        <h3 className="text-4xl font-black uppercase text-white tracking-tighter">Editor de Vitrine</h3>
                        <div className="space-y-6 text-left">
                            <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="TÍTULO DO ANÚNCIO" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary text-xl font-bold" required />
                            <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="CONTEÚDO DO ANÚNCIO (Roteiro da Locução)" rows={4} className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary text-lg font-medium" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <select value={editingPost.category} onChange={e => setEditingPost({...editingPost, category: e.target.value})} className="bg-brand-dark border border-white/10 p-8 rounded-[40px] text-white uppercase font-black text-xs outline-none">
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <button type="button" onClick={() => document.getElementById('adPhotoUpload')?.click()} className="p-8 bg-white/5 border-2 border-dashed border-white/10 rounded-[40px] text-white font-black text-[10px] uppercase hover:bg-white/10 flex items-center justify-center gap-3">
                                    <ImageIcon size={18}/> {editingPost.imageUrl ? 'Trocar Foto' : 'Adicionar Foto'}
                                </button>
                                <input id="adPhotoUpload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setEditingPost({...editingPost, imageUrl: b}))} />
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <Button type="submit" className="flex-1 h-20 uppercase font-black text-lg rounded-[40px]" isLoading={isSaving}>Publicar Agora</Button>
                            <button type="button" onClick={() => setEditingPost(null)} className="flex-1 text-[11px] font-black uppercase text-gray-500 hover:text-white transition-all">Cancelar Edição</button>
                        </div>
                    </form>
                </div>
            )}

            {editingPlan && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl animate-in zoom-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        await db.savePlan(editingPlan);
                        refreshData();
                        setEditingPlan(null);
                        setIsSaving(false);
                    }} className="glass-panel p-16 rounded-[60px] w-full max-w-xl space-y-10 text-center">
                        <h3 className="text-3xl font-black uppercase text-white">Configurar Plano</h3>
                        <div className="space-y-6">
                            <input value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} placeholder="NOME DO PLANO" className="w-full bg-brand-dark p-8 rounded-[35px] text-white outline-none" required />
                            <div className="grid grid-cols-2 gap-6">
                                <input type="number" step="0.01" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} placeholder="PREÇO" className="w-full bg-brand-dark p-8 rounded-[35px] text-white outline-none" required />
                                <input type="number" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: Number(e.target.value)})} placeholder="DIAS" className="w-full bg-brand-dark p-8 rounded-[35px] text-white outline-none" required />
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <Button type="submit" className="flex-1 h-16 rounded-full" isLoading={isSaving}>Salvar Plano</Button>
                            <button type="button" onClick={() => setEditingPlan(null)} className="flex-1 text-xs uppercase font-black text-gray-500">Voltar</button>
                        </div>
                    </form>
                </div>
            )}

            {editingCategory && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl animate-in zoom-in duration-300">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        await db.saveCategory(editingCategory);
                        refreshData();
                        setEditingCategory(null);
                        setIsSaving(false);
                    }} className="glass-panel p-12 rounded-[50px] w-full max-w-md space-y-8 text-center">
                        <h3 className="text-2xl font-black uppercase text-white">Nova Categoria</h3>
                        <input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="NOME DO RAMO" className="w-full bg-brand-dark p-8 rounded-[35px] text-white outline-none" required />
                        <div className="flex gap-6">
                            <Button type="submit" className="flex-1 h-14 rounded-full" isLoading={isSaving}>Criar</Button>
                            <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 text-xs uppercase font-black text-gray-500">Sair</button>
                        </div>
                    </form>
                </div>
            )}

            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[500] bg-brand-dark/98 flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-300">
                    <div className="glass-panel p-16 md:p-24 rounded-[80px] max-w-2xl w-full text-center space-y-10 border-white/10 shadow-3xl">
                        <div className={`mx-auto w-32 h-32 rounded-[45px] flex items-center justify-center shadow-2xl ${confirmModal.variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-brand-primary/10 text-brand-primary'}`}>
                            <AlertTriangle size={60} />
                        </div>
                        <h3 className="text-4xl font-black uppercase text-white tracking-tighter">{confirmModal.title}</h3>
                        <p className="text-gray-400 text-lg font-medium">{confirmModal.message}</p>
                        <div className="flex gap-6 pt-6">
                            <Button onClick={confirmModal.onConfirm} variant={confirmModal.variant === 'danger' ? 'danger' : 'primary'} className="flex-1 h-20 text-sm uppercase font-black rounded-[35px] shadow-2xl">Confirmar</Button>
                            <button onClick={() => setConfirmModal(prev => ({...prev, isOpen: false}))} className="flex-1 text-[11px] font-black uppercase text-gray-500 hover:text-white transition-all">Voltar</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[1000] px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-3xl animate-in slide-in-from-bottom duration-500 flex items-center gap-4 ${toast.t === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.t === 'success' ? <Check size={18}/> : <X size={18}/>}
                    {toast.m}
                </div>
            )}
        </div>
    );
};

export default App;
