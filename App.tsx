
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
    ShieldAlert, Info
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
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    // Persistência Reativa das Chaves
    const [supUrl, setSupUrl] = useState(() => localStorage.getItem('supabase_url_manual') || '');
    const [supKey, setSupKey] = useState(() => localStorage.getItem('supabase_key_manual') || '');

    useEffect(() => {
        localStorage.setItem('supabase_url_manual', supUrl.trim());
        localStorage.setItem('supabase_key_manual', supKey.trim());
    }, [supUrl, supKey]);

    const adContentRef = useRef<HTMLTextAreaElement>(null);
    const adTitleRef = useRef<HTMLInputElement>(null);

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
                if (fresh) setCurrentUser(fresh);
            }
        } catch (e) {
            console.error("Erro crítico ao atualizar dados:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        storageService.init().then(refresh);
    }, []);

    const handleTestConnection = async () => {
        setIsTestingConn(true);
        setDiagLogs(["⏳ Analisando rede e conexão..."]);
        try {
            const result = await db.testConnection();
            setDiagLogs(result.logs);
            if (result.success) {
                showToast("Conexão Verificada!");
                setIsOnline(true);
            } else {
                showToast("Falha técnica detectada.", "error");
                setIsOnline(false);
            }
        } catch (e) {
            setDiagLogs(prev => [...prev, "❌ Erro inesperado durante o diagnóstico."]);
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
                showToast(`Bem-vindo, ${user.name}!`);
            } else {
                showToast("Email não encontrado no sistema.", "error");
            }
        } catch (e) {
            showToast("Erro ao tentar fazer login. Verifique sua rede.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Fix: Implemented handleMagicGenerate to handle AI-powered ad generation
    const handleMagicGenerate = async () => {
        if (!magicPrompt.trim() || !currentUser) return;
        setIsLoading(true);
        try {
            // Gera copy usando Gemini
            const result = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
            let title = "Novo Anúncio";
            let content = "";
            
            if (typeof result === 'object' && result !== null) {
                title = (result as any).title || title;
                content = (result as any).content || "";
            } else {
                content = result as string;
            }

            // Gera imagem usando Gemini
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
            showToast("Anúncio gerado com sucesso!");
        } catch (error) {
            console.error("Erro no gerador mágico:", error);
            showToast("Falha ao gerar conteúdo.", "error");
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
                                    <ShieldAlert size={20} className="text-brand-accent"/> Administração
                                </h2>
                                {[
                                    { id: 'INICIO', label: 'Resumo', icon: LayoutDashboard },
                                    { id: 'CLIENTES', label: 'Assinantes', icon: Users },
                                    { id: 'ANUNCIOS', label: 'Todos Anúncios', icon: ImageIcon },
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
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Conexão com Banco de Dados</h3>
                                        <div className="glass-panel p-8 rounded-[40px] space-y-6 border-white/5">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">URL Supabase (Salva ao digitar)</label>
                                                <input value={supUrl} onChange={e => setSupUrl(e.target.value)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-sm text-white focus:border-brand-primary outline-none" placeholder="Ex: https://xxx.supabase.co" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Anon Key (Salva ao digitar)</label>
                                                <input value={supKey} onChange={e => setSupKey(e.target.value)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-sm text-white focus:border-brand-primary outline-none" placeholder="Sua chave secreta do projeto..." />
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <Button onClick={handleTestConnection} isLoading={isTestingConn} className="flex-1 h-16 uppercase text-xs font-black"><Activity size={18}/> Testar Conexão</Button>
                                                <Button variant="outline" onClick={() => { reinitializeSupabase(supUrl, supKey); window.location.reload(); }} className="flex-1 h-16 uppercase text-xs font-black"><RefreshCcw size={18}/> Aplicar Alterações</Button>
                                            </div>
                                        </div>
                                        <div className="glass-panel p-8 rounded-[40px] border-white/5">
                                            <div className="flex items-center gap-2 text-brand-accent mb-4"><Terminal size={18}/><h4 className="text-[11px] font-black uppercase tracking-widest">Relatório Técnico</h4></div>
                                            <div className="bg-black/90 rounded-2xl p-6 font-mono text-[10px] space-y-2 max-h-[300px] overflow-y-auto border border-white/5 text-gray-400">
                                                {diagLogs.map((log, i) => <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}>{log}</div>)}
                                                {diagLogs.length === 0 && <span className="italic">Clique em "Testar Conexão" para ver os logs.</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {adminSubView === 'CLIENTES' && (
                                    <div className="space-y-6 animate-in slide-in-from-right">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Gerenciamento de Assinantes</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {allUsers.length > 0 ? allUsers.map(u => (
                                                <div key={u.id} className="glass-panel p-6 rounded-3xl flex items-center justify-between border border-white/5 hover:border-brand-primary/20 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-brand-primary/20 rounded-2xl flex items-center justify-center text-brand-primary font-black uppercase text-xl">{u.name[0]}</div>
                                                        <div>
                                                            <h4 className="font-black text-white uppercase text-sm">{u.name}</h4>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{u.email} | {u.profession}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{u.paymentStatus}</span>
                                                        <button onClick={() => { if(confirm(`Deseja excluir ${u.name}?`)) db.deleteUser(u.id).then(refresh) }} className="p-3 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                                    </div>
                                                </div>
                                            )) : <p className="text-gray-500 italic uppercase font-black text-xs text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">Nenhum cliente cadastrado no banco.</p>}
                                        </div>
                                    </div>
                                )}

                                {adminSubView === 'INICIO' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom">
                                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-primary">
                                            <p className="text-6xl font-black text-white mb-2">{allUsers.length}</p>
                                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Assinantes Atuais</span>
                                        </div>
                                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-secondary">
                                            <p className="text-6xl font-black text-white mb-2">{posts.length}</p>
                                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Anúncios no Ar</span>
                                        </div>
                                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-accent">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <p className="text-2xl font-black text-white uppercase tracking-tighter">{isOnline ? 'Online' : 'Erro'}</p>
                                            </div>
                                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Status Database</span>
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
                            <div className="glass-panel p-12 rounded-[50px] w-full max-w-md border border-white/10 shadow-2xl mb-8">
                                <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-10 text-center">{currentView === 'LOGIN' ? 'Entrar' : 'Cadastro'}</h2>
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
                                            paymentStatus: PaymentStatus.AWAITING 
                                        });
                                        setCurrentUser(u);
                                        saveToLocal(STORAGE_KEYS.SESSION, u);
                                        setCurrentView('PAYMENT');
                                        refresh();
                                    } catch (err) { showToast("Erro ao criar cadastro.", "error"); }
                                }} className="space-y-4">
                                    {currentView === 'REGISTER' && (
                                        <>
                                            <input name="name" required placeholder="Seu Nome ou Empresa" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary font-bold transition-all" />
                                            <select name="profession" className="w-full bg-brand-dark border border-white/10 p-5 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest outline-none cursor-pointer">
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <input name="phone" required placeholder="WhatsApp (DDD + Número)" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary font-bold transition-all" />
                                        </>
                                    )}
                                    <input name="email" required type="email" placeholder="Seu E-mail" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary font-bold transition-all" />
                                    <input name="pass" required type="password" placeholder="Sua Senha" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-brand-primary font-bold transition-all" />
                                    <Button type="submit" className="w-full h-20 text-lg uppercase font-black shadow-lg">
                                        {currentView === 'LOGIN' ? 'Acessar Painel' : 'Registrar Agora'}
                                    </Button>
                                    <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-center text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all mt-6 tracking-widest">
                                        {currentView === 'LOGIN' ? 'Ainda não é assinante? Cadastre-se' : 'Já possui conta? Clique para entrar'}
                                    </button>
                                </form>
                                
                                <div className="mt-10 pt-8 border-t border-white/5 text-center flex flex-col items-center gap-4">
                                    <button 
                                        onClick={() => setShowDiag(!showDiag)}
                                        className="text-[10px] font-black uppercase text-brand-primary flex items-center gap-2 hover:scale-105 transition-all"
                                    >
                                        <Terminal size={12}/> Problemas de Conexão? Diagnosticar
                                    </button>
                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[8px] font-black uppercase ${isOnline ? 'text-green-500 bg-green-500/5 border border-green-500/10' : 'text-red-500 bg-red-500/5 border border-red-500/10'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                        Banco de Dados: {isOnline ? 'Conectado' : 'Offline'}
                                    </div>
                                </div>
                            </div>

                            {showDiag && (
                                <div className="w-full max-w-md animate-in slide-in-from-top duration-300">
                                    <div className="glass-panel p-8 rounded-[40px] border-brand-primary/20 bg-black/40">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2"><Terminal size={14}/> Console Técnico</h4>
                                            <button onClick={handleTestConnection} disabled={isTestingConn} className="text-[10px] font-black uppercase text-brand-accent hover:underline">Executar Teste</button>
                                        </div>
                                        <div className="bg-black/90 rounded-2xl p-6 font-mono text-[9px] space-y-1.5 max-h-[250px] overflow-y-auto border border-white/5 text-gray-400">
                                            {diagLogs.length > 0 ? diagLogs.map((log, i) => (
                                                <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}>{log}</div>
                                            )) : <span className="italic">Clique em "Executar Teste" para analisar a conexão.</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );

                case 'DASHBOARD':
                    if (!currentUser) {
                        setCurrentView('LOGIN');
                        return <div className="p-20 text-center uppercase font-black">Carregando Login...</div>;
                    }
                    const myPosts = posts.filter(p => p.authorId === currentUser.id);
                    return (
                        <div className="pt-28 pb-40 max-w-6xl mx-auto px-4 animate-in slide-in-from-bottom">
                             <div className="bg-gradient-to-r from-brand-primary via-purple-600 to-brand-secondary p-[1px] rounded-[40px] mb-12 shadow-3xl">
                                <div className="bg-brand-dark rounded-[39px] p-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-4 bg-brand-primary/20 rounded-3xl"><Wand2 className="text-brand-primary" size={32}/></div>
                                        <div>
                                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Criação Mágica IA</h2>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">A IA cria o conteúdo e a imagem para você.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Ex: Vendo marmitex caseira com entrega rápida..." className="flex-1 bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-brand-primary transition-all text-sm" />
                                        <Button onClick={handleMagicGenerate} isLoading={isLoading} className="h-20 md:w-64 font-black text-sm uppercase tracking-widest">Gerar Anúncio</Button>
                                    </div>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-3 mb-10 px-4">
                                <ImageIcon className="text-brand-secondary" size={24}/>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Meus Classificados</h3>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {myPosts.map(p => <PostCard key={p.id} post={p} author={currentUser} />)}
                                {myPosts.length === 0 && (
                                    <div className="md:col-span-2 lg:col-span-3 py-32 bg-white/5 rounded-[50px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center px-10">
                                        <div className="p-6 bg-white/5 rounded-full mb-6 text-gray-600"><Plus size={48}/></div>
                                        <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Você ainda não publicou nada. Use o gerador acima para começar!</p>
                                    </div>
                                )}
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
                            <section className="relative pt-48 pb-24 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-dark to-brand-secondary/5" />
                                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                                    <div className="text-center lg:text-left">
                                        <div className="inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-8">Portal Oficial Hélio Júnior</div>
                                        <h1 className="text-6xl md:text-8xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.9]">{siteConfig.heroTitle}</h1>
                                        <p className="text-xl text-gray-400 italic mb-14 max-w-xl mx-auto lg:mx-0">"{siteConfig.heroSubtitle}"</p>
                                        <div className="flex flex-wrap gap-5 justify-center lg:justify-start">
                                            <Button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})} className="h-16 px-10 font-black">Explorar Negócios</Button>
                                            <Button variant="outline" onClick={() => setCurrentView('REGISTER')} className="h-16 px-10 font-black">Anunciar Agora</Button>
                                        </div>
                                    </div>
                                    <div className="aspect-video rounded-[60px] overflow-hidden border border-white/10 shadow-3xl group relative">
                                        <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105" alt="Hélio Júnior" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent" />
                                    </div>
                                </div>
                            </section>

                            <section className="max-w-7xl mx-auto px-4 mb-32 relative z-10">
                                 <div className="flex items-center gap-3 mb-10 px-4">
                                    <Sparkles className="text-brand-accent animate-pulse" size={20}/>
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Principais Destaques</h3>
                                 </div>
                                 <AdSlider ads={confirmedPosts.slice(0, 10)} allUsers={allUsers} />
                            </section>

                            <section id="ads" className="max-w-7xl mx-auto px-4">
                                 <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-10 px-4">
                                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter">Classificados</h2>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        <button onClick={() => setFilterCategory('ALL')} className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filterCategory === 'ALL' ? 'bg-white text-brand-dark border-white' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>Todos</button>
                                        {categories.map(c => <button key={c} onClick={() => setFilterCategory(c)} className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filterCategory === c ? 'bg-brand-primary text-white border-brand-primary shadow-xl shadow-brand-primary/20' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>{c}</button>)}
                                    </div>
                                 </div>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                    {confirmedPosts.filter(p => filterCategory === 'ALL' || p.category === filterCategory).map(p => (
                                        <PostCard key={p.id} post={p} author={allUsers.find(u => u.id === p.authorId)} />
                                    ))}
                                    {confirmedPosts.length === 0 && (
                                        <div className="col-span-full py-40 text-center glass-panel rounded-[50px] border-dashed border-2 border-white/10">
                                            <Info size={40} className="mx-auto text-gray-700 mb-4"/>
                                            <p className="text-gray-600 font-black uppercase text-xs tracking-widest">Nenhum anúncio ativo no momento.</p>
                                        </div>
                                    )}
                                 </div>
                            </section>
                        </div>
                    );
            }
        } catch (err) {
            console.error("Erro fatal na renderização da view:", err);
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in">
                    <AlertTriangle size={64} className="text-red-500 mb-6" />
                    <h2 className="text-3xl font-black text-white uppercase mb-4">Erro de Interface</h2>
                    <p className="text-gray-400 mb-8 max-w-md">Algo deu errado ao carregar esta tela. Tente recarregar a página ou voltar para o início.</p>
                    <Button onClick={() => { setCurrentView('HOME'); window.location.reload(); }}>Recarregar Sistema</Button>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans selection:bg-brand-primary selection:text-white">
            <Navbar 
                currentUser={currentUser} 
                setCurrentView={setCurrentView} 
                currentView={currentView} 
                onLogout={() => { localStorage.removeItem(STORAGE_KEYS.SESSION); setCurrentUser(null); setCurrentView('HOME'); refresh(); }} 
                config={siteConfig} 
                isOnline={isOnline} 
            />
            
            <main className="flex-1 flex flex-col">
                {renderContent()}
            </main>

            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-10 py-5 rounded-[30px] shadow-3xl border flex items-center gap-4 animate-in slide-in-from-bottom duration-500 backdrop-blur-xl ${toast.t === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
                    {toast.t === 'success' ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}
                    <span className="font-black uppercase text-xs tracking-[0.1em]">{toast.m}</span>
                </div>
            )}

            {isLoading && (
                <div className="fixed inset-0 z-[500] bg-brand-dark/80 backdrop-blur-xl flex items-center justify-center">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <Loader2 className="animate-spin text-brand-primary" size={80} strokeWidth={1} />
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-accent animate-pulse" size={24} />
                        </div>
                        <span className="text-[11px] font-black text-brand-primary uppercase tracking-[0.3em] animate-pulse">Sincronizando Banco de Dados</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
