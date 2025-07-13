import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Layout/Header';
import StatsCards from './StatsCards';
import MonthlyChart from './MonthlyChart';
import DonutChart from './DonutChart';
import TransactionsTable from './TransactionsTable';
import SolicitudButtons from './SolicitudButtons';
import ForexCalendar from './ForexCalendar';
import HelpChat from './HelpChat';
import PDFExporter from './PDFExporter';
import { supabase } from '../../config/supabase';

interface Transaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('inversor_id', user?.id)
        .eq('usuario_tipo', 'inversor')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Título del Reporte */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2 tracking-wide uppercase">
            REPORTE DE GANANCIAS
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
            <SolicitudButtons />

            {/* Botón de Exportar PDF */}
            <div className="flex justify-center">
              <PDFExporter 
                userId={user.id} 
                userName={`${user.nombre} ${user.apellido}`}
                userType="inversor"
              />
            </div>

            {/* Tarjetas de Estadísticas */}
            <StatsCards user={user} />

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <MonthlyChart />
              <DonutChart />
            </div>

            {/* Tabla de Transacciones */}
            <TransactionsTable transactions={transactions} />
          </div>
        )}
      </main>

      {/* Componentes flotantes */}
      <ForexCalendar />
      <HelpChat userId={user?.id} userType="inversor" />
    </div>
  );
};

export default Dashboard;