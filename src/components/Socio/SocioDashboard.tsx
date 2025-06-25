import React, { useEffect, useState } from 'react';
import { usePartner } from '../../contexts/PartnerContext';
import { supabase } from '../../config/supabase';
import SocioHeader from './SocioHeader';
import SocioStatsCards from './SocioStatsCards';
import SocioInversoresList from './SocioInversoresList';
import SocioGananciasChart from './SocioGananciasChart';
import SocioSolicitudButtons from './SocioSolicitudButtons';
import SocioTransactionsTable from './SocioTransactionsTable';
import ForexCalendar from '../Dashboard/ForexCalendar';
import HelpChat from '../Dashboard/HelpChat';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  total: number;
  ganancia_semanal: number;
}

interface Transaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
}

const SocioDashboard: React.FC = () => {
  const { partner } = usePartner();
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ganancias, setGanancias] = useState({
    total_inversores: 0,
    monto_total: 0,
    ganancia_comision: 0,
    ganancia_operador: 0,
    ganancia_total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (partner) {
      fetchPartnerData();
      fetchTransactions();
    }
  }, [partner]);

  const fetchPartnerData = async () => {
    try {
      // Obtener inversores del partner
      const { data: inversoresData, error: inversoresError } = await supabase
        .from('partner_inversores')
        .select(`
          inversor_id,
          inversores (
            id, nombre, apellido, email, total, ganancia_semanal
          )
        `)
        .eq('partner_id', partner?.id);

      if (inversoresError) throw inversoresError;

      const inversoresList = inversoresData?.map(item => item.inversores).filter(Boolean) || [];
      setInversores(inversoresList);

      // Calcular estadísticas
      const totalInversores = inversoresList.length;
      const montoTotal = inversoresList.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Obtener ganancias del partner de la semana actual
      const { data: gananciasData, error: gananciasError } = await supabase
        .from('partner_ganancias')
        .select('*')
        .eq('partner_id', partner?.id)
        .order('semana_numero', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gananciasError) {
        throw gananciasError;
      }

      setGanancias({
        total_inversores: totalInversores,
        monto_total: montoTotal,
        ganancia_comision: gananciasData?.ganancia_comision || 0,
        ganancia_operador: gananciasData?.ganancia_operador || 0,
        ganancia_total: gananciasData?.ganancia_total || 0
      });

    } catch (error) {
      console.error('Error fetching partner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_transacciones')
        .select('*')
        .eq('partner_id', partner?.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  if (!partner) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800">
      <SocioHeader />
      
      <main className="container mx-auto px-6 py-8">
        {/* Título del Dashboard */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2 tracking-wide uppercase">
            REPORTE DE GANANCIAS - SOCIO
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-200 to-white mx-auto rounded-full"></div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Botones de Solicitud */}
            <SocioSolicitudButtons />

            {/* Tarjetas de Estadísticas */}
            <SocioStatsCards partner={partner} ganancias={ganancias} />

            {/* Gráfico de Ganancias */}
            <SocioGananciasChart partnerId={partner.id} />

            {/* Lista de Inversores */}
            <SocioInversoresList inversores={inversores} />

            {/* Tabla de Transacciones */}
            <SocioTransactionsTable transactions={transactions} />
          </div>
        )}
      </main>

      {/* Componentes flotantes */}
      <ForexCalendar />
      <HelpChat />
    </div>
  );
};

export default SocioDashboard;