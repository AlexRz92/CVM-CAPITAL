import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { MessageSquare, Plus, Edit, Trash2, Eye, EyeOff, Send, AlertTriangle } from 'lucide-react';

interface Aviso {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_expiracion?: string;
  creado_por: string;
  admins: {
    nombre: string;
  };
}

interface AvisosListProps {
  onStatsUpdate: () => void;
}

const AvisosList: React.FC<AvisosListProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'info',
    fecha_expiracion: '',
    enviar_notificacion: false
  });

  useEffect(() => {
    fetchAvisos();
  }, []);

  const fetchAvisos = async () => {
    try {
      const { data, error } = await supabase
        .from('avisos')
        .select(`
          *,
          admins (
            nombre
          )
        `)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setAvisos(data || []);
    } catch (error) {
      console.error('Error fetching avisos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Actualizar aviso existente
        const { error } = await supabase
          .from('avisos')
          .update({
            titulo: formData.titulo,
            mensaje: formData.mensaje,
            tipo: formData.tipo,
            fecha_expiracion: formData.fecha_expiracion || null
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Crear nuevo aviso
        if (formData.enviar_notificacion) {
          // Usar la función para enviar a todos los inversores
          setSendingNotification(true);
          const { error } = await supabase.rpc('enviar_aviso_a_todos_inversores', {
            p_titulo: formData.titulo,
            p_mensaje: formData.mensaje,
            p_tipo: formData.tipo,
            p_admin_id: admin?.id
          });

          if (error) throw error;
          setSendingNotification(false);
        } else {
          // Solo crear el aviso sin notificaciones
          const { error } = await supabase
            .from('avisos')
            .insert({
              titulo: formData.titulo,
              mensaje: formData.mensaje,
              tipo: formData.tipo,
              fecha_expiracion: formData.fecha_expiracion || null,
              creado_por: admin?.id
            });

          if (error) throw error;
        }
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({
        titulo: '',
        mensaje: '',
        tipo: 'info',
        fecha_expiracion: '',
        enviar_notificacion: false
      });
      fetchAvisos();
      onStatsUpdate();
    } catch (error) {
      console.error('Error saving aviso:', error);
    } finally {
      setSendingNotification(false);
    }
  };

  const handleEdit = (aviso: Aviso) => {
    setEditingId(aviso.id);
    setFormData({
      titulo: aviso.titulo,
      mensaje: aviso.mensaje,
      tipo: aviso.tipo,
      fecha_expiracion: aviso.fecha_expiracion ? aviso.fecha_expiracion.split('T')[0] : '',
      enviar_notificacion: false
    });
    setShowModal(true);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('avisos')
        .update({ activo: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAvisos();
      onStatsUpdate();
    } catch (error) {
      console.error('Error toggling aviso status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('avisos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setShowDeleteModal(null);
      fetchAvisos();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting aviso:', error);
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

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'error':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
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
      {/* Header con botón de crear */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <MessageSquare className="w-6 h-6 mr-3" />
            Avisos del Sistema ({avisos.length})
          </h3>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Aviso</span>
          </button>
        </div>
        
        {avisos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay avisos creados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {avisos.map((aviso) => (
              <div key={aviso.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-white font-semibold">{aviso.titulo}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getTypeColor(aviso.tipo)}`}>
                        {aviso.tipo.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        aviso.activo 
                          ? 'bg-green-500/20 text-green-300 border-green-500/50'
                          : 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                      }`}>
                        {aviso.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    
                    <p className="text-white/80 mb-3">{aviso.mensaje}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-white/60">
                      <span>Por: {aviso.admins.nombre}</span>
                      <span>•</span>
                      <span>{formatDate(aviso.fecha_creacion)}</span>
                      {aviso.fecha_expiracion && (
                        <>
                          <span>•</span>
                          <span>Expira: {formatDate(aviso.fecha_expiracion)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(aviso.id, aviso.activo)}
                      className={`p-2 rounded transition-colors ${
                        aviso.activo
                          ? 'text-green-300 hover:bg-green-500/20'
                          : 'text-gray-300 hover:bg-gray-500/20'
                      }`}
                      title={aviso.activo ? 'Desactivar' : 'Activar'}
                    >
                      {aviso.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(aviso)}
                      className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => setShowDeleteModal(aviso.id)}
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

      {/* Modal de crear/editar aviso */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Editar Aviso' : 'Crear Nuevo Aviso'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Mensaje
                </label>
                <textarea
                  value={formData.mensaje}
                  onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Tipo
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Información</option>
                    <option value="success">Éxito</option>
                    <option value="warning">Advertencia</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Fecha de Expiración (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_expiracion}
                    onChange={(e) => setFormData({...formData, fecha_expiracion: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {!editingId && (
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="enviar_notificacion"
                    checked={formData.enviar_notificacion}
                    onChange={(e) => setFormData({...formData, enviar_notificacion: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enviar_notificacion" className="text-sm text-gray-700 flex items-center space-x-2">
                    <Send className="w-4 h-4 text-blue-600" />
                    <span>Enviar notificación a todos los inversores</span>
                  </label>
                </div>
              )}
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {sendingNotification ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>{editingId ? 'Actualizar' : 'Crear'} Aviso</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({
                      titulo: '',
                      mensaje: '',
                      tipo: 'info',
                      fecha_expiracion: '',
                      enviar_notificacion: false
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

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-xl font-bold text-gray-900">Confirmar Eliminación</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar este aviso? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
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

export default AvisosList;