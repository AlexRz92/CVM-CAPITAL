import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Phone, 
  MessageCircle,
  Globe,
  Settings,
  AlertTriangle,
  Save,
  X
} from 'lucide-react';

interface RegistroSolicitud {
  id: string;
  nombre: string;
  apellido: string;
  telegram_username: string;
  pais: string;
  email: string;
  pregunta_secreta: string;
  respuesta_secreta: string;
  beneficiario_nombre: string;
  beneficiario_apellido: string;
  beneficiario_telefono: string;
  beneficiario_email: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo?: string;
  fecha_solicitud: string;
  notas?: string;
  fecha_procesado?: string;
  procesado_por?: string;
}

interface RegistroSolicitudesManagerProps {
  onUpdate: () => void;
}

const RegistroSolicitudesManager: React.FC<RegistroSolicitudesManagerProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [solicitudes, setSolicitudes] = useState<RegistroSolicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<RegistroSolicitud | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<'pendientes' | 'procesadas'>('pendientes');
  const [registroHabilitado, setRegistroHabilitado] = useState(false);
  const [mensajeRegistro, setMensajeRegistro] = useState('');
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const { modalState, hideModal, showSuccess, showError } = useModal();

  // Función para obtener el conteo de solicitudes pendientes
  const getPendingCount = () => {
    return solicitudes.filter(s => s.estado === 'pendiente').length;
  };

  useEffect(() => {
    fetchSolicitudes();
    fetchConfiguracion();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const { data, error } = await supabase
        .from('registro_solicitudes')
        .select('*')
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error fetching registro solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_registro')
        .select('registro_habilitado, mensaje_registro')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching configuracion:', error);
        // Usar valores por defecto si hay error
        setRegistroHabilitado(false);
        setMensajeRegistro('El registro está temporalmente deshabilitado.');
        return;
      }

      if (data) {
        setRegistroHabilitado(data.registro_habilitado);
        setMensajeRegistro(data.mensaje_registro || '');
      } else {
        // No existe configuración, usar valores por defecto
        setRegistroHabilitado(false);
        setMensajeRegistro('El registro está temporalmente deshabilitado.');
      }
    } catch (error) {
      console.error('Error fetching configuracion registro:', error);
      setRegistroHabilitado(false);
      setMensajeRegistro('El registro está temporalmente deshabilitado.');
    }
  };

  const handleApprove = async (solicitud: RegistroSolicitud) => {
    if (!admin) return;

    setProcessingId(solicitud.id);
    try {
      // Crear el inversor en la tabla inversores
      const { error: createInversorError } = await supabase
        .from('inversores')
        .insert({
          nombre: solicitud.nombre,
          apellido: solicitud.apellido,
          email: solicitud.email,
          pais: solicitud.pais,
          telegram_username: solicitud.telegram_username,
          password_hash: solicitud.password_hash,
          password_salt: solicitud.password_salt,
          pregunta_secreta: solicitud.pregunta_secreta,
          respuesta_secreta: solicitud.respuesta_secreta,
          beneficiario_nombre: solicitud.beneficiario_nombre,
          beneficiario_apellido: solicitud.beneficiario_apellido,
          beneficiario_telefono: solicitud.beneficiario_telefono,
          beneficiario_email: solicitud.beneficiario_email,
          total: 0
        });

      if (createInversorError) throw createInversorError;

      // Actualizar estado de la solicitud
      const { error: updateError } = await supabase
        .from('registro_solicitudes')
        .update({
          estado: 'aprobado',
          fecha_procesado: new Date().toISOString(),
          procesado_por: admin.id
        })
        .eq('id', solicitud.id);

      if (updateError) throw updateError;

      fetchSolicitudes();
      onUpdate();
      showSuccess(
        'Solicitud Aprobada',
        `El registro de ${solicitud.nombre} ${solicitud.apellido} ha sido aprobado exitosamente. El usuario ya puede iniciar sesión.`
      );
    } catch (error: any) {
      console.error('Error approving registration:', error);
      if (error.code === '23505') {
        showError(
          'Error de Duplicado',
          'Este correo ya está registrado en el sistema.'
        );
      } else {
        showError(
          'Error al Aprobar',
          'No se pudo aprobar la solicitud: ' + error.message
        );
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDesbanear = async (solicitudId: string) => {
    if (!admin) return;

    try {
      const { error } = await supabase
        .from('registro_solicitudes')
        .update({
          estado: 'pendiente',
          motivo_rechazo: null,
          fecha_procesado: null,
          procesado_por: null
        })
        .eq('id', solicitudId);

      if (error) throw error;

      fetchSolicitudes();
      onUpdate();
      showSuccess(
        'Solicitud Desbaneada',
        'La solicitud ha sido marcada como pendiente nuevamente.'
      );
    } catch (error) {
      console.error('Error desbaneando solicitud:', error);
      showError(
        'Error al Desbanear',
        'No se pudo desbanear la solicitud.'
      );
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !admin) return;

    setProcessingId(showRejectModal);
    try {
      const { error } = await supabase
        .from('registro_solicitudes')
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
      fetchSolicitudes();
      onUpdate();
      showSuccess(
        'Solicitud Rechazada',
        'La solicitud ha sido rechazada exitosamente.'
      );
    } catch (error) {
      console.error('Error rejecting registration:', error);
      showError(
        'Error al Rechazar',
        'No se pudo rechazar la solicitud.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateConfig = async () => {
    if (!admin) return;

    setUpdatingConfig(true);
    try {
      // Verificar si existe una configuración
      const { data: existingConfig, error: checkError } = await supabase
        .from('configuracion_registro')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (checkError) throw checkError;

      let error;
      if (existingConfig) {
        // Actualizar configuración existente
        const { error: updateError } = await supabase
          .from('configuracion_registro')
          .update({
            registro_habilitado: registroHabilitado,
            mensaje_registro: mensajeRegistro,
            updated_at: new Date().toISOString(),
            updated_by: admin.id
          })
          .eq('id', existingConfig.id);
        error = updateError;
      } else {
        // Crear nueva configuración
        const { error: insertError } = await supabase
          .from('configuracion_registro')
          .insert({
            registro_habilitado: registroHabilitado,
            mensaje_registro: mensajeRegistro,
            updated_at: new Date().toISOString(),
            updated_by: admin.id
          });
        error = insertError;
      }

      if (error) throw error;

      setShowConfigModal(false);
      showSuccess(
        'Configuración Actualizada',
        `El registro público ha sido ${registroHabilitado ? 'habilitado' : 'deshabilitado'} exitosamente.`
      );
    } catch (error) {
      console.error('Error updating config:', error);
      showError(
        'Error de Configuración',
        'No se pudo actualizar la configuración.'
      );
    } finally {
      setUpdatingConfig(false);
    }
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
      case 'aprobado':
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

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const procesadas = solicitudes.filter(s => s.estado !== 'pendiente');

  return (
    <div className="space-y-6">
      {/* Header con configuración */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <UserPlus className="w-6 h-6 text-white" />
              {getPendingCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                  {getPendingCount() > 9 ? '9+' : getPendingCount()}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white">
              Sistema de Registro Público
            </h3>
          </div>
          
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors border border-blue-400/50"
          >
            <Settings className="w-4 h-4" />
            <span>Configurar</span>
          </button>
        </div>

        {/* Estado actual */}
        <div className={`p-4 rounded-lg border ${
          registroHabilitado 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center space-x-2">
            {registroHabilitado ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={`font-semibold ${
              registroHabilitado ? 'text-green-300' : 'text-red-300'
            }`}>
              Registro Público: {registroHabilitado ? 'HABILITADO' : 'DESHABILITADO'}
            </span>
          </div>
          {mensajeRegistro && (
            <p className={`text-sm mt-2 ${
              registroHabilitado ? 'text-green-200' : 'text-red-200'
            }`}>
              {mensajeRegistro}
            </p>
          )}
        </div>

        {/* Navegación de tabs */}
        <div className="flex space-x-4 mt-6">
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

      {/* Solicitudes Pendientes */}
      {activeTab === 'pendientes' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-yellow-300" />
            Solicitudes de Registro Pendientes ({pendientes.length})
          </h4>
          
          {pendientes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendientes.map((solicitud) => (
                <div key={solicitud.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <h5 className="text-white font-semibold">
                          {solicitud.nombre} {solicitud.apellido}
                        </h5>
                        <div className="flex items-center space-x-4 text-sm text-white/70">
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{solicitud.email}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>{solicitud.telegram_username}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span>{solicitud.pais}</span>
                          </span>
                        </div>
                        <p className="text-white/60 text-xs mt-1">
                          Solicitado: {formatDate(solicitud.fecha_solicitud)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowDetailsModal(solicitud)}
                        className="flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Ver Detalles</span>
                      </button>
                      
                      <button
                        onClick={() => handleApprove(solicitud)}
                        disabled={processingId === solicitud.id}
                        className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Aprobar</span>
                      </button>
                      
                      <button
                        onClick={() => setShowRejectModal(solicitud.id)}
                        disabled={processingId === solicitud.id}
                        className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Solicitudes Procesadas */}
      {activeTab === 'procesadas' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-6 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
            Solicitudes Procesadas ({procesadas.length})
          </h4>
          
          {procesadas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70">No hay solicitudes procesadas</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {procesadas.map((solicitud) => (
                <div key={solicitud.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      
                      <div>
                        <h5 className="text-white font-medium">
                          {solicitud.nombre} {solicitud.apellido}
                        </h5>
                        <p className="text-white/70 text-sm">{solicitud.email}</p>
                        <p className="text-white/60 text-xs">
                          Procesado: {solicitud.fecha_procesado ? formatDate(solicitud.fecha_procesado) : formatDate(solicitud.fecha_solicitud)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(solicitud.estado)}`}>
                        {solicitud.estado.toUpperCase()}
                      </span>
                      
                      {solicitud.estado === 'rechazado' && (
                        <button
                          onClick={() => handleDesbanear(solicitud.id)}
                          className="flex items-center space-x-1 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded hover:bg-yellow-500/30 transition-colors text-xs"
                          title="Desbanear y marcar como pendiente"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Desbanear</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => setShowDetailsModal(solicitud)}
                        className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {solicitud.motivo_rechazo && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-sm">
                        <strong>Motivo de rechazo:</strong> {solicitud.motivo_rechazo}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de configuración */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Settings className="w-6 h-6 mr-3 text-blue-600" />
              Configurar Registro Público
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="registro_habilitado"
                  checked={registroHabilitado}
                  onChange={(e) => setRegistroHabilitado(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="registro_habilitado" className="text-gray-700 font-medium">
                  Habilitar registro público
                </label>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Mensaje cuando está deshabilitado
                </label>
                <textarea
                  value={mensajeRegistro}
                  onChange={(e) => setMensajeRegistro(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  placeholder="Mensaje a mostrar cuando el registro esté deshabilitado..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <strong>URL del registro:</strong> {window.location.origin}/registro
                </p>
                <p className="text-blue-700 text-xs mt-1">
                  Comparte este enlace para que los usuarios puedan registrarse
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleUpdateConfig}
                disabled={updatingConfig}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {updatingConfig ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Detalles de Solicitud</h3>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Datos Personales */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Datos Personales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Apellido:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.apellido}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Telegram:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.telegram_username}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">País:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.pais}</span>
                  </div>
                </div>
              </div>

              {/* Datos de Seguridad */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Datos de Seguridad</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Pregunta:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.pregunta_secreta}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Respuesta:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.respuesta_secreta}</span>
                  </div>
                </div>
              </div>

              {/* Datos del Beneficiario */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Datos del Beneficiario</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.beneficiario_nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Apellido:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.beneficiario_apellido}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.beneficiario_telefono}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{showDetailsModal.beneficiario_email}</span>
                  </div>
                </div>
              </div>

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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rechazar Solicitud</h3>
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
                onClick={handleReject}
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

export default RegistroSolicitudesManager;