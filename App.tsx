
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG } from './services/storage';
import { db, isSupabaseReady, reinitializeSupabase, clearSupabaseCredentials } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { chatWithAssistant, generateAdCopy, generateAudioTTS, generateAdImage } from './services/geminiService';
import { 
    Check, Camera, Trash2, Edit, AlertTriangle, Plus, Settings, CreditCard, Tag,
    MessageCircle, Send, X, Bot, Loader2, Sparkles, Volume2,
    Image as ImageIcon, Users, CheckCircle2, Layers, MapPin, PhoneCall,
    Database, Activity, Globe, LayoutDashboard, RefreshCcw, ChevronLeft, ChevronRight, Wand2, Search, Terminal,
    ShieldAlert, Info, Lock
} from 'lucide-react';

type AdminSubView = 'INICIO' | 'CLIENTES' | 'ANUNCIOS' | 'AJUSTES' | 'CATEGORIAS';

const AdSlider: React.FC<{ ads: Post[], allUsers: User[] }> = ({ ads, allUsers }) => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (ads.length <= 1) return;
        const interval = setInterval(() => {
            setCurrent(prev => (prev + 1) % ads.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [ads.length]);

    if (ads.length === 0) return (
        <div className="glass-panel p-12 rounded-[40px] text-center text-gray-500 uppercase font-black text-[10px] tracking-widest border border-white/5">
            Nenhum anúncio em destaque no momento
        </div>
    );

    const ad = ads[current];
    const handleWhatsApp = () => {
        if (!ad.whatsapp) return;
        const clean = ad.whatsapp.replace(/\D/g, '');
        window.open(`https://wa.me/${clean}`, '_blank');
    };

    return (
        <div className="relative group overflow-hidden rounded-[40px] glass-panel h-[450px] md:h-[400px] border border-white/10 shadow-2xl">
            <div className="absolute inset-0">
                <img 
                    src={ad.imageUrl || `https://picsum.photos/1200/675?random=${ad.id}`} 
                    className="w-full h-full object-cover opacity-20 blur-2xl scale-110" 
                    alt="" 
                />
            </div>
            
            <div className="relative h-full flex flex-col md:flex-row items-center p-8 md:p-12 gap-8 z-10">
                <div className="w-full md:w-5/12 aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
                    <img 
                        src={ad.imageUrl || `https://picsum.photos/800/450?random=${ad.id}`} 
                        className="w-full h-full object-cover" 
                        alt={ad.title} 
                    />
                </div>
                
                <div className="flex-1 text-center md:text-left flex flex-col justify-center">
                    <div className="bg-brand-primary/20 text-brand-primary text-[10px] px-3 py-1 rounded-full uppercase font-black inline-block mb-4 self-center md:self-start">
                        Anunciante: {ad.category}
                    </div>
                    <h4 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 line-clamp-2 leading-none">{ad.title}</h4>
                    <p className="text-gray-400 text-sm mb-8 line-clamp-3 italic leading-relaxed opacity-80">"{ad.content}"</p>
                    
                    <div className="flex items-center justify-center md:justify-start gap-4">
                        <div className="text-left">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Responsável</p>
                            <p className="text-white font-black text-sm uppercase">{ad.authorName}</p>
                        </div>
                        <button 
                            onClick={handleWhatsApp}
                            className="ml-auto bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-2xl transition-all shadow-lg shadow-green-500/20 active:scale-95"
                        >
                            <MessageCircle size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {ads.length > 1 && (
                <div className="absolute bottom-6 right-8 flex gap-2 z-20">
                    <button onClick={() => setCurrent((current - 1 + ads.length) % ads.length)} className="p-3 bg-white/5 hover:bg-brand-primary rounded-full text-white border border-white/10 transition-all backdrop-blur-md"><ChevronLeft size={20}/></button>
                    <button onClick={() => setCurrent((current + 1) % ads.length)} className="p-3 bg-white/5 hover:bg-brand-primary rounded-full text-white border border-white/10 transition-all backdrop-blur-md"><ChevronRight size={20}/></button>
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<AdminSubView>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => getFromLocal(STORAGE_KEYS.SESSION, null));
    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [diagLogs, setDiagLogs] = useState<string[]>([]);
    const [isTestingConn, setIsTestingConn] = useState(false);
    const [showDiag, setShowDiag] = useState(false);
    
    const [magicPrompt, setMagicPrompt] = useState('');

    const [supUrlInput, setSupUrlInput] = useState(() => localStorage.getItem('supabase_url_manual') || '');
    const [supKeyInput, setSupKeyInput] = useState(() => localStorage.getItem('supabase_key_manual') || '');

    const showToast = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 4000);
    };

    const refresh = async () => {
        setIsLoading(true);
        try {
            const ready = isSupabaseReady();
            setIsOnline(ready);
            
            const [p, u, c, cfg] = await Promise.all([
                storageService.getPosts(),
                storageService.getUsers(),
                storageService.getCategories(),
                storageService.getConfig()
            ]);

            setPosts(p || []);
            setAllUsers(u || []);
            setCategories(c || []);
            setSiteConfig(cfg || DEFAULT_CONFIG);
            
            const session = getFromLocal(STORAGE_KEYS.SESSION, null);
            if (session) {
                const fresh = (u || []).find((usr: User) => usr.id === session.id);
                if (fresh) {
                    setCurrentUser(fresh);
                    saveToLocal(STORAGE_KEYS.SESSION, fresh); // Sincroniza localmente
                    
                    if (fresh.role === UserRole.ADVERTISER && fresh.expiresAt) {
                        const expired = new Date(fresh.expiresAt) < new Date();
                        if (expired && (currentView === 'DASHBOARD' || currentView === 'HOME')) {
                           setCurrentView('PAYMENT');
                           showToast("Plano expirado! Escolha uma renovação para continuar anunciando.", "error");
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Erro no refresh do App:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        storageService.init().then(refresh);
    }, []);

    const handleSaveDatabase = () => {
        if (!supUrlInput.includes('supabase.co') || supKeyInput.length < 20) {
            showToast("Dados do Supabase inválidos.", "error");
            return;
        }
        reinitializeSupabase(supUrlInput, supKeyInput);
        showToast("Configurações salvas permanentemente!");
        setTimeout(() => window.location.reload(), 1000);
    };

    const handleTestConnection = async () => {
        setIsTestingConn(true);
        try {
            const result = await db.testConnection();
            setDiagLogs(result.logs);
            if (result.success) {
                showToast("Conexão estabelecida com sucesso!");
                setIsOnline(true);
            } else {
                showToast("Falha ao conectar no banco cloud.", "error");
            }
        } catch (e) {
            setDiagLogs(prev => [...prev, "❌ Erro inesperado no teste."]);
        } finally {
            setIsTestingConn(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as any;
        const email = form.email.value;
        try {
            setIsLoading(true);
            const user = await storageService.findUserByEmail(email);
            if (user) {
                setCurrentUser(user);
                saveToLocal(STORAGE_KEYS.SESSION, user);
                setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
                await refresh();
                showToast(`Olá, ${user.name.split(' ')[0]}!`);
            } else {
                showToast("Usuário não encontrado.", "error");
            }
        } catch (e) {
            showToast("Erro ao autenticar. Tente novamente.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicGenerate = async () => {
        if (!magicPrompt.trim() || !currentUser) return;
        setIsLoading(true);
        try {
            const result = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
            let title = "Novo Anúncio";
            let content = "";
            
            if (typeof result === 'object' && result !== null) {
                title = (result as any).title || title;
                content = (result as any).content || "";
            } else { content = result as string; }

            const imageUrl = await generateAdImage(`${title}: ${content}`);

            const newPost: Post = {
                id: 'p-' + Date.now(),
                authorId: currentUser.id,
                authorName: currentUser.name,
                category: currentUser.profession || 'Outros',
                title: title,
                content: content,
                whatsapp: currentUser.phone,
                phone: currentUser.phone,
                imageUrl: imageUrl,
                createdAt: new Date().toISOString()
            };

            await storageService.addPost(newPost);
            await refresh();
            setMagicPrompt('');
            showToast("IA criou seu anúncio com sucesso!");
        } catch (error) {
            showToast("Erro ao gerar conteúdo com IA.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        try {
            switch (currentView) {
                case 'ADMIN':
                    if (currentUser?.role !== UserRole.ADMIN) {
                        setCurrentView('HOME');
                        return <div className="p-20 text-center uppercase font-black">Redirecionando...</div>;
                    }
                    return (
                        <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-brand-dark pt-20 animate-in fade-in">
                            <aside className="w-full md:w-72 bg-brand-dark/50 border-r border-white/5 p-6 space-y-2">
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8 px-4 flex items-center gap-2">
                                    <ShieldAlert size={20} className="text-brand-accent"/> Admin Portal
                                </h2>
                                {[
                                    { id: 'INICIO', label: 'Painel Geral', icon: LayoutDashboard },
                                    { id: 'CLIENTES', label: 'Assinantes', icon: Users },
                                    { id: 'AJUSTES', label: 'Banco de Dados', icon: Database },
                                ].map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => setAdminSubView(item.id as AdminSubView)}
                                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all border ${adminSubView === item.id ? 'bg-brand-primary border-brand-primary text-white shadow-xl' : 'text-gray-400 border-transparent hover:bg-white/5'}`}
                                    >
                                        <item.icon size={18} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                                    </button>
                                ))}
                            </aside>

                            <main className="flex-1 p-8 overflow-y-auto">
                                {adminSubView === 'AJUSTES' && (
                                    <div className="max-w-4xl space-y-8 animate-in slide-in-from-right pb-20">
                                        <div className="glass-panel p-8 rounded-[40px] space-y-6 border-white/5">
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Credenciais Cloud</h3>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Supabase URL</label>
                                                <input value={supUrlInput} onChange={e => setSupUrlInput(e.target.value)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-sm text-white focus:border-brand-primary outline-none font-mono" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Supabase Anon Key</label>
                                                <input value={supKeyInput} onChange={e => setSupKeyInput(e.target.value)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-sm text-white focus:border-brand-primary outline-none font-mono" />
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                                <Button onClick={handleTestConnection} isLoading={isTestingConn} className="flex-1 h-16 text-xs font-black uppercase tracking-widest"><Activity size={18}/> Testar</Button>
                                                <Button variant="secondary" onClick={handleSaveDatabase} className="flex-1 h-16 text-xs font-black uppercase tracking-widest"><RefreshCcw size={18}/> Salvar e Conectar</Button>
                                            </div>
                                        </div>
                                        <div className="bg-black/40 rounded-[40px] p-8 border border-white/5">
                                            <div className="flex items-center gap-2 text-brand-accent mb-4"><Terminal size={18}/><h4 className="text-[11px] font-black uppercase tracking-widest">Logs de Conexão</h4></div>
                                            <div className="bg-black/90 rounded-2xl p-6 font-mono text-[10px] space-y-2 max-h-[300px] overflow-y-auto border border-white/5 text-gray-400">
                                                {diagLogs.map((log, i) => <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}>{log}</div>)}
                                                {diagLogs.length === 0 && <span className="italic">Nenhum teste executado.</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {adminSubView === 'CLIENTES' && (
                                    <div className="space-y-6 animate-in slide-in-from-right">
                                        <div className="grid grid-cols-1 gap-4">
                                            {allUsers.length > 0 ? allUsers.map(u => (
                                                <div key={u.id} className="glass-panel p-6 rounded-3xl flex items-center justify-between border border-white/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-brand-primary/20 rounded-2xl flex items-center justify-center text-brand-primary font-black uppercase text-xl">{u.name[0]}</div>
                                                        <div>
                                                            <h4 className="font-black text-white uppercase text-sm">{u.name}</h4>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{u.email} | Trial: {u.usedFreeTrial ? 'SIM' : 'NÃO'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{u.paymentStatus}</span>
                                                        <button onClick={() => { if(confirm(`Excluir ${u.name}?`)) db.deleteUser(u.id).then(refresh) }} className="p-3 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                                    </div>
                                                </div>
                                            )) : <p className="text-gray-500 text-center py-20 font-black text-xs uppercase">Sem usuários cadastrados.</p>}
                                        </div>
                                    </div>
                                )}

                                {adminSubView === 'INICIO' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom">
                                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-primary">
                                            <p className="text-6xl font-black text-white mb-2">{allUsers.length}</p>
                                            <span className="text-[11px] font-black text-gray-500 uppercase">Assinantes</span>
                                        </div>
                                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-secondary">
                                            <p className="text-6xl font-black text-white mb-2">{posts.length}</p>
                                            <span className="text-[11px] font-black text-gray-500 uppercase">Anúncios Ativos</span>
                                        </div>
                                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-accent">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <p className="text-2xl font-black text-white uppercase">{isOnline ? 'Conectado' : 'Desconectado'}</p>
                                            </div>
                                            <span className="text-[11px] font-black text-gray-500 uppercase">Status Cloud</span>
                                        </div>
                                    </div>
                                )}
                            </main>
                        </div>
                    );

                case 'LOGIN':
                case 'REGISTER':
                    return (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 pt-32 animate-in zoom-in pb-20">
                            <div className="glass-panel p-12 rounded-[50px] w-full max-w-md border border-white/10 shadow-2xl">
                                <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-10 text-center">{currentView === 'LOGIN' ? 'Acessar' : 'Cadastrar'}</h2>
                                <form onSubmit={currentView === 'LOGIN' ? handleLogin : async (e) => {
                                    e.preventDefault();
                                    const form = e.target as any;
                                    try {
                                        const u = await storageService.addUser({ 
                                            name: form.name.value, 
                                            email: form.email.value.toLowerCase(), 
                                            profession: form.profession.value, 
                                            phone: form.phone.value, 
                                            role: UserRole.ADVERTISER, 
                                            paymentStatus: PaymentStatus.AWAITING,
                                            usedFreeTrial: false 
                                        });
                                        setCurrentUser(u);
                                        saveToLocal(STORAGE_KEYS.SESSION, u);
                                        setCurrentView('PAYMENT');
                                        refresh();
                                    } catch (err) { showToast("Erro ao criar conta.", "error"); }
                                }} className="space-y-4">
                                    {currentView === 'REGISTER' && (
                                        <>
                                            <input name="name" required placeholder="Nome Completo ou Empresa" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                            <select name="profession" className="w-full bg-brand-dark border border-white/10 p-5 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest outline-none">
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <input name="phone" required placeholder="WhatsApp (ex: 11999998888)" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                        </>
                                    )}
                                    <input name="email" required type="email" placeholder="E-mail" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                    <input name="pass" required type="password" placeholder="Senha" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                    <Button type="submit" className="w-full h-20 text-lg uppercase font-black">
                                        {currentView === 'LOGIN' ? 'Entrar Agora' : 'Criar Conta'}
                                    </Button>
                                    <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-center text-[10px] font-black uppercase text-gray-500 hover:text-white mt-6 tracking-widest">
                                        {currentView === 'LOGIN' ? 'Criar uma nova conta gratuita' : 'Já sou um anunciante'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    );

                case 'PAYMENT':
                    if (!currentUser) { setCurrentView('LOGIN'); return null; }
                    return (
                        <div className="flex-1 max-w-7xl mx-auto px-4 pt-40 pb-20 animate-in zoom-in text-center">
                            <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-4">Escolha sua Ativação</h2>
                            <p className="text-gray-400 font-bold mb-16 italic opacity-80">Mantenha seus anúncios ativos e em destaque no portal.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {storageService.getPlans().map(p => {
                                    const isFreeTrial = p.price === 0;
                                    const alreadyUsed = !!currentUser.usedFreeTrial;
                                    const blocked = isFreeTrial && alreadyUsed;

                                    return (
                                        <div 
                                            key={p.id} 
                                            onClick={() => {
                                                if (blocked) {
                                                    showToast("O plano de degustação só pode ser usado uma vez por usuário.", "error");
                                                    return;
                                                }
                                                const expiresAt = new Date();
                                                expiresAt.setDate(expiresAt.getDate() + p.durationDays);
                                                
                                                storageService.updateUser({ 
                                                    ...currentUser, 
                                                    planId: p.id, 
                                                    paymentStatus: isFreeTrial ? PaymentStatus.CONFIRMED : PaymentStatus.AWAITING,
                                                    expiresAt: expiresAt.toISOString(),
                                                    usedFreeTrial: alreadyUsed || isFreeTrial 
                                                }).then(() => {
                                                    refresh();
                                                    setCurrentView('DASHBOARD');
                                                    showToast(isFreeTrial ? "Degustação ativada!" : "Plano aguardando pagamento.");
                                                });
                                            }} 
                                            className={`glass-panel p-10 rounded-[50px] border-2 transition-all relative shadow-2xl ${blocked ? 'opacity-40 grayscale cursor-not-allowed border-white/5' : 'border-white/5 hover:border-brand-primary cursor-pointer hover:scale-[1.02] group'}`}
                                        >
                                            {blocked && (
                                                <div className="absolute top-10 -right-10 bg-red-600 text-white py-1.5 px-12 rotate-45 text-[8px] font-black uppercase shadow-xl z-20">UTILIZADO</div>
                                            )}
                                            {blocked ? <Lock size={32} className="mx-auto text-gray-600 mb-6"/> : <Tag size={32} className="mx-auto text-brand-primary mb-6 group-hover:scale-110 transition-transform"/>}
                                            
                                            <h3 className="text-xl font-black text-white uppercase mb-4">{p.name}</h3>
                                            <p className="text-4xl font-black text-brand-secondary mb-2">R$ {p.price.toFixed(2)}</p>
                                            <p className="text-[10px] text-gray-500 font-black uppercase mb-10 tracking-widest">{p.durationDays} Dias</p>
                                            <p className="text-[11px] text-gray-400 font-bold italic mb-10 leading-relaxed">"{p.description}"</p>
                                            <Button disabled={blocked} variant={isFreeTrial ? "outline" : "primary"} className="w-full h-14 uppercase text-[10px] font-black">
                                                {blocked ? "Indisponível" : "Selecionar Plano"}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );

                case 'DASHBOARD':
                    if (!currentUser) { setCurrentView('LOGIN'); return null; }
                    const myPosts = posts.filter(p => p.authorId === currentUser.id);
                    return (
                        <div className="pt-28 pb-40 max-w-6xl mx-auto px-4 animate-in slide-in-from-bottom">
                             <div className="bg-gradient-to-r from-brand-primary via-purple-600 to-brand-secondary p-[1px] rounded-[40px] mb-12 shadow-3xl">
                                <div className="bg-brand-dark rounded-[39px] p-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-4 bg-brand-primary/20 rounded-3xl"><Wand2 className="text-brand-primary" size={32}/></div>
                                        <div>
                                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Gerador Mágico IA</h2>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Criação instantânea de anúncios e imagens publicitárias.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Descreva o que quer anunciar..." className="flex-1 bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary transition-all text-sm" />
                                        <Button onClick={handleMagicGenerate} isLoading={isLoading} className="h-20 md:w-64 font-black text-sm uppercase tracking-widest">Gerar Agora</Button>
                                    </div>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {myPosts.map(p => <PostCard key={p.id} post={p} author={currentUser} />)}
                             </div>
                        </div>
                    );

                case 'HOME':
                default:
                    const confirmedPosts = posts.filter(p => {
                        const author = allUsers.find(u => u.id === p.authorId);
                        return author?.paymentStatus === PaymentStatus.CONFIRMED || p.authorId === 'admin';
                    });
                    return (
                        <div className="animate-in fade-in duration-1000 pb-40">
                            <section className="relative pt-48 pb-24 text-center">
                                <div className="max-w-7xl mx-auto px-4 relative z-10">
                                    <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-brand-accent uppercase tracking-widest mb-8">Comunicação e Credibilidade</div>
                                    <h1 className="text-6xl md:text-8xl font-black text-white mb-8 uppercase tracking-tighter leading-none">{siteConfig.heroTitle}</h1>
                                    <p className="text-xl text-gray-400 italic mb-14 max-w-xl mx-auto opacity-80">"{siteConfig.heroSubtitle}"</p>
                                    <div className="flex justify-center gap-5">
                                        <Button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})} className="h-16 px-10 font-black uppercase text-xs tracking-widest">Ver Ofertas</Button>
                                        <Button variant="outline" onClick={() => setCurrentView('REGISTER')} className="h-16 px-10 font-black uppercase text-xs tracking-widest">Anunciar Aqui</Button>
                                    </div>
                                </div>
                            </section>

                            <section id="ads" className="max-w-7xl mx-auto px-4 mt-20">
                                 <AdSlider ads={confirmedPosts.slice(0, 5)} allUsers={allUsers} />
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-20">
                                    {confirmedPosts.map(p => <PostCard key={p.id} post={p} author={allUsers.find(u => u.id === p.authorId)} />)}
                                 </div>
                            </section>
                        </div>
                    );
            }
        } catch (err) {
            console.error("Erro fatal render:", err);
            return <div className="p-20 text-center uppercase font-black">Sistema reiniciando...</div>;
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
            <Navbar 
                currentUser={currentUser} 
                setCurrentView={setCurrentView} 
                currentView={currentView} 
                onLogout={() => { localStorage.removeItem(STORAGE_KEYS.SESSION); setCurrentUser(null); setCurrentView('HOME'); refresh(); }} 
                config={siteConfig} 
                isOnline={isOnline} 
            />
            <main className="flex-1 flex flex-col">{renderContent()}</main>
            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-10 py-5 rounded-[30px] shadow-3xl border flex items-center gap-4 animate-in slide-in-from-bottom ${toast.t === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
                    <span className="font-black uppercase text-[10px] tracking-widest text-white">{toast.m}</span>
                </div>
            )}
            {isLoading && (
                <div className="fixed inset-0 z-[500] bg-brand-dark/80 backdrop-blur-xl flex items-center justify-center">
                    <Loader2 className="animate-spin text-brand-primary" size={60} />
                </div>
            )}
        </div>
    );
};

export default App;
