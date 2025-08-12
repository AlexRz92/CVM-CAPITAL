import React from 'react';
import { LogOut, Calculator, User } from 'lucide-react';
import { useOperador } from '../../contexts/OperadorContext';
import { useNavigate } from 'react-router-dom';

const OperadorHeader: React.FC = () => {
  const { operador, logout } = useOperador();
  const navigate = useNavigate();
  
  const currentDate = new Date().toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Panel de Operador</h1>
              <p className="text-sm text-cyan-100">CVM Capital - Sistema de Ganancias</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-cyan-100">{currentDate}</p>
              {operador && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{operador.nombre}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-400 text-orange-900">
                    OPERADOR
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors duration-200 font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default OperadorHeader;