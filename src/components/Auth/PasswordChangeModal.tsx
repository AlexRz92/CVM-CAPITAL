import React, { useState } from 'react';
import { Eye, EyeOff, Lock, HelpCircle, Save } from 'lucide-react';
import { supabase } from '../../config/supabase';
import PasswordStrengthIndicator from '../UI/PasswordStrengthIndicator';
import CryptoJS from 'crypto-js';

interface PasswordChangeModalProps {
  user: any;
  onSuccess: () => void;
  onCancel: () => void;
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

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ user, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    pregunta_secreta: '',
    respuesta_secreta: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = () => {
    const { newPassword } = formData;
    return newPassword.length >= 6 && /[A-Z]/.test(newPassword) && /\d/.test(newPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!validatePassword()) {
      setError('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
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

    setLoading(true);

    try {
      // Generar nuevo salt y hashear la nueva contraseña
      const newSalt = generateSalt();
      const newHashedPassword = hashPassword(formData.newPassword, newSalt);

      // Actualizar contraseña y datos de seguridad
      const { error: updateError } = await supabase
        .from('inversores')
        .update({
          password_hash: newHashedPassword,
          password_salt: newSalt,
          pregunta_secreta: formData.pregunta_secreta,
          respuesta_secreta: formData.respuesta_secreta.toLowerCase().trim(),
          failed_attempts: 0,
          locked_until: null
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Error al actualizar la contraseña. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'newPassword') {
      setShowPasswordStrength(value.length > 0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Cambio de Contraseña Requerido</h3>
          <p className="text-gray-600 mt-2">
            Debes cambiar tu contraseña temporal y configurar una nueva pregunta de seguridad.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nueva Contraseña */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={formData.newPassword} show={showPasswordStrength} />
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirmar contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Pregunta de Seguridad */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Nueva Pregunta de Seguridad *
            </label>
            <select
              name="pregunta_secreta"
              value={formData.pregunta_secreta}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona una pregunta</option>
              {SECURITY_QUESTIONS.map((question, index) => (
                <option key={index} value={question}>
                  {question}
                </option>
              ))}
            </select>
          </div>

          {/* Respuesta de Seguridad */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Nueva Respuesta de Seguridad *
            </label>
            <input
              type="text"
              name="respuesta_secreta"
              value={formData.respuesta_secreta}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu respuesta"
            />
          </div>

          {/* Información importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-blue-800 font-semibold mb-2">Información Importante</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Tu contraseña temporal "cvmcapital" será reemplazada</li>
              <li>• La pregunta temporal será reemplazada por tu nueva selección</li>
              <li>• Guarda esta información en un lugar seguro</li>
              <li>• Necesitarás estos datos para recuperar tu cuenta en el futuro</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;