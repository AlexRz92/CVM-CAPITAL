import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Edit, Trash2, X, Save, Plus } from 'lucide-react';

interface Transaccion {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  descripcion: string;
  usuario_tipo: 'inversor' | 'partner';
}

interface TransaccionesManagerProps {
  inversorId: string;
  inversorNombre: string;
  isAdmin: boolean;
  onUpdate: () => void;
}

const TransaccionesManager: React.FC<TransaccionesManagerProps> = ({
  inversorId,
  inversorNombre,
  isAdmin,
  onUpdate
}) => {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    monto: '',
    tipo: '',
    descripcion: ''
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchTransacciones();
  }, [inversorId]);

  const fetchTransacciones = async () => {
    try {
      // Usar la tabla unificada de transacciones
      const { data, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('inversor_id', inversorId)
        .eq('usuario_tipo', 'inversor')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setTransacciones(data || []);
    } catch (error) {
      console.error('Error fetching transacciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaccion: Transaccion) => {
    setEditingId(transaccion.id);
    setEditForm({
      monto: transaccion.monto.toString(),
      tipo: transaccion.tipo,
      descripcion: transaccion.descripcion || ''
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('transacciones')
        .update({
          monto: parseFloat(editForm.monto),
          tipo: editForm.tipo,
          descripcion: editForm.descripcion
        })
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      fetchTransacciones();
      onUpdate();
    } catch (error) {
      console.error('Error updating transaccion:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transacciones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchTransacciones();
      onUpdate();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting transaccion:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('transacciones')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setSelectedIds([]);
      fetchTransacciones();
      onUpdate();
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Error bulk deleting transacciones:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === transacciones.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transacciones.map(t => t.id));
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'deposito':
        return 'text-green-300';
      case 'retiro':
        return 'text-red-300';
      case 'ganancia':
        return 'text-yellow-300';
      default:
        return 'text-white';
    }
  };

  const getDisplayName = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'deposito':
        return 'Depósito';
      case 'retiro':
        return 'Retiro';
      case 'ganancia':
        return 'Ganancia';
      default:
        return tipo.charAt(0).toUpperCase() + tipo.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white">
          Transacciones de {inversorNombre}
        </h4>
        
        {isAdmin && transacciones.length > 0 && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelectAll}
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              {selectedIds.length === transacciones.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
            
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Eliminar ({selectedIds.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {transacciones.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/70">No hay transacciones registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transacciones.map((transaccion) => (
            <div key={transaccion.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
              {editingId === transaccion.id ? (
                // Modo edición
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.monto}
                        onChange={(e) => setEditForm({...editForm, monto: e.target.value})}
                        className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Tipo</label>
                      <select
                        value={editForm.tipo}
                        onChange={(e) => setEditForm({...editForm, tipo: e.target.value})}
                        className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                      >
                        <option value="deposito" className="text-black">Depósito</option>
                        <option value="retiro" className="text-black">Retiro</option>
                        <option value="ganancia" className="text-black">Ganancia</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Descripción</label>
                      <input
                        type="text"
                        value={editForm.descripcion}
                        onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
                        className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Descripción opcional"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSave}
                      className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-3 py-1 rounded hover:bg-green-500/30 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar</span>
                    </button>
                    
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center space-x-2 bg-gray-500/20 text-gray-300 px-3 py-1 rounded hover:bg-gray-500/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualización
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(transaccion.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, transaccion.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== transaccion.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                      />
                    )}
                    
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className={`font-semibold ${getTransactionColor(transaccion.tipo)}`}>
                          {formatCurrency(transaccion.monto)}
                        </span>
                        <span className="text-white/80">
                          {getDisplayName(transaccion.tipo)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-white/60">
                        <span>{formatDate(transaccion.fecha)}</span>
                        {transaccion.descripcion && (
                          <span>• {transaccion.descripcion}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(transaccion)}
                        className="p-2 text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => setShowDeleteConfirm(transaccion.id)}
                        className="p-2 text-red-300 hover:bg-red-500/20 rounded transition-colors"
                        title="Eliminar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación individual */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación múltiple */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Eliminación Múltiple</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar {selectedIds.length} transacciones? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={handleBulkDelete}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
              >
                Eliminar Todas
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
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

export default TransaccionesManager;