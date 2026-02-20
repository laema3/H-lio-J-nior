
import React, { useState } from 'react';
import { ViewState, User, UserRole, SiteConfig } from '../types';
import { Menu, X, Radio, LogOut, Shield } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  setCurrentView: (view: ViewState) => void;
  currentView: ViewState;
  onLogout: () => void;
  config: SiteConfig;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, setCurrentView, currentView, onLogout, config, isOnline }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItem = (label: string, target: ViewState, active: boolean) => (
    <button
      onClick={() => {
        setCurrentView(target);
        setIsMenuOpen(false);
      }}
      className={`px-5 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all duration-300 ${
        active 
          ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/20 scale-105' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          <div 
            className="flex items-center gap-6 cursor-pointer group" 
            onClick={() => {setCurrentView('HOME'); window.scrollTo(0,0);}}
          >
            <div className="h-10 flex items-center transition-all duration-500 overflow-hidden relative">
              {config.headerLogoUrl ? (
                <img src={config.headerLogoUrl} className="h-full w-auto object-contain group-hover:scale-110 transition-transform" alt="Logo VIP" />
              ) : (
                <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 group-hover:border-orange-600 transition-colors">
                    <Radio className="text-orange-600 w-5 h-5 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">Hélio Júnior</span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {navItem('Início', 'HOME', currentView === 'HOME')}
            {!currentUser && (
              <>
                {navItem('Entrar', 'LOGIN', currentView === 'LOGIN')}
                <button
                    onClick={() => setCurrentView('REGISTER')}
                    className="ml-4 px-8 py-2.5 bg-orange-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-700 hover:shadow-xl shadow-orange-600/10 transition-all transform hover:-translate-y-0.5 active:scale-95"
                >
                    Anunciar Agora
                </button>
              </>
            )}
            {currentUser && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/5">
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter flex items-center justify-end gap-2">
                      {currentUser.name}
                      {currentUser.role === UserRole.ADMIN && <Shield size={10} className="text-orange-600"/>}
                    </p>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Painel VIP'}</p>
                </div>
                {currentUser.role === UserRole.ADVERTISER && navItem('Minha Conta', 'DASHBOARD', currentView === 'DASHBOARD')}
                {currentUser.role === UserRole.ADMIN && navItem('Gestão', 'ADMIN', currentView === 'ADMIN')}
                <button onClick={onLogout} className="p-2.5 bg-white/5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"><LogOut size={16} /></button>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white p-2.5 bg-white/5 rounded-xl">{isMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
      </div>
      
      {isMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-brand-dark/95 backdrop-blur-3xl border-b border-white/5 p-6 flex flex-col gap-2 animate-in slide-in-from-top duration-300">
            <button onClick={() => {setCurrentView('HOME'); setIsMenuOpen(false);}} className="p-4 text-left text-[9px] font-black uppercase text-white border-b border-white/5 tracking-widest hover:bg-white/5 rounded-xl transition-all">Página Inicial</button>
            {!currentUser ? (
                <>
                    <button onClick={() => {setCurrentView('LOGIN'); setIsMenuOpen(false);}} className="p-4 text-left text-[9px] font-black uppercase text-white border-b border-white/5 tracking-widest hover:bg-white/5 rounded-xl transition-all">Entrar</button>
                    <button onClick={() => {setCurrentView('REGISTER'); setIsMenuOpen(false);}} className="mt-2 p-5 text-center bg-orange-600 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest shadow-xl">Cadastrar Grátis</button>
                </>
            ) : (
                <>
                    <button onClick={() => {setCurrentView(currentUser.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD'); setIsMenuOpen(false);}} className="p-4 text-left text-[9px] font-black uppercase text-white border-b border-white/5 tracking-widest">Painel de Controle</button>
                    <button onClick={() => {onLogout(); setIsMenuOpen(false);}} className="p-4 text-left text-[9px] font-black uppercase text-red-500 tracking-widest">Sair da Conta</button>
                </>
            )}
        </div>
      )}
    </nav>
  );
};
