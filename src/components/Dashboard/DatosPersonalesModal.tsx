import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Globe, MessageCircle, Users, Save, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { sanitizeInput, isValidEmail } from '../../utils/validation';

interface DatosPersonalesModalProps {
  show: boolean;
  onClose: () => void;
  userId: string;
  datosFaltantes: string[];
  onUpdate: () => void;
}

const PAISES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 
  'El Salvador', 'España', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 
  'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela',
  'Estados Unidos', 'Canadá', 'Francia', 'Italia', 'Alemania', 'Reino Unido', 'Otro'
];

const DatosPersonalesModal: React.FC<DatosPersonalesModalProps> = ({
  show,
  onClose,
  userId,
  datosFaltantes,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    pais: '',
    telegram_username: '',
    beneficiario_nombre: '',
    beneficiario_apellido: '',
    beneficiario_telefono: '',
    beneficiario_email: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const { modalState, hideModal, showSuccess, showError } = useModal();

  useEffect(() => {
    // Verificar si el usuario ya cerró el modal en esta sesión
    const dismissed = sessionStorage.getItem(`datos_personales_dismissed_${userId}`);
    if (dismissed === 'true') {
      setUserDismissed(true);
    }
  }, [userId]);

  useEffect(() => {
    if (show && userId) {
      fetchCurrentData();
    }
  }, [show, userId]);

  const fetchCurrentData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inversores')
        .select('pais, telegram_username, beneficiario_nombre, beneficiario_apellido, beneficiario_telefono, beneficiario_email')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setFormData({
        pais: data.pais || '',
        telegram_username: data.telegram_username || '',
        beneficiario_nombre: data.beneficiario_nombre || '',
        beneficiario_apellido: data.beneficiario_apellido || '',
        beneficiario_telefono: data.beneficiario_telefono || '',
        beneficiario_email: data.beneficiario_email || ''
      });
    } catch (error) {
      console.error('Error fetching current data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (datosFaltantes.includes('País') && !formData.pais) {
      showError('Campo Requerido', 'Por favor selecciona tu país.');
      return;
    }

    if (datosFaltantes.includes('Usuario de Telegram') && !formData.telegram_username.trim()) {
      showError('Campo Requerido', 'Por favor ingresa tu usuario de Telegram.');
      return;
    }

    if (datosFaltantes.includes('Email del Beneficiario') && !isValidEmail(formData.beneficiario_email)) {
      showError('Email Inválido', 'Por favor ingresa un email válido para el beneficiario.');
      return;
    }

    // Validar que todos los campos de beneficiario estén completos si se requiere alguno
    const beneficiarioFields = ['Nombre del Beneficiario', 'Apellido del Beneficiario', 'Teléfono del Beneficiario', 'Email del Beneficiario'];
    const beneficiarioRequired = datosFaltantes.some(campo => beneficiarioFields.includes(campo));
    
    if (beneficiarioRequired) {
      if (!formData.beneficiario_nombre.trim() || !formData.beneficiario_apellido.trim() || 
          !formData.beneficiario_telefono.trim() || !formData.beneficiario_email.trim()) {
        showError('Datos Incompletos', 'Por favor completa todos los datos del beneficiario.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const updateData: any = {};
      
      if (datosFaltantes.includes('País')) {
        updateData.pais = formData.pais;
      }
      
      if (datosFaltantes.includes('Usuario de Telegram')) {
        updateData.telegram_username = sanitizeInput(formData.telegram_username);
      }
      
      if (beneficiarioRequired) {
        updateData.beneficiario_nombre = sanitizeInput(formData.beneficiario_nombre);
        updateData.beneficiario_apellido = sanitizeInput(formData.beneficiario_apellido);
        updateData.beneficiario_telefono = sanitizeInput(formData.beneficiario_telefono);
        updateData.beneficiario_email = formData.beneficiario_email.toLowerCase();
      }

      const { error } = await supabase
        .from('inversores')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      showSuccess(
        'Datos Actualizados',
        'Tus datos personales han sido actualizados exitosamente.'
      );
      
      setTimeout(() => {
        hideModal();
        onUpdate();
      }, 2000);
    } catch (error) {
      console.error('Error updating personal data:', error);
      showError(
        'Error al Actualizar',
        'No se pudieron actualizar los datos. Inténtalo más tarde.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDismiss = () => {
    // Guardar en sessionStorage que el usuario cerró el modal
    sessionStorage.setItem(`datos_personales_dismissed_${userId}`, 'true');
    setUserDismissed(true);
    onClose();
  };

  if (!show || userDismissed) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-6">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Cerrar y no mostrar de nuevo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Completar Datos Personales</h3>
            <p className="text-gray-600 mt-2">
              Para mejorar la seguridad de tu cuenta, necesitamos que completes la siguiente información:
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos Faltantes */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h4 className="text-yellow-800 font-semibold">Datos Faltantes</h4>
                </div>
                <ul className="text-yellow-700 text-sm list-disc list-inside">
                  {datosFaltantes.map((dato, index) => (
                    <li key={index}>{dato}</li>
                  ))}
                </ul>
              </div>

              {/* País */}
              {datosFaltantes.includes('País') && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    País *
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select
                      name="pais"
                      value={formData.pais}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecciona tu país</option>
                      {PAISES.map((pais, index) => (
                        <option key={index} value={pais}>
                          {pais}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Usuario de Telegram */}
              {datosFaltantes.includes('Usuario de Telegram') && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Usuario de Telegram *
                  </label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="telegram_username"
                      value={formData.telegram_username}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="@tu_usuario"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Datos del Beneficiario */}
              {datosFaltantes.some(dato => dato.includes('Beneficiario')) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Users className="w-5 h-5 text-red-600" />
                    <h4 className="text-red-800 font-semibold">Datos del Beneficiario</h4>
                  </div>
                  
                  <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                    <p className="text-red-800 text-sm">
                      <strong>IMPORTANTE:</strong> Esta información es crucial en caso de fallecimiento o accidente. 
                      Permitirá que tu beneficiario pueda acceder a tu cuenta y recuperar tus fondos.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Nombre del Beneficiario *
                      </label>
                      <input
                        type="text"
                        name="beneficiario_nombre"
                        value={formData.beneficiario_nombre}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Apellido"
                        required
                      />
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
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="+1234567890"
                          required
                        />
                      </div>
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
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="beneficiario@correo.com"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Datos</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Guardar en sessionStorage que el usuario cerró el modal
                    sessionStorage.setItem(`datos_personales_dismissed_${userId}`, 'true');
                    setUserDismissed(true);
                    onClose();
                  }}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Completar Más Tarde
                </button>
              </div>
            </form>
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

export default DatosPersonalesModal;