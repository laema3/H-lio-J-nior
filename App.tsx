
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
    // Estados principais
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<string>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem(SESSION_KEY);
        return saved ? JSON.parse(saved) : null;
    });

    // Estados de dados
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

    // Estados de UI
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');

    // Estados de Edição
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
            
            if (currentUser) {
                const fresh = u.find((usr: User) => usr.email === currentUser.email);
                if (fresh) {
                    setCurrentUser(fresh);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                }
            }
        } catch (err) {
            console.error("Erro ao carregar dados:", err);
            showToast("Erro ao sincronizar dados", "error");
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { refreshData(); }, []);

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Sessão encerrada");
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
                showToast("Acesso Administrativo Liberado");
            } else {
                showToast("Admin padrão não encontrado localmente.", "error");
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
                                    <div className="glass-panel p-3 rounded-[60px] border-white/10 shadow-3xl rotate-1">
                                        <img src={siteConfig.heroImageUrl} className="w-full aspect-video object-cover rounded-[50px]" alt="Portal" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Vitrine Section */}
                        <section id="ads" className="max-w-7xl mx-auto px-6 py-32 bg-brand-panel/30 rounded-[100px] mb-32 border border-white/5 shadow-2xl">
                            <div className="px-10 mb-20 text-center md:text-left flex flex-col md:flex-row justify-between items-end gap-6">
                                <div>
                                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">Classificados VIP</h2>
                                    <p className="text-gray-500 mt-2 font-bold uppercase text-[10px] tracking-[0.4em]">Anunciantes verificados e exclusivos</p>
                                </div>
                                <div className="flex gap-4">
                                    <select className="bg-brand-dark border border-white/10 p-5 rounded-2xl text-[10px] font-black uppercase text-gray-400 outline-none">
                                        <option>Todos os Ramos</option>
                                        {categories.map(c => <option key={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            {posts.length === 0 ? (
                                <div className="text-center py-20 opacity-20">
                                    <Mic size={80} className="mx-auto mb-6" />
                                    <p className="font-black uppercase tracking-widest text-sm">Nenhum anúncio no ar hoje</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 p-4">
                                    {posts.map(p => <PostCard key={p.id} post={p} />)}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-dark to-brand-panel pt-32">
                        <div className="glass-panel p-16 md:p-24 rounded-[80px] w-full max-w-2xl text-center shadow-3xl">
                            <h2 className="text-5xl font-black text-white uppercase mb-4 tracking-tighter">{currentView === 'LOGIN' ? 'Portal do Assinante' : 'Seja um Parceiro'}</h2>
                            <p className="text-gray-500 mb-12 text-sm uppercase font-bold tracking-widest">Acesso exclusivo para anunciantes VIP</p>
                            
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
                                            showToast(`Olá, ${u.name.split(' ')[0]}!`);
                                            refreshData();
                                        } else showToast("Dados incorretos", "error");
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
                                            showToast("Cadastro realizado!");
                                            refreshData(); 
                                        }
                                    }
                                } finally { setIsLoggingIn(false); }
                            }} className="space-y-6">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="NOME OU NOME DA EMPRESA" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary" />
                                        <input name="phone" required placeholder="WHATSAPP (DDD + NÚMERO)" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <select name="profession" required className="bg-brand-dark border border-white/10 p-8 rounded-[40px] text-white font-black uppercase text-[10px] outline-none">
                                                <option value="">Selecione seu Ramo</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                            <select name="planId" required className="bg-brand-dark border border-white/10 p-8 rounded-[40px] text-white font-black uppercase text-[10px] outline-none">
                                                <option value="">Escolha seu Plano</option>
                                                {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R${p.price}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="SEU MELHOR E-MAIL" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary" />
                                <input name="password" required type="password" placeholder="SUA SENHA" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary" />
                                
                                <Button type="submit" className="w-full h-24 text-lg font-black uppercase rounded-[45px] shadow-2xl" isLoading={isLoggingIn}>
                                    {currentView === 'LOGIN' ? 'Entrar no Painel' : 'Finalizar Cadastro VIP'}
                                </Button>
                                
                                <div className="flex flex-col gap-6 mt-12">
                                    <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-[10px] text-gray-500 font-black uppercase hover:text-white transition-all tracking-widest">
                                        {currentView === 'LOGIN' ? 'Não tem conta? Comece aqui' : 'Já possui cadastro? Clique aqui'}
                                    </button>
                                    
                                    {currentView === 'LOGIN' && (
                                        <div className="pt-8 border-t border-white/5">
                                            <button type="button" onClick={handleQuickAdminLogin} className="group flex items-center gap-3 mx-auto px-6 py-3 bg-white/5 rounded-full hover:bg-brand-primary transition-all">
                                                <Shield className="w-4 h-4 text-brand-primary group-hover:text-white" />
                                                <span className="text-[9px] text-gray-400 group-hover:text-white font-black uppercase tracking-tighter">Acesso Direto Hélio</span>
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
                        {/* Sidebar Admin */}
                        <aside className="w-full md:w-96 border-r border-white/5 p-12 space-y-6">
                            <div className="mb-12">
                                <h3 className="text-xs font-black uppercase text-brand-primary tracking-[0.4em] mb-2">Administração</h3>
                                <p className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Controle Master</p>
                            </div>
                            {[
                                { id: 'INICIO', label: 'Resumo Geral', icon: LayoutDashboard },
                                { id: 'CLIENTES', label: 'Lista Assinantes', icon: Users },
                                { id: 'PLANOS', label: 'Gestão de Planos', icon: CreditCard },
                                { id: 'CATEGORIAS', label: 'Ramos de Atuação', icon: Layers },
                                { id: 'AJUSTES', label: 'Configurações Site', icon: Settings },
                            ].map(item => (
                                <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`w-full flex items-center gap-6 p-8 rounded-[35px] transition-all duration-500 group ${adminSubView === item.id ? 'bg-brand-primary text-white shadow-2xl shadow-brand-primary/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={22} className={adminSubView === item.id ? 'text-white' : 'group-hover:text-brand-primary'} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                        </aside>
                        
                        {/* Conteúdo Admin */}
                        <main className="flex-1 p-12 md:p-24 overflow-y-auto">
                            {adminSubView === 'INICIO' && (
                                <div className="space-y-16 animate-in slide-in-from-right duration-500">
                                    <div className="flex justify-between items-end">
                                        <h2 className="text-5xl font-black uppercase tracking-tighter text-white">Bem-vindo, Hélio</h2>
                                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Acesso de Proprietário</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                        <div className="glass-panel p-12 rounded-[50px] border-white/5 text-center group hover:border-brand-primary/20 transition-all">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Membros Ativos</p>
                                            <h4 className="text-7xl font-black mt-2 tracking-tighter text-brand-primary">{allUsers.length - 1}</h4>
                                        </div>
                                        <div className="glass-panel p-12 rounded-[50px] border-white/5 text-center group hover:border-brand-primary/20 transition-all">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Anúncios no Ar</p>
                                            <h4 className="text-7xl font-black mt-2 tracking-tighter text-brand-gold">{posts.length}</h4>
                                        </div>
                                        <div className="glass-panel p-12 rounded-[50px] border-white/5 text-center group hover:border-brand-primary/20 transition-all">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Receita Estimada</p>
                                            <h4 className="text-7xl font-black mt-2 tracking-tighter text-green-500">R${(allUsers.length * 49).toFixed(0)}</h4>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminSubView === 'CLIENTES' && (
                                <div className="space-y-10 animate-in slide-in-from-right duration-500">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Gestão de Assinantes</h2>
                                    <div className="glass-panel rounded-[50px] overflow-hidden border-white/5 shadow-2xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[10px] font-black uppercase text-gray-500">
                                                <tr><th className="p-10">Dados do Cliente</th><th className="p-10">Pagamento</th><th className="p-10">Ramo</th><th className="p-10">Controle</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {allUsers.filter(u => u.email !== 'admin@helio.com').map(u => (
                                                    <tr key={u.id} className="hover:bg-white/2 transition-colors group">
                                                        <td className="p-10">
                                                            <div className="font-black text-white uppercase text-sm tracking-tighter">{u.name}</div>
                                                            <div className="text-[10px] text-gray-500 lowercase font-medium">{u.email}</div>
                                                        </td>
                                                        <td className="p-10">
                                                            <span className={`px-5 py-2 rounded-full text-[8px] font-black uppercase border tracking-widest ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500 text-green-500 bg-green-500/5' : 'border-red-500 text-red-500 bg-red-500/5 animate-pulse'}`}>
                                                                {u.paymentStatus}
                                                            </span>
                                                        </td>
                                                        <td className="p-10 text-[10px] font-black text-gray-400 uppercase tracking-widest">{u.profession || 'Geral'}</td>
                                                        <td className="p-10">
                                                            <div className="flex gap-3">
                                                                <button onClick={() => {
                                                                    const nextStatus = u.paymentStatus === PaymentStatus.CONFIRMED ? PaymentStatus.AWAITING : PaymentStatus.CONFIRMED;
                                                                    triggerConfirm(nextStatus === PaymentStatus.CONFIRMED ? "Aprovar Acesso" : "Bloquear Acesso", `Alterar status de ${u.name}?`, async () => {
                                                                        await db.updateUser({ ...u, paymentStatus: nextStatus });
                                                                        refreshData();
                                                                    });
                                                                }} className="p-5 bg-white/5 text-gray-400 rounded-2xl hover:bg-brand-primary hover:text-white transition-all shadow-lg">
                                                                    {u.paymentStatus === PaymentStatus.CONFIRMED ? <Lock size={18}/> : <Unlock size={18}/>}
                                                                </button>
                                                                <button onClick={() => triggerConfirm("Remover Membro", `Deseja apagar permanentemente a conta de ${u.name}?`, async () => { await db.deleteUser(u.id); refreshData(); }, 'danger')} className="p-5 bg-white/5 text-gray-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg"><Trash2 size={18}/></button>
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
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Configurações do Site</h2>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        setIsSaving(true);
                                        await db.updateConfig(siteConfig);
                                        showToast("Configurações atualizadas!");
                                        setIsSaving(false);
                                        refreshData();
                                    }} className="glass-panel p-16 rounded-[60px] border-white/10 space-y-10 shadow-3xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Chamada Principal</label>
                                                <input value={siteConfig.heroTitle} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Nome da Marca</label>
                                                <input value={siteConfig.heroLabel} onChange={e => setSiteConfig({...siteConfig, heroLabel: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Subtítulo</label>
                                            <textarea value={siteConfig.heroSubtitle} onChange={e => setSiteConfig({...siteConfig, heroSubtitle: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" rows={3} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">WhatsApp Suporte</label>
                                                <input value={siteConfig.whatsapp} onChange={e => setSiteConfig({...siteConfig, whatsapp: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" placeholder="55..." />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Chave PIX</label>
                                                <input value={siteConfig.pixKey} onChange={e => setSiteConfig({...siteConfig, pixKey: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary" />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-24 text-lg font-black uppercase rounded-[45px] shadow-2xl" isLoading={isSaving}>
                                            <Save size={24}/> Salvar Alterações
                                        </Button>
                                    </form>
                                </div>
                            )}

                            {/* Planos e Categorias Sub-views seriam inseridas aqui para completar o CRUD */}
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
                            <Button className="h-20 px-14 text-lg uppercase font-black" onClick={() => setEditingPost({ title: '', content: '', category: currentUser.profession || 'Geral' })}><PlusCircle size={24}/> Criar Anúncio</Button>
                        </div>

                        {/* IA Studio */}
                        <div className="glass-panel rounded-[80px] p-16 md:p-24 border-brand-primary/20 mb-32 shadow-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-all duration-1000"><Mic size={400} className="text-brand-primary"/></div>
                            <div className="relative z-10 space-y-10">
                                <h2 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-4"><Zap size={32} className="text-brand-gold" /> Estúdio IA Hélio Júnior</h2>
                                <p className="text-gray-400 text-lg max-w-2xl font-light">Não sabe o que escrever? Nossa IA cria roteiros profissionais de rádio para o seu negócio.</p>
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Ex: Promoção de Pizzas por R$ 29,90..." className="flex-1 bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary text-xl" />
                                    <Button className="h-24 px-16 uppercase font-black rounded-[40px] text-lg" onClick={async () => {
                                        if(!magicPrompt) return;
                                        setIsGeneratingAi(true);
                                        try {
                                          const res = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
                                          const data = typeof res === 'object' ? res : { title: 'Destaque VIP', content: res };
                                          setEditingPost({ title: data.title, content: data.content, category: currentUser.profession || 'Geral' });
                                          showToast("Texto gerado pela IA!");
                                        } finally { setIsGeneratingAi(false); }
                                    }} isLoading={isGeneratingAi}>Gerar Script VIP</Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
                            {posts.filter(p => p.authorId === currentUser.id).map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-8 right-8 z-20 flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingPost(p)} className="p-5 bg-brand-primary rounded-[25px] text-white shadow-2xl hover:scale-110 transition-all"><Edit size={20}/></button>
                                        <button onClick={() => triggerConfirm("Excluir Anúncio", "Deseja remover esta publicação permanentemente?", async () => { await db.deletePost(p.id); refreshData(); }, 'danger')} className="p-5 bg-red-600 rounded-[25px] text-white shadow-2xl hover:scale-110 transition-all"><Trash2 size={20}/></button>
                                    </div>
                                    <PostCard post={p} />
                                </div>
                            ))}
                        </div>
                   </div>
                )}
            </main>

            {/* Modais Globais */}
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
                            showToast("Anúncio Salvo!");
                        } finally { setIsSaving(false); }
                    }} className="glass-panel p-16 rounded-[60px] w-full max-w-3xl space-y-12 border-white/10 text-center shadow-3xl">
                        <h3 className="text-4xl font-black uppercase text-white tracking-tighter">Editor de Publicação</h3>
                        <div className="space-y-6 text-left">
                            <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="TÍTULO DO ANÚNCIO" className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary text-xl font-bold" required />
                            <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="CONTEÚDO / SCRIPT DO ANÚNCIO" rows={4} className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none focus:border-brand-primary text-lg" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <select value={editingPost.category} onChange={e => setEditingPost({...editingPost, category: e.target.value})} className="bg-brand-dark border border-white/10 p-8 rounded-[40px] text-white uppercase font-black text-[10px] outline-none">
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <button type="button" onClick={() => document.getElementById('postImgUpload')?.click()} className="p-8 bg-white/5 border-2 border-dashed border-white/10 rounded-[40px] text-white font-black text-[10px] uppercase hover:bg-white/10 flex items-center justify-center gap-3">
                                    <ImageIcon size={18}/> {editingPost.imageUrl ? 'Trocar Imagem' : 'Add Foto'}
                                </button>
                                <input id="postImgUpload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setEditingPost({...editingPost, imageUrl: b}))} />
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <Button type="submit" className="flex-1 h-20 uppercase font-black text-lg" isLoading={isSaving}>Publicar Agora</Button>
                            <button type="button" onClick={() => setEditingPost(null)} className="flex-1 text-[11px] font-black uppercase text-gray-500 hover:text-white transition-all">Cancelar</button>
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
                            <Button onClick={confirmModal.onConfirm} variant={confirmModal.variant === 'danger' ? 'danger' : 'primary'} className="flex-1 h-20 text-sm uppercase font-black">Confirmar</Button>
                            <button onClick={() => setConfirmModal(prev => ({...prev, isOpen: false}))} className="flex-1 text-[11px] font-black uppercase text-gray-500 hover:text-white transition-all">Sair</button>
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
