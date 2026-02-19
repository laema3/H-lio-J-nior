
import React, { useState } from 'react';
import { Post } from '../types';
import { User as UserIcon, MessageCircle, Phone, Award, Zap, Volume2, Loader2, Play, Pause } from 'lucide-react';
import { generateAudioTTS } from '../services/geminiService';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);

  const handleWhatsApp = () => {
    if (!post.whatsapp) return;
    window.open(`https://wa.me/${post.whatsapp.replace(/\D/g, '')}`, '_blank');
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
        // A IA retorna PCM raw. Para fins de player simples no navegador, 
        // vamos converter ou usar um Blob se fosse um arquivo, 
        // mas o gemini-tts permite gerar o stream. 
        // Aqui criamos um elemento de áudio para a base64 (ajustando o mime-type se necessário)
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`); // O browser costuma aceitar wav/mp3 em base64
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

  const imageUrl = post.imageUrl || `https://picsum.photos/600/337?random=${post.id}`;
  const logoUrl = post.logoUrl;

  return (
    <div className="glass-panel rounded-[50px] overflow-hidden flex flex-col h-full border border-white/5 group hover:border-brand-primary/40 transition-all duration-700 hover:-translate-y-2">
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]" alt={post.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-80" />
        
        <button 
          onClick={handlePlayLocution}
          disabled={isGeneratingAudio}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-brand-primary/20 backdrop-blur-3xl rounded-full flex items-center justify-center border border-white/20 hover:scale-110 hover:bg-brand-primary transition-all group/play"
        >
          {isGeneratingAudio ? (
            <Loader2 size={32} className="text-white animate-spin" />
          ) : isPlaying ? (
            <Pause size={32} className="text-white fill-white" />
          ) : (
            <Play size={32} className="text-white fill-white translate-x-1" />
          )}
        </button>

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
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap size={14} className="text-brand-gold" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{post.authorName}</span>
            </div>
            {isPlaying && (
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-1 bg-brand-primary animate-bounce" style={{height: `${Math.random() * 16 + 4}px`, animationDelay: `${i * 0.1}s`}} />
                ))}
              </div>
            )}
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
