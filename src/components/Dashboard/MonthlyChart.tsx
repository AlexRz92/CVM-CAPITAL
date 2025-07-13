import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MonthlyData {
  mes: string;
  ganancia: number;
  mesOrden: number; // Para ordenar correctamente
}

const MonthlyChart: React.FC = () => {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMonthlyData();
    }
  }, [user?.id]);

  const fetchMonthlyData = async () => {
    try {
      console.log('Fetching monthly data for user:', user?.id);
      
      // Query transacciones table directly to get monthly earnings
      const { data, error } = await supabase
        .from('transacciones')
        .select('monto, fecha, descripcion')
        .eq('inversor_id', user?.id)
        .eq('tipo', 'ganancia')
        .order('fecha', { ascending: false }); // Más recientes primero

      if (error) {
        console.error('Error fetching monthly data:', error);
        throw error;
      }

      console.log('Transacciones de ganancias recibidas:', data);

      if (data && Array.isArray(data) && data.length > 0) {
        // Group earnings by month and year
        const monthlyMap = new Map<string, { ganancia: number; fecha: Date }>();
        
        data.forEach((transaccion: any) => {
          const fecha = new Date(transaccion.fecha);
          const monthKey = fecha.toLocaleDateString('es-ES', { 
            month: 'short', 
            year: 'numeric' 
          });
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { ganancia: 0, fecha });
          }
          
          const current = monthlyMap.get(monthKey)!;
          current.ganancia += Number(transaccion.monto);
        });
        
        // Convert map to array, sort by date (most recent first), and take only 4 most recent
        const sortedData = Array.from(monthlyMap.entries())
          .map(([mes, data]) => ({
            mes,
            ganancia: Number(data.ganancia.toFixed(2)),
            mesOrden: data.fecha.getTime()
          }))
          .sort((a, b) => b.mesOrden - a.mesOrden) // Más recientes primero
          .slice(0, 4) // Solo los 4 más recientes
          .reverse(); // Invertir para mostrar cronológicamente en el gráfico
        
        console.log('Datos mensuales procesados:', sortedData);
        setChartData(sortedData);
      } else {
        // Datos por defecto si no hay ganancias procesadas
        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleDateString('es-ES', { 
          month: 'short', 
          year: 'numeric' 
        });
        setChartData([{ 
          mes: currentMonth, 
          ganancia: 0, 
          mesOrden: currentDate.getTime() 
        }]);
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      // Datos por defecto en caso de error
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleDateString('es-ES', { 
        month: 'short', 
        year: 'numeric' 
      });
      setChartData([{ 
        mes: currentMonth, 
        ganancia: 0, 
        mesOrden: currentDate.getTime() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  if (loading) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          Ganancias Mensuales
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const hasRealGanancias = chartData.some(item => item.ganancia > 0);
  const totalGanancias = chartData.reduce((sum, item) => sum + item.ganancia, 0);

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <h3 className="text-xl font-bold text-white mb-6 text-center">
        Ganancias Mensuales
      </h3>
      
      <div className="h-80" data-chart-id="monthly-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff40" />
            <XAxis 
              dataKey="mes" 
              stroke="#ffffff90"
              fontSize={12}
            />
            <YAxis 
              stroke="#ffffff90"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e40af', 
                border: '1px solid #60a5fa',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              formatter={(value) => [formatCurrency(Number(value)), 'Ganancia']}
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
      
      {hasRealGanancias ? (
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/20">
          <p className="text-white/80 text-sm text-center">
            <strong>Total Ganancias:</strong> {formatCurrency(totalGanancias)} | 
            <strong> Meses con ganancias:</strong> {chartData.filter(item => item.ganancia > 0).length}
            {chartData.length === 4 && <span> (últimos 4 meses)</span>}
          </p>
        </div>
      ) : (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-200 text-sm text-center">
            <strong>Sin ganancias procesadas:</strong> Las ganancias aparecerán aquí cuando sean procesadas por el administrador
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlyChart;