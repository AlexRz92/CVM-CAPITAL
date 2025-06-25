import React, { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PasswordStrengthIndicator from '../UI/PasswordStrengthIndicator';
import SimpleCaptcha from '../UI/SimpleCaptcha';

const SECURITY_QUESTIONS = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es tu comida favorita?',
  '¿Cómo se llama tu mejor amigo de la infancia?',
  '¿Cuál es tu película favorita?',
  '¿En qué escuela estudiaste la primaria?',
  '¿Cuál es tu color favorito?',
  '¿Cómo se llama tu abuelo materno?'
];

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    pregunta_secreta: '',
    respuesta_secreta: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [resetCaptcha, setResetCaptcha] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    
    // Aplicar validaciones específicas
    if (e.target.name === 'nombre' || e.target.name === 'apellido') {
      value = value.replace(/\s/g, ''); // Remover espacios
      if (value) {
        value = capitalizeFirst(value);
      }
    }
    // Permitir espacios en respuesta_secreta
    
    setFormData({
      ...formData,
      [e.target.name]: value
    });

    if (e.target.name === 'password') {
      setShowPasswordStrength(value.length > 0);
    }

    // Limpiar errores cuando el usuario empiece a escribir
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleCaptchaVerify = (isValid: boolean) => {
    setCaptchaVerified(isValid);
  };

  const validatePassword = () => {
    const { password } = formData;
    return password.length >= 6 && /[A-Z]/.test(password) && /\d/.test(password);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones del frontend
    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      setError('Nombre y apellido son obligatorios');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    if (!validatePassword()) {
      setError('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!formData.pregunta_secreta) {
      setError('Debes seleccionar una pregunta de seguridad');
      return;
    }

    if (!formData.respuesta_secreta.trim()) {
      setError('Debes proporcionar una respuesta a la pregunta de seguridad');
      return;
    }

    if (!captchaVerified) {
      setError('Debes completar la verificación anti-bot');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        password: formData.password,
        pregunta_secreta: formData.pregunta_secreta,
        respuesta_secreta: formData.respuesta_secreta.toLowerCase()
      });

      if (result.success) {
        setSuccess('¡Cuenta creada exitosamente! Acceso inmediato concedido. Redirigiendo...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.error || 'Error al registrar usuario');
        // Reset captcha on error
        setResetCaptcha(prev => !prev);
        setCaptchaVerified(false);
      }
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      setError('Error de conexión. Inténtalo más tarde.');
      // Reset captcha on error
      setResetCaptcha(prev => !prev);
      setCaptchaVerified(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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

        {/* Formulario de Registro */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/30">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Crear Cuenta</h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-300/50 text-white px-4 py-3 rounded-lg mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-300/50 text-white px-4 py-3 rounded-lg mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Nombre *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="Tu nombre"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Apellido *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="Tu apellido"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="tu@correo.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="Tu contraseña"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-white/80 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="Confirma tu contraseña"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-white/80 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Indicador de fortaleza de contraseña */}
            <PasswordStrengthIndicator password={formData.password} show={showPasswordStrength} />

            {/* Pregunta de Seguridad */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Pregunta de Seguridad *
              </label>
              <select
                name="pregunta_secreta"
                value={formData.pregunta_secreta}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                disabled={loading}
              >
                <option value="" className="text-gray-900">Selecciona una pregunta</option>
                {SECURITY_QUESTIONS.map((question, index) => (
                  <option key={index} value={question} className="text-gray-900">
                    {question}
                  </option>
                ))}
              </select>
            </div>

            {/* Respuesta de Seguridad */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Respuesta de Seguridad *
              </label>
              <input
                type="text"
                name="respuesta_secreta"
                value={formData.respuesta_secreta}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                placeholder="Tu respuesta"
                disabled={loading}
              />
            </div>

            {/* Captcha */}
            <SimpleCaptcha onVerify={handleCaptchaVerify} reset={resetCaptcha} />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !captchaVerified}
              className="w-full bg-white text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Crear Cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Enlaces */}
          <div className="mt-6 text-center">
            <div className="text-white/90 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link 
                to="/login" 
                className="text-white hover:text-white/80 font-medium transition-colors"
              >
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;