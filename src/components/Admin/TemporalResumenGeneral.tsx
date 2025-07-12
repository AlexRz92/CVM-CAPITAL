import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { DollarSign, Users, TrendingUp } from 'lucide-react';

interface TemporalResumenGeneralProps {
  onStatsUpdate: () => void;
}

const TemporalResumenGeneral: React.FC<TemporalResumenGeneralProps> = ({ onStatsUpdate }) => {
  const [estadisticas, setEstadisticas] = useState({
    total_inversores_temporales: 0,
    total_inversion_temporal: 0,
    total_ganancias_temporales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const fetchEstadisticas = async () => {
    try {
      console.log('Fetching estadísticas temporales...');
      
      // Obtener inversores únicos con transacciones temporales
      const { data: inversoresData, error: inversoresError } = await supabase
        .from('transacciones_temporal')
        .select('inversor_id')
        .not('inversor_id', 'is', null);

      if (inversoresError) throw inversoresError;

      const inversoresUnicos = new Set(inversoresData?.map(t => t.inversor_id) || []);

      // Obtener todas las transacciones temporales
      const { data: transaccionesData, error: transaccionesError } = await supabase
        .from('transacciones_temporal')
        .select('monto, tipo');

      if (transaccionesError) throw transaccionesError;

      // Calcular totales
      let totalInversion = 0;
      let totalGanancias = 0;
      
      transaccionesData?.forEach(transaccion => {
        switch (transaccion.tipo.toLowerCase()) {
          case 'deposito':
            totalInversion += Number(transaccion.monto);
            break;
          case 'retiro':
            totalInversion -= Number(transaccion.monto);
            break;
          case 'ganancia':
            totalInversion += Number(transaccion.monto);
            totalGanancias += Number(transaccion.monto);
            break;
        }
      });

      const stats = {
        total_inversores_temporales: inversoresUnicos.size,
        total_inversion_temporal: Math.max(0, totalInversion),
        total_ganancias_temporales: totalGanancias
      };

      console.log('Estadísticas temporales calculadas:', stats);
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error fetching temporal statistics:', error);
      setEstadisticas({
        total_inversores_temporales: 0,
        total_inversion_temporal: 0,
        total_ganancias_temporales: 0
      });
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

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <DollarSign className="w-6 h-6 mr-3" />
          Resumen General del Sistema Temporal
        </h3>
        <button
          onClick={fetchEstadisticas}
          className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
        >
          Actualizar
        </button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <h4 className="text-white font-semibold mb-2">Total en Inversión Temporal</h4>
            <p className="text-2xl font-bold text-green-300">{formatCurrency(estadisticas.total_inversion_temporal)}</p>
            <p className="text-white/70 text-sm mt-2">
              Capital total en dashboard temporal
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h4 className="text-white font-semibold mb-2">Inversores Temporales</h4>
            <p className="text-2xl font-bold text-blue-300">{estadisticas.total_inversores_temporales}</p>
            <p className="text-white/70 text-sm mt-2">
              Usuarios con transacciones temporales
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <h4 className="text-white font-semibold mb-2">Ganancias Temporales</h4>
            <p className="text-2xl font-bold text-yellow-300">{formatCurrency(estadisticas.total_ganancias_temporales)}</p>
            <p className="text-white/70 text-sm mt-2">
              Total ganancias procesadas
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemporalResumenGeneral;