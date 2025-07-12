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

interface CalendarMonthsManagerProps {
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

const CalendarMonthsManager: React.FC<CalendarMonthsManagerProps> = ({ onUpdate, onShowMessage }) => {
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
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    numero_mes: 1,
    nombre_mes: '',
    año: new Date().getFullYear()
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchMeses();
    fetchSiguienteNumero();
  }, []);

  const fetchMeses = async () => {
    try {
      console.log('Fetching meses del sistema...');
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

  // Función para calcular el rango completo del mes
  const calcularRangoMes = (numeroMes: number, año: number) => {
    // Primer día del mes
    const fechaInicio = new Date(año, numeroMes - 1, 1);
    
    // Último día del mes
    const fechaFin = new Date(año, numeroMes, 0);
    
    return {
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      nombre_mes: `${monthNames[numeroMes - 1]} ${año}`
    };
  };

  // Actualizar datos cuando cambia el mes o año
  useEffect(() => {
    if (formData.numero_mes && formData.año) {
      const rangoCalculado = calcularRangoMes(formData.numero_mes, formData.año);
      setFormData(prev => ({
        ...prev,
        nombre_mes: rangoCalculado.nombre_mes
      }));
    }
  }, [formData.numero_mes, formData.año]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    setSubmitting(true);

    try {
      // Calcular el rango completo del mes
      const rangoMes = calcularRangoMes(formData.numero_mes, formData.año);
      
      let result;
      
      if (editingId) {
        const { data, error } = await supabase.rpc('editar_mes', {
          p_mes_id: editingId,
          p_numero_mes: formData.numero_mes,
          p_nombre_mes: rangoMes.nombre_mes,
          p_fecha_inicio: rangoMes.fecha_inicio,
          p_fecha_fin: rangoMes.fecha_fin,
          p_admin_id: admin?.id
        });
        
        if (error) throw error;
        result = data[0];
      } else {
        const { data, error } = await supabase.rpc('crear_mes', {
          p_numero_mes: formData.numero_mes,
          p_nombre_mes: rangoMes.nombre_mes,
          p_fecha_inicio: rangoMes.fecha_inicio,
          p_fecha_fin: rangoMes.fecha_fin,
          p_admin_id: admin?.id
        });
        
        if (error) throw error;
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
    
    // Extraer año del nombre del mes
    const añoMatch = mes.nombre_mes.match(/\d{4}/);
    const año = añoMatch ? parseInt(añoMatch[0]) : new Date().getFullYear();
    
    setFormData({
      numero_mes: mes.numero_mes,
      nombre_mes: mes.nombre_mes,
      año: año
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('Eliminando mes y sus ganancias asociadas:', id);
      
      const { data, error } = await supabase.rpc('eliminar_mes', {
        p_mes_id: id,
        p_admin_id: admin?.id
      });

      if (error) throw error;
      
      const result = data[0];

      if (result.success) {
        setShowDeleteModal(null);
        await fetchMeses();
        await fetchSiguienteNumero();
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate();
        }
        setSuccessMessage(result.message || 'Período mensual eliminado exitosamente. Las ganancias asociadas también fueron eliminadas.');
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
      año: currentYear
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

  const getMesData = (numeroMes: number) => {
    return meses.find(m => m.numero_mes === numeroMes);
  };

  const getMonthStatus = (numeroMes: number) => {
    const mesData = getMesData(numeroMes);
    if (!mesData) return 'empty';
    return mesData.procesado ? 'processed' : 'pending';
  };

  const getMonthColor = (numeroMes: number) => {
    const status = getMonthStatus(numeroMes);
    switch (status) {
      case 'processed':
        return 'bg-gray-400 text-gray-700 cursor-not-allowed';
      case 'pending':
        return 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500';
      default:
        return 'bg-white/20 text-white hover:bg-white/30';
    }
  };

  const handleMonthClick = (numeroMes: number) => {
    const mesData = getMesData(numeroMes);
    if (mesData) {
      handleEdit(mesData);
    } else if (siguienteNumero !== -1) {
      setFormData({
        numero_mes: numeroMes,
        nombre_mes: '',
        año: currentYear
      });
      setShowModal(true);
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
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Calendar className="w-6 h-6 mr-3" />
            Gestión de Períodos Mensuales - {currentYear}
          </h3>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentYear(currentYear - 1)}
                className="px-3 py-1 bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
              >
                ←
              </button>
              <span className="text-white font-semibold">{currentYear}</span>
              <button
                onClick={() => setCurrentYear(currentYear + 1)}
                className="px-3 py-1 bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
              >
                →
              </button>
            </div>
          </div>
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

        {/* Calendario de Meses */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {monthNames.map((monthName, index) => {
            const numeroMes = index + 1;
            const mesData = getMesData(numeroMes);
            const status = getMonthStatus(numeroMes);
            
            return (
              <div
                key={numeroMes}
                onClick={() => handleMonthClick(numeroMes)}
                className={`relative p-4 rounded-lg border-2 border-white/30 transition-all duration-200 cursor-pointer ${getMonthColor(numeroMes)}`}
              >
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold">{numeroMes}</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{monthName}</h4>
                  
                  {mesData && (
                    <div className="text-xs space-y-1">
                      <p>{mesData.nombre_mes}</p>
                      {mesData.procesado && (
                        <p className="font-semibold">
                          {formatCurrency(mesData.ganancia_bruta)}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Indicador de estado */}
                  <div className="absolute top-2 right-2">
                    {status === 'processed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {status === 'pending' && <Clock className="w-4 h-4 text-yellow-600" />}
                  </div>
                  
                  {/* Botones de acción */}
                  {mesData && (
                    <div className="absolute bottom-2 right-2 flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(mesData);
                        }}
                        className="p-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal(mesData.id);
                        }}
                        className="p-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-white/20 rounded"></div>
            <span className="text-white/80">Sin configurar</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className="text-white/80">Pendiente</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-white/80">Procesado</span>
          </div>
        </div>
      </div>


      {/* Modal de crear/editar mes */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Editar Período Mensual' : 'Crear Nuevo Período Mensual'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Mes
                  </label>
                  <select
                    value={formData.numero_mes}
                    onChange={(e) => setFormData({...formData, numero_mes: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {monthNames.map((name, index) => (
                      <option key={index + 1} value={index + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Año
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.año}
                    onChange={(e) => setFormData({...formData, año: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nombre del Período (Generado Automáticamente)
                </label>
                <input
                  type="text"
                  value={formData.nombre_mes}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Se genera automáticamente"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Se configura automáticamente el período completo del mes seleccionado
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-blue-800 font-medium mb-2">Configuración Automática</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• El sistema configurará automáticamente todo el mes seleccionado</li>
                  <li>• Fecha de inicio: Primer día del mes</li>
                  <li>• Fecha de fin: Último día del mes</li>
                  <li>• No es necesario especificar rangos manualmente</li>
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
                      <span>{editingId ? 'Actualizar' : 'Crear'} Período</span>
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
        message="¿Estás seguro de que deseas eliminar este período mensual? Esta acción eliminará el período y TODAS las ganancias procesadas asociadas a este mes. Los totales de los usuarios se recalcularán automáticamente. Esta acción NO se puede deshacer."
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

export default CalendarMonthsManager;