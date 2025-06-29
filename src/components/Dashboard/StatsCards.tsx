import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, PiggyBank } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface User {
  id: string;
  capital_inicial: number;
  ganancia_semanal: number;
  total: number;
}

interface StatsCardsProps {
  user: User;
}

const StatsCards: React.FC<StatsCardsProps> = ({ user }) => {
  const [inversionTotal, setInversionTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchInversionTotal();
    }
  }, [user?.id]);

  const fetchInversionTotal = async () => {
    try {
      // Usar la nueva función optimizada
      const { data, error } = await supabase.rpc('calcular_total_real_inversor', {
        p_inversor_id: user.id
      });

      if (error) throw error;
      setInversionTotal(data || 0);
    } catch (error) {
      console.error('Error fetching total investment:', error);
      // Fallback al total actual del usuario
      setInversionTotal(user.total);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const cards = [
    {
      title: 'Mi Inversión',
      value: loading ? 'Cargando...' : formatCurrency(inversionTotal),
      subtitle: `Saldo actual: ${formatCurrency(user.total)}`,
      icon: PiggyBank,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-400/20',
      borderColor: 'border-cyan-200/50'
    },
    {
      title: 'Ganancia Semanal',
      value: formatCurrency(user.ganancia_semanal),
      subtitle: 'Última ganancia procesada',
      icon: TrendingUp,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-400/20',
      borderColor: 'border-cyan-200/50'
    },
    {
      title: 'Saldo Actual',
      value: formatCurrency(user.total),
      subtitle: 'Saldo disponible',
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
  );
};

export default StatsCards;