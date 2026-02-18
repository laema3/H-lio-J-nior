
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG } from './services/storage';
import { db, isSupabaseReady } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy, generateAdImage } from './services/geminiService';
import { 
    Trash2, Edit, AlertTriangle, Plus, Tag, 
    MessageCircle, Loader2, Sparkles, Users, 
    Database, Activity, LayoutDashboard, RefreshCcw, 
    ChevronLeft, ChevronRight, Wand2, ShieldAlert, Lock, Ban, Check, Terminal, Globe, Info
} from 'lucide-react';

type AdminSubView = 'INICIO' | 'CLIENTES' | 'ANUNCIOS' | 'AJUSTES' | 'PLANOS';

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<AdminSubView>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => getFromLocal(STORAGE_KEYS.SESSION, null));
    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [diagLogs, setDiagLogs] = useState<string[]>([]);
    const [isTestingConn, setIsTestingConn] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');

    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

    const showToast = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 4000);
    };

    const refresh = async () => {
        setIsLoading(true);
        try {
            const ready = isSupabaseReady();
            setIsOnline(ready);
            const [p, u, pl, cfg] = await Promise.all([
                storageService.getPosts(),
                storageService.getUsers(),
                storageService.getPlans(),
                storageService.getConfig()
            ]);
            setPosts(p);
            setAllUsers(u);
            setPlans(pl);
            setSiteConfig(cfg);
            
            if (currentUser) {
                const fresh = u.find(usr => usr.id === currentUser.id);
                if (fresh) setCurrentUser(fresh);
            }
        } catch (e) {
            setIsOnline(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { storageService.init().then(refresh); }, []);

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan?.name || !editingPlan?.price) return;
        const planToSave: Plan = {
            id: editingPlan.id || 'p-' + Date.now(),
            name: editingPlan.name,
            price: Number(editingPlan.price),
            durationDays: Number(editingPlan.durationDays || 30),
            description: editingPlan.description || ''
        };
        await storageService.savePlan(planToSave);
        setEditingPlan(null);
        showToast("Plano atualizado!");
        refresh();
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser?.id) return;
        await storageService.updateUser(editingUser as User);
        setEditingUser(null);
        showToast("Dados salvos!");
        refresh();
    };

    const handleBlockUser = async (user: User) => {
        const isBlocked = user.paymentStatus === PaymentStatus.AWAITING;
        const updated = { ...user, paymentStatus: isBlocked ? PaymentStatus.CONFIRMED : PaymentStatus.AWAITING };
        await storageService.updateUser(updated);
        showToast(isBlocked ? "Ativado!" : "Bloqueado!");
        refresh();
    };

    const renderAdminContent = () => {
        switch (adminSubView) {
            case 'PLANOS':
                return (
                    <div className="space-y-8 animate-in slide-in-from-right pb-20">
                        <div className="flex items-center justify-between">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Gestão de Planos</h3>
                            <Button onClick={() => setEditingPlan({ name: '', price: 0, durationDays: 30 })} className="h-12 text-[10px] uppercase font-black"><Plus size={16}/> Novo Plano</Button>
                        </div>
                        {editingPlan && (
                            <div className="glass-panel p-8 rounded-[40px] border-brand-primary/30">
                                <form onSubmit={handleSavePlan} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} placeholder="Nome do Plano" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                    <input type="number" step="0.01" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} placeholder="Preço R$" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                    <input type="number" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: Number(e.target.value)})} placeholder="Dias de Duração" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                    <input value={editingPlan.description} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} placeholder="Breve Descrição" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                                    <div className="md:col-span-2 flex gap-4">
                                        <Button type="submit" className="flex-1 h-14 font-black uppercase text-xs">Salvar</Button>
                                        <Button variant="outline" type="button" onClick={() => setEditingPlan(null)} className="flex-1 h-14 font-black uppercase text-xs">Cancelar</Button>
                                    </div>
                                </form>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {plans.map(p => (
                                <div key={p.id} className="glass-panel p-8 rounded-[40px] border-white/5 group">
                                    <div className="flex justify-between mb-4">
                                        <Tag size={20} className="text-brand-primary"/>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingPlan(p)} className="p-2 text-gray-400 hover:text-white"><Edit size={16}/></button>
                                            <button onClick={() => {if(confirm("Excluir?")) storageService.deletePlan(p.id).then(refresh)}} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-black text-white uppercase mb-1">{p.name}</h4>
                                    <p className="text-2xl font-black text-brand-secondary">R$ {p.price.toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{p.durationDays} Dias</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'CLIENTES':
                return (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Assinantes</h3>
                        {editingUser && (
                            <div className="glass-panel p-8 rounded-[40px] border-brand-accent/30 mb-8">
                                <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="Nome" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                    <input value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="E-mail" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                    <div className="flex gap-4 md:col-span-2">
                                        <Button type="submit" className="flex-1 h-14 font-black">Salvar</Button>
                                        <Button variant="outline" type="button" onClick={() => setEditingUser(null)} className="flex-1 h-14 font-black">Cancelar</Button>
                                    </div>
                                </form>
                            </div>
                        )}
                        <div className="space-y-4">
                            {allUsers.map(u => (
                                <div key={u.id} className="glass-panel p-6 rounded-[32px] flex items-center justify-between border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-brand-primary/20 rounded-2xl flex items-center justify-center text-brand-primary font-black uppercase">{u.name[0]}</div>
                                        <div>
                                            <h4 className="font-black text-white uppercase text-sm">{u.name}</h4>
                                            <p className="text-[10px] text-gray-500 font-bold">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{u.paymentStatus}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingUser(u)} className="p-2 text-gray-400 hover:text-white"><Edit size={16}/></button>
                                            <button onClick={() => handleBlockUser(u)} className={`p-2 ${u.paymentStatus === PaymentStatus.AWAITING ? 'text-green-500' : 'text-orange-500'}`}>{u.paymentStatus === PaymentStatus.AWAITING ? <Check size={18}/> : <Ban size={18}/>}</button>
                                            <button onClick={() => {if(confirm("Excluir?")) db.deleteUser(u.id).then(refresh)}} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'ANUNCIOS':
                return (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Moderação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map(p => (
                                <div key={p.id} className="relative group">
                                    <button onClick={() => {if(confirm("Excluir?")) storageService.deletePost(p.id).then(refresh)}} className="absolute top-4 right-4 z-20 p-2 bg-red-500 rounded-xl text-white opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                    <PostCard post={p} author={allUsers.find(u => u.id === p.authorId)} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'AJUSTES':
                return (
                    <div className="max-w-4xl space-y-8 animate-in slide-in-from-right pb-20">
                        <div className="glass-panel p-8 rounded-[40px] space-y-6 border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-brand-primary/20 rounded-2xl text-brand-primary"><Database size={24}/></div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Conexão Cloud</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">As credenciais estão configuradas diretamente no arquivo services/supabase.ts</p>
                                </div>
                            </div>
                            <div className="bg-brand-dark/50 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-white">
                                    <Globe size={18} className="text-brand-accent"/>
                                    <span className="text-xs font-mono opacity-60">Status: {isOnline ? 'CONECTADO' : 'OFFLINE'}</span>
                                </div>
                                <Button onClick={async () => {setIsTestingConn(true); const r = await db.testConnection(); setDiagLogs(r.logs); setIsTestingConn(false);}} isLoading={isTestingConn} className="h-12 text-[10px] uppercase font-black">Rodar Diagnóstico</Button>
                            </div>
                        </div>
                        {diagLogs.length > 0 && (
                            <div className="glass-panel p-8 rounded-[40px] border-white/5 bg-black/30 animate-in fade-in">
                                <div className="flex items-center gap-2 text-brand-accent mb-4"><Terminal size={18}/><h4 className="text-[11px] font-black uppercase tracking-widest">Console de Saída</h4></div>
                                <div className="bg-black/90 rounded-2xl p-6 font-mono text-[10px] space-y-2 border border-white/5 text-gray-400">
                                    {diagLogs.map((log, i) => (
                                        <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}>{log}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="p-8 bg-blue-500/10 border border-blue-500/20 rounded-[40px] flex gap-4">
                            <Info size={24} className="text-blue-400 shrink-0"/>
                            <div>
                                <h4 className="text-white font-black uppercase text-xs mb-1">Dica de Segurança</h4>
                                <p className="text-gray-400 text-[10px] leading-relaxed">Você não precisa mais colar as chaves aqui. Edite o arquivo <code className="text-blue-300">services/supabase.ts</code> e reinicie o app para aplicar mudanças permanentes.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'INICIO':
            default:
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom">
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-primary"><p className="text-6xl font-black text-white mb-2">{allUsers.length}</p><span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Assinantes</span></div>
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-secondary"><p className="text-6xl font-black text-white mb-2">{posts.length}</p><span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Anúncios</span></div>
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-accent"><p className="text-6xl font-black text-white mb-2">{plans.length}</p><span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Planos</span></div>
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-green-500"><div className="flex items-center gap-2 mb-2"><div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} /><p className="text-2xl font-black text-white uppercase">{isOnline ? 'Cloud' : 'Offline'}</p></div><span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Sincronização</span></div>
                    </div>
                );
        }
    };

    const renderContent = () => {
        if (currentView === 'ADMIN') {
            return (
                <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-brand-dark pt-20">
                    <aside className="w-full md:w-72 bg-brand-dark/50 border-r border-white/5 p-6 space-y-2">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8 px-4 flex items-center gap-2"><ShieldAlert size={20} className="text-brand-accent"/> Portal Admin</h2>
                        {[
                            { id: 'INICIO', label: 'Painel Geral', icon: LayoutDashboard },
                            { id: 'CLIENTES', label: 'Assinantes', icon: Users },
                            { id: 'ANUNCIOS', label: 'Anúncios', icon: MessageCircle },
                            { id: 'PLANOS', label: 'Planos/Preços', icon: Tag },
                            { id: 'AJUSTES', label: 'Conexão Banco', icon: Database },
                        ].map(item => (
                            <button key={item.id} onClick={() => setAdminSubView(item.id as AdminSubView)} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all border ${adminSubView === item.id ? 'bg-brand-primary border-brand-primary text-white shadow-xl' : 'text-gray-400 border-transparent hover:bg-white/5'}`}>
                                <item.icon size={18} />
                                <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                    </aside>
                    <main className="flex-1 p-8 overflow-y-auto">{renderAdminContent()}</main>
                </div>
            );
        }
        if (currentView === 'HOME') {
            return (
                <div className="animate-in fade-in duration-1000 pb-40 pt-40 text-center">
                    <h1 className="text-7xl font-black text-white uppercase tracking-tighter mb-8">{siteConfig.heroTitle}</h1>
                    <p className="text-xl text-gray-400 italic mb-14 max-w-xl mx-auto opacity-70">"{siteConfig.heroSubtitle}"</p>
                    <div className="flex justify-center gap-5">
                        <Button onClick={() => setCurrentView('REGISTER')} className="h-16 px-10 font-black uppercase text-xs tracking-widest">Ser um Anunciante</Button>
                        <Button variant="outline" onClick={() => window.scrollTo({top: 800, behavior: 'smooth'})} className="h-16 px-10 font-black uppercase text-xs tracking-widest">Ver Ofertas</Button>
                    </div>
                </div>
            );
        }
        if (currentView === 'LOGIN' || currentView === 'REGISTER') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-4 pt-32 pb-20">
                    <div className="glass-panel p-12 rounded-[50px] w-full max-w-md border border-white/10 shadow-3xl">
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-10 text-center">{currentView === 'LOGIN' ? 'Entrar' : 'Cadastro'}</h2>
                        <form onSubmit={currentView === 'LOGIN' ? async (e) => {
                            e.preventDefault();
                            const user = await storageService.findUserByEmail((e.target as any).email.value);
                            if (user) {
                                setCurrentUser(user);
                                saveToLocal(STORAGE_KEYS.SESSION, user);
                                setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
                                refresh();
                            } else showToast("Usuário não encontrado.", "error");
                        } : async (e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            const u = await storageService.addUser({ name: form.name.value, email: form.email.value.toLowerCase(), role: UserRole.ADVERTISER, paymentStatus: PaymentStatus.AWAITING });
                            setCurrentUser(u);
                            saveToLocal(STORAGE_KEYS.SESSION, u);
                            setCurrentView('PAYMENT');
                        }} className="space-y-4">
                            {currentView === 'REGISTER' && <input name="name" required placeholder="Nome / Empresa" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary" />}
                            <input name="email" required type="email" placeholder="E-mail" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary" />
                            <input name="pass" required type="password" placeholder="Senha" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary" />
                            <Button type="submit" className="w-full h-20 text-lg uppercase font-black">{currentView === 'LOGIN' ? 'Acessar' : 'Cadastrar'}</Button>
                            <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-center text-[10px] font-black uppercase text-gray-500 mt-6 tracking-widest">Alternar Acesso</button>
                        </form>
                    </div>
                </div>
            );
        }
        if (currentView === 'PAYMENT') {
            return (
                <div className="flex-1 max-w-7xl mx-auto px-4 pt-40 pb-20 text-center animate-in zoom-in">
                    <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-4">Planos de Ativação</h2>
                    <p className="text-gray-400 font-bold mb-16 opacity-80">Escolha como deseja aparecer no portal.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {plans.map(p => {
                            const blocked = p.price === 0 && !!currentUser?.usedFreeTrial;
                            return (
                                <div key={p.id} onClick={() => {
                                    if (blocked) return showToast("Degustação já utilizada.", "error");
                                    const expiresAt = new Date();
                                    expiresAt.setDate(expiresAt.getDate() + p.durationDays);
                                    storageService.updateUser({ ...currentUser!, planId: p.id, paymentStatus: p.price === 0 ? PaymentStatus.CONFIRMED : PaymentStatus.AWAITING, expiresAt: expiresAt.toISOString(), usedFreeTrial: currentUser?.usedFreeTrial || p.price === 0 }).then(() => {
                                        setCurrentView('DASHBOARD');
                                        refresh();
                                    });
                                }} className={`glass-panel p-10 rounded-[50px] border-2 transition-all cursor-pointer hover:scale-[1.02] shadow-2xl ${blocked ? 'opacity-30 grayscale cursor-not-allowed border-white/5' : 'border-white/5 hover:border-brand-primary'}`}>
                                    <Tag size={32} className="mx-auto text-brand-primary mb-6"/>
                                    <h3 className="text-xl font-black text-white uppercase mb-4">{p.name}</h3>
                                    <p className="text-4xl font-black text-brand-secondary mb-2">R$ {p.price.toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-500 font-black uppercase mb-10 tracking-widest">{p.durationDays} Dias</p>
                                    <Button disabled={blocked} className="w-full h-14 uppercase text-[10px] font-black">{blocked ? "Já Usado" : "Selecionar"}</Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        if (currentView === 'DASHBOARD' && currentUser) {
            const myPosts = posts.filter(p => p.authorId === currentUser.id);
            return (
                <div className="pt-28 pb-40 max-w-6xl mx-auto px-4">
                     <div className="bg-brand-dark rounded-[40px] p-10 border border-white/5 shadow-3xl mb-12">
                        <h2 className="text-3xl font-black text-white uppercase mb-6 flex items-center gap-3"><Wand2 className="text-brand-primary"/> IA Mágica</h2>
                        <div className="flex flex-col md:flex-row gap-4">
                            <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="O que você quer anunciar hoje?" className="flex-1 bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary" />
                            <Button onClick={async () => {
                                setIsLoading(true);
                                const copy = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt);
                                const img = await generateAdImage(magicPrompt);
                                const newPost: Post = { id: 'p-'+Date.now(), authorId: currentUser.id, authorName: currentUser.name, category: currentUser.profession || 'Geral', title: (copy as any).title, content: (copy as any).content, imageUrl: img, createdAt: new Date().toISOString() };
                                await storageService.addPost(newPost);
                                setMagicPrompt('');
                                refresh();
                            }} isLoading={isLoading} className="h-20 md:w-64 font-black uppercase">Gerar com IA</Button>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {myPosts.map(p => <div key={p.id} className="relative group"><button onClick={() => storageService.deletePost(p.id).then(refresh)} className="absolute top-4 right-4 z-20 p-3 bg-red-500 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button><PostCard post={p} author={currentUser} /></div>)}
                     </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={() => { localStorage.removeItem(STORAGE_KEYS.SESSION); setCurrentUser(null); setCurrentView('HOME'); refresh(); }} config={siteConfig} isOnline={isOnline} />
            <main className="flex-1 flex flex-col">{renderContent()}</main>
            {toast && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-10 py-5 rounded-[30px] shadow-3xl border flex items-center gap-4 animate-in slide-in-from-bottom ${toast.t === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'}`}><span className="font-black uppercase text-[10px] tracking-widest text-white">{toast.m}</span></div>}
            {isLoading && !diagLogs.length && <div className="fixed inset-0 z-[500] bg-brand-dark/80 backdrop-blur-xl flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={60} /></div>}
        </div>
    );
};

export default App;
