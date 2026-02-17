
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewState, User, UserRole, Post, ProfessionCategory, PaymentStatus, SiteConfig, Plan } from './types';
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
    FileText,
    Phone,
    MessageCircle,
    Database,
    ShieldCheck
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
    
    // Lógica de visibilidade pública rigorosa
    const visiblePosts = posts.filter(post => {
      // 1. Admin sempre visível
      if (post.authorId === 'admin') return true;
      
      const author = users.find(u => u.id === post.authorId);
      
      // 2. Se for o meu próprio post, eu vejo (com tag de pendente se for o caso)
      if (currentUser && post.authorId === currentUser.id) return true;
      
      // 3. Público só vê anúncios de quem pagou
      return author && (author.paymentStatus === PaymentStatus.CONFIRMED);
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
                        <h3 className="text-2xl font-bold text-white mb-2">Nenhum anúncio disponível</h3>
                        <p className="text-gray-400 text-sm">Seja o primeiro a anunciar no portal do Hélio Júnior!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.map(post => {
                            const author = users.find(u => u.id === post.authorId);
                            const isMyPost = currentUser && post.authorId === currentUser.id;
                            const isPending = author && author.paymentStatus !== PaymentStatus.CONFIRMED && author.role !== UserRole.ADMIN;
                            
                            return (
                                <div key={post.id} className="relative">
                                    {isPending && isMyPost && (
                                        <div className="absolute top-4 left-4 z-10 bg-yellow-500 text-brand-dark text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-yellow-400 animate-pulse">
                                            <Clock size={12} /> SÓ VOCÊ VÊ ESTE ANÚNCIO (PENDENTE)
                                        </div>
                                    )}
                                    <PostCard post={post} />
                                </div>
                            );
                        })}
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
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                    {mode === 'LOGIN' ? 'Painel do Anunciante' : 'Crie seu Perfil Profissional'}
                </h2>
                {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {error}
                </div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'REGISTER' && (
                        <>
                            <input type="text" required placeholder="Nome ou Nome da Empresa" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value as ProfessionCategory})}>{Object.values(ProfessionCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                        </>
                    )}
                    <input type="email" required placeholder="Seu melhor e-mail" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input type="password" required placeholder="Senha de acesso" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    <Button type="submit" isLoading={isLoading} className="w-full mt-4 h-12 text-lg">
                        {mode === 'LOGIN' ? 'Entrar Agora' : 'Cadastrar e Começar'}
                    </Button>
                </form>
                <div className="mt-6 text-center text-sm text-gray-400">
                    {mode === 'LOGIN' ? <button onClick={() => onSwitchMode('REGISTER')} className="text-brand-accent font-semibold hover:underline">Ainda não tem conta? Cadastre-se</button> : <button onClick={() => onSwitchMode('LOGIN')} className="text-brand-accent font-semibold hover:underline">Já tem uma conta? Faça login</button>}
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
    onPostDeleted: (id: string) => Promise<void>,
    onNotify: (m: string, t: 'success' | 'error') => void
}> = ({ user, posts, onGoToPayment, onPostCreated, onPostUpdated, onPostDeleted, onNotify }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [phone, setPhone] = useState('');
    const [keywords, setKeywords] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isConfirmed = user.paymentStatus === PaymentStatus.CONFIRMED;
    
    // FILTRAGEM RIGOROSA: O usuário só vê o que lhe pertence no painel
    const userPosts = posts.filter(p => p.authorId === user.id);

    const checkCanPost = () => {
        if (user.role === UserRole.ADMIN) return { can: true };
        const now = new Date();
        const last30Days = userPosts.filter(p => (now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 3600 * 24) <= 30);
        if (last30Days.length >= 4) return { can: false, reason: "Limite mensal (4) atingido." };
        if (userPosts.length > 0) {
            const latest = userPosts.reduce((prev, curr) => new Date(prev.createdAt) > new Date(curr.createdAt) ? prev : curr);
            const diffDays = (now.getTime() - new Date(latest.createdAt).getTime()) / (1000 * 3600 * 24);
            if (diffDays < 7) return { can: false, reason: `Aguarde ${Math.ceil(7-diffDays)} dia(s) para o próximo.` };
        }
        return { can: true };
    };

    const postLimitStatus = checkCanPost();

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
        setWhatsapp(post.whatsapp || '');
        setPhone(post.phone || '');
        setImageUrl(post.imageUrl || '');
        setKeywords('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingPost(null);
        setTitle(''); setContent(''); setImageUrl(''); setKeywords('');
        setWhatsapp(''); setPhone('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingPost) {
                await onPostUpdated({ ...editingPost, title, content, imageUrl, whatsapp, phone });
                setEditingPost(null);
            } else {
                await onPostCreated({
                    id: 'post-' + Date.now(),
                    authorId: user.id,
                    authorName: user.name,
                    category: user.profession || ProfessionCategory.OTHER,
                    title, content, imageUrl, createdAt: new Date().toISOString(), likes: 0,
                    whatsapp, phone
                });
            }
            setTitle(''); setContent(''); setImageUrl(''); setKeywords('');
            setWhatsapp(''); setPhone('');
        } catch (error: any) {
            onNotify(error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pt-24 pb-20 max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-8 bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20">
                <ShieldCheck className="text-brand-primary" />
                <div>
                    <h2 className="text-xl font-bold">Meu Painel Privado</h2>
                    <p className="text-xs text-gray-400">Gerenciamento exclusivo dos seus anúncios no portal.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <div className="glass-panel p-8 rounded-3xl border-brand-primary/20 shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                {editingPost ? <Edit3 className="text-brand-accent" /> : <Plus className="text-brand-primary" />} 
                                {editingPost ? 'Editar Meu Anúncio' : 'Criar Novo Anúncio'}
                            </h2>
                            {!editingPost && !postLimitStatus.can && (
                                <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-red-500/20">
                                    <Clock size={12}/> {postLimitStatus.reason}
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input required placeholder="Título do Anúncio (Ex: Promoção de Inverno)" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" value={title} onChange={e => setTitle(e.target.value)} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                                    <input required placeholder="WhatsApp (5511999999999)" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-primary" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
                                    <input required placeholder="Telefone fixo ou celular" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-primary" value={phone} onChange={e => setPhone(e.target.value)} />
                                </div>
                            </div>

                            <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl">
                                <label className="text-[10px] font-bold text-brand-accent uppercase mb-2 block tracking-widest">Apoio da IA Inteligente</label>
                                <div className="flex gap-2">
                                    <input placeholder="Palavras-chave do seu serviço..." className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-brand-primary outline-none" value={keywords} onChange={e => setKeywords(e.target.value)} />
                                    <button type="button" onClick={handleGenerateIA} disabled={isGenerating} className="bg-brand-primary px-4 rounded-lg text-xs font-bold hover:bg-brand-primary/80 transition-all shadow-md active:scale-95">{isGenerating ? 'Escrevendo...' : 'GERAR TEXTO'}</button>
                                </div>
                            </div>

                            <textarea required placeholder="Descreva os benefícios do seu serviço aqui..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white h-32 outline-none focus:border-brand-primary resize-none" value={content} onChange={e => setContent(e.target.value)} />
                            
                            <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group hover:border-brand-primary/50 transition-colors">
                                {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <div className="text-center text-gray-500"><Camera className="mx-auto mb-2 group-hover:text-brand-primary transition-colors" /> Clique para adicionar uma foto</div>}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="submit" isLoading={isSubmitting} disabled={!editingPost && !postLimitStatus.can} className="flex-1 h-12">
                                    {!postLimitStatus.can && !editingPost ? 'Limite Temporário' : (editingPost ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR MEU ANÚNCIO')}
                                </Button>
                                {editingPost && <Button type="button" variant="outline" onClick={handleCancelEdit}>CANCELAR</Button>}
                            </div>
                        </form>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                             <h3 className="text-xl font-bold flex items-center gap-2"><FileText size={20} className="text-brand-secondary"/> Seus Anúncios Registrados ({userPosts.length}/4)</h3>
                        </div>
                        {userPosts.length === 0 ? (
                            <div className="p-12 glass-panel rounded-3xl text-center border-dashed border-white/5">
                                <Database className="mx-auto mb-3 text-gray-700" size={32} />
                                <p className="text-gray-500 text-sm">Você ainda não possui anúncios gravados no seu painel.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {userPosts.map(post => (
                                    <div key={post.id} className="glass-panel p-4 rounded-2xl flex gap-4 border border-white/5 hover:border-brand-primary/30 transition-all shadow-md group">
                                        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-brand-dark">
                                            <img src={post.imageUrl || `https://picsum.photos/200/200?random=${post.id}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={post.title} />
                                        </div>
                                        <div className="flex flex-col justify-between flex-grow min-w-0">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-white text-sm truncate pr-2">{post.title}</h4>
                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase shadow-sm ${isConfirmed ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                                        {isConfirmed ? 'ATIVO' : 'PENDENTE'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{post.content}</p>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => handleEdit(post)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={14} /></button>
                                                <button onClick={() => confirm("Confirmar remoção permanente?") && onPostDeleted(post.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl h-fit border-brand-accent/20 shadow-xl">
                        <div className="flex items-center gap-2 mb-6">
                             <div className="p-2 bg-brand-accent/20 rounded-lg text-brand-accent">
                                 <CreditCard size={20}/>
                             </div>
                             <h3 className="font-bold text-lg">Minha Assinatura</h3>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-4 text-center">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Status da Conta</p>
                            <span className={`text-sm font-black ${isConfirmed ? 'text-green-400' : 'text-yellow-400'}`}>{user.paymentStatus}</span>
                            {isConfirmed && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-brand-accent bg-brand-accent/5 py-1.5 px-4 rounded-full border border-brand-accent/10">
                                    <Clock size={14} />
                                    <p className="text-xs font-bold uppercase">{getDaysRemaining(user.paymentConfirmedAt)} dias ativos</p>
                                </div>
                            )}
                        </div>
                        {!isConfirmed && (
                            <div className="space-y-4">
                                <div className="p-3 bg-white/5 rounded-xl text-[10px] text-gray-400 text-center leading-relaxed italic border border-white/5">
                                    Sua conta aguarda pagamento. Após a confirmação, seus anúncios serão visíveis na página principal para todo o público.
                                </div>
                                <Button onClick={onGoToPayment} variant="secondary" className="w-full py-4 font-black">ATIVAR AGORA</Button>
                            </div>
                        )}
                    </div>
                    
                    <div className="glass-panel p-6 rounded-3xl border-white/5 text-center">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">Proteção de Dados</h4>
                        <div className="flex justify-center gap-4 text-gray-600">
                             <span title="Criptografia Local"><Database size={20} /></span>
                             <span title="Acesso Restrito"><ShieldCheck size={20} /></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Outros componentes re-utilizados com melhorias de sincronização ---

const PaymentView: React.FC<{ 
    user: User, 
    plans: Plan[], 
    onCancel: () => void, 
    onPaymentSuccess: (planId: string) => Promise<void> 
}> = ({ user, plans, onCancel, onPaymentSuccess }) => {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = async () => {
        if (!selectedPlan) return;
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        await onPaymentSuccess(selectedPlan);
        setIsProcessing(false);
    };

    return (
        <div className="pt-24 pb-20 max-w-4xl mx-auto px-4 animate-in fade-in duration-500">
            <div className="text-center mb-12">
                <div className="inline-block p-3 bg-brand-primary/20 rounded-2xl text-brand-primary mb-4">
                     <CreditCard size={32} />
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Ative sua Presença</h2>
                <p className="text-gray-400 max-w-lg mx-auto">Escolha o plano ideal para destacar seu negócio no portal com a maior audiência da rádio.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {plans.map(plan => (
                    <div 
                        key={plan.id} 
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`glass-panel p-8 rounded-[40px] border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 flex flex-col ${
                            selectedPlan === plan.id 
                                ? 'border-brand-accent bg-brand-accent/10 shadow-xl shadow-brand-accent/10' 
                                : 'border-white/5 hover:border-white/20'
                        }`}
                    >
                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="mb-4">
                            <span className="text-3xl font-black text-brand-secondary">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                            <span className="text-[10px] text-gray-500 ml-1">/mês</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed mb-8 flex-grow">{plan.description}</p>
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selectedPlan === plan.id ? 'border-brand-accent bg-brand-accent text-brand-dark' : 'border-white/20 text-transparent'
                        }`}>
                            <Check size={20} strokeWidth={3} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                    onClick={handlePayment} 
                    disabled={!selectedPlan || isProcessing} 
                    isLoading={isProcessing}
                    className="px-16 py-5 text-lg font-black"
                >
                    ATIVAR ASSINATURA
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={isProcessing} className="px-10">
                    VOLTAR
                </Button>
            </div>
        </div>
    );
};

const AdminView: React.FC<{ 
    users: User[], 
    posts: Post[], 
    config: SiteConfig, 
    plans: Plan[],
    onUpdateUser: (u: User) => Promise<void>, 
    onUpdateConfig: (c: SiteConfig) => Promise<void>,
    onUpdatePlans: (p: Plan[]) => Promise<void>,
    onDeletePost: (id: string) => Promise<void>,
    notify: (m: string, t: 'success' | 'error') => void
}> = ({ users, posts, config, plans, onUpdateUser, onUpdateConfig, onUpdatePlans, onDeletePost, notify }) => {
    const [tab, setTab] = useState<'U' | 'A' | 'P' | 'C'>('U');
    const [siteConf, setSiteConf] = useState(config);

    return (
        <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <h2 className="text-3xl font-black tracking-tight">Oversight Admin</h2>
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 overflow-x-auto max-w-full shadow-inner">
                    <button onClick={() => setTab('U')} className={`px-6 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${tab === 'U' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>USUÁRIOS</button>
                    <button onClick={() => setTab('A')} className={`px-6 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${tab === 'A' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>ANÚNCIOS</button>
                    <button onClick={() => setTab('P')} className={`px-6 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${tab === 'P' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>PLANOS</button>
                    <button onClick={() => setTab('C')} className={`px-6 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${tab === 'C' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>SITE</button>
                </div>
            </div>

            {tab === 'U' && (
                <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right duration-500">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] text-gray-500 uppercase font-bold tracking-widest border-b border-white/5">
                            <tr><th className="px-6 py-5">Identificação</th><th className="px-6 py-5">Assinatura</th><th className="px-6 py-5 text-right">Ação</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="font-black text-sm text-white">{u.name}</div>
                                        <div className="text-[10px] font-normal text-gray-400 font-mono">{u.email}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`text-[9px] px-3 py-1 rounded-full font-black border ${u.paymentStatus === PaymentStatus.CONFIRMED ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                            {u.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <Button onClick={() => onUpdateUser({...u, paymentStatus: u.paymentStatus === PaymentStatus.CONFIRMED ? PaymentStatus.AWAITING : PaymentStatus.CONFIRMED}).then(() => notify("Acesso Atualizado!", "success"))} className="text-[10px] py-2 px-4 h-auto uppercase tracking-widest font-black">LIBERAR/BLOQUEAR</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'A' && (
                <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right duration-500">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] text-gray-500 uppercase font-bold tracking-widest border-b border-white/5">
                            <tr><th className="px-6 py-5">Publicação</th><th className="px-6 py-5">Categoria</th><th className="px-6 py-5 text-right">Controle</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {posts.map(p => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-5">
                                        <p className="font-black text-sm text-white truncate max-w-[250px]">{p.title}</p>
                                        <p className="text-[10px] text-brand-secondary font-black uppercase tracking-wider">{p.authorName}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-[10px] bg-white/5 px-2 py-1 rounded-lg text-gray-400 font-medium">{p.category}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button onClick={() => confirm("Remover anúncio permanentemente?") && onDeletePost(p.id).then(() => notify("Publicação Removida!", "success"))} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {tab === 'C' && (
                <div className="glass-panel p-10 rounded-[40px] grid grid-cols-1 lg:grid-cols-2 gap-12 shadow-2xl animate-in zoom-in duration-300">
                    <div className="space-y-6">
                        <div>
                             <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Headline Principal</label>
                             <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-brand-primary outline-none transition-all" value={siteConf.heroTitle} onChange={e => setSiteConf({...siteConf, heroTitle: e.target.value})} />
                        </div>
                        <div>
                             <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Sub-headline Descritiva</label>
                             <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 h-40 text-white leading-relaxed focus:border-brand-primary outline-none transition-all resize-none" value={siteConf.heroSubtitle} onChange={e => setSiteConf({...siteConf, heroSubtitle: e.target.value})} />
                        </div>
                        <Button onClick={() => onUpdateConfig(siteConf).then(() => notify("Configurações Salvas com Sucesso!", "success"))} className="w-full py-5 text-lg font-black">GRAVAR ALTERAÇÕES</Button>
                    </div>
                    <div className="hidden lg:flex items-center justify-center opacity-20">
                         <Database size={200} />
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
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ m: string, t: 'success' | 'error' } | null>(null);

    const refreshData = async (silent = false) => {
        if (!silent) setIsLoading(true);
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
            
            const stored = localStorage.getItem('helio_session_v1');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.id === 'admin') {
                    setCurrentUser(parsed);
                } else {
                    const fresh = u.find(user => user.id === parsed.id);
                    if (fresh) {
                        setCurrentUser(fresh);
                        localStorage.setItem('helio_session_v1', JSON.stringify(fresh));
                    } else {
                        localStorage.removeItem('helio_session_v1');
                        setCurrentUser(null);
                    }
                }
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
        <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans selection:bg-brand-primary selection:text-white">
            <Navbar currentUser={currentUser} setCurrentView={setCurrentView} currentView={currentView} onLogout={handleLogout} />
            <main className="relative min-h-screen">
                {isLoading && (
                    <div className="fixed inset-0 bg-[#0f172a] z-[100] flex items-center justify-center">
                        <div className="text-center animate-in zoom-in duration-300">
                             <div className="relative inline-block">
                                 <Loader2 className="animate-spin text-brand-primary mb-2" size={64} />
                                 <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-secondary opacity-50" size={24} />
                             </div>
                             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4">Protegendo sua Conexão...</p>
                        </div>
                    </div>
                )}
                {currentView === 'HOME' && <HomeView posts={posts} users={allUsers} currentUser={currentUser} config={siteConfig} filterCategory={filterCategory} setFilterCategory={setFilterCategory} onStartAdvertising={() => setCurrentView('REGISTER')} />}
                {currentView === 'LOGIN' && <AuthView mode="LOGIN" onLogin={handleLogin} onSwitchMode={setCurrentView} />}
                {currentView === 'REGISTER' && <AuthView mode="REGISTER" onLogin={handleLogin} onSwitchMode={setCurrentView} />}
                {currentView === 'DASHBOARD' && currentUser && (
                    <DashboardView 
                        user={currentUser} 
                        posts={posts} 
                        onGoToPayment={() => setCurrentView('PAYMENT')} 
                        onPostCreated={async p => { await storageService.addPost(p); await refreshData(true); setToast({ m: "Publicado com sucesso!", t: "success"}); }}
                        onPostUpdated={async p => { await storageService.updatePost(p); await refreshData(true); setToast({ m: "Anúncio atualizado!", t: "success"}); }}
                        onPostDeleted={async id => { await storageService.deletePost(id); await refreshData(true); setToast({ m: "Anúncio removido!", t: "success"}); }}
                        onNotify={(m, t) => setToast({ m, t })}
                    />
                )}
                {currentView === 'ADMIN' && currentUser?.role === UserRole.ADMIN && (
                    <AdminView 
                        users={allUsers} posts={posts} plans={plans} config={siteConfig} 
                        onUpdateUser={async u => { await storageService.updateUser(u); await refreshData(true); }} 
                        onUpdateConfig={async c => { await storageService.updateConfig(c); await refreshData(true); }} 
                        onUpdatePlans={async pl => { await storageService.updatePlans(pl); await refreshData(true); }} 
                        onDeletePost={async id => { await storageService.deletePost(id); await refreshData(true); }}
                        notify={(m, t) => setToast({ m, t })} 
                    />
                )}
                {currentView === 'PAYMENT' && currentUser && (
                    <PaymentView 
                        user={currentUser} plans={plans} onCancel={() => setCurrentView('DASHBOARD')} 
                        onPaymentSuccess={async pid => { 
                            await storageService.updateUser({...currentUser, planId: pid, paymentStatus: PaymentStatus.CONFIRMED, paymentConfirmedAt: new Date().toISOString()}); 
                            await refreshData(true); 
                            setCurrentView('DASHBOARD'); 
                            setToast({ m: "Sua vitrine foi liberada!", t: "success"}); 
                        }} 
                    />
                )}
            </main>
            {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
