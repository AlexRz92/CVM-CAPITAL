import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import TransaccionesManager from './TransaccionesManager';
import { User, DollarSign, Calendar, ChevronDown, ChevronRight, Trash2, AlertTriangle, Minus, CheckSquare, Square, CheckCircle, X, Plus } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  ganancia_semanal2: number;
  total: number;
  created_at: string;
  ganancia_mensual_calculada?: number;
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

// Función para validar entrada
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>'"]/g, '');
};

// Función para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};
interface InversoresListProps {
  onStatsUpdate: () => void;
}

interface MessageModalProps {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ show, title, message, type, onClose }) => {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-blue-600" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-900';
      case 'error':
        return 'bg-red-100 text-red-900';
      default:
        return 'bg-blue-100 text-blue-900';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${getColors()}`}>
            {getIcon()}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
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

const InversoresList: React.FC<InversoresListProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInversor, setSelectedInversor] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState<string | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyReason, setPenaltyReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedInversores, setSelectedInversores] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: '',
    apellido: '',
    email: ''
  });
  const [messageModal, setMessageModal] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  const showMessage = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessageModal({ title, message, type });
    setShowMessageModal(true);
  };

  useEffect(() => {
    fetchInversores();
  }, []);

  const fetchInversores = async () => {
    try {
      const { data, error } = await supabase
        .from('inversores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Calcular ganancia mensual para cada inversor desde transacciones
      const inversoresConGanancias = await Promise.all(
        (data || []).map(async (inversor) => {
          // Obtener ganancias mensuales del inversor
          const { data: ganancias, error: gananciasError } = await supabase
            .from('transacciones')
            .select('monto')
            .eq('inversor_id', inversor.id)
            .eq('usuario_tipo', 'inversor')
            .eq('tipo', 'ganancia');

          let gananciaMensualCalculada = 0;
          if (!gananciasError && ganancias) {
            gananciaMensualCalculada = ganancias.reduce((sum, t) => sum + Number(t.monto), 0);
          }

          return {
            ...inversor,
            ganancia_mensual_calculada: gananciaMensualCalculada
          };
        })
      );
      
      setInversores(inversoresConGanancias);
    } catch (error) {
      console.error('Error fetching inversores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInversor = async (inversorId: string) => {
    if (admin?.role !== 'admin') return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('inversores')
        .delete()
        .eq('id', inversorId);

      if (error) throw error;

      setShowDeleteModal(null);
      fetchInversores();
      onStatsUpdate();
      showMessage('Éxito', 'Inversor eliminado exitosamente', 'success');
    } catch (error) {
      console.error('Error deleting inversor:', error);
      showMessage('Error', 'Error al eliminar el inversor', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handlePenaltySubmit = async () => {
    if (!showPenaltyModal || !penaltyAmount || !penaltyReason.trim()) return;
    
    const amount = parseFloat(penaltyAmount);
    if (amount <= 0) {
      showMessage('Error', 'El monto debe ser mayor a 0', 'error');
      return;
    }

    setProcessing(true);
    try {
      // Crear transacción de retiro con motivo de penalización
      const { error } = await supabase
        .from('transacciones')
        .insert({
          inversor_id: showPenaltyModal,
          monto: amount,
          tipo: 'retiro',
          descripcion: `PENALIZACIÓN: ${penaltyReason.trim()}`
        });

      if (error) throw error;

      setShowPenaltyModal(null);
      setPenaltyAmount('');
      setPenaltyReason('');
      fetchInversores();
      onStatsUpdate();
      showMessage('Éxito', 'Penalización aplicada exitosamente', 'success');
    } catch (error) {
      console.error('Error applying penalty:', error);
      showMessage('Error', 'Error al aplicar la penalización', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectInversor = (inversorId: string) => {
    setSelectedInversores(prev => 
      prev.includes(inversorId) 
        ? prev.filter(id => id !== inversorId)
        : [...prev, inversorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInversores.length === inversores.length) {
      setSelectedInversores([]);
    } else {
      setSelectedInversores(inversores.map(inv => inv.id));
    }
  };

  const handleBulkDelete = async () => {
    if (admin?.role !== 'admin' || selectedInversores.length === 0) return;
    
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('inversores')
        .delete()
        .in('id', selectedInversores);

      if (error) throw error;

      setShowBulkDeleteModal(false);
      setSelectedInversores([]);
      fetchInversores();
      onStatsUpdate();
      showMessage('Éxito', `${selectedInversores.length} inversores eliminados exitosamente`, 'success');
    } catch (error) {
      console.error('Error bulk deleting inversores:', error);
      showMessage('Error', 'Error al eliminar los inversores', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCreateInversor = async () => {
    if (!createForm.nombre.trim() || !createForm.apellido.trim() || !createForm.email.trim()) {
      showMessage('Error', 'Todos los campos son requeridos', 'error');
      return;
    }

    const sanitizedEmail = sanitizeInput(createForm.email.toLowerCase());
    const sanitizedNombre = sanitizeInput(createForm.nombre);
    const sanitizedApellido = sanitizeInput(createForm.apellido);

    if (!isValidEmail(sanitizedEmail)) {
      showMessage('Error', 'Formato de email inválido', 'error');
      return;
    }

    setCreating(true);
    try {
      // Verificar si el email ya existe
      const { data: existingUser, error: checkError } = await supabase
        .from('inversores')
        .select('id')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      if (checkError) {
        throw new Error('Error verificando email: ' + checkError.message);
      }

      if (existingUser) {
        showMessage('Error', 'Este correo ya está registrado', 'error');
        setCreating(false);
        return;
      }

      // Generar salt y hashear contraseña temporal
      const salt = generateSalt();
      const hashedPassword = hashPassword('cvmcapital', salt);

      // Insertar nuevo inversor
      const { data: newUser, error: insertError } = await supabase
        .from('inversores')
        .insert({
          nombre: sanitizedNombre,
          apellido: sanitizedApellido,
          email: sanitizedEmail,
          password_hash: hashedPassword,
          password_salt: salt,
          pregunta_secreta: '¿Cuál es tu comida favorita?',
          respuesta_secreta: 'pizza',
          ganancia_semanal2: 0,
          total: 0
        })
        .select()
        .single();

      if (insertError) {
        throw new Error('Error al crear inversor: ' + insertError.message);
      }

      setShowCreateModal(false);
      setCreateForm({ nombre: '', apellido: '', email: '' });
      fetchInversores();
      onStatsUpdate();
      showMessage('Éxito', `Inversor creado exitosamente. Contraseña temporal: "cvmcapital". El usuario debe cambiarla en su primer login.`, 'success');
    } catch (error) {
      console.error('Error creating inversor:', error);
      showMessage('Error', (error as Error).message, 'error');
    } finally {
      setCreating(false);
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
      {/* Lista de Inversores con scroll */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <User className="w-6 h-6 mr-3" />
          Gestión de Inversores ({inversores.length})
        </h3>
        
          
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors border border-green-400/50"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Inversor</span>
            </button>
            
          {admin?.role === 'admin' && inversores.length > 0 && (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors text-sm"
              >
                {selectedInversores.length === inversores.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>
                  {selectedInversores.length === inversores.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </span>
              </button>
              
              {selectedInversores.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-colors border border-red-400/50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar ({selectedInversores.length})</span>
                </button>
              )}
            </div>
          )}
          </div>
        {inversores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay inversores registrados</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
            {inversores.map((inversor) => (
              <div key={inversor.id} className="bg-white/10 rounded-lg border border-white/20">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    {admin?.role === 'admin' && (
                      <button
                        onClick={() => handleSelectInversor(inversor.id)}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        {selectedInversores.includes(inversor.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">
                          {inversor.nombre} {inversor.apellido}
                        </h4>
                        <p className="text-white/70 text-sm">{inversor.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {formatCurrency(inversor.total)}
                        </p>
                        <p className="text-white/70 text-sm">Total</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-yellow-300 font-semibold">
                          {formatCurrency(inversor.ganancia_mensual_calculada || 0)}
                        </p>
                        <p className="text-white/70 text-sm">Mensual</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-white/80 text-sm">
                          {formatDate(inversor.created_at)}
                        </p>
                        <p className="text-white/70 text-sm">Registro</p>
                      </div>

                      {admin?.role === 'admin' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowPenaltyModal(inversor.id)}
                            className="p-2 text-yellow-300 hover:bg-yellow-500/20 rounded transition-colors"
                            title="Aplicar Penalización"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => setShowDeleteModal(inversor.id)}
                            className="p-2 text-red-300 hover:bg-red-500/20 rounded transition-colors"
                            title="Eliminar Inversor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={() => setSelectedInversor(
                          selectedInversor === inversor.id ? null : inversor.id
                        )}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        {selectedInversor === inversor.id ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                {selectedInversor === inversor.id && (
                  <div className="border-t border-white/20 p-4">
                    <TransaccionesManager 
                      inversorId={inversor.id}
                      inversorNombre={`${inversor.nombre} ${inversor.apellido}`}
                      isAdmin={admin?.role === 'admin'}
                      onUpdate={fetchInversores}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de crear inversor */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Crear Nuevo Inversor</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm({...createForm, nombre: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del inversor"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Apellido
                </label>
                <input
                  type="text"
                  value={createForm.apellido}
                  onChange={(e) => setCreateForm({...createForm, apellido: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Apellido del inversor"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@ejemplo.com"
                  required
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-blue-800 font-semibold mb-2">Datos Temporales</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Contraseña temporal: <strong>cvmcapital</strong></li>
                  <li>• Pregunta de seguridad: "¿Cuál es tu comida favorita?"</li>
                  <li>• Respuesta temporal: <strong>pizza</strong></li>
                  <li>• El usuario debe cambiar estos datos en su primer login</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleCreateInversor}
                disabled={creating || !createForm.nombre.trim() || !createForm.apellido.trim() || !createForm.email.trim()}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Crear Inversor</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({ nombre: '', apellido: '', email: '' });
                }}
                disabled={creating}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
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
              ¿Estás seguro de que deseas eliminar este inversor? Esta acción eliminará:
            </p>
            
            <ul className="text-gray-600 mb-6 list-disc list-inside space-y-1">
              <li>Todos los datos del inversor</li>
              <li>Todas sus transacciones</li>
              <li>Todas sus solicitudes</li>
              <li>Todas sus notificaciones</li>
            </ul>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-red-800 text-sm font-medium">
                ⚠️ Esta acción NO se puede deshacer
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => handleDeleteInversor(showDeleteModal)}
                disabled={processing}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Inversor</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={processing}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación múltiple */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-xl font-bold text-gray-900">Confirmar Eliminación Múltiple</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas eliminar {selectedInversores.length} inversores? Esta acción eliminará:
            </p>
            
            <ul className="text-gray-600 mb-6 list-disc list-inside space-y-1">
              <li>Todos los datos de los inversores seleccionados</li>
              <li>Todas sus transacciones</li>
              <li>Todas sus solicitudes</li>
              <li>Todas sus notificaciones</li>
            </ul>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-red-800 text-sm font-medium">
                ⚠️ Esta acción NO se puede deshacer
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {bulkDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar {selectedInversores.length} Inversores</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de penalización */}
      {showPenaltyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <Minus className="w-8 h-8 text-yellow-500" />
              <h3 className="text-xl font-bold text-gray-900">Aplicar Penalización</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Esto creará un retiro automático con el motivo especificado.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Monto de la Penalización (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Motivo de la Penalización
                </label>
                <textarea
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Describe el motivo de la penalización..."
                  required
                />
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Nota:</strong> Esta transacción aparecerá en el historial del inversor como "PENALIZACIÓN: [motivo]"
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handlePenaltySubmit}
                disabled={processing || !penaltyAmount || !penaltyReason.trim()}
                className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4" />
                    <span>Aplicar Penalización</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowPenaltyModal(null);
                  setPenaltyAmount('');
                  setPenaltyReason('');
                }}
                disabled={processing}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de mensajes */}
      <MessageModal
        show={showMessageModal}
        title={messageModal.title}
        message={messageModal.message}
        type={messageModal.type}
        onClose={() => setShowMessageModal(false)}
      />
    </div>
  );
};

export default InversoresList;