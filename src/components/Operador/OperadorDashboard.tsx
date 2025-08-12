import React from 'react';
import { OperadorHeader, OperadorGananciasManager } from './';

const OperadorDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800">
      <OperadorHeader />
      
      <div className="p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide uppercase">
            Panel de Operador
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-200 to-white mx-auto rounded-full"></div>
          <p className="text-white/80 mt-2">Sistema de Propuestas de Ganancias</p>
        </div>

        <OperadorGananciasManager />
      </div>
    </div>
  );
};

export default OperadorDashboard;