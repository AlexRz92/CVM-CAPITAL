import React, { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface User {
  id: string;
  nombre: string;
  apellido: string;
}

interface TemporalStatsCardsProps {
  user: User;
}

const TemporalStatsCards: React.FC<TemporalStatsCardsProps> = ({ user }) => {
  const [saldoTemporal, setSaldoTemporal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSaldoTemporal();
    }
  }, [user?.id]);

  const fetchSaldoTemporal = async () => {
    try {
      // Calcular saldo desde transacciones temporales
      const { data: transactions, error } = await supabase
        .from('transacciones_temporal')
        .select('monto, tipo')
        .eq('inversor_id', user?.id);

      if (error) throw error;

      let saldo = 0;
      transactions?.forEach(transaction => {
        switch (transaction.tipo.toLowerCase()) {
          case 'deposito':
            saldo += Number(transaction.monto);
            break;
          case 'retiro':
            saldo -= Number(transaction.monto);
            break;
          case 'ganancia':
            saldo += Number(transaction.monto);
            break;
        }
      });

      setSaldoTemporal(Math.max(0, saldo));
    } catch (error) {
      console.error('Error fetching temporal balance:', error);
      setSaldoTemporal(0);
    } finally {
      setLoading(false);
    }
  };

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
      title: 'Saldo Temporal',
      value: formatCurrency(saldoTemporal),
      subtitle: 'Saldo en dashboard temporal',
      icon: DollarSign,
      color: 'from-cyan-400 to-cyan-600',
      bgColor: 'bg-cyan-400/20',
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

export default TemporalStatsCards;