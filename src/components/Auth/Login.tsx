import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { usePartner } from '../../contexts/PartnerContext';
import { supabase } from '../../config/supabase';
import PasswordChangeModal from './PasswordChangeModal';

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
  
  const { login } = useAuth();
  const { login: adminLogin } = useAdmin();
  const { login: partnerLogin } = usePartner();
  const navigate = useNavigate();

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
    setLoading(true);

    // Verificar si es un intento de login de admin
    if (formData.email === 'KatanaRz' || (!formData.email.includes('@') && formData.email.length > 0)) {
      const adminResult = await adminLogin(formData.email, formData.password);
      if (adminResult.success) {
        navigate('/operaciones');
        setLoading(false);
        return;
      }
    }

    // Verificar si es un intento de login de partner
    if (!formData.email.includes('@') && formData.email.length > 0) {
      const partnerResult = await partnerLogin(formData.email, formData.password);
      if (partnerResult.success) {
        navigate('/socio');
        setLoading(false);
        return;
      }
    }

    // Login normal de usuario (solo si contiene @)
    if (formData.email.includes('@')) {
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
        setError(result.error || 'Error al iniciar sesión');
      }
    } else {
      setError('Credenciales incorrectas');
    }
    
    setLoading(false);
  };

  const handlePasswordChangeSuccess = () => {
    setShowPasswordChangeModal(false);
    setTempUser(null);
    setFormData({ email: '', password: '' });
    // Mostrar mensaje de éxito y redirigir al login
    alert('Contraseña y datos de seguridad actualizados correctamente. Por favor, inicia sesión con tu nueva contraseña.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
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
                    placeholder="correo@ejemplo.com"
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
    </>
  );
};

export default Login;