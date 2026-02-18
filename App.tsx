
import React, { useState, useEffect, useRef } from 'react';
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
    ChevronLeft, ChevronRight, Wand2, ShieldAlert, Lock, Ban, Check, Terminal, Globe, Info, Clock, ExternalLink,
    Instagram, Facebook, Youtube, MapPin, Phone as PhoneIcon, Smartphone, Upload, Image as ImageIcon, X
} from 'lucide-react';

type AdminSubView = 'INICIO' | 'CLIENTES' | 'ANUNCIOS' | 'PLANOS' | 'AJUSTES';

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
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    const showToast = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 4000);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof SiteConfig) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setSiteConfig(prev => ({ ...prev, [field]: base64 }));
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        if (siteConfig.googleTagId) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${siteConfig.googleTagId}`;
            document.head.appendChild(script);
            const script2 = document.createElement('script');
            script2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${siteConfig.googleTagId}');`;
            document.head.appendChild(script2);
        }
        if (siteConfig.facebookPixelId) {
            const script = document.createElement('script');
            script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${siteConfig.facebookPixelId}'); fbq('track', 'PageView');`;
            document.head.appendChild(script);
        }
    }, [siteConfig.googleTagId, siteConfig.facebookPixelId]);

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

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const newConfig = {
            ...siteConfig,
            heroTitle: formData.get('heroTitle') as string,
            heroSubtitle: formData.get('heroSubtitle') as string,
            heroLabel: formData.get('heroLabel') as string,
            address: formData.get('address') as string,
            phone: formData.get('phone') as string,
            whatsapp: formData.get('whatsapp') as string,
            instagramUrl: formData.get('instagramUrl') as string,
            facebookUrl: formData.get('facebookUrl') as string,
            youtubeUrl: formData.get('youtubeUrl') as string,
            googleTagId: formData.get('googleTagId') as string,
            facebookPixelId: formData.get('facebookPixelId') as string,
        };
        await storageService.updateConfig(newConfig);
        setSiteConfig(newConfig);
        showToast("Configurações salvas com sucesso!");
    };

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

    const handleSavePostEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPost) return;
        await storageService.addPost(editingPost); // addPost handle upsert in storage/supabase context
        setEditingPost(null);
        showToast("Anúncio atualizado!");
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

    const handleMagicGenerate = async () => {
        if (!magicPrompt.trim() || !currentUser) return;
        setIsLoading(true);
        try {
            const result = await generateAdCopy(currentUser.profession || 'Geral', magicPrompt, 'short');
            let title = "Anúncio VIP";
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
                category: currentUser.profession || 'Comércio',
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
            showToast("IA criou seu anúncio!");
        } catch (error) {
            showToast("Erro na IA.", "error");
        } finally {
            setIsLoading(false);
        }
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
                                            <button onClick={() => setEditingPlan(p)} className="p-2 text-gray-400 hover:text-white transition-colors"><Edit size={16}/></button>
                                            <button onClick={() => {if(confirm("Excluir?")) storageService.deletePlan(p.id).then(refresh)}} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
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
                    <div className="space-y-6 animate-in slide-in-from-right relative">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Moderação de Todos Anúncios</h3>
                        
                        {editingPost && (
                            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                                <form onSubmit={handleSavePostEdit} className="glass-panel p-10 rounded-[45px] w-full max-w-2xl space-y-6 border-white/10">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-2xl font-black text-white uppercase">Editar Anúncio</h4>
                                        <button type="button" onClick={() => setEditingPost(null)} className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white"><X size={24}/></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Título</label>
                                            <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                            <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Categoria</label>
                                            <input value={editingPost.category} onChange={e => setEditingPost({...editingPost, category: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">WhatsApp</label>
                                            <input value={editingPost.whatsapp} onChange={e => setEditingPost({...editingPost, whatsapp: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                                            <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Telefone</label>
                                            <input value={editingPost.phone} onChange={e => setEditingPost({...editingPost, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                                        </div>
                                    </div>
                                    <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest block">Conteúdo</label>
                                    <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none h-32 resize-none" required />
                                    
                                    <div className="flex gap-4 pt-4">
                                        <Button type="submit" className="flex-1 h-16 uppercase font-black">Salvar Alterações</Button>
                                        <Button variant="outline" type="button" onClick={() => setEditingPost(null)} className="flex-1 h-16 uppercase font-black">Cancelar</Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map(p => (
                                <div key={p.id} className="relative group">
                                    <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <button onClick={() => setEditingPost(p)} className="p-3 bg-brand-primary rounded-2xl text-white shadow-xl hover:scale-110 transition-transform"><Edit size={16}/></button>
                                        <button onClick={() => {if(confirm("Deseja excluir este anúncio permanentemente?")) storageService.deletePost(p.id).then(refresh)}} className="p-3 bg-red-600 rounded-2xl text-white shadow-xl hover:scale-110 transition-transform"><Trash2 size={16}/></button>
                                    </div>
                                    <PostCard post={p} author={allUsers.find(u => u.id === p.authorId)} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'AJUSTES':
                return (
                    <div className="max-w-5xl space-y-8 animate-in slide-in-from-right pb-20">
                        <form onSubmit={handleSaveConfig} className="glass-panel p-10 rounded-[40px] space-y-12 border-white/5 shadow-2xl">
                             <div className="flex items-center gap-4 border-b border-white/10 pb-6 mb-6">
                                <div className="p-4 bg-brand-primary/20 rounded-3xl text-brand-primary"><LayoutDashboard size={32}/></div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Portal Administrativo</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Ajuste o visual, as logos e as tags de rastreamento.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <label className="text-[11px] font-black text-brand-primary uppercase tracking-[0.2em] border-l-4 border-brand-primary pl-4 block">Visual & Hero</label>
                                    
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logomarca do Cabeçalho</p>
                                        <div className="flex items-center gap-4">
                                            {siteConfig.headerLogoUrl && <img src={siteConfig.headerLogoUrl} className="h-12 w-24 object-contain bg-white/5 rounded-lg p-1"/>}
                                            <label className="flex-1 cursor-pointer bg-white/5 border border-dashed border-white/20 p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                                                <Upload size={16} className="text-gray-400"/>
                                                <span className="text-[10px] text-gray-400 font-black uppercase">Fazer Upload</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'headerLogoUrl')}/>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Imagem Principal do Banner (Hero)</p>
                                        <div className="space-y-4">
                                            {siteConfig.heroImageUrl && <img src={siteConfig.heroImageUrl} className="w-full aspect-video object-cover rounded-2xl shadow-lg border border-white/10"/>}
                                            <label className="w-full cursor-pointer bg-brand-primary/10 border border-dashed border-brand-primary/30 p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-primary/20 transition-all">
                                                <ImageIcon size={16} className="text-brand-primary"/>
                                                <span className="text-[10px] text-brand-primary font-black uppercase">Alterar Foto Paisagem</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'heroImageUrl')}/>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <input name="heroLabel" defaultValue={siteConfig.heroLabel} placeholder="Rótulo Curto (ex: Hélio Júnior)" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-brand-primary" />
                                        <input name="heroTitle" defaultValue={siteConfig.heroTitle} placeholder="Título Principal do Site" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-brand-primary" />
                                        <textarea name="heroSubtitle" defaultValue={siteConfig.heroSubtitle} placeholder="Frase de efeito ou subtítulo" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none h-24 resize-none focus:border-brand-primary" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="text-[11px] font-black text-brand-accent uppercase tracking-[0.2em] border-l-4 border-brand-accent pl-4 block">Rodapé & Redes Sociais</label>
                                    
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logomarca do Rodapé</p>
                                        <div className="flex items-center gap-4">
                                            {siteConfig.footerLogoUrl && <img src={siteConfig.footerLogoUrl} className="h-12 w-24 object-contain bg-white/5 rounded-lg p-1"/>}
                                            <label className="flex-1 cursor-pointer bg-white/5 border border-dashed border-white/20 p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                                                <Upload size={16} className="text-gray-400"/>
                                                <span className="text-[10px] text-gray-400 font-black uppercase">Fazer Upload</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'footerLogoUrl')}/>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 pt-4">
                                        <input name="address" defaultValue={siteConfig.address} placeholder="Endereço Comercial" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-brand-accent" />
                                        <input name="phone" defaultValue={siteConfig.phone} placeholder="Telefone de Contato" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-brand-accent" />
                                        <input name="whatsapp" defaultValue={siteConfig.whatsapp} placeholder="WhatsApp (Link ou Número)" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-green-500" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input name="instagramUrl" defaultValue={siteConfig.instagramUrl} placeholder="Link Instagram" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                                            <input name="facebookUrl" defaultValue={siteConfig.facebookUrl} placeholder="Link Facebook" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-white/10 mt-6">
                                        <label className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> Marketing & Pixel</label>
                                        <div className="space-y-4">
                                            <input name="googleTagId" defaultValue={siteConfig.googleTagId} placeholder="Google Tag ID (ex: G-H2J8L9P2)" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-green-500" />
                                            <input name="facebookPixelId" defaultValue={siteConfig.facebookPixelId} placeholder="Facebook Pixel ID" className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-20 font-black uppercase text-sm tracking-[0.3em] shadow-2xl">
                                <RefreshCcw size={18} className="mr-2"/> Salvar Todas Configurações
                            </Button>
                        </form>

                        <div className="glass-panel p-10 rounded-[40px] border-white/5 flex items-center justify-between shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-brand-primary/20 rounded-3xl text-brand-primary"><Database size={32}/></div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Status Cloud</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">{isOnline ? 'Banco de dados conectado e sincronizado.' : 'Banco de dados não disponível.'}</p>
                                </div>
                            </div>
                            <Button onClick={async () => {setIsTestingConn(true); const r = await db.testConnection(); setDiagLogs(r.logs); setIsTestingConn(false);}} isLoading={isTestingConn} variant="outline" className="h-16 px-10 text-[10px] uppercase font-black">Testar Conexão</Button>
                        </div>
                    </div>
                );
            case 'INICIO':
            default:
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom">
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-primary shadow-2xl group hover:-translate-y-2 transition-all duration-300">
                            <Users size={32} className="text-brand-primary mb-4 group-hover:scale-110 transition-transform"/>
                            <p className="text-6xl font-black text-white mb-2">{allUsers.length}</p>
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Assinantes VIP</span>
                        </div>
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-secondary shadow-2xl group hover:-translate-y-2 transition-all duration-300">
                            <MessageCircle size={32} className="text-brand-secondary mb-4 group-hover:scale-110 transition-transform"/>
                            <p className="text-6xl font-black text-white mb-2">{posts.length}</p>
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Ofertas Ativas</span>
                        </div>
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-brand-accent shadow-2xl group hover:-translate-y-2 transition-all duration-300">
                            <Tag size={32} className="text-brand-accent mb-4 group-hover:scale-110 transition-transform"/>
                            <p className="text-6xl font-black text-white mb-2">{plans.length}</p>
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Planos Criados</span>
                        </div>
                        <div className="glass-panel p-10 rounded-[40px] border-b-8 border-green-500 shadow-2xl group hover:-translate-y-2 transition-all duration-300">
                            <Globe size={32} className="text-green-500 mb-4 group-hover:scale-110 transition-transform"/>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <p className="text-2xl font-black text-white uppercase">{isOnline ? 'Cloud' : 'Offline'}</p>
                            </div>
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Sincronia Real</span>
                        </div>
                    </div>
                );
        }
    };

    const renderContent = () => {
        if (currentView === 'ADMIN') {
            return (
                <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-brand-dark pt-20">
                    <aside className="w-full md:w-80 bg-brand-dark/50 border-r border-white/5 p-8 space-y-3">
                        <div className="px-4 mb-10">
                             <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3"><ShieldAlert size={24} className="text-brand-accent"/> Gestão VIP</h2>
                             <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1 italic">Bem-vindo, {currentUser?.name}</p>
                        </div>
                        {[
                            { id: 'INICIO', label: 'Painel Geral', icon: LayoutDashboard },
                            { id: 'CLIENTES', label: 'Assinantes', icon: Users },
                            { id: 'ANUNCIOS', label: 'Moderador', icon: MessageCircle },
                            { id: 'PLANOS', label: 'Planos & Preços', icon: Tag },
                            { id: 'AJUSTES', label: 'Configurações', icon: Database },
                        ].map(item => (
                            <button key={item.id} onClick={() => setAdminSubView(item.id as AdminSubView)} className={`w-full flex items-center gap-4 p-5 rounded-[25px] transition-all border ${adminSubView === item.id ? 'bg-brand-primary border-brand-primary text-white shadow-xl scale-105' : 'text-gray-400 border-transparent hover:bg-white/5'}`}>
                                <item.icon size={20} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                            </button>
                        ))}
                    </aside>
                    <main className="flex-1 p-10 overflow-y-auto">{renderAdminContent()}</main>
                </div>
            );
        }

        if (currentView === 'HOME') {
            const confirmedPosts = posts.filter(p => {
                const author = allUsers.find(u => u.id === p.authorId);
                return author?.paymentStatus === PaymentStatus.CONFIRMED || p.authorId === 'admin';
            });

            return (
                <div className="animate-in fade-in duration-1000 pb-40">
                    <section className="relative pt-48 pb-24 overflow-hidden min-h-[85vh] flex items-center">
                        <div className="absolute inset-0 z-0">
                            <img src={siteConfig.heroImageUrl} className="w-full h-full object-cover opacity-15 scale-110 blur-xl" alt=""/>
                            <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/0 via-brand-dark/60 to-brand-dark" />
                        </div>
                        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                            <div className="flex flex-col lg:flex-row items-center gap-16 xl:gap-24">
                                <div className="flex-1 text-center lg:text-left">
                                    <div className="inline-block px-5 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] mb-10 shadow-2xl backdrop-blur-md">
                                        Credibilidade & Alcance
                                    </div>
                                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-[1.1] drop-shadow-2xl max-w-2xl">
                                        {siteConfig.heroTitle}
                                    </h1>
                                    <p className="text-lg md:text-xl text-gray-400 italic mb-14 max-w-xl lg:mx-0 mx-auto opacity-70 leading-relaxed font-medium">
                                        "{siteConfig.heroSubtitle}"
                                    </p>
                                    <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-6">
                                        <Button onClick={() => document.getElementById('ads-section')?.scrollIntoView({behavior:'smooth'})} className="h-20 px-14 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-primary/20 group">
                                            Explorar Ofertas <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform ml-2"/>
                                        </Button>
                                        <Button variant="outline" onClick={() => setCurrentView('REGISTER')} className="h-20 px-14 font-black uppercase text-xs tracking-[0.2em] hover:bg-white/5 backdrop-blur-xl border-white/20">
                                            Anunciar Aqui
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="w-full lg:w-[550px] shrink-0">
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-gradient-to-br from-brand-primary to-purple-600 rounded-[50px] blur-3xl opacity-20 group-hover:opacity-40 transition-all duration-1000" />
                                        <div className="relative glass-panel rounded-[45px] p-2 border-white/10 overflow-hidden shadow-3xl transform group-hover:-rotate-1 transition-transform duration-700">
                                            <img 
                                                src={siteConfig.heroImageUrl} 
                                                className="w-full aspect-video object-cover rounded-[40px] shadow-2xl" 
                                                alt="Portal de Classificados" 
                                            />
                                            <div className="absolute bottom-10 left-10 right-10 bg-brand-dark/70 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent shadow-lg shadow-brand-accent/20"><ImageIcon size={20}/></div>
                                                <div>
                                                    <p className="text-white font-black uppercase text-sm tracking-tight">{siteConfig.heroLabel}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Imagem de Destaque</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="ads-section" className="max-w-7xl mx-auto px-6 mt-10 space-y-32">
                         <div className="space-y-16">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-10">
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Classificados VIP</h2>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] italic">Oportunidades selecionadas pelo portal</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={14} className="text-green-500"/> {confirmedPosts.length} Ofertas
                                    </div>
                                </div>
                            </div>
                            
                            {confirmedPosts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                    {confirmedPosts.map(p => (
                                        <PostCard key={p.id} post={p} author={allUsers.find(u => u.id === p.authorId)} />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-56 text-center glass-panel rounded-[60px] border-dashed border-white/10 flex flex-col items-center justify-center">
                                    <ImageIcon className="text-gray-700 mb-8 opacity-20" size={80}/>
                                    <p className="text-gray-500 uppercase font-black text-xs tracking-[0.4em] mb-3">Nenhum anúncio para exibir</p>
                                    <p className="text-gray-600 text-[10px] font-bold italic">Seja o primeiro a destacar sua marca hoje!</p>
                                </div>
                            )}
                         </div>
                    </section>

                    {/* NOVA SEÇÃO DE PLANOS NA HOME */}
                    <section className="max-w-7xl mx-auto px-6 mt-40 space-y-20">
                        <div className="text-center space-y-4">
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter">Nossos Planos de Assinatura</h2>
                            <p className="text-gray-400 font-bold italic opacity-70">Escolha como quer brilhar no portal {siteConfig.heroLabel}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                            {plans.map(p => (
                                <div key={p.id} className="glass-panel p-10 rounded-[50px] border border-white/5 flex flex-col items-center text-center group hover:border-brand-primary transition-all duration-500">
                                    <div className="p-6 bg-brand-primary/10 rounded-3xl text-brand-primary mb-6 group-hover:scale-110 transition-transform">
                                        <Tag size={32}/>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-2">{p.name}</h3>
                                    <p className="text-4xl font-black text-brand-secondary mb-4">R$ {p.price.toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-6">{p.durationDays} Dias de Exposição</p>
                                    <p className="text-xs text-gray-400 italic opacity-70 mb-8 min-h-[40px] leading-relaxed">"{p.description || 'Destaque-se com profissionalismo.'}"</p>
                                    <Button onClick={() => setCurrentView('REGISTER')} variant="outline" className="w-full h-14 uppercase text-[9px] font-black tracking-widest">Contratar Agora</Button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            );
        }

        if (currentView === 'LOGIN' || currentView === 'REGISTER') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-6 pt-32 pb-20 bg-gradient-to-b from-brand-dark via-brand-dark to-purple-900/10">
                    <div className="glass-panel p-14 rounded-[60px] w-full max-w-md border border-white/10 shadow-3xl animate-in zoom-in duration-700">
                        <div className="flex flex-col items-center mb-12">
                            <div className="p-6 bg-brand-primary/10 rounded-full mb-8 border border-brand-primary/20 shadow-2xl"><ShieldAlert className="text-brand-primary" size={44}/></div>
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter text-center">{currentView === 'LOGIN' ? 'Acessar' : 'Criar Conta'}</h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-3">{siteConfig.heroLabel} VIP</p>
                        </div>
                        <form onSubmit={currentView === 'LOGIN' ? async (e) => {
                            e.preventDefault();
                            const email = (e.target as any).email.value;
                            const user = await storageService.findUserByEmail(email);
                            if (user) {
                                setCurrentUser(user);
                                saveToLocal(STORAGE_KEYS.SESSION, user);
                                setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
                                refresh();
                                showToast(`Bem-vindo de volta!`);
                            } else showToast("E-mail não cadastrado.", "error");
                        } : async (e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            const u = await storageService.addUser({ 
                                name: form.name.value, 
                                email: form.email.value.toLowerCase(), 
                                role: UserRole.ADVERTISER, 
                                paymentStatus: PaymentStatus.AWAITING,
                                profession: form.profession.value,
                                phone: form.phone.value
                            });
                            setCurrentUser(u);
                            saveToLocal(STORAGE_KEYS.SESSION, u);
                            setCurrentView('PAYMENT');
                            refresh();
                        }} className="space-y-6">
                            {currentView === 'REGISTER' && (
                                <>
                                    <input name="name" required placeholder="Nome Completo" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-brand-primary transition-all" />
                                    <input name="phone" required placeholder="WhatsApp" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-brand-primary transition-all" />
                                    <select name="profession" className="w-full bg-brand-dark border border-white/10 p-6 rounded-[30px] text-white outline-none font-black uppercase text-[10px] tracking-widest">
                                        <option value="Comércio">Comércio Geral</option>
                                        <option value="Serviços">Prestação de Serviços</option>
                                        <option value="Profissional Liberal">Profissional Liberal</option>
                                        <option value="Eventos">Eventos & Lazer</option>
                                    </select>
                                </>
                            )}
                            <input name="email" required type="email" placeholder="Seu E-mail Profissional" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-brand-primary transition-all" />
                            <input name="pass" required type="password" placeholder="Senha" className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-white outline-none focus:border-brand-primary transition-all" />
                            
                            <Button type="submit" className="w-full h-20 text-lg uppercase font-black shadow-2xl mt-6">
                                {currentView === 'LOGIN' ? 'Entrar' : 'Próximo Passo'}
                            </Button>
                            
                            <button type="button" onClick={() => setCurrentView(currentView === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-center text-[10px] font-black uppercase text-gray-500 hover:text-white mt-10 tracking-[0.2em] transition-colors flex items-center justify-center gap-2">
                                {currentView === 'LOGIN' ? 'Cadastre-se gratuitamente' : 'Já possui conta? Login'}
                                <ChevronRight size={14}/>
                            </button>
                        </form>
                    </div>
                </div>
            );
        }

        if (currentView === 'PAYMENT') {
            return (
                <div className="flex-1 max-w-7xl mx-auto px-6 pt-48 pb-24 text-center animate-in zoom-in duration-700">
                    <h2 className="text-6xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6 drop-shadow-2xl">Assinatura VIP</h2>
                    <p className="text-gray-400 font-bold mb-20 opacity-70 italic max-w-2xl mx-auto">Escolha o melhor plano para destacar seu negócio com a credibilidade do Portal {siteConfig.heroLabel}.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {plans.map(p => {
                            const blocked = p.price === 0 && !!currentUser?.usedFreeTrial;
                            return (
                                <div key={p.id} onClick={() => {
                                    if (blocked) return showToast("Degustação já utilizada.", "error");
                                    const expiresAt = new Date();
                                    expiresAt.setDate(expiresAt.getDate() + p.durationDays);
                                    storageService.updateUser({ 
                                        ...currentUser!, 
                                        planId: p.id, 
                                        paymentStatus: p.price === 0 ? PaymentStatus.CONFIRMED : PaymentStatus.AWAITING, 
                                        expiresAt: expiresAt.toISOString(), 
                                        usedFreeTrial: currentUser?.usedFreeTrial || p.price === 0 
                                    }).then(() => {
                                        setCurrentView('DASHBOARD');
                                        refresh();
                                        showToast(p.price === 0 ? "Degustação Iniciada!" : "Plano Selecionado!");
                                    });
                                }} className={`glass-panel p-14 rounded-[65px] border-2 transition-all cursor-pointer hover:scale-[1.05] shadow-3xl relative group ${blocked ? 'opacity-30 grayscale cursor-not-allowed border-white/5' : 'border-white/5 hover:border-brand-primary bg-white/2 hover:bg-brand-primary/5'}`}>
                                    {blocked && <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-1.5 rounded-full text-[9px] font-black uppercase">Indisponível</div>}
                                    <div className={`p-8 rounded-[35px] mx-auto w-fit mb-10 group-hover:scale-110 transition-transform ${blocked ? 'bg-gray-800 text-gray-600' : 'bg-brand-primary/10 text-brand-primary'}`}>
                                        <Tag size={40}/>
                                    </div>
                                    <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">{p.name}</h3>
                                    <div className="mb-10">
                                        <p className="text-5xl font-black text-brand-secondary">R$ {p.price.toFixed(2)}</p>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-4">{p.durationDays} Dias de Anúncios</p>
                                    </div>
                                    <p className="text-sm text-gray-400 italic mb-12 min-h-[50px] opacity-70 leading-relaxed">"{p.description}"</p>
                                    <Button disabled={blocked} variant={p.price === 0 ? "outline" : "primary"} className="w-full h-18 uppercase text-[10px] font-black tracking-[0.3em] shadow-2xl">
                                        {blocked ? "Já Resgatado" : p.price === 0 ? "Iniciar Agora" : "Assinar Plano"}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (currentView === 'DASHBOARD' && currentUser) {
            const myPosts = posts.filter(p => p.authorId === currentUser.id);
            const isExpired = currentUser.expiresAt && new Date(currentUser.expiresAt) < new Date();
            const needsPayment = currentUser.paymentStatus === PaymentStatus.AWAITING;

            return (
                <div className="pt-32 pb-40 max-w-7xl mx-auto px-6 animate-in slide-in-from-bottom duration-1000">
                     <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-20 border-b border-white/5 pb-16">
                        <div className="flex items-center gap-10 text-center md:text-left flex-col md:flex-row">
                            <div className="w-28 h-28 bg-gradient-to-br from-brand-primary to-purple-600 rounded-[40px] flex items-center justify-center text-white font-black text-5xl shadow-3xl border border-white/20">
                                {currentUser.name[0]}
                            </div>
                            <div>
                                <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">Painel do Anunciante</h2>
                                <div className="flex items-center justify-center md:justify-start gap-4">
                                    <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl ${isExpired ? 'bg-red-500 text-white' : 'bg-green-500/10 text-green-400'}`}>
                                        {isExpired ? 'PLANO EXPIRADO' : 'STATUS: ATIVO'}
                                    </span>
                                    {currentUser.expiresAt && !isExpired && (
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2 italic">
                                            <Clock size={14}/> Renovar em: {new Date(currentUser.expiresAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        { (isExpired || needsPayment) && (
                            <Button onClick={() => setCurrentView('PAYMENT')} variant="outline" className="h-20 px-12 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-brand-dark uppercase font-black text-[11px] tracking-widest shadow-2xl">
                                Regularizar Assinatura
                            </Button>
                        )}
                     </div>

                     <div className="bg-brand-dark rounded-[60px] p-16 border border-white/5 shadow-3xl mb-24 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-all duration-1000 scale-150">
                            <Sparkles size={250} className="text-brand-primary"/>
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black text-white uppercase mb-10 flex items-center gap-4">
                                <Wand2 className="text-brand-primary" size={36}/> 
                                Criador de Anúncios com IA
                            </h2>
                            <div className="flex flex-col md:flex-row gap-6">
                                <input 
                                    value={magicPrompt} 
                                    onChange={e => setMagicPrompt(e.target.value)} 
                                    placeholder="Descreva o que quer vender (ex: Vendo Carro 2022 único dono...)" 
                                    className="flex-1 bg-white/5 border border-white/10 p-8 rounded-[35px] text-white outline-none focus:border-brand-primary transition-all text-lg shadow-inner" 
                                />
                                <Button 
                                    onClick={handleMagicGenerate} 
                                    isLoading={isLoading} 
                                    disabled={isExpired || needsPayment}
                                    className="h-24 md:w-[350px] font-black uppercase text-sm tracking-[0.3em] shadow-2xl"
                                >
                                    Gerar Anúncio Mágico
                                </Button>
                            </div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-8 italic opacity-60">A IA criará a imagem e o texto persuasivo para seu anúncio ser um sucesso.</p>
                        </div>
                     </div>

                     <div className="space-y-12">
                        <div className="flex items-center gap-6">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Minhas Publicações</h3>
                            <div className="h-[2px] flex-1 bg-white/5" />
                        </div>
                        {myPosts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                {myPosts.map(p => (
                                    <div key={p.id} className="relative group animate-in zoom-in duration-500">
                                        <div className="absolute top-6 right-6 z-20 flex gap-2">
                                            <button onClick={() => setEditingPost(p)} className="p-4 bg-brand-primary rounded-[20px] text-white opacity-0 group-hover:opacity-100 shadow-3xl transition-all scale-75 group-hover:scale-100">
                                                <Edit size={18}/>
                                            </button>
                                            <button onClick={() => {if(confirm("Excluir este anúncio permanentemente?")) storageService.deletePost(p.id).then(refresh)}} className="p-4 bg-red-600 rounded-[20px] text-white opacity-0 group-hover:opacity-100 shadow-3xl transition-all scale-75 group-hover:scale-100 hover:bg-red-700">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                        <PostCard post={p} author={currentUser} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-48 text-center glass-panel rounded-[60px] border-dashed border-white/10 flex flex-col items-center">
                                <Plus className="text-gray-700 mb-8 opacity-20" size={80}/>
                                <p className="text-gray-500 uppercase font-black text-sm tracking-[0.4em] mb-4">Seu portfólio está vazio</p>
                                <p className="text-gray-600 text-[11px] font-bold italic">Use a Inteligência Artificial acima para criar sua primeira oferta!</p>
                            </div>
                        )}
                     </div>

                     {editingPost && (
                        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                            <form onSubmit={handleSavePostEdit} className="glass-panel p-10 rounded-[45px] w-full max-w-2xl space-y-6 border-white/10">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-2xl font-black text-white uppercase">Editar Meu Anúncio</h4>
                                    <button type="button" onClick={() => setEditingPost(null)} className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white"><X size={24}/></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Título</label>
                                        <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                        <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">WhatsApp</label>
                                        <input value={editingPost.whatsapp} onChange={e => setEditingPost({...editingPost, whatsapp: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Categoria</label>
                                        <input value={editingPost.category} onChange={e => setEditingPost({...editingPost, category: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" required />
                                        <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Telefone</label>
                                        <input value={editingPost.phone} onChange={e => setEditingPost({...editingPost, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                                    </div>
                                </div>
                                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest block">Conteúdo</label>
                                <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none h-32 resize-none" required />
                                <div className="flex gap-4 pt-4">
                                    <Button type="submit" className="flex-1 h-16 uppercase font-black">Salvar Edição</Button>
                                    <Button variant="outline" type="button" onClick={() => setEditingPost(null)} className="flex-1 h-16 uppercase font-black">Cancelar</Button>
                                </div>
                            </form>
                        </div>
                     )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col font-sans selection:bg-brand-primary/40 selection:text-white overflow-x-hidden">
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
            
            <footer className="bg-black/90 border-t border-white/5 py-28 backdrop-blur-3xl mt-auto">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20">
                        <div className="space-y-10">
                            <div className="flex items-center gap-4">
                                {siteConfig.footerLogoUrl ? (
                                    <img src={siteConfig.footerLogoUrl} className="h-14 w-auto object-contain" alt="Logo Rodapé" />
                                ) : (
                                    <div className="p-4 bg-brand-primary/10 rounded-3xl text-brand-primary shadow-2xl"><Smartphone size={32}/></div>
                                )}
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{siteConfig.heroLabel}</h3>
                            </div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] italic opacity-60 leading-relaxed">
                                Credibilidade, alcance e os melhores negócios da região reunidos em um só lugar.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] border-l-2 border-brand-primary pl-4">Fale Conosco</h4>
                            <ul className="space-y-5">
                                {siteConfig.address && (
                                    <li className="flex gap-4 text-gray-500">
                                        <MapPin size={20} className="text-brand-primary shrink-0"/>
                                        <span className="text-[10px] uppercase font-black tracking-widest leading-loose">{siteConfig.address}</span>
                                    </li>
                                )}
                                {siteConfig.phone && (
                                    <li className="flex items-center gap-4 text-gray-500">
                                        <PhoneIcon size={20} className="text-brand-accent shrink-0"/>
                                        <span className="text-[10px] uppercase font-black tracking-widest">{siteConfig.phone}</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="space-y-8">
                            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] border-l-2 border-brand-secondary pl-4">Presença Digital</h4>
                            <div className="flex gap-5">
                                {siteConfig.instagramUrl && (
                                    <a href={siteConfig.instagramUrl} target="_blank" className="p-5 bg-white/5 border border-white/10 rounded-[25px] text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-xl">
                                        <Instagram size={22}/>
                                    </a>
                                )}
                                {siteConfig.facebookUrl && (
                                    <a href={siteConfig.facebookUrl} target="_blank" className="p-5 bg-white/5 border border-white/10 rounded-[25px] text-white hover:bg-blue-600 hover:border-blue-600 transition-all shadow-xl">
                                        <Facebook size={22}/>
                                    </a>
                                )}
                                {siteConfig.whatsapp && (
                                    <a href={siteConfig.whatsapp.startsWith('http') ? siteConfig.whatsapp : `https://wa.me/${siteConfig.whatsapp.replace(/\D/g,'')}`} target="_blank" className="p-5 bg-white/5 border border-white/10 rounded-[25px] text-white hover:bg-green-600 hover:border-green-600 transition-all shadow-xl">
                                        <MessageCircle size={22}/>
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] border-l-2 border-brand-accent pl-4">Acesso Rápido</h4>
                            <div className="flex flex-col gap-4">
                                <button onClick={() => {setCurrentView('HOME'); window.scrollTo(0,0);}} className="text-[10px] uppercase font-black text-gray-500 hover:text-white transition-colors text-left tracking-[0.2em]">Página Inicial</button>
                                <button onClick={() => {setCurrentView('LOGIN'); window.scrollTo(0,0);}} className="text-[10px] uppercase font-black text-gray-500 hover:text-white transition-colors text-left tracking-[0.2em]">Entrar no Painel</button>
                                <button onClick={() => {setCurrentView('REGISTER'); window.scrollTo(0,0);}} className="text-[10px] uppercase font-black text-brand-accent hover:text-white transition-colors text-left tracking-[0.2em]">Quero ser Anunciante</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-28 pt-12 border-t border-white/5 text-center">
                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.6em]">
                            © {new Date().getFullYear()} {siteConfig.heroLabel} Classificados • Design & IA
                        </p>
                    </div>
                </div>
            </footer>

            {toast && (
                <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[300] px-10 py-6 rounded-[35px] shadow-3xl border flex items-center gap-4 animate-in slide-in-from-bottom duration-500 backdrop-blur-2xl ${toast.t === 'success' ? 'bg-green-600/90 border-green-500/50' : 'bg-red-600/90 border-red-500/50'}`}>
                    <div className="p-2 bg-white/20 rounded-full">
                        {toast.t === 'success' ? <Check size={18} className="text-white"/> : <AlertTriangle size={18} className="text-white"/>}
                    </div>
                    <span className="font-black uppercase text-[11px] tracking-[0.2em] text-white drop-shadow-sm">{toast.m}</span>
                </div>
            )}
            
            {isLoading && !diagLogs.length && (
                <div className="fixed inset-0 z-[500] bg-brand-dark/80 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-700">
                    <div className="relative">
                        <div className="absolute inset-0 bg-brand-primary/20 blur-[80px] animate-pulse rounded-full" />
                        <Loader2 className="animate-spin text-brand-primary relative z-10" size={100} />
                    </div>
                    <p className="mt-12 text-[11px] font-black text-white uppercase tracking-[0.6em] animate-pulse">Sintonizando Portal...</p>
                </div>
            )}
        </div>
    );
};

export default App;
