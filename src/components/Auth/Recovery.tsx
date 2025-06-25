import React, { useState } from 'react';
import { Mail, ArrowRight, Copy, MessageCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import PasswordStrengthIndicator from '../UI/PasswordStrengthIndicator';
import CryptoJS from 'crypto-js';

// Función para hashear contraseñas
const hashPassword = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
};

// Función para generar salt aleatorio
const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(128/8).toString();
};

// Función para validar entrada
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>'"]/g, '');
};

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const emailLower = sanitizeInput(formData.email.toLowerCase());
      console.log('Buscando usuario con email:', emailLower);
      
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailLower)) {
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

    if (!validatePassword()) {
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
      setSuccess('¡Contraseña actualizada exitosamente! Redirigiendo al login...');
      
      // Limpiar formulario
      setFormData({
        email: '',
        securityAnswer: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      setError('Error de conexión. Inténtalo más tarde.');
    }
    
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openTelegram = () => {
    window.open('https://t.me/thealex', '_blank');
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center p-4">
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contacta con Soporte</h3>
            <p className="text-gray-600 mb-6">
              Si no recuerdas la respuesta a tu pregunta de seguridad, puedes contactarnos:
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => copyToClipboard('pnf.alexisruiz@gmail.com')}
                className="w-full flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-gray-900">pnf.alexisruiz@gmail.com</span>
                <Copy className="w-4 h-4 text-gray-500 ml-auto" />
              </button>

              <button
                onClick={openTelegram}
                className="w-full flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span className="text-gray-900">Telegram: @thealex</span>
                <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-6 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recovery;