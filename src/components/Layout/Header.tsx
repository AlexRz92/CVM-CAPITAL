import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const currentDate = new Date().toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <header className="bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800 text-white shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <img 
              src="/logo2.png" 
              alt="Logo" 
              className="h-8 sm:h-10 lg:h-12 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-xs sm:text-sm text-cyan-100 italic">Inversión Inteligente, siempre con ustedes</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
            <div className="text-right">
              <p className="text-xs sm:text-sm text-cyan-100">{currentDate}</p>
              {user && (
                <p className="text-xs sm:text-sm font-medium flex items-center">
                  <User className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">{user.nombre} {user.apellido}</span>
                  <span className="sm:hidden">{user.nombre}</span>
                </p>
              )}
            </div>
            
            {user && (
              <button
                onClick={logout}
                className="flex items-center space-x-1 sm:space-x-2 bg-white text-blue-600 hover:bg-gray-100 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors duration-200 font-semibold text-xs sm:text-sm"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Salir</span>
                <span className="sm:hidden">Salir</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
