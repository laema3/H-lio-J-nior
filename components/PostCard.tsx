
import React from 'react';
import { Post } from '../types';
import { Heart, User as UserIcon, Phone, MessageCircle } from 'lucide-react';

interface PostCardProps {
  post: Post;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, isAdmin, onDelete }) => {
  const handleWhatsApp = () => {
    if (!post.whatsapp) return;
    const cleanNumber = post.whatsapp.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${post.authorName}, vi seu anúncio "${post.title}" no portal Hélio Júnior e gostaria de mais informações.`);
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const handleCall = () => {
    if (!post.phone) return;
    window.open(`tel:${post.phone}`, '_self');
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col h-full group">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={post.imageUrl || `https://picsum.photos/800/600?random=${post.id}`} 
          alt={post.title} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 bg-brand-primary/90 text-white text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold backdrop-blur-sm">
          {post.category}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-3 text-gray-400 text-sm">
            <UserIcon size={14} />
            <span className="font-medium text-brand-secondary">{post.authorName}</span>
            <span>•</span>
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 leading-tight">{post.title}</h3>
        <p className="text-gray-300 text-sm mb-6 flex-grow line-clamp-3">
          {post.content}
        </p>

        <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-3">
          <div className="flex justify-between items-center mb-2">
            <button className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors">
              <Heart size={18} />
              <span className="text-xs">{post.likes}</span>
            </button>
            {isAdmin && onDelete && (
                <button 
                    onClick={() => onDelete(post.id)}
                    className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1 rounded-lg text-xs transition-colors"
                >
                    Remover
                </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20 active:scale-95"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button 
              onClick={handleCall}
              className="bg-brand-primary hover:bg-brand-primary/80 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-primary/20 active:scale-95"
            >
              <Phone size={14} /> Ligar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
