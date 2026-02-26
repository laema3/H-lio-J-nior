
import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { MessageCircle, Phone, Zap, Clock, Globe } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [timeLeft, setTimeLeft] = useState('');

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
      <div className="relative h-48 bg-white/5 overflow-hidden flex items-center justify-center p-8">
        {post.logoUrl ? (
          <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-inner flex items-center justify-center p-2">
            <img src={post.logoUrl} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={post.title} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center opacity-20">
            <Zap size={24} className="text-gray-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent pointer-events-none" />

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
        <h3 className="text-sm font-black text-white uppercase tracking-tighter mb-2 leading-tight line-clamp-1">{post.title}</h3>
        <p className="text-[10px] text-gray-400 mb-4 italic leading-relaxed line-clamp-2">&#34;{post.content}&#34;</p>
        
        <div className="flex gap-2 mt-auto">
          {post.whatsapp && <button 
            onClick={handleWhatsApp} 
            title="WhatsApp"
            className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95"
          >
            <MessageCircle size={18}/>
          </button>}
          {post.phone && <button 
            onClick={() => post.phone && window.open(`tel:${post.phone}`)} 
            title="Ligar"
            className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 flex items-center justify-center transition-all active:scale-95"
          >
            <Phone size={18}/>
          </button>}
          {post.website && <a 
            href={post.website.startsWith('http') ? post.website : `https://${post.website}`} 
            target="_blank" 
            rel="noopener noreferrer"
            title="Website"
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95"
          >
            <Globe size={18}/>
          </a>}
        </div>
      </div>
    </div>
  );
};
