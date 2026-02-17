import React from 'react';
import { Post } from '../types';
import { Heart, MessageCircle, User as UserIcon } from 'lucide-react';

interface PostCardProps {
  post: Post;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, isAdmin, onDelete }) => {
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

        <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
          <button className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors">
            <Heart size={18} />
            <span className="text-xs">{post.likes}</span>
          </button>
          
          <div className="flex gap-2">
            <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
              Contatar
            </button>
            {isAdmin && onDelete && (
                <button 
                    onClick={() => onDelete(post.id)}
                    className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                    Remover
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};