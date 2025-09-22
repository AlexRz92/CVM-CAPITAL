import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { Calendar, Plus, Edit, Trash2, CheckCircle, Clock, AlertTriangle, Save, X, RotateCcw, Users } from 'lucide-react';

interface ModuloMes {
  id: string;
  modulo_id: string;
  numero_mes: number;
  nombre_mes: string;
  semana: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  total_inversion: number;
  porcentaje_ganancia: number;
  ganancia_bruta: number;
  procesado: boolean;
  fecha_procesado?: string;
  admin_nombre?: string;
  tipo_periodo: 'mensual' | 'semanal';
}

interface ModuloCalendarManagerProps {
  moduloId: string;
  moduloNombre: string;
  showMessage: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
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

const ModuloCalendarManager: React.FC<ModuloCalendarManagerProps> = ({ moduloId, moduloNombre, showMessage }) => {
  const { admin } = useAdmin();
  const [meses, setMeses] = useState<ModuloMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showRollbackInfo, setShowRollbackInfo] = useState<any>(null);
  const [deletingWithRollback, setDeletingWithRollback] = useState(false);
  const [siguienteNumero, setSiguienteNumero] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [tipoPeriodo, setTipoPeriodo] = useState<'mensual' | 'semanal'>('mensual');
  const [tipoPeriodoLocked, setTipoPeriodoLocked] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Para modo semanal
  const [formData, setFormData] = useState({
    numero_mes: 1,
    nombre_mes: '',
    año: new Date().getFullYear(),
    tipo_periodo: 'mensual' as 'mensual' | 'semanal',
    mes_seleccionado: new Date().getMonth() + 1 // Para semanas
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Generar nombres de semanas basados en el mes seleccionado
  const getWeekNamesForMonth = (month: number, year: number) => {
    const weeks = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    // Encontrar el primer lunes del mes o anterior
    let currentDate = new Date(firstDay);
    const dayOfWeek = currentDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentDate.setDate(currentDate.getDate() - daysToMonday);
    
    let weekNumber = 1;
    while (currentDate <= lastDay) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      weeks.push({
        number: weekNumber,
        name: `Semana ${weekNumber}`,
        fullName: `Semana ${weekNumber} de ${monthNames[month - 1]}`,
        start: weekStart,
        end: weekEnd
      });
      
      currentDate.setDate(currentDate.getDate() + 7);
      weekNumber++;
    }
    
    return weeks;
  };

  useEffect(() => {
    if (moduloId) {
      fetchMeses();
      fetchSiguienteNumero();
      checkTipoPeriodoExistente();
    }
  }, [moduloId]);

  const checkTipoPeriodoExistente = async () => {
    try {
      // Verificar si ya existen períodos en este módulo
      const { data, error } = await supabase
        .from('modulo_meses')
        .select('tipo_periodo')
        .eq('modulo_id', moduloId)
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Ya existe al menos un período, bloquear solo el cambio de tipo (mensual/semanal)
        const tipoExistente = data[0].tipo_periodo || 'mensual';
        setTipoPeriodo(tipoExistente);
        setTipoPeriodoLocked(true); // Solo bloquea cambio entre mensual/semanal
      } else {
        // No hay períodos, permitir selección libre
        setTipoPeriodoLocked(false);
      }
    } catch (error) {
      console.error('Error checking existing period type:', error);
      setTipoPeriodoLocked(false);
    }
  };

  const fetchMeses = async () => {
    try {
      const { data, error } = await supabase
        .from('modulo_meses')
        .select('*')
        .eq('modulo_id', moduloId)
        .order('numero_mes', { ascending: true });
      
      if (error) throw error;
      setMeses(data || []);
    } catch (error) {
      console.error('Error fetching modulo meses:', error);
      showMessage('Error', 'Error al cargar los períodos del módulo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSiguienteNumero = async () => {
    try {
      // Si es semanal, solo verificar períodos del mes seleccionado
      if (tipoPeriodo === 'semanal') {
        // Para modo semanal, verificar períodos del mes seleccionado
        const { data: periodosDelMes, error: errorMes } = await supabase
          .from('modulo_meses')
          .select('numero_mes, semana, procesado, nombre_mes')
          .eq('modulo_id', moduloId)
          .eq('numero_mes', selectedMonth)
          .eq('tipo_periodo', 'semanal')
          .order('semana', { ascending: false });
        
        if (errorMes) throw errorMes;
        
        if (periodosDelMes && periodosDelMes.length > 0) {
          // Verificar si hay algún período sin procesar en este mes
          const periodoNoProcesado = periodosDelMes.find(p => !p.procesado);
          
          if (periodoNoProcesado) {
            // Hay una semana sin procesar en este mes, no permitir crear nuevas
            setSiguienteNumero(-1);
          } else {
            // Todas las semanas del mes están procesadas, permitir crear la siguiente
            const ultimaSemana = periodosDelMes[0].semana || 0;
            const maxSemanas = getWeekNamesForMonth(selectedMonth, currentYear).length;
            
            if (ultimaSemana >= maxSemanas) {
              // Ya se crearon todas las semanas posibles para este mes
              setSiguienteNumero(-1);
            } else {
              setSiguienteNumero(ultimaSemana + 1);
            }
          }
        } else {
          // No hay períodos para este mes, empezar con semana 1
          setSiguienteNumero(1);
        }
        return;
      }
      
      // Para modo mensual, comportamiento original
      const { data: ultimoPeriodo, error } = await supabase
        .from('modulo_meses')
        .select('numero_mes, semana')
        .eq('modulo_id', moduloId)
        .eq('tipo_periodo', 'mensual')
        .is('semana', null)
        .order('numero_mes', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (ultimoPeriodo && ultimoPeriodo.length > 0) {
        // Verificar si el último período está procesado
        const { data: periodoNoProcesado, error: noProcesadoError } = await supabase
          .from('modulo_meses')
          .select('id')
          .eq('modulo_id', moduloId)
          .eq('tipo_periodo', 'mensual')
          .is('semana', null)
          .eq('procesado', false)
          .limit(1);
        
        if (noProcesadoError) throw noProcesadoError;
        
        if (periodoNoProcesado && periodoNoProcesado.length > 0) {
          // Hay un período sin procesar, no permitir crear nuevos
          setSiguienteNumero(-1);
        } else {
          // Todos los períodos están procesados, permitir crear el siguiente
          const siguienteNumero = ultimoPeriodo[0].numero_mes + 1;
          // Para mensual, máximo 12 meses
          if (siguienteNumero > 12) {
            setSiguienteNumero(-1);
          } else {
            setSiguienteNumero(siguienteNumero);
          }
        }
      } else {
        // No hay períodos, empezar con 1
        setSiguienteNumero(1);
      }
    } catch (error) {
      console.error('Error fetching siguiente numero modulo:', error);
      setSiguienteNumero(1);
    }
  };

  // Actualizar siguiente número cuando cambia el mes seleccionado en modo semanal
  useEffect(() => {
    if (tipoPeriodo === 'semanal') {
      fetchSiguienteNumero();
    }
  }, [selectedMonth, tipoPeriodo]);

  const calcularRangoMes = (numeroMes: number, año: number) => {
    const fechaInicio = new Date(año, numeroMes - 1, 1);
    const fechaFin = new Date(año, numeroMes, 0);
    
    return {
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      nombre_mes: `${monthNames[numeroMes - 1]} ${año}`,
      semana: null
    };
  };

  const calcularRangoSemana = (numeroSemana: number, mesSeleccionado: number, año: number) => {
    const weeks = getWeekNamesForMonth(mesSeleccionado, año);
    
    if (numeroSemana <= weeks.length) {
      const week = weeks[numeroSemana - 1];
      return {
        fecha_inicio: week.start.toISOString().split('T')[0],
        fecha_fin: week.end.toISOString().split('T')[0],
        nombre_mes: `${week.fullName} ${año}`,
        semana: numeroSemana
      };
    }
    
    // Fallback si el número de semana es inválido
    const fechaInicio = new Date(año, mesSeleccionado - 1, 1);
    const fechaFin = new Date(año, mesSeleccionado - 1, 7);
    
    return {
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      nombre_mes: `Semana ${numeroSemana} de ${monthNames[mesSeleccionado - 1]} ${año}`,
      semana: numeroSemana
    };
  };

  useEffect(() => {
    if (formData.año && formData.tipo_periodo) {
      let rangoCalculado;
      
      if (formData.tipo_periodo === 'mensual' && formData.numero_mes) {
        rangoCalculado = calcularRangoMes(formData.numero_mes, formData.año);
      } else if (formData.tipo_periodo === 'semanal' && formData.numero_mes && formData.mes_seleccionado) {
        rangoCalculado = calcularRangoSemana(formData.numero_mes, formData.mes_seleccionado, formData.año);
      }
      
      if (rangoCalculado) {
      setFormData(prev => ({
        ...prev,
        nombre_mes: rangoCalculado.nombre_mes
      }));
      }
    }
  }, [formData.numero_mes, formData.año, formData.tipo_periodo, formData.mes_seleccionado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    setSubmitting(true);

    try {
      const rangoMes = formData.tipo_periodo === 'mensual' 
        ? calcularRangoMes(formData.numero_mes, formData.año)
        : calcularRangoSemana(formData.numero_mes, formData.mes_seleccionado, formData.año);
      
      if (editingId) {
        // Editar período existente
        const rangoMes = formData.tipo_periodo === 'mensual' 
          ? calcularRangoMes(formData.numero_mes, formData.año)
          : calcularRangoSemana(formData.numero_mes, formData.mes_seleccionado, formData.año);
        
        const { error } = await supabase
          .from('modulo_meses')
          .update({
            numero_mes: formData.tipo_periodo === 'mensual' ? formData.numero_mes : formData.mes_seleccionado,
            semana: formData.tipo_periodo === 'semanal' ? formData.numero_mes : null,
            nombre_mes: rangoMes.nombre_mes,
            semana: rangoMes.semana,
            fecha_inicio: rangoMes.fecha_inicio,
            fecha_fin: rangoMes.fecha_fin,
            tipo_periodo: formData.tipo_periodo
          })
          .eq('id', editingId);
        
        if (error) throw error;
        setSuccessMessage('Período del módulo actualizado exitosamente');
      } else {
        // Crear nuevo período
        const rangoMes = formData.tipo_periodo === 'mensual' 
          ? calcularRangoMes(formData.numero_mes, formData.año)
          : calcularRangoSemana(formData.numero_mes, formData.mes_seleccionado, formData.año);
        
        const { error } = await supabase
          .from('modulo_meses')
          .insert({
            modulo_id: moduloId,
            numero_mes: formData.tipo_periodo === 'mensual' ? formData.numero_mes : formData.mes_seleccionado,
            semana: formData.tipo_periodo === 'semanal' ? formData.numero_mes : null,
            nombre_mes: rangoMes.nombre_mes,
            semana: rangoMes.semana,
            fecha_inicio: rangoMes.fecha_inicio,
            fecha_fin: rangoMes.fecha_fin,
            total_inversion: 0,
            porcentaje_ganancia: 0,
            ganancia_bruta: 0,
            procesado: false,
            tipo_periodo: formData.tipo_periodo
          });
        
        if (error) throw error;
        setSuccessMessage('Período del módulo creado exitosamente');
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      await fetchMeses();
      await fetchSiguienteNumero();
      await checkTipoPeriodoExistente();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving modulo mes:', error);
      showMessage('Error', 'Error al guardar el período: ' + (error as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (mes: ModuloMes) => {
    setEditingId(mes.id);
    
    const añoMatch = mes.nombre_mes.match(/\d{4}/);
    const año = añoMatch ? parseInt(añoMatch[0]) : new Date().getFullYear();
    
    // Para períodos semanales, usar el numero_mes como mes seleccionado y semana como número de período
    let mesSeleccionado = new Date().getMonth() + 1;
    let numeroPeriodo = mes.numero_mes;
    
    if (mes.tipo_periodo === 'semanal') {
      mesSeleccionado = mes.numero_mes; // El mes está en numero_mes
      numeroPeriodo = mes.semana || 1; // La semana está en el campo semana
    }
    
    setFormData({
      numero_mes: numeroPeriodo,
      nombre_mes: mes.nombre_mes,
      año: año,
      tipo_periodo: mes.tipo_periodo || 'mensual',
      mes_seleccionado: mesSeleccionado
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const mesAEliminar = meses.find(m => m.id === id);
    if (!mesAEliminar) return;
    
    setDeletingWithRollback(true);
    try {
      // Verificar si el período está procesado
      if (mesAEliminar.procesado) {
        // Si está procesado, usar función de rollback
        const { data: result, error } = await supabase.rpc('rollback_periodo_modulo', {
          p_modulo_id: moduloId,
          p_numero_mes: mesAEliminar.numero_mes,
          p_admin_id: admin?.id
        });

        if (error) {
          console.error('Error en rollback:', error);
          // Si la función de rollback falla, intentar eliminación directa
          await eliminarPeriodoDirecto(id);
        } else {
          const rollbackResult = result?.[0];
          if (!rollbackResult?.success) {
            throw new Error(rollbackResult?.message || 'Error en el proceso de rollback');
          }
        }
      } else {
        // Si no está procesado, eliminar directamente
        await eliminarPeriodoDirecto(id);
      }
      
      setShowDeleteModal(null);
      await fetchMeses();
      await fetchSiguienteNumero();
      await checkTipoPeriodoExistente();
      setSuccessMessage(mesAEliminar.procesado 
        ? 'Período del módulo eliminado exitosamente con rollback automático.'
        : 'Período del módulo eliminado exitosamente.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting modulo mes:', error);
      showMessage('Error', 'Error al eliminar el período: ' + (error as Error).message, 'error');
    } finally {
      setDeletingWithRollback(false);
    }
  };

  const eliminarPeriodoDirecto = async (periodoId: string) => {
    try {
      // Eliminar el período directamente de la tabla
      const { error } = await supabase
        .from('modulo_meses')
        .delete()
        .eq('id', periodoId);

      if (error) throw error;
    } catch (error) {
      console.error('Error eliminando período directamente:', error);
      throw error;
    }
  };
  const resetForm = () => {
    setFormData({
      numero_mes: siguienteNumero > 0 ? siguienteNumero : 1,
      nombre_mes: '',
      año: currentYear,
      tipo_periodo: tipoPeriodo,
      mes_seleccionado: selectedMonth
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
    if (tipoPeriodo === 'mensual') {
      return meses.find(m => 
        m.numero_mes === numeroMes && 
        m.tipo_periodo === 'mensual' && 
        m.semana === null
      );
    } else {
      // Para semanal, buscar por mes seleccionado y número de semana
      return meses.find(m =>
        m.numero_mes === selectedMonth &&
        m.semana === numeroMes &&
        m.tipo_periodo === 'semanal' &&
        m.nombre_mes.includes(currentYear.toString())
      );
    }
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
    } else if (siguienteNumero !== -1 && (tipoPeriodo === 'mensual' || numeroMes <= getWeekNamesForMonth(selectedMonth, currentYear).length)) {
      setFormData({
        numero_mes: numeroMes,
        nombre_mes: '',
        año: currentYear,
        tipo_periodo: tipoPeriodo,
        mes_seleccionado: selectedMonth
      });
      setShowModal(true);
    }
  };

  // Obtener períodos a mostrar según el tipo
  const getPeriodsToShow = () => {
    if (tipoPeriodo === 'mensual') {
      return monthNames.map((name, index) => ({
        number: index + 1,
        name: name,
        shortName: name
      }));
    } else {
      // Para semanal, mostrar las semanas del mes seleccionado
      const weeks = getWeekNamesForMonth(selectedMonth, currentYear);
      return weeks.map(week => ({
        number: week.number,
        name: week.name,
        shortName: `S${week.number}`
      }));
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

  const periodsToShow = getPeriodsToShow();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-bold text-white flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Calendario - {moduloNombre} ({tipoPeriodo === 'mensual' ? 'Mensual' : 'Semanal'} - {currentYear})
          </h4>
          
          <div className="flex items-center space-x-4">
            {/* Selector de tipo de período */}
            <div className="flex items-center space-x-2">
              <label className="text-white text-sm font-medium">Tipo:</label>
              <select
                value={tipoPeriodo}
                onChange={(e) => {
                  if (!tipoPeriodoLocked) {
                    setTipoPeriodo(e.target.value as 'mensual' | 'semanal');
                    // Reset siguiente número cuando cambia el tipo
                    setSiguienteNumero(1);
                  }
                }}
                disabled={tipoPeriodoLocked}
                className={`px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  tipoPeriodoLocked 
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title={tipoPeriodoLocked ? 'No se puede cambiar el tipo de período una vez que se han creado períodos' : ''}
              >
                <option value="mensual" className="text-black">Mensual</option>
                <option value="semanal" className="text-black">Semanal</option>
              </select>
              {tipoPeriodoLocked && (
                <span className="text-yellow-300 text-xs">🔒 Bloqueado</span>
              )}
            </div>

            {/* Selector de mes para modo semanal */}
            {tipoPeriodo === 'semanal' && (
              <div className="flex items-center space-x-2">
                <label className="text-white text-sm font-medium">Mes:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(parseInt(e.target.value));
                    // Reset siguiente número cuando cambia el mes
                    setSiguienteNumero(1);
                  }}
                  className="px-3 py-1 bg-white/20 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/30"
                >
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1} className="text-black">
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
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
                {tipoPeriodo === 'mensual' 
                  ? 'Debe procesar el período actual antes de crear un nuevo período en este módulo.'
                  : `Debe procesar la semana actual de ${monthNames[selectedMonth - 1]} antes de crear una nueva semana, o ya se crearon todas las semanas posibles para este mes.`
                }
              </p>
            </div>
          </div>
        )}

        {/* Calendario de Períodos */}
        <div className={`grid gap-4 mb-6 ${
          tipoPeriodo === 'mensual' 
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
            : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
        }`}>
          {periodsToShow.map((period) => {
            const mesData = getMesData(period.number);
            const status = getMonthStatus(period.number);
            
            return (
              <div
                key={period.number}
                onClick={() => handleMonthClick(period.number)}
                className={`relative p-4 rounded-lg border-2 border-white/30 transition-all duration-200 cursor-pointer ${getMonthColor(period.number)}`}
              >
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold">{period.number}</span>
                  </div>
                  <h5 className="font-semibold text-sm mb-1">
                    {period.shortName}
                  </h5>
                  
                  {mesData && (
                    <div className="text-xs space-y-1">
                      <p className="truncate" title={mesData.nombre_mes}>{mesData.nombre_mes}</p>
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
                          (window as any).handleShowDeleteModal(mesData);
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
        
        {/* Información adicional sobre el tipo de período */}
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h5 className="text-blue-200 font-semibold mb-2">
            Información del Período {tipoPeriodo === 'mensual' ? 'Mensual' : 'Semanal'}
          </h5>
          <div className="text-blue-100 text-sm space-y-1">
            {tipoPeriodo === 'mensual' ? (
              <>
              
              </>
            ) : (
              <>
                
              </>
            )}
            {tipoPeriodoLocked && (
              <p className="text-yellow-200 font-medium">
                ⚠️ No se puede cambiar el tipo de período una vez creado el primer período. 
                {tipoPeriodo === 'semanal' && ' Puedes cambiar de mes para gestionar semanas de diferentes meses.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de crear/editar período */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Editar Período del Módulo' : `Crear Nuevo Período ${formData.tipo_periodo === 'mensual' ? 'Mensual' : 'Semanal'}`}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de período (solo visible si no está bloqueado y no está editando) */}
              {!editingId && !tipoPeriodoLocked && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Tipo de Período
                  </label>
                  <select
                    value={formData.tipo_periodo}
                    onChange={(e) => setFormData({...formData, tipo_periodo: e.target.value as 'mensual' | 'semanal'})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mensual">Mensual</option>
                    <option value="semanal">Semanal</option>
                  </select>
                  <p className="text-gray-500 text-xs mt-1">
                    Una vez creado el primer período, no podrás cambiar este tipo
                  </p>
                  {formData.tipo_periodo === 'semanal' && (
                    <p className="text-blue-600 text-xs mt-1">
                      En modo semanal podrás gestionar semanas de diferentes meses
                    </p>
                  )}
                </div>
              )}

              {/* Selector de mes para períodos semanales */}
              {formData.tipo_periodo === 'semanal' && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Mes
                  </label>
                  <select
                    value={formData.mes_seleccionado}
                    onChange={(e) => setFormData({...formData, mes_seleccionado: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {monthNames.map((name, index) => (
                      <option key={index + 1} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    {formData.tipo_periodo === 'mensual' ? 'Mes' : 'Número de Semana'}
                  </label>
                  <select
                    value={formData.tipo_periodo === 'mensual' ? formData.numero_mes : formData.numero_mes}
                    onChange={(e) => {
                      if (formData.tipo_periodo === 'mensual') {
                        setFormData({...formData, numero_mes: parseInt(e.target.value)});
                      } else {
                        // Para semanal, el numero_mes será el mes seleccionado y el valor será la semana
                        setFormData({
                          ...formData, 
                          numero_mes: parseInt(e.target.value) // Este será el número de semana para el display
                        });
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {formData.tipo_periodo === 'mensual' 
                      ? monthNames.map((name, index) => (
                          <option key={index + 1} value={index + 1}>
                            {name}
                          </option>
                        ))
                      : getWeekNamesForMonth(formData.mes_seleccionado, formData.año).map((week) => (
                          <option key={week.number} value={week.number}>
                            {week.name}
                          </option>
                        ))
                    }
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

      {/* Función para mostrar modal de eliminación con información de rollback */}
      {(() => {
        const handleShowDeleteModal = async (mesData: ModuloMes) => {
          if (mesData.procesado) {
            // Obtener información de rollback
            try {
              const { data: rollbackInfo, error } = await supabase.rpc('obtener_info_rollback_modulo', {
                p_modulo_id: moduloId,
                p_numero_mes: mesData.numero_mes
              });
              
              if (error) throw error;
              
              setShowRollbackInfo({
                mesData,
                rollbackInfo: rollbackInfo?.[0] || {}
              });
            } catch (error) {
              console.error('Error obteniendo info de rollback:', error);
              setShowDeleteModal(mesData.id);
            }
          } else {
            setShowDeleteModal(mesData.id);
          }
        };
        
        // Asignar la función al scope global del componente
        (window as any).handleShowDeleteModal = handleShowDeleteModal;
        return null;
      })()}

      {/* Modal de información de rollback */}
      {showRollbackInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center space-x-3 mb-4">
              <RotateCcw className="w-8 h-8 text-orange-500" />
              <h3 className="text-xl font-bold text-gray-900">Eliminar Período Procesado</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Estás a punto de eliminar el período <strong>"{showRollbackInfo.mesData.nombre_mes}"</strong> 
                del módulo <strong>"{moduloNombre}"</strong>.
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h4 className="text-orange-800 font-semibold">Período Procesado - Rollback Requerido</h4>
                </div>
                
                <div className="space-y-2 text-orange-700 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Total Ganancias:</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(showRollbackInfo.rollbackInfo.total_ganancias || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Usuarios Afectados:</p>
                      <p className="text-lg font-bold flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {showRollbackInfo.rollbackInfo.usuarios_afectados || 0}
                      </p>
                    </div>
                  </div>
                  
                  {showRollbackInfo.rollbackInfo.fecha_procesado && (
                    <p className="mt-2">
                      <strong>Procesado:</strong> {formatDate(showRollbackInfo.rollbackInfo.fecha_procesado)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-red-800 font-semibold mb-2">⚠️ Acciones que se realizarán:</h4>
                <ul className="text-red-700 text-sm space-y-1">
                  <li>• Se eliminarán TODAS las ganancias distribuidas de este período</li>
                  <li>• Se eliminarán las notificaciones de ganancias enviadas</li>
                  <li>• Se recalcularán automáticamente los saldos de usuarios</li>
                  <li>• Se enviará notificación de reversión a usuarios afectados</li>
                  <li>• Se eliminará el período del calendario del módulo</li>
                </ul>
                <p className="text-red-700 text-sm mt-3 font-semibold">
                  ⚠️ Esta acción NO se puede deshacer.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  handleDelete(showRollbackInfo.mesData.id);
                  setShowRollbackInfo(null);
                }}
                disabled={deletingWithRollback}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {deletingWithRollback ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Sí, Eliminar con Rollback</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRollbackInfo(null)}
                disabled={deletingWithRollback}
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
        <ConfirmModal
          show={!!showDeleteModal}
          message={`¿Estás seguro de que deseas eliminar este período del módulo? Esta acción eliminará el período. Si está procesado, se realizará un rollback automático de todas las ganancias distribuidas.`}
          onConfirm={() => {
            handleDelete(showDeleteModal);
            setShowDeleteModal(null);
          }}
          onCancel={() => setShowDeleteModal(null)}
        />
      )}

      {/* Modal de éxito */}
      <SuccessModal
        show={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
};

export default ModuloCalendarManager;