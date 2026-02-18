
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Trash2, Edit, MessageCircle, Users, Check, Zap, Image as ImageIcon, X, AlertTriangle, ShieldCheck, Upload, LogOut, Settings, CreditCard, Layers, PlusCircle, Save, Camera, Radio
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
        heroTitle: 'Portal VIP de Classificados',
        heroSubtitle: 'Conectando você aos melhores negócios.',
        heroImageUrl: 'https://images.unsplash.com/photo-1478737270239-2fccd27ee10f?auto=format&fit=crop&q=80&w=1920',
        pixKey: '',
        pixName: '',
        whatsapp: ''
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);

    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
    
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            console.error("Erro fatal de sincronização:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { refreshData(); }, []);

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Sessão finalizada com segurança.");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1.5 * 1024 * 1024) {
                showToast("Arquivo muito grande (Máx 1.5MB)", "error");
                return;
            }
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
            showToast("Anúncio persistido com sucesso!");
        } catch (err) {
            showToast("Erro ao salvar anúncio.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan) return;
        setIsSaving(true);
        try {
            const planData = { ...editingPlan, id: editingPlan.id || 'pl-' + Date.now() } as Plan;
            await db.savePlan(planData);
            await refreshData();
            setEditingPlan(null);
            showToast("Plano VIP atualizado!");
        } catch (err) {
            showToast("Erro ao gravar plano.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        setIsSaving(true);
        try {
            const catData = { ...editingCategory, id: editingCategory.id || 'cat-' + Date.now() } as Category;
            await db.saveCategory(catData);
            await refreshData();
            setEditingCategory(null);
            showToast("Segmento salvo!");
        } catch (err) {
            showToast("Erro ao salvar categoria.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateSiteConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await db.updateConfig(siteConfig);
            await refreshData();
            showToast("Portal VIP reconfigurado!");
        } catch (err) {
            showToast("Falha na atualização global.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const renderAdminContent = () => {
        switch (adminSubView) {
            case 'PLANOS':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black uppercase flex items-center gap-4 tracking-tighter"><CreditCard className="text-brand-accent"/> Gestão Comercial</h2>
                            <Button onClick={() => setEditingPlan({ name: '', price: 0, durationDays: 30, description: '' })}><PlusCircle size={20}/> Novo Plano</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {plans.map(pl => (
                                <div key={pl.id} className="glass-panel p-10 rounded-[50px] border-white/5 relative group hover:border-brand-primary/40 transition-all shadow-2xl">
                                    <h4 className="text-2xl font-black text-white uppercase mb-1">{pl.name}</h4>
                                    <p className="text-5xl font-black text-brand-primary my-4">R$ {Number(pl.price).toFixed(2)}</p>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-10">{pl.durationDays} dias de exibição</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setEditingPlan(pl)} className="p-5 bg-white/5 rounded-[20px] text-gray-400 hover:text-white transition-all"><Edit size={20}/></button>
                                        <button onClick={async () => { if(confirm("Apagar permanentemente este plano?")) { await db.deletePlan(pl.id); refreshData(); } }} className="p-5 bg-red-600/10 rounded-[20px] text-red-500 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'CATEGORIAS':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black uppercase flex items-center gap-4 tracking-tighter"><Layers className="text-brand-secondary"/> Segmentos de Mercado</h2>
                            <Button onClick={() => setEditingCategory({ name: '' })}><PlusCircle size={20}/> Adicionar Ramo</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {categories.map(cat => (
                                <div key={cat.id} className="glass-panel p-8 rounded-[30px] flex justify-between items-center border-white/5 hover:bg-white/5 transition-all shadow-xl">
                                    <span className="font-black text-white uppercase text-xs tracking-widest">{cat.name}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingCategory(cat)} className="p-3 text-gray-500 hover:text-white transition-all"><Edit size={18}/></button>
                                        <button onClick={async () => { if(confirm("Excluir categoria?")) { await db.deleteCategory(cat.id); refreshData(); } }} className="p-3 text-red-500 hover:text-red-400 transition-all"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'AJUSTES':
                return (
                    <div className="max-w-4xl space-y-12 pb-20 animate-in fade-in duration-500">
                        <h2 className="text-3xl font-black uppercase flex items-center gap-4 tracking-tighter"><Settings className="text-brand-accent"/> Personalização do Portal</h2>
                        <form onSubmit={handleUpdateSiteConfig} className="glass-panel p-12 rounded-[60px] space-y-10 border-white/5 shadow-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-brand-primary uppercase tracking-widest">Nome da Marca</label>
                                    <input value={siteConfig.heroLabel} onChange={e => setSiteConfig({...siteConfig, heroLabel: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-white outline-none focus:border-brand-primary shadow-inner" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-brand-primary uppercase tracking-widest">WhatsApp Suporte</label>
                                    <input value={siteConfig.whatsapp || ''} onChange={e => setSiteConfig({...siteConfig, whatsapp: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-white outline-none focus:border-brand-primary shadow-inner" />
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-xs font-black text-brand-primary uppercase tracking-widest">Frase de Impacto (Banner)</label>
                                    <input value={siteConfig.heroTitle} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-white outline-none focus:border-brand-primary shadow-inner" />
                                </div>
                                <div className="md:col-span-2 space-y-6">
                                    <label className="text-xs font-black text-brand-primary uppercase tracking-widest block">Imagem Principal do Portal</label>
                                    <div className="flex flex-col sm:flex-row gap-8 items-center">
                                        <div className="w-60 h-36 bg-black/40 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group">
                                            <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <Camera size={32} className="text-white"/>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                          <Button type="button" variant="outline" className="w-full sm:w-auto h-14" onClick={() => fileInputRef.current?.click()}><Upload size={20}/> Carregar Nova Foto</Button>
                                          <p className="text-[10px] text-gray-500 font-bold uppercase">Recomendado: 1920x1080px (Máx 1.5MB)</p>
                                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => setSiteConfig({...siteConfig, heroImageUrl: base64}))} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-20 font-black uppercase tracking-[0.3em] text-lg shadow-2xl shadow-brand-primary/30" isLoading={isSaving}><Save size={24}/> Aplicar Todas as Mudanças</Button>
                        </form>
                    </div>
                );
            case 'CLIENTES':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <h2 className="text-3xl font-black uppercase flex items-center gap-4 tracking-tighter"><Users className="text-brand-primary"/> Gestão de Assinantes</h2>
                        <div className="grid grid-cols-1 gap-6">
                            {allUsers.map(u => (
                                <div key={u.id} className="glass-panel p-8 rounded-[40px] flex items-center justify-between border-white/5 shadow-xl hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center font-black text-2xl shadow-lg ${u.role === UserRole.ADMIN ? 'bg-brand-accent text-brand-dark' : 'bg-brand-primary text-white'}`}>{u.name[0]}</div>
                                        <div>
                                            <p className="font-black text-xl text-white uppercase tracking-tighter">{u.name} {u.role === UserRole.ADMIN && <span className="text-[9px] bg-brand-accent text-brand-dark px-3 py-1 rounded-full ml-2 font-black">GESTOR</span>}</p>
                                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mt-2 inline-block ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{u.paymentStatus}</span>
                                        </div>
                                    </div>
                                    {u.role !== UserRole.ADMIN && (
                                        <div className="flex gap-3">
                                            <button onClick={async () => {
                                                const nextStatus = u.paymentStatus === PaymentStatus.CONFIRMED ? PaymentStatus.AWAITING : PaymentStatus.CONFIRMED;
                                                await db.updateUser({...u, paymentStatus: nextStatus});
                                                await refreshData();
                                                showToast(`Status atualizado para ${u.name}`);
                                            }} className={`p-5 rounded-[22px] transition-all shadow-xl ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-500'}`} title="Validar Assinatura">
                                                <ShieldCheck size={24}/>
                                            </button>
                                            <button onClick={async () => { if(confirm(`Remover permanentemente ${u.name}? Esta ação não pode ser desfeita.`)) { await db.deleteUser(u.id); refreshData(); } }} className="p-5 bg-red-600/10 rounded-[22px] text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-xl">
                                                <Trash2 size={24}/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'INICIO':
            default:
                return (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="glass-panel p-12 rounded-[60px] text-center border-b-8 border-brand-primary shadow-3xl">
                                <Users size={40} className="text-brand-primary mx-auto mb-6"/><p className="text-6xl font-black text-white">{allUsers.length}</p><span className="text-[12px] font-black uppercase text-gray-500 tracking-widest">Parceiros VIP</span>
                            </div>
                            <div className="glass-panel p-12 rounded-[60px] text-center border-b-8 border-brand-secondary shadow-3xl">
                                <MessageCircle size={40} className="text-brand-secondary mx-auto mb-6"/><p className="text-6xl font-black text-white">{posts.length}</p><span className="text-[12px] font-black uppercase text-gray-500 tracking-widest">Anúncios no Ar</span>
                            </div>
                            <div className="glass-panel p-12 rounded-[60px] text-center border-b-8 border-brand-accent shadow-3xl">
                                <CreditCard size={40} className="text-brand-accent mx-auto mb-6"/><p className="text-6xl font-black text-white">{plans.length}</p><span className="text-[12px] font-black uppercase text-gray-500 tracking-widest">Opções VIP</span>
                            </div>
                        </div>
                        <div className="glass-panel p-12 rounded-[60px] border-white/5 shadow-2xl">
                            <h3 className="text-2xl font-black uppercase mb-10 flex items-center gap-4 tracking-tighter"><Zap size={28} className="text-brand-accent"/> Operações Rápidas</h3>
                            <div className="flex flex-wrap gap-6">
                                <Button variant="outline" className="h-16 px-10" onClick={() => setAdminSubView('AJUSTES')}><Settings size={20}/> Layout do Portal</Button>
                                <Button variant="outline" className="h-16 px-10" onClick={() => setAdminSubView('CLIENTES')}><Users size={20}/> Gerir Inscritos</Button>
                                <Button variant="outline" className="h-16 px-10" onClick={() => setAdminSubView('PLANOS')}><CreditCard size={20}/> Tabela de Preços</Button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans selection:bg-brand-primary selection:text-white">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={!isLoadingData} />
            
            <main className="flex-1">
                {currentView === 'HOME' && (
                    <div className="animate-in fade-in duration-1000">
                        {/* SEÇÃO HERO */}
                        <section className="pt-56 pb-40 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            <div className="space-y-10 text-center lg:text-left">
                                <div className="inline-block px-6 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[11px] font-black text-brand-primary uppercase tracking-[0.4em] shadow-xl">Portal VIP Helio Junior</div>
                                <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.95] drop-shadow-2xl">{siteConfig.heroTitle}</h1>
                                <p className="text-xl text-gray-400 italic max-w-lg mx-auto lg:mx-0 opacity-80 leading-relaxed">"{siteConfig.heroSubtitle}"</p>
                                <div className="flex flex-wrap gap-6 pt-6 justify-center lg:justify-start">
                                    <Button className="h-18 px-12 text-lg uppercase" onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})}>Ver Classificados</Button>
                                    <Button variant="outline" className="h-18 px-12 text-lg uppercase" onClick={() => setCurrentView('REGISTER')}>Quero ser Parceiro</Button>
                                </div>
                            </div>
                            <div className="glass-panel p-4 rounded-[60px] overflow-hidden shadow-3xl border-white/5 transform hover:scale-[1.02] transition-all duration-1000 rotate-1 hover:rotate-0">
                                <img src={siteConfig.heroImageUrl} className="w-full aspect-video object-cover rounded-[50px] shadow-2xl" alt="Destaque Helio Junior" />
                            </div>
                        </section>

                        {/* SEÇÃO DE PLANOS - FIXA NA HOME */}
                        <section className="bg-black/30 py-32 border-y border-white/5">
                            <div className="max-w-7xl mx-auto px-6">
                                <div className="text-center mb-20 space-y-4">
                                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Impulsione seu Negócio</h2>
                                    <p className="text-gray-500 uppercase text-[12px] font-black tracking-[0.3em]">Planos Exclusivos de Divulgação</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    {plans.map(p => (
                                        <div key={p.id} className="glass-panel p-14 rounded-[70px] flex flex-col items-center text-center border-white/5 hover:border-brand-primary/40 transition-all group shadow-2xl relative overflow-hidden">
                                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/20 transition-all"/>
                                            <h3 className="text-2xl font-black uppercase text-white mb-3 tracking-tighter">{p.name}</h3>
                                            <div className="text-5xl font-black text-brand-primary mb-8 tracking-tighter">R$ {Number(p.price).toFixed(2)}</div>
                                            <p className="text-sm text-gray-500 mb-12 h-12 leading-relaxed font-bold italic opacity-80">"{p.description || 'Visibilidade garantida no portal.'}"</p>
                                            <Button className="w-full h-16 uppercase font-black tracking-widest shadow-xl" variant={p.price > 0 ? 'primary' : 'outline'} onClick={() => setCurrentView('REGISTER')}>Contratar Agora</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* SEÇÃO DE ANÚNCIOS - FIXA NA HOME */}
                        <section id="ads" className="max-w-7xl mx-auto px-6 py-32">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-20">
                                <div className="space-y-3 text-center md:text-left">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Vitrines VIP</h2>
                                    <p className="text-[11px] font-black text-brand-secondary uppercase tracking-[0.5em]">Oportunidades de Ouro</p>
                                </div>
                                <div className="hidden md:block h-px flex-1 bg-white/5 mx-10" />
                                <div className="flex items-center gap-3">
                                  <Radio className="text-brand-primary animate-pulse"/>
                                  <span className="text-[12px] font-black uppercase text-gray-500 tracking-widest">Destaques em Tempo Real</span>
                                </div>
                            </div>
                            
                            {isLoadingData ? (
                                <div className="text-center py-40">
                                  <div className="w-20 h-20 border-t-4 border-brand-primary border-solid rounded-full animate-spin mx-auto mb-8 shadow-2xl shadow-brand-primary/30"></div>
                                  <p className="text-brand-primary font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando Galeria...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
                                    {posts.filter(p => {
                                        const user = allUsers.find(u => u.id === p.authorId);
                                        const isPublic = user?.paymentStatus === PaymentStatus.CONFIRMED;
                                        const isAdminPost = p.authorId && p.authorId.includes('admin');
                                        return isPublic || isAdminPost;
                                    }).map(p => <PostCard key={p.id} post={p} />)}
                                    {posts.length === 0 && (
                                      <div className="col-span-full py-32 text-center glass-panel rounded-[60px] border-dashed border-white/10 opacity-50">
                                        <p className="text-gray-500 font-black uppercase text-sm tracking-widest">Nenhum anúncio ativo no momento.</p>
                                      </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* TELAS DE LOGIN / REGISTER */}
                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 pt-32">
                         <div className="glass-panel p-16 rounded-[80px] w-full max-w-lg border-white/10 shadow-3xl animate-in zoom-in duration-500">
                            <h2 className="text-4xl font-black text-white uppercase text-center mb-12 tracking-tighter">{currentView === 'LOGIN' ? 'Painel VIP' : 'Cadastro de Parceiro'}</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                if (currentView === 'LOGIN') {
                                    setIsLoggingIn(true);
                                    try {
                                      const u = await db.authenticate(fd.get('email') as string, fd.get('password') as string);
                                      if (u) {
                                          setCurrentUser(u);
                                          localStorage.setItem(SESSION_KEY, JSON.stringify(u));
                                          setCurrentView(u.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
                                          await refreshData();
                                      } else showToast("Dados de acesso incorretos.", "error");
                                    } finally { setIsLoggingIn(false); }
                                } else {
                                    setIsLoggingIn(true);
                                    try {
                                      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
                                      const newUser = { 
                                        id: 'u-'+Date.now(), 
                                        name: fd.get('name'), 
                                        email: fd.get('email'), 
                                        password: fd.get('password'), 
                                        phone: fd.get('phone'), 
                                        profession: fd.get('profession'), 
                                        role: UserRole.ADVERTISER, 
                                        createdAt: new Date().toISOString(), 
                                        expiresAt: expiresAt.toISOString(), 
                                        paymentStatus: PaymentStatus.AWAITING,
                                        planId: fd.get('planId') || 'p_free'
                                      };
                                      const saved = await db.addUser(newUser);
                                      if (saved) { 
                                        setCurrentUser(saved); 
                                        localStorage.setItem(SESSION_KEY, JSON.stringify(saved)); 
                                        setCurrentView('DASHBOARD'); 
                                        await refreshData(); 
                                      }
                                    } catch(e) { showToast("Este e-mail já está cadastrado.", "error"); }
                                    finally { setIsLoggingIn(false); }
                                }
                            }} className="space-y-8">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="Nome Completo ou Empresa" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary shadow-inner" />
                                        <input name="phone" required placeholder="WhatsApp (Ex: 5511...)" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary shadow-inner" />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <select name="profession" required className="w-full bg-brand-dark border border-white/10 p-6 rounded-3xl text-white outline-none font-black uppercase text-[11px] appearance-none cursor-pointer">
                                              <option value="">Seu Segmento</option>
                                              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                          </select>
                                          <select name="planId" required className="w-full bg-brand-dark border border-white/10 p-6 rounded-3xl text-white outline-none font-black uppercase text-[11px] appearance-none cursor-pointer">
                                              <option value="">Escolha seu Plano</option>
                                              {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R${p.price}</option>)}
                                          </select>
                                        </div>
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="Seu E-mail" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary shadow-inner" />
                                <input name="password" required type="password" placeholder="Senha Forte" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary shadow-inner" />
                                <Button type="submit" className="w-full h-20 font-black uppercase text-lg shadow-2xl shadow-brand-primary/30" isLoading={isLoggingIn}>{currentView === 'LOGIN' ? 'Acessar Agora' : 'Finalizar Cadastro VIP'}</Button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-center text-[11px] font-black uppercase text-gray-500 mt-6 tracking-widest hover:text-white transition-colors">{currentView === 'LOGIN' ? 'Novo Parceiro? Crie sua conta aqui' : 'Já é Parceiro VIP? Entre aqui'}</button>
                            </form>
                        </div>
                    </div>
                )}

                {currentView === 'DASHBOARD' && currentUser && (
                    <div className="pt-40 pb-56 max-w-7xl mx-auto px-6">
                         <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-20 border-b border-white/5 pb-20">
                            <div className="flex items-center gap-10">
                                <div className="w-24 h-24 bg-gradient-to-br from-brand-primary to-purple-700 rounded-[35px] flex items-center justify-center text-white font-black text-4xl shadow-2xl transform hover:rotate-6 transition-transform cursor-default">{currentUser.name[0]}</div>
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Olá, {currentUser.name}!</h2>
                                    <div className="flex flex-wrap gap-4 items-center">
                                      <span className={`text-[11px] font-black uppercase px-5 py-1.5 rounded-full shadow-lg ${currentUser.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-600 text-white' : 'bg-brand-accent text-brand-dark animate-pulse'}`}>
                                        {currentUser.paymentStatus}
                                      </span>
                                      <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{currentUser.profession}</span>
                                    </div>
                                </div>
                            </div>
                            <Button className="h-20 px-12 text-lg uppercase font-black" onClick={() => setEditingPost({ title: '', content: '', category: currentUser.profession || 'Geral' })}><PlusCircle size={28}/> Criar Novo Anúncio</Button>
                        </div>

                        {/* ASSISTENTE IA PERSISTENTE */}
                        <div className="glass-panel rounded-[60px] p-16 border-white/5 mb-32 shadow-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-1000"><Zap size={200} className="text-brand-accent"/></div>
                            <h2 className="text-3xl font-black uppercase mb-10 flex items-center gap-4 tracking-tighter"><Zap className="text-brand-accent"/> Assistente de Redação IA</h2>
                            <p className="text-gray-400 mb-10 max-w-2xl text-lg font-medium opacity-80 leading-relaxed">Nossa Inteligência Artificial cria textos persuasivos de radialista para seus anúncios em segundos!</p>
                            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Ex: Venda de apartamento garden com 3 suítes..." className="flex-1 bg-white/5 border border-white/10 p-8 rounded-3xl text-white outline-none focus:border-brand-primary shadow-inner text-lg" />
                                <Button className="h-20 px-14 text-lg font-black uppercase shadow-2xl shadow-brand-accent/20" variant="secondary" onClick={async () => {
                                    if(!magicPrompt) return;
                                    setIsGeneratingAi(true);
                                    try {
                                      const res = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
                                      const data = typeof res === 'object' ? res : { title: 'Oportunidade VIP', content: res };
                                      setEditingPost({ ...editingPost, title: data.title, content: data.content });
                                      showToast("Texto gerado com sucesso!");
                                    } finally { setIsGeneratingAi(false); }
                                }} isLoading={isGeneratingAi}>Criar Copy</Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 mb-16">
                          <h3 className="text-3xl font-black uppercase tracking-tighter">Minha Galeria VIP</h3>
                          <div className="h-px flex-1 bg-white/5" />
                          <span className="text-[11px] font-black uppercase text-gray-500 tracking-[0.3em]">Total: {posts.filter(p => p.authorId === currentUser.id).length}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-14">
                            {posts.filter(p => p.authorId === currentUser.id).map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-8 right-8 z-20 flex gap-3 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                        <button onClick={() => setEditingPost(p)} className="p-5 bg-brand-primary rounded-[22px] text-white shadow-3xl hover:bg-brand-primary/80 transition-all"><Edit size={20}/></button>
                                        <button onClick={async () => { if(confirm("Apagar anúncio?")) { await db.deletePost(p.id); refreshData(); } }} className="p-5 bg-red-600 rounded-[22px] text-white shadow-3xl hover:bg-red-700 transition-all"><Trash2 size={20}/></button>
                                    </div>
                                    <PostCard post={p} />
                                </div>
                            ))}
                            {posts.filter(p => p.authorId === currentUser.id).length === 0 && (
                                <div className="col-span-full py-32 text-center glass-panel rounded-[60px] border-dashed border-white/10 shadow-2xl">
                                    <p className="text-gray-500 font-black uppercase text-sm tracking-widest opacity-60">Você ainda não possui anúncios publicados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && (
                    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] pt-32 bg-brand-dark/50">
                         <aside className="w-full md:w-80 border-r border-white/5 p-10 space-y-5 bg-black/20">
                            {[
                                { id: 'INICIO', label: 'Dashboard Geral', icon: Layers },
                                { id: 'CLIENTES', label: 'Assinantes VIP', icon: Users },
                                { id: 'PLANOS', label: 'Tabela de Preços', icon: CreditCard },
                                { id: 'CATEGORIAS', label: 'Segmentos de Ramo', icon: Layers },
                                { id: 'AJUSTES', label: 'Identidade Visual', icon: Settings },
                            ].map(item => (
                                <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`w-full flex items-center gap-6 p-6 rounded-3xl transition-all duration-300 ${adminSubView === item.id ? 'bg-brand-primary text-white shadow-2xl scale-105' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={22} /><span className="text-[12px] font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                            <div className="pt-10 border-t border-white/5 mt-10">
                              <button onClick={handleLogout} className="w-full flex items-center gap-6 p-6 text-red-500 hover:bg-red-500/10 rounded-3xl transition-all"><LogOut size={22}/><span className="text-[12px] font-black uppercase tracking-widest">Sair do Painel</span></button>
                            </div>
                        </aside>
                        <main className="flex-1 p-16 overflow-y-auto">{renderAdminContent()}</main>
                    </div>
                )}
            </main>

            {/* MODAIS DE EDIÇÃO - FOCO EM PERSISTÊNCIA E UPLOAD */}
            {editingPost && (
                <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <form onSubmit={handleSavePost} className="glass-panel p-16 rounded-[80px] w-full max-w-3xl space-y-10 max-h-[90vh] overflow-y-auto border-white/10 shadow-3xl">
                        <div className="flex justify-between items-center border-b border-white/5 pb-10">
                            <div>
                              <h4 className="text-4xl font-black uppercase text-white tracking-tighter">Editor VIP</h4>
                              <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] mt-2">Publicação em Tempo Real</p>
                            </div>
                            <button type="button" onClick={() => setEditingPost(null)} className="p-5 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={32}/></button>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-3">
                              <label className="text-[11px] font-black uppercase text-brand-primary tracking-widest">Título do Anúncio</label>
                              <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="Título Chamativo..." className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary text-lg" required />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[11px] font-black uppercase text-brand-primary tracking-widest">Conteúdo Persuasivo</label>
                              <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="Dê detalhes do seu serviço..." className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none h-44 focus:border-brand-primary resize-none text-lg leading-relaxed" required />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black uppercase text-brand-primary tracking-widest block">Imagem do Produto/Serviço</label>
                                    <div className="aspect-video bg-black/40 rounded-[40px] overflow-hidden border border-white/10 relative group shadow-2xl">
                                        {editingPost.imageUrl ? <img src={editingPost.imageUrl} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-gray-700"><ImageIcon size={60} /></div>}
                                        <button type="button" onClick={() => document.getElementById('adFile')?.click()} className="absolute inset-0 bg-brand-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[12px] font-black uppercase gap-3 transition-all backdrop-blur-sm"><Camera size={28}/> Trocar Imagem</button>
                                        <input id="adFile" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setEditingPost({...editingPost, imageUrl: b}))} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black uppercase text-brand-primary tracking-widest block">Logotipo do Negócio</label>
                                    <div className="w-40 h-40 bg-black/40 rounded-[40px] overflow-hidden border border-white/10 mx-auto relative group shadow-2xl">
                                        {editingPost.logoUrl ? <img src={editingPost.logoUrl} className="w-full h-full object-contain p-4" /> : <div className="flex items-center justify-center h-full text-gray-700"><Zap size={60} /></div>}
                                        <button type="button" onClick={() => document.getElementById('logoFile')?.click()} className="absolute inset-0 bg-brand-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase transition-all backdrop-blur-sm">Alterar Logo</button>
                                        <input id="logoFile" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b) => setEditingPost({...editingPost, logoUrl: b}))} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                  <label className="text-[11px] font-black uppercase text-brand-primary tracking-widest">WhatsApp de Contato</label>
                                  <input value={editingPost.whatsapp || ''} onChange={e => setEditingPost({...editingPost, whatsapp: e.target.value})} placeholder="Ex: 551199999999" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary" />
                                </div>
                                <div className="space-y-3">
                                  <label className="text-[11px] font-black uppercase text-brand-primary tracking-widest">Categoria Selecionada</label>
                                  <select value={editingPost.category} onChange={e => setEditingPost({...editingPost, category: e.target.value})} className="w-full bg-brand-dark border border-white/10 p-6 rounded-3xl text-white outline-none font-black uppercase text-[12px] cursor-pointer">
                                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                  </select>
                                </div>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-20 uppercase font-black tracking-[0.3em] text-lg shadow-2xl shadow-brand-primary/40" isLoading={isSaving}>Gravar e Publicar Agora</Button>
                    </form>
                </div>
            )}

            {/* MODAL PLANO */}
            {editingPlan && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
                    <form onSubmit={handleSavePlan} className="glass-panel p-16 rounded-[70px] w-full max-w-md space-y-10 border-white/10 shadow-3xl">
                        <div className="flex justify-between items-center"><h4 className="text-3xl font-black uppercase text-white tracking-tighter">Editar Plano</h4><button type="button" onClick={() => setEditingPlan(null)} className="p-4 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={24}/></button></div>
                        <div className="space-y-6">
                          <input value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} placeholder="Nome do Plano" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none" required />
                          <div className="grid grid-cols-2 gap-6">
                              <input type="number" step="0.01" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} placeholder="Preço R$" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none" required />
                              <input type="number" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: Number(e.target.value)})} placeholder="Dias" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none" required />
                          </div>
                          <textarea value={editingPlan.description} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} placeholder="Descrição breve..." className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none h-32 resize-none" />
                        </div>
                        <Button type="submit" className="w-full h-18 font-black uppercase tracking-widest shadow-2xl shadow-brand-primary/20" isLoading={isSaving}>Salvar Definições</Button>
                    </form>
                </div>
            )}

            {/* MODAL CATEGORIA */}
            {editingCategory && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
                    <form onSubmit={handleSaveCategory} className="glass-panel p-16 rounded-[60px] w-full max-w-sm space-y-10 border-white/10 shadow-3xl text-center">
                        <div className="flex justify-between items-center"><h4 className="text-2xl font-black uppercase text-white tracking-tighter">Novo Segmento</h4><button type="button" onClick={() => setEditingCategory(null)} className="text-gray-500 hover:text-white transition-all"><X size={24}/></button></div>
                        <input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="Ex: Gastronomia..." className="w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-white outline-none text-center font-black uppercase tracking-widest" required />
                        <Button type="submit" className="w-full h-18 font-black uppercase tracking-widest shadow-xl" isLoading={isSaving}>Adicionar Ramo</Button>
                    </form>
                </div>
            )}

            {/* TOAST DINÂMICO DE PERSISTÊNCIA */}
            {toast && (
                <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[300] px-14 py-8 rounded-[40px] shadow-3xl flex items-center gap-6 animate-in slide-in-from-bottom-20 duration-500 border border-white/10 backdrop-blur-3xl ${toast.t === 'success' ? 'bg-brand-primary text-white' : 'bg-red-600 text-white'}`}>
                    {toast.t === 'success' ? <div className="p-3 bg-white/20 rounded-full"><Check size={32}/></div> : <AlertTriangle size={32}/>}
                    <span className="font-black uppercase text-sm tracking-[0.2em]">{toast.m}</span>
                </div>
            )}

            <footer className="bg-black/40 py-32 text-center border-t border-white/5 mt-auto">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center space-y-12">
                    <div className="flex items-center gap-6 text-white/30 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                      <Radio size={50} className="group-hover:text-brand-primary transition-colors duration-500" />
                      <span className="text-4xl font-black uppercase tracking-tighter group-hover:text-white transition-colors">{siteConfig.heroLabel}</span>
                    </div>
                    <p className="text-[12px] text-gray-700 font-black uppercase tracking-[0.6em] opacity-50 italic">Credibilidade em comunicação • Cloud Architecture v12.0 Stable</p>
                    <div className="flex gap-10">
                         <div className="w-12 h-12 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-brand-primary/20 transition-all cursor-pointer"><Zap size={20}/></div>
                         <div className="w-12 h-12 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-brand-primary/20 transition-all cursor-pointer"><Users size={20}/></div>
                         <div className="w-12 h-12 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-brand-primary/20 transition-all cursor-pointer"><Settings size={20}/></div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
