import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../Dashboard/NotificationBell';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const currentDate = new Date().toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <header className="bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src="/logo2.png" 
              alt="Logo" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <p className="text-sm text-cyan-100 italic">Inversión Inteligente, siempre con ustedes</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-cyan-100">{currentDate}</p>
              {user && (
                <p className="text-sm font-medium">
                  <User className="inline w-4 h-4 mr-1" />
                  {user.nombre} {user.apellido}
                </p>
              )}
            </div>
            
            <NotificationBell userId={user?.id} userType="inversor" />
            
            {user && (
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors duration-200 font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Salir</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;