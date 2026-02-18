
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG } from './services/storage';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Trash2, Edit, Plus, Tag, MessageCircle, Clock, Users, 
    Database, LayoutDashboard, Check, Zap, Image as ImageIcon, X, AlertTriangle, Copy, ShieldCheck, Upload, LogOut
} from 'lucide-react';

const App: React.FC = () => {
    // Estados Globais
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<string>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => getFromLocal(STORAGE_KEYS.SESSION, null));
    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);

    // Estados de Edição/Interação
    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');

    const showToast = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 3000);
    };

    const refreshData = async () => {
        const [p, u, pl, cfg, cats] = await Promise.all([
            storageService.getPosts(),
            storageService.getUsers(),
            storageService.getPlans(),
            storageService.getConfig(),
            storageService.getCategories()
        ]);
        setPosts(p);
        setAllUsers(u);
        setPlans(pl);
        setSiteConfig(cfg);
        setCategories(cats);
        if (currentUser) {
            const fresh = u.find(usr => usr.id === currentUser.id);
            if (fresh) setCurrentUser(fresh);
        }
    };

    useEffect(() => { storageService.init().then(refreshData); }, []);

    // Verificação de Expiração
    useEffect(() => {
        if (currentUser && currentUser.role === UserRole.ADVERTISER && currentUser.expiresAt) {
            const isExpired = new Date(currentUser.expiresAt).getTime() < new Date().getTime();
            if (isExpired && currentView === 'DASHBOARD') {
                setCurrentView('PAYMENT');
            }
        }
    }, [currentUser, currentView]);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const u = await storageService.authenticate(fd.get('email') as string, fd.get('password') as string);
        if (u) {
            setCurrentUser(u);
            saveToLocal(STORAGE_KEYS.SESSION, u);
            setCurrentView(u.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
            showToast(`Bem-vindo, ${u.name}!`);
            refreshData();
        } else showToast("Acesso negado. Verifique os dados.", "error");
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const u = await storageService.addUser({
            name: fd.get('name'),
            email: fd.get('email'),
            password: fd.get('password'),
            phone: fd.get('phone'),
            profession: fd.get('profession'),
            role: UserRole.ADVERTISER
        });
        setCurrentUser(u);
        saveToLocal(STORAGE_KEYS.SESSION, u);
        setCurrentView('DASHBOARD');
        showToast("Parabéns! Sua conta VIP está ativa.");
        refreshData();
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Sessão encerrada.");
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
            whatsapp: editingPost.whatsapp || currentUser.phone,
            phone: editingPost.phone || currentUser.phone
        } as Post;
        await storageService.savePost(postData);
        setEditingPost(null);
        showToast("Anúncio publicado!");
        refreshData();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'logoUrl') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingPost(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAiRefine = async () => {
        if (!magicPrompt || !currentUser) return;
        setIsGeneratingAi(true);
        try {
            const res = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
            const data = typeof res === 'object' ? res : { title: 'Destaque VIP', content: res };
            setEditingPost({ ...editingPost, title: data.title, content: data.content });
            showToast("IA criou seu anúncio!");
        } catch (e) { showToast("IA indisponível", "error"); } finally { setIsGeneratingAi(false); }
    };

    const renderAdminContent = () => {
        switch (adminSubView) {
            case 'CLIENTES':
                return (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <h2 className="text-2xl font-black uppercase flex items-center gap-3"><Users className="text-brand-primary"/> Gestão de Parceiros</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {allUsers.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                <div key={u.id} className="glass-panel p-6 rounded-3xl flex items-center justify-between border-white/5 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{u.name[0]}</div>
                                        <div>
                                            <p className="font-black text-white uppercase text-sm">{u.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{u.email} • {u.paymentStatus}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={async () => {
                                            const next = u.paymentStatus === PaymentStatus.CONFIRMED ? PaymentStatus.AWAITING : PaymentStatus.CONFIRMED;
                                            await storageService.updateUser({...u, paymentStatus: next});
                                            refreshData();
                                            showToast("Status alterado!");
                                        }} className={`p-3 rounded-xl ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`} title="Ativar/Desativar"><ShieldCheck size={18}/></button>
                                        <button onClick={() => setEditingUser(u)} className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white"><Edit size={18}/></button>
                                        <button onClick={() => storageService.deleteUser(u.id).then(refreshData)} className="p-3 bg-red-600/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-white"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'ANUNCIOS':
                return (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <h2 className="text-2xl font-black uppercase flex items-center gap-3"><MessageCircle className="text-brand-secondary"/> Todos os Classificados</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingPost(p)} className="p-3 bg-brand-primary rounded-xl text-white shadow-xl"><Edit size={16}/></button>
                                        <button onClick={() => storageService.deletePost(p.id).then(refreshData)} className="p-3 bg-red-600 rounded-xl text-white shadow-xl"><Trash2 size={16}/></button>
                                    </div>
                                    <PostCard post={p} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'AJUSTES':
                return (
                    <div className="max-w-2xl space-y-6 animate-in slide-in-from-right">
                        <h2 className="text-2xl font-black uppercase flex items-center gap-3"><Database className="text-brand-accent"/> Configurações do Portal</h2>
                        <form onSubmit={(e) => { e.preventDefault(); storageService.updateConfig(siteConfig).then(() => showToast("Ajustes salvos!")); }} className="glass-panel p-10 rounded-[40px] space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Seu Nome Profissional</label>
                                <input value={siteConfig.heroLabel} onChange={e => setSiteConfig({...siteConfig, heroLabel: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Título do Portal</label>
                                <input value={siteConfig.heroTitle} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">Chave PIX</label>
                                <input value={siteConfig.pixKey} onChange={e => setSiteConfig({...siteConfig, pixKey: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none" />
                            </div>
                            <Button type="submit" className="w-full h-16 uppercase font-black">Salvar Ajustes</Button>
                        </form>
                    </div>
                );
            case 'INICIO':
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in zoom-in">
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-primary text-center">
                            <Users size={32} className="text-brand-primary mx-auto mb-4"/><p className="text-6xl font-black text-white">{allUsers.length}</p><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Parceiros</span>
                        </div>
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-secondary text-center">
                            <MessageCircle size={32} className="text-brand-secondary mx-auto mb-4"/><p className="text-6xl font-black text-white">{posts.length}</p><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Anúncios</span>
                        </div>
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-accent text-center">
                            <Zap size={32} className="text-brand-accent mx-auto mb-4"/><p className="text-6xl font-black text-white">{plans.length}</p><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Planos</span>
                        </div>
                    </div>
                );
        }
    };

    const renderMainContent = () => {
        if (currentView === 'HOME') return (
            <div className="animate-in fade-in duration-1000">
                <section className="pt-48 pb-32 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="inline-block px-4 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[10px] font-black text-brand-primary uppercase tracking-widest">Credibilidade Radialista</div>
                        <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">{siteConfig.heroTitle}</h1>
                        <p className="text-xl text-gray-400 italic">"{siteConfig.heroSubtitle}"</p>
                        <div className="flex justify-center lg:justify-start gap-6">
                            <Button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})} className="h-16 px-12 uppercase font-black">Explorar Ofertas</Button>
                            <Button variant="outline" onClick={() => setCurrentView('REGISTER')} className="h-16 px-12 uppercase font-black">Anunciar Agora</Button>
                        </div>
                    </div>
                    <div className="glass-panel p-2 rounded-[50px] overflow-hidden group shadow-3xl">
                        <img src={siteConfig.heroImageUrl} className="w-full aspect-video object-cover rounded-[45px] group-hover:scale-105 transition-transform duration-1000" alt="Hero" />
                    </div>
                </section>
                <section id="ads" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
                    <h2 className="text-4xl font-black uppercase mb-16 tracking-tighter">Oportunidades em Destaque</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {posts.filter(p => {
                            const user = allUsers.find(u => u.id === p.authorId);
                            return user?.paymentStatus === PaymentStatus.CONFIRMED || p.authorId === 'admin';
                        }).map(p => <PostCard key={p.id} post={p} />)}
                    </div>
                </section>
            </div>
        );

        if (currentView === 'DASHBOARD' && currentUser) {
            const myPosts = posts.filter(p => p.authorId === currentUser.id);
            const daysLeft = currentUser.expiresAt ? Math.ceil((new Date(currentUser.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

            return (
                <div className="pt-32 pb-40 max-w-7xl mx-auto px-6 animate-in slide-in-from-bottom duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-16 border-b border-white/5 pb-16">
                        <div className="flex items-center gap-8">
                            <div className="w-20 h-20 bg-brand-primary rounded-[30px] flex items-center justify-center text-white font-black text-3xl shadow-xl">{currentUser.name[0]}</div>
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Painel VIP: {currentUser.name}</h2>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Seus anúncios estão no ar</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${daysLeft <= 5 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-white/5 border-white/10'}`}>
                            <Clock size={20} className={daysLeft <= 5 ? 'animate-pulse' : 'text-brand-primary'} />
                            <div className="text-left">
                                <p className="text-[8px] font-black uppercase opacity-60">Status da Assinatura</p>
                                <p className="text-sm font-black uppercase">{daysLeft} Dias Restantes</p>
                            </div>
                        </div>
                        <Button onClick={() => setEditingPost({ title: '', content: '', category: currentUser.profession || 'Geral' })} className="h-14 px-10 uppercase font-black"><Plus size={18}/> Novo Anúncio</Button>
                    </div>

                    <div className="bg-brand-dark rounded-[50px] p-12 border border-white/5 shadow-2xl mb-20">
                        <h2 className="text-2xl font-black uppercase mb-8 flex items-center gap-3"><Zap className="text-brand-accent"/> Inteligência Artificial Radialista</h2>
                        <div className="flex flex-col md:flex-row gap-6">
                            <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="O que você quer vender hoje? Descreva brevemente..." className="flex-1 bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary transition-all" />
                            <Button onClick={handleAiRefine} isLoading={isGeneratingAi} className="h-18 md:w-64 font-black uppercase">Gerar com Mágica</Button>
                        </div>
                    </div>

                    <h3 className="text-2xl font-black uppercase mb-12 flex items-center gap-4">Meus Classificados <span className="bg-white/5 px-4 py-1 rounded-full text-xs text-brand-primary">{myPosts.length}</span></h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {myPosts.map(p => (
                            <div key={p.id} className="relative group">
                                <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => setEditingPost(p)} className="p-3 bg-brand-primary rounded-xl text-white shadow-xl"><Edit size={16}/></button>
                                    <button onClick={() => storageService.deletePost(p.id).then(refreshData)} className="p-3 bg-red-600 rounded-xl text-white shadow-xl"><Trash2 size={16}/></button>
                                </div>
                                <PostCard post={p} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (currentView === 'LOGIN' || currentView === 'REGISTER') return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-brand-dark">
                <div className="glass-panel p-12 rounded-[60px] w-full max-w-md border-white/10 shadow-3xl animate-in zoom-in">
                    <h2 className="text-4xl font-black text-white uppercase text-center mb-10 tracking-tighter">{currentView === 'LOGIN' ? 'Entrar' : 'Começar VIP'}</h2>
                    <form onSubmit={currentView === 'LOGIN' ? handleLogin : handleRegister} className="space-y-6">
                        {currentView === 'REGISTER' && (
                            <>
                                <input name="name" required placeholder="Seu Nome Completo" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                                <input name="phone" required placeholder="WhatsApp (DDD+Número)" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                                <select name="profession" className="w-full bg-brand-dark border border-white/10 p-5 rounded-3xl text-white outline-none font-black uppercase text-[10px]">
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </>
                        )}
                        <input name="email" required type="email" placeholder="E-mail" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                        <input name="password" required type="password" placeholder="Senha de Acesso" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                        <Button type="submit" className="w-full h-18 uppercase font-black text-sm">{currentView === 'LOGIN' ? 'Acessar Painel' : 'Garantir 30 Dias Grátis'}</Button>
                        <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-center text-[10px] font-black uppercase text-gray-500 hover:text-white mt-4 tracking-widest">{currentView === 'LOGIN' ? 'Criar Nova Conta VIP' : 'Já tenho uma conta'}</button>
                    </form>
                </div>
            </div>
        );

        if (currentView === 'ADMIN') return (
            <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] pt-24 bg-brand-dark">
                <aside className="w-full md:w-80 border-r border-white/5 p-8 space-y-3">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-6 tracking-widest">Menu Admin</p>
                    {[
                        { id: 'INICIO', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'CLIENTES', label: 'Parceiros', icon: Users },
                        { id: 'ANUNCIOS', label: 'Anúncios', icon: MessageCircle },
                        { id: 'AJUSTES', label: 'Ajustes Site', icon: Database },
                    ].map(item => (
                        <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${adminSubView === item.id ? 'bg-brand-primary border-brand-primary text-white shadow-lg' : 'text-gray-400 border-transparent hover:bg-white/5'}`}>
                            <item.icon size={20} /><span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                    ))}
                    <div className="pt-10">
                         <button onClick={handleLogout} className="w-full flex items-center gap-4 p-5 rounded-2xl text-red-500 hover:bg-red-500/10 transition-colors">
                            <LogOut size={20}/><span className="text-[10px] font-black uppercase tracking-widest">Sair</span>
                        </button>
                    </div>
                </aside>
                <main className="flex-1 p-10 overflow-y-auto">{renderAdminContent()}</main>
            </div>
        );

        if (currentView === 'PAYMENT') return (
            <div className="pt-40 pb-40 max-w-3xl mx-auto px-6 text-center animate-in zoom-in">
                <div className="glass-panel p-16 rounded-[60px] border-red-500/20">
                    <AlertTriangle size={60} className="text-red-500 mx-auto mb-8 animate-bounce"/>
                    <h2 className="text-4xl font-black uppercase text-white mb-6 tracking-tighter">Assinatura Expirada</h2>
                    <p className="text-gray-400 mb-12">Seu tempo de degustação (30 dias) acabou. Escolha um plano abaixo para reativar sua vitrine no portal.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 text-left">
                        {plans.filter(p => p.price > 0).map(p => (
                            <div key={p.id} className="p-8 bg-white/5 border border-white/10 rounded-[40px] hover:border-brand-primary transition-all">
                                <h4 className="text-white font-black uppercase">{p.name}</h4>
                                <p className="text-4xl font-black text-brand-primary my-4">R$ {p.price.toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">{p.durationDays} Dias Ativos</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-black/40 p-10 rounded-[40px] border border-white/5 text-left mb-10">
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Pagar via PIX</span>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-white font-black text-xl truncate mr-4">{siteConfig.pixKey}</span>
                            <button onClick={() => {navigator.clipboard.writeText(siteConfig.pixKey || ''); showToast("Chave PIX Copiada!");}} className="p-4 bg-brand-primary/10 rounded-2xl text-brand-primary hover:bg-brand-primary hover:text-white transition-all"><Copy size={20}/></button>
                        </div>
                    </div>
                    <Button onClick={() => window.open(`https://wa.me/${siteConfig.whatsapp}?text=Olá! Realizei o pagamento da assinatura VIP.`)} className="h-20 w-full uppercase font-black text-sm"><MessageCircle size={24}/> Enviar Comprovante via WhatsApp</Button>
                </div>
            </div>
        );

        return null;
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans selection:bg-brand-primary/50">
            <Navbar 
                currentUser={currentUser} 
                setCurrentView={setCurrentView} 
                currentView={currentView} 
                onLogout={handleLogout} 
                config={siteConfig} 
                isOnline={true} 
            />
            
            <main className="flex-1">{renderMainContent()}</main>

            {/* Modal de Anúncio - AGORA COM UPLOAD */}
            {editingPost && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <form onSubmit={handleSavePost} className="glass-panel p-10 rounded-[50px] w-full max-w-2xl space-y-6 overflow-y-auto max-h-[90vh] border-white/10 shadow-3xl">
                        <div className="flex justify-between items-center border-b border-white/5 pb-6">
                            <h4 className="text-2xl font-black uppercase text-white tracking-tighter">Novo Classificado VIP</h4>
                            <button type="button" onClick={() => setEditingPost(null)} className="p-3 hover:bg-white/5 rounded-full transition-colors"><X/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-brand-primary uppercase mb-2 block tracking-widest">Título do Anúncio</label>
                                <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary transition-all" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-brand-primary uppercase mb-2 block tracking-widest">Descrição Persuasiva</label>
                                <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none h-32 resize-none focus:border-brand-primary transition-all" required />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Upload da Foto */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-primary uppercase block tracking-widest">Foto do Produto/Serviço</label>
                                    <div className="relative h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl overflow-hidden group hover:border-brand-primary transition-all">
                                        {editingPost.imageUrl ? (
                                            <img src={editingPost.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                                <Upload size={24}/>
                                                <span className="text-[9px] font-black uppercase">Clique para Upload</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        {editingPost.imageUrl && (
                                            <button type="button" onClick={() => setEditingPost({...editingPost, imageUrl: ''})} className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white"><X size={12}/></button>
                                        )}
                                    </div>
                                </div>

                                {/* Upload da Logo */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-primary uppercase block tracking-widest">Logomarca da Empresa</label>
                                    <div className="relative h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl overflow-hidden group hover:border-brand-primary transition-all">
                                        {editingPost.logoUrl ? (
                                            <img src={editingPost.logoUrl} className="w-full h-full object-contain p-4" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                                <ImageIcon size={24}/>
                                                <span className="text-[9px] font-black uppercase">Clique para Upload</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        {editingPost.logoUrl && (
                                            <button type="button" onClick={() => setEditingPost({...editingPost, logoUrl: ''})} className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white"><X size={12}/></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-6 border-t border-white/5">
                            <Button type="submit" className="flex-1 h-18 uppercase font-black text-sm tracking-widest">Publicar Agora</Button>
                            <Button variant="outline" type="button" onClick={() => setEditingPost(null)} className="h-18 px-10 uppercase font-black text-xs">Cancelar</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal Admin - Usuário */}
            {editingUser && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
                    <form onSubmit={(e) => { e.preventDefault(); storageService.updateUser(editingUser as User).then(() => {setEditingUser(null); refreshData(); showToast("Alterações salvas!");}); }} className="glass-panel p-10 rounded-[50px] w-full max-w-md space-y-4 border-white/10 shadow-3xl">
                        <h4 className="text-2xl font-black uppercase text-white mb-6">Ajustar Parceiro</h4>
                        <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="Nome" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none" required />
                        <input value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="E-mail" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none" required />
                        <input value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="Alterar Senha" type="text" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none" required />
                        <div className="flex gap-4 pt-6">
                            <Button type="submit" className="flex-1 h-16 uppercase font-black">Salvar Dados</Button>
                            <Button variant="outline" type="button" onClick={() => setEditingUser(null)} className="flex-1 h-16 uppercase font-black">Fechar</Button>
                        </div>
                    </form>
                </div>
            )}

            <footer className="bg-black/80 py-16 text-center border-t border-white/5">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Portal {siteConfig.heroLabel} Radialista - VIP</p>
                <p className="text-[8px] text-gray-700 font-bold uppercase tracking-widest italic opacity-50">Tecnologia, Credibilidade e Resultados</p>
            </footer>
            
            {/* Toast Notificação */}
            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-10 py-5 rounded-3xl shadow-3xl flex items-center gap-4 animate-in slide-in-from-bottom border border-white/10 ${toast.t === 'success' ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
                    {toast.t === 'success' ? <Check size={20}/> : <AlertTriangle size={20}/>}
                    <span className="font-black uppercase text-xs tracking-widest">{toast.m}</span>
                </div>
            )}
        </div>
    );
};

export default App;
