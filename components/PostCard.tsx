
import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { MessageCircle, Phone, Zap, Clock, Globe } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [timeLeft, setTimeLeft] = useState('');

  const imageUrl = post.logoUrl || `https://picsum.photos/600/800?random=${post.id}`;

  useEffect(() => {
    const calculateTime = () => {
      if (!post.expiresAt) return '30d 0h';
      const diff = new Date(post.expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) return 'Expirado';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      return `${days}d ${hours}h`;
    };

    const timer = setInterval(() => setTimeLeft(calculateTime()), 60000);
    setTimeLeft(calculateTime());
    return () => clearInterval(timer);
  }, [post.expiresAt]);

  const handleWhatsApp = () => {
    if (!post.whatsapp) return;
    window.open(`https://wa.me/${post.whatsapp.replace(/\D/g, '')}?text=Olá, vi seu anúncio no Portal Hélio Júnior!`, '_blank');
  };

  return (
    <div className="glass-panel rounded-[30px] overflow-hidden flex flex-col h-full border border-white/5 group hover:border-orange-600/50 transition-all duration-500 shadow-2xl">
      <div className="relative aspect-[3/4] bg-white/5 overflow-hidden">
        <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={post.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent" />

        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-dark/60 backdrop-blur-md rounded-full border border-white/10">
                <Clock size={11} className="text-orange-500 animate-pulse" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">{timeLeft}</span>
            </div>
            <div className="px-2.5 py-1.5 bg-orange-600 rounded-lg text-[8px] font-black uppercase text-white tracking-widest shadow-lg">
                {post.category}
            </div>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={10} className="text-orange-500" />
          <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{post.authorName}</span>
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-3 leading-tight line-clamp-2">{post.title}</h3>
        <p className="text-xs text-gray-400 mb-6 italic leading-relaxed line-clamp-3">&#34;{post.content}&#34;</p>
        
        <div className="grid grid-cols-3 gap-3 mt-auto">
          {post.whatsapp && <button 
            onClick={handleWhatsApp} 
            className="h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all shadow-md active:scale-95"
          >
            <MessageCircle size={14}/> WhatsApp
          </button>}
          {post.phone && <button 
            onClick={() => post.phone && window.open(`tel:${post.phone}`)} 
            className="h-11 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all active:scale-95"
          >
            <Phone size={14}/> Ligar
          </button>}
          {post.website && <a 
            href={post.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all shadow-md active:scale-95"
          >
            <Globe size={14}/> Website
          </a>}
        </div>
      </div>
    </div>
  );
};
