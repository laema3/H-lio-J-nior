import React from 'react';
import { Post } from '../types';
import { Phone, Send } from 'lucide-react';

interface PostCardProps {
    post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
    return (
        <div className="glass-panel p-6 rounded-[30px] border border-white/10 flex flex-col h-full">
            <div className="relative w-full h-24 sm:h-32 mb-4 rounded-2xl overflow-hidden bg-gray-800 flex items-center justify-center">
                <img
                    src={post.logoUrl || `https://picsum.photos/seed/${post.id}/400/200?blur=2`}
                    alt={post.title}
                    className="max-w-full max-h-full object-contain object-center"
                    referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2 leading-tight">{post.title}</h3>
            <p className="text-sm text-gray-400 flex-1 mb-4 line-clamp-3">{post.content}</p>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-500 tracking-widest mb-4">
                <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">{post.category}</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-auto">
                {post.whatsapp && (
                    <a href={`https://wa.me/${post.whatsapp}`} target="_blank" rel="noopener noreferrer" className="h-10 px-4 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-green-600 transition-all">
                        <Send size={14}/> WhatsApp
                    </a>
                )}
                {post.phone && (
                    <a href={`tel:${post.phone}`} className="h-10 px-4 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-white/20 transition-all">
                        <Phone size={14}/> Ligar
                    </a>
                )}
            </div>
        </div>
    );
};
