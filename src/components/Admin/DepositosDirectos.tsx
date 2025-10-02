import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { ArrowUpCircle, Search, DollarSign, Package, User, Send, AlertTriangle, CheckCircle } from 'lucide-react';

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
}

interface ModuloAsignado {
  id: string;
  nombre: string;
  activo: boolean;
  saldo_actual: number;
}

interface DepositosDirectosProps {
  onUpdate: () => void;
}

const DepositosDirectos: React.FC<DepositosDirectosProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInversor, setSelectedInversor] = useState<Inversor | null>(null);
  const [modulosAsignados, setModulosAsignados] = useState<ModuloAsignado[]>([]);
  const [selectedModulo, setSelectedModulo] = useState('');
  const [montoDeposito, setMontoDeposito] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingDeposito, setProcessingDeposito] = useState(false);
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

  const fetchModulosAsignados = async (inversorId: string) => {
    setLoadingModulos(true);
    try {
      const { data: asignaciones, error: asignacionesError } = await supabase
        .from('modulo_asignaciones')
        .select(`
          modulo_id,
          modulos_independientes (
            id,
            nombre,
            activo
          )
        `)
        .eq('inversor_id', inversorId)
        .eq('activo', true);

      if (asignacionesError) throw asignacionesError;

      const modulosData: ModuloAsignado[] = [];

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

        modulosData.push({
          id: asignacion.modulo_id,
          nombre: asignacion.modulos_independientes.nombre,
          activo: asignacion.modulos_independientes.activo,
          saldo_actual: saldo
        });
      }

      setModulosAsignados(modulosData);
    } catch (error) {
      console.error('Error fetching modulos asignados:', error);
      setModulosAsignados([]);
    } finally {
      setLoadingModulos(false);
    }
  };

  const handleSelectInversor = (inversor: Inversor) => {
    setSelectedInversor(inversor);
    setSelectedModulo('');
    setMontoDeposito('');
    setDescripcion('');
    fetchModulosAsignados(inversor.id);
  };

  const handleAmountChange = (value: string) => {
    if (value.startsWith('0') && value.length > 1) return;
    if (value.includes(',')) return;

    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMontoDeposito(value);
    }
  };

  const handleDepositoSubmit = async () => {
    if (!selectedInversor || !selectedModulo || !montoDeposito || !admin) return;

    const amount = parseFloat(montoDeposito);
    if (amount <= 0) {
      showError('Monto Inválido', 'El monto debe ser mayor a 0');
      return;
    }

    const moduloSeleccionado = modulosAsignados.find(m => m.id === selectedModulo);
    if (!moduloSeleccionado) {
      showError('Módulo Inválido', 'Selecciona un módulo válido');
      return;
    }

    setProcessingDeposito(true);
    try {
      const { error: depositoError } = await supabase
        .from('modulo_transacciones')
        .insert({
          modulo_id: selectedModulo,
          inversor_id: selectedInversor.id,
          usuario_tipo: 'inversor',
          monto: amount,
          tipo: 'deposito',
          descripcion: descripcion || `Depósito directo procesado por administrador - ${moduloSeleccionado.nombre}`,
          fecha: new Date().toISOString()
        });

      if (depositoError) throw depositoError;

      const { error: notificationError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: selectedInversor.id,
          tipo_usuario: 'inversor',
          titulo: `Depósito Procesado - ${moduloSeleccionado.nombre}`,
          mensaje: `Se ha procesado un depósito de ${formatCurrency(amount)} a tu saldo en el módulo ${moduloSeleccionado.nombre}. ${descripcion ? `Nota: ${descripcion}` : ''}`,
          tipo_notificacion: 'success',
          leida: false,
          fecha_creacion: new Date().toISOString()
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      setSelectedInversor(null);
      setSelectedModulo('');
      setMontoDeposito('');
      setDescripcion('');
      setModulosAsignados([]);

      onUpdate();
      showSuccess(
        'Depósito Procesado',
        `Depósito de ${formatCurrency(amount)} procesado exitosamente para ${selectedInversor.nombre} ${selectedInversor.apellido} en el módulo ${moduloSeleccionado.nombre}. El inversor ha sido notificado.`
      );
    } catch (error) {
      console.error('Error processing deposito directo:', error);
      showError(
        'Error al Procesar Depósito',
        'No se pudo procesar el depósito: ' + (error as Error).message
      );
    } finally {
      setProcessingDeposito(false);
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
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <ArrowUpCircle className="w-6 h-6 mr-3 text-green-300" />
          Depósitos Directos a Inversores
        </h3>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="text-green-200 font-semibold mb-2">¿Qué hace esta función?</h4>
          <ul className="text-green-100 text-sm space-y-1">
            <li>• Permite crear depósitos directos a inversores sin solicitud previa</li>
            <li>• Los depósitos se registran inmediatamente en modulo_transacciones</li>
            <li>• Incrementa el saldo del inversor en el módulo seleccionado</li>
            <li>• Se envía notificación automática al inversor</li>
            <li>• Útil para correcciones administrativas o depósitos de emergencia</li>
          </ul>
        </div>
      </div>

      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h4 className="text-lg font-bold text-white mb-4">1. Seleccionar Inversor</h4>

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

      {selectedInversor && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4">
            2. Procesar Depósito para {selectedInversor.nombre} {selectedInversor.apellido}
          </h4>

          {loadingModulos ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : modulosAsignados.length === 0 ? (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-300">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Este inversor no está asignado a ningún módulo. Debe asignarlo primero en la sección de Módulos.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Módulo para Depósito *
                </label>
                <select
                  value={selectedModulo}
                  onChange={(e) => setSelectedModulo(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  required
                >
                  <option value="" className="text-black">Seleccionar módulo</option>
                  {modulosAsignados.map((modulo) => (
                    <option key={modulo.id} value={modulo.id} className="text-black">
                      {modulo.nombre} - Saldo actual: {formatCurrency(modulo.saldo_actual)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Monto del Depósito (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type="text"
                    value={montoDeposito}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none h-20"
                  placeholder="Motivo del depósito, notas adicionales..."
                />
              </div>

              {selectedModulo && montoDeposito && parseFloat(montoDeposito) > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h5 className="text-blue-200 font-semibold mb-2">Resumen del Depósito</h5>
                  <div className="space-y-1 text-blue-100 text-sm">
                    <p><strong>Inversor:</strong> {selectedInversor.nombre} {selectedInversor.apellido}</p>
                    <p><strong>Módulo:</strong> {modulosAsignados.find(m => m.id === selectedModulo)?.nombre}</p>
                    <p><strong>Saldo actual:</strong> {formatCurrency(modulosAsignados.find(m => m.id === selectedModulo)?.saldo_actual || 0)}</p>
                    <p><strong>Monto a depositar:</strong> {formatCurrency(parseFloat(montoDeposito))}</p>
                    <p className="pt-2 border-t border-blue-300/30"><strong>Saldo después del depósito:</strong> <span className="text-green-300 font-bold">{formatCurrency((modulosAsignados.find(m => m.id === selectedModulo)?.saldo_actual || 0) + parseFloat(montoDeposito))}</span></p>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleDepositoSubmit}
                  disabled={
                    processingDeposito ||
                    !selectedModulo ||
                    !montoDeposito ||
                    parseFloat(montoDeposito) <= 0
                  }
                  className="flex-1 bg-green-500/20 text-green-300 py-3 px-6 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 border border-green-400/50"
                >
                  {processingDeposito ? (
                    <div className="w-5 h-5 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Procesar Depósito Directo</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setSelectedInversor(null);
                    setSelectedModulo('');
                    setMontoDeposito('');
                    setDescripcion('');
                    setModulosAsignados([]);
                  }}
                  disabled={processingDeposito}
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

export default DepositosDirectos;
