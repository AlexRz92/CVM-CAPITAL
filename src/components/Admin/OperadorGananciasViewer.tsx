import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { 
  Calculator, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Package, 
  Send, 
  Eye,
  AlertTriangle,
  DollarSign,
  Percent
} from 'lucide-react';

interface GananciaPropuesta {
  id: string;
  modulo_id: string;
  modulo_nombre: string;
  numero_mes: number;
  nombre_mes: string;
  tipo_entrada: 'porcentaje' | 'monto';
  valor_porcentaje?: number;
  valor_monto?: number;
  total_inversion_calculado: number;
  ganancia_bruta_calculada: number;
  notas?: string;
  estado: 'pendiente' | 'procesado' | 'rechazado';
  fecha_propuesta: string;
  propuesto_por: string;
  operador_nombre: string;
  motivo_rechazo?: string;
}

interface OperadorGananciasViewerProps {
  onUpdate: () => void;
}

const OperadorGananciasViewer: React.FC<OperadorGananciasViewerProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [propuestas, setPropuestas] = useState<GananciaPropuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<GananciaPropuesta | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<'pendientes' | 'procesadas'>('pendientes');
  const { modalState, hideModal, showSuccess, showError } = useModal();

  useEffect(() => {
    fetchPropuestas();
  }, []);

  const fetchPropuestas = async () => {
    try {
      const { data, error } = await supabase
        .from('operador_ganancias_propuestas')
        .select(`
          *,
          modulos_independientes (
            nombre
          ),
          propuesto_por_admin:admins!operador_ganancias_propuestas_propuesto_por_fkey (
            nombre
          )
        `)
        .order('fecha_propuesta', { ascending: false });

      if (error) throw error;

      const propuestasConNombres = (data || []).map(propuesta => ({
        ...propuesta,
        modulo_nombre: propuesta.modulos_independientes?.nombre || 'Módulo desconocido',
        operador_nombre: propuesta.propuesto_por_admin?.nombre || 'Operador desconocido'
      }));

      setPropuestas(propuestasConNombres);
    } catch (error) {
      console.error('Error fetching propuestas:', error);
      // En caso de error, mostrar array vacío
      setPropuestas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcesar = async (propuesta: GananciaPropuesta) => {
    if (!admin || admin.role !== 'admin') {
      showError('Sin Permisos', 'Solo los administradores pueden procesar ganancias.');
      return;
    }

    setProcessingId(propuesta.id);
    try {
      // Actualizar estado de la propuesta a procesado
      const { error: updateError } = await supabase
        .from('operador_ganancias_propuestas')
        .update({
          estado: 'procesado',
          fecha_procesado: new Date().toISOString(),
          procesado_por: admin.id
        })
        .eq('id', propuesta.id);

      if (updateError) throw updateError;

      // Procesar las ganancias manualmente
      await procesarGananciasManual(propuesta);

      fetchPropuestas();
      onUpdate();
      showSuccess(
        'Ganancias Procesadas',
        `Las ganancias del módulo ${propuesta.modulo_nombre} - ${propuesta.nombre_mes} han sido procesadas exitosamente.`
      );
    } catch (error) {
      console.error('Error procesando ganancias:', error);
      showError(
        'Error al Procesar',
        'No se pudieron procesar las ganancias: ' + (error as Error).message
      );
    } finally {
      setProcessingId(null);
    }
  };

  const procesarGananciasManual = async (propuesta: GananciaPropuesta) => {
    try {
      // 1. Obtener el período del módulo
      const { data: mesData, error: mesError } = await supabase
        .from('modulo_meses')
        .select('*')
        .eq('modulo_id', propuesta.modulo_id)
        .eq('numero_mes', propuesta.numero_mes)
        .eq('procesado', false)
        .single();

      if (mesError) throw mesError;
      if (!mesData) throw new Error('Período no encontrado o ya procesado');

      // 2. Marcar el período como procesado
      const { error: updateMesError } = await supabase
        .from('modulo_meses')
        .update({
          procesado: true,
          fecha_procesado: new Date().toISOString(),
          total_inversion: propuesta.total_inversion_calculado,
          porcentaje_ganancia: propuesta.tipo_entrada === 'porcentaje' ? propuesta.valor_porcentaje : 
            ((propuesta.ganancia_bruta_calculada / propuesta.total_inversion_calculado) * 100),
          ganancia_bruta: propuesta.ganancia_bruta_calculada,
          procesado_por: admin?.id
        })
        .eq('id', mesData.id);

      if (updateMesError) throw updateMesError;

      // 3. Obtener usuarios asignados al módulo
      const { data: asignaciones, error: asignacionesError } = await supabase
        .from('modulo_asignaciones')
        .select(`
          *,
          inversores (id, nombre, apellido, email),
          partners (id, nombre, username)
        `)
        .eq('modulo_id', propuesta.modulo_id)
        .eq('activo', true);

      if (asignacionesError) throw asignacionesError;

      // 4. Obtener configuración de ganancias
      const { data: config, error: configError } = await supabase
        .from('configuracion_ganancias')
        .select('*')
        .eq('activa', true)
        .single();

      if (configError) {
        console.warn('No se encontró configuración de ganancias, usando valores por defecto');
      }

      const porcentajePartners = config?.porcentaje_partners || 30;
      const porcentajeInversores = config?.porcentaje_inversores || 70;

      // 5. Calcular y distribuir ganancias
      const gananciasPartners = (propuesta.ganancia_bruta_calculada * porcentajePartners) / 100;
      const gananciasInversores = (propuesta.ganancia_bruta_calculada * porcentajeInversores) / 100;

      const partnersActivos = asignaciones?.filter(a => a.partner_id) || [];
      const inversoresActivos = asignaciones?.filter(a => a.inversor_id) || [];

      const gananciaPorPartner = partnersActivos.length > 0 ? gananciasPartners / partnersActivos.length : 0;

      const transaccionesGanancias = [];
      const notificaciones = [];

      // Procesar inversores (ganancia proporcional)
      for (const asignacion of inversoresActivos) {
        if (!asignacion.inversores) continue;

        // Calcular saldo del inversor en el módulo
        const { data: transacciones, error: transError } = await supabase
          .from('modulo_transacciones')
          .select('monto, tipo')
          .eq('modulo_id', propuesta.modulo_id)
          .eq('inversor_id', asignacion.inversor_id)
          .eq('usuario_tipo', 'inversor');

        if (transError) continue;

        let saldoInversor = 0;
        transacciones?.forEach(t => {
          switch (t.tipo.toLowerCase()) {
            case 'deposito':
              saldoInversor += Number(t.monto);
              break;
            case 'retiro':
              saldoInversor -= Number(t.monto);
              break;
            case 'ganancia':
              saldoInversor += Number(t.monto);
              break;
          }
        });

        if (saldoInversor <= 0) continue;

        const proporcion = saldoInversor / propuesta.total_inversion_calculado;
        const gananciaInversor = gananciasInversores * proporcion;

        transaccionesGanancias.push({
          modulo_id: propuesta.modulo_id,
          inversor_id: asignacion.inversor_id,
          usuario_tipo: 'inversor',
          monto: gananciaInversor,
          tipo: 'ganancia',
          descripcion: `Ganancia ${propuesta.nombre_mes} - Módulo ${propuesta.modulo_nombre}`,
          fecha: new Date().toISOString()
        });

        notificaciones.push({
          usuario_id: asignacion.inversor_id,
          tipo_usuario: 'inversor',
          titulo: `Ganancias ${propuesta.nombre_mes} - ${propuesta.modulo_nombre}`,
          mensaje: `Has recibido ${formatCurrency(gananciaInversor)} en ganancias del módulo ${propuesta.modulo_nombre}.`,
          tipo_notificacion: 'success',
          leida: false,
          fecha_creacion: new Date().toISOString()
        });
      }

      // Procesar partners (ganancia fija)
      for (const asignacion of partnersActivos) {
        if (!asignacion.partners) continue;

        transaccionesGanancias.push({
          modulo_id: propuesta.modulo_id,
          partner_id: asignacion.partner_id,
          usuario_tipo: 'partner',
          monto: gananciaPorPartner,
          tipo: 'ganancia',
          descripcion: `Ganancia ${propuesta.nombre_mes} - Módulo ${propuesta.modulo_nombre}`,
          fecha: new Date().toISOString()
        });

        notificaciones.push({
          usuario_id: asignacion.partner_id,
          tipo_usuario: 'partner',
          titulo: `Ganancias ${propuesta.nombre_mes} - ${propuesta.modulo_nombre}`,
          mensaje: `Has recibido ${formatCurrency(gananciaPorPartner)} en ganancias del módulo ${propuesta.modulo_nombre}.`,
          tipo_notificacion: 'success',
          leida: false,
          fecha_creacion: new Date().toISOString()
        });
      }

      // 6. Insertar transacciones y notificaciones
      if (transaccionesGanancias.length > 0) {
        const { error: transError } = await supabase
          .from('modulo_transacciones')
          .insert(transaccionesGanancias);

        if (transError) throw transError;
      }

      if (notificaciones.length > 0) {
        const { error: notifError } = await supabase
          .from('notificaciones')
          .insert(notificaciones);

        if (notifError) throw notifError;
      }

    } catch (error) {
      console.error('Error en procesamiento manual:', error);
      throw error;
    }
  };

  const handleRechazar = async () => {
    if (!showRejectModal || !admin) return;

    setProcessingId(showRejectModal);
    try {
      const { error } = await supabase
        .from('operador_ganancias_propuestas')
        .update({
          estado: 'rechazado',
          fecha_procesado: new Date().toISOString(),
          procesado_por: admin.id,
          motivo_rechazo: rejectReason
        })
        .eq('id', showRejectModal);

      if (error) throw error;

      setShowRejectModal(null);
      setRejectReason('');
      fetchPropuestas();
      onUpdate();
      showSuccess(
        'Propuesta Rechazada',
        'La propuesta ha sido rechazada exitosamente.'
      );
    } catch (error) {
      console.error('Error rechazando propuesta:', error);
      showError(
        'Error al Rechazar',
        'No se pudo rechazar la propuesta.'
      );
    } finally {
      setProcessingId(null);
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

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'procesado':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'rechazado':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
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

  const pendientes = propuestas.filter(p => p.estado === 'pendiente');
  const procesadas = propuestas.filter(p => p.estado !== 'pendiente');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Calculator className="w-6 h-6 mr-3" />
          Propuestas de Ganancias del Operador
        </h3>

        {/* Navegación de tabs */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === 'pendientes'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Pendientes ({pendientes.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('procesadas')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === 'procesadas'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Procesadas ({procesadas.length})</span>
          </button>
        </div>
      </div>

      {/* Propuestas Pendientes */}
      {activeTab === 'pendientes' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-yellow-300" />
            Propuestas Pendientes de Procesamiento ({pendientes.length})
          </h4>
          
          {pendientes.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">No hay propuestas pendientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendientes.map((propuesta) => (
                <div key={propuesta.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <h5 className="text-white font-semibold">
                          {propuesta.modulo_nombre} - {propuesta.nombre_mes}
                        </h5>
                        <p className="text-white/70 text-sm">
                          Propuesto por: {propuesta.operador_nombre}
                        </p>
                        <p className="text-white/60 text-xs">
                          {formatDate(propuesta.fecha_propuesta)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-yellow-300 font-bold text-lg">
                        {formatCurrency(propuesta.ganancia_bruta_calculada)}
                      </p>
                      <p className="text-white/70 text-sm">
                        {propuesta.tipo_entrada === 'porcentaje' 
                          ? `${propuesta.valor_porcentaje}%`
                          : 'Monto fijo'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/10 rounded p-3">
                      <p className="text-white/70 text-sm">Total Inversión</p>
                      <p className="text-white font-semibold">{formatCurrency(propuesta.total_inversion_calculado)}</p>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <p className="text-white/70 text-sm">Tipo de Entrada</p>
                      <p className="text-white font-semibold flex items-center space-x-1">
                        {propuesta.tipo_entrada === 'porcentaje' ? (
                          <>
                            <Percent className="w-4 h-4" />
                            <span>Porcentaje</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            <span>Monto Fijo</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded p-3">
                      <p className="text-white/70 text-sm">Valor Propuesto</p>
                      <p className="text-white font-semibold">
                        {propuesta.tipo_entrada === 'porcentaje' 
                          ? `${propuesta.valor_porcentaje}%`
                          : formatCurrency(propuesta.valor_monto || 0)
                        }
                      </p>
                    </div>
                  </div>

                  {propuesta.notas && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mb-4">
                      <p className="text-blue-200 text-sm">
                        <strong>Notas del operador:</strong> {propuesta.notas}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowDetailsModal(propuesta)}
                      className="flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver Detalles</span>
                    </button>

                    {admin?.role === 'admin' && (
                      <>
                        <button
                          onClick={() => handleProcesar(propuesta)}
                          disabled={processingId === propuesta.id}
                          className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          <span>Procesar</span>
                        </button>
                        
                        <button
                          onClick={() => setShowRejectModal(propuesta.id)}
                          disabled={processingId === propuesta.id}
                          className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Rechazar</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Propuestas Procesadas */}
      {activeTab === 'procesadas' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-6 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
            Propuestas Procesadas ({procesadas.length})
          </h4>
          
          {procesadas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70">No hay propuestas procesadas</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {procesadas.map((propuesta) => (
                <div key={propuesta.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      
                      <div>
                        <h5 className="text-white font-medium">
                          {propuesta.modulo_nombre} - {propuesta.nombre_mes}
                        </h5>
                        <p className="text-white/70 text-sm">
                          Por: {propuesta.operador_nombre} • {formatCurrency(propuesta.ganancia_bruta_calculada)}
                        </p>
                        <p className="text-white/60 text-xs">
                          {formatDate(propuesta.fecha_propuesta)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(propuesta.estado)}`}>
                        {propuesta.estado.toUpperCase()}
                      </span>
                      
                      <button
                        onClick={() => setShowDetailsModal(propuesta)}
                        className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {propuesta.motivo_rechazo && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-sm">
                        <strong>Motivo de rechazo:</strong> {propuesta.motivo_rechazo}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de detalles */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Detalles de Propuesta</h3>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Información del Módulo */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Información del Módulo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Módulo:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.modulo_nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Período:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.nombre_mes}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Número de Mes:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.numero_mes}</span>
                  </div>
                  {showDetailsModal.semana && (
                    <div>
                      <span className="text-gray-600">Semana:</span>
                      <span className="ml-2 font-medium">{showDetailsModal.semana}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Propuesto por:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.operador_nombre}</span>
                  </div>
                </div>
              </div>

              {/* Cálculos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Cálculos de Ganancia</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-100 rounded p-3">
                    <p className="text-blue-800 text-sm font-medium">Total Inversión del Módulo</p>
                    <p className="text-blue-900 font-bold text-lg">{formatCurrency(showDetailsModal.total_inversion_calculado)}</p>
                  </div>
                  <div className="bg-green-100 rounded p-3">
                    <p className="text-green-800 text-sm font-medium">Ganancia Bruta Calculada</p>
                    <p className="text-green-900 font-bold text-lg">{formatCurrency(showDetailsModal.ganancia_bruta_calculada)}</p>
                  </div>
                  <div className="bg-yellow-100 rounded p-3">
                    <p className="text-yellow-800 text-sm font-medium">Tipo de Entrada</p>
                    <p className="text-yellow-900 font-bold">
                      {showDetailsModal.tipo_entrada === 'porcentaje' ? 'Porcentaje' : 'Monto Fijo'}
                    </p>
                  </div>
                  <div className="bg-purple-100 rounded p-3">
                    <p className="text-purple-800 text-sm font-medium">Valor Propuesto</p>
                    <p className="text-purple-900 font-bold">
                      {showDetailsModal.tipo_entrada === 'porcentaje' 
                        ? `${showDetailsModal.valor_porcentaje}%`
                        : formatCurrency(showDetailsModal.valor_monto || 0)
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {showDetailsModal.notas && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Notas del Operador</h4>
                  <p className="text-gray-700 text-sm">{showDetailsModal.notas}</p>
                </div>
              )}

              {/* Estado */}
              <div className="flex items-center justify-center">
                <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(showDetailsModal.estado)}`}>
                  {showDetailsModal.estado.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de rechazo */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rechazar Propuesta</h3>
            <p className="text-gray-600 mb-4">
              Por favor, indica el motivo del rechazo:
            </p>
            
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Motivo del rechazo..."
              required
            />
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleRechazar}
                disabled={!rejectReason.trim() || processingId === showRejectModal}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === showRejectModal ? 'Procesando...' : 'Rechazar'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
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

export default OperadorGananciasViewer;