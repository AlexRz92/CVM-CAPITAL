import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../config/supabase';
import { AdminHeader, UsuariosManager, AprobacionesUnificadas, TicketsList, AdministracionPanel, ImportExportManager, ModuloAdministracion } from './';
import { RetirosDirectos, PausarGanancias } from './';
import { 
  Users, 
  CheckCircle, 
  UsersIcon, 
  HelpCircle, 
  DollarSign, 
  Upload,
  Package,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Settings,
  RotateCcw,
  ArrowDownCircle,
  Pause
} from 'lucide-react';

interface SuccessModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ show, message, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Información</h3>
          <p className="text-gray-600 mb-6">{message}</p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};

const Operaciones: React.FC = () => {
  const { admin } = useAdmin();
  const [activeTab, setActiveTab] = useState('resumen');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalInversores: 0,
    totalPartners: 0,
    solicitudesPendientes: 0,
    ticketsPendientes: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total inversores
      const { count: inversoresCount } = await supabase
        .from('inversores')
        .select('*', { count: 'exact', head: true });

      // Total partners
      const { count: partnersCount } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true });

      // Solicitudes pendientes (todas las fuentes)
      const { count: solicitudesCount } = await supabase
        .from('solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      const { count: solicitudesPartnersCount } = await supabase
        .from('partner_solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      const { count: solicitudesModulosInversoresCount } = await supabase
        .from('modulo_solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      const { count: solicitudesModulosPartnersCount } = await supabase
        .from('modulo_partner_solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      // Tickets pendientes
      const { count: ticketsCount, error: ticketsError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['abierto', 'respondido']);

      if (ticketsError) {
        console.error('Error fetching tickets count:', ticketsError);
      }

      const totalSolicitudesPendientes = (solicitudesCount || 0) + 
                                        (solicitudesPartnersCount || 0) + 
                                        (solicitudesModulosInversoresCount || 0) + 
                                        (solicitudesModulosPartnersCount || 0);
      setStats({
        totalInversores: inversoresCount || 0,
        totalPartners: partnersCount || 0,
        solicitudesPendientes: totalSolicitudesPendientes,
        ticketsPendientes: ticketsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showSuccessMessage = (message: string) => {
    setModalMessage(message);
    setShowModal(true);
  };

  const tabs = [
    { 
      id: 'resumen', 
      label: 'Resumen General', 
      icon: DollarSign, 
      count: 0,
      description: 'Vista general del sistema'
    },
    { 
      id: 'modulos', 
      label: 'Módulos Independientes', 
      icon: Package, 
      count: 0,
      description: 'Gestión de módulos'
    },
    { 
      id: 'usuarios', 
      label: 'Gestión de Usuarios', 
      icon: Users, 
      count: 0,
      description: 'Administrar inversores y partners'
    },
    { 
      id: 'aprobaciones', 
      label: 'Sistema de Aprobaciones', 
      icon: CheckCircle, 
      count: stats.solicitudesPendientes,
      description: 'Todas las solicitudes del sistema'
    },
    { 
      id: 'tickets', 
      label: 'Tickets de Soporte', 
      icon: HelpCircle, 
      count: stats.ticketsPendientes,
      description: 'Sistema de soporte'
    },
    { 
      id: 'importexport', 
      label: 'Importar/Exportar', 
      icon: Upload, 
      count: 0,
      description: 'Gestión de datos'
    },
    { 
      id: 'rollback', 
      label: 'Sistema de Rollback', 
      icon: RotateCcw, 
      count: 0,
      description: 'Revertir períodos procesados'
    },
    { 
      id: 'retiros', 
      label: 'Retiros Directos', 
      icon: ArrowDownCircle, 
      count: 0,
      description: 'Crear retiros directos a inversores'
    },
    { 
      id: 'pausar', 
      label: 'Pausar Ganancias', 
      icon: Pause, 
      count: 0,
      description: 'Gestionar pausas de ganancias'
    }
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800">
      <AdminHeader />
      
      <div className="flex">
        {/* Sidebar - Fondo más oscuro */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} transition-all duration-300 bg-black/30 backdrop-blur-lg border-r border-white/20 min-h-screen relative`}>
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-6 bg-black/40 backdrop-blur-lg rounded-full p-1.5 text-white hover:bg-black/50 transition-colors border border-white/30 z-10"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/20">
            {!sidebarCollapsed ? (
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Panel de Operaciones</h2>
                <p className="text-white/70 text-sm">Sistema de administración</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                  activeTab === tab.id
                    ? 'bg-white/25 text-white shadow-lg border border-white/40'
                    : 'text-white/80 hover:bg-white/15 hover:text-white'
                }`}
                title={sidebarCollapsed ? tab.label : ''}
              >
                <div className="flex items-center space-x-3">
                  <tab.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{tab.label}</div>
                      <div className="text-xs text-white/60">{tab.description}</div>
                    </div>
                  )}
                </div>
                
                {tab.count > 0 && (
                  <div className={`${sidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5`}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </div>
                )}

                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                        {tab.count}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          {!sidebarCollapsed && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20">
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-white/80 text-xs">
                  <div className="font-medium mb-1">Sistema CVM Capital</div>
                  <div>Panel de Administración v2.0</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Content Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              {currentTab && <currentTab.icon className="w-6 h-6 text-white" />}
              <h1 className="text-2xl font-bold text-white">
                {currentTab?.label || 'Panel de Operaciones'}
              </h1>
            </div>
            {currentTab && (
              <p className="text-white/80">{currentTab.description}</p>
            )}
          </div>

          {/* Content Area */}
          <div className="space-y-8">
            {activeTab === 'resumen' && <ResumenGeneral onStatsUpdate={fetchStats} />}
            {activeTab === 'usuarios' && <UsuariosManager onStatsUpdate={fetchStats} />}
            {activeTab === 'aprobaciones' && <AprobacionesUnificadas onStatsUpdate={fetchStats} />}
            {activeTab === 'tickets' && <TicketsList onStatsUpdate={fetchStats} />}
            {activeTab === 'modulos' && <ModuloAdministracion onUpdate={fetchStats} />}
            {activeTab === 'importexport' && <ImportExportManager onUpdate={fetchStats} />}
            {activeTab === 'rollback' && <RollbackManager onUpdate={fetchStats} />}
            {activeTab === 'retiros' && <RetirosDirectos onUpdate={fetchStats} />}
            {activeTab === 'pausar' && <PausarGanancias onUpdate={fetchStats} />}
          </div>
        </div>
      </div>

      <SuccessModal
        show={showModal}
        message={modalMessage}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

// Componente separado para Resumen General
const ResumenGeneral: React.FC<{ onStatsUpdate: () => void }> = ({ onStatsUpdate }) => {
  const [modulosEstadisticas, setModulosEstadisticas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModulosEstadisticas();
  }, []);

  const fetchModulosEstadisticas = async () => {
    try {
      console.log('Fetching estadísticas de módulos...');
      
      // Obtener todos los módulos activos
      const { data: modulos, error: modulosError } = await supabase
        .from('modulos_independientes')
        .select('*')
        .eq('activo', true)
        .order('fecha_creacion', { ascending: false });

      if (modulosError) throw modulosError;

      if (!modulos || modulos.length === 0) {
        setModulosEstadisticas([]);
        return;
      }

      // Para cada módulo, calcular sus estadísticas
      const estadisticasPromises = modulos.map(async (modulo) => {
        try {
          // 1. Obtener total de inversión del módulo
          const { data: transaccionesModulo, error: transError } = await supabase
            .from('modulo_transacciones')
            .select('monto, tipo, usuario_tipo')
            .eq('modulo_id', modulo.id);

          if (transError) throw transError;

          let totalInversionModulo = 0;
          let totalGananciasModulo = 0;
          
          transaccionesModulo?.forEach(transaccion => {
            switch (transaccion.tipo.toLowerCase()) {
              case 'deposito':
                totalInversionModulo += Number(transaccion.monto);
                break;
              case 'retiro':
                totalInversionModulo -= Number(transaccion.monto);
                break;
              case 'ganancia':
                totalInversionModulo += Number(transaccion.monto);
                totalGananciasModulo += Number(transaccion.monto);
                break;
            }
          });

          // 2. Contar partners activos en el módulo
          const { count: partnersCount, error: partnersError } = await supabase
            .from('modulo_asignaciones')
            .select('*', { count: 'exact', head: true })
            .eq('modulo_id', modulo.id)
            .eq('activo', true)
            .not('partner_id', 'is', null);

          if (partnersError) throw partnersError;

          // 3. Contar inversores activos en el módulo
          const { count: inversoresCount, error: inversoresError } = await supabase
            .from('modulo_asignaciones')
            .select('*', { count: 'exact', head: true })
            .eq('modulo_id', modulo.id)
            .eq('activo', true)
            .not('inversor_id', 'is', null);

          if (inversoresError) throw inversoresError;

          // 4. Calcular promedio de ganancias (ganancias totales / número de períodos procesados)
          const { count: periodosCount, error: periodosError } = await supabase
            .from('modulo_meses')
            .select('*', { count: 'exact', head: true })
            .eq('modulo_id', modulo.id)
            .eq('procesado', true);

          if (periodosError) throw periodosError;

          const promedioGanancias = periodosCount && periodosCount > 0 
            ? totalGananciasModulo / periodosCount 
            : 0;

          // 5. Obtener último período procesado
          const { data: ultimoPeriodo, error: ultimoPeriodoError } = await supabase
            .from('modulo_meses')
            .select('nombre_mes, fecha_procesado, ganancia_bruta')
            .eq('modulo_id', modulo.id)
            .eq('procesado', true)
            .order('fecha_procesado', { ascending: false })
            .limit(1);

          if (ultimoPeriodoError) throw ultimoPeriodoError;

          return {
            id: modulo.id,
            nombre: modulo.nombre,
            descripcion: modulo.descripcion,
            total_inversion: Math.max(0, totalInversionModulo),
            total_ganancias: totalGananciasModulo,
            promedio_ganancias: promedioGanancias,
            partners_activos: partnersCount || 0,
            inversores_activos: inversoresCount || 0,
            periodos_procesados: periodosCount || 0,
            ultimo_periodo: ultimoPeriodo && ultimoPeriodo.length > 0 ? ultimoPeriodo[0] : null,
            fecha_creacion: modulo.fecha_creacion
          };
        } catch (error) {
          console.error(`Error procesando estadísticas del módulo ${modulo.nombre}:`, error);
          return {
            id: modulo.id,
            nombre: modulo.nombre,
            descripcion: modulo.descripcion,
            total_inversion: 0,
            total_ganancias: 0,
            promedio_ganancias: 0,
            partners_activos: 0,
            inversores_activos: 0,
            periodos_procesados: 0,
            ultimo_periodo: null,
            fecha_creacion: modulo.fecha_creacion
          };
        }
      });

      const estadisticas = await Promise.all(estadisticasPromises);
      setModulosEstadisticas(estadisticas);
      
      console.log('Estadísticas de módulos calculadas:', estadisticas);
    } catch (error) {
      console.error('Error fetching módulos statistics:', error);
      setModulosEstadisticas([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTotalGeneral = () => {
    return modulosEstadisticas.reduce((total, modulo) => ({
      inversion: total.inversion + modulo.total_inversion,
      ganancias: total.ganancias + modulo.total_ganancias,
      partners: total.partners + modulo.partners_activos,
      inversores: total.inversores + modulo.inversores_activos
    }), { inversion: 0, ganancias: 0, partners: 0, inversores: 0 });
  };

  const totalesGenerales = getTotalGeneral();

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <DollarSign className="w-6 h-6 mr-3" />
          Resumen General por Módulos
        </h3>
        <button
          onClick={fetchModulosEstadisticas}
          className="bg-blue-500/20 text-white px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
        >
          Actualizar
        </button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {modulosEstadisticas.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">No hay módulos activos en el sistema</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white mb-4">Módulos del Sistema ({modulosEstadisticas.length})</h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {modulosEstadisticas.map((modulo) => (
                  <div key={modulo.id} className="bg-white/10 rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-102">
                    {/* Header del módulo */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h5 className="text-white font-bold text-lg">{modulo.nombre}</h5>
                          {modulo.descripcion && (
                            <p className="text-white/70 text-sm">{modulo.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-xs">Creado</p>
                        <p className="text-white/80 text-sm">{formatDate(modulo.fecha_creacion)}</p>
                      </div>
                    </div>

                    {/* Métricas principales */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                        <div className="flex items-center space-x-2 mb-1">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <p className="text-white/80 text-sm font-medium">Total Inversión</p>
                        </div>
                        <p className="text-xl font-bold text-green-300">{formatCurrency(modulo.total_inversion)}</p>
                      </div>

                      <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                        <div className="flex items-center space-x-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-yellow-400" />
                          <p className="text-white/80 text-sm font-medium">Promedio Ganancias</p>
                        </div>
                        <p className="text-xl font-bold text-yellow-300">{formatCurrency(modulo.promedio_ganancias)}</p>
                        <p className="text-white/60 text-xs">Por período</p>
                      </div>
                    </div>

                    {/* Usuarios asignados */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                        <div className="flex items-center space-x-2 mb-1">
                          <Users className="w-4 h-4 text-purple-400" />
                          <p className="text-white/80 text-sm font-medium">Partners</p>
                        </div>
                        <p className="text-xl font-bold text-purple-300">{modulo.partners_activos}</p>
                        <p className="text-white/60 text-xs">Activos</p>
                      </div>

                      <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                        <div className="flex items-center space-x-2 mb-1">
                          <Users className="w-4 h-4 text-blue-800" />
                          <p className="text-white/80 text-sm font-medium">Inversores</p>
                        </div>
                        <p className="text-xl font-bold text-white">{modulo.inversores_activos}</p>
                        <p className="text-white/60 text-xs">Activos</p>
                      </div>
                    </div>

                    {/* Información adicional */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-white/70">Períodos Procesados</p>
                          <p className="text-white font-semibold">{modulo.periodos_procesados}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/70">Total Ganancias</p>
                          <p className="text-white font-semibold">{formatCurrency(modulo.total_ganancias)}</p>
                        </div>
                      </div>
                      
                      {modulo.ultimo_periodo && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-white/70 text-xs">Último período procesado:</p>
                          <div className="flex items-center justify-between">
                            <p className="text-white text-sm font-medium">{modulo.ultimo_periodo.nombre_mes}</p>
                            <p className="text-green-300 text-sm font-bold">{formatCurrency(modulo.ultimo_periodo.ganancia_bruta)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Indicadores de rendimiento */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          modulo.total_inversion > 0 ? 'bg-green-400' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-white/80 text-sm">
                          {modulo.total_inversion > 0 ? 'Activo' : 'Sin inversión'}
                        </span>
                      </div>
                      
                      {modulo.total_inversion > 0 && modulo.total_ganancias > 0 && (
                        <div className="text-right">
                          <p className="text-white/70 text-xs">ROI</p>
                          <p className="text-cyan-300 font-bold text-sm">
                            {((modulo.total_ganancias / modulo.total_inversion) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente para gestión de rollback
const RollbackManager: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [periodosProcessados, setPeriodosProcessados] = useState<any[]>([]);
  const [modulosConPeriodos, setModulosConPeriodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRollback, setProcessingRollback] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<any>(null);

  useEffect(() => {
    fetchPeriodosProcessados();
  }, []);

  const fetchPeriodosProcessados = async () => {
    try {
      // Obtener períodos principales procesados
      const { data: periodosPrincipales, error: errorPrincipales } = await supabase
        .from('ganancias_semanales')
        .select('*')
        .eq('procesado', true)
        .order('numero_mes', { ascending: false });

      if (errorPrincipales) throw errorPrincipales;

      // Obtener períodos de módulos procesados
      const { data: periodosModulos, error: errorModulos } = await supabase
        .from('modulo_meses')
        .select(`
          *,
          modulos_independientes (
            nombre
          )
        `)
        .eq('procesado', true)
        .order('fecha_procesado', { ascending: false });

      if (errorModulos) throw errorModulos;

      setPeriodosProcessados(periodosPrincipales || []);
      setModulosConPeriodos(periodosModulos || []);
    } catch (error) {
      console.error('Error fetching processed periods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollbackPrincipal = async (numeroMes: number) => {
    setProcessingRollback(`principal-${numeroMes}`);
    try {
      const { data: result, error } = await supabase.rpc('rollback_periodo_principal', {
        p_numero_mes: numeroMes,
        p_admin_id: admin?.id
      });

      if (error) throw error;

      const rollbackResult = result?.[0];
      if (rollbackResult?.success) {
        await fetchPeriodosProcessados();
        onUpdate();
        alert(`Rollback exitoso: ${rollbackResult.message}`);
      } else {
        throw new Error(rollbackResult?.message || 'Error en rollback');
      }
    } catch (error) {
      console.error('Error en rollback principal:', error);
      alert('Error al realizar rollback: ' + (error as Error).message);
    } finally {
      setProcessingRollback(null);
    }
  };

  const handleRollbackModulo = async (moduloId: string, numeroMes: number) => {
    setProcessingRollback(`modulo-${moduloId}-${numeroMes}`);
    try {
      const { data: result, error } = await supabase.rpc('rollback_periodo_modulo', {
        p_modulo_id: moduloId,
        p_numero_mes: numeroMes,
        p_admin_id: admin?.id
      });

      if (error) throw error;

      const rollbackResult = result?.[0];
      if (rollbackResult?.success) {
        await fetchPeriodosProcessados();
        onUpdate();
        alert(`Rollback exitoso: ${rollbackResult.message}`);
      } else {
        throw new Error(rollbackResult?.message || 'Error en rollback');
      }
    } catch (error) {
      console.error('Error en rollback de módulo:', error);
      alert('Error al realizar rollback: ' + (error as Error).message);
    } finally {
      setProcessingRollback(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <RotateCcw className="w-6 h-6 mr-3" />
          Sistema de Rollback de Períodos
        </h3>
        
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <h4 className="text-orange-200 font-semibold mb-2">¿Qué hace el Rollback?</h4>
          <ul className="text-orange-100 text-sm space-y-1">
            <li>• Elimina todas las ganancias distribuidas del período seleccionado</li>
            <li>• Elimina las notificaciones de ganancias enviadas a usuarios</li>
            <li>• Recalcula automáticamente los saldos de todos los usuarios</li>
            <li>• Envía notificación de reversión a usuarios afectados</li>
            <li>• Marca el período como no procesado (si no se elimina)</li>
          </ul>
        </div>
      </div>

      {/* Períodos Principales */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h4 className="text-lg font-bold text-white mb-4">
          Períodos Principales Procesados ({periodosProcessados.length})
        </h4>
        
        {periodosProcessados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/70">No hay períodos principales procesados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {periodosProcessados.map((periodo) => (
              <div key={periodo.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-white font-semibold">{periodo.nombre_mes}</h5>
                    <div className="text-white/70 text-sm space-y-1">
                      <p>Ganancia bruta: {formatCurrency(periodo.ganancia_bruta)}</p>
                      <p>Procesado: {formatDate(periodo.fecha_procesado)}</p>
                      <p>Período: {formatDate(periodo.fecha_inicio)} - {formatDate(periodo.fecha_fin)}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowConfirmModal({
                      type: 'principal',
                      periodo,
                      action: () => handleRollbackPrincipal(periodo.numero_mes)
                    })}
                    disabled={processingRollback === `principal-${periodo.numero_mes}`}
                    className="flex items-center space-x-2 bg-orange-500/20 text-orange-300 px-4 py-2 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                  >
                    {processingRollback === `principal-${periodo.numero_mes}` ? (
                      <div className="w-4 h-4 border-2 border-orange-300/30 border-t-orange-300 rounded-full animate-spin"></div>
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span>Rollback</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Períodos de Módulos */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h4 className="text-lg font-bold text-white mb-4">
          Períodos de Módulos Procesados ({modulosConPeriodos.length})
        </h4>
        
        {modulosConPeriodos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/70">No hay períodos de módulos procesados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {modulosConPeriodos.map((periodo) => (
              <div key={periodo.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-white font-semibold">
                      {periodo.modulos_independientes?.nombre} - {periodo.nombre_mes}
                    </h5>
                    <div className="text-white/70 text-sm space-y-1">
                      <p>Ganancia bruta: {formatCurrency(periodo.ganancia_bruta)}</p>
                      <p>Procesado: {formatDate(periodo.fecha_procesado)}</p>
                      <p>Período: {formatDate(periodo.fecha_inicio)} - {formatDate(periodo.fecha_fin)}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowConfirmModal({
                      type: 'modulo',
                      periodo,
                      action: () => handleRollbackModulo(periodo.modulo_id, periodo.numero_mes)
                    })}
                    disabled={processingRollback === `modulo-${periodo.modulo_id}-${periodo.numero_mes}`}
                    className="flex items-center space-x-2 bg-orange-500/20 text-orange-300 px-4 py-2 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                  >
                    {processingRollback === `modulo-${periodo.modulo_id}-${periodo.numero_mes}` ? (
                      <div className="w-4 h-4 border-2 border-orange-300/30 border-t-orange-300 rounded-full animate-spin"></div>
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span>Rollback</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <RotateCcw className="w-8 h-8 text-orange-500" />
              <h3 className="text-xl font-bold text-gray-900">Confirmar Rollback</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                ¿Estás seguro de que deseas revertir las ganancias del período{' '}
                <strong>"{showConfirmModal.periodo.nombre_mes}"</strong>
                {showConfirmModal.type === 'modulo' && (
                  <span> del módulo <strong>"{showConfirmModal.periodo.modulos_independientes?.nombre}"</strong></span>
                )}?
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="text-orange-800 font-semibold mb-2">Información del Período:</h4>
                <ul className="text-orange-700 text-sm space-y-1">
                  <li>• Ganancia bruta: {formatCurrency(showConfirmModal.periodo.ganancia_bruta)}</li>
                  <li>• Procesado: {formatDate(showConfirmModal.periodo.fecha_procesado)}</li>
                  <li>• Se eliminarán todas las ganancias distribuidas</li>
                  <li>• Se eliminarán las notificaciones enviadas</li>
                  <li>• Se recalcularán los saldos automáticamente</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  showConfirmModal.action();
                  setShowConfirmModal(null);
                }}
                className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sí, Realizar Rollback</span>
              </button>
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operaciones;

