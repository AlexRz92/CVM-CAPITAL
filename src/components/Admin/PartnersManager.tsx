import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { Users, Plus, Edit, Trash2, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import CryptoJS from 'crypto-js';
import PasswordStrengthIndicator from '../UI/PasswordStrengthIndicator';

interface Partner {
  id: string;
  nombre: string;
  username?: string;
  activo: boolean;
  created_at: string;
}

interface PartnersManagerProps {
  onUpdate: () => void;
}

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

// Función para validar contraseña
const validatePassword = (password: string): boolean => {
  return password.length >= 6 && /[A-Z]/.test(password) && /\d/.test(password);
};

const PartnersManager: React.FC<PartnersManagerProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  // Validación en vivo del username
  useEffect(() => {
    if (formData.username && !editingId) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  }, [formData.username, editingId]);

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    try {
      // Verificar en partners
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      // Verificar en admins
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (partnerError && partnerError.code !== 'PGRST116') {
        console.error('Error checking username in partners:', partnerError);
        setUsernameAvailable(false);
        return;
      }

      if (adminError && adminError.code !== 'PGRST116') {
        console.error('Error checking username in admins:', adminError);
        setUsernameAvailable(false);
        return;
      }

      const isAvailable = !partnerData && !adminData;
      setUsernameAvailable(isAvailable);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar contraseña solo si se está creando un nuevo partner o se proporciona una nueva
    if (!editingId && !validatePassword(formData.password)) {
      alert('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número');
      return;
    }

    if (editingId && formData.password && !validatePassword(formData.password)) {
      alert('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número');
      return;
    }

    // Validar username disponible para nuevos partners
    if (!editingId && usernameAvailable === false) {
      alert('El nombre de usuario no está disponible');
      return;
    }
    
    try {
      if (editingId) {
        const updateData: any = {
          nombre: formData.nombre
        };

        // Solo actualizar contraseña si se proporciona una nueva
        if (formData.password) {
          const salt = generateSalt();
          const hashedPassword = hashPassword(formData.password, salt);
          updateData.password_hash = hashedPassword;
          updateData.password_salt = salt;
        }

        const { error } = await supabase
          .from('partners')
          .update(updateData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const salt = generateSalt();
        const hashedPassword = hashPassword(formData.password, salt);

        const { error } = await supabase
          .from('partners')
          .insert({
            nombre: formData.nombre,
            username: formData.username,
            password_hash: hashedPassword,
            password_salt: salt,
            created_by: admin?.id
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchPartners();
      onUpdate();
    } catch (error) {
      console.error('Error saving partner:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      username: '',
      password: ''
    });
    setShowPasswordStrength(false);
    setUsernameAvailable(null);
  };

  const handleEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setFormData({
      nombre: partner.nombre,
      username: partner.username || '',
      password: '' // No mostrar contraseña actual
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    setDeleteInfo({
      mensaje: '¿Estás seguro de que deseas eliminar este partner?'
    });
    setShowDeleteModal(id);
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', showDeleteModal);

      if (error) throw error;
      
      setShowDeleteModal(null);
      setDeleteInfo(null);
      fetchPartners();
      onUpdate();
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('Error al eliminar el partner');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({ activo: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchPartners();
      onUpdate();
    } catch (error) {
      console.error('Error toggling partner status:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Users className="w-6 h-6 mr-3" />
            Gestión de Partners ({partners.length})
          </h3>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-green-500/30 text-green-200 px-4 py-2 rounded-lg hover:bg-green-500/40 transition-colors border border-green-400/50"
            >
              <Plus className="w-4 h-4" />
              <span className="font-semibold">Nuevo Partner</span>
            </button>
          </div>
        </div>
        
        {/* Lista de Partners */}
        {partners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay partners registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => (
              <div key={partner.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    
                    <div>
                      <h4 className="text-white font-semibold">{partner.nombre}</h4>
                      <p className="text-white/70 text-sm">@{partner.username}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/50">
                          PARTNER ESTÁNDAR
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      partner.activo 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                    }`}>
                      {partner.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                    
                    <button
                      onClick={() => handleToggleActive(partner.id, partner.activo)}
                      className={`p-2 rounded transition-colors ${
                        partner.activo
                          ? 'text-green-300 hover:bg-green-500/20'
                          : 'text-gray-300 hover:bg-gray-500/20'
                      }`}
                      title={partner.activo ? 'Desactivar' : 'Activar'}
                    >
                      {partner.activo ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(partner)}
                      className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteClick(partner.id)}
                      className="p-2 text-red-300 hover:bg-red-500/20 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de crear/editar partner */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Editar Partner' : 'Crear Nuevo Partner'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {!editingId && (
                <>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Nombre de Usuario
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        required
                      />
                      {formData.username && (
                        <div className="absolute right-3 top-3">
                          {checkingUsername ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
                          ) : usernameAvailable === true ? (
                            <UserCheck className="w-5 h-5 text-green-500" />
                          ) : usernameAvailable === false ? (
                            <UserX className="w-5 h-5 text-red-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {formData.username && usernameAvailable !== null && (
                      <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {usernameAvailable ? 'Nombre de usuario disponible' : 'Nombre de usuario no disponible'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({...formData, password: e.target.value});
                        setShowPasswordStrength(e.target.value.length > 0);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <PasswordStrengthIndicator password={formData.password} show={showPasswordStrength} />
                  </div>
                </>
              )}

              {editingId && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Nueva Contraseña (dejar vacío para mantener actual)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({...formData, password: e.target.value});
                      setShowPasswordStrength(e.target.value.length > 0);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <PasswordStrengthIndicator password={formData.password} show={showPasswordStrength} />
                </div>
              )}
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={!editingId && usernameAvailable === false}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingId ? 'Actualizar' : 'Crear'} Partner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && deleteInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-xl font-bold text-gray-900">Confirmar Eliminación</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">{deleteInfo.mensaje}</p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Partner</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(null);
                  setDeleteInfo(null);
                }}
                disabled={deleting}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnersManager;