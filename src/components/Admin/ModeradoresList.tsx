import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { UserPlus, User, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface Moderador {
  id: string;
  username: string;
  nombre: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface ModeradoresListProps {
  onStatsUpdate: () => void;
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

const ModeradoresList: React.FC<ModeradoresListProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [moderadores, setModeradores] = useState<Moderador[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre: '',
    email: ''
  });

  useEffect(() => {
    fetchModeradores();
  }, []);

  const fetchModeradores = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('role', 'moderador')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModeradores(data || []);
    } catch (error) {
      console.error('Error fetching moderadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Actualizar moderador existente
        const updateData: any = {
          nombre: formData.nombre,
          email: formData.email
        };

        // Solo actualizar contraseña si se proporciona una nueva
        if (formData.password) {
          const salt = generateSalt();
          const hashedPassword = hashPassword(formData.password, salt);
          updateData.password_hash = hashedPassword;
          updateData.password_salt = salt;
        }

        const { error } = await supabase
          .from('admins')
          .update(updateData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Crear nuevo moderador
        const salt = generateSalt();
        const hashedPassword = hashPassword(formData.password, salt);

        const { error } = await supabase
          .from('admins')
          .insert({
            username: formData.username,
            password_hash: hashedPassword,
            password_salt: salt,
            role: 'moderador',
            nombre: formData.nombre,
            email: formData.email,
            created_by: admin?.id
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({
        username: '',
        password: '',
        nombre: '',
        email: ''
      });
      fetchModeradores();
      onStatsUpdate();
    } catch (error) {
      console.error('Error saving moderador:', error);
    }
  };

  const handleEdit = (moderador: Moderador) => {
    setEditingId(moderador.id);
    setFormData({
      username: moderador.username,
      password: '', // No mostrar contraseña actual
      nombre: moderador.nombre,
      email: moderador.email || ''
    });
    setShowModal(true);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admins')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchModeradores();
      onStatsUpdate();
    } catch (error) {
      console.error('Error toggling moderador status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este moderador?')) return;
    
    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchModeradores();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting moderador:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      {/* Header con botón de crear */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <UserPlus className="w-6 h-6 mr-3" />
            Moderadores ({moderadores.length})
          </h3>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Moderador</span>
          </button>
        </div>
        
        {moderadores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay moderadores registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {moderadores.map((moderador) => (
              <div key={moderador.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    
                    <div>
                      <h4 className="text-white font-semibold">{moderador.nombre}</h4>
                      <p className="text-white/70 text-sm">@{moderador.username}</p>
                      {moderador.email && (
                        <p className="text-white/60 text-sm">{moderador.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        moderador.is_active 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                      }`}>
                        {moderador.is_active ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                      <p className="text-white/60 text-xs mt-1">
                        Creado: {formatDate(moderador.created_at)}
                      </p>
                      {moderador.last_login && (
                        <p className="text-white/60 text-xs">
                          Último acceso: {formatDate(moderador.last_login)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(moderador.id, moderador.is_active)}
                        className={`p-2 rounded transition-colors ${
                          moderador.is_active
                            ? 'text-green-300 hover:bg-green-500/20'
                            : 'text-gray-300 hover:bg-gray-500/20'
                        }`}
                        title={moderador.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {moderador.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleEdit(moderador)}
                        className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(moderador.id)}
                        className="p-2 text-red-300 hover:bg-red-500/20 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de crear/editar moderador */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Editar Moderador' : 'Crear Nuevo Moderador'}
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
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!!editingId}
                />
                {editingId && (
                  <p className="text-gray-500 text-xs mt-1">El nombre de usuario no se puede cambiar</p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  {editingId ? 'Nueva Contraseña (dejar vacío para mantener actual)' : 'Contraseña'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!editingId}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email (Opcional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {editingId ? 'Actualizar' : 'Crear'} Moderador
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({
                      username: '',
                      password: '',
                      nombre: '',
                      email: ''
                    });
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
    </div>
  );
};

export default ModeradoresList;