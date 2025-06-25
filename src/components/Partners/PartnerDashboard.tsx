import React, { useEffect, useState } from 'react';
import { usePartner } from '../../contexts/PartnerContext';
import { supabase } from '../../config/supabase';
import PartnerHeader from './PartnerHeader';
import PartnerStatsCards from './PartnerStatsCards';
import PartnerInversoresList from './PartnerInversoresList';
import PartnerGananciasChart from './PartnerGananciasChart';
import PartnerSolicitudButtons from './PartnerSolicitudButtons';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  total: number;
  ganancia_semanal: number;
}

const PartnerDashboard: React.FC = () => {
  const { partner } = usePartner();
  const [inversores, setInversores] = useState<Inversor[]>([]);
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
        .single();

      if (gananciasError && gananciasError.code !== 'PGRST116') {
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

  if (!partner) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800">
      <PartnerHeader />
      
      <main className="container mx-auto px-6 py-8">
        {/* Título del Dashboard */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2 tracking-wide uppercase">
            Dashboard de Partner
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
            <PartnerSolicitudButtons />

            {/* Tarjetas de Estadísticas */}
            <PartnerStatsCards partner={partner} ganancias={ganancias} />

            {/* Gráfico de Ganancias */}
            <PartnerGananciasChart partnerId={partner.id} />

            {/* Lista de Inversores */}
            <PartnerInversoresList inversores={inversores} />
          </div>
        )}
      </main>
    </div>
  );
};

export default PartnerDashboard;