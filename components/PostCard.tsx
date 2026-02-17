
import React, { useState, useEffect } from 'react';
import { Post, User } from '../types';
import { User as UserIcon, Phone, MessageCircle, Clock } from 'lucide-react';

interface PostCardProps {
  post: Post;
  author?: User;
}

const Countdown: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const distance = new Date(expiresAt).getTime() - new Date().getTime();
      if (distance < 0) {
        setIsExpired(true);
        return;
      }
      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      });
    };
    calculate();
    const timer = setInterval(calculate, 1000 * 60); 
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (isExpired) return (
    <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold">
      <Clock size={10} /> EXPIRADO
    </div>
  );

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1.5 bg-brand-dark/90 text-brand-accent border border-brand-accent/30 px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg backdrop-blur-sm">
      <Clock size={12} className="animate-pulse" />
      <span>{timeLeft.d}d {timeLeft.h}h {timeLeft.m}m</span>
    </div>
  );
};

export const PostCard: React.FC<PostCardProps> = ({ post, author }) => {
  const handleWhatsApp = () => {
    if (!post.whatsapp) return;
    const clean = post.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  };

  const imageUrl = post.imageUrl || `https://picsum.photos/600/337?random=${post.id}`;

  return (
    <div className="glass-panel rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-brand-primary/10 transition-all duration-500 flex flex-col h-full group border border-white/5">
      {/* Moldura de Imagem Inteligente */}
      <div className="relative aspect-video overflow-hidden bg-black/40">
        {/* Fundo desfocado para preencher as bordas caso a imagem seja vertical */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 scale-110" 
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        {/* Imagem principal enquadrada */}
        <img 
          src={imageUrl} 
          alt={post.title} 
          className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" 
        />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
           <div className="bg-brand-primary/90 text-white text-[9px] px-3 py-1 rounded-full uppercase font-black backdrop-blur-md self-start tracking-wider">
             {post.category}
           </div>
           {author?.expiresAt && author.role !== 'ADMIN' && <Countdown expiresAt={author.expiresAt} />}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow bg-gradient-to-b from-transparent to-brand-dark/30">
        <div className="flex items-center gap-2 mb-3 text-gray-400 text-[10px] font-black uppercase tracking-widest">
            <UserIcon size={12} className="text-brand-secondary" />
            <span>{post.authorName}</span>
        </div>
        <h3 className="text-xl font-black text-white mb-3 leading-tight uppercase tracking-tighter">{post.title}</h3>
        <p className="text-gray-400 text-xs mb-8 flex-grow line-clamp-3 leading-relaxed italic opacity-80">"{post.content}"</p>
        
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button 
            onClick={handleWhatsApp} 
            className="bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-3 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 uppercase transition-all hover:shadow-lg shadow-green-500/20"
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button 
            onClick={() => post.phone && window.open(`tel:${post.phone}`)} 
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-3 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 uppercase transition-all"
          >
            <Phone size={16} /> Ligar
          </button>
        </div>
      </div>
    </div>
  );
};
