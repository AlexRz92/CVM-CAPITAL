import React from 'react';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface Partner {
  saldo_actual: number;
}

interface SocioStatsCardsProps {
  partner: Partner;
  ganancias: { ganancia_total: number };
}

const SocioStatsCards: React.FC<SocioStatsCardsProps> = ({ partner }) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="w-full max-w-md">
        <div className="bg-purple-400/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-sm text-white/90 font-medium">Saldo Actual</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-2xl font-bold text-white">{formatCurrency(partner.saldo_actual)}</p>
            <p className="text-xs text-white/70">Saldo disponible para retiro</p>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-600"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocioStatsCards;