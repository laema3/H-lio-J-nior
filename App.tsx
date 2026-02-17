
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, PaymentStatus, SiteConfig, Plan } from './types';
import { storageService, DEFAULT_CONFIG, STORAGE_KEYS, getFromLocal, saveToLocal } from './services/storage';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Search, Clock, Check, Camera, Loader2, Trash2, Edit3, AlertTriangle, Plus, ShieldCheck, LayoutDashboard, Settings, CreditCard, Tag
} from 'lucide-react';

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

const HomeView: React.FC<{ 
    posts: Post[], 
    users: User[],
    config: SiteConfig,
    categories: string[],
    filterCategory: string,
    setFilterCategory: (c: string) => void,
    onStartAdvertising: () => void
}> = ({ posts, users, config, categories, filterCategory, setFilterCategory, onStartAdvertising }) => {
    const visiblePosts = posts.filter(p => {
        const auth = users.find(u => u.id === p.authorId);
        if (p.authorId === 'admin') return true;
        const isExp = auth?.expiresAt ? new Date(auth.expiresAt).getTime() < new Date().getTime() : false;
        return auth?.paymentStatus === PaymentStatus.CONFIRMED && !isExp;
    });

    const filteredPosts = filterCategory === 'ALL' 
        ? visiblePosts 
        : visiblePosts.filter(p => p.category === filterCategory);

    return (
        <div className="pt-20 pb-20">
            <section className="relative overflow-hidden mb-16 pt-12 min-h-[500px] flex items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-dark to-brand-secondary/5 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left animate-in slide-in-from-left duration-1000 order-2 lg:order-1">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-6">
                                {config.heroLabel}
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-[0.9]">
                                {config.heroTitle}
                            </h1>
                            <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed italic">
                                "{config.heroSubtitle}"
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button onClick={() => document.getElementById('ads-grid')?.scrollIntoView({ behavior: 'smooth' })} className="py-4 px-10 text-lg uppercase font-black shadow-xl shadow-brand-primary/20">Ver Classificados</Button>
                                <Button onClick={onStartAdvertising} variant="outline" className="py-4 px-10 text-lg uppercase font-black">Quero Anunciar</Button>
                            </div>
                        </div>

                        <div className="relative group animate-in zoom-in duration-1000 order-1 lg:order-2">
                            <div className="absolute -inset-4 bg-brand-primary/20 rounded-[40px] blur-3xl group-hover:bg-brand-secondary/20 transition-all duration-700" />
                            <div className="relative aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
                                <img 
                                    src={config.heroImageUrl} 
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                                    alt="Hélio Júnior" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-transparent to-transparent" />
                                <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                                     <div>
                                        <p className="text-white font-black text-lg uppercase tracking-tighter">{config.heroLabel}</p>
                                        <p className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.2em]">Radialista & Comunicador</p>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 mb-16">
                <h2 className="text-center text-xs font-black uppercase tracking-[0.3em] text-gray-500 mb-8">Navegue por Categorias</h2>
                <div className="flex flex-wrap justify-center gap-3">
                    <button 
                        onClick={() => setFilterCategory('ALL')} 
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${filterCategory === 'ALL' ? 'bg-white text-brand-dark border-white shadow-xl scale-105' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                    >
                        Todos os Anúncios
                    </button>
                    {categories.map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => setFilterCategory(cat)} 
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${filterCategory === cat ? 'bg-brand-primary text-white border-brand-primary shadow-xl shadow-brand-primary/20 scale-105' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </section>

            <section id="ads-grid" className="max-w-7xl mx-auto px-4 min-h-[400px]">
                {filteredPosts.length === 0 ? (
                    <div className="text-center py-24 bg-white/5 rounded-[40px] border border-white/10 animate-in fade-in duration-700">
                        <Search className="w-16 h-16 text-gray-600 mx-auto mb-6 opacity-20" />
                        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Nenhum anúncio disponível</h3>
                        <p className="text-gray-400 text-sm italic">Seja o primeiro a destacar sua marca nesta categoria!</p>
                        <Button onClick={onStartAdvertising} variant="outline" className="mt-8">Começar Agora</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-700">
                        {filteredPosts.map(post => (
                            <PostCard 
                                key={post.id} 
                                post={post} 
                                author={users.find(u => u.id === post.authorId)} 
                            />
                        ))}
                    </div>
                )}
            </section>
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const user = await storageService.findUserByEmail(email);
            if (mode === 'LOGIN') {
                if (user) onLogin(user); else setError('Usuário não encontrado.');
            } else {
                if (user) setError('E-mail já cadastrado.'); else {
                    const newUser = await storageService.addUser({ name, email, role: UserRole.ADVERTISER, profession, phone, paymentStatus: PaymentStatus.AWAITING });
                    onLogin(newUser);
                }
            }
        } catch { setError('Erro ao processar.'); } finally { setIsLoading(false); }
    };

    return (
        <div className="pt-32 pb-20 max-w-md mx-auto px-4">
            <div className="glass-panel p-10 rounded-[40px] shadow-2xl border-white/5">
                <h2 className="text-4xl font-black text-center mb-8 uppercase tracking-tighter">{mode === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</h2>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold mb-6 flex items-center gap-2"><AlertTriangle size={14} /> {error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'REGISTER' && (
                        <>
                            <input required placeholder="Nome / Empresa" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-primary font-bold" value={name} onChange={e => setName(e.target.value)} />
                            <select className="w-full bg-brand-dark border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-primary font-bold" value={profession} onChange={e => setProfession(e.target.value)}>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <input required placeholder="WhatsApp" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-primary font-bold" value={phone} onChange={e => setPhone(e.target.value)} />
                        </>
                    )}
                    <input required type="email" placeholder="E-mail" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-primary font-bold" value={email} onChange={e => setEmail(e.target.value)} />
                    <input required type="password" placeholder="Senha" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-primary font-bold" value={password} onChange={e => setPassword(e.target.value)} />
                    <Button type="submit" isLoading={isLoading} className="w-full h-14 mt-4 font-black uppercase tracking-widest text-lg">
                        {mode === 'LOGIN' ? 'Acessar Painel' : 'Criar Conta Agora'}
                    </Button>
                </form>
                <div className="mt-8 text-center">
                    <button onClick={() => onSwitchMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-xs font-bold text-gray-500 hover:text-brand-accent transition-colors">
                        {mode === 'LOGIN' ? 'Ainda não tem conta? Clique aqui para cadastrar' : 'Já tem uma conta? Faça seu login'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardView: React.FC<{ user: User, posts: Post[], onGoToPayment: () => void, onPostCreated: (p: Post) => Promise<void>, onPostUpdated: (p: Post) => Promise<void>, onPostDeleted: (id: string) => Promise<void>, onNotify: (m: string, t: 'success' | 'error') => void }> = ({ user, posts, onGoToPayment, onPostCreated, onPostUpdated, onPostDeleted, onNotify }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [keywords, setKeywords] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const userPosts = posts.filter(p => p.authorId === user.id);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImageUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateIA = async () => {
        if (!keywords) return;
        setIsGenerating(true);
        const text = await generateAdCopy(user.profession || 'Serviços', keywords);
        setContent(text);
        setIsGenerating(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingPost) {
                await onPostUpdated({ ...editingPost, title, content, imageUrl });
                setEditingPost(null);
            } else {
                await onPostCreated({ id: 'p-' + Date.now(), authorId: user.id, authorName: user.name, category: user.profession as any || 'Outros', title, content, imageUrl, createdAt: new Date().toISOString(), whatsapp: user.phone, phone: user.phone });
            }
            setTitle(''); setContent(''); setImageUrl(''); setKeywords('');
        } catch { onNotify("Erro ao salvar.", "error"); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="pt-24 pb-20 max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-4 mb-8 bg-brand-primary/10 p-6 rounded-[32px] border border-brand-primary/20">
                <ShieldCheck className="text-brand-primary" size={32} />
                <div><h2 className="text-2xl font-black uppercase tracking-tighter">Central do Anunciante</h2><p className="text-sm text-gray-400">Gerencie sua visibilidade no Portal Hélio Júnior.</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <div className="glass-panel p-8 rounded-[40px] border-brand-primary/20 shadow-xl">
                        <h2 className="text-2xl font-black mb-6 uppercase tracking-tight flex items-center gap-2">{editingPost ? <Edit3 size={20} /> : <Plus size={20} />} {editingPost ? 'Editar Anúncio' : 'Novo Anúncio'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input required placeholder="Título Chamativo (Ex: Dr. Silva - Advogado)" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-primary font-bold" value={title} onChange={e => setTitle(e.target.value)} />
                            <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl flex gap-3">
                                <input placeholder="Diga o que você faz em poucas palavras..." className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none" value={keywords} onChange={e => setKeywords(e.target.value)} />
                                <button type="button" onClick={handleGenerateIA} className="bg-brand-primary px-6 rounded-xl text-[10px] font-black uppercase hover:bg-brand-primary/80 transition-all">{isGenerating ? 'IA Pensando...' : 'IA: Gerar Texto'}</button>
                            </div>
                            <textarea required placeholder="Detalhes do seu serviço, promoções ou diferenciais..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white h-44 outline-none focus:border-brand-primary resize-none" value={content} onChange={e => setContent(e.target.value)} />
                            <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden group hover:border-brand-primary/50 transition-all">
                                {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <div className="text-center text-gray-500"><Camera className="mx-auto mb-2" /> Adicionar Imagem do Anúncio</div>}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                            </div>
                            <Button type="submit" isLoading={isSubmitting} className="w-full h-16 font-black uppercase tracking-widest text-lg">Finalizar e Publicar</Button>
                        </form>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {userPosts.map(post => (
                            <div key={post.id} className="relative group">
                                <PostCard post={post} author={user} />
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingPost(post); setTitle(post.title); setContent(post.content); setImageUrl(post.imageUrl || ''); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-brand-primary rounded-xl text-white shadow-xl hover:scale-110 transition-transform"><Edit3 size={16} /></button>
                                    <button onClick={() => confirm("Deseja realmente remover?") && onPostDeleted(post.id)} className="p-3 bg-red-500 rounded-xl text-white shadow-xl hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-panel p-8 rounded-[40px] text-center border-brand-accent/20">
                        <h3 className="font-black text-xl mb-6 uppercase tracking-widest text-brand-accent">Assinatura</h3>
                        <div className="p-6 bg-brand-dark/40 rounded-3xl border border-white/10 mb-6">
                            <p className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">Status Atual</p>
                            <span className={`text-xs font-black px-5 py-2 rounded-full border uppercase ${user.paymentStatus === PaymentStatus.CONFIRMED ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'}`}>{user.paymentStatus}</span>
                            {user.expiresAt && <div className="mt-8 pt-6 border-t border-white/5 text-xs text-brand-secondary font-black flex items-center justify-center gap-2 uppercase tracking-tighter"><Clock size={16}/> EXPIRA EM: {new Date(user.expiresAt).toLocaleDateString()}</div>}
                        </div>
                        <Button onClick={onGoToPayment} variant="secondary" className="w-full py-5 font-black uppercase tracking-widest shadow-xl shadow-brand-accent/10">Ver Planos de Exposição</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaymentView: React.FC<{ plans: Plan[], onPaymentSuccess: (pid: string) => void, onCancel: () => void }> = ({ plans, onPaymentSuccess, onCancel }) => {
    const [selected, setSelected] = useState<string | null>(null);
    return (
        <div className="pt-24 pb-20 max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">Escolha sua Visibilidade</h2>
            <p className="text-gray-400 mb-12 max-w-lg mx-auto italic">Quanto tempo você deseja que sua marca brilhe no portal?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {plans.map(p => (
                    <div key={p.id} onClick={() => setSelected(p.id)} className={`glass-panel p-8 rounded-[40px] border-2 cursor-pointer transition-all duration-500 flex flex-col items-center ${selected === p.id ? 'border-brand-accent bg-brand-accent/10 scale-105 shadow-2xl shadow-brand-accent/20' : 'border-white/5 hover:border-white/20'}`}>
                        <h3 className="text-xl font-black mb-1 uppercase tracking-tight">{p.name}</h3>
                        <p className="text-[10px] font-black text-gray-500 mb-6 uppercase tracking-[0.2em]">{p.durationDays} Dias</p>
                        <div className="text-4xl font-black text-brand-secondary mb-3">R$ {p.price.toFixed(2).replace('.', ',')}</div>
                        <p className="text-[10px] text-gray-400 mb-8 font-medium">{p.description}</p>
                        <div className="mt-auto">{selected === p.id ? <div className="bg-brand-accent p-2 rounded-full"><Check className="text-brand-dark" size={20} /></div> : <div className="w-8 h-8 rounded-full border-2 border-white/20"></div>}</div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => selected && onPaymentSuccess(selected)} disabled={!selected} className="px-16 py-5 font-black uppercase text-lg tracking-widest shadow-2xl shadow-brand-primary/20">Solicitar Ativação</Button>
                <Button variant="outline" onClick={onCancel} className="px-16 py-5 font-black uppercase">Voltar ao Meu Painel</Button>
            </div>
        </div>
    );
};

const AdminView: React.FC<{ 
    users: User[], 
    plans: Plan[], 
    categories: string[],
    config: SiteConfig,
    onUpdateUser: (u: User) => Promise<void>, 
    onUpdateConfig: (c: SiteConfig) => Promise<void>,
    onUpdateCategories: (cats: string[]) => Promise<void>,
    onUpdatePlans: (plans: Plan[]) => Promise<void>,
    notify: (m: string, t: 'success' | 'error') => void 
}> = ({ users, plans, categories, config, onUpdateUser, onUpdateConfig, onUpdateCategories, onUpdatePlans, notify }) => {
    const [activeTab, setActiveTab] = useState<'USERS' | 'CONFIG' | 'PLANS' | 'CATEGORIES'>('USERS');
    
    // Config State
    const [editConfig, setEditConfig] = useState<SiteConfig>(config);
    const heroInputRef = useRef<HTMLInputElement>(null);

    // Categories State
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState<{index: number, val: string} | null>(null);

    // Plans State
    const [planForm, setPlanForm] = useState<Partial<Plan>>({ name: '', price: 0, durationDays: 30, description: '' });
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

    // Actions
    const handleSaveConfig = async () => { await onUpdateConfig(editConfig); notify("Configurações salvas!", "success"); };
    
    // Categories Actions
    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        const updated = [...categories, newCategory.trim()];
        await onUpdateCategories(updated);
        setNewCategory('');
        notify("Categoria adicionada!", "success");
    };
    const handleUpdateCategory = async () => {
        if (!editingCategory || !editingCategory.val.trim()) return;
        const updated = [...categories];
        updated[editingCategory.index] = editingCategory.val.trim();
        await onUpdateCategories(updated);
        setEditingCategory(null);
        notify("Categoria atualizada!", "success");
    };
    const handleDeleteCategory = async (index: number) => {
        if (!confirm("Remover esta categoria?")) return;
        const updated = categories.filter((_, i) => i !== index);
        await onUpdateCategories(updated);
        notify("Categoria removida!", "success");
    };

    // Plans Actions
    const handleSavePlan = async () => {
        if (!planForm.name) return;
        let updated: Plan[];
        if (editingPlanId) {
            updated = plans.map(p => p.id === editingPlanId ? { ...p, ...planForm } as Plan : p);
        } else {
            const newPlan = { ...planForm, id: 'p-' + Date.now() } as Plan;
            updated = [...plans, newPlan];
        }
        await onUpdatePlans(updated);
        setPlanForm({ name: '', price: 0, durationDays: 30, description: '' });
        setEditingPlanId(null);
        notify(editingPlanId ? "Plano atualizado!" : "Plano criado!", "success");
    };
    const handleDeletePlan = async (id: string) => {
        if (!confirm("Remover este plano?")) return;
        const updated = plans.filter(p => p.id !== id);
        await onUpdatePlans(updated);
        notify("Plano removido!", "success");
    };

    return (
        <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <h2 className="text-4xl font-black uppercase tracking-tighter">Administração</h2>
                <div className="flex flex-wrap bg-white/5 p-1.5 rounded-2xl border border-white/10 gap-1">
                    {[
                        { id: 'USERS', label: 'Usuários', icon: LayoutDashboard },
                        { id: 'CONFIG', label: 'Visual', icon: Settings },
                        { id: 'PLANS', label: 'Planos', icon: CreditCard },
                        { id: 'CATEGORIES', label: 'Categorias', icon: Tag },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'USERS' && (
                <div className="glass-panel rounded-[40px] overflow-hidden shadow-2xl border-white/5">
                    <table className="w-full text-left">
                        <thead className="bg-brand-dark/80 border-b border-white/10 text-[10px] uppercase font-black text-gray-500 tracking-widest"><tr className="bg-brand-dark/50"><th className="px-8 py-6">Anunciante</th><th className="px-8 py-6">Plano & Status</th><th className="px-8 py-6 text-right">Ações</th></tr></thead>
                        <tbody className="divide-y divide-white/5">
                            {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-8 py-6 font-bold">{u.name}<br/><span className="text-[10px] text-gray-500 lowercase">{u.email}</span></td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'text-green-400 border-green-500/20' : 'text-yellow-400 border-yellow-500/20'}`}>{u.paymentStatus}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right"><Button onClick={() => {
                                        const plan = plans.find(p => p.id === u.planId) || plans[0];
                                        const expiry = new Date(); expiry.setDate(expiry.getDate() + plan.durationDays);
                                        onUpdateUser({...u, paymentStatus: PaymentStatus.CONFIRMED, expiresAt: expiry.toISOString()});
                                        notify("Ativado!", "success");
                                    }} className="text-[10px] py-2 px-4 h-auto uppercase">Ativar</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'CONFIG' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-panel p-10 rounded-[40px] border-white/5 space-y-6">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Textos</h3>
                        <div className="space-y-4">
                            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={editConfig.heroLabel} onChange={e => setEditConfig({...editConfig, heroLabel: e.target.value})} placeholder="Label" />
                            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={editConfig.heroTitle} onChange={e => setEditConfig({...editConfig, heroTitle: e.target.value})} placeholder="Título" />
                            <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold h-24" value={editConfig.heroSubtitle} onChange={e => setEditConfig({...editConfig, heroSubtitle: e.target.value})} placeholder="Subtítulo" />
                            <Button onClick={handleSaveConfig} className="w-full h-14 uppercase">Salvar</Button>
                        </div>
                    </div>
                    <div className="glass-panel p-10 rounded-[40px] border-white/5">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Foto Banner</h3>
                        <div onClick={() => heroInputRef.current?.click()} className="aspect-video relative rounded-3xl overflow-hidden border-2 border-dashed border-white/10 group cursor-pointer bg-brand-dark">
                            <img src={editConfig.heroImageUrl} className="w-full h-full object-cover group-hover:opacity-40" />
                            <input type="file" ref={heroInputRef} className="hidden" accept="image/*" onChange={e => {
                                const file = e.target.files?.[0]; if (file) {
                                    const reader = new FileReader(); reader.onloadend = () => setEditConfig({...editConfig, heroImageUrl: reader.result as string}); reader.readAsDataURL(file);
                                }
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'PLANS' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 glass-panel p-10 rounded-[40px] border-white/5 h-fit">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">{editingPlanId ? 'Editar Plano' : 'Novo Plano'}</h3>
                        <div className="space-y-4">
                            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} placeholder="Nome do Plano" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={planForm.price} onChange={e => setPlanForm({...planForm, price: Number(e.target.value)})} placeholder="Preço (R$)" />
                                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={planForm.durationDays} onChange={e => setPlanForm({...planForm, durationDays: Number(e.target.value)})} placeholder="Dias" />
                            </div>
                            <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold h-24" value={planForm.description} onChange={e => setPlanForm({...planForm, description: e.target.value})} placeholder="Descrição curta" />
                            <div className="flex gap-2">
                                <Button onClick={handleSavePlan} className="flex-1 uppercase font-black">{editingPlanId ? 'Salvar Alteração' : 'Cadastrar Plano'}</Button>
                                {editingPlanId && <Button variant="outline" onClick={() => {setEditingPlanId(null); setPlanForm({name:'', price:0, durationDays:30, description:''});}}>Cancelar</Button>}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-7 space-y-4">
                        {plans.map(p => (
                            <div key={p.id} className="glass-panel p-6 rounded-3xl border-white/5 flex justify-between items-center group">
                                <div>
                                    <h4 className="font-black text-white uppercase">{p.name} <span className="text-brand-accent text-xs ml-2">R$ {p.price}</span></h4>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{p.durationDays} Dias - {p.description}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => {setEditingPlanId(p.id); setPlanForm(p);}} className="p-2 bg-brand-primary rounded-lg hover:scale-110"><Edit3 size={14}/></button>
                                    <button onClick={() => handleDeletePlan(p.id)} className="p-2 bg-red-500 rounded-lg hover:scale-110"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'CATEGORIES' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 glass-panel p-10 rounded-[40px] border-white/5 h-fit">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                        <div className="flex gap-2">
                            <input className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={editingCategory ? editingCategory.val : newCategory} onChange={e => editingCategory ? setEditingCategory({...editingCategory, val: e.target.value}) : setNewCategory(e.target.value)} placeholder="Nome da Categoria" />
                            <Button onClick={editingCategory ? handleUpdateCategory : handleAddCategory} className="px-8 uppercase font-black">
                                {editingCategory ? 'Salvar' : 'Adicionar'}
                            </Button>
                        </div>
                        {editingCategory && <button onClick={() => setEditingCategory(null)} className="mt-4 text-[10px] font-black uppercase text-gray-500 hover:text-white">Cancelar Edição</button>}
                    </div>
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {categories.map((cat, i) => (
                            <div key={i} className="glass-panel p-4 rounded-2xl border-white/5 flex justify-between items-center group">
                                <span className="font-bold text-sm">{cat}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingCategory({index: i, val: cat})} className="p-2 text-brand-primary hover:scale-125"><Edit3 size={14}/></button>
                                    <button onClick={() => handleDeleteCategory(i)} className="p-2 text-red-500 hover:scale-125"><Trash2 size={14}/></button>
                                </div>
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
    const [categories, setCategories] = useState<string[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => getFromLocal(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG));
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);

    const refresh = async () => {
        const [p, u, pl, c, cats] = await Promise.all([
            storageService.getPosts(), 
            storageService.getUsers(), 
            storageService.getPlans(), 
            storageService.getConfig(),
            storageService.getCategories()
        ]);
        setPosts(p); setAllUsers(u); setPlans(pl); setSiteConfig(c); setCategories(cats);
        setIsLoading(false);
    };

    useEffect(() => { storageService.init().then(refresh); }, []);

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
        <div className="min-h-screen bg-brand-dark text-gray-100 font-sans selection:bg-brand-primary/30">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} />
            <main className="relative min-h-screen">
                {isLoading && (
                    <div className="fixed inset-0 flex flex-col items-center justify-center bg-brand-dark z-[300]">
                        <Loader2 className="animate-spin text-brand-primary mb-4" size={64} />
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">Sincronizando Portal...</p>
                    </div>
                )}
                
                {!isLoading && currentView === 'HOME' && (
                    <HomeView 
                        posts={posts} 
                        users={allUsers} 
                        config={siteConfig} 
                        categories={categories}
                        filterCategory={filterCategory} 
                        setFilterCategory={setFilterCategory}
                        onStartAdvertising={() => setCurrentView('REGISTER')}
                    />
                )}
                
                {!isLoading && currentView === 'LOGIN' && <AuthView mode="LOGIN" categories={categories} onLogin={handleLogin} onSwitchMode={setCurrentView} />}
                {!isLoading && currentView === 'REGISTER' && <AuthView mode="REGISTER" categories={categories} onLogin={handleLogin} onSwitchMode={setCurrentView} />}
                
                {!isLoading && currentView === 'DASHBOARD' && currentUser && (
                    <DashboardView 
                        user={currentUser} 
                        posts={posts} 
                        onGoToPayment={() => setCurrentView('PAYMENT')} 
                        onPostCreated={async p => { await storageService.addPost(p); refresh(); setToast({ m: "Anúncio publicado!", t: "success"}); }} 
                        onPostUpdated={async p => { await storageService.updatePost(p); refresh(); setToast({ m: "Alterações salvas!", t: "success"}); }} 
                        onPostDeleted={async id => { await storageService.deletePost(id); refresh(); setToast({ m: "Anúncio removido.", t: "success"}); }} 
                        onNotify={(m, t) => setToast({ m, t })} 
                    />
                )}
                
                {!isLoading && currentView === 'PAYMENT' && currentUser && (
                    <PaymentView 
                        plans={plans} 
                        onCancel={() => setCurrentView('DASHBOARD')} 
                        onPaymentSuccess={async pid => { await storageService.updateUser({...currentUser, planId: pid, paymentStatus: PaymentStatus.AWAITING}); refresh(); setCurrentView('DASHBOARD'); setToast({ m: "Solicitação enviada!", t: "success"}); }} 
                    />
                )}
                
                {!isLoading && currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && (
                    <AdminView 
                        users={allUsers} 
                        plans={plans} 
                        categories={categories}
                        config={siteConfig}
                        onUpdateUser={async u => { await storageService.updateUser(u); refresh(); }} 
                        onUpdateConfig={async c => { await storageService.updateConfig(c); refresh(); }}
                        onUpdateCategories={async cats => { await storageService.saveCategories(cats); refresh(); }}
                        onUpdatePlans={async pls => { await storageService.savePlans(pls); refresh(); }}
                        notify={(m, t) => setToast({ m, t })} 
                    />
                )}
            </main>
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
