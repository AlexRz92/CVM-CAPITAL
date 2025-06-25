import React from 'react';
import { LogOut, User, Users } from 'lucide-react';
import { usePartner } from '../../contexts/PartnerContext';
import { useNavigate } from 'react-router-dom';

const PartnerHeader: React.FC = () => {
  const { partner, logout } = usePartner();
  const navigate = useNavigate();
  
  const currentDate = new Date().toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <img 
              src="/logo2.png" 
              alt="Logo" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <p className="text-sm text-cyan-100 italic">Panel de Partner - CVM Capital</p>
            </div>
          </div>

          {/* Información del Partner */}
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-cyan-100">{currentDate}</p>
              {partner && (
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">{partner.nombre}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    partner.tipo === 'operador_partner' 
                      ? 'bg-yellow-400 text-yellow-900' 
                      : 'bg-green-400 text-green-900'
                  }`}>
                    {partner.tipo === 'operador_partner' ? 'PARTNER + OPERADOR' : 'PARTNER'}
                  </span>
                </div>
              )}
            </div>
            
            {partner && (
              <button
                onClick={handleLogout}
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

export default PartnerHeader;