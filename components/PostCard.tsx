
import React from 'react';
import { Post } from '../types';
import { User as UserIcon, MessageCircle, Phone, Award, Zap } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const handleWhatsApp = () => {
    if (!post.whatsapp) return;
    window.open(`https://wa.me/${post.whatsapp.replace(/\D/g, '')}`, '_blank');
  };

  const imageUrl = post.imageUrl || `https://picsum.photos/600/337?random=${post.id}`;
  const logoUrl = post.logoUrl;

  return (
    <div className="glass-panel rounded-[50px] overflow-hidden flex flex-col h-full border border-white/5 group hover:border-brand-primary/40 transition-all duration-700 hover:-translate-y-2">
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]" alt={post.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-80" />
        
        {logoUrl && (
            <div className="absolute bottom-6 left-6 w-16 h-16 bg-white rounded-[22px] p-2 shadow-2xl border border-brand-primary/20 transform -rotate-3 group-hover:rotate-0 transition-transform">
                <img src={logoUrl} className="w-full h-full object-contain" alt="Logo" />
            </div>
        )}

        <div className="absolute top-6 right-6 px-5 py-2 bg-brand-primary/90 backdrop-blur-xl rounded-full text-[8px] font-black uppercase text-white tracking-[0.3em]">
            {post.category}
        </div>
      </div>

      <div className="p-10 flex flex-col flex-grow">
        <div className="flex items-center gap-3 mb-6">
            <Zap size={14} className="text-brand-gold" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{post.authorName}</span>
        </div>
        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 leading-none group-hover:text-brand-primary transition-colors">{post.title}</h3>
        <p className="text-sm text-gray-400 mb-10 italic opacity-80 leading-relaxed line-clamp-3">"{post.content}"</p>
        
        <div className="grid grid-cols-2 gap-5 mt-auto">
          <button 
            onClick={handleWhatsApp} 
            className="h-14 gold-gradient text-brand-dark rounded-3xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all shadow-xl hover:shadow-brand-gold/20"
          >
            <MessageCircle size={18}/> WhatsApp
          </button>
          <button 
            onClick={() => post.phone && window.open(`tel:${post.phone}`)} 
            className="h-14 bg-white/5 hover:bg-white/10 text-white rounded-3xl border border-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all"
          >
            <Phone size={18}/> Contato
          </button>
        </div>
      </div>
    </div>
  );
};
