import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from '../../config/supabase';

interface DonutChartData {
  name: string;
  value: number;
  color: string;
}

interface SocioDonutChartProps {
  partnerId: string;
}

const SocioDonutChart: React.FC<SocioDonutChartProps> = ({ partnerId }) => {
  const [chartData, setChartData] = useState<DonutChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (partnerId) {
      fetchChartData();
    }
  }, [partnerId]);

  const fetchChartData = async () => {
    try {
      // Obtener todas las transacciones del partner desde la tabla unificada
      const { data: transactions, error: transError } = await supabase
        .from('transacciones')
        .select('monto, tipo, descripcion')
        .eq('partner_id', partnerId)
        .eq('usuario_tipo', 'partner');

      if (transError) throw transError;

      // Calcular totales por tipo
      let inversionInicial = 0;
      let depositosAdicionales = 0;
      let retiros = 0;
      let ganancias = 0;

      transactions?.forEach(transaction => {
        switch (transaction.tipo.toLowerCase()) {
          case 'deposito':
            // Separar inversión inicial de depósitos adicionales
            if (transaction.descripcion && transaction.descripcion.includes('Inversión inicial')) {
              inversionInicial += Number(transaction.monto);
            } else {
              depositosAdicionales += Number(transaction.monto);
            }
            break;
          case 'retiro':
            retiros += Number(transaction.monto);
            break;
          case 'ganancia':
            ganancias += Number(transaction.monto);
            break;
        }
      });

      // Crear datos para el gráfico con colores específicos
      const data = [];
      
      // Solo agregar inversión inicial si existe
      if (inversionInicial > 0) {
        data.push({ name: 'Inversión Inicial', value: inversionInicial, color: '#3b82f6' }); // Azul
      }
      
      // Solo agregar depósitos adicionales si existen
      if (depositosAdicionales > 0) {
        data.push({ name: 'Depósitos Adicionales', value: depositosAdicionales, color: '#10b981' }); // Verde
      }
      
      // Solo agregar retiros si existen
      if (retiros > 0) {
        data.push({ name: 'Retiros', value: retiros, color: '#ef4444' }); // Rojo
      }
      
      // Solo agregar ganancias si existen
      if (ganancias > 0) {
        data.push({ name: 'Ganancias', value: ganancias, color: '#f59e0b' }); // Amarillo
      }

      console.log('Partner donut chart data (corregido):', data);
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-col space-y-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-white text-sm">{entry.value}</span>
            </div>
            <span className="text-white text-sm font-semibold">
              {formatCurrency(entry.payload.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          Distribución de Capital
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
        Distribución de Capital
      </h3>
      
      <div className="h-80" data-chart-id="partner-donut-chart">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/70">No hay datos de transacciones</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="40%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e40af', 
                  border: '1px solid #60a5fa',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                formatter={(value) => [formatCurrency(Number(value)), '']}
              />
              <Legend 
                content={<CustomLegend />}
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Información adicional */}
      {chartData.length > 0 && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/20">
          <p className="text-white/80 text-sm text-center">
            <strong>Flujo de Capital:</strong> Inversión inicial, depósitos adicionales, retiros y ganancias
          </p>
        </div>
      )}
    </div>
  );
};

export default SocioDonutChart;