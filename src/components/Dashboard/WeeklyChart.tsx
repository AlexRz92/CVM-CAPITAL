import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../config/supabase';

interface WeeklyData {
  week: string;
  ganancia: number;
}

interface WeeklyChartProps {
  data?: WeeklyData[];
}

const WeeklyChart: React.FC<WeeklyChartProps> = () => {
  const [chartData, setChartData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      // Llamar a la función de la base de datos para obtener datos del gráfico
      const { data, error } = await supabase.rpc('obtener_datos_grafico_semanal');

      if (error) throw error;

      if (data && Array.isArray(data)) {
        setChartData(data);
      } else {
        // Datos por defecto si no hay ganancias procesadas
        setChartData([
          { week: 'Sem 1', ganancia: 0 },
          { week: 'Sem 2', ganancia: 0 },
          { week: 'Sem 3', ganancia: 0 },
          { week: 'Sem 4', ganancia: 0 }
        ]);
      }
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      // Datos por defecto en caso de error
      setChartData([
        { week: 'Sem 1', ganancia: 0 },
        { week: 'Sem 2', ganancia: 0 },
        { week: 'Sem 3', ganancia: 0 },
        { week: 'Sem 4', ganancia: 0 }
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
        Ganancias por Semana
      </h3>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff40" />
            <XAxis 
              dataKey="week" 
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
              formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ganancia']}
            />
            <Bar 
              dataKey="ganancia" 
              fill="url(#colorGradient)"
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyChart;