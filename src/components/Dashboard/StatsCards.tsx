import React from 'react';
import { TrendingUp, DollarSign, PiggyBank } from 'lucide-react';

interface User {
  capital_inicial: number;
  ganancia_semanal: number;
  total: number;
}

interface StatsCardsProps {
  user: User;
}

const StatsCards: React.FC<StatsCardsProps> = ({ user }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const cards = [
    {
      title: 'Capital Inicial',
      value: formatCurrency(user.capital_inicial),
      icon: PiggyBank,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-400/20',
      borderColor: 'border-cyan-200/50'
    },
    {
      title: 'Ganancia Semanal',
      value: formatCurrency(user.ganancia_semanal),
      icon: TrendingUp,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-400/20',
      borderColor: 'border-cyan-200/50'
    },
    {
      title: 'Total',
      value: formatCurrency(user.total),
      icon: DollarSign,
      color: 'from-cyan-400 to-cyan-600',
      bgColor: 'bg-cyan-400/20',
      borderColor: 'border-cyan-200/50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
  );
};

export default StatsCards;