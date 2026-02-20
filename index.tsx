
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { ChatBot } from './components/ChatBot';
import { 
    Trash2, Edit, Users, Check, X, Settings, CreditCard, Layers, PlusCircle, Save, Radio, Mic, Star, Phone, Image as ImageIcon, Zap, LayoutDashboard, Shield, Loader2, Send, LogOut, Clock, Crown, ArrowRight, Ban
} from 'lucide-react';

const SESSION_KEY = 'helio_junior_vip_session_v10';
const ADMIN_WHATSAPP = '5534999982000';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<string>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({
        heroLabel: 'Hélio Júnior',
        heroTitle: 'Voz que Vende',
        heroSubtitle: 'Seu portal de classificados com o impacto do rádio digital.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920',
        bannerFooterUrl: 'https://images.unsplash.com/photo-1514320291944-9e1aabc932bb?auto=format&fit=crop&q=80&w=1920',
        whatsapp: '5534999982000',
        phone: '34999982000',
        instagram: '@heliojunior',
        facebook: 'heliojunior'
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Comércio');

    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

    const showToast = useCallback((m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64Array: string[]) => void, multiple = true) => {
        const files = Array.from(e.target.files || []).slice(0, multiple ? 5 : 1);
        const results: string[] = [];
        let processed = 0;
        if (files.length === 0) return;

        files.forEach(file => {
            if (file.size > 2 * 1024 * 1024) {
                showToast(`Foto ${file.name} muito grande. Use fotos menores que 2MB.`, 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                results.push(reader.result as string);
                processed++;
                if (processed === files.length) callback(results);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
    };

    const refreshData = async () => {
        setIsLoadingData(true);
        try {
            await db.init(); 
            const [p, u, pl, cfg, cats] = await Promise.all([
                db.getPosts(), db.getUsers(), db.getPlans(), db.getConfig(), db.getCategories()
            ]);
            if (p) setPosts(p);
            if (u) setAllUsers(u);
            if (pl) setPlans(pl);
            if (cfg && cfg.heroTitle) setSiteConfig(prev => ({...prev, ...cfg}));
            if (cats) setCategories(cats);
            
            if (currentUser) {
                const fresh = u.find((usr: User) => usr.email.toLowerCase() === currentUser.email.toLowerCase());
                if (fresh) {
                    if (fresh.status === 'BLOCKED') {
                        handleLogout();
                        showToast("Sua conta foi bloqueada.", "error");
                        return;
                    }
                    setCurrentUser(fresh);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                }
            }
        } catch (err) {
            console.error("Erro ao carregar dados:", err);
        } finally { setIsLoadingData(false); }
    };

    useEffect(() => { refreshData(); }, []);

    const planCountdown = useMemo(() => {
        if (!currentUser?.expiresAt) return null;
        const diff = new Date(currentUser.expiresAt).getTime() - new Date().getTime();
        if (diff <= 0) return "Expirado";
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return `${days} dias restantes`;
    }, [currentUser]);

    const userPosts = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === UserRole.ADMIN) return posts;
        return posts.filter(p => p.authorId === currentUser.id);
    }, [posts, currentUser]);

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={!isLoadingData} />
            
            <main className="flex-1">
                {currentView === 'HOME' && (
                    <div className="animate-in fade-in duration-700">
                        <section className="pt-24 pb-8 lg:pt-28 lg:pb-10 px-6">
                            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div className="space-y-5 text-center lg:text-left">
                                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-orange-600/10 border border-orange-600/20 text-[9px] font-black uppercase tracking-[0.3em] text-orange-500">
                                        <Radio size={14} className="animate-pulse" /> {siteConfig.heroLabel}
                                    </div>
                                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                                        Voz que <span className="text-orange-600">Vende</span> e Conecta
                                    </h1>
                                    <p className="text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                                        {siteConfig.heroSubtitle}
                                    </p>
                                    <div className="flex flex-wrap gap-4 pt-4 justify-center lg:justify-start">
                                        <button onClick={() => setCurrentView('REGISTER')} className="h-14 px-10 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-orange-600/20 transition-all transform hover:-translate-y-1">Anunciar Agora</button>
                                        <button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})} className="h-14 px-10 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-white/10 transition-all">Ver Parceiros</button>
                                    </div>
                                </div>
                                <div className="relative glass-panel p-2 rounded-[35px] overflow-hidden aspect-video border-white/10 hidden lg:block">
                                    <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover rounded-[30px]" alt="Hero Image" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent" />
                                </div>
                            </div>
                        </section>

                        <section id="ads" className="max-w-7xl mx-auto px-6 py-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
                                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Tempo Real</span>
                                    </div>
                                    <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Parceiros VIP</h2>
                                </div>
                            </div>
                            {posts.length === 0 ? (
                                <div className="text-center py-20 bg-white/[0.02] rounded-[40px] border border-dashed border-white/10">
                                    <p className="opacity-30 italic font-black uppercase text-[10px] tracking-widest">Aguardando novos anúncios...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {posts.map(p => <PostCard key={p.id} post={p} />)}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-dark pt-16">
                        <div className="glass-panel p-10 md:p-14 rounded-[50px] w-full max-w-xl text-center shadow-3xl border-orange-600/10">
                            <h2 className="text-4xl font-black text-white uppercase mb-8 tracking-tighter">{currentView === 'LOGIN' ? 'Login VIP' : 'Cadastro VIP'}</h2>
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
                                        } else showToast("Acesso Negado ou Conta Bloqueada", "error");
                                    } else {
                                        const newUser = await db.addUser({ 
                                            name: fd.get('name') as string, email: fd.get('email') as string, password: fd.get('password') as string, 
                                            phone: fd.get('phone') as string, role: UserRole.ADVERTISER, paymentStatus: PaymentStatus.CONFIRMED,
                                            status: 'ACTIVE'
                                        });
                                        if (newUser) { 
                                            setCurrentUser(newUser); localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
                                            setCurrentView('DASHBOARD'); 
                                        }
                                    }
                                } finally { setIsLoggingIn(false); }
                            }} className="space-y-4">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="NOME OU EMPRESA" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 uppercase text-[10px] font-black tracking-widest" />
                                        <input name="phone" required placeholder="WHATSAPP (DDD)" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 uppercase text-[10px] font-black tracking-widest" />
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="E-MAIL" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 uppercase text-[10px] font-black tracking-widest" />
                                <input name="password" required type="password" placeholder="SENHA" className="w-full bg-white/5 border border-white/10 p-5 rounded-[20px] text-white outline-none focus:border-orange-500 uppercase text-[10px] font-black tracking-widest" />
                                <button type="submit" className="w-full h-14 bg-orange-600 text-white rounded-[20px] font-black uppercase text-[11px] shadow-xl flex items-center justify-center gap-3 hover:bg-orange-700 transition-all">
                                    {isLoggingIn && <Loader2 className="animate-spin" size={20}/>} {currentView === 'LOGIN' ? 'Entrar Agora' : 'Finalizar Cadastro'}
                                </button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-6 hover:text-white transition-colors">
                                    {currentView === 'LOGIN' ? 'Não tem conta? Cadastre-se aqui' : 'Já sou assinante'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {currentView === 'DASHBOARD' && currentUser && (
                   <div className="pt-24 pb-32 max-w-7xl mx-auto px-6">
                        <h2 className="text-3xl font-black text-white uppercase mb-8">Olá, {currentUser.name}</h2>
                        <Button onClick={() => setEditingPost({ title: '', content: '', category: 'Comércio', imageUrls: [] })}>
                             <PlusCircle size={20}/> Criar Novo Anúncio
                        </Button>
                   </div>
                )}
            </main>

            <footer className="bg-brand-panel border-t border-white/5 pt-16 pb-10 mt-auto">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                {siteConfig.headerLogoUrl ? <img src={siteConfig.headerLogoUrl} className="h-10 w-auto" /> : <Radio className="text-orange-600" size={32} />}
                                <span className="text-xl font-black text-white uppercase tracking-tighter">Hélio Júnior</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed uppercase font-bold tracking-widest">Publicidade digital com o impacto do rádio que você conhece.</p>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.3em]">Navegação</h4>
                            <ul className="space-y-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <li><button onClick={() => setCurrentView('HOME')} className="hover:text-orange-500 transition-colors">Página Inicial</button></li>
                                <li><button onClick={() => setCurrentView('REGISTER')} className="hover:text-orange-500 transition-colors">Ver Planos</button></li>
                                <li><button onClick={() => setCurrentView('LOGIN')} className="hover:text-orange-500 transition-colors">Login Membro</button></li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.3em]">Atendimento</h4>
                            <ul className="space-y-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <li className="flex items-center gap-3"><Phone size={14} className="text-orange-500"/> {siteConfig.phone}</li>
                                <li className="flex items-center gap-3 text-green-500 cursor-pointer" onClick={() => window.open(`https://wa.me/${siteConfig.whatsapp}`, '_blank')}><Send size={14}/> WhatsApp</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/5 pt-8 text-[9px] font-black uppercase text-gray-600 tracking-[0.3em] flex flex-col md:flex-row justify-between items-center gap-4">
                        <p>&copy; 2024 HÉLIO JÚNIOR - VOZ QUE VENDE. TODOS OS DIREITOS RESERVADOS.</p>
                        <p className="flex items-center gap-2">PLATAFORMA DIGITAL <Zap size={10} className="text-orange-500"/></p>
                    </div>
                </div>
            </footer>

            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-full font-black uppercase text-[9px] tracking-[0.2em] shadow-2xl animate-in slide-in-from-bottom duration-300 flex items-center gap-3 ${toast.t === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.t === 'success' ? <Check size={14}/> : <X size={14}/>} {toast.m}
                </div>
            )}
            
            <ChatBot whatsapp={siteConfig.whatsapp || ADMIN_WHATSAPP} />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
}
export default App;
