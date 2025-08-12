import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModulo } from '../../contexts/ModuloContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePartner } from '../../contexts/PartnerContext';
import { supabase } from '../../config/supabase';
import { Header } from '../Layout';
import { SocioHeader } from '../Socio';
import { ModuloStatsCards, ModuloMonthlyChart, ModuloDonutChart, ModuloTransactionsTable, ModuloSolicitudButtons } from './';
import { PDFExporter, HelpChat, FloatingNotificationBell, FloatingTransferButton } from '../Dashboard';
import { Package, Home, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { DollarSign } from 'lucide-react';

interface Transaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
}

const ModuloDashboard: React.FC = () => {
  const { modulos, moduloActual, setModuloActual, verificarAcceso } = useModulo();
  const { user } = useAuth();
  const { partner } = usePartner();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modulosAccesibles, setModulosAccesibles] = useState<string[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);

  useEffect(() => {
    if ((user || partner) && modulos.length > 0) {
      verificarAccesoModulos();
    }
  }, [user, partner, modulos]);

  useEffect(() => {
    if (moduloActual && (user || partner)) {
      fetchTransactions();
    } else {
      setLoading(false);
    }
  }, [moduloActual, user, partner]);

  const verificarAccesoModulos = async () => {
    if (!user && !partner) return;
    
    setLoadingAccess(true);
    try {
      const accesos = await Promise.all(
        modulos.map(async (modulo) => {
          const tieneAcceso = await verificarAcceso(
            modulo.id,
            user?.id || partner?.id || '',
            user ? 'inversor' : 'partner'
          );
          return tieneAcceso ? modulo.id : null;
        })
      );
      
      const modulosConAcceso = accesos.filter(Boolean) as string[];
      setModulosAccesibles(modulosConAcceso);
      
      // Si no hay módulo actual seleccionado y hay módulos accesibles, seleccionar el primero
      if (!moduloActual && modulosConAcceso.length > 0) {
        const primerModulo = modulos.find(m => modulosConAcceso.includes(m.id));
        if (primerModulo) {
          setModuloActual(primerModulo);
        }
      }
    } catch (error) {
      console.error('Error verificando acceso a módulos:', error);
    } finally {
      setLoadingAccess(false);
    }
  };

  const fetchTransactions = async () => {
    if (!moduloActual) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('modulo_transacciones')
        .select('*')
        .eq('modulo_id', moduloActual.id)
        .eq(user ? 'inversor_id' : 'partner_id', user?.id || partner?.id)
        .eq('usuario_tipo', user ? 'inversor' : 'partner')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching module transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMainDashboard = () => {
    if (user) {
      setModuloActual(null);
      navigate('/dashboard');
    } else if (partner) {
      setModuloActual(null);
      navigate('/socio');
    }
  };

  const handleSelectModulo = (modulo: any) => {
    setModuloActual(modulo);
    // Actualizar el módulo actual en el contexto
  };

  const modulosDisponibles = modulos.filter(m => modulosAccesibles.includes(m.id));
  
  // Debug para verificar módulos
  console.log('ModuloDashboard - Módulos disponibles:', modulosDisponibles);
  console.log('ModuloDashboard - Módulos accesibles:', modulosAccesibles);

  if (loadingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800">
      {user ? <Header /> : <SocioHeader />}
      
      <div className="flex">
        {/* Sidebar Navigation - Fijo en el lateral izquierdo */}
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
                <h2 className="text-xl font-bold text-white mb-1">Navegación de Módulos</h2>
                <p className="text-white/70 text-sm">Selecciona un módulo o dashboard</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-2">
            {/* Dashboard Principal - NO seleccionado cuando estamos en módulo */}
            <button
              onClick={handleMainDashboard}
              className="w-full flex items-center justify-start px-3 py-3 rounded-lg transition-all duration-200 group relative text-white/80 hover:bg-white/15 hover:text-white"
              title={sidebarCollapsed ? 'Resumen General' : ''}
            >
              <div className="flex items-center space-x-3">
                <Home className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">Resumen General</div>
                    <div className="text-xs text-white/60">Vista consolidada de módulos</div>
                  </div>
                )}
              </div>

              {/* Tooltip for collapsed state */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  Resumen General
                </div>
              )}
            </button>

            {/* C.V.M Capital */}
            <button
              onClick={() => {
                if (user) {
                  navigate('/dashboard');
                } else if (partner) {
                  navigate('/socio');
                }
              }}
              className="w-full flex items-center justify-start px-3 py-3 rounded-lg transition-all duration-200 group relative text-white/80 hover:bg-white/15 hover:text-white"
              title={sidebarCollapsed ? 'C.V.M Capital' : ''}
            >
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">C.V.M Capital</div>
                    <div className="text-xs text-white/60">Dashboard principal de inversión</div>
                  </div>
                )}
              </div>

              {/* Tooltip for collapsed state */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  C.V.M Capital
                </div>
              )}
            </button>

            {/* Módulos */}
            {modulosDisponibles.map((modulo) => (
              <button
                key={modulo.id}
                onClick={() => handleSelectModulo(modulo)}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                  moduloActual?.id === modulo.id
                    ? 'bg-white/25 text-white shadow-lg border border-white/40'
                    : 'text-white/80 hover:bg-white/15 hover:text-white'
                }`}
                title={sidebarCollapsed ? modulo.nombre : ''}
              >
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{modulo.nombre}</div>
                      {modulo.descripcion && (
                        <div className="text-xs text-white/60">{modulo.descripcion}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {modulo.nombre}
                    {modulo.descripcion && (
                      <div className="text-xs text-gray-300">{modulo.descripcion}</div>
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
                  <div className="font-medium mb-1">Módulos Disponibles</div>
                  <div>{modulosDisponibles.length} módulo(s) asignado(s)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {!moduloActual ? (
            // Vista cuando no hay módulo seleccionado - Mostrar opciones
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Selecciona una Opción</h2>
              <p className="text-white/80 mb-8">Elige el dashboard principal o un módulo específico.</p>
              
              <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-cyan-200/30">
                <h3 className="text-xl font-bold text-white mb-6">Opciones Disponibles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Dashboard Principal */}
                  <button
                    onClick={handleMainDashboard}
                    className="bg-white/10 hover:bg-white/20 rounded-lg p-4 border border-white/20 transition-all duration-200 hover:scale-105"
                  >
                    <Home className="w-8 h-8 text-white mb-3 mx-auto" />
                    <h4 className="text-white font-semibold mb-2">Resumen General</h4>
                    <p className="text-white/70 text-sm">Vista consolidada de módulos</p>
                  </button>
                  
                  {/* C.V.M Capital */}
                  <button
                    onClick={() => {
                      if (user) {
                        navigate('/dashboard');
                      } else if (partner) {
                        navigate('/socio');
                      }
                    }}
                    className="bg-white/10 hover:bg-white/20 rounded-lg p-4 border border-white/20 transition-all duration-200 hover:scale-105"
                  >
                    <DollarSign className="w-8 h-8 text-white mb-3 mx-auto" />
                    <h4 className="text-white font-semibold mb-2">C.V.M Capital</h4>
                    <p className="text-white/70 text-sm">Dashboard principal de inversión</p>
                  </button>
                  
                  {/* Módulos Disponibles */}
                  {modulosDisponibles.map((modulo) => (
                    <button
                      key={modulo.id}
                      onClick={() => handleSelectModulo(modulo)}
                      className="bg-white/10 hover:bg-white/20 rounded-lg p-4 border border-white/20 transition-all duration-200 hover:scale-105"
                    >
                      <Package className="w-8 h-8 text-white mb-3 mx-auto" />
                      <h4 className="text-white font-semibold mb-2">{modulo.nombre}</h4>
                      {modulo.descripcion && (
                        <p className="text-white/70 text-sm">{modulo.descripcion}</p>
                      )}
                    </button>
                  ))}
                </div>
                
                {modulosDisponibles.length === 0 && (
                  <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-200 text-sm">
                      No tienes módulos asignados. Contacta al administrador para acceder a módulos específicos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Vista del módulo seleccionado
            <>
              {/* Título del Dashboard */}
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-2 tracking-wide uppercase">
                  {moduloActual.nombre} - REPORTE DE GANANCIAS
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-cyan-200 to-white mx-auto rounded-full"></div>
                {moduloActual.descripcion && (
                  <p className="text-white/80 mt-2">{moduloActual.descripcion}</p>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Botones de Solicitud */}
                  <ModuloSolicitudButtons moduloId={moduloActual.id} />

                  {/* Botón de Exportar PDF */}
                  <div className="flex justify-center">
                    <PDFExporter 
                      userId={user?.id || partner?.id || ''} 
                      userName={user ? `${user.nombre} ${user.apellido}` : partner?.nombre || ''}
                      userType={user ? 'inversor' : 'partner'}
                    />
                  </div>

                  {/* Tarjetas de Estadísticas */}
                  <ModuloStatsCards moduloId={moduloActual.id} />

                  {/* Gráficos */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ModuloMonthlyChart moduloId={moduloActual.id} />
                    <ModuloDonutChart moduloId={moduloActual.id} />
                  </div>

                  {/* Tabla de Transacciones */}
                  <ModuloTransactionsTable transactions={transactions} />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Chat de Ayuda */}
      <FloatingTransferButton 
        userId={user?.id || partner?.id} 
        userType={user ? 'inversor' : 'partner'} 
        showPanel={showTransferPanel}
        setShowPanel={setShowTransferPanel}
        setShowOtherPanels={() => {
          setShowNotificationsPanel(false);
          setShowHelpChat(false);
        }}
      />
      <FloatingNotificationBell 
        userId={user?.id || partner?.id} 
        userType={user ? 'inversor' : 'partner'} 
        showPanel={showNotificationsPanel}
        setShowPanel={setShowNotificationsPanel}
        setShowOtherPanels={() => {
          setShowTransferPanel(false);
          setShowHelpChat(false);
        }}
      />
      <HelpChat 
        userId={user?.id || partner?.id} 
        userType={user ? 'inversor' : 'partner'} 
        showChat={showHelpChat}
        setShowChat={setShowHelpChat}
        setShowOtherPanels={() => {
          setShowTransferPanel(false);
          setShowNotificationsPanel(false);
        }}
      />
    </div>
  );
};

export default ModuloDashboard;
