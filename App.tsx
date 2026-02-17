
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, ProfessionCategory, PaymentStatus, SiteConfig, Plan } from './types';
// Fixed: Added DEFAULT_CONFIG to imports
import { storageService, DEFAULT_CONFIG } from './services/storage';
import { Button } from './components/Button';
import { PostCard } from './components/PostCard';
import { generateAdCopy } from './services/geminiService';
import { 
    Search,
    CreditCard,
    Clock,
    Check,
    Camera,
    Loader2,
    Trash2,
    Edit3,
    AlertTriangle,
    Plus,
    X,
    Info,
    Gift,
    FileText
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

const Toast: React.FC<{ message: string, type: 'success' | 'error', onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${
            type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
            {type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
            <span className="font-bold text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={16} /></button>
        </div>
    );
};

const HomeView: React.FC<{ 
  posts: Post[], 
  users: User[],
  currentUser: User | null,
  config: SiteConfig,
  filterCategory: string, 
  setFilterCategory: (c: string) => void,
  onStartAdvertising: () => void
}> = ({ posts, users, currentUser, config, filterCategory, setFilterCategory, onStartAdvertising }) => {
    
    const visiblePosts = posts.filter(post => {
      if (post.authorId === 'admin') return true;
      if (currentUser && post.authorId === currentUser.id) {
          return currentUser.role === UserRole.ADMIN || currentUser.paymentStatus === PaymentStatus.CONFIRMED;
      }
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
                                <Button onClick={() => onStartAdvertising()} variant="outline" className="py-5 px-12 text-lg">Anunciar minha empresa</Button>
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
            setError('Erro ao processar. Tente novamente.');
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

const DashboardView: React.FC<{ 
    user: User, 
    posts: Post[],
    onGoToPayment: () => void, 
    onPostCreated: (p: Post) => Promise<void>,
    onPostUpdated: (p: Post) => Promise<void>,
    onPostDeleted: (id: string) => Promise<void>
}> = ({ user, posts, onGoToPayment, onPostCreated, onPostUpdated, onPostDeleted }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [keywords, setKeywords] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isConfirmed = user.paymentStatus === PaymentStatus.CONFIRMED;
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

    const handleEdit = (post: Post) => {
        setEditingPost(post);
        setTitle(post.title);
        setContent(post.content);
        setImageUrl(post.imageUrl || '');
        setKeywords('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingPost(null);
        setTitle(''); setContent(''); setImageUrl(''); setKeywords('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConfirmed) return onGoToPayment();
        setIsSubmitting(true);
        
        if (editingPost) {
            await onPostUpdated({ ...editingPost, title, content, imageUrl });
            setEditingPost(null);
        } else {
            await onPostCreated({
                id: 'post-' + Date.now(),
                authorId: user.id,
                authorName: user.name,
                category: user.profession || ProfessionCategory.OTHER,
                title, content, imageUrl, createdAt: new Date().toISOString(), likes: 0
            });
        }
        
        setTitle(''); setContent(''); setImageUrl(''); setKeywords('');
        setIsSubmitting(false);
    };

    return (
        <div className="pt-24 pb-20 max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <div className="glass-panel p-8 rounded-3xl">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            {editingPost ? <Edit3 className="text-brand-accent" /> : <Plus />} 
                            {editingPost ? 'Editar Anúncio' : 'Novo Anúncio'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input required placeholder="Título do Anúncio" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-brand-primary outline-none" value={title} onChange={e => setTitle(e.target.value)} />
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                <label className="text-[10px] font-bold text-brand-accent uppercase mb-2 block">Escrever com IA</label>
                                <div className="flex gap-2">
                                    <input placeholder="Ex: pintura rápida, preço justo..." className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-brand-primary outline-none" value={keywords} onChange={e => setKeywords(e.target.value)} />
                                    <button type="button" onClick={handleGenerateIA} disabled={isGenerating} className="bg-brand-primary px-3 rounded-lg text-xs font-bold hover:bg-brand-primary/80 transition-colors">{isGenerating ? '...' : 'GERAR'}</button>
                                </div>
                            </div>
                            <textarea required placeholder="Descrição..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white h-32 focus:border-brand-primary outline-none" value={content} onChange={e => setContent(e.target.value)} />
                            <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group hover:border-brand-primary/50 transition-colors">
                                {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <div className="text-center text-gray-500"><Camera className="mx-auto mb-2 group-hover:text-brand-primary transition-colors" /> Foto do Anúncio</div>}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                            </div>
                            <div className="flex gap-3">
                                <Button type="submit" isLoading={isSubmitting} className="flex-1">
                                    {!isConfirmed ? 'PAGAR PARA PUBLICAR' : (editingPost ? 'ATUALIZAR ANÚNCIO' : 'PUBLICAR AGORA')}
                                </Button>
                                {editingPost && <Button type="button" variant="outline" onClick={handleCancelEdit}>CANCELAR</Button>}
                            </div>
                        </form>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2"><FileText size={20} className="text-brand-secondary"/> Meus Anúncios ({userPosts.length})</h3>
                        {userPosts.length === 0 ? (
                            <div className="p-12 glass-panel rounded-3xl text-center border-dashed border-white/5">
                                <p className="text-gray-500 text-sm">Você ainda não criou nenhum anúncio.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {userPosts.map(post => (
                                    <div key={post.id} className="glass-panel p-4 rounded-2xl flex gap-4 group">
                                        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-brand-dark">
                                            <img src={post.imageUrl || `https://picsum.photos/200/200?random=${post.id}`} className="w-full h-full object-cover" alt={post.title} />
                                        </div>
                                        <div className="flex flex-col justify-between flex-grow min-w-0">
                                            <div>
                                                <h4 className="font-bold text-white text-sm truncate">{post.title}</h4>
                                                <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{post.content}</p>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => handleEdit(post)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={14} /></button>
                                                <button onClick={() => confirm("Deseja excluir?") && onPostDeleted(post.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl h-fit">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-brand-accent"><CreditCard size={18}/> Assinatura</h3>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-4 text-center">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status do Perfil</p>
                            <span className={`text-xs font-bold ${isConfirmed ? 'text-green-400' : 'text-yellow-400'}`}>{user.paymentStatus}</span>
                            {isConfirmed && (
                                <div className="mt-3 flex items-center justify-center gap-2 text-brand-accent bg-brand-accent/5 py-1 px-3 rounded-full border border-brand-accent/10">
                                    <Clock size={12} />
                                    <p className="text-[10px] font-bold uppercase">{getDaysRemaining(user.paymentConfirmedAt)} dias restantes</p>
                                </div>
                            )}
                        </div>
                        {!isConfirmed && <Button onClick={onGoToPayment} variant="secondary" className="w-full text-xs py-3">ASSINAR AGORA</Button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaymentView: React.FC<{ user: User, plans: Plan[], onCancel: () => void, onPaymentSuccess: (pid: string) => Promise<void> }> = ({ plans, onCancel, onPaymentSuccess }) => {
    const [step, setStep] = useState<'PLANS' | 'CHECKOUT'>('PLANS');
    const [selected, setSelected] = useState<Plan | null>(null);

    return (
        <div className="pt-24 pb-20 max-w-4xl mx-auto px-4">
            {step === 'PLANS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map(p => (
                        <div key={p.id} className="glass-panel p-8 rounded-[40px] text-center flex flex-col border border-white/10 hover:border-brand-primary transition-all relative overflow-hidden group">
                            {p.price === 0 && <div className="absolute top-4 right-[-30px] bg-brand-accent text-brand-dark font-bold text-[8px] px-8 py-1 rotate-45 uppercase">Grátis</div>}
                            <h3 className="text-xl font-bold mb-2">{p.name}</h3>
                            <p className="text-3xl font-black text-brand-accent mb-4">{p.price === 0 ? 'GRÁTIS' : `R$ ${p.price.toFixed(2)}`}</p>
                            <p className="text-xs text-gray-400 mb-8 flex-grow">{p.description}</p>
                            <Button onClick={() => { setSelected(p); setStep('CHECKOUT'); }} variant={p.price === 0 ? 'secondary' : 'primary'}>SELECIONAR</Button>
                        </div>
                    ))}
                    {plans.length === 0 && <Button variant="outline" onClick={onCancel}>VOLTAR</Button>}
                </div>
            )}
            
            {step === 'CHECKOUT' && selected && (
                <div className="max-w-md mx-auto glass-panel p-8 rounded-[40px] text-center">
                    <h3 className="text-2xl font-bold mb-2">{selected.name}</h3>
                    {selected.price === 0 ? (
                        <div className="py-12 flex flex-col items-center">
                            <Gift className="text-brand-accent w-20 h-20 mb-6 animate-bounce" />
                            <Button onClick={() => onPaymentSuccess(selected.id)} className="w-full py-4 text-lg">ATIVAR AGORA</Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-3xl w-48 h-48 mx-auto mb-6">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SIMULATE_PIX_${selected.id}`} alt="QR" className="w-full h-full" />
                            </div>
                            <Button onClick={() => onPaymentSuccess(selected.id)} className="w-full py-4">CONFIRMAR PAGAMENTO</Button>
                        </div>
                    )}
                    <button onClick={() => setStep('PLANS')} className="mt-6 text-gray-500 text-xs hover:underline">Voltar</button>
                </div>
            )}
        </div>
    );
};

const AdminView: React.FC<{ 
    users: User[], posts: Post[], config: SiteConfig, plans: Plan[],
    onUpdateUser: (u: User) => Promise<void>, 
    onUpdateConfig: (c: SiteConfig) => Promise<void>,
    onUpdatePlans: (p: Plan[]) => Promise<void>,
    notify: (m: string, t: 'success' | 'error') => void
}> = ({ users, config, plans, onUpdateUser, onUpdateConfig, onUpdatePlans, notify }) => {
    const [tab, setTab] = useState<'U' | 'C' | 'P'>('U');
    const [siteConf, setSiteConf] = useState(config);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [newPlan, setNewPlan] = useState<Partial<Plan>>({ name: '', price: 0, description: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    return (
        <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-bold">Administração</h2>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    <button onClick={() => setTab('U')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab === 'U' ? 'bg-brand-primary' : ''}`}>USUÁRIOS</button>
                    <button onClick={() => setTab('P')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab === 'P' ? 'bg-brand-primary' : ''}`}>PLANOS</button>
                    <button onClick={() => setTab('C')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab === 'C' ? 'bg-brand-primary' : ''}`}>SITE</button>
                </div>
            </div>

            {tab === 'U' && (
                <div className="glass-panel rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] text-gray-500 uppercase font-bold">
                            <tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ação</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4 text-sm font-bold">{u.name}<p className="text-[10px] font-normal text-gray-500">{u.email}</p></td>
                                    <td className="px-6 py-4 text-xs">{u.paymentStatus}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onUpdateUser({...u, paymentStatus: u.paymentStatus === PaymentStatus.CONFIRMED ? PaymentStatus.AWAITING : PaymentStatus.CONFIRMED})} className="p-2 bg-brand-primary/10 rounded-lg"><Edit3 size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {tab === 'C' && (
                <div className="glass-panel p-8 rounded-[40px] grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3" value={siteConf.heroTitle} onChange={e => setSiteConf({...siteConf, heroTitle: e.target.value})} />
                        <textarea className="w-full bg-white/5 border border-white/10 rounded-xl p-3 h-32" value={siteConf.heroSubtitle} onChange={e => setSiteConf({...siteConf, heroSubtitle: e.target.value})} />
                        <Button onClick={() => onUpdateConfig(siteConf).then(() => notify("Salvo!", "success"))} className="w-full">SALVAR</Button>
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
    // Fixed: Using the exported DEFAULT_CONFIG
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);

    const refreshData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [p, u, pl, c] = await Promise.all([
                storageService.getPosts(), storageService.getUsers(), storageService.getPlans(), storageService.getConfig()
            ]);
            setPosts(p); setAllUsers(u); setPlans(pl); setSiteConfig(c);
            const stored = localStorage.getItem('helio_session_v1');
            if (stored) {
                const parsed = JSON.parse(stored);
                const fresh = u.find(user => user.id === parsed.id);
                if (fresh) setCurrentUser(fresh);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        storageService.init().then(() => refreshData());
    }, []);

    const handleLogin = (user: User) => {
        localStorage.setItem('helio_session_v1', JSON.stringify(user));
        setCurrentUser(user);
        setCurrentView(user.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD');
        refreshData(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('helio_session_v1');
        setCurrentUser(null);
        setCurrentView('HOME');
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} />
            <main className="relative">
                {isLoading && <div className="fixed inset-0 bg-[#0f172a] z-[100] flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={48} /></div>}
                {currentView === 'HOME' && <HomeView posts={posts} users={allUsers} currentUser={currentUser} config={siteConfig} filterCategory={filterCategory} setFilterCategory={setFilterCategory} onStartAdvertising={() => setCurrentView('REGISTER')} />}
                {currentView === 'LOGIN' && <AuthView mode="LOGIN" onLogin={handleLogin} onSwitchMode={setCurrentView} />}
                {currentView === 'REGISTER' && <AuthView mode="REGISTER" onLogin={handleLogin} onSwitchMode={setCurrentView} />}
                {currentView === 'DASHBOARD' && currentUser && (
                    <DashboardView 
                        user={currentUser} posts={posts} onGoToPayment={() => setCurrentView('PAYMENT')} 
                        onPostCreated={async p => { await storageService.addPost(p); refreshData(true); setToast({ m: "Publicado!", t: "success"}); }}
                        onPostUpdated={async p => { await storageService.updatePost(p); refreshData(true); setToast({ m: "Atualizado!", t: "success"}); }}
                        onPostDeleted={async id => { await storageService.deletePost(id); refreshData(true); setToast({ m: "Removido!", t: "success"}); }}
                    />
                )}
                {currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && <AdminView users={allUsers} posts={posts} plans={plans} config={siteConfig} onUpdateUser={async u => { await storageService.updateUser(u); refreshData(true); }} onUpdateConfig={async c => { await storageService.updateConfig(c); refreshData(true); }} onUpdatePlans={async pl => { await storageService.updatePlans(pl); refreshData(true); }} notify={(m, t) => setToast({ m, t })} />}
                {currentView === 'PAYMENT' && currentUser && <PaymentView user={currentUser} plans={plans} onCancel={() => setCurrentView('DASHBOARD')} onPaymentSuccess={async pid => { await storageService.updateUser({...currentUser, planId: pid, paymentStatus: PaymentStatus.CONFIRMED, paymentConfirmedAt: new Date().toISOString()}); await refreshData(true); setCurrentView('DASHBOARD'); setToast({ m: "Ativado!", t: "success"}); }} />}
            </main>
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;