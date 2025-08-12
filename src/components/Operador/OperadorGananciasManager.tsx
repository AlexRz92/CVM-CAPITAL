import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useOperador } from '../../contexts/OperadorContext';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { 
  Calculator, 
  DollarSign, 
  Percent, 
  Package, 
  TrendingUp, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  Users,
  Eye
} from 'lucide-react';

interface Modulo {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

interface ModuloMes {
  id: string;
  numero_mes: number;
  nombre_mes: string;
  fecha_inicio: string;
  fecha_fin: string;
  procesado: boolean;
  fecha_procesado?: string;
  ganancia_bruta: number;
  total_inversion: number;
}

interface GananciaPropuesta {
  id: string;
  modulo_nombre: string;
  numero_mes: number;
  nombre_mes: string;
  tipo_entrada: 'porcentaje' | 'monto';
  valor_porcentaje?: number;
  valor_monto?: number;
  ganancia_bruta_calculada: number;
  total_inversion_calculado: number;
  estado: string;
  fecha_propuesta: string;
  notas?: string;
}

const OperadorGananciasManager: React.FC = () => {
  const { operador } = useOperador();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<string>('');
  const [mesesDisponibles, setMesesDisponibles] = useState<ModuloMes[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('');
  const [tipoEntrada, setTipoEntrada] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [valorPorcentaje, setValorPorcentaje] = useState('');
  const [valorMonto, setValorMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [totalInversion, setTotalInversion] = useState(0);
  const [gananciasEnviadas, setGananciasEnviadas] = useState<GananciaPropuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const { modalState, hideModal, showSuccess, showError } = useModal();

  useEffect(() => {
    fetchModulos();
    fetchGananciasEnviadas();
  }, []);

  useEffect(() => {
    if (moduloSeleccionado) {
      fetchMesesDisponibles();
    }
  }, [moduloSeleccionado]);

  useEffect(() => {
    if (moduloSeleccionado && mesSeleccionado) {
      calcularTotalInversion();
    }
  }, [moduloSeleccionado, mesSeleccionado]);

  const fetchModulos = async () => {
    try {
      const { data, error } = await supabase
        .from('modulos_independientes')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setModulos(data || []);
    } catch (error) {
      console.error('Error fetching modulos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMesesDisponibles = async () => {
    if (!moduloSeleccionado) return;

    try {
      const { data, error } = await supabase
        .from('modulo_meses')
        .select('*')
        .eq('modulo_id', moduloSeleccionado)
        .eq('procesado', false)
        .order('numero_mes');

      if (error) throw error;
      setMesesDisponibles(data || []);
      
      // Limpiar selección de mes si no está disponible
      if (data && data.length > 0 && !data.find(m => m.id === mesSeleccionado)) {
        setMesSeleccionado('');
      }
    } catch (error) {
      console.error('Error fetching meses disponibles:', error);
      setMesesDisponibles([]);
    }
  };

  const calcularTotalInversion = async () => {
    if (!moduloSeleccionado) return;

    try {
      const { data: transacciones, error } = await supabase
        .from('modulo_transacciones')
        .select('monto, tipo')
        .eq('modulo_id', moduloSeleccionado);

      if (error) throw error;

      let total = 0;
      transacciones?.forEach(t => {
        switch (t.tipo.toLowerCase()) {
          case 'deposito':
            total += Number(t.monto);
            break;
          case 'retiro':
            total -= Number(t.monto);
            break;
          case 'ganancia':
            total += Number(t.monto);
            break;
        }
      });

      setTotalInversion(Math.max(0, total));
    } catch (error) {
      console.error('Error calculando total inversión:', error);
      setTotalInversion(0);
    }
  };

  const fetchGananciasEnviadas = async () => {
    try {
      const { data, error } = await supabase
        .from('operador_ganancias_propuestas')
        .select(`
          *,
          modulos_independientes (
            nombre
          )
        `)
        .eq('propuesto_por', operador?.id)
        .order('fecha_propuesta', { ascending: false });

      if (error) throw error;

      const gananciasConNombre = (data || []).map(ganancia => ({
        ...ganancia,
        modulo_nombre: ganancia.modulos_independientes?.nombre || 'Módulo desconocido'
      }));

      setGananciasEnviadas(gananciasConNombre);
    } catch (error) {
      console.error('Error fetching ganancias enviadas:', error);
      setGananciasEnviadas([]);
    }
  };

  const handlePreview = () => {
    if (!moduloSeleccionado || !mesSeleccionado || (!valorPorcentaje && !valorMonto)) {
      showError('Datos Incompletos', 'Por favor completa todos los campos requeridos.');
      return;
    }

    const mesData = mesesDisponibles.find(m => m.id === mesSeleccionado);
    if (!mesData) return;

    let gananciaBruta = 0;
    
    if (tipoEntrada === 'porcentaje') {
      const porcentaje = parseFloat(valorPorcentaje);
      if (porcentaje <= 0 || porcentaje > 100) {
        showError('Porcentaje Inválido', 'El porcentaje debe estar entre 0.01 y 100.');
        return;
      }
      gananciaBruta = (totalInversion * porcentaje) / 100;
    } else {
      const monto = parseFloat(valorMonto);
      if (monto <= 0) {
        showError('Monto Inválido', 'El monto debe ser mayor a 0.');
        return;
      }
      gananciaBruta = monto;
    }

    setPreviewData({
      modulo_nombre: modulos.find(m => m.id === moduloSeleccionado)?.nombre,
      mes_nombre: mesData.nombre_mes,
      numero_mes: mesData.numero_mes,
      total_inversion: totalInversion,
      ganancia_bruta: gananciaBruta,
      porcentaje_calculado: totalInversion > 0 ? (gananciaBruta / totalInversion) * 100 : 0,
      tipo_entrada: tipoEntrada,
      valor_usado: tipoEntrada === 'porcentaje' ? valorPorcentaje : valorMonto
    });
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!operador || !previewData) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('operador_ganancias_propuestas')
        .insert({
          modulo_id: moduloSeleccionado,
          numero_mes: previewData.numero_mes,
          nombre_mes: previewData.mes_nombre,
          tipo_entrada: tipoEntrada,
          valor_porcentaje: tipoEntrada === 'porcentaje' ? parseFloat(valorPorcentaje) : null,
          valor_monto: tipoEntrada === 'monto' ? parseFloat(valorMonto) : null,
          total_inversion_calculado: totalInversion,
          ganancia_bruta_calculada: previewData.ganancia_bruta,
          notas: notas.trim() || null,
          propuesto_por: operador.id,
          estado: 'pendiente'
        });

      if (error) throw error;

      // Limpiar formulario
      setModuloSeleccionado('');
      setMesSeleccionado('');
      setTipoEntrada('porcentaje');
      setValorPorcentaje('');
      setValorMonto('');
      setNotas('');
      setShowPreview(false);
      setPreviewData(null);
      
      fetchGananciasEnviadas();
      showSuccess(
        'Ganancia Propuesta Enviada',
        `La propuesta de ganancia para ${previewData.modulo_nombre} - ${previewData.mes_nombre} ha sido enviada al administrador para su procesamiento.`
      );
    } catch (error) {
      console.error('Error enviando propuesta:', error);
      showError(
        'Error al Enviar',
        'No se pudo enviar la propuesta de ganancia. Inténtalo más tarde.'
      );
    } finally {
      setSubmitting(false);
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

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'procesado':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'rechazado':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
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
      {/* Formulario de Propuesta de Ganancias */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Calculator className="w-6 h-6 mr-3" />
          Proponer Ganancias de Módulos
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Módulo *
              </label>
              <select
                value={moduloSeleccionado}
                onChange={(e) => setModuloSeleccionado(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                required
              >
                <option value="" className="text-black">Seleccionar módulo</option>
                {modulos.map((modulo) => (
                  <option key={modulo.id} value={modulo.id} className="text-black">
                    {modulo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {moduloSeleccionado && (
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Período a Procesar *
                </label>
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  required
                >
                  <option value="" className="text-black">Seleccionar período</option>
                  {mesesDisponibles.map((mes) => (
                    <option key={mes.id} value={mes.id} className="text-black">
                      {mes.nombre_mes} {mes.tipo_periodo === 'semanal' ? `(Mes ${mes.numero_mes}, Semana ${mes.semana})` : `(Mes ${mes.numero_mes})`}
                    </option>
                  ))}
                </select>
                {mesesDisponibles.length === 0 && moduloSeleccionado && (
                  <p className="text-yellow-300 text-sm mt-2">
                    No hay períodos disponibles para procesar en este módulo.
                  </p>
                )}
              </div>
            )}

            {mesSeleccionado && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-200 font-semibold mb-2">Información del Módulo</h4>
                  <p className="text-blue-100 text-sm">
                    <strong>Total Inversión Actual:</strong> {formatCurrency(totalInversion)}
                  </p>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Tipo de Entrada *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoEntrada('porcentaje');
                        setValorMonto('');
                      }}
                      className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                        tipoEntrada === 'porcentaje'
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      <Percent className="w-4 h-4" />
                      <span>Porcentaje</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoEntrada('monto');
                        setValorPorcentaje('');
                      }}
                      className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                        tipoEntrada === 'monto'
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Monto Fijo</span>
                    </button>
                  </div>
                </div>

                {tipoEntrada === 'porcentaje' ? (
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Porcentaje de Ganancia (%) *
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={valorPorcentaje}
                        onChange={(e) => setValorPorcentaje(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Ej: 5.0"
                        required
                      />
                    </div>
                    {valorPorcentaje && totalInversion > 0 && (
                      <p className="text-green-300 text-sm mt-2">
                        Ganancia calculada: {formatCurrency((parseFloat(valorPorcentaje) * totalInversion) / 100)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Monto de Ganancia (USD) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={valorMonto}
                        onChange={(e) => setValorMonto(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Ej: 1000.00"
                        required
                      />
                    </div>
                    {valorMonto && totalInversion > 0 && (
                      <p className="text-green-300 text-sm mt-2">
                        Porcentaje equivalente: {((parseFloat(valorMonto) / totalInversion) * 100).toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Notas Adicionales (Opcional)
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none h-20"
                    placeholder="Notas sobre la ganancia propuesta..."
                  />
                </div>

                <button
                  onClick={handlePreview}
                  disabled={!moduloSeleccionado || !mesSeleccionado || (!valorPorcentaje && !valorMonto)}
                  className="w-full bg-yellow-500/20 text-yellow-300 py-3 px-4 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 border border-yellow-400/50"
                >
                  <Eye className="w-5 h-5" />
                  <span>Vista Previa</span>
                </button>
              </>
            )}
          </div>

          {/* Información de Períodos Procesados */}
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <h4 className="text-white font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Períodos Procesados Recientemente
            </h4>
            
            {moduloSeleccionado ? (
              <PeriodsProcessedList moduloId={moduloSeleccionado} />
            ) : (
              <p className="text-white/70 text-sm">Selecciona un módulo para ver períodos procesados</p>
            )}
          </div>
        </div>
      </div>

      {/* Vista Previa */}
      {showPreview && previewData && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Vista Previa de Propuesta
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-4">
              <h5 className="text-white/80 text-sm font-medium mb-2">Módulo</h5>
              <p className="text-white font-bold">{previewData.modulo_nombre}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h5 className="text-white/80 text-sm font-medium mb-2">Período</h5>
              <p className="text-white font-bold">{previewData.mes_nombre}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h5 className="text-white/80 text-sm font-medium mb-2">Total Inversión</h5>
              <p className="text-green-300 font-bold">{formatCurrency(previewData.total_inversion)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h5 className="text-white/80 text-sm font-medium mb-2">Ganancia Propuesta</h5>
              <p className="text-yellow-300 font-bold">{formatCurrency(previewData.ganancia_bruta)}</p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <h5 className="text-blue-200 font-semibold mb-2">Detalles de la Propuesta</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-100">
                  <strong>Tipo de entrada:</strong> {tipoEntrada === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                </p>
                <p className="text-blue-100">
                  <strong>Valor ingresado:</strong> {tipoEntrada === 'porcentaje' ? `${previewData.valor_usado}%` : formatCurrency(parseFloat(previewData.valor_usado))}
                </p>
              </div>
              <div>
                <p className="text-blue-100">
                  <strong>Porcentaje equivalente:</strong> {previewData.porcentaje_calculado.toFixed(2)}%
                </p>
                <p className="text-blue-100">
                  <strong>Ganancia bruta:</strong> {formatCurrency(previewData.ganancia_bruta)}
                </p>
              </div>
            </div>
            {notas && (
              <div className="mt-3 pt-3 border-t border-blue-500/30">
                <p className="text-blue-100 text-sm">
                  <strong>Notas:</strong> {notas}
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-green-500/20 text-green-300 py-3 px-4 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 border border-green-400/50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Enviar Propuesta</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 bg-gray-500/20 text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Historial de Propuestas Enviadas */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Historial de Propuestas ({gananciasEnviadas.length})
        </h4>

        {gananciasEnviadas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/70">No has enviado propuestas de ganancias</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {gananciasEnviadas.map((ganancia) => (
              <div key={ganancia.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="text-white font-semibold">
                      {ganancia.modulo_nombre} - {ganancia.nombre_mes}
                    </h5>
                    <p className="text-white/70 text-sm">
                      Mes {ganancia.numero_mes} • {formatDate(ganancia.fecha_propuesta)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getEstadoColor(ganancia.estado)}`}>
                    {ganancia.estado.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/70">Tipo de Entrada</p>
                    <p className="text-white font-medium">
                      {ganancia.tipo_entrada === 'porcentaje' ? 'Porcentaje' : 'Monto Fijo'}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/70">Valor Propuesto</p>
                    <p className="text-white font-medium">
                      {ganancia.tipo_entrada === 'porcentaje' 
                        ? `${ganancia.valor_porcentaje}%`
                        : formatCurrency(ganancia.valor_monto || 0)
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-white/70">Total Inversión</p>
                    <p className="text-white font-medium">{formatCurrency(ganancia.total_inversion_calculado)}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Ganancia Calculada</p>
                    <p className="text-green-300 font-bold">{formatCurrency(ganancia.ganancia_bruta_calculada)}</p>
                  </div>
                </div>

                {ganancia.notas && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-white/80 text-sm">
                      <strong>Notas:</strong> {ganancia.notas}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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

// Componente para mostrar períodos procesados
const PeriodsProcessedList: React.FC<{ moduloId: string }> = ({ moduloId }) => {
  const [periodosProcessados, setPeriodosProcessados] = useState<ModuloMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeriodosProcessados();
  }, [moduloId]);

  const fetchPeriodosProcessados = async () => {
    try {
      const { data, error } = await supabase
        .from('modulo_meses')
        .select('*')
        .eq('modulo_id', moduloId)
        .eq('procesado', true)
        .order('numero_mes', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPeriodosProcessados(data || []);
    } catch (error) {
      console.error('Error fetching períodos procesados:', error);
    } finally {
      setLoading(false);
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
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (periodosProcessados.length === 0) {
    return (
      <p className="text-white/70 text-sm">No hay períodos procesados recientemente</p>
    );
  }

  return (
    <div className="space-y-2">
      {periodosProcessados.map((periodo) => (
        <div key={periodo.id} className="bg-white/5 rounded p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">{periodo.nombre_mes}</p>
              <p className="text-white/60 text-xs">
                {formatDate(periodo.fecha_inicio)} - {formatDate(periodo.fecha_fin)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-green-300 text-sm font-bold">
                {formatCurrency(periodo.ganancia_bruta)}
              </p>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-xs">Procesado</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OperadorGananciasManager;