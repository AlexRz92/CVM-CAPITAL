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
}

const ForexCalendar: React.FC = () => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [events, setEvents] = useState<ForexEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

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

      // Intentar obtener datos de Forex Factory
      const response = await fetch(`https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=1`);
      
      if (!response.ok) {
        throw new Error('No se pudieron obtener los datos del calendario');
      }

      const data = await response.json();
      
      // Procesar y filtrar eventos
      const processedEvents = data
        .filter((event: any) => {
          const eventDate = new Date(event.date);
          const weekStart = new Date(startDate);
          const weekEnd = new Date(endDate);
          return eventDate >= weekStart && eventDate <= weekEnd && 
                 (event.impact === 'High' || event.impact === 'Medium');
        })
        .map((event: any) => ({
          title: event.title,
          country: event.country,
          date: event.date,
          time: event.time,
          impact: event.impact.toLowerCase(),
          forecast: event.forecast || 'N/A',
          previous: event.previous || 'N/A'
        }))
        .sort((a: ForexEvent, b: ForexEvent) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });

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

  const generateMockEvents = (): ForexEvent[] => {
    const events = [
      {
        title: 'Non-Farm Payrolls',
        country: 'USD',
        date: new Date().toISOString().split('T')[0],
        time: '13:30',
        impact: 'high' as const,
        forecast: '200K',
        previous: '187K'
      },
      {
        title: 'Federal Funds Rate',
        country: 'USD',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '19:00',
        impact: 'high' as const,
        forecast: '5.50%',
        previous: '5.25%'
      },
      {
        title: 'ECB Interest Rate Decision',
        country: 'EUR',
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        time: '12:45',
        impact: 'high' as const,
        forecast: '4.50%',
        previous: '4.25%'
      },
      {
        title: 'Consumer Price Index',
        country: 'USD',
        date: new Date(Date.now() + 259200000).toISOString().split('T')[0],
        time: '13:30',
        impact: 'medium' as const,
        forecast: '3.2%',
        previous: '3.0%'
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
        title="Calendario Forex"
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
                    <h3 className="text-2xl font-bold">Calendario Forex</h3>
                    <p className="text-green-100">Eventos de Alto y Medio Impacto</p>
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
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Pronóstico: </span>
                          <span className="text-gray-600">{event.forecast}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Anterior: </span>
                          <span className="text-gray-600">{event.previous}</span>
                        </div>
                      </div>
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
                Datos obtenidos de Forex Factory. Actualización en tiempo real.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ForexCalendar;