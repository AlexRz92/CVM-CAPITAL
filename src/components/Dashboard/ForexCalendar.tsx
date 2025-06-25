import React, { useState, useEffect } from 'react';
import { Calendar, X, TrendingUp, AlertTriangle, Info, RefreshCw } from 'lucide-react';

interface ForexEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: 'low' | 'medium' | 'high';
  forecast: string;
  previous: string;
  actual?: string;
  explanation?: string;
}

const ForexCalendar: React.FC = () => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [events, setEvents] = useState<ForexEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const FMP_API_KEY = 'AlvgzZ9giVTCOVDDri9eKNJWUSyrZaE9';

  useEffect(() => {
    if (showCalendar) {
      fetchForexEvents();
    }
  }, [showCalendar, currentWeek]);

  const fetchForexEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calcular fechas de la semana
      const startOfWeek = new Date(currentWeek);
      const dayOfWeek = startOfWeek.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(currentWeek.getDate() + daysToMonday);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];

      // Llamada a Financial Modeling Prep API
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/economic_calendar?from=${startDate}&to=${endDate}&apikey=${FMP_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('No se pudieron obtener los datos del calendario económico');
      }

      const data = await response.json();
      
      // Procesar y filtrar eventos de FMP
      const processedEvents = data
        ?.filter((event: any) => {
          // Filtrar solo eventos de medio y alto impacto
          const impact = getImpactLevel(event.impact);
          return impact === 'medium' || impact === 'high';
        })
        .map((event: any) => ({
          title: event.event || event.name || 'Evento Económico',
          country: event.country || 'N/A',
          date: event.date?.split(' ')[0] || startDate,
          time: event.date?.split(' ')[1]?.substring(0, 5) || '00:00',
          impact: getImpactLevel(event.impact),
          forecast: event.estimate || event.forecast || 'N/A',
          previous: event.previous || 'N/A',
          actual: event.actual || undefined
        }))
        .sort((a: ForexEvent, b: ForexEvent) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateA.getTime() - dateB.getTime();
        }) || [];

      setEvents(processedEvents);
    } catch (error) {
      console.error('Error fetching forex events:', error);
      setError('No se pudieron cargar los eventos del calendario. Mostrando datos de ejemplo.');
      
      // Datos de ejemplo como fallback
      const mockEvents = generateMockEvents();
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  const getImpactLevel = (impact: string): 'low' | 'medium' | 'high' => {
    if (!impact) return 'low';
    const impactLower = impact.toLowerCase();
    
    if (impactLower.includes('high') || impactLower.includes('alto') || impactLower === '3') {
      return 'high';
    } else if (impactLower.includes('medium') || impactLower.includes('medio') || impactLower === '2') {
      return 'medium';
    } else {
      return 'low';
    }
  };

  const generateMockEvents = (): ForexEvent[] => {
    const today = new Date();
    const events = [
      {
        title: 'Non-Farm Payrolls',
        country: 'US',
        date: today.toISOString().split('T')[0],
        time: '13:30',
        impact: 'high' as const,
        forecast: '200K',
        previous: '187K',
        explanation: 'Mide el cambio en el número de empleos durante el mes anterior, excluyendo el sector agrícola. Es un indicador clave de la salud económica.'
      },
      {
        title: 'Federal Funds Rate',
        country: 'US',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '19:00',
        impact: 'high' as const,
        forecast: '5.50%',
        previous: '5.25%',
        explanation: 'Tasa de interés que los bancos se cobran entre sí por préstamos a un día. Afecta directamente a todas las tasas de interés en la economía.'
      },
      {
        title: 'ECB Interest Rate Decision',
        country: 'EU',
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        time: '12:45',
        impact: 'high' as const,
        forecast: '4.50%',
        previous: '4.25%',
        explanation: 'Decisión del Banco Central Europeo sobre las tasas de interés. Impacta el valor del Euro y la actividad económica en la Eurozona.'
      },
      {
        title: 'Consumer Price Index',
        country: 'US',
        date: new Date(Date.now() + 259200000).toISOString().split('T')[0],
        time: '13:30',
        impact: 'medium' as const,
        forecast: '3.2%',
        previous: '3.0%',
        explanation: 'Mide el cambio en los precios que pagan los consumidores por bienes y servicios. Es el principal indicador de inflación.'
      },
      {
        title: 'GDP Growth Rate',
        country: 'US',
        date: new Date(Date.now() + 345600000).toISOString().split('T')[0],
        time: '13:30',
        impact: 'high' as const,
        forecast: '2.1%',
        previous: '1.9%',
        explanation: 'Mide el crecimiento económico del país. Un crecimiento positivo indica expansión económica, mientras que negativo indica recesión.'
      }
    ];

    return events.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string, timeString: string) => {
    const date = new Date(`${dateString} ${timeString}`);
    return date.toLocaleDateString('es-ES', {
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
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${endOfWeek.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
  };

  return (
    <>
      <button
        onClick={() => setShowCalendar(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40"
        title="Calendario Económico"
      >
        <Calendar className="w-8 h-8" />
      </button>

      {showCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8" />
                  <div>
                    <h3 className="text-2xl font-bold">Calendario Económico</h3>
                    <p className="text-green-100">Eventos de Alto y Medio Impacto - Financial Modeling Prep</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchForexEvents}
                    disabled={loading}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors disabled:opacity-50"
                    title="Actualizar eventos"
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

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm">{error}</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">No hay eventos importantes para esta semana</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{event.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border ${getImpactColor(event.impact)}`}>
                              {getImpactIcon(event.impact)}
                              <span>{event.impact.toUpperCase()}</span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatDate(event.date, event.time)}</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {event.country}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-700">Pronóstico: </span>
                          <span className="text-gray-600">{event.forecast}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Anterior: </span>
                          <span className="text-gray-600">{event.previous}</span>
                        </div>
                        {event.actual && (
                          <div>
                            <span className="font-medium text-gray-700">Actual: </span>
                            <span className="text-gray-600 font-semibold">{event.actual}</span>
                          </div>
                        )}
                      </div>

                      {event.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                          <h5 className="font-medium text-blue-900 mb-1">¿Qué significa?</h5>
                          <p className="text-blue-800 text-sm">{event.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                Datos obtenidos de Financial Modeling Prep API. Los eventos se filtran por impacto medio y alto.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ForexCalendar;