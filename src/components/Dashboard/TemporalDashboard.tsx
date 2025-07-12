import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Layout/Header';
import TemporalStatsCards from './TemporalStatsCards';
import TemporalMonthlyChart from './TemporalMonthlyChart';
import TemporalDonutChart from './TemporalDonutChart';
import TemporalTransactionsTable from './TemporalTransactionsTable';
import TemporalSolicitudButtons from './TemporalSolicitudButtons';
import ForexCalendar from './ForexCalendar';
import HelpChat from './HelpChat';
import PDFExporter from './PDFExporter';
import { supabase } from '../../config/supabase';

interface TemporalTransaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
}

interface TemporalDashboardProps {
  hideHeader?: boolean;
}

const TemporalDashboard: React.FC<TemporalDashboardProps> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TemporalTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transacciones_temporal')
        .select('*')
        .eq('inversor_id', user?.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching temporal transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600">
      {!hideHeader && <Header />}
      
      <main className="container mx-auto px-6 py-8">
        {!hideHeader && (
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-2 tracking-wide uppercase">
              DASHBOARD TEMPORAL
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-slate-200 to-white mx-auto rounded-full"></div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Botones de Solicitud - Solo Depósito */}
            <TemporalSolicitudButtons />

            {/* Botón de Exportar PDF */}
            <div className="flex justify-center">
              <PDFExporter 
                userId={user.id} 
                userName={`${user.nombre} ${user.apellido}`}
                userType="temporal"
              />
            </div>

            {/* Tarjetas de Estadísticas */}
            <TemporalStatsCards user={user} />

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TemporalMonthlyChart />
              <TemporalDonutChart />
            </div>

            {/* Tabla de Transacciones */}
            <TemporalTransactionsTable transactions={transactions} />
          </div>
        )}
      </main>

      {!hideHeader && (
        <>
          <ForexCalendar />
          <HelpChat userId={user?.id} userType="temporal" />
        </>
      )}
    </div>
  );
};

export default TemporalDashboard;