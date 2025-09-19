import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { 
  Users, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  DollarSign,
  Key,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  User,
  Mail,
  Calendar
} from 'lucide-react';
import { hashPassword, generateSalt } from '../../utils/crypto';
import { TransaccionesManager } from './';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  total: number;
  created_at: string;
  last_login?: string;
  failed_attempts: number;
  locked_until?: string;
}

interface Partner {
  id: string;
  nombre: string;
  username: string;
  activo: boolean;
  created_at: string;
  last_login?: string;
}

interface UsuariosManagerProps {
  onStatsUpdate: () => void;
}

interface PasswordResetModalProps {
  show: boolean;
  inversor: Inversor | null;
  onConfirm: () => void;
  onCancel: () => void;
  processing: boolean;
}

interface SuccessModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ 
  show, 
  inversor, 
  onConfirm, 
  onCancel, 
  processing 
}) => {
  if (!show || !inversor) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <Key className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Restablecer Contraseña</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            ¿Estás seguro de que deseas restablecer la contraseña de <strong>{inversor.nombre} {inversor.apellido}</strong>?
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-yellow-800 font-semibold mb-2">Se restablecerán a valores temporales:</h4>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• <strong>Contraseña:</strong> "cvmcapital"</li>
              <li>• <strong>Pregunta de seguridad:</strong> "¿Cuál es tu comida favorita?"</li>
              <li>• <strong>Respuesta:</strong> "pizza"</li>
            </ul>
            <p className="text-yellow-700 text-sm mt-2 font-medium">
              El usuario deberá cambiar estos datos en su próximo inicio de sesión.
            </p>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={onConfirm}
            disabled={processing}
            className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Restableciendo...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Sí, Restablecer</span>
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

const SuccessModal: React.FC<SuccessModalProps> = ({ show, message, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Operación Exitosa</h3>
          <p className="text-gray-600 mb-6">{message}</p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};

const UsuariosManager: React.FC<UsuariosManagerProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermPartners, setSearchTermPartners] = useState('');
  const [activeTab, setActiveTab] = useState<'inversores' | 'partners'>('inversores');
  const [editingInversor, setEditingInversor] = useState<Inversor | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePartnerModal, setShowCreatePartnerModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState<string | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<Inversor | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [processingReset, setProcessingReset] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    pregunta_secreta: '',
    respuesta_secreta: ''
  });
  const [partnerFormData, setPartnerFormData] = useState({
    nombre: '',
    username: '',
    password: ''
  });
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    apellido: '',
    email: ''
  });
  const [editPartnerFormData, setEditPartnerFormData] = useState({
    nombre: '',
    username: '',
    activo: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      // Fetch inversores
      const { data: inversoresData, error: inversoresError } = await supabase
        .from('inversores')
        .select('*')
        .order('created_at', { ascending: false });

      if (inversoresError) throw inversoresError;

      // Fetch partners
      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;

      setInversores(inversoresData || []);
      setPartners(partnersData || []);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!showPasswordResetModal) return;

    setProcessingReset(true);
    try {
      // Generar salt y hashear contraseña temporal
      const salt = generateSalt();
      const hashedPassword = hashPassword('cvmcapital', salt);

      // Actualizar inversor con datos temporales
      const { error } = await supabase
        .from('inversores')
        .update({
          password_hash: hashedPassword,
          password_salt: salt,
          pregunta_secreta: '¿Cuál es tu comida favorita?',
          respuesta_secreta: 'pizza',
          failed_attempts: 0,
          locked_until: null
        })
        .eq('id', showPasswordResetModal.id);

      if (error) throw error;

      // Crear notificación para el inversor
      const { error: notificationError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: showPasswordResetModal.id,
          tipo_usuario: 'inversor',
          titulo: 'Contraseña Restablecida',
          mensaje: 'Tu contraseña ha sido restablecida por el administrador. Usa la contraseña temporal "cvmcapital" para iniciar sesión y cambiar tus datos de seguridad.',
          tipo_notificacion: 'warning',
          leida: false,
          fecha_creacion: new Date().toISOString()
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      setShowPasswordResetModal(null);
      setSuccessMessage(`Contraseña de ${showPasswordResetModal.nombre} ${showPasswordResetModal.apellido} restablecida exitosamente. El usuario ha sido notificado y debe usar la contraseña temporal "cvmcapital" en su próximo inicio de sesión.`);
      setShowSuccessModal(true);
      fetchUsuarios();
      onStatsUpdate();
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error al restablecer la contraseña: ' + (error as Error).message);
    } finally {
      setProcessingReset(false);
    }
  };

  const handleCreateInversor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;

    setSubmitting(true);
    try {
      // Verificar si el email ya existe
      const { data: existingUser, error: checkError } = await supabase
        .from('inversores')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        alert('Este correo ya está registrado');
        setSubmitting(false);
        return;
      }

      // Generar salt y hashear contraseña
      const salt = generateSalt();
      const hashedPassword = hashPassword(formData.password, salt);

      // Crear nuevo inversor
      const { error: insertError } = await supabase
        .from('inversores')
        .insert({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email.toLowerCase(),
          password_hash: hashedPassword,
          password_salt: salt,
          pregunta_secreta: formData.pregunta_secreta,
          respuesta_secreta: formData.respuesta_secreta.toLowerCase(),
          capital_inicial2: 0,
          ganancia_semanal2: 0,
          total: 0
        });

      if (insertError) throw insertError;

      setShowCreateModal(false);
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        pregunta_secreta: '',
        respuesta_secreta: ''
      });
      fetchUsuarios();
      onStatsUpdate();
      setSuccessMessage('Inversor creado exitosamente');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating inversor:', error);
      alert('Error al crear inversor: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInversor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInversor) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('inversores')
        .update({
          nombre: editFormData.nombre,
          apellido: editFormData.apellido,
          email: editFormData.email.toLowerCase()
        })
        .eq('id', editingInversor.id);

      if (error) throw error;

      setEditingInversor(null);
      setEditFormData({ nombre: '', apellido: '', email: '' });
      fetchUsuarios();
      onStatsUpdate();
      setSuccessMessage('Inversor actualizado exitosamente');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating inversor:', error);
      alert('Error al actualizar inversor: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInversor = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este inversor? Esta acción eliminará todas sus transacciones y no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('inversores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchUsuarios();
      onStatsUpdate();
      setSuccessMessage('Inversor eliminado exitosamente');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting inversor:', error);
      alert('Error al eliminar inversor: ' + (error as Error).message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredInversores = inversores.filter(inv => 
    inv.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPartners = partners.filter(partner => 
    partner.nombre.toLowerCase().includes(searchTermPartners.toLowerCase()) ||
    partner.username.toLowerCase().includes(searchTermPartners.toLowerCase())
  );

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
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Users className="w-6 h-6 mr-3" />
          Gestión de Usuarios
        </h3>

        {/* Navegación de tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('inversores')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === 'inversores'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Inversores ({inversores.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('partners')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === 'partners'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Partners ({partners.length})</span>
          </button>
        </div>

        {/* Botón de crear */}
        <div className="flex justify-end">
          <button
            onClick={() => activeTab === 'inversores' ? setShowCreateModal(true) : setShowCreatePartnerModal(true)}
            className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors border border-green-400/50"
          >
            <Plus className="w-4 h-4" />
            <span>Crear {activeTab === 'inversores' ? 'Inversor' : 'Partner'}</span>
          </button>
        </div>
      </div>

      {/* Gestión de Inversores */}
      {activeTab === 'inversores' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-white">Inversores Registrados</h4>
            
            {/* Búsqueda */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 w-5 h-5 text-white/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Buscar inversor..."
              />
            </div>
          </div>

          {filteredInversores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70">
                {searchTerm ? 'No se encontraron inversores' : 'No hay inversores registrados'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {filteredInversores.map((inversor) => (
                <div key={inversor.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                  {editingInversor?.id === inversor.id ? (
                    // Modo edición
                    <form onSubmit={handleEditInversor} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-white/80 text-sm mb-1">Nombre</label>
                          <input
                            type="text"
                            value={editFormData.nombre}
                            onChange={(e) => setEditFormData({...editFormData, nombre: e.target.value})}
                            className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-white/80 text-sm mb-1">Apellido</label>
                          <input
                            type="text"
                            value={editFormData.apellido}
                            onChange={(e) => setEditFormData({...editFormData, apellido: e.target.value})}
                            className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-white/80 text-sm mb-1">Email</label>
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                            className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-3 py-2 rounded hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          <span>{submitting ? 'Guardando...' : 'Guardar'}</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInversor(null);
                            setEditFormData({ nombre: '', apellido: '', email: '' });
                          }}
                          disabled={submitting}
                          className="flex items-center space-x-2 bg-gray-500/20 text-gray-300 px-3 py-2 rounded hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Modo visualización
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        
                        <div>
                          <h5 className="text-white font-semibold">
                            {inversor.nombre} {inversor.apellido}
                          </h5>
                          <p className="text-white/70 text-sm">{inversor.email}</p>
                          <div className="flex items-center space-x-4 text-xs text-white/60 mt-1">
                            <span>Saldo: {formatCurrency(inversor.total)}</span>
                            <span>Registro: {formatDate(inversor.created_at)}</span>
                            {inversor.last_login && (
                              <span>Último login: {formatDate(inversor.last_login)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowTransactionsModal(inversor.id)}
                          className="p-2 text-green-300 hover:bg-green-500/20 rounded transition-colors"
                          title="Ver transacciones"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setShowPasswordResetModal(inversor)}
                          className="p-2 text-yellow-300 hover:bg-yellow-500/20 rounded transition-colors"
                          title="Restablecer contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setEditingInversor(inversor);
                            setEditFormData({
                              nombre: inversor.nombre,
                              apellido: inversor.apellido,
                              email: inversor.email
                            });
                          }}
                          className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteInversor(inversor.id)}
                          className="p-2 text-red-300 hover:bg-red-500/20 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gestión de Partners */}
      {activeTab === 'partners' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-white">Partners Registrados</h4>
            
            {/* Búsqueda */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 w-5 h-5 text-white/60" />
              <input
                type="text"
                value={searchTermPartners}
                onChange={(e) => setSearchTermPartners(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Buscar partner..."
              />
            </div>
          </div>

          {filteredPartners.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70">
                {searchTermPartners ? 'No se encontraron partners' : 'No hay partners registrados'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPartners.map((partner) => (
                <div key={partner.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <h5 className="text-white font-semibold">{partner.nombre}</h5>
                        <p className="text-white/70 text-sm">@{partner.username}</p>
                        <div className="flex items-center space-x-4 text-xs text-white/60 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            partner.activo 
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {partner.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                          <span>Registro: {formatDate(partner.created_at)}</span>
                          {partner.last_login && (
                            <span>Último login: {formatDate(partner.last_login)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          // Implementar edición de partner si es necesario
                        }}
                        className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de crear inversor */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Crear Nuevo Inversor</h3>
            
            <form onSubmit={handleCreateInversor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Apellido *</label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Contraseña *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Pregunta de Seguridad *</label>
                <input
                  type="text"
                  value={formData.pregunta_secreta}
                  onChange={(e) => setFormData({...formData, pregunta_secreta: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: ¿Cuál es tu comida favorita?"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Respuesta de Seguridad *</label>
                <input
                  type="text"
                  value={formData.respuesta_secreta}
                  onChange={(e) => setFormData({...formData, respuesta_secreta: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Respuesta a la pregunta de seguridad"
                  required
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creando...' : 'Crear Inversor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      nombre: '',
                      apellido: '',
                      email: '',
                      password: '',
                      pregunta_secreta: '',
                      respuesta_secreta: ''
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

      {/* Modal de transacciones */}
      {showTransactionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Gestión de Transacciones</h3>
              <button
                onClick={() => setShowTransactionsModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <TransaccionesManager
              inversorId={showTransactionsModal}
              inversorNombre={inversores.find(inv => inv.id === showTransactionsModal)?.nombre + ' ' + inversores.find(inv => inv.id === showTransactionsModal)?.apellido || 'Usuario'}
              isAdmin={true}
              onUpdate={() => {
                fetchUsuarios();
                onStatsUpdate();
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de restablecer contraseña */}
      <PasswordResetModal
        show={!!showPasswordResetModal}
        inversor={showPasswordResetModal}
        onConfirm={handlePasswordReset}
        onCancel={() => setShowPasswordResetModal(null)}
        processing={processingReset}
      />

      {/* Modal de éxito */}
      <SuccessModal
        show={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
};

export default UsuariosManager;
