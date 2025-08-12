import React, { useState, useEffect } from 'react';
import { Users, X, Save, Edit, Mail, Phone, User, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { sanitizeInput, isValidEmail } from '../../utils/validation';

interface BeneficiarioManagerProps {
  userId?: string;
  showPanel?: boolean;
  setShowPanel?: (show: boolean) => void;
  setShowOtherPanels?: () => void;
}

interface BeneficiarioData {
  beneficiario_nombre: string;
  beneficiario_apellido: string;
  beneficiario_telefono: string;
  beneficiario_email: string;
}

interface SolicitudCambio {
  id: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  fecha_solicitud: string;
  motivo_rechazo?: string;
  nuevos_datos: BeneficiarioData;
}

const BeneficiarioManager: React.FC<BeneficiarioManagerProps> = ({ 
  userId, 
  showPanel, 
  setShowPanel,
  setShowOtherPanels 
}) => {
  const [beneficiarioActual, setBeneficiarioActual] = useState<BeneficiarioData | null>(null);
  const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudCambio | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<BeneficiarioData>({
    beneficiario_nombre: '',
    beneficiario_apellido: '',
    beneficiario_telefono: '',
    beneficiario_email: ''
  });
  const { modalState, hideModal, showSuccess, showError } = useModal();

  useEffect(() => {
    if (userId && showPanel) {
      fetchBeneficiarioData();
      fetchSolicitudPendiente();
    }
  }, [userId, showPanel]);

  const fetchBeneficiarioData = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('inversores')
        .select('beneficiario_nombre, beneficiario_apellido, beneficiario_telefono, beneficiario_email')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setBeneficiarioActual(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching beneficiario data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSolicitudPendiente = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('beneficiario_cambios')
        .select('*')
        .eq('inversor_id', userId)
        .eq('estado', 'pendiente')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSolicitudPendiente({
          id: data.id,
          estado: data.estado,
          fecha_solicitud: data.fecha_solicitud,
          motivo_rechazo: data.motivo_rechazo,
          nuevos_datos: {
            beneficiario_nombre: data.nuevo_beneficiario_nombre,
            beneficiario_apellido: data.nuevo_beneficiario_apellido,
            beneficiario_telefono: data.nuevo_beneficiario_telefono,
            beneficiario_email: data.nuevo_beneficiario_email
          }
        });
      }
    } catch (error) {
      console.error('Error fetching solicitud pendiente:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // Validaciones
    if (!formData.beneficiario_nombre.trim() || !formData.beneficiario_apellido.trim()) {
      showError('Datos Incompletos', 'Nombre y apellido del beneficiario son requeridos.');
      return;
    }

    if (!isValidEmail(formData.beneficiario_email)) {
      showError('Email Inválido', 'Por favor ingresa un email válido para el beneficiario.');
      return;
    }

    if (!formData.beneficiario_telefono.trim()) {
      showError('Teléfono Requerido', 'El teléfono del beneficiario es requerido.');
      return;
    }

    setSubmitting(true);
    try {
      // Crear solicitud de cambio de beneficiario
      const { error } = await supabase
        .from('beneficiario_cambios')
        .insert({
          inversor_id: userId,
          beneficiario_actual_nombre: beneficiarioActual?.beneficiario_nombre || '',
          beneficiario_actual_apellido: beneficiarioActual?.beneficiario_apellido || '',
          beneficiario_actual_telefono: beneficiarioActual?.beneficiario_telefono || '',
          beneficiario_actual_email: beneficiarioActual?.beneficiario_email || '',
          nuevo_beneficiario_nombre: sanitizeInput(formData.beneficiario_nombre),
          nuevo_beneficiario_apellido: sanitizeInput(formData.beneficiario_apellido),
          nuevo_beneficiario_telefono: sanitizeInput(formData.beneficiario_telefono),
          nuevo_beneficiario_email: formData.beneficiario_email.toLowerCase(),
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString()
        });

      if (error) throw error;

      setShowEditForm(false);
      fetchSolicitudPendiente();
      showSuccess(
        'Solicitud Enviada',
        'Tu solicitud de cambio de beneficiario ha sido enviada. Será revisada por el administrador.'
      );
    } catch (error) {
      console.error('Error creating beneficiario change request:', error);
      showError(
        'Error al Enviar',
        'No se pudo enviar la solicitud. Inténtalo más tarde.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSolicitud = async () => {
    if (!solicitudPendiente) return;

    try {
      const { error } = await supabase
        .from('beneficiario_cambios')
        .delete()
        .eq('id', solicitudPendiente.id)
        .eq('inversor_id', userId);

      if (error) throw error;

      setSolicitudPendiente(null);
      showSuccess(
        'Solicitud Cancelada',
        'La solicitud de cambio de beneficiario ha sido cancelada.'
      );
    } catch (error) {
      console.error('Error canceling solicitud:', error);
      showError(
        'Error al Cancelar',
        'No se pudo cancelar la solicitud.'
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  if (!showPanel) return null;

  return (
    <>
      {/* Panel de Gestión de Beneficiario */}
      <div className="fixed bottom-16 sm:bottom-24 left-2 sm:left-6 w-[calc(100vw-1rem)] sm:w-96 max-w-sm sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-in slide-in-from-left-4 duration-300 max-h-[70vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-700 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Gestión de Beneficiario</h3>
                <p className="text-xs text-purple-100">Información de emergencia</p>
              </div>
            </div>
            <button
              onClick={() => setShowPanel && setShowPanel(false)}
              className="text-purple-100 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Solicitud Pendiente */}
              {solicitudPendiente && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <h4 className="text-yellow-800 font-semibold">Cambio Pendiente</h4>
                  </div>
                  <p className="text-yellow-700 text-sm mb-3">
                    Tienes una solicitud de cambio de beneficiario pendiente de aprobación.
                  </p>
                  <p className="text-yellow-600 text-xs mb-3">
                    Enviada: {formatDate(solicitudPendiente.fecha_solicitud)}
                  </p>
                  
                  <div className="bg-white rounded p-3 mb-3">
                    <h5 className="text-gray-800 font-medium mb-2">Nuevos datos propuestos:</h5>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Nombre:</strong> {solicitudPendiente.nuevos_datos.beneficiario_nombre} {solicitudPendiente.nuevos_datos.beneficiario_apellido}</p>
                      <p><strong>Email:</strong> {solicitudPendiente.nuevos_datos.beneficiario_email}</p>
                      <p><strong>Teléfono:</strong> {solicitudPendiente.nuevos_datos.beneficiario_telefono}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCancelSolicitud}
                    className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors text-sm"
                  >
                    Cancelar Solicitud
                  </button>
                </div>
              )}

              {/* Información Actual del Beneficiario */}
              {beneficiarioActual && !showEditForm && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-gray-900 font-semibold">Beneficiario Actual</h4>
                    {!solicitudPendiente && (
                      <button
                        onClick={() => setShowEditForm(true)}
                        className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="text-sm">Editar</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{beneficiarioActual.beneficiario_nombre} {beneficiarioActual.beneficiario_apellido}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{beneficiarioActual.beneficiario_email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{beneficiarioActual.beneficiario_telefono}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de Edición */}
              {showEditForm && !solicitudPendiente && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h4 className="text-gray-900 font-semibold">Actualizar Beneficiario</h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Nombre del Beneficiario *
                      </label>
                      <input
                        type="text"
                        name="beneficiario_nombre"
                        value={formData.beneficiario_nombre}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nombre"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Apellido del Beneficiario *
                      </label>
                      <input
                        type="text"
                        name="beneficiario_apellido"
                        value={formData.beneficiario_apellido}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Apellido"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Email del Beneficiario *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          name="beneficiario_email"
                          value={formData.beneficiario_email}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="beneficiario@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Teléfono del Beneficiario *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          name="beneficiario_telefono"
                          value={formData.beneficiario_telefono}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="+1234567890"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-blue-600" />
                      <h5 className="text-blue-800 font-semibold">Información Importante</h5>
                    </div>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Los cambios requieren aprobación del administrador</li>
                      <li>• El beneficiario puede acceder a tu cuenta en caso de emergencia</li>
                      <li>• Asegúrate de que los datos sean correctos</li>
                      <li>• El beneficiario será notificado de este cambio</li>
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Enviar Solicitud</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(false);
                        setFormData(beneficiarioActual || {
                          beneficiario_nombre: '',
                          beneficiario_apellido: '',
                          beneficiario_telefono: '',
                          beneficiario_email: ''
                        });
                      }}
                      disabled={submitting}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Información sobre el sistema */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h5 className="text-purple-800 font-semibold mb-2">¿Qué es un Beneficiario?</h5>
                <p className="text-purple-700 text-sm">
                  El beneficiario es la persona que puede acceder a tu cuenta y fondos en caso de 
                  fallecimiento o incapacidad. Es importante mantener esta información actualizada.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

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
    </>
  );
};

export default BeneficiarioManager;