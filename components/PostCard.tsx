
import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { MessageCircle, Phone, Zap, Loader2, Play, Pause, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateAudioTTS } from '../services/geminiService';

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  const imageUrls = post.imageUrls && post.imageUrls.length > 0 
    ? post.imageUrls 
    : [`https://picsum.photos/600/800?random=${post.id}`];

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

  const stopAudio = () => {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch (e) {}
      setAudioSource(null);
    }
    setIsPlaying(false);
  };

  const handlePlayLocution = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const base64Audio = await generateAudioTTS(post.content);
      if (base64Audio) {
        let ctx = audioCtx;
        if (!ctx) {
          ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          setAudioCtx(ctx);
        }

        const audioBuffer = await decodeAudioData(
          decodeBase64(base64Audio),
          ctx,
          24000,
          1
        );

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlaying(false);
        
        source.start(0);
        setAudioSource(source);
        setIsPlaying(true);
      }
    } catch (err) { 
      console.error("Erro ao reproduzir áudio:", err); 
    } finally { 
      setIsGeneratingAudio(false); 
    }
  };

  useEffect(() => {
    return () => {
      if (audioSource) audioSource.stop();
    };
  }, [audioSource]);

  return (
    <div className="glass-panel rounded-[30px] overflow-hidden flex flex-col h-full border border-white/5 group hover:border-orange-600/50 transition-all duration-500 shadow-2xl">
      <div className="relative aspect-[3/4] bg-white/5 overflow-hidden">
        <img src={imageUrls[currentImgIndex]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={post.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent" />
        
        {imageUrls.length > 1 && (
            <>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all z-20"><ChevronLeft size={16}/></button>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => (prev + 1) % imageUrls.length); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all z-20"><ChevronRight size={16}/></button>
            </>
        )}

        <button 
          onClick={handlePlayLocution}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-orange-600/90 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 hover:scale-110 hover:bg-orange-600 transition-all z-30 shadow-2xl"
        >
          {isGeneratingAudio ? <Loader2 size={20} className="text-white animate-spin" /> : isPlaying ? <Pause size={20} className="text-white fill-white" /> : <Play size={20} className="text-white fill-white translate-x-0.5" />}
        </button>

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
        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-3 leading-tight line-clamp-2">{post.title}</h3>
        <p className="text-xs text-gray-400 mb-6 italic leading-relaxed line-clamp-3">"{post.content}"</p>
        
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button 
            onClick={handleWhatsApp} 
            className="h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all shadow-md active:scale-95"
          >
            <MessageCircle size={14}/> WhatsApp
          </button>
          <button 
            onClick={() => post.phone && window.open(`tel:${post.phone}`)} 
            className="h-11 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all active:scale-95"
          >
            <Phone size={14}/> Ligar
          </button>
        </div>
      </div>
    </div>
  );
};
