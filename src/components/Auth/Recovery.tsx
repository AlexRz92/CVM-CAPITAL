import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, Copy, MessageCircle, Eye, EyeOff, Lock, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { PasswordStrengthIndicator } from '../UI';
import { useModal } from '../../hooks/useModal';
import { useMaintenance } from '../../hooks/useMaintenance';
import { UnifiedModal } from '../UI';
import { MaintenanceModal } from '../UI';
import { hashPassword, generateSalt } from '../../utils/crypto';
import { sanitizeInput, isValidEmail, isValidPassword } from '../../utils/validation';

const Recovery: React.FC = () => {
  const [step, setStep] = useState(1); // 1: email, 2: security question, 3: new password
  const [formData, setFormData] = useState({
    email: '',
    securityAnswer: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const { modalState, hideModal, showSuccess, showError } = useModal();
  const { activo: maintenanceActive, mensaje: maintenanceMessage, loading: maintenanceLoading } = useMaintenance();
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const handleCloseMaintenanceModal = () => {
    setShowMaintenanceModal(false);
  };

  useEffect(() => {
    // Mostrar modal de mantenimiento inmediatamente cuando esté activo
    setShowMaintenanceModal(maintenanceActive && !maintenanceLoading);
  }, [maintenanceActive, maintenanceLoading]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar mantenimiento antes de proceder
    if (maintenanceActive) {
      showError(
        'Sistema en Mantenimiento',
        'La recuperación de contraseña no está disponible durante el mantenimiento. Por favor, inténtalo más tarde.'
      );
      return;
    }

    setError('');
    setLoading(true);

    try {
      const emailLower = sanitizeInput(formData.email.toLowerCase());
      console.log('Buscando usuario con email:', emailLower);
      
      if (!isValidEmail(emailLower)) {
        setError('Formato de email inválido');
        setLoading(false);
        return;
      }
      
      // Buscar usuario en la tabla inversores
      const { data, error } = await supabase
        .from('inversores')
        .select('*')
        .eq('email', emailLower)
        .maybeSingle();

      console.log('Resultado de la consulta:', { data, error });

      if (error) {
        console.error('Error en la consulta:', error);
        setError('Error al verificar el correo electrónico. Inténtalo más tarde.');
      } else if (data) {
        console.log('Usuario encontrado:', data);
        setUserData(data);
        setStep(2);
        setSuccess('Correo verificado correctamente');
      } else {
        setError('Correo electrónico no encontrado en nuestros registros');
      }
    } catch (err) {
      console.error('Error en handleEmailSubmit:', err);
      setError('Error de conexión. Inténtalo más tarde.');
    }
    
    setLoading(false);
  };

  const handleSecurityAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const userAnswer = sanitizeInput(formData.securityAnswer.toLowerCase());
    const correctAnswer = userData.respuesta_secreta.toLowerCase().trim();

    console.log('Comparando respuestas:', { userAnswer, correctAnswer });

    if (userAnswer !== correctAnswer) {
      setError('Respuesta incorrecta');
      setLoading(false);
      return;
    }

    setStep(3);
    setSuccess('Respuesta correcta. Ahora puedes cambiar tu contraseña.');
    setLoading(false);
  };

  const validatePassword = () => {
    const { newPassword } = formData;
    return newPassword.length >= 6 && /[A-Z]/.test(newPassword) && /\d/.test(newPassword);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPassword(formData.newPassword)) {
      setError('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      console.log('Actualizando contraseña para usuario:', userData.id);
      
      // Generar nuevo salt y hashear la nueva contraseña
      const newSalt = generateSalt();
      const newHashedPassword = hashPassword(formData.newPassword, newSalt);
      
      console.log('Nuevo salt generado:', newSalt);
      console.log('Nueva contraseña hasheada:', newHashedPassword);

      // Actualizar contraseña en la base de datos
      const { data: updateData, error: updateError } = await supabase
        .from('inversores')
        .update({
          password_hash: newHashedPassword,
          password_salt: newSalt,
          failed_attempts: 0, // Reset intentos fallidos
          locked_until: null  // Desbloquear cuenta si estaba bloqueada
        })
        .eq('id', userData.id)
        .select();

      console.log('Resultado de actualización:', { updateData, updateError });

      if (updateError) {
        console.error('Error actualizando contraseña:', updateError);
        setError('Error al actualizar la contraseña. Inténtalo más tarde.');
        setLoading(false);
        return;
      }

      if (!updateData || updateData.length === 0) {
        console.error('No se actualizó ningún registro');
        setError('Error al actualizar la contraseña. Usuario no encontrado.');
        setLoading(false);
        return;
      }

      console.log('Contraseña actualizada exitosamente');
      showSuccess(
        'Contraseña Actualizada',
        '¡Tu contraseña ha sido actualizada exitosamente! Serás redirigido al login en unos segundos.'
      );
      
      // Limpiar formulario
      setFormData({
        email: '',
        securityAnswer: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => {
        hideModal();
        window.location.href = '/login';
      }, 3000);
      
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      showError(
        'Error de Conexión',
        'No se pudo actualizar la contraseña. Por favor, verifica tu conexión e inténtalo más tarde.'
      );
    }
    
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openTelegram = () => {
    window.open('https://t.me/CVM_Soporte', '_blank');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    if (e.target.name === 'newPassword') {
      setShowPasswordStrength(e.target.value.length > 0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo2.png" 
              alt="Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <p className="text-white text-lg font-medium italic">Inversión Inteligente, siempre con ustedes</p>
        </div>

        {/* Formulario de Recuperación */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/30">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            {step === 1 ? 'Recuperar Contraseña' : 
             step === 2 ? 'Pregunta de Seguridad' : 
             'Nueva Contraseña'}
          </h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-300/50 text-white px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-300/50 text-white px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    maxLength={255}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Security Question */}
          {step === 2 && userData && (
            <form onSubmit={handleSecurityAnswer} className="space-y-6">
              <div className="bg-blue-800/30 p-4 rounded-lg border border-white/50">
                <p className="text-white text-sm font-medium mb-2">Pregunta de Seguridad:</p>
                <p className="text-white/90">{userData.pregunta_secreta}</p>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Tu Respuesta
                </label>
                <input
                  type="text"
                  name="securityAnswer"
                  value={formData.securityAnswer}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  className="w-full px-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="Escribe tu respuesta"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Verificar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full text-white/90 hover:text-white text-sm transition-colors"
              >
                No me sé la respuesta
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    maxLength={128}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="Nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-white/80 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    maxLength={128}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="Confirmar contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-white/80 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <PasswordStrengthIndicator password={formData.newPassword} show={showPasswordStrength} />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Cambiar Contraseña</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Enlaces de navegación */}
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-white/90 hover:text-white text-sm transition-colors"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>

      {/* Modal de Contacto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 w-full max-w-md shadow-2xl border border-gray-100">
            {/* Header elegante */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Necesitas Ayuda?</h3>
              <p className="text-gray-600">
                Si no recuerdas la respuesta a tu pregunta de seguridad, nuestro equipo de soporte te ayudará
              </p>
            </div>
            
            <div className="space-y-3">
              
              {/* Telegram con icono personalizado */}
              <button
                onClick={openTelegram}
                className="w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all duration-200 border border-blue-200 hover:border-blue-300 group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  {/* Icono de Telegram personalizado */}
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Telegram</p>
                  <p className="text-sm text-gray-600">CVM Soporte</p>
                </div>
                <Send className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
              </button>
            </div>

            {/* Información adicional */}
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-semibold text-yellow-800">Tiempo de respuesta</p>
              </div>
              <p className="text-sm text-yellow-700">
                Nuestro equipo responde en un máximo de 48 horas.
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-6 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 py-3 px-4 rounded-xl transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      
      {/* Modal de Mantenimiento */}
      <MaintenanceModal
        show={showMaintenanceModal}
        message={maintenanceMessage}
        onClose={handleCloseMaintenanceModal}
        canClose={false} // No mostrar botón de cerrar
        persistent={true} // Hacer el modal persistente
      />

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

export default Recovery;
