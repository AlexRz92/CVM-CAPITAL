import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { Pause, Play, Search, User, Users, AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  ganancias_pausadas: boolean;
  created_at: string;
}

interface EstadisticasPausas {
  total_inversores: number;
  inversores_pausados: number;
  inversores_activos: number;
  porcentaje_pausados: number;
}

interface PausarGananciasProps {
  onUpdate: () => void;
}

const PausarGanancias: React.FC<PausarGananciasProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'pausados' | 'activos'>('todos');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPausas | null>(null);
  const { modalState, hideModal, showSuccess, showError, showConfirm } = useModal();

  useEffect(() => {
    fetchInversores();
  }, []);

  const fetchInversores = async () => {
    try {
      const { data, error } = await supabase
        .from('inversores')
        .select('id, nombre, apellido, email, activo, ganancias_pausadas, created_at')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      
      const inversoresData = data || [];
      setInversores(inversoresData);
      
      // Calcular estadísticas
      const total = inversoresData.length;
      const pausados = inversoresData.filter(inv => inv.ganancias_pausadas).length;
      const activos = total - pausados;
      const porcentaje = total > 0 ? (pausados / total) * 100 : 0;
      
      setEstadisticas({
        total_inversores: total,
        inversores_pausados: pausados,
        inversores_activos: activos,
        porcentaje_pausados: porcentaje
      });
    } catch (error) {
      console.error('Error fetching inversores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePausa = async (inversor: Inversor) => {
    const accion = inversor.ganancias_pausadas ? 'reactivar' : 'pausar';
    const mensaje = inversor.ganancias_pausadas 
      ? `¿Estás seguro de que deseas reactivar las ganancias de ${inversor.nombre} ${inversor.apellido}? El inversor volverá a recibir ganancias normalmente en futuros procesamientos.`
      : `¿Estás seguro de que deseas pausar las ganancias de ${inversor.nombre} ${inversor.apellido}? Sus ganancias futuras serán redistribuidas entre todos los partners en partes iguales.`;

    showConfirm(
      `${accion === 'pausar' ? 'Pausar' : 'Reactivar'} Ganancias`,
      mensaje,
      () => procesarTogglePausa(inversor, accion),
      accion === 'pausar' ? 'Pausar Ganancias' : 'Reactivar Ganancias',
      'Cancelar'
    );
  };

  const procesarTogglePausa = async (inversor: Inversor, accion: 'pausar' | 'reactivar') => {
    if (!admin) return;

    setProcessingId(inversor.id);
    try {
      const nuevoEstado = accion === 'pausar';
      
      // Actualizar estado de ganancias pausadas
      const { error: updateError } = await supabase
        .from('inversores')
        .update({
          ganancias_pausadas: nuevoEstado
        })
        .eq('id', inversor.id);

      if (updateError) throw updateError;

      // Crear notificación para el inversor
      const { error: notificationError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: inversor.id,
          tipo_usuario: 'inversor',
          titulo: `Ganancias ${nuevoEstado ? 'Pausadas' : 'Reactivadas'}`,
          mensaje: nuevoEstado 
            ? 'Tus ganancias han sido pausadas temporalmente por el administrador. No recibirás ganancias en los próximos procesamientos hasta que sean reactivadas.'
            : 'Tus ganancias han sido reactivadas. Volverás a recibir ganancias normalmente en los próximos procesamientos.',
          tipo_notificacion: nuevoEstado ? 'warning' : 'success',
          leida: false,
          fecha_creacion: new Date().toISOString()
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      await fetchInversores();
      onUpdate();
      
      showSuccess(
        `Ganancias ${nuevoEstado ? 'Pausadas' : 'Reactivadas'}`,
        `Las ganancias de ${inversor.nombre} ${inversor.apellido} han sido ${nuevoEstado ? 'pausadas' : 'reactivadas'} exitosamente. ${nuevoEstado ? 'Sus ganancias futuras serán redistribuidas entre los partners.' : 'El inversor volverá a recibir ganancias normalmente.'} Se ha enviado una notificación al inversor.`
      );
    } catch (error) {
      console.error('Error toggling pausa ganancias:', error);
      showError(
        'Error al Procesar',
        `No se pudo ${accion} las ganancias: ` + (error as Error).message
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFilteredInversores = () => {
    let filtered = inversores;
    
    // Filtrar por tab activo
    switch (activeTab) {
      case 'pausados':
        filtered = filtered.filter(inv => inv.ganancias_pausadas);
        break;
      case 'activos':
        filtered = filtered.filter(inv => !inv.ganancias_pausadas);
        break;
      default:
        // 'todos' - no filtrar
        break;
    }
    
    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(inv => 
        inv.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredInversores = getFilteredInversores();

  if (loading) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Pause className="w-6 h-6 mr-3 text-yellow-300" />
          Sistema de Pausar Ganancias de Inversores
        </h3>
        
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-yellow-200 font-semibold mb-2">¿Cómo funciona el sistema de pausas?</h4>
          <ul className="text-yellow-100 text-sm space-y-1">
            <li>• Cuando pausas las ganancias de un inversor, NO recibirá ganancias en futuros procesamientos</li>
            <li>• Las ganancias que le corresponderían se redistribuyen automáticamente entre TODOS los partners</li>
            <li>• La redistribución se hace en partes iguales entre todos los partners del módulo</li>
            <li>• El inversor mantiene su saldo actual, solo se pausan ganancias futuras</li>
            <li>• Puedes reactivar las ganancias en cualquier momento</li>
            <li>• El inversor recibe notificación cuando se pausa/reactiva</li>
          </ul>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h5 className="text-white font-semibold">Total Inversores</h5>
              </div>
              <p className="text-2xl font-bold text-white">{estadisticas.total_inversores}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-2 mb-2">
                <Pause className="w-5 h-5 text-yellow-400" />
                <h5 className="text-white font-semibold">Pausados</h5>
              </div>
              <p className="text-2xl font-bold text-yellow-300">{estadisticas.inversores_pausados}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h5 className="text-white font-semibold">Activos</h5>
              </div>
              <p className="text-2xl font-bold text-green-300">{estadisticas.inversores_activos}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-5 h-5 text-purple-400" />
                <h5 className="text-white font-semibold">% Pausados</h5>
              </div>
              <p className="text-2xl font-bold text-purple-300">{estadisticas.porcentaje_pausados.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Tabs */}
          <div className="flex space-x-2">
            {[
              { id: 'todos', label: 'Todos', count: estadisticas?.total_inversores || 0 },
              { id: 'pausados', label: 'Pausados', count: estadisticas?.inversores_pausados || 0 },
              { id: 'activos', label: 'Activos', count: estadisticas?.inversores_activos || 0 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <span>{tab.label}</span>
                <span className="bg-black/20 text-xs px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 w-5 h-5 text-white/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder="Buscar inversor..."
            />
          </div>
        </div>
      </div>

      {/* Lista de inversores */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h4 className="text-lg font-bold text-white mb-4">
          Gestión de Ganancias - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ({filteredInversores.length})
        </h4>
        
        {filteredInversores.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">
              {searchTerm ? 'No se encontraron inversores' : `No hay inversores ${activeTab === 'todos' ? '' : activeTab}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredInversores.map((inversor) => (
              <div key={inversor.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br rounded-full flex items-center justify-center ${
                      inversor.ganancias_pausadas 
                        ? 'from-yellow-400 to-yellow-600' 
                        : 'from-green-400 to-green-600'
                    }`}>
                      {inversor.ganancias_pausadas ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <TrendingUp className="w-6 h-6 text-white" />
                      )}
                    </div>
                    
                    <div>
                      <h5 className="text-white font-semibold">
                        {inversor.nombre} {inversor.apellido}
                      </h5>
                      <p className="text-white/70 text-sm">{inversor.email}</p>
                      <div className="flex items-center space-x-3 text-xs text-white/60 mt-1">
                        <span>Registro: {formatDate(inversor.created_at)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          inversor.ganancias_pausadas 
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                            : 'bg-green-500/20 text-green-300 border border-green-500/50'
                        }`}>
                          {inversor.ganancias_pausadas ? 'GANANCIAS PAUSADAS' : 'GANANCIAS ACTIVAS'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleTogglePausa(inversor)}
                    disabled={processingId === inversor.id}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      inversor.ganancias_pausadas
                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-400/50'
                        : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-400/50'
                    }`}
                  >
                    {processingId === inversor.id ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                    ) : inversor.ganancias_pausadas ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                    <span>
                      {processingId === inversor.id 
                        ? 'Procesando...' 
                        : inversor.ganancias_pausadas 
                          ? 'Reactivar' 
                          : 'Pausar'
                      }
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional sobre redistribución */}
      {estadisticas && estadisticas.inversores_pausados > 0 && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-300" />
            Información sobre Redistribución
          </h4>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="space-y-3 text-blue-100 text-sm">
              <p>
                <strong>Inversores con ganancias pausadas:</strong> {estadisticas.inversores_pausados} de {estadisticas.total_inversores} ({estadisticas.porcentaje_pausados.toFixed(1)}%)
              </p>
              <p>
                <strong>Redistribución automática:</strong> Cuando se procesen ganancias en cualquier módulo, las ganancias que corresponderían a inversores pausados se redistribuirán automáticamente entre todos los partners de ese módulo en partes iguales.
              </p>
              <p>
                <strong>Impacto:</strong> Los partners recibirán ganancias adicionales proporcionales al número de inversores pausados en cada módulo.
              </p>
            </div>
          </div>
        </div>
      )}

      <UnifiedModal
        show={modalState.show}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
        confirmText={modalState.confirmText}
        onConfirm={modalState.onConfirm}
        cancelText={modalState.cancelText}
      />
    </div>
  );
};

export default PausarGanancias;