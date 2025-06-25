import React, { useState, useEffect } from 'react';
import { Calendar, X, TrendingUp, AlertTriangle, Info, RefreshCw } from 'lucide-react';

interface ForexNews {
  id: string;
  titulo: string;
  descripcion: string;
  impacto: 'bajo' | 'medio' | 'alto';
  fecha_evento: string;
  moneda: string;
  explicacion: string;
}

const ForexCalendar: React.FC = () => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [news, setNews] = useState<ForexNews[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    if (showCalendar) {
      fetchForexNews();
    }
  }, [showCalendar, currentWeek]);

  const fetchForexNews = async () => {
    setLoading(true);
    try {
      // Obtener el lunes de la semana actual
      const startOfWeek = new Date(currentWeek);
      const dayOfWeek = startOfWeek.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si es domingo, retroceder 6 días
      startOfWeek.setDate(currentWeek.getDate() + daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // El sábado de la misma semana
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 5); // Lunes a Sábado (5 días después)
      endOfWeek.setHours(23, 59, 59, 999);

      // Simular llamada a API de Forex Factory
      // En producción, esto sería una llamada real a la API
      const mockData = generateMockForexData(startOfWeek, endOfWeek);
      setNews(mockData);
    } catch (error) {
      console.error('Error fetching forex news:', error);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const generateMockForexData = (startDate: Date, endDate: Date): ForexNews[] => {
    const events = [
      {
        titulo: 'Decisión de Tasas Fed',
        descripcion: 'La Reserva Federal anuncia su decisión sobre las tasas de interés',
        impacto: 'alto' as const,
        moneda: 'USD',
        explicacion: 'Las decisiones de tasas de la Fed son cruciales para el USD. Un aumento fortalece el dólar, una reducción lo debilita.',
        day: 2 // Martes
      },
      {
        titulo: 'Datos de Empleo NFP',
        descripcion: 'Nóminas No Agrícolas de Estados Unidos',
        impacto: 'alto' as const,
        moneda: 'USD',
        explicacion: 'El NFP es uno de los indicadores más importantes. Un dato fuerte generalmente fortalece el USD significativamente.',
        day: 5 // Viernes
      },
      {
        titulo: 'Decisión BCE',
        descripcion: 'Banco Central Europeo anuncia política monetaria',
        impacto: 'alto' as const,
        moneda: 'EUR',
        explicacion: 'Las decisiones del BCE impactan directamente al Euro y pueden causar volatilidad en EUR/USD.',
        day: 4 // Jueves
      },
      {
        titulo: 'Inflación CPI',
        descripcion: 'Índice de Precios al Consumidor',
        impacto: 'medio' as const,
        moneda: 'USD',
        explicacion: 'La inflación es clave para las decisiones de la Fed. Alta inflación puede llevar a políticas más restrictivas.',
        day: 3 // Miércoles
      },
      {
        titulo: 'PIB Trimestral',
        descripcion: 'Producto Interno Bruto preliminar',
        impacto: 'medio' as const,
        moneda: 'EUR',
        explicacion: 'El PIB mide el crecimiento económico. Un crecimiento fuerte generalmente fortalece la moneda.',
        day: 1 // Lunes
      }
    ];

    return events.map((event, index) => {
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + event.day - 1);
      eventDate.setHours(14 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60));

      return {
        id: `forex-${index}`,
        titulo: event.titulo,
        descripcion: event.descripcion,
        impacto: event.impacto,
        fecha_evento: eventDate.toISOString(),
        moneda: event.moneda,
        explicacion: event.explicacion
      };
    });
  };

  const refreshNews = async () => {
    await fetchForexNews();
  };

  const getImpactColor = (impacto: string) => {
    switch (impacto) {
      case 'alto':
        return 'text-red-400 bg-red-500/20';
      case 'medio':
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getImpactIcon = (impacto: string) => {
    switch (impacto) {
      case 'alto':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medio':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const changeWeek = (direction: number) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newDate);
  };

  const getWeekRange = () => {
    const startOfWeek = new Date(currentWeek);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(currentWeek.getDate() + daysToMonday);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5);
    
    return `${startOfWeek.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${endOfWeek.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
  };

  return (
    <>
      {/* Botón del Calendario */}
      <button
        onClick={() => setShowCalendar(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40"
        title="Calendario Forex"
      >
        <Calendar className="w-8 h-8" />
      </button>

      {/* Modal del Calendario */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8" />
                  <div>
                    <h3 className="text-2xl font-bold">Calendario Forex</h3>
                    <p className="text-green-100">Eventos de Alto y Medio Impacto (Lunes - Sábado)</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={refreshNews}
                    disabled={loading}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors disabled:opacity-50"
                    title="Actualizar noticias"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Navegación de semanas */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => changeWeek(-1)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  ← Semana Anterior
                </button>
                
                <h4 className="text-lg font-semibold">
                  {getWeekRange()}
                </h4>
                
                <button
                  onClick={() => changeWeek(1)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  Semana Siguiente →
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                </div>
              ) : news.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">No hay eventos importantes para esta semana</p>
                  <button
                    onClick={refreshNews}
                    className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Actualizar Eventos
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {news.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{item.titulo}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${getImpactColor(item.impacto)}`}>
                              {getImpactIcon(item.impacto)}
                              <span>{item.impacto.toUpperCase()}</span>
                            </span>
                          </div>
                          <p className="text-gray-600 mb-2">{item.descripcion}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatDate(item.fecha_evento)}</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {item.moneda}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Explicación para principiantes */}
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                        <h5 className="font-medium text-blue-900 mb-1">¿Cómo afecta al mercado?</h5>
                        <p className="text-blue-800 text-sm">{item.explicacion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con información */}
            <div className="bg-gray-50 p-4 border-t">
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Alto Impacto</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Medio Impacto</span>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                Eventos de Lunes a Sábado. Datos simulados basados en patrones de Forex Factory.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ForexCalendar;