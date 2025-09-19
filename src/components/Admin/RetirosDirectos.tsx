import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { ArrowDownCircle, Search, DollarSign, Package, User, Send, AlertTriangle, CheckCircle } from 'lucide-react';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
}

interface ModuloConSaldo {
  id: string;
  nombre: string;
  saldo_actual: number;
}

interface RetirosDirectosProps {
  onUpdate: () => void;
}

const RetirosDirectos: React.FC<RetirosDirectosProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInversor, setSelectedInversor] = useState<Inversor | null>(null);
  const [modulosConSaldo, setModulosConSaldo] = useState<ModuloConSaldo[]>([]);
  const [selectedModulo, setSelectedModulo] = useState('');
  const [montoRetiro, setMontoRetiro] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingRetiro, setProcessingRetiro] = useState(false);
  const [loadingModulos, setLoadingModulos] = useState(false);
  const { modalState, hideModal, showSuccess, showError } = useModal();

  useEffect(() => {
    fetchInversores();
  }, []);

  const fetchInversores = async () => {
    try {
      const { data, error } = await supabase
        .from('inversores')
        .select('id, nombre, apellido, email, activo')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setInversores(data || []);
    } catch (error) {
      console.error('Error fetching inversores:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModulosConSaldo = async (inversorId: string) => {
    setLoadingModulos(true);
    try {
      // Obtener todos los módulos donde el inversor está asignado
      const { data: asignaciones, error: asignacionesError } = await supabase
        .from('modulo_asignaciones')
        .select(`
          modulo_id,
          modulos_independientes (
            id,
            nombre
          )
        `)
        .eq('inversor_id', inversorId)
        .eq('activo', true);

      if (asignacionesError) throw asignacionesError;

      const modulosConSaldoData: ModuloConSaldo[] = [];

      // Para cada módulo asignado, calcular el saldo
      for (const asignacion of asignaciones || []) {
        if (!asignacion.modulos_independientes) continue;

        const { data: transacciones, error: transError } = await supabase
          .from('modulo_transacciones')
          .select('monto, tipo')
          .eq('modulo_id', asignacion.modulo_id)
          .eq('inversor_id', inversorId)
          .eq('usuario_tipo', 'inversor');

        if (transError) {
          console.error('Error fetching transactions:', transError);
          continue;
        }

        let saldo = 0;
        transacciones?.forEach(t => {
          switch (t.tipo.toLowerCase()) {
            case 'deposito':
              saldo += Number(t.monto);
              break;
            case 'retiro':
              saldo -= Number(t.monto);
              break;
            case 'ganancia':
              saldo += Number(t.monto);
              break;
          }
        });

        // Solo incluir módulos con saldo positivo
        if (saldo > 0) {
          modulosConSaldoData.push({
            id: asignacion.modulo_id,
            nombre: asignacion.modulos_independientes.nombre,
            saldo_actual: saldo
          });
        }
      }

      setModulosConSaldo(modulosConSaldoData);
    } catch (error) {
      console.error('Error fetching modulos con saldo:', error);
      setModulosConSaldo([]);
    } finally {
      setLoadingModulos(false);
    }
  };

  const handleSelectInversor = (inversor: Inversor) => {
    setSelectedInversor(inversor);
    setSelectedModulo('');
    setMontoRetiro('');
    setDescripcion('');
    fetchModulosConSaldo(inversor.id);
  };

  const handleAmountChange = (value: string) => {
    if (value.startsWith('0') && value.length > 1) return;
    if (value.includes(',')) return;
    
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMontoRetiro(value);
    }
  };

  const handleRetiroSubmit = async () => {
    if (!selectedInversor || !selectedModulo || !montoRetiro || !admin) return;

    const amount = parseFloat(montoRetiro);
    if (amount <= 0) {
      showError('Monto Inválido', 'El monto debe ser mayor a 0');
      return;
    }

    const moduloSeleccionado = modulosConSaldo.find(m => m.id === selectedModulo);
    if (!moduloSeleccionado) {
      showError('Módulo Inválido', 'Selecciona un módulo válido');
      return;
    }

    if (amount > moduloSeleccionado.saldo_actual) {
      showError(
        'Saldo Insuficiente',
        `El monto no puede ser mayor al saldo disponible (${formatCurrency(moduloSeleccionado.saldo_actual)})`
      );
      return;
    }

    setProcessingRetiro(true);
    try {
      // Crear transacción de retiro directamente en modulo_transacciones
      const { error: retiroError } = await supabase
        .from('modulo_transacciones')
        .insert({
          modulo_id: selectedModulo,
          inversor_id: selectedInversor.id,
          usuario_tipo: 'inversor',
          monto: amount,
          tipo: 'retiro',
          descripcion: descripcion || `Retiro directo procesado por administrador - ${moduloSeleccionado.nombre}`,
          fecha: new Date().toISOString()
        });

      if (retiroError) throw retiroError;

      // Crear notificación para el inversor
      const { error: notificationError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: selectedInversor.id,
          tipo_usuario: 'inversor',
          titulo: `Retiro Procesado - ${moduloSeleccionado.nombre}`,
          mensaje: `Se ha procesado un retiro de ${formatCurrency(amount)} de tu saldo en el módulo ${moduloSeleccionado.nombre}. ${descripcion ? `Motivo: ${descripcion}` : ''}`,
          tipo_notificacion: 'info',
          leida: false,
          fecha_creacion: new Date().toISOString()
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      // Limpiar formulario
      setSelectedInversor(null);
      setSelectedModulo('');
      setMontoRetiro('');
      setDescripcion('');
      setModulosConSaldo([]);
      
      onUpdate();
      showSuccess(
        'Retiro Procesado',
        `Retiro de ${formatCurrency(amount)} procesado exitosamente para ${selectedInversor.nombre} ${selectedInversor.apellido} en el módulo ${moduloSeleccionado.nombre}. El inversor ha sido notificado.`
      );
    } catch (error) {
      console.error('Error processing retiro directo:', error);
      showError(
        'Error al Procesar Retiro',
        'No se pudo procesar el retiro: ' + (error as Error).message
      );
    } finally {
      setProcessingRetiro(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredInversores = inversores.filter(inv => 
    inv.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.email.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <ArrowDownCircle className="w-6 h-6 mr-3 text-red-300" />
          Retiros Directos a Inversores
        </h3>
        
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <h4 className="text-red-200 font-semibold mb-2">¿Qué hace esta función?</h4>
          <ul className="text-red-100 text-sm space-y-1">
            <li>• Permite crear retiros directos a inversores sin solicitud previa</li>
            <li>• Los retiros se registran inmediatamente en modulo_transacciones</li>
            <li>• Se valida que el inversor tenga saldo suficiente en el módulo</li>
            <li>• Se envía notificación automática al inversor</li>
            <li>• Útil para retiros de emergencia o correcciones administrativas</li>
          </ul>
        </div>
      </div>

      {/* Selector de Inversor */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h4 className="text-lg font-bold text-white mb-4">1. Seleccionar Inversor</h4>
        
        {/* Búsqueda */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-white/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder="Buscar inversor por nombre, apellido o email..."
            />
          </div>
        </div>

        {/* Lista de inversores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
          {filteredInversores.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-white/70">
                {searchTerm ? 'No se encontraron inversores' : 'No hay inversores activos'}
              </p>
            </div>
          ) : (
            filteredInversores.map((inversor) => (
              <button
                key={inversor.id}
                onClick={() => handleSelectInversor(inversor)}
                className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                  selectedInversor?.id === inversor.id
                    ? 'bg-blue-500/20 border-blue-400/50 shadow-lg'
                    : 'bg-white/10 border-white/20 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">
                      {inversor.nombre} {inversor.apellido}
                    </h5>
                    <p className="text-white/70 text-sm">{inversor.email}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Formulario de Retiro */}
      {selectedInversor && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4">
            2. Procesar Retiro para {selectedInversor.nombre} {selectedInversor.apellido}
          </h4>

          {loadingModulos ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : modulosConSaldo.length === 0 ? (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-300">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Este inversor no tiene saldo disponible en ningún módulo para realizar retiros.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selector de Módulo */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Módulo para Retiro *
                </label>
                <select
                  value={selectedModulo}
                  onChange={(e) => setSelectedModulo(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  required
                >
                  <option value="" className="text-black">Seleccionar módulo</option>
                  {modulosConSaldo.map((modulo) => (
                    <option key={modulo.id} value={modulo.id} className="text-black">
                      {modulo.nombre} - Saldo: {formatCurrency(modulo.saldo_actual)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto del Retiro */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Monto del Retiro (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type="text"
                    value={montoRetiro}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="0.00"
                    required
                  />
                </div>
                {selectedModulo && montoRetiro && (
                  <p className="text-white/60 text-xs mt-1">
                    Saldo disponible: {formatCurrency(modulosConSaldo.find(m => m.id === selectedModulo)?.saldo_actual || 0)}
                  </p>
                )}
                {selectedModulo && montoRetiro && parseFloat(montoRetiro) > (modulosConSaldo.find(m => m.id === selectedModulo)?.saldo_actual || 0) && (
                  <p className="text-red-300 text-xs mt-1">
                    El monto excede el saldo disponible
                  </p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none h-20"
                  placeholder="Motivo del retiro, notas adicionales..."
                />
              </div>

              {/* Información del retiro */}
              {selectedModulo && montoRetiro && parseFloat(montoRetiro) > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h5 className="text-blue-200 font-semibold mb-2">Resumen del Retiro</h5>
                  <div className="space-y-1 text-blue-100 text-sm">
                    <p><strong>Inversor:</strong> {selectedInversor.nombre} {selectedInversor.apellido}</p>
                    <p><strong>Módulo:</strong> {modulosConSaldo.find(m => m.id === selectedModulo)?.nombre}</p>
                    <p><strong>Monto:</strong> {formatCurrency(parseFloat(montoRetiro))}</p>
                    <p><strong>Saldo después del retiro:</strong> {formatCurrency((modulosConSaldo.find(m => m.id === selectedModulo)?.saldo_actual || 0) - parseFloat(montoRetiro))}</p>
                  </div>
                </div>
              )}

              {/* Botón de procesar */}
              <div className="flex space-x-4">
                <button
                  onClick={handleRetiroSubmit}
                  disabled={
                    processingRetiro || 
                    !selectedModulo || 
                    !montoRetiro || 
                    parseFloat(montoRetiro) <= 0 ||
                    parseFloat(montoRetiro) > (modulosConSaldo.find(m => m.id === selectedModulo)?.saldo_actual || 0)
                  }
                  className="flex-1 bg-red-500/20 text-red-300 py-3 px-6 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 border border-red-400/50"
                >
                  {processingRetiro ? (
                    <div className="w-5 h-5 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Procesar Retiro Directo</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setSelectedInversor(null);
                    setSelectedModulo('');
                    setMontoRetiro('');
                    setDescripcion('');
                    setModulosConSaldo([]);
                  }}
                  disabled={processingRetiro}
                  className="flex-1 bg-gray-500/20 text-gray-300 py-3 px-6 rounded-lg hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <UnifiedModal
        show={modalState.show}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
        confirmText={modalState.confirmText}
        onConfirm={modalState.onConfirm}
        cancelText={modalState.cancelText}
      />
    </div>
  );
};

export default RetirosDirectos;