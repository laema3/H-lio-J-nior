
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Radio, Loader2, Phone } from 'lucide-react';
import { chatWithAssistant } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  whatsapp: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ whatsapp }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou o assistente virtual do Hélio Júnior. 🎙️ Como posso ajudar você hoje com seus anúncios ou dúvidas sobre o portal?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));
      
      const response = await chatWithAssistant(userMsg, history);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um problema ao processar sua dúvida. Pode tentar novamente?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const cleanNumber = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=Olá! Estava conversando com a IA no site e gostaria de falar com uma pessoa para tirar mais dúvidas.`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        {/* Janela de Chat */}
        {isOpen && (
          <div className="mb-4 w-[350px] md:w-[400px] h-[520px] glass-panel rounded-[30px] shadow-2xl flex flex-col overflow-hidden border border-white/10 animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="bg-orange-600 p-5 flex items-center justify-between text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Radio size={20} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Hélio Júnior</p>
                  <p className="text-[10px] opacity-80 font-bold">Assistente Digital VIP</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide bg-brand-dark/30">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-[22px] text-[13px] leading-relaxed shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-orange-600 text-white rounded-br-none' 
                      : 'bg-white/5 text-gray-200 border border-white/5 rounded-bl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-[22px] rounded-bl-none border border-white/5">
                    <Loader2 size={16} className="text-orange-500 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer / Ações */}
            <div className="p-4 bg-black/40 border-t border-white/5 space-y-3">
               <button 
                  onClick={handleWhatsApp}
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all shadow-md active:scale-95"
                >
                  <Phone size={14}/> Falar com Atendente
                </button>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escreva sua dúvida aqui..."
                  className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-xs text-white outline-none focus:border-orange-500 transition-all placeholder:text-gray-600"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-white hover:bg-orange-700 transition-all active:scale-90 disabled:opacity-50 shadow-lg"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botão Flutuante Principal */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 hover:rotate-3 hover:bg-orange-700 transition-all duration-300 border-2 border-white/10 relative"
        >
          {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-2 border-brand-dark rounded-full animate-bounce"></span>
          )}
        </button>
      </div>
    </div>
  );
};
