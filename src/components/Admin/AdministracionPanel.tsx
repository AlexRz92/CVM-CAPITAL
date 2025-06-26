import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import PartnersManager from './PartnersManager';
import GananciasProcessor from './GananciasProcessor';
import { DollarSign, Users, TrendingUp, Calendar, Settings, Save } from 'lucide-react';

interface AdministracionPanelProps {
  onStatsUpdate: () => void;
}

const AdministracionPanel: React.FC<AdministracionPanelProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [activeSection, setActiveSection] = useState('resumen');
  const [estadisticas, setEstadisticas] = useState({
    total_inversion: 0,
    partners_activos: 0,
    total_inversores: 0,
    semana_actual: 1,
    ganancia_semanal_actual: 0
  });
  const [loading, setLoading] = useState(true);
  const [configForm, setConfigForm] = useState({
    semana_actual: '',
    fecha_inicio_semana: ''
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchEstadisticas();
    if (activeSection === 'configuracion') {
      fetchConfiguracion();
    }
  }, [activeSection]);

  const fetchEstadisticas = async () => {
    try {
      // Obtener total de inversión
      const { data: inversionData, error: inversionError } = await supabase.rpc('calcular_total_inversion_sistema');
      
      // Obtener partners activos
      const { count: partnersCount } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      // Obtener total inversores
      const { count: inversoresCount } = await supabase
        .from('inversores')
        .select('*', { count: 'exact', head: true });

      // Obtener semana actual
      const { data: semanaData, error: semanaError } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'semana_actual')
        .maybeSingle();

      // Obtener ganancia semanal actual
      const semanaActual = semanaData?.valor ? parseInt(semanaData.valor) : 1;
      const { data: gananciaData, error: gananciaError } = await supabase
        .from('ganancias_semanales')
        .select('ganancia_bruta')
        .eq('semana_numero', semanaActual)
        .maybeSingle();

      setEstadisticas({
        total_inversion: inversionData || 0,
        partners_activos: partnersCount || 0,
        total_inversores: inversoresCount || 0,
        semana_actual: semanaActual,
        ganancia_semanal_actual: gananciaData?.ganancia_bruta || 0
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('clave, valor')
        .in('clave', ['semana_actual', 'fecha_inicio_semana']);

      if (error) throw error;

      const config = data?.reduce((acc, item) => {
        acc[item.clave] = item.valor;
        return acc;
      }, {} as any) || {};

      setConfigForm({
        semana_actual: config.semana_actual || '1',
        fecha_inicio_semana: config.fecha_inicio_semana || new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error fetching configuration:', error);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigLoading(true);

    try {
      const { data, error } = await supabase.rpc('configurar_semana_sistema', {
        p_semana_numero: parseInt(configForm.semana_actual),
        p_fecha_inicio: configForm.fecha_inicio_semana,
        p_admin_id: admin?.id
      });

      if (error) throw error;

      setShowSuccessModal(true);
      fetchEstadisticas();
      onStatsUpdate();
    } catch (error) {
      console.error('Error updating configuration:', error);
      alert('Error al actualizar la configuración: ' + (error as Error).message);
    } finally {
      setConfigLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const sections = [
    { id: 'resumen', label: 'Resumen General', icon: DollarSign },
    { id: 'partners', label: 'Gestión de Partners', icon: Users },
    { id: 'ganancias', label: 'Procesar Ganancias', icon: TrendingUp },
    { id: 'configuracion', label: 'Configuración', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Navegación de secciones */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex flex-wrap gap-4 justify-center">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeSection === section.id
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <section.icon className="w-5 h-5" />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de las secciones */}
      {activeSection === 'resumen' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <DollarSign className="w-6 h-6 mr-3" />
            Resumen General del Sistema
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h4 className="text-white font-semibold mb-2">Total en Inversión</h4>
                <p className="text-2xl font-bold text-green-300">{formatCurrency(estadisticas.total_inversion)}</p>
                <p className="text-white/70 text-sm mt-2">
                  Suma de inversores + partners
                </p>
              </div>

              <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h4 className="text-white font-semibold mb-2">Partners Activos</h4>
                <p className="text-2xl font-bold text-blue-300">{estadisticas.partners_activos}</p>
                <p className="text-white/70 text-sm mt-2">
                  Partners registrados y activos
                </p>
              </div>

              <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h4 className="text-white font-semibold mb-2">Total Inversores</h4>
                <p className="text-2xl font-bold text-purple-300">{estadisticas.total_inversores}</p>
                <p className="text-white/70 text-sm mt-2">
                  Inversores registrados
                </p>
              </div>

              <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h4 className="text-white font-semibold mb-2">Semana Actual</h4>
                <p className="text-2xl font-bold text-yellow-300">{estadisticas.semana_actual}</p>
                <p className="text-white/70 text-sm mt-2">
                  Período de ganancias actual
                </p>
              </div>

              <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h4 className="text-white font-semibold mb-2">Ganancia Semanal</h4>
                <p className="text-2xl font-bold text-cyan-300">{formatCurrency(estadisticas.ganancia_semanal_actual)}</p>
                <p className="text-white/70 text-sm mt-2">
                  Ganancia de la semana actual
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'partners' && (
        <PartnersManager onUpdate={() => {
          fetchEstadisticas();
          onStatsUpdate();
        }} />
      )}

      {activeSection === 'ganancias' && (
        <GananciasProcessor 
          totalInversion={estadisticas.total_inversion} 
          onUpdate={() => {
            fetchEstadisticas();
            onStatsUpdate();
          }} 
        />
      )}

      {activeSection === 'configuracion' && (
        <div className="space-y-6">
          {/* Configuración de Semanas */}
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Calendar className="w-6 h-6 mr-3" />
              Configuración de Semanas
            </h3>
            
            {/* Información actual */}
            <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-6">
              <h4 className="text-white font-semibold mb-3">Estado Actual</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-white/70 text-sm">Semana Actual</p>
                  <p className="text-xl font-bold text-blue-300">{estadisticas.semana_actual}</p>
                </div>
                <div>
                  <p className="text-white/70 text-sm">Total Inversión</p>
                  <p className="text-xl font-bold text-green-300">{formatCurrency(estadisticas.total_inversion)}</p>
                </div>
                <div>
                  <p className="text-white/70 text-sm">Ganancia Semanal</p>
                  <p className="text-xl font-bold text-yellow-300">{formatCurrency(estadisticas.ganancia_semanal_actual)}</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Semana Actual
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={configForm.semana_actual}
                    onChange={(e) => setConfigForm({...configForm, semana_actual: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Fecha de Inicio de Semana
                  </label>
                  <input
                    type="date"
                    value={configForm.fecha_inicio_semana}
                    onChange={(e) => setConfigForm({...configForm, fecha_inicio_semana: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={configLoading}
                className="flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-6 py-3 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>{configLoading ? 'Guardando...' : 'Guardar Configuración'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de éxito para configuración */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Configuración Guardada</h3>
            <p className="text-gray-600 mb-6">
              La configuración de la semana se ha guardado correctamente.
            </p>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdministracionPanel;