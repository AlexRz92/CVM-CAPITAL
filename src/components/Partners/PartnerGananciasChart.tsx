import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../config/supabase';

interface GananciaData {
  semana: string;
  ganancia_comision: number;
  ganancia_operador: number;
  ganancia_total: number;
}

interface PartnerGananciasChartProps {
  partnerId: string;
}

const PartnerGananciasChart: React.FC<PartnerGananciasChartProps> = ({ partnerId }) => {
  const [chartData, setChartData] = useState<GananciaData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGananciasData();
  }, [partnerId]);

  const fetchGananciasData = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_ganancias')
        .select('*')
        .eq('partner_id', partnerId)
        .order('semana_numero', { ascending: true })
        .limit(8);

      if (error) throw error;

      const formattedData = data?.map(item => ({
        semana: `Sem ${item.semana_numero}`,
        ganancia_comision: item.ganancia_comision,
        ganancia_operador: item.ganancia_operador,
        ganancia_total: item.ganancia_total
      })) || [];

      setChartData(formattedData);
    } catch (error) {
      console.error('Error fetching partner earnings data:', error);
      // Datos de ejemplo si no hay datos
      setChartData([
        { semana: 'Sem 1', ganancia_comision: 0, ganancia_operador: 0, ganancia_total: 0 },
        { semana: 'Sem 2', ganancia_comision: 0, ganancia_operador: 0, ganancia_total: 0 },
        { semana: 'Sem 3', ganancia_comision: 0, ganancia_operador: 0, ganancia_total: 0 },
        { semana: 'Sem 4', ganancia_comision: 0, ganancia_operador: 0, ganancia_total: 0 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          Ganancias por Semana
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <h3 className="text-xl font-bold text-white mb-6 text-center">
        Mis Ganancias por Semana
      </h3>
      
      <div className="h-80">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/70">No hay datos de ganancias</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff40" />
              <XAxis 
                dataKey="semana" 
                stroke="#ffffff90"
                fontSize={12}
              />
              <YAxis 
                stroke="#ffffff90"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e40af', 
                  border: '1px solid #60a5fa',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                formatter={(value, name) => {
                  const labels = {
                    ganancia_comision: 'Comisión Partner',
                    ganancia_operador: 'Ganancia Operador',
                    ganancia_total: 'Total'
                  };
                  return [`$${Number(value).toLocaleString()}`, labels[name as keyof typeof labels] || name];
                }}
              />
              <Bar 
                dataKey="ganancia_comision" 
                fill="#22d3ee"
                name="ganancia_comision"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="ganancia_operador" 
                fill="#fbbf24"
                name="ganancia_operador"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PartnerGananciasChart;