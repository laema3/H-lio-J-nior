
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, STORAGE_KEYS, getFromLocal, saveToLocal, DEFAULT_CONFIG } from './services/storage';
import { db, isSupabaseReady, reinitializeSupabase, clearSupabaseCredentials } from './services/supabase';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { chatWithAssistant, generateAdCopy, generateAudioTTS, generateAdImage } from './services/geminiService';
import { 
    Check, Clock, Camera, Trash2, Edit, AlertTriangle, Plus, Settings, CreditCard, Tag,
    MessageCircle, Send, X, Bot, Loader2, Sparkles, Volume2, Play, Pause,
    Image as ImageIcon, Users, CheckCircle2, Layers, MapPin, PhoneCall,
    Database, Activity, Globe, LayoutDashboard, LogOut, Eye, DollarSign, UploadCloud, Info,
    Radio, RefreshCcw, ChevronLeft, ChevronRight, Wand2
} from 'lucide-react';

type AdminSubView = 'INICIO' | 'CLIENTES' | 'PAGAMENTOS' | 'ANUNCIOS' | 'CATEGORIAS' | 'PLANOS' | 'AJUSTES';

const decodeBase64 = (base64: string) => {
    try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.error("Erro decodeBase64:", e);
        return new Uint8Array(0);
    }
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
        img.onerror = () => resolve(base64Str);
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

const AdSlider: React.FC<{ ads: Post[], allUsers: User[] }> = ({ ads, allUsers }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (ads.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % ads.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [ads.length]);

    if (ads.length === 0) return null;

    const currentAd = ads[currentIndex];
    
    return (
        <div className="relative w-full overflow-hidden glass-panel rounded-[40px] border border-white/10 shadow-2xl group min-h-[400px]">
            <div className="flex transition-transform duration-700 ease-in-out h-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {ads.map((ad, idx) => (
                    <div key={ad.id} className="w-full shrink-0 flex flex-col md:flex-row h-full min-h-[400px]">
                        <div className="w-full md:w-1/2 h-64 md:h-auto bg-black relative">
                            <img src={ad.imageUrl} className="w-full h-full object-contain" alt={ad.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent pointer-events-none" />
                        </div>
                        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-brand-primary/20 text-brand-primary text-[10px] font-black uppercase px-3 py-1 rounded-full border border-brand-primary/20">{ad.category}</span>
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{ad.authorName}</span>
                            </div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 leading-none">{ad.title}</h2>
                            <p className="text-gray-400 text-sm italic mb-10 line-clamp-4">"{ad.content}"</p>
                            <div className="flex gap-4">
                                <Button onClick={() => ad.whatsapp && window.open(`https://wa.me/${ad.whatsapp.replace(/\D/g,'')}`, '_blank')} className="flex-1 uppercase text-[10px] h-14">Falar no WhatsApp</Button>
                                <Button variant="outline" onClick={() => ad.phone && window.open(`tel:${ad.phone}`)} className="flex-1 uppercase text-[10px] h-14">Ligar Agora</Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {ads.length > 1 && (
                <>
                    <button onClick={() => setCurrentIndex(prev => (prev - 1 + ads.length) % ads.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"><ChevronLeft size={24}/></button>
                    <button onClick={() => setCurrentIndex(prev => (prev + 1) % ads.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"><ChevronRight size={24}/></button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                        {ads.map((_, idx) => (
                            <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-brand-primary w-8' : 'bg-white/20'}`} />
                        ))}
                    </div>
                </>
            )}
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
        try {
            const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            const response = await chatWithAssistant(msg, history);
            setMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Tive um problema de conexão. Tente novamente mais tarde." }]);
        } finally {
            setIsTyping(false);
        }
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
                    <button onClick={() => window.open(`https://wa.me/${config.whatsapp?.replace(/\D/g,'') || ''}`, '_blank')} className="bg-green-500/10 text-green-400 py-3 text-[10px] font-black uppercase tracking-widest border-b border-white/5 flex items-center justify-center gap-2">
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
                        {config?.footerLogoUrl ? <img src={config.footerLogoUrl} className="w-full h-full object-contain" /> : <span className="font-black text-white text-lg uppercase tracking-tighter flex items-center justify-center h-full">{config?.heroLabel || 'Hélio Júnior'}</span>}
                    </div>
                    <p className="text-gray-400 text-sm italic max-w-sm mx-auto md:mx-0">"{config?.heroSubtitle || ''}"</p>
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
                        <div className="flex items-center gap-3 text-sm text-gray-400"><MapPin size={16}/> <span>{config?.address || 'Endereço não definido'}</span></div>
                        <div className="flex items-center gap-3 text-sm text-gray-400"><PhoneCall size={16}/> <span className="font-bold">{config?.phone || ''}</span></div>
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
    const [isGeneratingImageAI, setIsGeneratingImageAI] = useState(false);
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
    
    // Estados para o Gerador Mágico
    const [magicPrompt, setMagicPrompt] = useState('');
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    const [supUrlInput, setSupUrlInput] = useState(() => localStorage.getItem('supabase_url_manual') || '');
    const [supKeyInput, setSupKeyInput] = useState(() => localStorage.getItem('supabase_key_manual') || '');

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const adContentRef = useRef<HTMLTextAreaElement>(null);
    const adTitleRef = useRef<HTMLInputElement>(null);

    const refresh = async () => {
        try {
            setIsOnline(isSupabaseReady());
            const [p, u, c, cfg] = await Promise.all([
                storageService.getPosts(),
                storageService.getUsers(),
                storageService.getCategories(),
                storageService.getConfig()
            ]);
            setPosts(p || []); setAllUsers(u || []); setCategories(c || []); setSiteConfig(cfg || DEFAULT_CONFIG); 
            setPlans(storageService.getPlans());
            
            const session = getFromLocal(STORAGE_KEYS.SESSION, null);
            if (session) {
                const freshUser = (u || []).find((user: any) => user.id === session.id);
                if (freshUser) { 
                    setCurrentUser(freshUser); 
                    saveToLocal(STORAGE_KEYS.SESSION, freshUser); 
                } else {
                    setCurrentUser(session);
                }
            }
        } catch (e) { console.error("Erro no refresh:", e); } finally { setIsLoading(false); }
    };

    useEffect(() => { 
        storageService.init().then(async () => {
            await refresh();
            const conn = await db.testConnection();
            setIsOnline(conn.success);
            setConnLogs(conn.logs);
        });
    }, []);

    useEffect(() => {
        if (editingPost) {
            if (adTitleRef.current) adTitleRef.current.value = editingPost.title;
            if (adContentRef.current) adContentRef.current.value = editingPost.content;
            const pr = document.getElementById('postImgPreview') as HTMLImageElement;
            const pl = document.getElementById('postImgPlaceholder');
            const inp = document.getElementById('postImgInput') as HTMLInputElement;
            if (pr && editingPost.imageUrl) {
                pr.src = editingPost.imageUrl;
                pr.classList.remove('hidden');
                pl?.classList.add('hidden');
                if (inp) inp.value = editingPost.imageUrl;
            }
        }
    }, [editingPost]);

    const handleLogin = (user: User) => {
        if (!user) return;
        setCurrentUser(user);
        saveToLocal(STORAGE_KEYS.SESSION, user);
        setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
        refresh();
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        setCurrentUser(null); 
        setCurrentView('HOME');
    };

    const handleConfirmPayment = async (user: User) => {
        const plan = plans.find(p => p.id === user.planId);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (plan?.durationDays || 30));
        const updatedUser: User = { ...user, paymentStatus: PaymentStatus.CONFIRMED, expiresAt: expiresAt.toISOString() };
        await storageService.updateUser(updatedUser);
        await refresh();
        setToast({ m: "Conta Ativada!", t: "success" });
    };

    const handleMagicGenerate = async () => {
        if (!magicPrompt.trim()) {
            setToast({ m: "Diga o que você quer anunciar!", t: "error" });
            return;
        }
        setIsGeneratingAI(true);
        setIsGeneratingImageAI(true);
        try {
            const profession = currentUser?.profession || 'Negócio';
            const [textResult, imageResult] = await Promise.all([
                generateAdCopy(profession, magicPrompt, 'short'),
                generateAdImage(magicPrompt)
            ]);

            if (typeof textResult === 'object') {
                if (adTitleRef.current) adTitleRef.current.value = textResult.title;
                if (adContentRef.current) adContentRef.current.value = textResult.content;
            }

            if (imageResult) {
                const pr = document.getElementById('postImgPreview') as HTMLImageElement;
                const pl = document.getElementById('postImgPlaceholder');
                const inp = document.getElementById('postImgInput') as HTMLInputElement;
                if (pr) {
                    pr.src = imageResult;
                    pr.classList.remove('hidden');
                    pl?.classList.add('hidden');
                }
                if (inp) inp.value = imageResult;
            }
            setToast({ m: "Anúncio Criado pela IA!", t: "success" });
            setMagicPrompt('');
        } catch (e) {
            setToast({ m: "Erro na criação mágica.", t: "error" });
        } finally {
            setIsGeneratingAI(false);
            setIsGeneratingImageAI(false);
        }
    };

    const handleGenerateAI = async (type: 'short' | 'radio' = 'short') => {
        const title = adTitleRef.current?.value;
        const profession = currentUser?.profession || 'Profissional';
        if (!title) { setToast({ m: "Dê um título primeiro!", t: "error" }); return; }
        setIsGeneratingAI(true);
        try {
            const res = await generateAdCopy(profession, title, type);
            if (adContentRef.current) {
                adContentRef.current.value = typeof res === 'object' ? res.content : res;
            }
            setToast({ m: "Texto Gerado!", t: "success" });
        } catch (e) { setToast({ m: "Erro na IA.", t: "error" }); } finally { setIsGeneratingAI(false); }
    };

    const handleListenLocution = async () => {
        const text = adContentRef.current?.value;
        if (!text) { setToast({ m: "Escreva algo primeiro!", t: "error" }); return; }
        setIsGeneratingAudio(true);
        try {
            const base64Audio = await generateAudioTTS(text);
            if (base64Audio) {
                if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const ctx = audioContextRef.current;
                const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
                if (audioSourceRef.current) audioSourceRef.current.stop();
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start();
                audioSourceRef.current = source;
                setToast({ m: "Ouvindo Locução Digital...", t: "success" });
            }
        } catch (err) { setToast({ m: "Erro no áudio", t: "error" }); } finally { setIsGeneratingAudio(false); }
    };

    const handleSaveSupabaseManual = () => {
        if (reinitializeSupabase(supUrlInput, supKeyInput)) setToast({ m: "Reiniciando...", t: "success" });
        else setToast({ m: "Dados inválidos.", t: "error" });
    };

    const renderView = () => {
        if (!currentUser && ['DASHBOARD', 'ADMIN', 'PAYMENT'].includes(currentView)) {
           return <div className="flex-1 flex flex-col items-center justify-center py-40"><Loader2 size={48} className="animate-spin text-brand-primary" /></div>;
        }

        switch(currentView) {
            case 'HOME':
                const visiblePosts = posts.filter(p => (p.authorId === 'admin' || allUsers.find(u => u.id === p.authorId)?.paymentStatus === PaymentStatus.CONFIRMED));
                const filtered = filterCategory === 'ALL' ? visiblePosts : visiblePosts.filter(p => p.category === filterCategory);
                return (
                    <div className="animate-in fade-in duration-700">
                        <section className="relative pt-32 pb-12 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-dark to-brand-secondary/5" />
                            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                                <div className="text-center lg:text-left">
                                    <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-brand-accent uppercase tracking-widest mb-6">{siteConfig?.heroLabel || 'Hélio Júnior'}</div>
                                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-none">{siteConfig?.heroTitle || 'Portal de Anúncios'}</h1>
                                    <p className="text-xl text-gray-400 mb-10 italic">"{siteConfig?.heroSubtitle || ''}"</p>
                                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                                        <Button onClick={() => document.getElementById('ads')?.scrollIntoView({behavior:'smooth'})}>Ver Anúncios</Button>
                                        <Button variant="outline" onClick={() => setCurrentView('REGISTER')}>Quero Anunciar</Button>
                                    </div>
                                </div>
                                <div className="aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative group">
                                    <img src={siteConfig?.heroImageUrl || ''} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Banner" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent" />
                                </div>
                            </div>
                        </section>
                        <section className="max-w-7xl mx-auto px-4 mb-20 relative z-10">
                            <div className="mb-8">
                                <h3 className="text-xs font-black text-brand-accent uppercase tracking-widest mb-4">Destaques da Semana</h3>
                                <AdSlider ads={visiblePosts.slice(0, 5)} allUsers={allUsers} />
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button onClick={() => setFilterCategory('ALL')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === 'ALL' ? 'bg-white text-brand-dark border-white' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>Todos</button>
                                {categories.map(c => <button key={c} onClick={() => setFilterCategory(c)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === c ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>{c}</button>)}
                            </div>
                        </section>
                        <section id="ads" className="max-w-7xl mx-auto px-4 pb-24 min-h-[400px]">
                            {filtered.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{filtered.map(p => <PostCard key={p.id} post={p} author={allUsers.find(u => u.id === p.authorId)} />)}</div>
                            ) : <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/5"><ImageIcon size={48} className="mx-auto text-gray-600 mb-4 opacity-20" /><p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhum anúncio ativo.</p></div>}
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
                                    <div className="flex justify-between items-center"><h2 className="text-3xl font-black uppercase text-brand-accent tracking-tighter">Central de Comando</h2><Button onClick={clearSupabaseCredentials} variant="danger" className="text-[10px] uppercase h-10">Resetar DB</Button></div>
                                    <div className="glass-panel p-8 rounded-[40px] border border-white/5 space-y-6">
                                        <div className="flex items-center gap-3"><Database className="text-brand-primary" size={20} /><h3 className="text-xs font-black uppercase text-white">Configuração Supabase</h3></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input value={supUrlInput} onChange={e => setSupUrlInput(e.target.value)} placeholder="URL do Projeto" className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-[11px] text-white" />
                                            <input value={supKeyInput} onChange={e => setSupKeyInput(e.target.value)} placeholder="Anon Key" className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-[11px] text-white" />
                                        </div>
                                        <Button onClick={handleSaveSupabaseManual} className="w-full h-12 uppercase text-[10px]"><RefreshCcw size={14}/> Salvar e Reiniciar</Button>
                                    </div>
                                    <div className="fixed bottom-10 right-10 z-[110]"><Button onClick={() => storageService.updateConfig(siteConfig).then(() => { refresh(); setToast({m: "Salvo!", t: "success"}) })} className="h-20 w-64 shadow-2xl rounded-3xl"><CheckCircle2 /> SALVAR GERAL</Button></div>
                                </div>
                            )}
                            {adminSubView === 'INICIO' && (
                                <div className="space-y-10 animate-in fade-in">
                                    <h2 className="text-4xl font-black uppercase text-white">Painel</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="glass-panel p-8 rounded-[40px]"><p className="text-5xl font-black text-white">{advertisersList.length}</p><span className="text-[10px] font-black text-gray-600 uppercase">CLIENTES</span></div>
                                        <div className="glass-panel p-8 rounded-[40px]"><p className="text-5xl font-black text-white">{posts.length}</p><span className="text-[10px] font-black text-gray-600 uppercase">ANÚNCIOS</span></div>
                                    </div>
                                </div>
                            )}
                            {adminSubView === 'PAGAMENTOS' && (
                                <div className="space-y-8 animate-in fade-in">
                                    <h2 className="text-3xl font-black uppercase text-white">Pagamentos</h2>
                                    {awaitingList.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {awaitingList.map(u => (
                                                <div key={u.id} className="glass-panel p-8 rounded-[40px] border-l-brand-secondary border-l-4">
                                                    <p className="text-lg font-black text-white mb-2 uppercase">{u.name}</p>
                                                    <Button onClick={() => handleConfirmPayment(u)} className="w-full h-14 font-black uppercase text-xs">Aprovar PIX</Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-500 font-bold uppercase text-xs">Sem pendências.</p>}
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
                            {/* GERADOR MÁGICO COM IA */}
                            <div className="relative group overflow-hidden rounded-[40px] p-1 bg-gradient-to-r from-brand-primary via-purple-500 to-brand-secondary">
                                <div className="bg-brand-dark rounded-[39px] p-8 space-y-6 relative overflow-hidden">
                                    <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl" />
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-3 bg-brand-primary/20 rounded-2xl"><Sparkles className="text-brand-primary" size={24} /></div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Gerador Mágico IA</h2>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Crie título, texto e imagem de uma vez</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <input 
                                            value={magicPrompt} 
                                            onChange={e => setMagicPrompt(e.target.value)} 
                                            placeholder="Ex: Promoção de pizza com borda recheada para este sábado..." 
                                            className="flex-1 bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-brand-primary transition-all text-sm"
                                        />
                                        <Button 
                                            onClick={handleMagicGenerate} 
                                            isLoading={isGeneratingAI}
                                            className="md:w-64 h-16 rounded-3xl"
                                        >
                                            <Wand2 size={18} /> GERAR TUDO
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel p-10 rounded-[40px] border-2 border-brand-primary/20 shadow-2xl relative overflow-hidden">
                                {editingPost && <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-primary animate-pulse" />}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <h2 className="text-3xl font-black uppercase text-white tracking-tighter">{editingPost ? 'Editar Anúncio' : 'Dados do Anúncio'}</h2>
                                    <div className="flex flex-wrap gap-2">
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
                                    if(!imgVal && !editingPost) { setToast({m: "Imagem necessária!", t: "error"}); return; }
                                    const postData = { id: editingPost ? editingPost.id : 'p-'+Date.now(), authorId: currentUser.id, authorName: currentUser.name, category: currentUser.profession || 'Geral', title: form.title.value, content: form.content.value, imageUrl: imgVal || editingPost?.imageUrl, whatsapp: currentUser.phone, phone: currentUser.phone, createdAt: editingPost ? editingPost.createdAt : new Date().toISOString() };
                                    if (editingPost) await storageService.updatePost(postData);
                                    else await storageService.addPost(postData);
                                    setEditingPost(null); refresh(); form.reset();
                                    const pr = document.getElementById('postImgPreview') as HTMLImageElement;
                                    pr?.classList.add('hidden');
                                    document.getElementById('postImgPlaceholder')?.classList.remove('hidden');
                                    (document.getElementById('postImgInput') as HTMLInputElement).value = "";
                                }} className="space-y-6">
                                    <input ref={adTitleRef} name="title" required placeholder="Título" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary font-bold" />
                                    <textarea ref={adContentRef} name="content" required placeholder="Descrição..." className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white h-40 outline-none focus:border-brand-primary text-sm" />
                                    <div onClick={() => document.getElementById('postFilePicker')?.click()} className="aspect-video bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-brand-primary transition-all">
                                        <img id="postImgPreview" className="w-full h-full object-contain hidden relative z-10" />
                                        <div id="postImgPlaceholder" className="flex flex-col items-center gap-2">
                                            {isGeneratingImageAI ? <Loader2 className="animate-spin text-brand-primary" size={48} /> : <Camera className="text-gray-500" size={32} />}
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{isGeneratingImageAI ? 'Gerando Imagem com IA...' : 'Trocar Foto'}</span>
                                        </div>
                                        <input id="postImgInput" type="hidden" /><input id="postFilePicker" type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                            const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = async () => { const comp = await compressImage(r.result as string); (document.getElementById('postImgInput') as HTMLInputElement).value = comp; const pr = document.getElementById('postImgPreview') as HTMLImageElement; pr.src = comp; pr.classList.remove('hidden'); document.getElementById('postImgPlaceholder')?.classList.add('hidden'); }; r.readAsDataURL(f); }
                                        }} />
                                    </div>
                                    <div className="flex gap-4">
                                        <Button type="submit" className="flex-1 h-16 uppercase font-black text-lg">{editingPost ? 'Salvar Alterações' : 'Publicar Anúncio Agora'}</Button>
                                        {editingPost && <Button type="button" variant="outline" onClick={() => setEditingPost(null)} className="h-16 uppercase font-black px-8">Cancelar</Button>}
                                    </div>
                                </form>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {userPostsList.map(p => (
                                    <div key={p.id} className="relative group">
                                        <PostCard post={p} author={currentUser} />
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                                            <button onClick={() => { setEditingPost(p); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-3 bg-brand-primary text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><Edit size={18}/></button>
                                            <button onClick={() => { if(confirm("Remover?")) storageService.deletePost(p.id).then(refresh) }} className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-4 glass-panel p-8 rounded-[40px] text-center h-fit sticky top-24 border border-brand-accent/20">
                            <h3 className="font-black text-xl mb-4 text-brand-accent uppercase">Minha Conta</h3>
                            <div className={`p-4 rounded-2xl border mb-6 text-[10px] font-black uppercase tracking-widest ${currentUser?.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'}`}>STATUS: {currentUser?.paymentStatus || '...'}</div>
                            <Button onClick={() => setCurrentView('PAYMENT')} variant="secondary" className="w-full py-4 text-[10px] font-black uppercase tracking-widest">Mudar de Plano</Button>
                        </div>
                    </div>
                );

            case 'PAYMENT':
                return (
                    <div className="pt-32 pb-20 max-w-6xl mx-auto px-4 text-center animate-in zoom-in">
                        <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-tighter">Escolha seu Plano</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                            {plans.map(p => (
                                <div key={p.id} onClick={() => {
                                    if (!currentUser) return;
                                    const isFree = p.price === 0;
                                    let exp = undefined; if(isFree) { const d = new Date(); d.setDate(d.getDate() + p.durationDays); exp = d.toISOString(); }
                                    storageService.updateUser({ ...currentUser, planId: p.id, paymentStatus: isFree ? PaymentStatus.CONFIRMED : PaymentStatus.AWAITING, expiresAt: exp }).then(() => { refresh(); if(isFree) setCurrentView('DASHBOARD'); });
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
                        <button onClick={() => setCurrentView('DASHBOARD')} className="mt-10 text-[10px] font-black text-gray-600 uppercase hover:text-white transition-colors">Voltar</button>
                    </div>
                );
            case 'LOGIN':
            case 'REGISTER':
                return (
                    <div className="pt-40 pb-20 max-w-md mx-auto px-4 animate-in zoom-in">
                        <div className="glass-panel p-10 rounded-[40px] shadow-2xl border border-white/5">
                            <h2 className="text-4xl font-black text-center mb-8 uppercase tracking-tighter text-white">{currentView === 'LOGIN' ? 'Bem-vindo' : 'Criar Conta'}</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.target as any;
                                const email = form.email.value;
                                try {
                                    if (currentView === 'LOGIN') {
                                        const user = await storageService.findUserByEmail(email);
                                        if (user) handleLogin(user); else setToast({ m: "Não encontrado.", t: "error"});
                                    } else {
                                        const u = await storageService.addUser({ name: form.name.value, email: email.toLowerCase(), role: UserRole.ADVERTISER, profession: form.profession.value, phone: form.phone.value, paymentStatus: PaymentStatus.AWAITING });
                                        handleLogin(u);
                                    }
                                } catch (err) { setToast({ m: "Erro.", t: "error" }); }
                            }} className="space-y-4">
                                {currentView === 'REGISTER' && (
                                    <><input name="name" required placeholder="Nome/Empresa" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                    <select name="profession" className="w-full bg-brand-dark border border-white/10 p-4 rounded-2xl text-white font-bold">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                    <input name="phone" required placeholder="WhatsApp" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" /></>
                                )}
                                <input name="email" type="email" required placeholder="E-mail" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                <input name="password" type="password" required placeholder="Senha" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-brand-primary" />
                                <Button type="submit" className="w-full h-16 uppercase font-black">{currentView === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</Button>
                                <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-[10px] text-gray-500 font-black mt-4 uppercase hover:text-white">{currentView === 'LOGIN' ? 'Criar conta' : 'Já tem conta?'}</button>
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
