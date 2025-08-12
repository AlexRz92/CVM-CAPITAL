import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, Shield, AlertTriangle, CheckCircle, UserPlus, Clock, XCircle, Globe } from 'lucide-react';
import { supabase } from '../config/supabase';
import { hashPassword, generateSalt } from '../utils/crypto';
import { sanitizeInput, isValidEmail, isValidPassword } from '../utils/validation';
import { useMaintenance } from '../hooks/useMaintenance';
import { MaintenanceModal } from '../components/UI';
import { PasswordStrengthIndicator } from '../components/UI';

interface RegistroData {
  nombre: string;
  apellido: string;
  telegram_username: string;
  pais: string;
  email: string;
  password: string;
  confirmPassword: string;
  pregunta_secreta: string;
  respuesta_secreta: string;
  beneficiario_nombre: string;
  beneficiario_apellido: string;
  beneficiario_telefono: string;
  beneficiario_email: string;
}

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

const PAISES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 
  'El Salvador', 'España', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 
  'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela',
  'Estados Unidos', 'Canadá', 'Francia', 'Italia', 'Alemania', 'Reino Unido', 'Otro'
];

const PublicRegister: React.FC = () => {
  const [step, setStep] = useState(1); // 1: verificar email, 2: formulario completo
  const [emailToCheck, setEmailToCheck] = useState('');
  const [emailStatus, setEmailStatus] = useState<{
    estado: 'no_registrado' | 'pendiente' | 'rechazado' | 'registrado';
    motivo_rechazo?: string;
    fecha_solicitud?: string;
  } | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [registroHabilitado, setRegistroHabilitado] = useState(false);
  const [mensajeRegistro, setMensajeRegistro] = useState('');
  const [showRegistroStatusModal, setShowRegistroStatusModal] = useState(false);
  const [formData, setFormData] = useState<RegistroData>({
    nombre: '',
    apellido: '',
    telegram_username: '',
    pais: '',
    email: '',
    password: '',
    confirmPassword: '',
    pregunta_secreta: '',
    respuesta_secreta: '',
    beneficiario_nombre: '',
    beneficiario_apellido: '',
    beneficiario_telefono: '',
    beneficiario_email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [userCaptchaAnswer, setUserCaptchaAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { activo: maintenanceActive, mensaje: maintenanceMessage, loading: maintenanceLoading } = useMaintenance();
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const handleCloseMaintenanceModal = () => {
    setShowMaintenanceModal(false);
  };

  useEffect(() => {
    checkRegistroHabilitado();
    generateCaptcha();
  }, []);

  useEffect(() => {
    // Mostrar modal de mantenimiento inmediatamente cuando esté activo
    setShowMaintenanceModal(maintenanceActive && !maintenanceLoading);
  }, [maintenanceActive, maintenanceLoading]);

  const checkRegistroHabilitado = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_registro')
        .select('registro_habilitado, mensaje_registro')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking registro status:', error);
        setRegistroHabilitado(false);
        setMensajeRegistro('Error al verificar el estado del registro.');
        return;
      }

      if (data) {
        setRegistroHabilitado(data.registro_habilitado);
        setMensajeRegistro(data.mensaje_registro || 'El registro está temporalmente deshabilitado.');
      } else {
        // No existe configuración, asumir deshabilitado
        setRegistroHabilitado(false);
        setMensajeRegistro('El registro está temporalmente deshabilitado.');
      }
    } catch (error) {
      console.error('Error checking registro status:', error);
      setRegistroHabilitado(false);
      setMensajeRegistro('Error al verificar el estado del registro.');
    }
  };

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer = 0;
    let question = '';
    
    switch (operation) {
      case '+':
        answer = num1 + num2;
        question = `¿Cuánto es ${num1} + ${num2}?`;
        break;
      case '-':
        const larger = Math.max(num1, num2);
        const smaller = Math.min(num1, num2);
        answer = larger - smaller;
        question = `¿Cuánto es ${larger} - ${smaller}?`;
        break;
      case '*':
        answer = num1 * num2;
        question = `¿Cuánto es ${num1} × ${num2}?`;
        break;
    }
    
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer.toString());
    setCaptchaVerified(false);
    setUserCaptchaAnswer('');
  };

  const verifyCaptcha = () => {
    if (userCaptchaAnswer === captchaAnswer) {
      setCaptchaVerified(true);
      return true;
    }
    return false;
  };

  const checkEmailStatus = async () => {
    if (!emailToCheck || !isValidEmail(emailToCheck)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    setCheckingEmail(true);
    setError('');

    try {
      // Verificar en inversores registrados
      const { data: inversorExistente, error: errorInversor } = await supabase
        .from('inversores')
        .select('id')
        .eq('email', emailToCheck.toLowerCase())
        .maybeSingle();

      if (errorInversor) throw errorInversor;

      if (inversorExistente) {
        setEmailStatus({ estado: 'registrado' });
        setCheckingEmail(false);
        return;
      }

      // Verificar en solicitudes de registro
      const { data: solicitudExistente, error: errorSolicitud } = await supabase
        .from('registro_solicitudes')
        .select('estado, motivo_rechazo, fecha_solicitud')
        .eq('email', emailToCheck.toLowerCase())
        .maybeSingle();

      if (errorSolicitud) throw errorSolicitud;

      if (solicitudExistente) {
        setEmailStatus({
          estado: solicitudExistente.estado as 'pendiente' | 'rechazado',
          motivo_rechazo: solicitudExistente.motivo_rechazo,
          fecha_solicitud: solicitudExistente.fecha_solicitud
        });
        setShowStatusModal(true);
      } else {
        setEmailStatus({ estado: 'no_registrado' });
        setFormData(prev => ({ ...prev, email: emailToCheck }));
      }
    } catch (error) {
      console.error('Error checking email status:', error);
      setError('Error al verificar el email. Inténtalo más tarde.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmitRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!isValidEmail(formData.email)) {
      setError('Formato de email inválido');
      return;
    }

    if (!isValidPassword(formData.password)) {
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

    if (!captchaVerified) {
      if (!verifyCaptcha()) {
        setError('Respuesta del captcha incorrecta');
        generateCaptcha();
        return;
      }
    }

    // Validar campos requeridos
    const requiredFields = [
      'nombre', 'apellido', 'telegram_username', 'pais', 'email', 'password',
      'pregunta_secreta', 'respuesta_secreta', 'beneficiario_nombre',
      'beneficiario_apellido', 'beneficiario_telefono', 'beneficiario_email'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof RegistroData].trim()) {
        setError(`El campo ${field.replace('_', ' ')} es requerido`);
        return;
      }
    }

    if (!isValidEmail(formData.beneficiario_email)) {
      setError('El email del beneficiario no es válido');
      return;
    }

    setLoading(true);

    try {
      // Generar salt y hashear contraseña
      const salt = generateSalt();
      const hashedPassword = hashPassword(formData.password, salt);

      // Crear solicitud de registro
      const { error: insertError } = await supabase
        .from('registro_solicitudes')
        .insert({
          nombre: sanitizeInput(formData.nombre),
          apellido: sanitizeInput(formData.apellido),
          telegram_username: sanitizeInput(formData.telegram_username),
          pais: formData.pais,
          telegram_username: sanitizeInput(formData.telegram_username),
          pais: formData.pais,
          email: formData.email.toLowerCase(),
          password_hash: hashedPassword,
          password_salt: salt,
          pregunta_secreta: formData.pregunta_secreta,
          respuesta_secreta: sanitizeInput(formData.respuesta_secreta.toLowerCase()),
          beneficiario_nombre: sanitizeInput(formData.beneficiario_nombre),
          beneficiario_apellido: sanitizeInput(formData.beneficiario_apellido),
          beneficiario_telefono: sanitizeInput(formData.beneficiario_telefono),
          beneficiario_email: formData.beneficiario_email.toLowerCase(),
          estado: 'pendiente'
        });

      if (insertError) throw insertError;

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error creating registration request:', error);
      if (error.code === '23505') {
        setError('Este correo ya tiene una solicitud de registro pendiente');
      } else {
        setError('Error al enviar la solicitud. Inténtalo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setShowPasswordStrength(value.length > 0);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!registroHabilitado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
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

          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/30">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-4">Registro No Disponible</h2>
              <p className="text-white/90 mb-6">{mensajeRegistro}</p>
              <a
                href="/"
                className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Volver al Inicio
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
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

        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/30">
          {step === 1 ? (
            // Paso 1: Verificar Email
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-white text-center mb-6">Verificar Registro</h2>
              
              {error && (
                <div className="bg-red-500/20 border border-red-300/50 text-white px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                    <input
                      type="email"
                      value={emailToCheck}
                      onChange={(e) => setEmailToCheck(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                      placeholder="tu@correo.com"
                      required
                    />
                  </div>
                </div>

                <button
                  onClick={checkEmailStatus}
                  disabled={checkingEmail || !emailToCheck}
                  className="w-full bg-white text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingEmail ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Verificar Estado</span>
                    </>
                  )}
                </button>

                {/* Mostrar estado del email */}
                {emailStatus && (
                  <div className="mt-4">
                    {emailStatus.estado === 'registrado' && (
                      <div className="bg-blue-500/20 border border-blue-300/50 text-white px-4 py-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-blue-300" />
                          <span>Este correo ya está registrado. Puedes iniciar sesión.</span>
                        </div>
                        <a
                          href="/login"
                          className="inline-block mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                        >
                          Ir al Login
                        </a>
                      </div>
                    )}

                    {emailStatus.estado === 'no_registrado' && (
                      <div className="bg-green-500/20 border border-green-300/50 text-white px-4 py-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <UserPlus className="w-5 h-5 text-green-300" />
                          <span>Este correo está disponible para registro.</span>
                        </div>
                        <button
                          onClick={() => setStep(2)}
                          className="inline-block mt-3 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                        >
                          Continuar con el Registro
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Paso 2: Formulario Completo
            <div>
              <h2 className="text-2xl font-bold text-white text-center mb-6">Registro de Nuevo Inversor</h2>
              
              {error && (
                <div className="bg-red-500/20 border border-red-300/50 text-white px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmitRegistro} className="space-y-6">
                {/* Datos Personales */}
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Datos Personales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Nombre *</label>
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Tu nombre"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Apellido *</label>
                      <input
                        type="text"
                        name="apellido"
                        value={formData.apellido}
                        onChange={handleChange}
                        className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Tu apellido"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Usuario de Telegram *</label>
                      <input
                        type="text"
                        name="telegram_username"
                        value={formData.telegram_username}
                        onChange={handleChange}
                        className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="@tu_usuario"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">País *</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                        <select
                          name="pais"
                          value={formData.pais}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                          required
                        >
                          <option value="" className="text-black">Selecciona tu país</option>
                          {PAISES.map((pais, index) => (
                            <option key={index} value={pais} className="text-black">
                              {pais}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Correo Electrónico *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="tu@correo.com"
                        required
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Seguridad */}
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Datos de Seguridad</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Contraseña *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Tu contraseña"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-white/80 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={formData.password} show={showPasswordStrength} />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Confirmar Contraseña *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Confirma tu contraseña"
                          required
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

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Pregunta de Seguridad *</label>
                      <select
                        name="pregunta_secreta"
                        value={formData.pregunta_secreta}
                        onChange={handleChange}
                        className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                        required
                      >
                        <option value="" className="text-black">Selecciona una pregunta</option>
                        {SECURITY_QUESTIONS.map((question, index) => (
                          <option key={index} value={question} className="text-black">
                            {question}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Respuesta de Seguridad *</label>
                      <input
                        type="text"
                        name="respuesta_secreta"
                        value={formData.respuesta_secreta}
                        onChange={handleChange}
                        className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Tu respuesta"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Mensaje Importante */}
                <div className="bg-red-500/20 border border-red-300/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertTriangle className="w-6 h-6 text-red-300" />
                    <h3 className="text-red-200 font-semibold">INFORMACIÓN IMPORTANTE</h3>
                  </div>
                  <p className="text-red-100 text-sm">
                    Los siguientes datos son cruciales en caso de fallecimiento o accidente. 
                    Esta información permitirá que tu beneficiario pueda acceder a tu cuenta 
                    y recuperar tus fondos. Por favor, proporciona datos precisos y verifica 
                    que tu beneficiario tenga conocimiento de esta información.
                  </p>
                </div>

                {/* Datos del Beneficiario */}
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Datos del Beneficiario</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Nombre del Beneficiario *</label>
                      <input
                        type="text"
                        name="beneficiario_nombre"
                        value={formData.beneficiario_nombre}
                        onChange={handleChange}
                        className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Nombre del beneficiario"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Apellido del Beneficiario *</label>
                      <input
                        type="text"
                        name="beneficiario_apellido"
                        value={formData.beneficiario_apellido}
                        onChange={handleChange}
                        className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Apellido del beneficiario"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Teléfono del Beneficiario *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                        <input
                          type="tel"
                          name="beneficiario_telefono"
                          value={formData.beneficiario_telefono}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="+1234567890"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Email del Beneficiario *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                        <input
                          type="email"
                          name="beneficiario_email"
                          value={formData.beneficiario_email}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="beneficiario@correo.com"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Captcha */}
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Verificación de Seguridad</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        {captchaQuestion} *
                      </label>
                      <div className="flex space-x-3">
                        <input
                          type="number"
                          value={userCaptchaAnswer}
                          onChange={(e) => setUserCaptchaAnswer(e.target.value)}
                          className="flex-1 p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Respuesta"
                          required
                        />
                        <button
                          type="button"
                          onClick={generateCaptcha}
                          className="bg-white/20 text-white px-4 py-3 rounded-lg hover:bg-white/30 transition-colors"
                        >
                          Nuevo
                        </button>
                      </div>
                      {captchaVerified && (
                        <div className="flex items-center space-x-2 mt-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-300 text-sm">Captcha verificado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setEmailStatus(null);
                      setError('');
                    }}
                    className="flex-1 bg-gray-500/20 text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-500/30 transition-colors"
                  >
                    Volver
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-white text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Enviar Solicitud</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Enlaces */}
        <div className="text-center mt-6">
          <a 
            href="/" 
            className="text-white/90 hover:text-white text-sm transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">¡Solicitud Enviada!</h3>
              <p className="text-gray-600 mb-6">
                Tu solicitud de registro ha sido enviada exitosamente. 
                Recibirás una notificación por email cuando sea procesada por el administrador.
              </p>
            </div>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      )}

      {/* Modal para nueva solicitud después de rechazo */}
      {showStatusModal && emailStatus && (emailStatus.estado === 'pendiente' || emailStatus.estado === 'rechazado') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                emailStatus.estado === 'pendiente' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {emailStatus.estado === 'pendiente' ? (
                  <Clock className="w-8 h-8 text-yellow-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {emailStatus.estado === 'pendiente' ? 'Registro Pendiente' : 'Registro Rechazado'}
              </h3>
              
              {emailStatus.estado === 'pendiente' ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Tu solicitud de registro está pendiente de aprobación por el administrador.
                  </p>
                  <p className="text-sm text-gray-500">
                    Solicitud enviada: {emailStatus.fecha_solicitud && formatDate(emailStatus.fecha_solicitud)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    Tu solicitud de registro fue rechazada.
                  </p>
                  {emailStatus.motivo_rechazo && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>Motivo:</strong> {emailStatus.motivo_rechazo}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    Solicitud enviada: {emailStatus.fecha_solicitud && formatDate(emailStatus.fecha_solicitud)}
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowStatusModal(false)}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
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
    </div>
  );
};

export default PublicRegister;