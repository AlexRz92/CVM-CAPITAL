import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { usePartner } from '../../contexts/PartnerContext';
import { useOperador } from '../../contexts/OperadorContext';
import { useMaintenance } from '../../hooks/useMaintenance';
import { MaintenanceModal } from '../UI';
import { supabase } from '../../config/supabase';
import { hashPassword, generateSalt } from '../../utils/crypto';
import { PasswordChangeModal } from './';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    tipo: 'pendiente' | 'rechazado';
    motivo_rechazo?: string;
    fecha_solicitud: string;
  } | null>(null);
  const { activo: maintenanceActive, mensaje: maintenanceMessage, loading: maintenanceLoading } = useMaintenance();
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  
  const handleCloseMaintenanceModal = () => {
    setShowMaintenanceModal(false);
  };

  const { login } = useAuth();
  const { login: adminLogin } = useAdmin();
  const { login: partnerLogin } = usePartner();
  const { login: operadorLogin } = useOperador();
  const navigate = useNavigate();

  useEffect(() => {
    // Mostrar modal de mantenimiento inmediatamente cuando esté activo
    setShowMaintenanceModal(maintenanceActive && !maintenanceLoading);
  }, [maintenanceActive, maintenanceLoading]);

  const checkEmailStatus = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('registro_solicitudes')
        .select('estado, motivo_rechazo, fecha_solicitud')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (data && (data.estado === 'pendiente' || data.estado === 'rechazado')) {
        setStatusInfo({
          tipo: data.estado,
          motivo_rechazo: data.motivo_rechazo,
          fecha_solicitud: data.fecha_solicitud
        });
        setShowStatusModal(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking registro status:', error);
      return false;
    }
  };

  const checkIfTemporaryPassword = async (email: string, password: string) => {
    // Verificar si es contraseña temporal
    if (password === 'cvmcapital') {
      try {
        const { data: userData, error } = await supabase
          .from('inversores')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (!error && userData) {
          // Verificar si tiene pregunta temporal
          if (userData.pregunta_secreta === '¿Cuál es tu comida favorita?' && 
              userData.respuesta_secreta === 'pizza') {
            return userData;
          }
        }
      } catch (error) {
        console.error('Error checking temporary password:', error);
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verificar mantenimiento antes de proceder
    if (maintenanceActive && formData.email.includes('@')) {
      // Si está en mantenimiento y es un email (inversor/partner), bloquear login
      setError('El sistema está en mantenimiento. Solo los administradores pueden acceder.');
      return;
    }

    setLoading(true);

    // Verificar si es un intento de login de admin/operador/partner (sin @)
    if (!formData.email.includes('@') && formData.email.length > 0) {
      // Intentar login como admin primero
      const adminResult = await adminLogin(formData.email, formData.password);
      if (adminResult.success) {
        navigate('/operaciones');
        setLoading(false);
        return;
      }
      
      // Si no es admin, intentar como operador
      const operadorResult = await operadorLogin(formData.email, formData.password);
      if (operadorResult.success) {
        navigate('/operador');
        setLoading(false);
        return;
      }
      
      // Si no es admin ni operador, intentar como partner
      const partnerResult = await partnerLogin(formData.email, formData.password);
      if (partnerResult.success) {
        navigate('/socio');
        setLoading(false);
        return;
      }
      
      // Si ninguno funcionó, mostrar error
      setError('Credenciales incorrectas');
      setLoading(false);
      return;
    }

    // Login normal de inversor (solo si contiene @)
    // Verificar si es contraseña temporal
    const tempUserData = await checkIfTemporaryPassword(formData.email, formData.password);
    if (tempUserData) {
      setTempUser(tempUserData);
      setShowPasswordChangeModal(true);
      setLoading(false);
      return;
    }

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      // Si el login falla y es un email, verificar estado de registro
      if (result.error === 'Credenciales incorrectas' && formData.email.includes('@')) {
        const hasStatus = await checkEmailStatus(formData.email);
        if (!hasStatus) {
          setError(result.error || 'Error al iniciar sesión');
        }
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    }
    
    setLoading(false);
  };

  const handlePasswordChangeSuccess = () => {
    setShowPasswordChangeModal(false);
    setTempUser(null);
    setFormData({ email: '', password: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <>
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

          {/* Formulario de Login */}
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/30">
            <h2 className="text-2xl font-bold text-white text-center mb-6">Iniciar Sesión</h2>
            
            {error && (
              <div className="bg-red-500/20 border border-red-300/50 text-white px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email/Username */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Correo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    maxLength={255}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="correo@ejemplo.com o usuario"
                  />
                </div>
                </div>

              {/* Password */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    maxLength={128}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="Tu contraseña"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Enlaces */}
            <div className="mt-6 text-center space-y-3">
              <Link 
                to="/recovery" 
                className="block text-white/90 hover:text-white transition-colors text-sm"
              >
                ¿Olvidaste tu contraseña?
              </Link>
               <div className="text-white/90 text-sm">
                ¿Aún no tienes cuenta?{' '}
                <span className="text-white/60">
                  Contacta al administrador para crear tu cuenta
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Mantenimiento */}
      <MaintenanceModal
        show={showMaintenanceModal}
        message={maintenanceMessage}
        onClose={handleCloseMaintenanceModal}
        canClose={false} // No mostrar botón de cerrar
        persistent={true} // Hacer el modal persistente
      />

      {/* Modal de cambio de contraseña */}
      {showPasswordChangeModal && tempUser && (
        <PasswordChangeModal
          user={tempUser}
          onSuccess={handlePasswordChangeSuccess}
          onCancel={() => {
            setShowPasswordChangeModal(false);
            setTempUser(null);
            setLoading(false);
          }}
        />
      )}

      {/* Modal de Estado de Registro */}
      {showStatusModal && statusInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                statusInfo.tipo === 'pendiente' 
                  ? 'bg-yellow-100' 
                  : 'bg-red-100'
              }`}>
                {statusInfo.tipo === 'pendiente' ? (
                  <Clock className="w-8 h-8 text-yellow-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {statusInfo.tipo === 'pendiente' 
                  ? 'Registro Pendiente' 
                  : 'Registro Rechazado'
                }
              </h3>
              
              {statusInfo.tipo === 'pendiente' ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Tu solicitud de registro está pendiente de aprobación por el administrador.
                  </p>
                  <p className="text-sm text-gray-500">
                    Solicitud enviada: {formatDate(statusInfo.fecha_solicitud)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    Tu solicitud de registro fue rechazada.
                  </p>
                  {statusInfo.motivo_rechazo && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>Motivo:</strong> {statusInfo.motivo_rechazo}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mb-4">
                    Solicitud enviada: {formatDate(statusInfo.fecha_solicitud)}
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
    </>
  );
};

export default Login;
