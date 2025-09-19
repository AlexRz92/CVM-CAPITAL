import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { Package, Users, Settings, Calendar, TrendingUp, Plus, Edit, Trash2, CheckCircle, AlertTriangle, X, Save, RotateCcw } from 'lucide-react';
import { ModuloAsignaciones, ModuloGananciasProcessor } from './';
import { ModuloCalendarManager } from '../Modulo';

interface Modulo {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fecha_creacion: string;
}

interface ModuloAdministracionProps {
  onUpdate: () => void;
}

interface MessageModalProps {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

interface ConfirmDeleteModalProps {
  show: boolean;
  modulo: Modulo | null;
  hasTransactions: boolean;
  onConfirm: () => void;
  onCancel: () => void;
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

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ show, modulo, hasTransactions, onConfirm, onCancel }) => {
  if (!show || !modulo) return null;

  const [rollbackInfo, setRollbackInfo] = useState<any>(null);
  const [loadingRollbackInfo, setLoadingRollbackInfo] = useState(true);

  useEffect(() => {
    if (show && modulo) {
      fetchRollbackInfo();
    }
  }, [show, modulo]);

  const fetchRollbackInfo = async () => {
    try {
      // Obtener información de períodos procesados
      const { data: periodosProcessados, error } = await supabase
        .from('modulo_meses')
        .select('id, numero_mes, nombre_mes, procesado, ganancia_bruta, fecha_procesado')
        .eq('modulo_id', modulo.id)
        .eq('procesado', true);

      if (error) throw error;

      // Obtener total de ganancias distribuidas
      let totalGanancias = 0;
      let usuariosAfectados = 0;

      if (periodosProcessados && periodosProcessados.length > 0) {
        const { data: transacciones, error: transError } = await supabase
          .from('modulo_transacciones')
          .select('monto, inversor_id, partner_id')
          .eq('modulo_id', modulo.id)
          .eq('tipo', 'ganancia');

        if (!transError && transacciones) {
          totalGanancias = transacciones.reduce((sum, t) => sum + Number(t.monto), 0);
          usuariosAfectados = new Set(
            transacciones.map(t => t.inversor_id || t.partner_id).filter(Boolean)
          ).size;
        }
      }

      setRollbackInfo({
        periodosProcessados: periodosProcessados || [],
        totalGanancias,
        usuariosAfectados
      });
    } catch (error) {
      console.error('Error fetching rollback info:', error);
      setRollbackInfo({ periodosProcessados: [], totalGanancias: 0, usuariosAfectados: 0 });
    } finally {
      setLoadingRollbackInfo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        {loadingRollbackInfo ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Analizando impacto de eliminación...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-3 mb-4">
              {rollbackInfo?.periodosProcessados?.length > 0 ? (
                <RotateCcw className="w-8 h-8 text-orange-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-500" />
              )}
              <h3 className="text-xl font-bold text-gray-900">Confirmar Eliminación</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                ¿Estás seguro de que deseas eliminar el módulo <strong>"{modulo.nombre}"</strong>?
              </p>
              
              {rollbackInfo?.periodosProcessados?.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <RotateCcw className="w-5 h-5 text-orange-500" />
                    <h4 className="text-orange-800 font-semibold">Rollback Automático Requerido</h4>
                  </div>
                  
                  <div className="space-y-2 text-orange-700 text-sm">
                    <p><strong>Períodos procesados:</strong> {rollbackInfo.periodosProcessados.length}</p>
                    <p><strong>Total ganancias a revertir:</strong> {formatCurrency(rollbackInfo.totalGanancias)}</p>
                    <p><strong>Usuarios afectados:</strong> {rollbackInfo.usuariosAfectados}</p>
                  </div>
                  
                  <div className="mt-3 p-2 bg-orange-100 rounded">
                    <p className="text-orange-800 text-xs font-medium">
                      Se realizará rollback automático de todas las ganancias antes de eliminar el módulo.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h4 className="text-red-800 font-semibold">¡Atención!</h4>
                </div>
                <p className="text-red-700 text-sm mb-2">
                  Al eliminar este módulo se borrarán:
                </p>
                <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                  <li>Todas las transacciones del módulo</li>
                  <li>Todas las asignaciones de usuarios</li>
                  <li>Todos los períodos mensuales configurados</li>
                  <li>Todas las solicitudes pendientes</li>
                  {rollbackInfo?.periodosProcessados?.length > 0 && (
                    <li className="font-semibold text-orange-700">
                      Todas las ganancias procesadas (con rollback automático)
                    </li>
                  )}
                </ul>
                <p className="text-red-700 text-sm mt-2 font-semibold">
                  Esta acción NO se puede deshacer.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={onConfirm}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
              >
                {rollbackInfo?.periodosProcessados?.length > 0 ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Sí, Eliminar con Rollback</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar</span>
                  </>
                )}
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ModuloAdministracion: React.FC<ModuloAdministracionProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<Modulo | null>(null);
  const [activeTab, setActiveTab] = useState('lista');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<Modulo | null>(null);
  const [deletingModulo, setDeletingModulo] = useState<string | null>(null);
  const [messageModal, setMessageModal] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    descripcion: ''
  });

  const showMessage = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessageModal({ title, message, type });
    setShowMessageModal(true);
  };

  useEffect(() => {
    fetchModulos();
    createDefaultModule();
  }, []);

  const createDefaultModule = async () => {
    try {
      // Verificar si ya existe el módulo predeterminado
      const { data: existingModule, error: checkError } = await supabase
        .from('modulos_independientes')
        .select('id')
        .eq('nombre', 'C.V.M Capital')
        .limit(1);

      if (checkError) throw checkError;

      // Si no existe, crearlo
      if (!existingModule || existingModule.length === 0) {
        const { error: insertError } = await supabase
          .from('modulos_independientes')
          .insert({
            nombre: 'C.V.M Capital',
            descripcion: null,
            activo: true,
            fecha_creacion: new Date().toISOString(),
            creado_por: admin?.id
          });

        if (insertError) throw insertError;
        console.log('Módulo predeterminado C.V.M Capital creado exitosamente');
      }
    } catch (error) {
      console.error('Error creating default module:', error);
    }
  };

  const fetchModulos = async () => {
    try {
      const { data, error } = await supabase
        .from('modulos_independientes')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setModulos(data || []);
      
      // Seleccionar el primer módulo por defecto
      if (data && data.length > 0 && !moduloSeleccionado) {
        setModuloSeleccionado(data[0]);
      }
    } catch (error) {
      console.error('Error fetching modulos:', error);
      showMessage('Error', 'Error al cargar los módulos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModulo = async () => {
    if (!formData.nombre.trim()) {
      showMessage('Error', 'El nombre del módulo es requerido', 'error');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('crear_modulo_independiente', {
        p_nombre: formData.nombre.trim(),
        p_descripcion: formData.descripcion.trim() || null,
        p_admin_id: admin?.id
      });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        setShowCreateModal(false);
        setFormData({ nombre: '', descripcion: '' });
        fetchModulos();
        onUpdate();
        showMessage('Éxito', 'Módulo creado exitosamente', 'success');
      } else {
        showMessage('Error', result.message, 'error');
      }
    } catch (error) {
      console.error('Error creating modulo:', error);
      showMessage('Error', 'Error al crear el módulo', 'error');
    }
  };

  const handleEditModulo = (modulo: Modulo) => {
    setEditingModulo(modulo);
    setEditFormData({
      nombre: modulo.nombre,
      descripcion: modulo.descripcion || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateModulo = async () => {
    if (!editingModulo || !editFormData.nombre.trim()) {
      showMessage('Error', 'El nombre del módulo es requerido', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('modulos_independientes')
        .update({
          nombre: editFormData.nombre.trim(),
          descripcion: editFormData.descripcion.trim() || null
        })
        .eq('id', editingModulo.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingModulo(null);
      setEditFormData({ nombre: '', descripcion: '' });
      fetchModulos();
      onUpdate();
      showMessage('Éxito', 'Módulo actualizado exitosamente', 'success');
    } catch (error) {
      console.error('Error updating modulo:', error);
      showMessage('Error', 'Error al actualizar el módulo', 'error');
    }
  };

  const handleDeleteModulo = async (modulo: Modulo) => {
    try {
      // Verificar si el módulo tiene períodos procesados que requieren rollback
      const { data: periodosProcessados, error: periodosError } = await supabase
        .from('modulo_meses')
        .select('id, nombre_mes, procesado')
        .eq('modulo_id', modulo.id)
        .eq('procesado', true);

      if (periodosError) throw periodosError;

      const hasProcessedPeriods = periodosProcessados && periodosProcessados.length > 0;
      
      // Mostrar modal de confirmación con información de rollback si es necesario
      setShowDeleteModal(modulo);
    } catch (error) {
      console.error('Error checking module transactions:', error);
      showMessage('Error', 'Error al verificar las transacciones del módulo', 'error');
    }
  };

  const confirmDeleteModulo = async () => {
    if (!showDeleteModal) return;
    
    // Prevenir eliminación del módulo predeterminado solo si tiene el nombre exacto
    if (showDeleteModal.nombre === 'C.V.M Capital') {
      showMessage('Error', 'No se puede eliminar el módulo predeterminado "C.V.M Capital". Puedes editarlo pero no eliminarlo.', 'error');
      setShowDeleteModal(null);
      return;
    }
    
    setDeletingModulo(showDeleteModal.id);
    try {
      console.log('Eliminando módulo:', showDeleteModal.nombre);
      
      // Verificar si hay períodos procesados que requieren rollback
      const { data: periodosProcessados, error: checkError } = await supabase
        .from('modulo_meses')
        .select('id, numero_mes, nombre_mes, procesado')
        .eq('modulo_id', showDeleteModal.id)
        .eq('procesado', true);

      if (checkError) throw checkError;

      // Realizar rollback de períodos procesados
      if (periodosProcessados && periodosProcessados.length > 0) {
        for (const periodo of periodosProcessados) {
          const { data: rollbackResult, error: rollbackError } = await supabase.rpc('rollback_periodo_modulo', {
            p_modulo_id: showDeleteModal.id,
            p_numero_mes: periodo.numero_mes,
            p_admin_id: admin?.id
          });

          if (rollbackError) {
            console.error(`Error en rollback del período ${periodo.nombre_mes}:`, rollbackError);
            throw rollbackError;
          }

          const result = rollbackResult?.[0];
          if (!result?.success) {
            throw new Error(`Error en rollback del período ${periodo.nombre_mes}: ${result?.message}`);
          }
        }
      }
      
      // Eliminar en orden para evitar errores de foreign key
      
      // 1. Eliminar transacciones del módulo
      const { error: transError } = await supabase
        .from('modulo_transacciones')
        .delete()
        .eq('modulo_id', showDeleteModal.id);

      if (transError) throw transError;

      // 2. Eliminar solicitudes del módulo (inversores)
      const { error: solicitudesError } = await supabase
        .from('modulo_solicitudes')
        .delete()
        .eq('modulo_id', showDeleteModal.id);

      if (solicitudesError) throw solicitudesError;

      // 3. Eliminar solicitudes del módulo (partners)
      const { error: solicitudesPartnersError } = await supabase
        .from('modulo_partner_solicitudes')
        .delete()
        .eq('modulo_id', showDeleteModal.id);

      if (solicitudesPartnersError) throw solicitudesPartnersError;

      // 4. Eliminar meses del módulo
      const { error: mesesError } = await supabase
        .from('modulo_meses')
        .delete()
        .eq('modulo_id', showDeleteModal.id);

      if (mesesError) throw mesesError;

      // 5. Eliminar asignaciones del módulo
      const { error: asignacionesError } = await supabase
        .from('modulo_asignaciones')
        .delete()
        .eq('modulo_id', showDeleteModal.id);

      if (asignacionesError) throw asignacionesError;

      // 6. Finalmente eliminar el módulo
      const { error: moduloError } = await supabase
        .from('modulos_independientes')
        .delete()
        .eq('id', showDeleteModal.id);

      if (moduloError) throw moduloError;

      setShowDeleteModal(null);
      await fetchModulos();
      onUpdate();
      
      const rollbackMessage = periodosProcessados && periodosProcessados.length > 0 
        ? ` Se realizó rollback automático de ${periodosProcessados.length} período(s) procesado(s).`
        : '';
      
      showMessage('Éxito', `Módulo "${showDeleteModal.nombre}" eliminado exitosamente junto con todos sus datos asociados.${rollbackMessage}`, 'success');
    } catch (error) {
      console.error('Error deleting module:', error);
      showMessage('Error', 'Error al eliminar el módulo: ' + (error as Error).message, 'error');
    } finally {
      setDeletingModulo(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const tabs = [
    { id: 'lista', label: 'Lista de Módulos', icon: Package },
    { id: 'asignaciones', label: 'Gestión de Asignaciones', icon: Users },
    { id: 'calendario', label: 'Calendario del Módulo', icon: Calendar },
    { id: 'ganancias', label: 'Procesar Ganancias', icon: TrendingUp },
    { id: 'configuracion', label: 'Configuración', icon: Settings }
  ];

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
            <Package className="w-6 h-6 mr-3" />
            Administración de Módulos Independientes
          </h3>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors border border-green-400/50"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Módulo</span>
          </button>
        </div>

        {/* Selector de Módulo */}
        {modulos.length > 0 && (
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">
              Módulo Seleccionado
            </label>
            <select
              value={moduloSeleccionado?.id || ''}
              onChange={(e) => {
                const modulo = modulos.find(m => m.id === e.target.value);
                setModuloSeleccionado(modulo || null);
              }}
              className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {modulos.map((modulo) => (
                <option key={modulo.id} value={modulo.id} className="text-black">
                  {modulo.nombre} {modulo.descripcion && `- ${modulo.descripcion}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navegación de tabs */}
        <div className="flex flex-wrap gap-4 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!moduloSeleccionado && tab.id !== 'lista'}
              className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              } ${!moduloSeleccionado && tab.id !== 'lista' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de las tabs */}
      {activeTab === 'lista' && (
        <ListaModulos modulos={modulos} onUpdate={fetchModulos} showMessage={showMessage} handleDeleteModulo={handleDeleteModulo} handleEditModulo={handleEditModulo} deletingModulo={deletingModulo} />
      )}

      {activeTab === 'asignaciones' && moduloSeleccionado && (
        <ModuloAsignaciones 
          moduloId={moduloSeleccionado.id} 
          moduloNombre={moduloSeleccionado.nombre} 
          showMessage={showMessage} 
        />
      )}

      {activeTab === 'calendario' && moduloSeleccionado && (
        <ModuloCalendarManager 
          moduloId={moduloSeleccionado.id} 
          moduloNombre={moduloSeleccionado.nombre} 
          showMessage={showMessage} 
        />
      )}

      {activeTab === 'ganancias' && moduloSeleccionado && (
        <ModuloGananciasProcessor 
          moduloId={moduloSeleccionado.id} 
          moduloNombre={moduloSeleccionado.nombre}
          onUpdate={handleChildUpdate}
          showMessage={showMessage}
        />
      )}

      {activeTab === 'configuracion' && moduloSeleccionado && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4">
            Configuración - {moduloSeleccionado.nombre}
          </h4>
          <p className="text-white/70">
            Funcionalidad de configuración en desarrollo...
          </p>
        </div>
      )}

      {/* Modal de crear módulo */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Crear Nuevo Módulo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nombre del Módulo *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 3 Meses, 6 Meses, etc."
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  placeholder="Descripción del módulo..."
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleCreateModulo}
                disabled={!formData.nombre.trim()}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Módulo
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ nombre: '', descripcion: '' });
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de editar módulo */}
      {showEditModal && editingModulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Módulo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nombre del Módulo *
                </label>
                <input
                  type="text"
                  value={editFormData.nombre}
                  onChange={(e) => setEditFormData({...editFormData, nombre: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del módulo"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={editFormData.descripcion}
                  onChange={(e) => setEditFormData({...editFormData, descripcion: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  placeholder="Descripción del módulo..."
                />
              </div>
            </div>
            
            {editingModulo.nombre === 'C.V.M Capital' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Nota:</strong> Estás editando el módulo predeterminado del sistema. Los cambios afectarán a todos los usuarios asignados.
                </p>
              </div>
            )}
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleUpdateModulo}
                disabled={!editFormData.nombre.trim()}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Actualizar Módulo</span>
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingModulo(null);
                  setEditFormData({ nombre: '', descripcion: '' });
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
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

      {/* Modal de confirmación de eliminación */}
      <ConfirmDeleteModal
        show={!!showDeleteModal}
        modulo={showDeleteModal}
        hasTransactions={true} // Asumimos que puede tener transacciones
        onConfirm={confirmDeleteModulo}
        onCancel={() => setShowDeleteModal(null)}
      />
    </div>
  );
};

// Componente para lista de módulos
const ListaModulos: React.FC<{ 
  modulos: Modulo[]; 
  onUpdate: () => void; 
  showMessage: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  handleDeleteModulo: (modulo: Modulo) => void;
  handleEditModulo: (modulo: Modulo) => void;
  deletingModulo: string | null;
}> = ({ modulos, onUpdate, showMessage, handleDeleteModulo, handleEditModulo, deletingModulo }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <h4 className="text-lg font-bold text-white mb-4">Módulos Existentes ({modulos.length})</h4>
      
      {modulos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/70">No hay módulos creados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modulos.map((modulo) => (
            <div key={modulo.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-white font-semibold">{modulo.nombre}</h5>
                  {modulo.descripcion && (
                    <p className="text-white/70 text-sm">{modulo.descripcion}</p>
                  )}
                  <p className="text-white/60 text-xs mt-1">
                    Creado: {formatDate(modulo.fecha_creacion)}
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    modulo.activo 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                      : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                  }`}>
                    {modulo.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                  
                  <button
                    onClick={() => handleEditModulo(modulo)}
                    className="flex items-center space-x-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-3 py-2 rounded-lg transition-colors"
                    title="Editar módulo"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteModulo(modulo)}
                    disabled={deletingModulo === modulo.id}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    title="Eliminar módulo"
                  >
                    {deletingModulo === modulo.id ? (
                      <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>
                      {deletingModulo === modulo.id ? 'Eliminando...' : 'Eliminar'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Función auxiliar para manejar actualizaciones de componentes hijos
const handleChildUpdate = () => {
  // Esta función se puede usar para manejar actualizaciones desde componentes hijos
  console.log('Child component updated');
};
export default ModuloAdministracion;