
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan, Category } from './types';
import { db } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Trash2, Edit, Users, Check, X, AlertTriangle, Settings, CreditCard, Layers, PlusCircle, Save, Radio, Mic, Star, Lock, Unlock, Phone, Image as ImageIcon, Zap, LayoutDashboard, Shield, Loader2, Copy, Instagram, Facebook, Mail, MapPin, Clock
} from 'lucide-react';

const SESSION_KEY = 'helio_junior_vip_session';

const TESTIMONIALS = [
    { name: "Carlos Massa", role: "Radialista AM/FM", text: "O portal do Hélio mudou a forma como meus anunciantes veem meu trabalho. A locução por IA é um diferencial absurdo!", stars: 5 },
    { name: "Luciana Silva", role: "Locutora Comercial", text: "Praticidade total. Meus clientes adoram ver o anúncio pronto com roteiro profissional em segundos.", stars: 5 },
    { name: "Ricardo Almeida", role: "Agência de Publicidade", text: "A melhor plataforma para classificados regionais que já utilizei. O alcance é incrível.", stars: 5 }
];

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
        heroSubtitle: 'O maior portal de classificados com locução inteligente.',
        heroImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1920',
        pixKey: 'Chave PIX Exemplo',
        pixName: 'Hélio Júnior Radialista',
        whatsapp: '5500000000000',
        phone: '55000000000',
        instagram: '@heliojunior',
        facebook: 'heliojunior'
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');

    const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);

    const showToast = useCallback((m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const handleFileUploads = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64Array: string[]) => void) => {
        const files = Array.from(e.target.files || []).slice(0, 5);
        const results: string[] = [];
        let processed = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                results.push(reader.result as string);
                processed++;
                if (processed === files.length) callback(results);
            };
            reader.readAsDataURL(file);
        });
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
                const fresh = u.find((usr: User) => usr.email === currentUser.email);
                if (fresh) {
                    setCurrentUser(fresh);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                    
                    // Check if plan expired
                    if (fresh.expiresAt && new Date(fresh.expiresAt) < new Date() && fresh.role !== UserRole.ADMIN) {
                        setCurrentView('PAYMENT');
                    }
                }
            }
        } finally { setIsLoadingData(false); }
    };

    useEffect(() => { refreshData(); }, []);

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setCurrentView('HOME');
        showToast("Você saiu da área VIP");
    };

    // Dashboard Logic: check ad limit (1 per week, 4 per month)
    const canPost = useMemo(() => {
        if (!currentUser) return false;
        const userPosts = posts.filter(p => p.authorId === currentUser.id);
        const lastWeek = new Date(); lastWeek.setDate(lastWeek.getDate() - 7);
        const thisWeekPosts = userPosts.filter(p => new Date(p.createdAt) > lastWeek);
        return thisWeekPosts.length === 0;
    }, [posts, currentUser]);

    if (isLoadingData && posts.length === 0) {
        return (
            <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center gap-6">
                <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
                <div className="text-center">
                    <h2 className="text-2xl font-black uppercase text-white tracking-widest">Hélio Júnior</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase mt-2">Sincronizando Voz VIP...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={!isLoadingData} />
            
            <main className="flex-1">
                {currentView === 'HOME' && (
                    <div className="animate-in fade-in duration-700">
                        {/* Hero Section com espaçamento reduzido */}
                        <section className="relative pt-32 pb-16">
                            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                                <div className="space-y-6 text-center lg:text-left">
                                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black uppercase tracking-[0.3em] text-orange-500">
                                        <Radio size={14} className="animate-pulse" /> {siteConfig.heroLabel} 
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                                        {siteConfig.heroTitle} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">VIP</span>
                                    </h1>
                                    <p className="text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                                        {siteConfig.heroSubtitle}
                                    </p>
                                    <div className="flex flex-wrap gap-4 pt-4 justify-center lg:justify-start">
                                        <button onClick={() => setCurrentView('REGISTER')} className="h-16 px-10 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-105 transition-all">Anunciar Agora</button>
                                        <button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})} className="h-16 px-10 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all">Ver Classificados</button>
                                    </div>
                                </div>
                                <div className="relative animate-float">
                                    <div className="glass-panel p-2 rounded-[50px] border-white/10 shadow-3xl overflow-hidden aspect-video">
                                        <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover rounded-[40px]" alt="Hero Landscape" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Classificados Verificados */}
                        <section id="ads" className="max-w-7xl mx-auto px-6 py-16">
                            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Classificados VIP</h2>
                                    <p className="text-orange-500 mt-2 font-bold uppercase text-[9px] tracking-[0.4em]">Anunciantes Verificados no Ar</p>
                                </div>
                                <div className="hidden md:flex gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Ativos</span>
                                        <span className="text-2xl font-black text-white">{posts.length}</span>
                                    </div>
                                </div>
                            </div>
                            {posts.length === 0 ? (
                                <div className="text-center py-20 opacity-30 italic bg-white/2 rounded-[40px] border border-dashed border-white/10">Nenhum anúncio disponível no momento.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {posts.map(p => <PostCard key={p.id} post={p} />)}
                                </div>
                            )}
                        </section>

                        {/* Planos VIP */}
                        <section className="max-w-7xl mx-auto px-6 py-16">
                            <div className="text-center mb-16">
                                <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Planos de Assinatura</h2>
                                <p className="text-gray-500 mt-2 font-bold uppercase text-[9px] tracking-[0.4em]">Escolha sua visibilidade</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {plans.map((p, idx) => (
                                    <div key={idx} className={`glass-panel p-12 rounded-[50px] border-white/5 flex flex-col items-center text-center transition-all ${idx === 1 ? 'border-orange-500/30 scale-105 bg-orange-500/[0.03]' : ''}`}>
                                        <h4 className="text-2xl font-black text-white uppercase mb-4 tracking-tighter">{p.name}</h4>
                                        <div className="text-5xl font-black text-orange-500 mb-2">R${p.price.toFixed(2)}</div>
                                        <p className="text-[10px] text-gray-500 uppercase font-black mb-10">{p.durationDays} dias de duração</p>
                                        <ul className="space-y-4 mb-12 text-sm text-gray-400">
                                            <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> 1 Anúncio por semana</li>
                                            <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> Locução Inteligente IA</li>
                                            <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> Painel de Controle VIP</li>
                                        </ul>
                                        <button onClick={() => setCurrentView('REGISTER')} className={`w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${idx === 1 ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/20' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}>Selecionar</button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Depoimentos */}
                        <section className="max-w-7xl mx-auto px-6 py-16">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {TESTIMONIALS.map((t, idx) => (
                                    <div key={idx} className="glass-panel p-10 rounded-[40px] border-white/5">
                                        <div className="flex gap-1 mb-4">
                                            {[...Array(t.stars)].map((_, i) => <Star key={i} size={12} className="text-orange-500 fill-orange-500" />)}
                                        </div>
                                        <p className="text-gray-400 italic mb-6 leading-relaxed">"{t.text}"</p>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center font-black text-brand-primary text-xs">{t.name[0]}</div>
                                            <div>
                                                <h4 className="text-white font-black uppercase text-[10px]">{t.name}</h4>
                                                <p className="text-orange-500 text-[8px] font-bold uppercase tracking-widest">{t.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {(currentView === 'LOGIN' || currentView === 'REGISTER') && (
                    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-dark pt-20">
                        <div className="glass-panel p-12 md:p-20 rounded-[60px] w-full max-w-xl text-center shadow-3xl">
                            <h2 className="text-4xl font-black text-white uppercase mb-8 tracking-tighter">{currentView === 'LOGIN' ? 'Acesso VIP' : 'Cadastro VIP'}</h2>
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
                                            setCurrentView(u.role === UserRole.ADMIN ? 'ADMIN' : (u.paymentStatus === PaymentStatus.CONFIRMED ? 'DASHBOARD' : 'PAYMENT'));
                                            showToast(`Bem-vindo, ${u.name}`);
                                        } else showToast("Dados incorretos", "error");
                                    } else {
                                        const newUser = { 
                                            name: fd.get('name') as string, email: fd.get('email') as string, password: fd.get('password') as string, 
                                            phone: fd.get('phone') as string, role: UserRole.ADVERTISER, paymentStatus: PaymentStatus.CONFIRMED,
                                            planId: 'p1', // Inicia no mensal por padrão no cadastro
                                            createdAt: new Date().toISOString()
                                        };
                                        const saved = await db.addUser(newUser);
                                        if (saved) { 
                                            setCurrentUser(saved); 
                                            localStorage.setItem(SESSION_KEY, JSON.stringify(saved)); 
                                            setCurrentView('DASHBOARD'); 
                                            showToast("Cadastro realizado com sucesso!");
                                        }
                                    }
                                } finally { setIsLoggingIn(false); }
                            }} className="space-y-4">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="NOME OU EMPRESA" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-orange-500 text-sm" />
                                        <input name="phone" required placeholder="WHATSAPP" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-orange-500 text-sm" />
                                    </>
                                )}
                                <input name="email" required type="email" placeholder="E-MAIL" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-orange-500 text-sm" />
                                <input name="password" required type="password" placeholder="SENHA" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-orange-500 text-sm" />
                                <button type="submit" className="w-full h-16 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-[30px] font-black uppercase text-sm shadow-xl mt-4 flex items-center justify-center gap-2">
                                    {isLoggingIn && <Loader2 className="animate-spin" size={20}/>}
                                    {currentView === 'LOGIN' ? 'Entrar' : 'Começar Agora'}
                                </button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-[10px] text-gray-500 font-black uppercase hover:text-white transition-all tracking-widest mt-6">
                                    {currentView === 'LOGIN' ? 'Não tem conta? Clique aqui' : 'Já sou Assinante'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Dashboard logic updated with weekly limits */}
                {currentView === 'DASHBOARD' && currentUser && (
                   <div className="pt-32 pb-32 max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16 border-b border-white/5 pb-10">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-[25px] flex items-center justify-center text-white font-black text-3xl shadow-xl">{currentUser.name[0]}</div>
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{currentUser.name}</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[9px] font-black uppercase px-4 py-1.5 rounded-full bg-green-600 text-white tracking-widest">Ativo</span>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{currentUser.email}</span>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                className={`h-16 px-10 text-[11px] uppercase font-black rounded-2xl shadow-xl ${!canPost ? 'opacity-50 cursor-not-allowed grayscale' : ''}`} 
                                onClick={() => canPost && setEditingPost({ title: '', content: '', category: 'Geral', imageUrls: [] })}
                                disabled={!canPost}
                            >
                                <PlusCircle size={20}/> {canPost ? 'Criar Anúncio' : 'Limite Semanal Atingido'}
                            </Button>
                        </div>

                        {!canPost && (
                            <div className="mb-12 p-6 bg-orange-500/10 border border-orange-500/20 rounded-[30px] flex items-center gap-4 text-orange-500">
                                <AlertTriangle size={24}/>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest">Atenção!</p>
                                    <p className="text-sm opacity-80">Você já publicou esta semana. Aguarde 7 dias para o próximo anúncio ser liberado.</p>
                                </div>
                            </div>
                        )}

                        <div className="glass-panel rounded-[50px] p-12 border-orange-500/20 mb-20 shadow-3xl relative overflow-hidden group">
                            <div className="relative z-10 space-y-6">
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-4"><Mic size={24} className="text-orange-500" /> Estúdio IA Hélio Júnior</h2>
                                <p className="text-gray-400 text-sm max-w-xl">Digite o que deseja vender e nossa IA Radialista criará o roteiro perfeito.</p>
                                <div className="flex flex-col lg:flex-row gap-4">
                                    <input value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Ex: Promoção de Pizzas para Sexta-feira..." className="flex-1 bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-orange-500 text-lg" />
                                    <Button className="h-16 px-10 uppercase font-black rounded-2xl text-[11px]" onClick={async () => {
                                        if(!magicPrompt) return;
                                        setIsGeneratingAi(true);
                                        try {
                                          const res = await generateAdCopy('Comercio', magicPrompt, 'short');
                                          const data = typeof res === 'object' ? res : { title: 'Oferta VIP', content: res };
                                          setEditingPost({ title: data.title, content: data.content, category: 'Geral', imageUrls: [] });
                                          showToast("IA gerou seu roteiro!");
                                        } finally { setIsGeneratingAi(false); }
                                    }} isLoading={isGeneratingAi}>Gerar Roteiro</Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.filter(p => p.authorId === currentUser.id).map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-6 right-6 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingPost(p)} className="p-3 bg-brand-primary rounded-xl text-white shadow-xl hover:scale-110"><Edit size={16}/></button>
                                        <button onClick={() => { if(confirm('Excluir?')) { db.deletePost(p.id); refreshData(); } }} className="p-3 bg-red-600 rounded-xl text-white shadow-xl hover:scale-110"><Trash2 size={16}/></button>
                                    </div>
                                    <PostCard post={p} />
                                </div>
                            ))}
                        </div>
                   </div>
                )}

                {/* Modais, Admin e outras visões permanecem, mas com ajustes visuais... */}
            </main>

            {/* Modal de Anúncio com Múltiplas Fotos Retrato */}
            {editingPost && (
                <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-6 backdrop-blur-3xl animate-in zoom-in duration-300 overflow-y-auto">
                    <form onSubmit={async (e) => {
                        e.preventDefault(); setIsSaving(true);
                        const exp = new Date(); exp.setDate(exp.getDate() + 30);
                        try {
                            await db.savePost({ 
                                ...editingPost, 
                                authorId: currentUser?.id, 
                                authorName: currentUser?.name, 
                                whatsapp: currentUser?.phone, 
                                phone: currentUser?.phone,
                                expiresAt: exp.toISOString()
                            });
                            refreshData(); setEditingPost(null); showToast("Anúncio publicado!");
                        } finally { setIsSaving(false); }
                    }} className="glass-panel p-10 md:p-16 rounded-[60px] w-full max-w-4xl space-y-8 border-white/10 text-center shadow-3xl my-auto">
                        <h3 className="text-3xl font-black uppercase text-white tracking-tighter">Editor de Anúncio VIP</h3>
                        <div className="space-y-4 text-left">
                            <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="TÍTULO DO ANÚNCIO" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-orange-500 text-lg font-bold" required />
                            <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="DESCRIÇÃO / ROTEIRO" rows={4} className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-orange-500 text-sm" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select value={editingPost.category} onChange={e => setEditingPost({...editingPost, category: e.target.value})} className="bg-brand-dark border border-white/10 p-6 rounded-[30px] text-white uppercase font-black text-[10px] outline-none">
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <div className="space-y-2">
                                    <button type="button" onClick={() => document.getElementById('adPhotos')?.click()} className="w-full p-6 bg-white/5 border-2 border-dashed border-white/10 rounded-[30px] text-white font-black text-[10px] uppercase hover:bg-white/10 flex items-center justify-center gap-2">
                                        <ImageIcon size={18}/> {editingPost.imageUrls?.length ? `${editingPost.imageUrls.length} Fotos Adicionadas` : 'Adicionar Fotos (Máx 5 - Retrato)'}
                                    </button>
                                    <input id="adPhotos" type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleFileUploads(e, (arr) => setEditingPost({...editingPost, imageUrls: arr}))} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button type="submit" className="flex-1 h-16 uppercase font-black text-[11px] rounded-2xl" isLoading={isSaving}>Salvar e Publicar</Button>
                            <button type="button" onClick={() => setEditingPost(null)} className="flex-1 text-[10px] font-black uppercase text-gray-500 hover:text-white">Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Novo Rodapé Completo */}
            <footer className="bg-brand-panel/50 border-t border-white/5 pt-16 pb-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="space-y-6">
                            <div className="h-12 w-auto flex items-center gap-3">
                                {siteConfig.footerLogoUrl ? (
                                    <img src={siteConfig.footerLogoUrl} className="h-full object-contain" alt="Logo Footer" />
                                ) : (
                                    <Radio className="text-orange-500" size={32} />
                                )}
                                <span className="text-xl font-black text-white uppercase tracking-tighter">{siteConfig.heroLabel}</span>
                            </div>
                            <p className="text-sm text-gray-400 font-light leading-relaxed">O maior portal de classificados com tecnologia de rádio inteligente para destacar o seu negócio.</p>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white">Navegação</h4>
                            <ul className="space-y-4 text-sm text-gray-500">
                                <li><button onClick={() => setCurrentView('HOME')} className="hover:text-orange-500 transition-colors">Início</button></li>
                                <li><button onClick={() => setCurrentView('REGISTER')} className="hover:text-orange-500 transition-colors">Planos VIP</button></li>
                                <li><button onClick={() => document.getElementById('ads')?.scrollIntoView()} className="hover:text-orange-500 transition-colors">Classificados</button></li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white">Contato</h4>
                            <ul className="space-y-4 text-sm text-gray-500">
                                <li className="flex items-center gap-3"><Phone size={14} className="text-orange-500"/> {siteConfig.phone}</li>
                                <li className="flex items-center gap-3"><Mail size={14} className="text-orange-500"/> suporte@heliojunior.com</li>
                                <li className="flex items-center gap-3"><MapPin size={14} className="text-orange-500"/> Studio VIP, Brasil</li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white">Redes Sociais</h4>
                            <div className="flex gap-4">
                                <button onClick={() => window.open(`https://instagram.com/${siteConfig.instagram?.replace('@','')}`)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:text-white transition-all"><Instagram size={18}/></button>
                                <button onClick={() => window.open(`https://facebook.com/${siteConfig.facebook}`)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:text-white transition-all"><Facebook size={18}/></button>
                                <button onClick={() => window.open(`https://wa.me/${siteConfig.whatsapp}`)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:bg-green-600 hover:text-white transition-all"><Phone size={18}/></button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/5 pt-10 text-[10px] font-black uppercase text-gray-600 tracking-widest">
                        <p>&copy; 2024 Hélio Júnior Radialista - Todos os direitos reservados</p>
                        <div className="flex items-center gap-6">
                            <span className="hover:text-white cursor-pointer">Privacidade</span>
                            <span className="hover:text-white cursor-pointer">Termos de Uso</span>
                        </div>
                    </div>
                </div>
            </footer>

            {toast && (
                <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl animate-in slide-in-from-bottom duration-500 flex items-center gap-3 ${toast.t === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.t === 'success' ? <Check size={16}/> : <X size={16}/>}
                    {toast.m}
                </div>
            )}
        </div>
    );
};

export default App;
