import React from 'react';
import { TrendingUp, DollarSign, Users, PiggyBank } from 'lucide-react';

interface Partner {
  tipo: 'partner' | 'operador_partner';
  porcentaje_comision: number;
  porcentaje_especial: number;
  inversion_inicial: number;
}

interface Ganancias {
  total_inversores: number;
  monto_total: number;
  ganancia_comision: number;
  ganancia_operador: number;
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
      currency: 'USD'
    }).format(amount);
  };

  const cards = [
    {
      title: 'Mi Inversión',
      value: formatCurrency(partner.inversion_inicial),
      icon: PiggyBank,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-400/20',
      borderColor: 'border-cyan-200/50'
    },
    {
      title: 'Mis Inversores',
      value: ganancias.total_inversores.toString(),
      icon: Users,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-400/20',
      borderColor: 'border-cyan-200/50'
    },
    {
      title: 'Total Inversores',
      value: formatCurrency(ganancias.monto_total),
      icon: DollarSign,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-400/20',
      borderColor: 'border-cyan-200/50'
    },
    {
      title: 'Mis Ganancias',
      value: formatCurrency(ganancias.ganancia_total),
      icon: TrendingUp,
      color: 'from-cyan-400 to-cyan-600',
      bgColor: 'bg-cyan-400/20',
      borderColor: 'border-cyan-200/50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className={`h-2 rounded-full bg-gradient-to-r ${card.color}`}
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>
        </div>
      ))}

      {/* Tarjeta adicional para desglose de ganancias si es operador+partner */}
      {partner.tipo === 'operador_partner' && (
        <div className="md:col-span-2 lg:col-span-4 bg-yellow-400/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/50">
          <h3 className="text-lg font-bold text-white mb-4">Desglose de Mis Ganancias</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white/80 text-sm font-medium mb-2">Ganancia como Socio</h4>
              <p className="text-xl font-bold text-green-300">{formatCurrency(ganancias.ganancia_comision)}</p>
              <p className="text-white/60 text-xs">Comisión: {partner.porcentaje_comision}%</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white/80 text-sm font-medium mb-2">Ganancia como Operador</h4>
              <p className="text-xl font-bold text-yellow-300">{formatCurrency(ganancias.ganancia_operador)}</p>
              <p className="text-white/60 text-xs">Operador: {partner.porcentaje_especial}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocioStatsCards;