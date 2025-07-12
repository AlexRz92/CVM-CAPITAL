import React, { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import TemporalDashboard from './TemporalDashboard';
import NotificationBell from './NotificationBell';

interface ModuloTemporalConfig {
  activo: boolean;
  titulo_temporal: string;
}

const DashboardSwitcher: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<ModuloTemporalConfig | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<'principal' | 'temporal'>('principal');
  const [loading, setLoading] = useState(true);

  const currentDate = new Date().toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('modulo_temporal_config')
        .select('activo, titulo_temporal')
        .order('fecha_creacion', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setConfig(data);
    } catch (error) {
      console.error('Error fetching modulo temporal config:', error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // Si el módulo temporal no está activo, mostrar solo el dashboard principal
  if (!config?.activo) {
    return <Dashboard />;
  }

  // Si está activo, mostrar el dashboard con switcher y header completo
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800">
      {/* Header completo con todos los elementos */}
      <header className="bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="/logo2.png" 
                alt="Logo" 
                className="h-12 w-auto object-contain"
              />
              <div>
                <p className="text-sm text-cyan-100 italic">Inversión Inteligente, siempre con ustedes</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-cyan-100">{currentDate}</p>
                {user && (
                  <p className="text-sm font-medium">
                    <User className="inline w-4 h-4 mr-1" />
                    {user.nombre} {user.apellido}
                  </p>
                )}
              </div>
              
              <NotificationBell userId={user?.id} userType="inversor" />
              
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors duration-200 font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Salir</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Títulos clickeables para cambiar entre dashboards */}
      <div className="bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="text-center">
            <div className="flex justify-center space-x-8 mb-2">
              <button
                onClick={() => setActiveDashboard('principal')}
                className={`text-xl font-bold transition-all duration-200 pb-2 ${
                  activeDashboard === 'principal'
                    ? 'text-white border-b-2 border-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Reporte C.V.M
              </button>
              <button
                onClick={() => setActiveDashboard('temporal')}
                className={`text-xl font-bold transition-all duration-200 pb-2 ${
                  activeDashboard === 'temporal'
                    ? 'text-white border-b-2 border-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {config.titulo_temporal}
              </button>
            </div>
            <p className="text-sm text-cyan-100 italic">
              {activeDashboard === 'principal' 
                ? 'Dashboard Principal - Gestión de Inversiones'
                : 'Dashboard Temporal - Gestión Independiente'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Contenido del dashboard */}
      <div className="dashboard-content">
        {activeDashboard === 'principal' ? (
          <Dashboard hideHeader={true} />
        ) : (
          <TemporalDashboard hideHeader={true} />
        )}
      </div>
    </div>
  );
};

export default DashboardSwitcher;