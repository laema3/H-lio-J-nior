import React, { useState } from 'react';
import { ViewState, User, UserRole } from '../types';
import { Menu, X, Radio, UserCircle, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  setCurrentView: (view: ViewState) => void;
  currentView: ViewState;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, setCurrentView, currentView, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItem = (label: string, target: ViewState, active: boolean) => (
    <button
      onClick={() => {
        setCurrentView(target);
        setIsMenuOpen(false);
      }}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        active 
          ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/40' 
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setCurrentView('HOME')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-secondary to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300">
              <Radio className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Hélio Júnior
              </h1>
              <span className="text-xs text-brand-secondary font-medium tracking-widest uppercase">Radialista</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {navItem('Início', 'HOME', currentView === 'HOME')}
            
            {!currentUser && (
              <>
                {navItem('Login', 'LOGIN', currentView === 'LOGIN')}
                <button
                    onClick={() => setCurrentView('REGISTER')}
                    className="ml-2 px-6 py-2 bg-gradient-to-r from-brand-accent to-orange-600 text-white rounded-full font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all transform hover:-translate-y-0.5"
                >
                    Anunciar Agora
                </button>
              </>
            )}

            {currentUser && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                <div className="text-right">
                    <p className="text-sm font-bold text-white">{currentUser.name}</p>
                    <p className="text-xs text-gray-400">{currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Anunciante'}</p>
                </div>
                
                {currentUser.role === UserRole.ADVERTISER && navItem('Meu Painel', 'DASHBOARD', currentView === 'DASHBOARD')}
                {currentUser.role === UserRole.ADMIN && navItem('Admin', 'ADMIN', currentView === 'ADMIN')}

                <button 
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#0f172a] border-b border-white/10 px-4 pt-2 pb-4 space-y-2">
           <button onClick={() => { setCurrentView('HOME'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-lg">Início</button>
           
           {!currentUser ? (
             <>
               <button onClick={() => { setCurrentView('LOGIN'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-lg">Login</button>
               <button onClick={() => { setCurrentView('REGISTER'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-brand-accent font-bold hover:bg-white/10 rounded-lg">Quero Anunciar</button>
             </>
           ) : (
             <>
                {currentUser.role === UserRole.ADVERTISER && (
                     <button onClick={() => { setCurrentView('DASHBOARD'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-lg">Meu Painel</button>
                )}
                {currentUser.role === UserRole.ADMIN && (
                     <button onClick={() => { setCurrentView('ADMIN'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-lg">Administração</button>
                )}
               <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-red-400 hover:bg-white/10 rounded-lg">Sair</button>
             </>
           )}
        </div>
      )}
    </nav>
  );
};