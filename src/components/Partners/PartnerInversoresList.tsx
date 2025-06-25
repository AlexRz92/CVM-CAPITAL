import React from 'react';
import { User, DollarSign, TrendingUp } from 'lucide-react';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  total: number;
  ganancia_semanal: number;
}

interface PartnerInversoresListProps {
  inversores: Inversor[];
}

const PartnerInversoresList: React.FC<PartnerInversoresListProps> = ({ inversores }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalInversion = inversores.reduce((sum, inv) => sum + inv.total, 0);
  const totalGanancias = inversores.reduce((sum, inv) => sum + inv.ganancia_semanal, 0);

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <User className="w-6 h-6 mr-3" />
          Mis Inversores ({inversores.length})
        </h3>
        
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-right">
            <p className="text-white/70">Total Invertido</p>
            <p className="text-white font-bold">{formatCurrency(totalInversion)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70">Ganancias Semanales</p>
            <p className="text-green-300 font-bold">{formatCurrency(totalGanancias)}</p>
          </div>
        </div>
      </div>
      
      {inversores.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70">No tienes inversores asignados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inversores.map((inversor) => (
            <div key={inversor.id} className="bg-white/10 rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">
                      {inversor.nombre} {inversor.apellido}
                    </h4>
                    <p className="text-white/70 text-sm">{inversor.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <DollarSign className="w-4 h-4 text-blue-300" />
                      <span className="text-white font-semibold">
                        {formatCurrency(inversor.total)}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs">Total Invertido</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-300" />
                      <span className="text-green-300 font-semibold">
                        {formatCurrency(inversor.ganancia_semanal)}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs">Ganancia Semanal</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnerInversoresList;