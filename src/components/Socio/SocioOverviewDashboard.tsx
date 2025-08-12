import React, { useEffect, useState } from 'react';
import { usePartner } from '../../contexts/PartnerContext';
import { useModulo } from '../../contexts/ModuloContext';
import { supabase } from '../../config/supabase';
import { SocioHeader } from './';
import { HelpChat, FloatingNotificationBell, FloatingTransferButton } from '../Dashboard';
import { PDFExporter } from '../Dashboard';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  PieChart, 
  Activity,
  Target,
  BarChart3,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Users,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

interface ModuloResumen {
  id: string;
  nombre: string;
  descripcion?: string;
  saldo_actual: number;
  total_ganancias: number;
  ultima_ganancia: number;
  fecha_ultima_ganancia?: string;
  rendimiento_porcentaje: number;
  transacciones_totales: number;
  estado: 'activo' | 'inactivo';
}

interface ResumenGeneral {
  saldo_total_modulos: number;
  saldo_principal: number;
  saldo_total_global: number;
  ganancias_totales: number;
  rendimiento_promedio: number;
  modulos_activos: number;
  transacciones_mes_actual: number;
  mejor_modulo: string;
  peor_modulo: string;
  tipo_periodo_display?: string;
  periodos_actuales?: string[];
}

interface ActividadReciente {
  id: string;
  tipo: string;
  monto: number;
  descripcion: string;
  fecha: string;
  modulo_nombre?: string;
}

const SocioOverviewDashboard: React.FC = () => {
  const { partner } = usePartner();
  const { modulos, verificarAcceso } = useModulo();
  const navigate = useNavigate();
  const [modulosResumen, setModulosResumen] = useState<ModuloResumen[]>([]);
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneral | null>(null);
  const [actividadReciente, setActividadReciente] = useState<ActividadReciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modulosAccesibles, setModulosAccesibles] = useState<string[]>([]);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);

  useEffect(() => {
    if (partner && modulos.length > 0) {
      verificarAccesoYCargarDatos();
    }
  }, [partner, modulos]);

  const verificarAccesoYCargarDatos = async () => {
    if (!partner) return;
    
    try {
      // Verificar acceso a módulos
      const accesos = await Promise.all(
        modulos.map(async (modulo) => {
          const tieneAcceso = await verificarAcceso(modulo.id, partner.id, 'partner');
          return tieneAcceso ? modulo.id : null;
        })
      );
      
      const modulosConAcceso = accesos.filter(Boolean) as string[];
      setModulosAccesibles(modulosConAcceso);
      
      console.log('Partner - Módulos con acceso encontrados:', modulosConAcceso);
      
      // Cargar datos de resumen
      await Promise.all([
        cargarResumenModulos(modulosConAcceso),
        cargarActividadReciente(modulosConAcceso),
        cargarResumenGeneral(modulosConAcceso)
      ]);
    } catch (error) {
      console.error('Error cargando datos del dashboard de socio:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleModuloSelect = (modulo: any) => {
    navigate('/socio-modulo');
  };

  const cargarResumenModulos = async (modulosIds: string[]) => {
    if (!partner || modulosIds.length === 0) {
      setModulosResumen([]);
      return;
    }

    try {
      const resumenPromises = modulosIds.map(async (moduloId) => {
        const modulo = modulos.find(m => m.id === moduloId);
        if (!modulo) return null;

        // Obtener transacciones del módulo
        const { data: transacciones, error } = await supabase
          .from('modulo_transacciones')
          .select('monto, tipo, fecha, descripcion')
          .eq('modulo_id', moduloId)
          .eq('partner_id', partner.id)
          .eq('usuario_tipo', 'partner')
          .order('fecha', { ascending: false });

        if (error) throw error;

        // Calcular métricas
        let saldo_actual = 0;
        let total_ganancias = 0;
        let ultima_ganancia = 0;
        let fecha_ultima_ganancia: string | undefined;
        let depositos_totales = 0;

        const ganancias = transacciones?.filter(t => t.tipo === 'ganancia') || [];
        
        transacciones?.forEach(t => {
          switch (t.tipo.toLowerCase()) {
            case 'deposito':
              saldo_actual += Number(t.monto);
              depositos_totales += Number(t.monto);
              break;
            case 'retiro':
              saldo_actual -= Number(t.monto);
              break;
            case 'ganancia':
              saldo_actual += Number(t.monto);
              total_ganancias += Number(t.monto);
              break;
          }
        });

        if (ganancias.length > 0) {
          ultima_ganancia = Number(ganancias[0].monto);
          fecha_ultima_ganancia = ganancias[0].fecha;
        }

        const rendimiento_porcentaje = depositos_totales > 0 
          ? (total_ganancias / depositos_totales) * 100 
          : 0;

        return {
          id: moduloId,
          nombre: modulo.nombre,
          descripcion: modulo.descripcion,
          saldo_actual,
          total_ganancias,
          ultima_ganancia,
          fecha_ultima_ganancia,
          rendimiento_porcentaje,
          transacciones_totales: transacciones?.length || 0,
          estado: saldo_actual > 0 ? 'activo' : 'inactivo'
        } as ModuloResumen;
      });

      const resultados = await Promise.all(resumenPromises);
      setModulosResumen(resultados.filter(Boolean) as ModuloResumen[]);
    } catch (error) {
      console.error('Error cargando resumen de módulos de socio:', error);
      setModulosResumen([]);
    }
  };

  const cargarResumenGeneral = async (modulosIds: string[]) => {
    if (!partner) return;

    try {
      // Primero cargar los datos de módulos si no están disponibles
      let modulosData = modulosResumen;
      if (modulosData.length === 0 && modulosIds.length > 0) {
        // Recalcular módulos si no están cargados
        const resumenPromises = modulosIds.map(async (moduloId) => {
          const modulo = modulos.find(m => m.id === moduloId);
          if (!modulo) return null;

          const { data: transacciones, error } = await supabase
            .from('modulo_transacciones')
            .select('monto, tipo, fecha, descripcion')
            .eq('modulo_id', moduloId)
            .eq('partner_id', partner.id)
            .eq('usuario_tipo', 'partner')
            .order('fecha', { ascending: false });

          if (error) throw error;

          let saldo_actual = 0;
          let total_ganancias = 0;
          let ultima_ganancia = 0;
          let fecha_ultima_ganancia: string | undefined;
          let depositos_totales = 0;

          const ganancias = transacciones?.filter(t => t.tipo === 'ganancia') || [];
          
          transacciones?.forEach(t => {
            switch (t.tipo.toLowerCase()) {
              case 'deposito':
                saldo_actual += Number(t.monto);
                depositos_totales += Number(t.monto);
                break;
              case 'retiro':
                saldo_actual -= Number(t.monto);
                break;
              case 'ganancia':
                saldo_actual += Number(t.monto);
                total_ganancias += Number(t.monto);
                break;
            }
          });

          if (ganancias.length > 0) {
            ultima_ganancia = Number(ganancias[0].monto);
            fecha_ultima_ganancia = ganancias[0].fecha;
          }

          const rendimiento_porcentaje = depositos_totales > 0 
            ? (total_ganancias / depositos_totales) * 100 
            : 0;

          return {
            id: moduloId,
            nombre: modulo.nombre,
            descripcion: modulo.descripcion,
            saldo_actual,
            total_ganancias,
            ultima_ganancia,
            fecha_ultima_ganancia,
            rendimiento_porcentaje,
            transacciones_totales: transacciones?.length || 0,
            estado: saldo_actual > 0 ? 'activo' : 'inactivo'
          } as ModuloResumen;
        });

        const resultados = await Promise.all(resumenPromises);
        modulosData = resultados.filter(Boolean) as ModuloResumen[];
      }

      // Obtener saldo del módulo C.V.M Capital (módulo principal)
      const moduloCVMCapital = modulos.find(m => m.nombre === 'C.V.M Capital');
      let saldo_principal = 0;
      
      if (moduloCVMCapital) {
        const { data: transaccionesPrincipales, error: errorPrincipal } = await supabase
          .from('modulo_transacciones')
          .select('monto, tipo')
          .eq('modulo_id', moduloCVMCapital.id)
          .eq('partner_id', partner.id)
          .eq('usuario_tipo', 'partner');

        if (errorPrincipal) throw errorPrincipal;

        transaccionesPrincipales?.forEach(t => {
          switch (t.tipo.toLowerCase()) {
            case 'deposito':
              saldo_principal += Number(t.monto);
              break;
            case 'retiro':
              saldo_principal -= Number(t.monto);
              break;
            case 'ganancia':
              saldo_principal += Number(t.monto);
              break;
          }
        });
      }

      // Calcular totales de módulos
      const saldo_total_modulos = modulosData.filter(m => m.estado === 'activo' && m.nombre !== 'C.V.M Capital').reduce((sum, m) => sum + m.saldo_actual, 0);
      const ganancias_totales = modulosData.reduce((sum, m) => sum + m.total_ganancias, 0);
      
      // Obtener información de períodos de los módulos
      const periodosInfo = await Promise.all(
        modulosData.map(async (modulo) => {
          // Obtener el período más reciente del módulo (procesado o no procesado)
          const { data: mesActual, error } = await supabase
            .from('modulo_meses')
            .select('numero_mes, nombre_mes, tipo_periodo')
            .eq('modulo_id', modulo.id)
            .order('numero_mes', { ascending: false })
            .limit(1);
          
          if (error || !mesActual || mesActual.length === 0) {
            return { 
              moduloId: modulo.id, 
              nombre: modulo.nombre,
              periodoActual: null 
            };
          }

          const mes = mesActual[0];
          let periodoTexto = '';
          
          if (mes.tipo_periodo === 'semanal') {
            periodoTexto = `${modulo.nombre} ${mes.nombre_mes}`;
          } else {
            periodoTexto = `${modulo.nombre} Mes ${mes.numero_mes}`;
          }
          
          return {
            moduloId: modulo.id,
            nombre: modulo.nombre,
            periodoActual: periodoTexto
          };
        })
      );
      
      // Obtener períodos actuales de módulos con períodos activos
      const periodosActuales = periodosInfo
        .filter(info => info.periodoActual)
        .map(info => info.periodoActual) as string[];

      // Encontrar mejor y peor módulo
      const modulosConGanancias = modulosData.filter(m => m.total_ganancias > 0);
      const mejor_modulo = modulosConGanancias.length > 0 
        ? modulosConGanancias.reduce((prev, current) => 
            prev.rendimiento_porcentaje > current.rendimiento_porcentaje ? prev : current
          ).nombre
        : 'N/A';

      const peor_modulo = modulosConGanancias.length > 1 
        ? modulosConGanancias.reduce((prev, current) => 
            prev.rendimiento_porcentaje < current.rendimiento_porcentaje ? prev : current
          ).nombre
        : 'N/A';

      const transacciones_mes_actual = modulosData.reduce((sum, m) => sum + m.transacciones_totales, 0);

      setResumenGeneral({
        saldo_total_modulos,
        saldo_principal,
        saldo_total_global: saldo_principal + saldo_total_modulos,
        ganancias_totales,
        rendimiento_promedio: 0, // Ya no se usa
        modulos_activos: modulosData.filter(m => m.estado === 'activo').length,
        transacciones_mes_actual,
        mejor_modulo,
        peor_modulo,
        periodos_actuales: periodosActuales
      });
    } catch (error) {
      console.error('Error cargando resumen general de socio:', error);
    }
  };

  const cargarActividadReciente = async (modulosIds: string[]) => {
    if (!partner) return;

    try {
      const actividades: ActividadReciente[] = [];

      // Actividad del dashboard principal
      const { data: transaccionesPrincipales, error: errorPrincipal } = await supabase
        .from('transacciones')
        .select('id, monto, tipo, fecha, descripcion')
        .eq('partner_id', partner.id)
        .eq('usuario_tipo', 'partner')
        .order('fecha', { ascending: false })
        .limit(5);

      if (!errorPrincipal && transaccionesPrincipales) {
        transaccionesPrincipales.forEach(t => {
          actividades.push({
            id: t.id,
            tipo: t.tipo,
            monto: t.monto,
            descripcion: t.descripcion || `${t.tipo} en dashboard principal`,
            fecha: t.fecha,
            modulo_nombre: 'C.V.M Capital'
          });
        });
      }

      // Actividad de módulos
      for (const moduloId of modulosIds) {
        const modulo = modulos.find(m => m.id === moduloId);
        if (!modulo) continue;

        const { data: transaccionesModulo, error } = await supabase
          .from('modulo_transacciones')
          .select('id, monto, tipo, fecha, descripcion')
          .eq('modulo_id', moduloId)
          .eq('partner_id', partner.id)
          .eq('usuario_tipo', 'partner')
          .order('fecha', { ascending: false })
          .limit(3);

        if (!error && transaccionesModulo) {
          transaccionesModulo.forEach(t => {
            actividades.push({
              id: `${moduloId}-${t.id}`,
              tipo: t.tipo,
              monto: t.monto,
              descripcion: t.descripcion || `${t.tipo} en ${modulo.nombre}`,
              fecha: t.fecha,
              modulo_nombre: modulo.nombre
            });
          });
        }
      }

      // Ordenar por fecha y tomar las 10 más recientes
      actividades.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setActividadReciente(actividades.slice(0, 10));
    } catch (error) {
      console.error('Error cargando actividad reciente de socio:', error);
      setActividadReciente([]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'deposito':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'retiro':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      case 'ganancia':
        return <TrendingUp className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'deposito':
        return 'text-green-600';
      case 'retiro':
        return 'text-red-600';
      case 'ganancia':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!partner) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800">
        <SocioHeader />
        <main className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800">
      <SocioHeader />
      <main className="p-6">
        {/* Título del Dashboard */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide uppercase">
            RESUMEN GENERAL DE INVERSIONES - SOCIO
          </h1>
          
        </div>

        {/* Botón de Exportar PDF */}
        <div className="flex justify-center mb-8">
          <PDFExporter 
            userId={partner.id} 
            userName={partner.nombre}
            userType="partner"
          />
        </div>
        
        
        {/* Métricas Principales */}
        {resumenGeneral && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Saldo Total Global */}
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-purple-200/30 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/90 font-medium">Saldo Total</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-white">{formatCurrency(resumenGeneral.saldo_total_global)}</p>
                <p className="text-xs text-white/70">Suma de todos los módulos</p>
              </div>
            </div>

            {/* Ganancias Totales */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-green-200/30 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/90 font-medium">Ganancias Totales</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-white">{formatCurrency(resumenGeneral.ganancias_totales)}</p>
                <p className="text-xs text-white/70">De todos los módulos</p>
              </div>
            </div>

            {/* Rendimiento Promedio */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-yellow-200/30 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/90 font-medium">Períodos Actuales</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  {resumenGeneral.periodos_actuales && resumenGeneral.periodos_actuales.length > 0 ? (
                    resumenGeneral.periodos_actuales.map((periodo, index) => (
                      <p key={index} className="text-sm font-bold text-white">
                        {periodo}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-white/70">Sin períodos activos</p>
                  )}
                </div>
              </div>
            </div>

            {/* Módulos Activos */}
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-blue-200/30 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/90 font-medium">Módulos Activos</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-white">{resumenGeneral.modulos_activos}</p>
                <p className="text-xs text-white/70">de {modulosResumen.length} asignados</p>
              </div>
            </div>
          </div>
        )}

        {/* Resumen por Módulos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Lista de Módulos */}
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Package className="w-6 h-6 mr-3" />
              Resumen por Módulos ({modulosResumen.length})
            </h3>
            
            {modulosResumen.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/70">No tienes módulos asignados</p>
                <p className="text-white/50 text-sm mt-2">Contacta al administrador para acceder a módulos</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {modulosResumen.map((modulo) => (
                  <div key={modulo.id} className="bg-white/10 rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold">{modulo.nombre}</h4>
                        {modulo.descripcion && (
                          <p className="text-white/70 text-sm">{modulo.descripcion}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        modulo.estado === 'activo' 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                      }`}>
                        {modulo.estado.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/70">Saldo Actual</p>
                        <p className="text-white font-bold">{formatCurrency(modulo.saldo_actual)}</p>
                      </div>
                      <div>
                        <p className="text-white/70">Ganancias Totales</p>
                        <p className="text-white font-bold">{formatCurrency(modulo.total_ganancias)}</p>
                      </div>
                      <div>
                        <p className="text-white/70">Rendimiento</p>
                        <p className="text-white font-bold">{modulo.rendimiento_porcentaje.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-white/70">Transacciones</p>
                        <p className="text-white font-bold">{modulo.transacciones_totales}</p>
                      </div>
                    </div>

                    {modulo.ultima_ganancia > 0 && modulo.fecha_ultima_ganancia && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-white/70 text-xs">Última ganancia:</p>
                        <div className="flex items-center justify-between">
                          <p className="text-white font-semibold">{formatCurrency(modulo.ultima_ganancia)}</p>
                          <p className="text-white/60 text-xs">{formatDate(modulo.fecha_ultima_ganancia)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actividad Reciente */}
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Activity className="w-6 h-6 mr-3" />
              Actividad Reciente
            </h3>
            
            {actividadReciente.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/70">No hay actividad reciente</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {actividadReciente.map((actividad) => (
                  <div key={actividad.id} className="bg-white/10 rounded-lg p-3 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getActivityIcon(actividad.tipo)}
                        <div>
                          <p className="text-white text-sm font-medium">
                            {actividad.descripcion}
                          </p>
                          <p className="text-white/60 text-xs">
                            {actividad.modulo_nombre} • {formatDate(actividad.fecha)}
                          </p>
                        </div>
                      </div>
                      <p className={`font-bold text-sm ${getActivityColor(actividad.tipo)}`}>
                        {formatCurrency(actividad.monto)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Insights y Alertas */}
        {resumenGeneral && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Performance Insights */}
            <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <BarChart3 className="w-6 h-6 mr-3" />
                Insights de Rendimiento
              </h3>
              
              <div className="space-y-4">
                {resumenGeneral.mejor_modulo !== 'N/A' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <h4 className="text-white font-semibold">Mejor Rendimiento</h4>
                    </div>
                    <p className="text-white text-sm">
                      <strong>{resumenGeneral.mejor_modulo}</strong> es tu módulo con mejor rendimiento
                    </p>
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <PieChart className="w-5 h-5 text-blue-400" />
                    <h4 className="text-white font-semibold">Diversificación</h4>
                  </div>
                  <p className="text-white text-sm">
                    Tienes inversiones distribuidas en <strong>{resumenGeneral.modulos_activos} módulos activos</strong>
                  </p>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <h4 className="text-white font-semibold">Ventaja de Socio</h4>
                  </div>
                  <p className="text-white text-sm">
                    Como socio, recibes ganancias proporcionales + ganancias adicionales exclusivas
                  </p>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-yellow-400" />
                    <h4 className="text-white font-semibold">Rendimiento General</h4>
                  </div>
                  <p className="text-white text-sm">
                    Rendimiento promedio de <strong>{((resumenGeneral.ganancias_totales / (resumenGeneral.saldo_total_global - resumenGeneral.ganancias_totales || 1)) * 100).toFixed(1)}%</strong> en tus inversiones
                  </p>
                </div>
              </div>
            </div>

            {/* Distribución de Capital */}
            <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <PieChart className="w-6 h-6 mr-3" />
                Distribución de Capital
              </h3>
              
              <div className="space-y-4">
                {/* Módulos */}
                {modulosResumen.filter(m => m.saldo_actual > 0 && m.nombre !== 'C.V.M Capital').map((modulo) => (
                  <div key={modulo.id} className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">{modulo.nombre}</h4>
                      <p className="text-white font-bold">{formatCurrency(modulo.saldo_actual)}</p>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                        style={{ 
                          width: `${(resumenGeneral.saldo_total_modulos - resumenGeneral.saldo_principal) > 0 ? (modulo.saldo_actual / (resumenGeneral.saldo_total_modulos - resumenGeneral.saldo_principal)) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-white/60 text-xs mt-1">
                      {(resumenGeneral.saldo_total_modulos - resumenGeneral.saldo_principal) > 0 ? ((modulo.saldo_actual / (resumenGeneral.saldo_total_modulos - resumenGeneral.saldo_principal)) * 100).toFixed(1) : 0}% del total de módulos independientes
                    </p>
                  </div>
                ))}

                {/* Mostrar C.V.M Capital por separado */}
                {resumenGeneral.saldo_principal > 0 && (
                  <div className="bg-white/10 rounded-lg p-4 border-2 border-purple-400/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">C.V.M Capital (Principal)</h4>
                      <p className="text-white font-bold">{formatCurrency(resumenGeneral.saldo_principal)}</p>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-600"
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                    <p className="text-white/60 text-xs mt-1">
                      Dashboard principal de inversión
                    </p>
                  </div>
                )}

                {modulosResumen.filter(m => m.saldo_actual > 0 && m.nombre !== 'C.V.M Capital').length === 0 && resumenGeneral.saldo_principal === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/70 text-sm">No hay saldos activos en módulos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </main>

      {/* Componentes flotantes */}
      <FloatingTransferButton 
        userId={partner?.id} 
        userType="partner" 
        showPanel={showTransferPanel}
        setShowPanel={setShowTransferPanel}
        setShowOtherPanels={() => {
          setShowNotificationsPanel(false);
          setShowHelpChat(false);
        }}
      />
      <FloatingNotificationBell 
        userId={partner?.id} 
        userType="partner" 
        showPanel={showNotificationsPanel}
        setShowPanel={setShowNotificationsPanel}
        setShowOtherPanels={() => {
          setShowTransferPanel(false);
          setShowHelpChat(false);
        }}
      />
      <HelpChat 
        userId={partner?.id} 
        userType="partner" 
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

export default SocioOverviewDashboard;
