import React from 'react';
import { DollarSign } from 'lucide-react';

interface Partner {
  porcentaje_comision: number;
  porcentaje_especial: number;
  inversion_inicial: number;
  saldo_actual: number;
}

interface Ganancias {
  ganancia_total: number;
}

interface SocioStatsCardsProps {
  partner: Partner;
  ganancias: Ganancias;
}

const SocioStatsCards: React.FC<SocioStatsCardsProps> = ({ partner, ganancias }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const cards = [
    {
      title: 'Saldo Actual',
      value: formatCurrency(partner.saldo_actual),
      subtitle: 'Saldo disponible para retiro',
      icon: DollarSign,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-400/20',
      borderColor: 'border-cyan-200/50'
    }
  ];

  return (
    <div className="flex justify-center mb-8">
      <div className="w-full max-w-md">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} backdrop-blur-lg rounded-2xl p-6 shadow-2xl border ${card.borderColor} hover:scale-105 transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm text-white/90 font-medium">{card.title}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-2xl font-bold text-white">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-white/70">{card.subtitle}</p>
              )}
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r ${card.color}`}
                  style={{ width: '75%' }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocioStatsCards;