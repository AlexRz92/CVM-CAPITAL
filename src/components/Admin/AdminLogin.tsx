import React, { useState } from 'react';
import { Eye, EyeOff, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';

const AdminLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      navigate('/operaciones');
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
    
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Botón para ir al Login */}
        <div className="mb-6">
          <button
            onClick={goToLogin}
            className="flex items-center space-x-2 text-white hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Ir al Login de Usuarios</span>
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-white/80 text-sm">CVM Capital - Sistema de Operaciones</p>
        </div>

        {/* Formulario de Login */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/30">
          <h2 className="text-xl font-bold text-white text-center mb-6">Acceso Administrativo</h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-300/50 text-white px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Usuario
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="Nombre de usuario"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="Contraseña de administrador"
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
                  <span>Acceder</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;