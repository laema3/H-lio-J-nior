
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
      className={`px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all duration-300 ${
        active 
          ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30 scale-105' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          
          <div 
            className="flex items-center gap-6 cursor-pointer group" 
            onClick={() => {setCurrentView('HOME'); window.scrollTo(0,0);}}
          >
            <div className="h-14 min-w-[140px] flex items-center justify-center transition-all duration-500 overflow-hidden relative">
              {config.headerLogoUrl ? (
                <img src={config.headerLogoUrl} className="h-full w-auto object-contain group-hover:scale-110 transition-transform" alt="Logo VIP" />
              ) : (
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 group-hover:border-brand-primary transition-colors">
                    <Radio className="text-brand-primary w-6 h-6 animate-pulse" />
                    <span className="text-[12px] font-black text-white uppercase tracking-tighter line-clamp-1">{config.heroLabel}</span>
                </div>
              )}
            </div>
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase border shadow-lg ${isOnline ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
               {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {navItem('Início', 'HOME', currentView === 'HOME')}
            {!currentUser && (
              <>
                {navItem('Painel VIP', 'LOGIN', currentView === 'LOGIN')}
                <button
                    onClick={() => setCurrentView('REGISTER')}
                    className="ml-4 px-8 py-3 bg-gradient-to-r from-brand-accent to-orange-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-orange-500/40 transition-all transform hover:-translate-y-1 active:scale-95"
                >
                    Anunciar Agora
                </button>
              </>
            )}
            {currentUser && (
              <div className="flex items-center gap-6 ml-6 pl-6 border-l border-white/10">
                <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-white uppercase tracking-tighter flex items-center justify-end gap-2">
                      {currentUser.name}
                      {currentUser.role === UserRole.ADMIN && <Shield size={12} className="text-brand-accent"/>}
                    </p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Membro VIP'}</p>
                </div>
                {currentUser.role === UserRole.ADVERTISER && navItem('Dashboard', 'DASHBOARD', currentView === 'DASHBOARD')}
                {currentUser.role === UserRole.ADMIN && navItem('Admin', 'ADMIN', currentView === 'ADMIN')}
                <button onClick={onLogout} className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-90"><LogOut size={20} /></button>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-300 hover:text-white p-3 bg-white/5 rounded-2xl">{isMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-24 left-0 right-0 bg-brand-dark/95 backdrop-blur-3xl border-b border-white/10 p-6 flex flex-col gap-4 animate-in slide-in-from-top">
            <button onClick={() => {setCurrentView('HOME'); setIsMenuOpen(false);}} className="p-5 text-left text-[11px] font-black uppercase text-white border-b border-white/5 tracking-widest">Início</button>
            {!currentUser ? (
                <>
                    <button onClick={() => {setCurrentView('LOGIN'); setIsMenuOpen(false);}} className="p-5 text-left text-[11px] font-black uppercase text-white border-b border-white/5 tracking-widest">Entrar</button>
                    <button onClick={() => {setCurrentView('REGISTER'); setIsMenuOpen(false);}} className="p-5 text-center bg-brand-primary rounded-2xl text-[11px] font-black uppercase text-white tracking-widest">Quero Anunciar</button>
                </>
            ) : (
                <>
                    <button onClick={() => {setCurrentView(currentUser.role === UserRole.ADMIN ? 'ADMIN' : 'DASHBOARD'); setIsMenuOpen(false);}} className="p-5 text-left text-[11px] font-black uppercase text-white border-b border-white/5 tracking-widest">Meu Painel</button>
                    <button onClick={() => {onLogout(); setIsMenuOpen(false);}} className="p-5 text-left text-[11px] font-black uppercase text-red-400 tracking-widest">Sair</button>
                </>
            )}
        </div>
      )}
    </nav>
  );
};
