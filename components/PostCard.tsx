
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

  return (
    <div className="glass-panel rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col h-full group">
      <div className="relative aspect-video overflow-hidden bg-brand-dark">
        <img src={post.imageUrl || `https://picsum.photos/600/337?random=${post.id}`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
           <div className="bg-brand-primary text-white text-[10px] px-3 py-1 rounded-full uppercase font-black backdrop-blur-md self-start">
             {post.category}
           </div>
           {author?.expiresAt && author.role !== 'ADMIN' && <Countdown expiresAt={author.expiresAt} />}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-2 text-gray-400 text-[10px] font-bold uppercase">
            <UserIcon size={12} className="text-brand-secondary" />
            <span>{post.authorName}</span>
        </div>
        <h3 className="text-lg font-black text-white mb-2 leading-tight">{post.title}</h3>
        <p className="text-gray-400 text-xs mb-6 flex-grow line-clamp-3 leading-relaxed italic">"{post.content}"</p>
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 uppercase">
            <MessageCircle size={14} /> WhatsApp
          </button>
          <button onClick={() => post.phone && window.open(`tel:${post.phone}`)} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 uppercase">
            <Phone size={14} /> Ligar
          </button>
        </div>
      </div>
    </div>
  );
};
