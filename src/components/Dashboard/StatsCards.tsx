import React, { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../config/supabase';

interface User {
  id: string;
}

interface StatsCardsProps {
  user: User;
}

const StatsCards: React.FC<StatsCardsProps> = ({ user }) => {
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      calcularSaldoTotal();
    }
  }, [user?.id]);

  const calcularSaldoTotal = async () => {
    try {
      // Calcular saldo desde transacciones principales
      const { data: transaccionesPrincipales, error: errorPrincipal } = await supabase
        .from('transacciones')
        .select('monto, tipo')
        .eq('inversor_id', user.id)
        .eq('usuario_tipo', 'inversor');

      if (errorPrincipal) throw errorPrincipal;

      let saldoPrincipal = 0;
      transaccionesPrincipales?.forEach(t => {
        switch (t.tipo.toLowerCase()) {
          case 'deposito':
            saldoPrincipal += Number(t.monto);
            break;
          case 'retiro':
            saldoPrincipal -= Number(t.monto);
            break;
          case 'ganancia':
            saldoPrincipal += Number(t.monto);
            break;
        }
      });

      // Calcular saldo desde módulos
      const { data: transaccionesModulos, error: errorModulos } = await supabase
        .from('modulo_transacciones')
        .select('monto, tipo')
        .eq('inversor_id', user.id)
        .eq('usuario_tipo', 'inversor');

      if (errorModulos) throw errorModulos;

      let saldoModulos = 0;
      transaccionesModulos?.forEach(t => {
        switch (t.tipo.toLowerCase()) {
          case 'deposito':
            saldoModulos += Number(t.monto);
            break;
          case 'retiro':
            saldoModulos -= Number(t.monto);
            break;
          case 'ganancia':
            saldoModulos += Number(t.monto);
            break;
        }
      });

      setSaldoTotal(saldoPrincipal + saldoModulos);
    } catch (error) {
      console.error('Error calculando saldo total:', error);
      setSaldoTotal(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center mb-8">
        <div className="w-full max-w-md">
          <div className="bg-cyan-400/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/50">
            <div className="flex items-center justify-center h-24">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-8">
      <div className="w-full max-w-md">
        <div className="bg-cyan-400/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/50 hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-sm text-white/90 font-medium">Saldo Actual</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-2xl font-bold text-white">{formatCurrency(saldoTotal)}</p>
            <p className="text-xs text-white/70">Saldo disponible para retiro</p>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;