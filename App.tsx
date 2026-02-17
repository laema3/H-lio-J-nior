
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG } from './services/storage';
import { db, isSupabaseReady, reinitializeSupabase, clearSupabaseCredentials } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { chatWithAssistant, generateAdCopy, generateAudioTTS } from './services/geminiService';
import { 
    Check, Clock, Camera, Trash2, AlertTriangle, Plus, Settings, CreditCard, Tag,
    MessageCircle, Send, X, Bot, Loader2, Sparkles, Volume2, Play, Pause,
    Image as ImageIcon, Users, CheckCircle2, Layers, MapPin, PhoneCall,
    Database, Activity, Globe, LayoutDashboard, LogOut, Eye, DollarSign, UploadCloud, Info,
    Radio, RefreshCcw
} from 'lucide-react';

type AdminSubView = 'INICIO' | 'CLIENTES' | 'PAGAMENTOS' | 'ANUNCIOS' | 'CATEGORIAS' | 'PLANOS' | 'AJUSTES';

const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const compressImage = (base64Str: string, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000;
            const MAX_HEIGHT = 1000;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
};

const Toast: React.FC<{ message: string, type: 'success' | 'error', onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 5000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${
            type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
        }`}>
            {type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
            <span className="font-bold text-sm uppercase tracking-wider">{message}</span>
        </div>
    );
};

const AIChat: React.FC<{ config: SiteConfig }> = ({ config }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
        { role: 'model', text: `Olá! Sou o assistente virtual do Hélio Júnior. Como posso ajudar você hoje?` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isTyping]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;
        const msg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setIsTyping(true);
        const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        const response = await chatWithAssistant(msg, history);
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'model', text: response }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-brand-dark border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
                    <div className="bg-gradient-to-r from-brand-primary to-purple-600 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bot className="text-white" />
                            <span className="text-white font-black text-sm uppercase tracking-tighter">Hélio Bot</span>
                        </div>
                        <button onClick={() => setIsOpen(false)}><X size={20} className="text-white/60"/></button>
                    </div>
                    <button onClick={() => window.open(`https://wa.me/${config.whatsapp?.replace(/\D/g,'')}`, '_blank')} className="bg-green-500/10 text-green-400 py-3 text-[10px] font-black uppercase tracking-widest border-b border-white/5 flex items-center justify-center gap-2">
                        <MessageCircle size={14} /> Falar com um Humano
                    </button>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-brand-dark/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-xs ${m.role === 'user' ? 'bg-brand-primary text-white rounded-tr-none' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && <div className="text-[10px] text-gray-500 font-bold animate-pulse">Hélio Bot está digitando...</div>}
                    </div>
                    <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte algo..." className="flex-1 bg-brand-dark border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"/>
                        <button type="submit" className="bg-brand-primary p-2 rounded-xl"><Send size={18}/></button>
                    </form>
                </div>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all ${isOpen ? 'bg-red-500' : 'bg-brand-primary shadow-brand-primary/40'}`}>
                {isOpen ? <X size={28}/> : <Bot size={28}/>}
            </button>
        </div>
    );
};

const Footer: React.FC<{ config: SiteConfig, setCurrentView: (v: ViewState) => void }> = ({ config, setCurrentView }) => (
    <footer className="relative bg-[#0b1120] overflow-hidden pt-24 pb-12 mt-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
                <div className="md:col-span-4 space-y-8 text-center md:text-left">
                    <div 
                        className="inline-block h-16 w-56 bg-white/5 rounded-2xl border border-white/5 overflow-hidden p-2 cursor-pointer hover:bg-white/10 transition-all"
                        onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setCurrentView('HOME'); }}
                    >
                        {config.footerLogoUrl ? <img src={config.footerLogoUrl} className="w-full h-full object-contain" /> : <span className="font-black text-white text-lg uppercase tracking-tighter flex items-center justify-center h-full">{config.heroLabel}</span>}
                    </div>
                    <p className="text-gray-400 text-sm italic max-w-sm mx-auto md:mx-0">"{config.heroSubtitle}"</p>
                </div>

                <div className="md:col-span-2 space-y-6 text-center md:text-left">
                    <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-8">Navegação</h3>
                    <ul className="space-y-4">
                        <li><button onClick={() => setCurrentView('HOME')} className="text-sm text-gray-400 hover:text-white transition-colors">Início</button></li>
                        <li><button onClick={() => setCurrentView('LOGIN')} className="text-sm text-gray-400 hover:text-white transition-colors">Acessar Conta</button></li>
                        <li><button onClick={() => setCurrentView('REGISTER')} className="text-sm text-gray-400 hover:text-white transition-colors">Quero Anunciar</button></li>
                    </ul>
                </div>

                <div className="md:col-span-3 space-y-6 text-center md:text-left">
                    <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-8">Fale Conosco</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-gray-400"><MapPin size={16}/> <span>{config.address}</span></div>
                        <div className="flex items-center gap-3 text-sm text-gray-400"><PhoneCall size={16}/> <span className="font-bold">{config.phone}</span></div>
                    </div>
                </div>

                <div className="md:col-span-3">
                    <div className="glass-panel p-6 rounded-[32px] border border-white/5">
                        <h4 className="text-xs font-black text-brand-accent uppercase tracking-widest mb-2">Segurança & IA</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Portal monitorado e assistente inteligente para sua melhor performance.</p>
                    </div>
                </div>
            </div>
            <p className="pt-8 border-t border-white/5 text-[10px] text-gray-600 font-black uppercase tracking-widest text-center md:text-left">
                © {new Date().getFullYear()} Portal Hélio Júnior.
            </p>
        </div>
    </footer>
);

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const [connLogs, setConnLogs] = useState<string[]>([]);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [adminSubView, setAdminSubView] = useState<AdminSubView>('INICIO');
    const [currentUser, setCurrentUser] = useState<User | null>(() => getFromLocal(STORAGE_KEYS.SESSION, null));
    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const supUrlRef = useRef<HTMLInputElement>(null);
    const supKeyRef = useRef<HTMLInputElement>(null);
    const adContentRef = useRef<HTMLTextAreaElement>(null);
    const adTitleRef = useRef<HTMLInputElement>(null);

    const refresh = async () => {
        setIsOnline(isSupabaseReady());
        const [p, u, c, cfg] = await Promise.all([
            storageService.getPosts(),
            storageService.getUsers(),
            storageService.getCategories(),
            storageService.getConfig()
        ]);
        setPosts(p); setAllUsers(u); setCategories(c); setSiteConfig(cfg); 
        setPlans(storageService.getPlans());
        
        const session = getFromLocal(STORAGE_KEYS.SESSION, null);
        if (session) {
            const freshUser = u.find(user => user.id === session.id);
            if (freshUser) { setCurrentUser(freshUser); saveToLocal(STORAGE_KEYS.SESSION, freshUser); }
            else if (session.role === UserRole.ADMIN) { setCurrentUser(session); }
        }
        setIsLoading(false);
    };

    useEffect(() => { 
        storageService.init().then(async () => {
            await refresh();
            const conn = await db.testConnection();
            setIsOnline(conn.success);
            setConnLogs(conn.logs);
        });
    }, []);

    const handleLogin = (user: User) => {
        saveToLocal(STORAGE_KEYS.SESSION, user);
        refresh().then(() => { setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD'); });
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        setCurrentUser(null); setCurrentView('HOME');
    };

    const handleConfirmPayment = async (user: User) => {
        const plan = plans.find(p => p.id === user.planId);
        const duration = plan?.durationDays || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + duration);
        
        const updatedUser: User = {
            ...user,
            paymentStatus: PaymentStatus.CONFIRMED,
            expiresAt: expiresAt.toISOString()
        };
        
        await storageService.updateUser(updatedUser);
        await refresh();
        setToast({ m: "Conta Ativada com Sucesso!", t: "success" });
    };

    const handleGenerateAI = async (type: 'short' | 'radio' = 'short') => {
        const title = adTitleRef.current?.value;
        const profession = currentUser?.profession || 'Profissional';
        if (!title) {
            setToast({ m: "Dê um título para o anúncio primeiro!", t: "error" });
            return;
        }
        setIsGeneratingAI(true);
        const copy = await generateAdCopy(profession, title, type);
        if (adContentRef.current) {
            adContentRef.current.value = copy;
        }
        setIsGeneratingAI(false);
        setToast({ m: type === 'short' ? "Copy Gerada!" : "Script de Rádio Gerado!", t: "success" });
    };

    const handleListenLocution = async () => {
        const text = adContentRef.current?.value;
        if (!text) {
            setToast({ m: "Gere ou escreva um texto primeiro!", t: "error" });
            return;
        }

        setIsGeneratingAudio(true);
        const base64Audio = await generateAudioTTS(text);
        setIsGeneratingAudio(false);

        if (base64Audio) {
            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                }
                const ctx = audioContextRef.current;
                const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
                
                if (audioSourceRef.current) audioSourceRef.current.stop();
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start();
                audioSourceRef.current = source;
                setToast({ m: "Ouvindo Locução Digital...", t: "success" });
            } catch (err) {
                console.error("Erro ao reproduzir áudio:", err);
                setToast({ m: "Erro ao tocar o áudio", t: "error" });
            }
        } else {
            setToast({ m: "Não foi possível gerar a voz no momento.", t: "error" });
        }
    };

    const handleSaveSupabaseManual = () => {
        const url = supUrlRef.current?.value?.trim() || '';
        const key = supKeyRef.current?.value?.trim() || '';
        if (reinitializeSupabase(url, key)) {
            setToast({ m: "Credenciais Supabase Salvas! Reiniciando...", t: "success" });
        } else {
            setToast({ m: "Dados inválidos. Verifique URL e Chave.", t: "error" });
        }
    };

    const handleTestSupabase = async () => {
        setConnLogs(["⏳ Testando..."]);
        const res = await db.testConnection();
        setIsOnline(res.success);
        setConnLogs(res.logs);
    };

    const renderView = () => {
        switch(currentView) {
            case 'HOME':
                const visiblePosts = posts.filter(p => {
                    const auth = allUsers.find(u => u.id === p.authorId);
                    if (p.authorId === 'admin') return true;
                    return auth?.paymentStatus === PaymentStatus.CONFIRMED;
                });
                const filtered = filterCategory === 'ALL' ? visiblePosts : visiblePosts.filter(p => p.category === filterCategory);
                return (
                    <div className="animate-in fade-in duration-700">
                        <section className="relative pt-32 pb-20 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-dark to-brand-secondary/5" />
                            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                                <div className="text-center lg:text-left">
                                    <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-brand-accent uppercase tracking-widest mb-6">{siteConfig.heroLabel}</div>
                                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-none">{siteConfig.heroTitle}</h1>
                                    <p className="text-xl text-gray-400 mb-10 italic">"{siteConfig.heroSubtitle}"</p>
                                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                                        <Button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})}>Ver Anúncios</Button>
                                        <Button variant="outline" onClick={() => setCurrentView('REGISTER')}>Quero Anunciar</Button>
                                    </div>
                                </div>
                                <div className="aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative group">
                                    <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Banner" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent" />
                                </div>
                            </div>
                        </section>

                        <section className="max-w-7xl mx-auto px-4 mb-16 relative z-10">
                            <div className="flex flex-wrap justify-center gap-2">
                                <button onClick={() => setFilterCategory('ALL')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === 'ALL' ? 'bg-white text-brand-dark border-white' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>Todos</button>
                                {categories.map(c => <button key={c} onClick={() => setFilterCategory(c)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === c ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>{c}</button>)}
                            </div>
                        </section>

                        <section id="ads" className="max-w-7xl mx-auto px-4 pb-24 min-h-[400px]">
                            {filtered.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filtered.map(p => <PostCard key={p.id} post={p} author={allUsers.find(u => u.id === p.authorId)} />)}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/5">
                                    <ImageIcon size={48} className="mx-auto text-gray-600 mb-4 opacity-20" />
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhum anúncio ativo no momento.</p>
                                </div>
                            )}
                        </section>

                        <section className="bg-brand-dark/50 py-24 border-t border-white/5">
                            <div className="max-w-7xl mx-auto px-4 text-center">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Escolha sua Exposição</h2>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-16">Planos que cabem no seu bolso com tecnologia de ponta</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {plans.map(p => (
                                        <div key={p.id} className="glass-panel p-10 rounded-[40px] border border-white/5 flex flex-col items-center hover:border-brand-primary transition-all group">
                                            <div className="text-brand-accent font-black text-[10px] uppercase mb-4 tracking-widest">{p.name}</div>
                                            <div className="text-4xl font-black text-white mb-2">R$ {p.price.toFixed(2)}</div>
                                            <div className="text-[10px] text-gray-600 font-black uppercase mb-8">{p.durationDays} Dias de Ativação</div>
                                            <ul className="space-y-3 mb-10 text-left w-full">
                                                <li className="text-[10px] text-gray-400 flex items-center gap-2 font-bold uppercase"><Check size={14} className="text-green-500"/> Visibilidade no Portal</li>
                                                <li className="text-[10px] text-gray-400 flex items-center gap-2 font-bold uppercase"><Check size={14} className="text-green-500"/> Gerador de Texto IA</li>
                                                <li className="text-[10px] text-gray-400 flex items-center gap-2 font-bold uppercase"><Check size={14} className="text-green-500"/> Suporte Exclusivo</li>
                                            </ul>
                                            <Button onClick={() => setCurrentView('REGISTER')} className="w-full uppercase text-[10px]">Assinar Agora</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                );

            case 'ADMIN':
                if (currentUser?.role !== UserRole.ADMIN) return null;
                const advertisersList = allUsers.filter(u => u.role === UserRole.ADVERTISER);
                const awaitingList = advertisersList.filter(u => u.paymentStatus === PaymentStatus.AWAITING);
                return (
                    <div className="min-h-screen bg-brand-dark pt-20 flex">
                        <aside className="w-72 border-r border-white/5 bg-brand-dark/80 backdrop-blur-2xl flex flex-col p-6 gap-3 hidden md:flex shrink-0">
                            <div className="mb-8 px-4"><h2 className="text-lg font-black text-white uppercase tracking-tighter">Portal Admin</h2></div>
                            <div className="flex-1 space-y-2">
                                {[{ id: 'INICIO', label: 'Resumo', icon: LayoutDashboard },{ id: 'CLIENTES', label: 'Clientes', icon: Users },{ id: 'PAGAMENTOS', label: 'Pagamentos', icon: CreditCard, count: awaitingList.length },{ id: 'ANUNCIOS', label: 'Anúncios', icon: ImageIcon },{ id: 'CATEGORIAS', label: 'Nichos', icon: Tag },{ id: 'PLANOS', label: 'Planos', icon: Layers },{ id: 'AJUSTES', label: 'Configurações', icon: Settings }].map(item => (
                                    <button key={item.id} onClick={() => setAdminSubView(item.id as AdminSubView)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group border ${adminSubView === item.id ? 'bg-brand-primary border-brand-primary text-white shadow-xl shadow-brand-primary/20' : 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white'}`}>
                                        <div className="flex items-center gap-3"><item.icon size={18} /><span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span></div>
                                        {item.count ? <span className="bg-brand-secondary text-[10px] px-2 py-0.5 rounded-full text-white font-black">{item.count}</span> : null}
                                    </button>
                                ))}
                            </div>
                        </aside>
                        <main className="flex-1 p-10 overflow-y-auto">
                            {adminSubView === 'AJUSTES' && (
                                <div className="space-y-12 animate-in fade-in pb-40">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl font-black uppercase text-brand-accent tracking-tighter">Central de Comando</h2>
                                        <Button onClick={clearSupabaseCredentials} variant="danger" className="text-[10px] uppercase h-10">Resetar Banco de Dados</Button>
                                    </div>
                                    
                                    <div className="glass-panel p-8 rounded-[40px] border border-white/5 space-y-6">
                                        <div className="flex items-center gap-3"><Database className="text-brand-primary" size={20} /><h3 className="text-xs font-black uppercase text-white">Configuração do Supabase</h3></div>
                                        
                                        {/* Diagnostic Console */}
                                        <div className="bg-black/80 rounded-2xl p-6 border border-white/10 font-mono">
                                            <p className="text-[10px] text-gray-500 uppercase font-black mb-3 flex items-center gap-2"><Activity size={12}/> Console de Diagnóstico</p>
                                            <div className="space-y-1">
                                                {connLogs.length > 0 ? connLogs.map((log, i) => (
                                                    <p key={i} className={`text-[11px] ${log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : 'text-gray-400'}`}>
                                                        {log}
                                                    </p>
                                                )) : <p className="text-[11px] text-gray-600">Aguardando teste...</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">URL do Projeto</label>
                                                <input 
                                                    ref={supUrlRef} 
                                                    defaultValue={localStorage.getItem('supabase_url_manual') || ''} 
                                                    placeholder="https://sua-url.supabase.co" 
                                                    className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-[11px] text-white outline-none focus:border-brand-primary" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Anon Key (Public)</label>
                                                <input 
                                                    ref={supKeyRef} 
                                                    defaultValue={localStorage.getItem('supabase_key_manual') || ''} 
                                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5..." 
                                                    className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-[11px] text-white outline-none focus:border-brand-primary" 
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <Button onClick={handleSaveSupabaseManual} className="flex-1 h-12 uppercase text-[10px]"><RefreshCcw size={14}/> Salvar e Reiniciar</Button>
                                            <Button onClick={handleTestSupabase} variant="outline" className="flex-1 h-12 uppercase text-[10px]">Tentar Conectar Agora</Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="glass-panel p-8 rounded-[40px] space-y-6">
                                            <h3 className="text-xs font-black uppercase text-white"><Globe size={16} className="inline mr-2"/> Conteúdos do Site</h3>
                                            <input value={siteConfig.heroLabel} onChange={e => setSiteConfig({...siteConfig, heroLabel: e.target.value})} placeholder="Nome da Marca" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white" />
                                            <input value={siteConfig.heroTitle} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} placeholder="Título Hero" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-black text-white" />
                                            <textarea value={siteConfig.heroSubtitle} onChange={e => setSiteConfig({...siteConfig, heroSubtitle: e.target.value})} placeholder="Subtítulo Hero" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-gray-400 h-24" />
                                        </div>
                                        <div className="glass-panel p-8 rounded-[40px] space-y-6">
                                            <h3 className="text-xs font-black uppercase text-white"><DollarSign size={16} className="inline mr-2"/> Dados Financeiros (PIX)</h3>
                                            <input value={siteConfig.pixKey || ''} onChange={e => setSiteConfig({...siteConfig, pixKey: e.target.value})} placeholder="Sua Chave PIX" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white" />
                                            <input value={siteConfig.pixName || ''} onChange={e => setSiteConfig({...siteConfig, pixName: e.target.value})} placeholder="Nome do Titular" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white" />
                                        </div>
                                    </div>
                                    <div className="fixed bottom-10 right-10 z-[110]"><Button onClick={() => storageService.updateConfig(siteConfig).then(() => { refresh(); setToast({m: "Alterações Salvas na Nuvem!", t: "success"}) })} className="h-20 w-64 shadow-2xl rounded-3xl"><CheckCircle2 /> SALVAR GERAL</Button></div>
                                </div>
                            )}
                            {adminSubView === 'INICIO' && (
                                <div className="space-y-10 animate-in fade-in">
                                    <h2 className="text-4xl font-black uppercase text-white">Painel de Controle</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="glass-panel p-8 rounded-[40px]"><p className="text-5xl font-black text-white">{advertisersList.length}</p><span className="text-[10px] font-black text-gray-600 uppercase">CLIENTES</span></div>
                                        <div className="glass-panel p-8 rounded-[40px]"><p className="text-5xl font-black text-brand-secondary">{awaitingList.length}</p><span className="text-[10px] font-black text-gray-600 uppercase">PENDENTES</span></div>
                                        <div className="glass-panel p-8 rounded-[40px]"><p className="text-5xl font-black text-white">{posts.length}</p><span className="text-[10px] font-black text-gray-600 uppercase">ANÚNCIOS</span></div>
                                        <div className="glass-panel p-8 rounded-[40px]"><p className="text-5xl font-black text-white">{categories.length}</p><span className="text-[10px] font-black text-gray-600 uppercase">NICHOS</span></div>
                                    </div>
                                </div>
                            )}
                            {adminSubView === 'PAGAMENTOS' && (
                                <div className="space-y-8 animate-in fade-in">
                                    <h2 className="text-3xl font-black uppercase text-white">Validar Pagamentos</h2>
                                    {awaitingList.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {awaitingList.map(u => (
                                                <div key={u.id} className="glass-panel p-8 rounded-[40px] border-l-brand-secondary border-l-4">
                                                    <p className="text-lg font-black text-white mb-2 uppercase">{u.name}</p>
                                                    <div className="bg-white/5 p-4 rounded-2xl mb-6 text-[10px] font-black text-brand-primary">PLANO: {plans.find(p => p.id === u.planId)?.name}</div>
                                                    <Button onClick={() => handleConfirmPayment(u)} className="w-full h-14 font-black uppercase text-xs">Aprovar e Ativar</Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-500 font-bold uppercase text-xs">Sem pendências no momento.</p>}
                                </div>
                            )}
                        </main>
                    </div>
                );

            case 'DASHBOARD':
                if (!currentUser) return null;
                const userPostsList = posts.filter(p => p.authorId === currentUser.id);
                return (
                    <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom">
                        <div className="lg:col-span-8 space-y-8">
                            <div className="glass-panel p-10 rounded-[40px] border border-white/5">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <h2 className="text-3xl font-black uppercase text-white tracking-tighter">Novo Anúncio</h2>
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => handleGenerateAI('short')} disabled={isGeneratingAI} className="bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 px-5 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 transition-all">
                                            {isGeneratingAI ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Texto IA
                                        </button>
                                        <button onClick={() => handleGenerateAI('radio')} disabled={isGeneratingAI} className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-5 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 transition-all">
                                            {isGeneratingAI ? <Loader2 className="animate-spin" size={14}/> : <Radio size={14}/>} Spot Rádio
                                        </button>
                                        <button onClick={handleListenLocution} disabled={isGeneratingAudio} className="bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent border border-brand-accent/30 px-5 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 transition-all">
                                            {isGeneratingAudio ? <Loader2 className="animate-spin" size={14}/> : <Volume2 size={14}/>} Locução Digital
                                        </button>
                                    </div>
                                </div>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as any;
                                    const imgVal = (document.getElementById('postImgInput') as HTMLInputElement).value;
                                    if(!imgVal) { setToast({m: "Selecione uma imagem para o anúncio!", t: "error"}); return; }
                                    await storageService.addPost({ id: 'p-'+Date.now(), authorId: currentUser.id, authorName: currentUser.name, category: currentUser.profession || 'Geral', title: form.title.value, content: form.content.value, imageUrl: imgVal, whatsapp: currentUser.phone, phone: currentUser.phone, createdAt: new Date().toISOString() });
                                    refresh(); setToast({m: "Anúncio Publicado!", t: "success"}); form.reset();
                                }} className="space-y-6">
                                    <input ref={adTitleRef} name="title" required placeholder="Título do Anúncio" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary font-bold" />
                                    <textarea ref={adContentRef} name="content" required placeholder="Descrição ou script..." className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white h-40 outline-none focus:border-brand-primary text-sm" />
                                    <div onClick={() => document.getElementById('postFilePicker')?.click()} className="aspect-video bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-brand-primary transition-all">
                                        <img id="postImgPreview" className="w-full h-full object-contain hidden relative z-10" />
                                        <div id="postImgPlaceholder" className="flex flex-col items-center gap-2"><Camera className="text-gray-500" size={32} /><span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Escolher Foto do Anúncio</span></div>
                                        <input id="postImgInput" type="hidden" /><input id="postFilePicker" type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                            const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); (document.getElementById('postImgInput') as HTMLInputElement).value = comp; const pr = document.getElementById('postImgPreview') as HTMLImageElement; pr.src = comp; pr.classList.remove('hidden'); document.getElementById('postImgPlaceholder')?.classList.add('hidden'); }; r.readAsDataURL(f); }
                                        }} />
                                    </div>
                                    <Button type="submit" className="w-full h-16 uppercase font-black text-lg">Publicar Anúncio Agora</Button>
                                </form>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {userPostsList.map(p => (
                                    <div key={p.id} className="relative group">
                                        <PostCard post={p} author={currentUser} />
                                        <button onClick={() => { if(confirm("Deseja mesmo remover este anúncio?")) storageService.deletePost(p.id).then(refresh) }} className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all z-20"><Trash2 size={18}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-4 glass-panel p-8 rounded-[40px] text-center h-fit sticky top-24 border border-brand-accent/20">
                            <h3 className="font-black text-xl mb-4 text-brand-accent uppercase">Minha Conta</h3>
                            <div className={`p-4 rounded-2xl border mb-6 text-[10px] font-black uppercase tracking-widest ${currentUser.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'}`}>
                                STATUS: {currentUser.paymentStatus}
                            </div>
                            {currentUser.expiresAt && (
                                <div className="text-[10px] text-gray-500 font-bold uppercase mb-6">Assinatura até: {new Date(currentUser.expiresAt).toLocaleDateString()}</div>
                            )}
                            <Button onClick={() => setCurrentView('PAYMENT')} variant="secondary" className="w-full py-4 text-[10px] font-black uppercase tracking-widest">Mudar de Plano</Button>
                        </div>
                    </div>
                );

            case 'PAYMENT':
                return (
                    <div className="pt-32 pb-20 max-w-6xl mx-auto px-4 text-center animate-in zoom-in">
                        <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-tighter">Sua Jornada Começa Aqui</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                            {plans.map(p => (
                                <div key={p.id} onClick={() => {
                                    const isFree = p.price === 0;
                                    let expiresAt = undefined;
                                    if(isFree) { const d = new Date(); d.setDate(d.getDate() + p.durationDays); expiresAt = d.toISOString(); }
                                    storageService.updateUser({ ...currentUser!, planId: p.id, paymentStatus: isFree ? PaymentStatus.CONFIRMED : PaymentStatus.AWAITING, expiresAt }).then(() => { refresh(); setToast({m: isFree ? "Degustação Iniciada! Aproveite." : "Plano Selecionado! Aguardando PIX...", t: "success"}); if(isFree) setCurrentView('DASHBOARD'); });
                                }} className={`glass-panel p-10 rounded-[40px] border-2 transition-all cursor-pointer group flex flex-col justify-between ${currentUser?.planId === p.id ? 'border-brand-primary' : 'border-white/5 hover:border-brand-primary/40'}`}>
                                    <div>
                                        <h3 className="font-black uppercase mb-4 text-white text-sm">{p.name}</h3>
                                        <div className="text-3xl font-black text-brand-secondary mb-2">R$ {p.price.toFixed(2)}</div>
                                        <p className="text-[10px] text-gray-500 uppercase font-black">{p.durationDays} Dias</p>
                                    </div>
                                    <p className="mt-6 text-[9px] text-gray-400 font-medium italic">"{p.description}"</p>
                                </div>
                            ))}
                        </div>
                        {currentUser?.paymentStatus === PaymentStatus.AWAITING && (
                            <div className="max-w-2xl mx-auto glass-panel p-10 rounded-[40px] border border-brand-accent/30 text-left">
                                <h3 className="text-xl font-black text-white uppercase mb-6 text-center">Finalize o Pagamento</h3>
                                <div className="space-y-4">
                                    <div className="bg-brand-dark p-4 rounded-xl border border-white/10"><p className="text-[10px] text-gray-500 uppercase mb-1">Chave PIX</p><p className="font-black text-white select-all">{siteConfig.pixKey}</p></div>
                                    <div className="bg-brand-dark p-4 rounded-xl border border-white/10"><p className="text-[10px] text-gray-500 uppercase mb-1">Titular da Conta</p><p className="font-black text-white">{siteConfig.pixName}</p></div>
                                    <p className="text-[10px] text-gray-500 font-bold italic text-center">Envie o comprovante para o Hélio após o pagamento.</p>
                                </div>
                            </div>
                        )}
                        <button onClick={() => setCurrentView('DASHBOARD')} className="mt-10 text-[10px] font-black text-gray-600 uppercase hover:text-white transition-colors">Voltar ao Painel do Usuário</button>
                    </div>
                );
            case 'LOGIN':
            case 'REGISTER':
                return (
                    <div className="pt-40 pb-20 max-md mx-auto px-4 animate-in zoom-in">
                        <div className="glass-panel p-10 rounded-[40px] shadow-2xl border border-white/5">
                            <h2 className="text-4xl font-black text-center mb-8 uppercase tracking-tighter text-white">{currentView === 'LOGIN' ? 'Bem-vindo' : 'Criar Conta'}</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.target as any;
                                const email = form.email.value;
                                if (currentView === 'LOGIN') {
                                    const user = await storageService.findUserByEmail(email);
                                    if (user) handleLogin(user); else setToast({ m: "Conta não encontrada.", t: "error"});
                                } else {
                                    const u = await storageService.addUser({ name: form.name.value, email: email.toLowerCase(), role: UserRole.ADVERTISER, profession: form.profession.value, phone: form.phone.value, paymentStatus: PaymentStatus.AWAITING });
                                    handleLogin(u);
                                }
                            }} className="space-y-4">
                                {currentView === 'REGISTER' && (
                                    <>
                                        <input name="name" required placeholder="Seu Nome ou Nome da Empresa" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                        <select name="profession" className="w-full bg-brand-dark border border-white/10 p-4 rounded-2xl text-white font-bold">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                        <input name="phone" required placeholder="Telefone/WhatsApp" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                    </>
                                )}
                                <input name="email" type="email" required placeholder="E-mail de acesso" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                <input name="password" type="password" required placeholder="Senha de segurança" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                <Button type="submit" className="w-full h-16 uppercase font-black">{currentView === 'LOGIN' ? 'Entrar' : 'Cadastrar agora'}</Button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-[10px] text-gray-500 font-black mt-4 uppercase hover:text-white">{currentView === 'LOGIN' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Clique para entrar'}</button>
                            </form>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 font-sans flex flex-col">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} isOnline={isOnline} />
            <main className="flex-1 flex flex-col">{renderView()}</main>
            {currentView !== 'ADMIN' && <Footer config={siteConfig} setCurrentView={setCurrentView} />}
            <AIChat config={siteConfig} />
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
