import React from 'react';
import { Post } from '../types';
import { Phone, Send, Zap, Image as ImageIcon } from 'lucide-react';

interface PostCardProps {
    post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
    return (
        <div className="glass-panel p-6 rounded-[30px] border border-white/10 flex flex-col h-full">
            <div className="relative w-full h-12 sm:h-16 mb-3 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center p-2">
                {post.logoUrl ? (
                    <img
                        src={post.logoUrl}
                        alt={post.title}
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center opacity-20">
                        <ImageIcon size={16} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/20 to-transparent pointer-events-none" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-tighter mb-1 leading-tight line-clamp-1">{post.title}</h3>
            <p className="text-[10px] text-gray-400 flex-1 mb-3 line-clamp-2 leading-relaxed">{post.content}</p>
            <div className="flex items-center gap-2 text-[8px] font-black uppercase text-yellow-500 tracking-widest mb-3">
                <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">{post.category}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-auto">
                {post.whatsapp && (
                    <a href={`https://wa.me/${post.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-9 h-9 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-all active:scale-90">
                        <Send size={16}/>
                    </a>
                )}
                {post.phone && (
                    <a href={`tel:${post.phone}`} title="Ligar" className="w-9 h-9 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-white/20 transition-all active:scale-90">
                        <Phone size={16}/>
                    </a>
                )}
                {post.website && (
                    <a href={post.website.startsWith('http') ? post.website : `https://${post.website}`} target="_blank" rel="noopener noreferrer" title="Website" className="w-9 h-9 bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90">
                        <Zap size={16}/>
                    </a>
                )}
            </div>
        </div>
    );
};
