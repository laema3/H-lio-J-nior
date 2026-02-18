
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Trash2, Edit, MessageCircle, Users, Check, Zap, Image as ImageIcon, X, AlertTriangle, ShieldCheck, Upload, LogOut, Settings, CreditCard, Layers, PlusCircle
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
        heroTitle: 'Portal VIP de Classificados',
        heroSubtitle: 'Conectando você aos melhores negócios.',
        heroImageUrl: 'https://images.unsplash.com/photo-1478737270239-2fccd27ee10f?auto=format&fit=crop&q=80&w=1920'
    });
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
    
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');

    const showToast = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 3000);
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
            if (cfg) setSiteConfig(prev => ({ ...prev, ...cfg }));
            if (cats) setCategories(cats);
            
            if (currentUser) {
                const fresh = u.find((usr: User) => usr.id === currentUser.id);
                if (fresh) {
                    setCurrentUser(fresh);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                }
            }
        } catch (error) {
            console.error("Erro Supabase:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { refreshData(); }, []);

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Sessão encerrada.");
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => callback(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = fd.get('email') as string;
        const password = fd.get('password') as string;
        
        const u = await db.authenticate(email, password);
        if (u) {
            setCurrentUser(u);
            localStorage.setItem(SESSION_KEY, JSON.stringify(u));
            setCurrentView(u.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
            showToast(`Bem-vindo, ${u.name}!`);
            refreshData();
        } else showToast("Email ou senha incorretos", "error");
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const newUser: User = {
            id: 'u-' + Date.now(),
            name: fd.get('name') as string,
            email: fd.get('email') as string,
            password: fd.get('password') as string,
            phone: fd.get('phone') as string,
            profession: fd.get('profession') as string,
            role: UserRole.ADVERTISER,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            planId: 'p_free',
            paymentStatus: PaymentStatus.CONFIRMED
        };

        try {
            const saved = await db.addUser(newUser);
            if (saved) {
                setCurrentUser(saved);
                localStorage.setItem(SESSION_KEY, JSON.stringify(saved));
                setCurrentView('DASHBOARD');
                showToast("Conta criada com sucesso!");
                refreshData();
            }
        } catch (err: any) {
            showToast("Erro ao criar conta", "error");
        }
    };

    const handleSavePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPost || !currentUser) return;
        const postData = {
            ...editingPost,
            id: editingPost.id || 'p-' + Date.now(),
            createdAt: editingPost.createdAt || new Date().toISOString(),
            authorId: editingPost.authorId || currentUser.id,
            authorName: editingPost.authorName || currentUser.name,
            whatsapp: editingPost.whatsapp || currentUser.phone
        } as Post;
        await db.savePost(postData);
        setEditingPost(null);
        showToast("Anúncio sincronizado!");
        refreshData();
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan) return;
        const planData = { ...editingPlan, id: editingPlan.id || 'pl-' + Date.now() } as Plan;
        await db.savePlan(planData);
        setEditingPlan(null);
        showToast("Plano atualizado!");
        refreshData();
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        const catData = { ...editingCategory, id: editingCategory.id || 'cat-' + Date.now() } as Category;
        await db.saveCategory(catData);
        setEditingCategory(null);
        showToast("Categoria atualizada!");
        refreshData();
    };

    const renderAdminContent = () => {
        switch (adminSubView) {
            case 'PLANOS':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black uppercase flex items-center gap-3"><CreditCard className="text-brand-accent"/> Planos VIP</h2>
                            <Button onClick={() => setEditingPlan({ name: '', price: 0, durationDays: 30, description: '' })}><PlusCircle size={18}/> Novo Plano</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map(pl => (
                                <div key={pl.id} className="glass-panel p-8 rounded-[40px] border-white/5 relative group">
                                    <h4 className="text-xl font-black text-white uppercase">{pl.name}</h4>
                                    <p className="text-4xl font-black text-brand-primary my-2">R$ {Number(pl.price).toFixed(2)}</p>
                                    <div className="flex gap-2 mt-8">
                                        <button onClick={() => setEditingPlan(pl)} className="p-4 bg-white/5 rounded-2xl text-gray-400 hover:text-white"><Edit size={18}/></button>
                                        <button onClick={() => { if(confirm("Excluir plano?")) db.deletePlan(pl.id).then(refreshData); }} className="p-4 bg-red-600/10 rounded-2xl text-red-500 hover:bg-red-600 hover:text-white"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'CATEGORIAS':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black uppercase flex items-center gap-3"><Layers className="text-brand-secondary"/> Ramos de Atividade</h2>
                            <Button onClick={() => setEditingCategory({ name: '' })}><PlusCircle size={18}/> Nova</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {categories.map(cat => (
                                <div key={cat.id} className="glass-panel p-6 rounded-3xl flex justify-between items-center border-white/5">
                                    <span className="font-black text-white uppercase text-[11px]">{cat.name}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => setEditingCategory(cat)} className="p-2 text-gray-500"><Edit size={16}/></button>
                                        <button onClick={() => db.deleteCategory(cat.id).then(refreshData)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'AJUSTES':
                return (
                    <div className="max-w-4xl space-y-12">
                        <h2 className="text-2xl font-black uppercase flex items-center gap-3"><Settings className="text-brand-accent"/> Identidade Portal</h2>
                        <form onSubmit={async (e) => { e.preventDefault(); await db.updateConfig(siteConfig); showToast("Configurações salvas!"); refreshData(); }} className="glass-panel p-10 rounded-[40px] space-y-8 border-white/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Título Principal</label>
                                    <input value={siteConfig.heroTitle} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">WhatsApp Suporte</label>
                                    <input value={siteConfig.whatsapp || ''} onChange={e => setSiteConfig({...siteConfig, whatsapp: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">Salvar Configurações</Button>
                        </form>
                    </div>
                );
            case 'CLIENTES':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black uppercase flex items-center gap-3"><Users className="text-brand-primary"/> Parceiros VIP</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {allUsers.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                <div key={u.id} className="glass-panel p-6 rounded-3xl flex items-center justify-between border-white/5">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500' : 'bg-red-500'}`}>{u.name[0]}</div>
                                        <div>
                                            <p className="font-black text-white uppercase">{u.name}</p>
                                            <span className="text-[9px] font-black opacity-50">{u.paymentStatus}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={async () => {
                                            const next = u.paymentStatus === PaymentStatus.CONFIRMED ? PaymentStatus.AWAITING : PaymentStatus.CONFIRMED;
                                            await db.updateUser({...u, paymentStatus: next});
                                            refreshData();
                                        }} className="p-4 bg-white/5 rounded-2xl text-brand-primary"><ShieldCheck size={20}/></button>
                                        <button onClick={() => { if(confirm(`Excluir ${u.name}?`)) db.deleteUser(u.id).then(refreshData); }} className="p-4 bg-red-600/10 rounded-2xl text-red-500"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-panel p-10 rounded-[40px] text-center">
                            <Users size={32} className="text-brand-primary mx-auto mb-4"/><p className="text-5xl font-black">{allUsers.length}</p><span className="text-[10px] font-black uppercase text-gray-500">Membros</span>
                        </div>
                        <div className="glass-panel p-10 rounded-[40px] text-center">
                            <MessageCircle size={32} className="text-brand-secondary mx-auto mb-4"/><p className="text-5xl font-black">{posts.length}</p><span className="text-[10px] font-black uppercase text-gray-500">Anúncios</span>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
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
                    <div className="animate-in fade-in duration-700">
                        <section className="pt-48 pb-32 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-8">
                                <div className="inline-block px-4 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[10px] font-black text-brand-primary uppercase tracking-widest">Portal Sincronizado</div>
                                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-[1.1] max-w-lg">
                                  {siteConfig.heroTitle}
                                </h1>
                                <p className="text-xl text-gray-400 italic max-w-md">"{siteConfig.heroSubtitle}"</p>
                                <div className="flex flex-wrap gap-4">
                                    <Button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})}>Ver Classificados</Button>
                                    <Button variant="outline" onClick={() => setCurrentView('REGISTER')}>Criar Conta</Button>
                                </div>
                            </div>
                            <div className="glass-panel p-2 rounded-[50px] overflow-hidden shadow-2xl border-white/5">
                                <img src={siteConfig.heroImageUrl} className="w-full aspect-video object-cover rounded-[45px]" alt="Hero" />
                            </div>
                        </section>
                        <section id="ads" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
                            <h2 className="text-3xl font-black uppercase mb-16 tracking-tighter">Últimos Anúncios</h2>
                            {isLoadingData ? (
                                <div className="text-center py-20 animate-pulse text-brand-primary font-black uppercase">Sincronizando Banco de Dados...</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                    {posts.filter(p => {
                                        const user = allUsers.find(u => u.id === p.authorId);
                                        return user?.paymentStatus === PaymentStatus.CONFIRMED || p.authorId === 'admin-01';
                                    }).map(p => <PostCard key={p.id} post={p} />)}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-dark">
                         <div className="glass-panel p-14 rounded-[65px] w-full max-w-md border-white/10">
                            <h2 className="text-4xl font-black text-white uppercase text-center mb-12">{currentView === 'LOGIN' ? 'Acesso VIP' : 'Cadastro VIP'}</h2>
                            <form onSubmit={currentView === 'LOGIN' ? handleLogin : handleRegister} className="space-y-6">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="Nome Completo" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                                        <input name="phone" required placeholder="WhatsApp" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                                        <select name="profession" className="w-full bg-brand-dark border border-white/10 p-5 rounded-3xl text-white outline-none font-black uppercase text-[11px]">
                                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="E-mail" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                                <input name="password" required type="password" placeholder="Senha" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                                <Button type="submit" className="w-full h-18">{currentView === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</Button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-center text-[10px] font-black uppercase text-gray-500 mt-6 tracking-widest">{currentView === 'LOGIN' ? 'Quero ser anunciante' : 'Já tenho conta'}</button>
                            </form>
                        </div>
                    </div>
                )}

                {currentView === 'DASHBOARD' && currentUser && (
                    <div className="pt-32 pb-40 max-w-7xl mx-auto px-6">
                         <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-16 border-b border-white/5 pb-16">
                            <div className="flex items-center gap-8">
                                <div className="w-20 h-20 bg-brand-primary rounded-[25px] flex items-center justify-center text-white font-black text-3xl">{currentUser.name[0]}</div>
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Olá, {currentUser.name}</h2>
                                    <p className="text-[10px] font-black text-gray-500 uppercase">Membro VIP Ativo</p>
                                </div>
                            </div>
                            <Button onClick={() => setEditingPost({ title: '', content: '', category: currentUser.profession || 'Geral' })}><PlusCircle size={20}/> Novo Anúncio</Button>
                        </div>
                        
                        <div className="bg-brand-dark/50 rounded-[50px] p-10 border border-white/5 mb-20">
                            <h2 className="text-2xl font-black uppercase mb-8 flex items-center gap-3"><Zap className="text-brand-accent"/> Assistente de IA</h2>
                            <div className="flex flex-col md:flex-row gap-6">
                                <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Descreva seu produto..." className="flex-1 bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none" />
                                <Button onClick={async () => {
                                    if(!magicPrompt) return;
                                    setIsGeneratingAi(true);
                                    const res = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
                                    const data = typeof res === 'object' ? res : { title: 'Destaque VIP', content: res };
                                    setEditingPost({ ...editingPost, title: data.title, content: data.content });
                                    setIsGeneratingAi(false);
                                }} isLoading={isGeneratingAi}>Gerar Anúncio</Button>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black uppercase mb-12 tracking-tighter">Meus Classificados</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {posts.filter(p => p.authorId === currentUser.id).map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingPost(p)} className="p-4 bg-brand-primary rounded-2xl text-white"><Edit size={18}/></button>
                                        <button onClick={() => { if(confirm("Apagar?")) db.deletePost(p.id).then(refreshData); }} className="p-4 bg-red-600 rounded-2xl text-white"><Trash2 size={18}/></button>
                                    </div>
                                    <PostCard post={p} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentView === 'ADMIN' && (
                    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] pt-24 bg-brand-dark">
                         <aside className="w-full md:w-72 border-r border-white/5 p-8 space-y-4">
                            {[
                                { id: 'INICIO', label: 'Dashboard', icon: Layers },
                                { id: 'CLIENTES', label: 'Clientes', icon: Users },
                                { id: 'PLANOS', label: 'Planos', icon: CreditCard },
                                { id: 'CATEGORIAS', label: 'Categorias', icon: Layers },
                                { id: 'AJUSTES', label: 'Ajustes', icon: Settings },
                            ].map(item => (
                                <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all ${adminSubView === item.id ? 'bg-brand-primary text-white shadow-xl' : 'text-gray-400 hover:bg-white/5'}`}>
                                    <item.icon size={18} /><span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                            <button onClick={handleLogout} className="w-full flex items-center gap-4 p-5 text-red-500 mt-10"><LogOut size={18}/><span className="text-[11px] font-black uppercase tracking-widest">Sair</span></button>
                        </aside>
                        <main className="flex-1 p-12 overflow-y-auto">{renderAdminContent()}</main>
                    </div>
                )}
            </main>

            {editingPost && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
                    <form onSubmit={handleSavePost} className="glass-panel p-12 rounded-[60px] w-full max-w-2xl space-y-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-white/5 pb-8">
                            <h4 className="text-3xl font-black uppercase text-white tracking-tighter">Publicar Anúncio</h4>
                            <button type="button" onClick={() => setEditingPost(null)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>
                        <div className="space-y-6">
                            <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="Título Chamativo" className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none" required />
                            <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="Descrição..." className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none h-32" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3 text-center">
                                    <label className="text-[9px] font-black uppercase text-brand-primary">Foto Anúncio</label>
                                    <div className="relative h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center overflow-hidden">
                                        {editingPost.imageUrl ? <img src={editingPost.imageUrl} className="w-full h-full object-cover" /> : <Upload size={24}/>}
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (b) => setEditingPost({...editingPost, imageUrl: b}))} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="space-y-3 text-center">
                                    <label className="text-[9px] font-black uppercase text-brand-primary">Logo Empresa</label>
                                    <div className="relative h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center overflow-hidden">
                                        {editingPost.logoUrl ? <img src={editingPost.logoUrl} className="w-full h-full object-contain p-4" /> : <ImageIcon size={24}/>}
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (b) => setEditingPost({...editingPost, logoUrl: b}))} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-18 uppercase font-black">Salvar no Portal Cloud</Button>
                    </form>
                </div>
            )}

            {editingPlan && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
                    <form onSubmit={handleSavePlan} className="glass-panel p-10 rounded-[50px] w-full max-w-md space-y-6">
                        <h4 className="text-2xl font-black uppercase text-white">Configurar Plano</h4>
                        <input value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} placeholder="Nome do Plano" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input value={editingPlan.price} type="number" onChange={e => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})} placeholder="Preço" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white" required />
                            <input value={editingPlan.durationDays} type="number" onChange={e => setEditingPlan({...editingPlan, durationDays: parseInt(e.target.value)})} placeholder="Dias" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white" required />
                        </div>
                        <div className="flex gap-4">
                            <Button type="submit" className="flex-1">Salvar</Button>
                            <Button variant="outline" onClick={() => setEditingPlan(null)} type="button">Sair</Button>
                        </div>
                    </form>
                </div>
            )}

            {editingCategory && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
                    <form onSubmit={handleSaveCategory} className="glass-panel p-10 rounded-[40px] w-full max-w-sm space-y-6">
                        <h4 className="text-2xl font-black uppercase text-white">Ramo Atividade</h4>
                        <input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="Nome" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white" required />
                        <div className="flex gap-4">
                            <Button type="submit" className="flex-1">Salvar</Button>
                            <Button variant="outline" onClick={() => setEditingCategory(null)} type="button">Sair</Button>
                        </div>
                    </form>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-10 py-5 rounded-[25px] flex items-center gap-4 animate-in slide-in-from-bottom ${toast.t === 'success' ? 'bg-green-600 text-white shadow-green-500/20 shadow-2xl' : 'bg-red-600 text-white'}`}>
                    {toast.t === 'success' ? <Check size={20}/> : <AlertTriangle size={20}/>}
                    <span className="font-black uppercase text-[10px] tracking-widest">{toast.m}</span>
                </div>
            )}

            <footer className="bg-black/40 py-20 text-center border-t border-white/5">
                <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest opacity-50 italic">© {new Date().getFullYear()} • Helio Junior • Cloud Sync v5</p>
            </footer>
        </div>
    );
};

export default App;
