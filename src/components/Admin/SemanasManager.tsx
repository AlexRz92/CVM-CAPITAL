import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { Calendar, Plus, Edit, Trash2, CheckCircle, Clock, AlertTriangle, Save, X } from 'lucide-react';

interface Mes {
  id: string;
  numero_mes: number;
  nombre_mes: string;
  fecha_inicio: string;
  fecha_fin: string;
  total_inversion: number;
  porcentaje_ganancia: number;
  ganancia_bruta: number;
  procesado: boolean;
  fecha_procesado?: string;
  admin_nombre?: string;
}

interface MesesManagerProps {
  onUpdate: () => void;
  onShowMessage?: (message: string) => void;
}

interface SuccessModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

interface ConfirmModalProps {
  show: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

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

const ConfirmModal: React.FC<ConfirmModalProps> = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <h3 className="text-xl font-bold text-gray-900">Confirmar Eliminación</h3>
        </div>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex space-x-4">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

const MesesManager: React.FC<MesesManagerProps> = ({ onUpdate, onShowMessage }) => {
  const { admin } = useAdmin();
  const [meses, setMeses] = useState<Mes[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [siguienteNumero, setSiguienteNumero] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    numero_mes: 1,
    nombre_mes: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  useEffect(() => {
    fetchMeses();
    fetchSiguienteNumero();
  }, []);

  // Generar nombre automático cuando cambia la fecha de inicio
  useEffect(() => {
    if (formData.fecha_inicio && !editingId) {
      const fechaInicio = new Date(formData.fecha_inicio);
      const nombreAutomatico = generarNombreMes(fechaInicio);
      setFormData(prev => ({ ...prev, nombre_mes: nombreAutomatico }));
    }
  }, [formData.fecha_inicio, editingId]);

  const generarNombreMes = (fecha: Date): string => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    
    return `${mes} ${año}`;
  };

  const fetchMeses = async () => {
    try {
      const { data, error } = await supabase.rpc('listar_meses');
      if (error) {
        console.error('Error fetching meses:', error);
        throw error;
      }
      setMeses(data || []);
    } catch (error) {
      console.error('Error fetching meses:', error);
      setSuccessMessage('Error al cargar los meses. Por favor, recarga la página.');
      setShowSuccessModal(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiguienteNumero = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_siguiente_numero_mes');
      if (error) {
        console.error('Error fetching siguiente numero:', error);
        throw error;
      }
      setSiguienteNumero(data || 1);
    } catch (error) {
      console.error('Error fetching siguiente numero:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    setSubmitting(true);

    try {
      let result;
      
      if (editingId) {
        console.log('Editando mes:', editingId, formData);
        const { data, error } = await supabase.rpc('editar_mes', {
          p_mes_id: editingId,
          p_numero_mes: formData.numero_mes,
          p_nombre_mes: formData.nombre_mes,
          p_fecha_inicio: formData.fecha_inicio,
          p_fecha_fin: formData.fecha_fin,
          p_admin_id: admin?.id
        });
        
        if (error) {
          console.error('Error en editar_mes:', error);
          throw error;
        }
        
        console.log('Resultado editar_mes:', data);
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('La función editar_mes no devolvió el resultado esperado. Verifique que la función de base de datos esté configurada correctamente.');
        }
        result = data[0];
      } else {
        console.log('Creando mes:', formData);
        const { data, error } = await supabase.rpc('crear_mes', {
          p_numero_mes: formData.numero_mes,
          p_nombre_mes: formData.nombre_mes,
          p_fecha_inicio: formData.fecha_inicio,
          p_fecha_fin: formData.fecha_fin,
          p_admin_id: admin?.id
        });
        
        if (error) {
          console.error('Error en crear_mes:', error);
          throw error;
        }
        
        console.log('Resultado crear_mes:', data);
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('La función crear_mes no devolvió el resultado esperado. Verifique que la función de base de datos esté configurada correctamente.');
        }
        result = data[0];
      }

      if (result.success) {
        setShowModal(false);
        setEditingId(null);
        resetForm();
        await fetchMeses();
        await fetchSiguienteNumero();
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate();
        }
        setSuccessMessage(result.message || 'Operación exitosa');
        setShowSuccessModal(true);
      } else {
        setSuccessMessage(result.error || 'Error en la operación');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error saving mes:', error);
      setSuccessMessage('Error al guardar el mes: ' + (error as Error).message);
      setShowSuccessModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (mes: Mes) => {
    setEditingId(mes.id);
    setFormData({
      numero_mes: mes.numero_mes,
      nombre_mes: mes.nombre_mes,
      fecha_inicio: mes.fecha_inicio,
      fecha_fin: mes.fecha_fin
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { data, error } = await supabase.rpc('eliminar_mes', {
        p_mes_id: id,
        p_admin_id: admin?.id
      });

      if (error) {
        console.error('Error en eliminar_mes:', error);
        throw error;
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('La función eliminar_mes no devolvió el resultado esperado. Verifique que la función de base de datos esté configurada correctamente.');
      }
      
      const result = data[0];

      if (result.success) {
        setShowDeleteModal(null);
        await fetchMeses();
        await fetchSiguienteNumero();
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate();
        }
        setSuccessMessage(result.message || 'Mes eliminado exitosamente');
        setShowSuccessModal(true);
      } else {
        setSuccessMessage(result.error || 'Error al eliminar el mes');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error deleting mes:', error);
      setSuccessMessage('Error al eliminar el mes: ' + (error as Error).message);
      setShowSuccessModal(true);
    }
  };

  const resetForm = () => {
    setFormData({
      numero_mes: siguienteNumero > 0 ? siguienteNumero : 1,
      nombre_mes: '',
      fecha_inicio: '',
      fecha_fin: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusIcon = (procesado: boolean) => {
    return procesado ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <Clock className="w-5 h-5 text-yellow-500" />
    );
  };

  const getStatusColor = (procesado: boolean) => {
    return procesado 
      ? 'bg-green-500/20 text-green-300 border-green-500/50'
      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
  };

  const getMesName = (numero: number) => {
    const nombres = [
      '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return nombres[numero] || `Mes ${numero}`;
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
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Calendar className="w-6 h-6 mr-3" />
            Gestión de Períodos Mensuales ({meses.length})
          </h3>
          
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            disabled={siguienteNumero === -1}
            className="flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/50"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Período</span>
          </button>
        </div>

        {siguienteNumero === -1 && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-yellow-300">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm font-medium">
                Debe procesar el período actual antes de crear un nuevo período.
              </p>
            </div>
          </div>
        )}

        {/* Lista de Meses */}
        {meses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay períodos configurados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meses.map((mes) => (
              <div key={mes.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{mes.numero_mes}</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="text-white font-semibold">{mes.nombre_mes}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border flex items-center space-x-1 ${getStatusColor(mes.procesado)}`}>
                          {getStatusIcon(mes.procesado)}
                          <span>{mes.procesado ? 'PROCESADO' : 'PENDIENTE'}</span>
                        </span>
                      </div>
                      <div className="text-white/70 text-sm">
                        <span>{formatDate(mes.fecha_inicio)} - {formatDate(mes.fecha_fin)}</span>
                        {mes.procesado && (
                          <span className="ml-4">
                            • Ganancia: {formatCurrency(mes.ganancia_bruta)} ({mes.porcentaje_ganancia}%)
                          </span>
                        )}
                      </div>
                      {mes.procesado && mes.fecha_procesado && (
                        <div className="text-white/60 text-xs mt-1">
                          Procesado: {formatDate(mes.fecha_procesado)}
                          {mes.admin_nombre && ` por ${mes.admin_nombre}`}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(mes)}
                      className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => setShowDeleteModal(mes.id)}
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

      {/* Modal de crear/editar mes */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Editar Mes' : 'Crear Nuevo Mes'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Número de Mes
                  </label>
                  <select
                    value={formData.numero_mes}
                    onChange={(e) => setFormData({...formData, numero_mes: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{getMesName(num)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nombre de Mes (Generado Automáticamente)
                </label>
                <input
                  type="text"
                  value={formData.nombre_mes}
                  onChange={(e) => setFormData({...formData, nombre_mes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Se genera automáticamente según la fecha de inicio"
                  required
                />
                <p className="text-gray-500 text-xs mt-1">
                  Se genera automáticamente basado en el mes de la fecha de inicio
                </p>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-blue-800 font-medium mb-2">Información Importante</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Las fechas no pueden solaparse con meses existentes</li>
                  <li>• El rango puede cruzar meses (ej: 30-01 al 04-02)</li>
                  <li>• La fecha de fin debe ser posterior a la de inicio</li>
                  <li>• El nombre se genera automáticamente según el mes de inicio</li>
                </ul>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingId ? 'Actualizar' : 'Crear'} Mes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        show={!!showDeleteModal}
        message="¿Estás seguro de que deseas eliminar este mes? Esta acción no se puede deshacer. Si el mes está procesado, también se eliminarán las transacciones asociadas."
        onConfirm={() => showDeleteModal && handleDelete(showDeleteModal)}
        onCancel={() => setShowDeleteModal(null)}
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

export default MesesManager;