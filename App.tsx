
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, ProfessionCategory, PaymentStatus, SiteConfig, Plan, PaymentMethodType } from './types';
import { storageService } from './services/storage';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Sparkles, 
    Search,
    CreditCard,
    Upload,
    Clock,
    Smartphone,
    Check,
    Camera,
    Loader2,
    Trash2,
    Edit3,
    AlertTriangle,
    Plus,
    ChevronRight,
    X
} from 'lucide-react';

// --- Utils ---
const getDaysRemaining = (confirmedAt?: string) => {
    if (!confirmedAt) return 0;
    const now = new Date();
    const confirmed = new Date(confirmedAt);
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiry = confirmed.getTime() + thirtyDaysMs;
    const diff = expiry - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// --- Subcomponents ---

const HomeView: React.FC<{ 
  posts: Post[], 
  users: User[],
  config: SiteConfig,
  filterCategory: string, 
  setFilterCategory: (c: string) => void,
  onStartAdvertising: () => void
}> = ({ posts, users, config, filterCategory, setFilterCategory, onStartAdvertising }) => {
    
    const visiblePosts = posts.filter(post => {
      const author = users.find(u => u.id === post.authorId);
      return author && (author.role === UserRole.ADMIN || author.paymentStatus === PaymentStatus.CONFIRMED);
    });

    const filteredPosts = filterCategory === 'ALL' 
        ? visiblePosts 
        : visiblePosts.filter(p => p.category === filterCategory);

    return (
        <div className="pt-20 pb-20">
            <section className="relative overflow-hidden mb-16 pt-12 min-h-[600px] flex items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-dark to-purple-900/20 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left animate-in slide-in-from-left duration-1000 order-2 lg:order-1">
                            <div className="inline-block p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-accent to-brand-secondary font-bold text-sm tracking-widest uppercase">
                                    {config.heroLabel}
                                </span>
                            </div>
                            <h1 className="text-5xl md:text-7xl xl:text-8xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                                {config.heroTitle}
                            </h1>
                            <p className="text-xl text-gray-400 max-w-2xl lg:mx-0 mx-auto mb-10 leading-relaxed">
                                {config.heroSubtitle}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button onClick={() => window.scrollTo({ top: document.getElementById('ads-section')?.offsetTop, behavior: 'smooth' })} variant="primary" className="py-5 px-12 text-lg">Ver Classificados</Button>
                                <Button onClick={onStartAdvertising} variant="outline" className="py-5 px-12 text-lg">Anunciar minha empresa</Button>
                            </div>
                        </div>

                        <div className="relative group animate-in zoom-in duration-1000 flex justify-center lg:justify-end order-1 lg:order-2">
                            <div className="absolute -inset-10 bg-gradient-to-r from-brand-primary/40 to-brand-secondary/40 rounded-full blur-[80px] opacity-40 group-hover:opacity-70 transition-opacity duration-700" />
                            <div className="relative w-full max-w-full lg:max-w-[650px] aspect-video rounded-[40px] overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform lg:rotate-1 group-hover:rotate-0 transition-all duration-700 ease-out bg-brand-dark">
                                {config.heroImageUrl ? (
                                    <img src={config.heroImageUrl} alt="Radialista" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700">Sem Imagem</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="ads-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={() => setFilterCategory('ALL')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterCategory === 'ALL' ? 'bg-white text-brand-dark' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Todos</button>
                    {Object.values(ProfessionCategory).map(cat => (
                         <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filterCategory === cat ? 'bg-brand-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{cat}</button>
                    ))}
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
                {filteredPosts.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                        <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">Nenhum anúncio liberado</h3>
                        <p className="text-gray-400 text-sm">Os anúncios só aparecem após a confirmação de pagamento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.map(post => <PostCard key={post.id} post={post} />)}
                    </div>
                )}
            </section>
        </div>
    );
};

const AuthView: React.FC<{ 
    mode: 'LOGIN' | 'REGISTER', 
    onLogin: (u: User) => void, 
    onSwitchMode: (v: ViewState) => void 
}> = ({ mode, onLogin, onSwitchMode }) => {
    const [formData, setFormData] = useState({ email: '', password: '', name: '', profession: ProfessionCategory.OTHER });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await storageService.findUserByEmail(formData.email);
            if (mode === 'LOGIN') {
                if (user) {
                    if (formData.email === 'admin@helio.com' && formData.password !== 'admin123') { 
                        setError('Senha incorreta.'); 
                    } else {
                        onLogin(user);
                    }
                } else { setError('E-mail não encontrado.'); }
            } else {
                if (user) { setError('E-mail já está em uso.'); return; }
                const newUser = await storageService.addUser({
                   name: formData.name,
                   email: formData.email,
                   password: formData.password,
                   role: UserRole.ADVERTISER,
                   profession: formData.profession,
                   paymentStatus: PaymentStatus.AWAITING
                });
                onLogin(newUser);
            }
        } catch (e: any) {
            setError('Erro: ' + (e.message || 'Verifique sua conexão ou se o Supabase está configurado.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-20 flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-panel p-8 rounded-3xl shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-6">{mode === 'LOGIN' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
                {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'REGISTER' && (
                        <>
                            <input type="text" required placeholder="Nome / Empresa" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl p-3 text-white" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value as ProfessionCategory})}>{Object.values(ProfessionCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                        </>
                    )}
                    <input type="email" required placeholder="E-mail" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input type="password" required placeholder="Senha" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    <Button type="submit" isLoading={isLoading} className="w-full mt-4">{mode === 'LOGIN' ? 'Entrar no Painel' : 'Criar Conta'}</Button>
                </form>
                <div className="mt-6 text-center text-sm text-gray-400">
                    {mode === 'LOGIN' ? <button onClick={() => onSwitchMode('REGISTER')} className="text-brand-accent font-semibold hover:underline">Quero cadastrar minha empresa</button> : <button onClick={() => onSwitchMode('LOGIN')} className="text-brand-accent font-semibold hover:underline">Já sou cadastrado</button>}
                </div>
            </div>
        </div>
    );
};

const DashboardView: React.FC<{ user: User, onGoToPayment: () => void, onPostCreated: (p: Post) => Promise<void> }> = ({ user, onGoToPayment, onPostCreated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [keywords, setKeywords] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isConfirmed = user.paymentStatus === PaymentStatus.CONFIRMED;

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImageUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateIA = async () => {
        if (!keywords) return alert("Diga sobre o que é seu serviço para a IA.");
        setIsGenerating(true);
        const text = await generateAdCopy(user.profession || 'Serviços', keywords);
        setContent(text);
        setIsGenerating(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConfirmed) return onGoToPayment();
        setIsSubmitting(true);
        await onPostCreated({
            id: Date.now().toString(),
            authorId: user.id,
            authorName: user.name,
            category: user.profession || ProfessionCategory.OTHER,
            title, content, imageUrl, createdAt: new Date().toISOString(), likes: 0
        });
        setTitle(''); setContent(''); setImageUrl(''); setKeywords('');
        setIsSubmitting(false);
        alert("Anúncio publicado!");
    };

    return (
        <div className="pt-24 pb-20 max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 glass-panel p-8 rounded-3xl">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Plus /> Criar Anúncio</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input required placeholder="Título do Anúncio" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" value={title} onChange={e => setTitle(e.target.value)} />
                        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                            <label className="text-[10px] font-bold text-brand-accent uppercase mb-2 block">Escrever com IA</label>
                            <div className="flex gap-2">
                                <input placeholder="Ex: pintura rápida, preço justo..." className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-sm" value={keywords} onChange={e => setKeywords(e.target.value)} />
                                <button type="button" onClick={handleGenerateIA} disabled={isGenerating} className="bg-brand-primary px-3 rounded-lg text-xs font-bold">{isGenerating ? '...' : 'GERAR'}</button>
                            </div>
                        </div>
                        <textarea required placeholder="Descrição..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white h-32" value={content} onChange={e => setContent(e.target.value)} />
                        <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden">
                            {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <div className="text-center text-gray-500"><Camera className="mx-auto mb-2" /> Foto do Anúncio</div>}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                        </div>
                        <Button type="submit" isLoading={isSubmitting} className="w-full">{isConfirmed ? 'PUBLICAR' : 'PAGAR PARA PUBLICAR'}</Button>
                    </form>
                </div>
                <div className="glass-panel p-6 rounded-3xl h-fit">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard size={18}/> Assinatura</h3>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-4 text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status</p>
                        <span className={`text-xs font-bold ${isConfirmed ? 'text-green-400' : 'text-yellow-400'}`}>{user.paymentStatus}</span>
                        {isConfirmed && <p className="text-[10px] text-brand-accent mt-2 font-bold">{getDaysRemaining(user.paymentConfirmedAt)} dias restantes</p>}
                    </div>
                    {!isConfirmed && <Button onClick={onGoToPayment} variant="secondary" className="w-full text-xs">ASSINAR AGORA</Button>}
                </div>
            </div>
        </div>
    );
};

const PaymentView: React.FC<{ user: User, plans: Plan[], onCancel: () => void, onPaymentSuccess: (pid: string) => Promise<void> }> = ({ plans, onCancel, onPaymentSuccess }) => {
    const [step, setStep] = useState<'PLANS' | 'METHOD' | 'PIX'>('PLANS');
    const [selected, setSelected] = useState<Plan | null>(null);

    return (
        <div className="pt-24 pb-20 max-w-4xl mx-auto px-4">
            {step === 'PLANS' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(p => (
                        <div key={p.id} className="glass-panel p-8 rounded-[40px] text-center flex flex-col border border-white/10 hover:border-brand-primary transition-all">
                            <h3 className="text-xl font-bold mb-2">{p.name}</h3>
                            <p className="text-4xl font-black text-brand-accent mb-4">R$ {p.price.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mb-8 flex-grow">{p.description}</p>
                            <Button onClick={() => { setSelected(p); setStep('METHOD'); }}>ESCOLHER</Button>
                        </div>
                    ))}
                    {plans.length === 0 && (
                        <div className="col-span-3 text-center py-12">
                            <p className="text-gray-500">Nenhum plano cadastrado pelo administrador.</p>
                            <Button variant="outline" className="mt-4" onClick={onCancel}>VOLTAR</Button>
                        </div>
                    )}
                </div>
            )}
            {step === 'METHOD' && (
                <div className="max-w-md mx-auto glass-panel p-8 rounded-[40px] text-center">
                    <h3 className="text-2xl font-bold mb-8">Forma de Pagamento</h3>
                    <button onClick={() => setStep('PIX')} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 mb-4 transition-all">
                        <div className="flex items-center gap-3 font-bold"><Smartphone className="text-brand-accent" /> PIX (Instantâneo)</div>
                        <ChevronRight />
                    </button>
                    <button className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3 font-bold"><CreditCard /> Cartão de Crédito</div>
                        <span className="text-[8px] bg-white/10 px-2 py-1 rounded">EM BREVE</span>
                    </button>
                    <button onClick={() => setStep('PLANS')} className="mt-6 text-gray-500 text-xs hover:underline">Voltar</button>
                </div>
            )}
            {step === 'PIX' && selected && (
                <div className="max-w-md mx-auto glass-panel p-8 rounded-[40px] text-center">
                    <h3 className="text-2xl font-bold mb-4">Pagar R$ {selected.price.toFixed(2)}</h3>
                    <div className="bg-white p-4 rounded-3xl w-48 h-48 mx-auto mb-6">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SIMULATE_PIX_${selected.id}`} alt="QR" className="w-full h-full" />
                    </div>
                    <Button onClick={async () => { await onPaymentSuccess(selected.id); }} className="w-full">JÁ PAGUEI</Button>
                    <button onClick={() => setStep('METHOD')} className="mt-4 text-gray-500 text-xs hover:underline">Alterar forma</button>
                </div>
            )}
        </div>
    );
};

const AdminView: React.FC<{ 
    users: User[], posts: Post[], config: SiteConfig, plans: Plan[],
    onUpdateUser: (u: User) => Promise<void>, 
    onUpdateConfig: (c: SiteConfig) => Promise<void>,
    onUpdatePlans: (p: Plan[]) => Promise<void>
}> = ({ users, config, plans, onUpdateUser, onUpdateConfig, onUpdatePlans }) => {
    const [tab, setTab] = useState<'U' | 'C' | 'P'>('U');
    const [siteConf, setSiteConf] = useState(config);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [newPlan, setNewPlan] = useState<Partial<Plan>>({ name: '', price: 0, description: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleAddPlan = async () => {
        if (!newPlan.name || !newPlan.price) return alert("Preencha nome e preço.");
        setIsProcessing(true);
        try {
            const plan: Plan = {
                id: 'plan-' + Date.now(),
                name: newPlan.name,
                price: newPlan.price,
                description: newPlan.description || ''
            };
            await onUpdatePlans([...plans, plan]);
            setNewPlan({ name: '', price: 0, description: '' });
            alert("Plano cadastrado com sucesso!");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdatePlan = async () => {
        if (!editingPlan) return;
        setIsProcessing(true);
        try {
            const updated = plans.map(p => p.id === editingPlan.id ? editingPlan : p);
            await onUpdatePlans(updated);
            setEditingPlan(null);
            alert("Plano atualizado com sucesso!");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (confirm("Deseja realmente excluir este plano? Esta ação removerá o plano da lista de assinaturas.")) {
            setIsProcessing(true);
            try {
                await onUpdatePlans(plans.filter(p => p.id !== id));
                alert("Plano excluído.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    return (
        <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-bold">Administração</h2>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    <button onClick={() => setTab('U')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'U' ? 'bg-brand-primary text-white' : 'text-gray-400'}`}>USUÁRIOS</button>
                    <button onClick={() => setTab('P')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'P' ? 'bg-brand-primary text-white' : 'text-gray-400'}`}>PLANOS</button>
                    <button onClick={() => setTab('C')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'C' ? 'bg-brand-primary text-white' : 'text-gray-400'}`}>SITE</button>
                </div>
            </div>

            {tab === 'U' && (
                <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 animate-in fade-in duration-500">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                            <tr><th className="px-6 py-4">Nome / Empresa</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ação</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-bold text-sm">
                                        {u.name}
                                        <p className="text-[10px] font-normal text-gray-500">{u.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${
                                            u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        }`}>{u.paymentStatus}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onUpdateUser({...u, paymentStatus: u.paymentStatus === PaymentStatus.CONFIRMED ? PaymentStatus.AWAITING : PaymentStatus.CONFIRMED})} className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary hover:bg-brand-primary hover:text-white transition-all"><Edit3 size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'P' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="glass-panel p-6 rounded-3xl border border-brand-primary/20">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Plus size={16}/> Novo Plano</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input placeholder="Nome do Plano" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} />
                            <input type="number" placeholder="Preço (R$)" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none" value={newPlan.price || ''} onChange={e => setNewPlan({...newPlan, price: parseFloat(e.target.value)})} />
                            <input placeholder="Descrição curta" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white md:col-span-1 focus:border-brand-primary outline-none" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} />
                            <Button onClick={handleAddPlan} isLoading={isProcessing}>CADASTRAR</Button>
                        </div>
                    </div>

                    <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                <tr><th className="px-6 py-4">Plano</th><th className="px-6 py-4">Preço</th><th className="px-6 py-4 text-right">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {plans.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-white">{p.name}</p>
                                            <p className="text-xs text-gray-400">{p.description}</p>
                                        </td>
                                        <td className="px-6 py-4 text-brand-accent font-bold">R$ {p.price.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingPlan(p)} className="p-2 bg-blue-500/10 rounded-lg text-blue-400 hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={14} /></button>
                                                <button onClick={() => handleDeletePlan(p.id)} className="p-2 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {plans.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-500">Nenhum plano cadastrado. Use o formulário acima para começar.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'C' && (
                <div className="glass-panel p-8 rounded-[40px] grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Título do Destaque</label>
                            <input placeholder="Título Hero" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-brand-primary outline-none" value={siteConf.heroTitle} onChange={e => setSiteConf({...siteConf, heroTitle: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Subtítulo explicativo</label>
                            <textarea placeholder="Subtítulo" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 h-32 text-white focus:border-brand-primary outline-none" value={siteConf.heroSubtitle} onChange={e => setSiteConf({...siteConf, heroSubtitle: e.target.value})} />
                        </div>
                        <Button onClick={() => onUpdateConfig(siteConf)} className="w-full py-4">SALVAR ALTERAÇÕES DO SITE</Button>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Foto Principal</label>
                        <div onClick={() => fileRef.current?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden group">
                            {siteConf.heroImageUrl ? (
                                <img src={siteConf.heroImageUrl} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                            ) : (
                                <div className="text-center text-gray-500"><Camera className="mx-auto mb-2" /> Alterar Foto</div>
                            )}
                            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) { const r = new FileReader(); r.onload = () => setSiteConf({...siteConf, heroImageUrl: r.result as string}); r.readAsDataURL(f); }
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Plano */}
            {editingPlan && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="glass-panel w-full max-w-md p-8 rounded-[40px] border border-white/10 shadow-2xl relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white">Editar Plano</h3>
                            <button onClick={() => setEditingPlan(null)} className="text-gray-500 hover:text-white transition-colors p-1"><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nome do Plano</label>
                                <input placeholder="Nome do Plano" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-brand-primary outline-none" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Preço (R$)</label>
                                <input type="number" placeholder="Preço (R$)" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-brand-primary outline-none" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Descrição</label>
                                <textarea placeholder="Descrição" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white h-24 focus:border-brand-primary outline-none" value={editingPlan.description} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} />
                            </div>
                            <Button onClick={handleUpdatePlan} className="w-full py-4" isLoading={isProcessing}>SALVAR ALTERAÇÕES</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({
        heroLabel: 'Hélio Júnior', heroTitle: 'Carregando...', heroSubtitle: 'Sintonizando portal...', heroImageUrl: ''
    });
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshData = async () => {
        try {
            const [p, u, pl, c] = await Promise.all([
                storageService.getPosts(),
                storageService.getUsers(),
                storageService.getPlans(),
                storageService.getConfig()
            ]);
            setPosts(p);
            setAllUsers(u);
            setPlans(pl);
            setSiteConfig(c);
            
            // Sync current user session
            const stored = localStorage.getItem('helio_app_current_user');
            if (stored) {
                const parsed = JSON.parse(stored);
                const fresh = u.find(user => user.id === parsed.id);
                if (fresh) {
                    setCurrentUser(fresh);
                    localStorage.setItem('helio_app_current_user', JSON.stringify(fresh));
                }
            }
        } catch (e) {
            console.warn("Falha ao sincronizar dados remotos. Usando cache local.");
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                // Tenta inicializar o Supabase e carregar dados
                await storageService.init();
                await refreshData();
            } catch (err) {
                console.error("Erro na inicialização:", err);
                setError("Ocorreu um erro ao carregar o portal. Verifique sua conexão.");
            } finally {
                // Garante que o loading saia independente do resultado
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleLogin = (user: User) => {
        localStorage.setItem('helio_app_current_user', JSON.stringify(user));
        setCurrentUser(user);
        setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
        refreshData();
    };

    const handleLogout = () => {
        localStorage.removeItem('helio_app_current_user');
        setCurrentUser(null);
        setCurrentView('HOME');
    };

    if (error) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
                <div className="glass-panel p-8 rounded-3xl text-center max-w-sm">
                    <AlertTriangle className="text-red-500 mb-4 mx-auto" size={48} />
                    <h2 className="text-white font-bold mb-4">{error}</h2>
                    <Button onClick={() => window.location.reload()}>Recarregar Site</Button>
                </div>
            </div>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case 'HOME': return <HomeView posts={posts} users={allUsers} config={siteConfig} filterCategory={filterCategory} setFilterCategory={setFilterCategory} onStartAdvertising={() => setCurrentView('REGISTER')} />;
            case 'LOGIN': return <AuthView mode="LOGIN" onLogin={handleLogin} onSwitchMode={setCurrentView} />;
            case 'REGISTER': return <AuthView mode="REGISTER" onLogin={handleLogin} onSwitchMode={setCurrentView} />;
            case 'DASHBOARD': return currentUser ? <DashboardView user={currentUser} onGoToPayment={() => setCurrentView('PAYMENT')} onPostCreated={async p => { await storageService.addPost(p); refreshData(); }} /> : null;
            case 'ADMIN': return currentUser?.role === UserRole.ADMIN ? <AdminView users={allUsers} posts={posts} plans={plans} config={siteConfig} onUpdateUser={async u => { await storageService.updateUser(u); refreshData(); }} onUpdateConfig={async c => { await storageService.updateConfig(c); refreshData(); }} onUpdatePlans={async p => { await storageService.updatePlans(p); refreshData(); }} /> : null;
            case 'PAYMENT': return currentUser ? <PaymentView user={currentUser} plans={plans} onCancel={() => setCurrentView('DASHBOARD')} onPaymentSuccess={async pid => { await storageService.updateUser({...currentUser, planId: pid, paymentStatus: PaymentStatus.CONFIRMED}); await refreshData(); setCurrentView('DASHBOARD'); }} /> : null;
            default: return <HomeView posts={posts} users={allUsers} config={siteConfig} filterCategory={filterCategory} setFilterCategory={setFilterCategory} onStartAdvertising={() => setCurrentView('REGISTER')} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} />
            <main className="relative">
                {isLoading && (
                    <div className="fixed inset-0 bg-[#0f172a] z-[100] flex items-center justify-center animate-out fade-out duration-700 delay-500 fill-mode-forwards">
                        <div className="text-center">
                            <Loader2 className="animate-spin text-brand-primary mx-auto mb-4" size={48} />
                            <p className="text-xs text-gray-500 animate-pulse">Sintonizando frequências...</p>
                        </div>
                    </div>
                )}
                <div className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-1000`}>
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default App;
