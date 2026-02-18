
import React from 'react';
import { Post } from '../types';
import { User as UserIcon, MessageCircle, Phone, Award } from 'lucide-react';

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
    <div className="glass-panel rounded-[40px] overflow-hidden flex flex-col h-full border border-white/5 group hover:border-brand-primary/40 transition-all duration-500">
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-60" />
        
        {logoUrl && (
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-white rounded-2xl p-1.5 shadow-2xl border-2 border-brand-primary/20">
                <img src={logoUrl} className="w-full h-full object-contain" alt="Logo" />
            </div>
        )}

        <div className="absolute top-4 right-4 px-4 py-1.5 bg-brand-primary/80 backdrop-blur-md rounded-full text-[9px] font-black uppercase text-white tracking-widest">
            {post.category}
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-4">
            <Award size={14} className="text-brand-accent" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{post.authorName}</span>
        </div>
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 leading-none">{post.title}</h3>
        <p className="text-sm text-gray-400 mb-8 italic opacity-70 flex-grow">"{post.content}"</p>
        
        <div className="grid grid-cols-2 gap-4 mt-auto">
          <button onClick={handleWhatsApp} className="h-12 bg-green-600 hover:bg-green-700 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all">
            <MessageCircle size={16}/> WhatsApp
          </button>
          <button onClick={() => post.phone && window.open(`tel:${post.phone}`)} className="h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all">
            <Phone size={16}/> Ligar
          </button>
        </div>
      </div>
    </div>
  );
};
