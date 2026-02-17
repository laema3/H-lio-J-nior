
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, DEFAULT_CONFIG, STORAGE_KEYS, getFromLocal, saveToLocal, INITIAL_CATEGORIES } from './services/storage';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Search, Clock, Check, Camera, Loader2, Trash2, Edit3, AlertTriangle, Plus, ShieldCheck, LayoutDashboard, Settings, CreditCard, Tag,
    Instagram, Facebook, Youtube, Mail, Phone, MapPin, Radio, MessageCircle
} from 'lucide-react';

// Inicializa o storage antes de qualquer renderização
storageService.init();

const Toast: React.FC<{ message: string, type: 'success' | 'error', onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${
            type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
        }`}>
            {type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
            <span className="font-bold text-sm uppercase tracking-wider">{message}</span>
        </div>
    );
};

const FloatingWhatsApp: React.FC<{ config: SiteConfig }> = ({ config }) => {
    if (!config.whatsapp) return null;
    const clean = config.whatsapp.replace(/\D/g, '');
    return (
        <a 
            href={`https://wa.me/${clean}`} 
            target="_blank" 
            className="fixed bottom-6 right-6 z-[100] bg-green-500 text-white p-4 rounded-full shadow-2xl shadow-green-500/40 hover:scale-110 active:scale-95 transition-all group animate-bounce"
            title="Fale conosco no WhatsApp"
        >
            <MessageCircle size={28} fill="currentColor" />
        </a>
    );
};

const Footer: React.FC<{ config: SiteConfig }> = ({ config }) => {
    return (
        <footer className="bg-brand-dark/80 backdrop-blur-xl border-t border-white/5 py-20">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-12">
                <div className="md:col-span-5 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-56 bg-white/5 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border border-white/5 p-2">
                            {config.footerLogoUrl ? (
                                <img src={config.footerLogoUrl} className="w-full h-full object-contain" alt="Logo Rodapé" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Radio className="text-white w-6 h-6" />
                                    <span className="text-white font-black uppercase tracking-tighter">{config.heroLabel}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm italic max-w-sm leading-relaxed">"{config.heroSubtitle}"</p>
                    <div className="flex gap-4">
                        {config.instagramUrl && <a href={config.instagramUrl} target="_blank" className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-brand-primary transition-all"><Instagram size={20}/></a>}
                        {config.facebookUrl && <a href={config.facebookUrl} target="_blank" className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-brand-primary transition-all"><Facebook size={20}/></a>}
                        {config.youtubeUrl && <a href={config.youtubeUrl} target="_blank" className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-brand-primary transition-all"><Youtube size={20}/></a>}
                    </div>
                </div>
                <div className="md:col-span-4 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Contato Direto</h3>
                    <ul className="space-y-4 text-sm text-gray-400">
                        {config.address && <li className="flex items-center gap-3"><MapPin size={16} className="text-brand-primary"/> {config.address}</li>}
                        {config.phone && <li className="flex items-center gap-3"><Phone size={16} className="text-brand-primary"/> {config.phone}</li>}
                        {config.whatsapp && <li className="flex items-center gap-3"><MessageCircle size={16} className="text-brand-primary"/> WhatsApp: {config.whatsapp}</li>}
                    </ul>
                </div>
                <div className="md:col-span-3 space-y-6 text-[10px] text-gray-500 uppercase font-bold">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Administrativo</h3>
                    <p>© {new Date().getFullYear()} Portal Hélio Júnior - Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
};

const HomeView: React.FC<{ 
    posts: Post[], users: User[], config: SiteConfig, categories: string[], filterCategory: string, setFilterCategory: (c: string) => void, onStartAdvertising: () => void
}> = ({ posts, users, config, categories, filterCategory, setFilterCategory, onStartAdvertising }) => {
    const visiblePosts = posts.filter(p => {
        const auth = users.find(u => u.id === p.authorId);
        if (p.authorId === 'admin') return true;
        const isExp = auth?.expiresAt ? new Date(auth.expiresAt).getTime() < new Date().getTime() : false;
        return auth?.paymentStatus === PaymentStatus.CONFIRMED && !isExp;
    });

    const filteredPosts = filterCategory === 'ALL' ? visiblePosts : visiblePosts.filter(p => p.category === filterCategory);

    return (
        <div className="pt-20">
            <section className="relative overflow-hidden mb-16 pt-12 min-h-[500px] flex items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-dark to-brand-secondary/5 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left animate-in slide-in-from-left duration-1000">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-6">{config.heroLabel}</div>
                            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-[0.9]">{config.heroTitle}</h1>
                            <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed italic">"{config.heroSubtitle}"</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button onClick={() => document.getElementById('ads-grid')?.scrollIntoView({ behavior: 'smooth' })} className="py-4 px-10 text-lg uppercase font-black">Ver Classificados</Button>
                                <Button onClick={onStartAdvertising} variant="outline" className="py-4 px-10 text-lg uppercase font-black">Quero Anunciar</Button>
                            </div>
                        </div>
                        <div className="relative aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in duration-1000">
                            <img src={config.heroImageUrl} className="w-full h-full object-cover" alt="Banner" />
                        </div>
                    </div>
                </div>
            </section>
            <section className="max-w-7xl mx-auto px-4 mb-16">
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={() => setFilterCategory('ALL')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === 'ALL' ? 'bg-white text-brand-dark border-white' : 'bg-white/5 text-gray-400 border-white/10'}`}>Todos</button>
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === cat ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white/5 text-gray-400 border-white/10'}`}>{cat}</button>
                    ))}
                </div>
            </section>
            <section id="ads-grid" className="max-w-7xl mx-auto px-4 min-h-[400px] pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredPosts.map(post => <PostCard key={post.id} post={post} author={users.find(u => u.id === post.authorId)} />)}
                </div>
            </section>
            <Footer config={config} />
        </div>
    );
};

const AuthView: React.FC<{ mode: 'LOGIN' | 'REGISTER', categories: string[], onLogin: (u: User) => void, onSwitchMode: (v: ViewState) => void }> = ({ mode, categories, onLogin, onSwitchMode }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [profession, setProfession] = useState(categories[0] || 'Outros');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const user = storageService.findUserByEmail(email);
        if (mode === 'LOGIN') {
            if (user) onLogin(user); else setError('Usuário não encontrado.');
            setIsLoading(false);
        } else {
            if (user) { setError('E-mail já cadastrado.'); setIsLoading(false); }
            else { storageService.addUser({ name, email, role: UserRole.ADVERTISER, profession, phone, paymentStatus: PaymentStatus.AWAITING }).then(onLogin); }
        }
    };

    return (
        <div className="pt-32 pb-20 max-w-md mx-auto px-4">
            <div className="glass-panel p-10 rounded-[40px] shadow-2xl">
                <h2 className="text-4xl font-black text-center mb-8 uppercase tracking-tighter">{mode === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'REGISTER' && (
                        <>
                            <input required placeholder="Nome / Empresa" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={name} onChange={e => setName(e.target.value)} />
                            <select className="w-full bg-brand-dark border border-white/10 rounded-2xl p-4 text-white font-bold" value={profession} onChange={e => setProfession(e.target.value)}>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <input required placeholder="WhatsApp" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={phone} onChange={e => setPhone(e.target.value)} />
                        </>
                    )}
                    <input required type="email" placeholder="E-mail" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={email} onChange={e => setEmail(e.target.value)} />
                    <input required type="password" placeholder="Senha" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={password} onChange={e => setPassword(e.target.value)} />
                    <Button type="submit" isLoading={isLoading} className="w-full h-14 uppercase font-black">{mode === 'LOGIN' ? 'Acessar' : 'Cadastrar'}</Button>
                    <button type="button" onClick={() => onSwitchMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-xs text-gray-500 font-bold mt-4">{mode === 'LOGIN' ? 'Ainda não tem conta?' : 'Já tem conta?'}</button>
                </form>
            </div>
        </div>
    );
};

const DashboardView: React.FC<{ user: User, posts: Post[], onGoToPayment: () => void, onPostCreated: (p: Post) => Promise<void>, onPostUpdated: (p: Post) => Promise<void>, onPostDeleted: (id: string) => Promise<void>, onNotify: (m: string, t: 'success' | 'error') => void }> = ({ user, posts, onGoToPayment, onPostCreated, onPostUpdated, onPostDeleted, onNotify }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [keywords, setKeywords] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const userPosts = posts.filter(p => p.authorId === user.id);

    const handleGenerateIA = async () => {
        if (!keywords) return;
        setIsGenerating(true);
        const text = await generateAdCopy(user.profession || 'Serviços', keywords);
        setContent(text);
        setIsGenerating(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPost) {
            await onPostUpdated({ ...editingPost, title, content, imageUrl });
            setEditingPost(null);
        } else {
            await onPostCreated({ id: 'p-' + Date.now(), authorId: user.id, authorName: user.name, category: user.profession || 'Outros', title, content, imageUrl, createdAt: new Date().toISOString(), whatsapp: user.phone, phone: user.phone });
        }
        setTitle(''); setContent(''); setImageUrl(''); setKeywords('');
    };

    return (
        <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
                <div className="glass-panel p-8 rounded-[40px]">
                    <h2 className="text-2xl font-black mb-6 uppercase">{editingPost ? 'Editar Anúncio' : 'Novo Anúncio'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input required placeholder="Título" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={title} onChange={e => setTitle(e.target.value)} />
                        <div className="flex gap-2">
                            <input placeholder="Palavras-chave para IA" className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white" value={keywords} onChange={e => setKeywords(e.target.value)} />
                            <button type="button" onClick={handleGenerateIA} disabled={isGenerating} className="px-6 bg-brand-primary rounded-2xl font-black text-[10px] uppercase">{isGenerating ? 'IA...' : 'Gerar IA'}</button>
                        </div>
                        <textarea required placeholder="Conteúdo" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white h-32" value={content} onChange={e => setContent(e.target.value)} />
                        <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden">
                            {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <Camera className="text-gray-500" />}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                                const file = e.target.files?.[0]; if (file) {
                                    const reader = new FileReader(); reader.onloadend = () => setImageUrl(reader.result as string); reader.readAsDataURL(file);
                                }
                            }} />
                        </div>
                        <Button type="submit" className="w-full h-16 uppercase font-black">Publicar Anúncio</Button>
                    </form>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {userPosts.map(p => (
                        <div key={p.id} className="relative group">
                            <PostCard post={p} author={user} />
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingPost(p); setTitle(p.title); setContent(p.content); setImageUrl(p.imageUrl || ''); }} className="p-2 bg-brand-primary rounded-lg"><Edit3 size={16}/></button>
                                <button onClick={() => onPostDeleted(p.id)} className="p-2 bg-red-500 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-4 glass-panel p-8 rounded-[40px] h-fit text-center">
                <h3 className="font-black text-xl mb-4 uppercase text-brand-accent">Assinatura</h3>
                <div className={`p-4 rounded-2xl border mb-6 text-xs font-black ${user.paymentStatus === PaymentStatus.CONFIRMED ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'}`}>{user.paymentStatus}</div>
                <Button onClick={onGoToPayment} variant="secondary" className="w-full">Ver Planos</Button>
            </div>
        </div>
    );
};

const PaymentView: React.FC<{ plans: Plan[], onPaymentSuccess: (pid: string) => void, onCancel: () => void }> = ({ plans, onPaymentSuccess, onCancel }) => {
    const [selected, setSelected] = useState<string | null>(null);
    return (
        <div className="pt-24 pb-20 max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-5xl font-black mb-12 uppercase tracking-tighter">Planos de Exposição</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {plans.map(p => (
                    <div key={p.id} onClick={() => setSelected(p.id)} className={`glass-panel p-8 rounded-[40px] border-2 cursor-pointer transition-all ${selected === p.id ? 'border-brand-accent bg-brand-accent/10 scale-105' : 'border-white/5'}`}>
                        <h3 className="font-black uppercase mb-4">{p.name}</h3>
                        <div className="text-3xl font-black text-brand-secondary mb-4">R$ {p.price.toFixed(2)}</div>
                        <p className="text-[10px] uppercase text-gray-400">{p.durationDays} Dias</p>
                    </div>
                ))}
            </div>
            <div className="flex justify-center gap-4">
                <Button onClick={() => selected && onPaymentSuccess(selected)} disabled={!selected}>Confirmar Escolha</Button>
                <Button variant="outline" onClick={onCancel}>Voltar</Button>
            </div>
        </div>
    );
};

const AdminView: React.FC<{ 
    users: User[], plans: Plan[], categories: string[], config: SiteConfig, onUpdateUser: (u: User) => Promise<void>, onUpdateConfig: (c: SiteConfig) => Promise<void>, onUpdateCategories: (cats: string[]) => Promise<void>, onUpdatePlans: (plans: Plan[]) => Promise<void>, notify: (m: string, t: 'success' | 'error') => void 
}> = ({ users, plans, categories, config, onUpdateUser, onUpdateConfig, onUpdateCategories, onUpdatePlans, notify }) => {
    const [activeTab, setActiveTab] = useState<'USERS' | 'CONFIG' | 'PLANS' | 'CATEGORIES'>('USERS');
    const [editConfig, setEditConfig] = useState<SiteConfig>(config);
    const [newCategory, setNewCategory] = useState('');
    const [planForm, setPlanForm] = useState<Partial<Plan>>({ name: '', price: 0, durationDays: 30, description: '' });
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

    const handleSaveConfig = async () => { await onUpdateConfig(editConfig); notify("Visual salvo!", "success"); };
    
    const handleSavePlan = async () => {
        if (!planForm.name) return;
        let newPlans;
        if (editingPlanId) {
            newPlans = plans.map(p => p.id === editingPlanId ? { ...p, ...planForm } as Plan : p);
            setEditingPlanId(null);
        } else {
            newPlans = [...plans, { ...planForm, id: 'p-' + Date.now() } as Plan];
        }
        await onUpdatePlans(newPlans);
        setPlanForm({ name: '', price: 0, durationDays: 30 });
        notify("Plano salvo!", "success");
    };

    return (
        <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap gap-2 mb-10">
                <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'USERS' ? 'bg-brand-primary' : 'bg-white/5'}`}>Usuários</button>
                <button onClick={() => setActiveTab('CONFIG')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'CONFIG' ? 'bg-brand-primary' : 'bg-white/5'}`}>Visual & Info</button>
                <button onClick={() => setActiveTab('PLANS')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'PLANS' ? 'bg-brand-primary' : 'bg-white/5'}`}>Planos</button>
                <button onClick={() => setActiveTab('CATEGORIES')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'CATEGORIES' ? 'bg-brand-primary' : 'bg-white/5'}`}>Categorias</button>
            </div>

            {activeTab === 'USERS' && (
                <div className="glass-panel rounded-[32px] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-brand-dark/50 text-[10px] uppercase font-black text-gray-500">
                            <tr><th className="p-6">Nome</th><th className="p-6">Status</th><th className="p-6 text-right">Ação</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                <tr key={u.id}>
                                    <td className="p-6 font-bold">{u.name}</td>
                                    <td className="p-6"><span className="text-[9px] font-black uppercase">{u.paymentStatus}</span></td>
                                    <td className="p-6 text-right">
                                        <button onClick={() => {
                                            const p = plans.find(pl => pl.id === u.planId) || plans[0];
                                            const exp = new Date(); exp.setDate(exp.getDate() + p.durationDays);
                                            onUpdateUser({ ...u, paymentStatus: PaymentStatus.CONFIRMED, expiresAt: exp.toISOString() });
                                            notify("Ativado!", "success");
                                        }} className="bg-brand-primary px-3 py-1 rounded text-[10px] font-black uppercase">Ativar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'CONFIG' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-panel p-8 rounded-[40px]">
                            <h3 className="text-xl font-black uppercase mb-4">Logo Topo (Paisagem)</h3>
                            <div onClick={() => document.getElementById('h-logo')?.click()} className="aspect-[3/1] bg-brand-dark rounded-2xl flex items-center justify-center border border-dashed border-white/20 overflow-hidden cursor-pointer">
                                {editConfig.headerLogoUrl ? <img src={editConfig.headerLogoUrl} className="w-full h-full object-contain" /> : <Plus />}
                                <input id="h-logo" type="file" className="hidden" accept="image/*" onChange={e => {
                                    const file = e.target.files?.[0]; if (file) {
                                        const reader = new FileReader(); reader.onloadend = () => setEditConfig({...editConfig, headerLogoUrl: reader.result as string}); reader.readAsDataURL(file);
                                    }
                                }} />
                            </div>
                        </div>
                        <div className="glass-panel p-8 rounded-[40px]">
                            <h3 className="text-xl font-black uppercase mb-4">Logo Rodapé (Paisagem)</h3>
                            <div onClick={() => document.getElementById('f-logo')?.click()} className="aspect-[3/1] bg-brand-dark rounded-2xl flex items-center justify-center border border-dashed border-white/20 overflow-hidden cursor-pointer">
                                {editConfig.footerLogoUrl ? <img src={editConfig.footerLogoUrl} className="w-full h-full object-contain" /> : <Plus />}
                                <input id="f-logo" type="file" className="hidden" accept="image/*" onChange={e => {
                                    const file = e.target.files?.[0]; if (file) {
                                        const reader = new FileReader(); reader.onloadend = () => setEditConfig({...editConfig, footerLogoUrl: reader.result as string}); reader.readAsDataURL(file);
                                    }
                                }} />
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel p-10 rounded-[40px] space-y-4">
                        <h3 className="text-xl font-black uppercase">Textos & Banner</h3>
                        <div className="aspect-video bg-brand-dark rounded-3xl overflow-hidden border border-dashed border-white/20 cursor-pointer" onClick={() => document.getElementById('banner')?.click()}>
                            <img src={editConfig.heroImageUrl} className="w-full h-full object-cover" />
                            <input id="banner" type="file" className="hidden" accept="image/*" onChange={e => {
                                const file = e.target.files?.[0]; if (file) {
                                    const reader = new FileReader(); reader.onloadend = () => setEditConfig({...editConfig, heroImageUrl: reader.result as string}); reader.readAsDataURL(file);
                                }
                            }} />
                        </div>
                        <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" value={editConfig.heroTitle} onChange={e => setEditConfig({...editConfig, heroTitle: e.target.value})} placeholder="Título" />
                        <textarea className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold h-20" value={editConfig.heroSubtitle} onChange={e => setEditConfig({...editConfig, heroSubtitle: e.target.value})} placeholder="Slogan" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="bg-white/5 border border-white/10 p-4 rounded-xl text-white" value={editConfig.whatsapp} onChange={e => setEditConfig({...editConfig, whatsapp: e.target.value})} placeholder="WhatsApp" />
                            <input className="bg-white/5 border border-white/10 p-4 rounded-xl text-white" value={editConfig.instagramUrl} onChange={e => setEditConfig({...editConfig, instagramUrl: e.target.value})} placeholder="Instagram URL" />
                        </div>
                        <Button onClick={handleSaveConfig} className="w-full py-6 text-xl font-black uppercase">Salvar Configurações</Button>
                    </div>
                </div>
            )}

            {activeTab === 'PLANS' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-panel p-10 rounded-[40px] h-fit space-y-4">
                        <h3 className="text-2xl font-black uppercase">{editingPlanId ? 'Editar Plano' : 'Novo Plano'}</h3>
                        <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} placeholder="Nome" />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" value={planForm.price} onChange={e => setPlanForm({...planForm, price: Number(e.target.value)})} placeholder="Preço" />
                            <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" value={planForm.durationDays} onChange={e => setPlanForm({...planForm, durationDays: Number(e.target.value)})} placeholder="Dias" />
                        </div>
                        <Button onClick={handleSavePlan} className="w-full">Salvar Plano</Button>
                    </div>
                    <div className="space-y-4">
                        {plans.map(p => (
                            <div key={p.id} className="glass-panel p-4 rounded-2xl flex justify-between items-center">
                                <div><p className="font-bold">{p.name}</p><p className="text-[10px] text-gray-500 uppercase">{p.durationDays} dias - R$ {p.price}</p></div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingPlanId(p.id); setPlanForm(p); }} className="p-2 text-brand-primary"><Edit3 size={16}/></button>
                                    <button onClick={() => onUpdatePlans(plans.filter(pl => pl.id !== p.id))} className="p-2 text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'CATEGORIES' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-panel p-10 rounded-[40px] h-fit">
                        <h3 className="text-2xl font-black uppercase mb-6">Categorias</h3>
                        <div className="flex gap-2">
                            <input className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-white font-bold" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nova" />
                            <Button onClick={async () => { if (!newCategory) return; await onUpdateCategories([...categories, newCategory]); setNewCategory(''); notify("Adicionado!", "success"); }}><Plus/></Button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(c => (
                            <div key={c} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
                                <span className="text-xs font-bold">{c}</span>
                                <button onClick={async () => { await onUpdateCategories(categories.filter(cat => cat !== c)); notify("Removido!", "success"); }} className="text-red-500"><Trash2 size={12}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [currentUser, setCurrentUser] = useState<User | null>(() => getFromLocal(STORAGE_KEYS.SESSION, null));
    const [posts, setPosts] = useState<Post[]>(() => getFromLocal(STORAGE_KEYS.POSTS, []));
    const [allUsers, setAllUsers] = useState<User[]>(() => getFromLocal(STORAGE_KEYS.USERS, []));
    const [plans, setPlans] = useState<Plan[]>(() => getFromLocal(STORAGE_KEYS.PLANS, []));
    const [categories, setCategories] = useState<string[]>(() => storageService.getCategories());
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => storageService.getConfig());
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);

    const refresh = () => {
        setPosts(storageService.getPosts());
        setAllUsers(storageService.getUsers());
        setPlans(storageService.getPlans());
        setSiteConfig(storageService.getConfig());
        setCategories(storageService.getCategories());
    };

    const handleLogin = (user: User) => {
        saveToLocal(STORAGE_KEYS.SESSION, user);
        setCurrentUser(user);
        setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
        refresh();
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        setCurrentUser(null);
        setCurrentView('HOME');
    };

    return (
        <div className="min-h-screen bg-brand-dark text-gray-100 font-sans selection:bg-brand-primary/30 scroll-smooth">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} config={siteConfig} />
            <main className="relative min-h-screen">
                {currentView === 'HOME' && <HomeView posts={posts} users={allUsers} config={siteConfig} categories={categories} filterCategory={filterCategory} setFilterCategory={setFilterCategory} onStartAdvertising={() => setCurrentView('REGISTER')} />}
                {(currentView === 'LOGIN' || currentView === 'REGISTER') && <AuthView mode={currentView as any} categories={categories} onLogin={handleLogin} onSwitchMode={setCurrentView} />}
                {currentView === 'DASHBOARD' && currentUser && <DashboardView user={currentUser} posts={posts} onGoToPayment={() => setCurrentView('PAYMENT')} onPostCreated={async p => { await storageService.addPost(p); refresh(); setToast({ m: "Publicado!", t: "success"}); }} onPostUpdated={async p => { await storageService.updatePost(p); refresh(); setToast({ m: "Salvo!", t: "success"}); }} onPostDeleted={async id => { await storageService.deletePost(id); refresh(); setToast({ m: "Removido!", t: "success"}); }} onNotify={(m, t) => setToast({ m, t })} />}
                {currentView === 'PAYMENT' && currentUser && <PaymentView plans={plans} onPaymentSuccess={async pid => { await storageService.updateUser({...currentUser, planId: pid, paymentStatus: PaymentStatus.AWAITING}); refresh(); setCurrentView('DASHBOARD'); setToast({ m: "Pedido enviado!", t: "success"}); }} onCancel={() => setCurrentView('DASHBOARD')} />}
                {currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && <AdminView users={allUsers} plans={plans} categories={categories} config={siteConfig} onUpdateUser={async u => { await storageService.updateUser(u); refresh(); }} onUpdateConfig={async c => { await storageService.updateConfig(c); refresh(); }} onUpdateCategories={async cats => { await storageService.saveCategories(cats); refresh(); }} onUpdatePlans={async pls => { await storageService.savePlans(pls); refresh(); }} notify={(m, t) => setToast({ m, t })} />}
            </main>
            <FloatingWhatsApp config={siteConfig} />
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
