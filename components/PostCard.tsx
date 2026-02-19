
import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { MessageCircle, Phone, Zap, Loader2, Play, Pause, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateAudioTTS } from '../services/geminiService';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  const imageUrls = post.imageUrls && post.imageUrls.length > 0 
    ? post.imageUrls 
    : [`https://picsum.photos/600/800?random=${post.id}`];

  useEffect(() => {
    const calculateTime = () => {
      if (!post.expiresAt) return 'Expira em breve';
      const diff = new Date(post.expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) return 'Expirado';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      return `${days}d ${hours}h restantes`;
    };

    const timer = setInterval(() => setTimeLeft(calculateTime()), 60000);
    setTimeLeft(calculateTime());
    return () => clearInterval(timer);
  }, [post.expiresAt]);

  const handleWhatsApp = () => {
    if (!post.whatsapp) return;
    window.open(`https://wa.me/${post.whatsapp.replace(/\D/g, '')}`, '_blank');
  };

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const handlePlayLocution = async () => {
    if (isPlaying && audioInstance) {
      audioInstance.pause();
      setIsPlaying(false);
      return;
    }

    if (audioInstance) {
      audioInstance.play();
      setIsPlaying(true);
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const base64Audio = await generateAudioTTS(post.content);
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.onended = () => setIsPlaying(false);
        setAudioInstance(audio);
        audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Erro ao tocar áudio:", err);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="glass-panel rounded-[40px] overflow-hidden flex flex-col h-full border border-white/5 group hover:border-orange-500/40 transition-all duration-700 hover:-translate-y-2">
      <div className="relative aspect-[3/4] bg-black/40 overflow-hidden">
        <img src={imageUrls[currentImgIndex]} className="w-full h-full object-cover transition-transform duration-[2000ms]" alt={post.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-80" />
        
        {imageUrls.length > 1 && (
            <>
                <button onClick={prevImg} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white hover:bg-brand-primary transition-all"><ChevronLeft size={20}/></button>
                <button onClick={nextImg} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white hover:bg-brand-primary transition-all"><ChevronRight size={20}/></button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                    {imageUrls.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImgIndex ? 'bg-orange-500' : 'bg-white/40'}`} />
                    ))}
                </div>
            </>
        )}

        <button 
          onClick={handlePlayLocution}
          disabled={isGeneratingAudio}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white/20 hover:scale-110 hover:bg-orange-500 transition-all"
        >
          {isGeneratingAudio ? (
            <Loader2 size={24} className="text-white animate-spin" />
          ) : isPlaying ? (
            <Pause size={24} className="text-white fill-white" />
          ) : (
            <Play size={24} className="text-white fill-white translate-x-0.5" />
          )}
        </button>

        <div className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/10">
            <Clock size={12} className="text-orange-500 animate-pulse" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">{timeLeft}</span>
        </div>

        <div className="absolute top-6 right-6 px-4 py-2 bg-orange-600 rounded-full text-[8px] font-black uppercase text-white tracking-widest">
            {post.category}
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-brand-gold" />
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{post.authorName}</span>
            </div>
        </div>
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 line-clamp-2 leading-none">{post.title}</h3>
        <p className="text-sm text-gray-400 mb-8 italic opacity-80 leading-relaxed line-clamp-3">"{post.content}"</p>
        
        <div className="grid grid-cols-2 gap-4 mt-auto">
          <button 
            onClick={handleWhatsApp} 
            className="h-12 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all shadow-lg hover:shadow-green-500/20"
          >
            <MessageCircle size={16}/> WhatsApp
          </button>
          <button 
            onClick={() => post.phone && window.open(`tel:${post.phone}`)} 
            className="h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all"
          >
            <Phone size={16}/> Contato
          </button>
        </div>
      </div>
    </div>
  );
};
