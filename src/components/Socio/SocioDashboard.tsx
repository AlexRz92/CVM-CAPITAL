import React, { useEffect, useState } from 'react';
import { usePartner } from '../../contexts/PartnerContext';
import { supabase } from '../../config/supabase';
import SocioHeader from './SocioHeader';
import SocioStatsCards from './SocioStatsCards';
import SocioGananciasChart from './SocioGananciasChart';
import SocioDonutChart from './SocioDonutChart';
import SocioSolicitudButtons from './SocioSolicitudButtons';
import SocioTransactionsTable from './SocioTransactionsTable';
import PDFExporter from '../Dashboard/PDFExporter';

interface Transaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
}

interface PartnerData {
  id: string;
  username: string;
  nombre: string;
  porcentaje_comision: number;
  porcentaje_especial: number;
  inversion_inicial: number;
  saldo_actual: number;
}

const SocioDashboard: React.FC = () => {
  const { partner } = usePartner();
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ganancias, setGanancias] = useState({
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
      // Obtener todas las transacciones del partner para calcular el saldo actual
      const { data: transactions, error: transError } = await supabase
        .from('transacciones')
        .select('monto, tipo')
        .eq('partner_id', partner?.id)
        .eq('usuario_tipo', 'partner');

      if (transError) throw transError;

      // Calcular saldo actual basado en transacciones
      let saldoActual = 0;
      
      transactions?.forEach(transaction => {
        switch (transaction.tipo.toLowerCase()) {
          case 'deposito':
            saldoActual += Number(transaction.monto);
            break;
          case 'retiro':
            saldoActual -= Number(transaction.monto);
            break;
          case 'ganancia':
            saldoActual += Number(transaction.monto);
            break;
        }
      });

      // Establecer los datos del partner con el saldo calculado
      setPartnerData({
        ...partner,
        saldo_actual: saldoActual
      });

      // Obtener ganancias del partner de la semana actual
      const { data: gananciasData, error: gananciasError } = await supabase
        .from('partner_ganancias')
        .select('*')
        .eq('partner_id', partner?.id)
        .order('fecha_calculo', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gananciasError) {
        throw gananciasError;
      }

      setGanancias({
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
      // Usar la tabla unificada de transacciones
      const { data, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('partner_id', partner?.id)
        .eq('usuario_tipo', 'partner')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  if (!partner || !partnerData) return null;

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

            {/* Botón de Exportar PDF */}
            <div className="flex justify-center">
              <PDFExporter 
                userId={partner.id} 
                userName={partner.nombre}
                userType="partner"
              />
            </div>

            {/* Tarjetas de Estadísticas */}
            <SocioStatsCards partner={partnerData} ganancias={ganancias} />

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SocioGananciasChart partnerId={partner.id} />
              <SocioDonutChart partnerId={partner.id} />
            </div>

            {/* Tabla de Transacciones */}
            <SocioTransactionsTable transactions={transactions} />
          </div>
        )}
      </main>
    </div>
  );
};

export default SocioDashboard;