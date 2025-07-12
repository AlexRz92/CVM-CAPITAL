import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { TrendingUp, DollarSign, Users, Calculator, Send, Info, CheckCircle, AlertTriangle, Percent, Settings } from 'lucide-react';

interface GananciasProcessorProps {
  totalInversion: number;
  onUpdate: () => void;
}

interface PreviewData {
  total_inversion: number;
  ganancia_bruta: number;
  ganancia_partners: number;
  ganancia_inversores: number;
  porcentaje_partners_usado: number;
  porcentaje_inversores_usado: number;
  total_partners_activos: number;
  ganancia_por_partner: number;
}

interface MesActual {
  numero_mes: number;
  nombre_mes: string;
  fecha_inicio: string;
  fecha_fin: string;
  procesado: boolean;
}

interface ConfiguracionActual {
  porcentaje_partners: number;
  porcentaje_inversores: number;
  descripcion: string;
}

interface SuccessModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
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
          <h3 className="text-xl font-bold text-gray-900 mb-4">¡Ganancias Procesadas!</h3>
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

const GananciasProcessor: React.FC<GananciasProcessorProps> = ({ totalInversion, onUpdate }) => {
  const { admin } = useAdmin();
  const [porcentaje, setPorcentaje] = useState('');
  const [totalInversionCalculado, setTotalInversionCalculado] = useState(0);
  const [usarConfiguracionPersonalizada, setUsarConfiguracionPersonalizada] = useState(false);
  const [porcentajePartnersCustom, setPorcentajePartnersCustom] = useState('30');
  const [porcentajeInversoresCustom, setPorcentajeInversoresCustom] = useState('70');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mesActual, setMesActual] = useState<MesActual | null>(null);
  const [configuracionActual, setConfiguracionActual] = useState<ConfiguracionActual | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchMesActual();
    fetchConfiguracionActual();
  }, []);

  useEffect(() => {
    // Calcular total de inversión cuando se monta el componente y cuando cambia el mes actual
    if (mesActual) {
      calcularTotalInversion();
    }
  }, [mesActual]);
  const calcularTotalInversion = async () => {
    try {
      console.log('Calculando total de inversión desde transacciones...');
      
      // Obtener todas las transacciones del sistema
      const { data: transacciones, error } = await supabase
        .from('transacciones')
        .select('monto, tipo, usuario_tipo');

      if (error) throw error;

      // Calcular total de inversión actual
      let totalCalculado = 0;
      
      transacciones?.forEach(transaccion => {
        switch (transaccion.tipo.toLowerCase()) {
          case 'deposito':
            totalCalculado += Number(transaccion.monto);
            break;
          case 'retiro':
            totalCalculado -= Number(transaccion.monto);
            break;
          case 'ganancia':
            totalCalculado += Number(transaccion.monto);
            break;
        }
      });

      console.log('Total inversión calculado:', totalCalculado);
      setTotalInversionCalculado(Math.max(0, totalCalculado));
    } catch (error) {
      console.error('Error calculando total inversión:', error);
      setTotalInversionCalculado(0);
    }
  };

  const fetchMesActual = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_mes_actual');
      if (error) throw error;
      
      if (data && data.length > 0) {
        setMesActual(data[0]);
      } else {
        setMesActual(null);
      }
    } catch (error) {
      console.error('Error fetching mes actual:', error);
    }
  };

  const fetchConfiguracionActual = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_configuracion_ganancias');
      if (error) throw error;
      
      if (data && data.length > 0) {
        const config = data[0];
        setConfiguracionActual(config);
        setPorcentajePartnersCustom(config.porcentaje_partners.toString());
        setPorcentajeInversoresCustom(config.porcentaje_inversores.toString());
      }
    } catch (error) {
      console.error('Error fetching configuracion:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleCustomPercentageChange = (field: 'partners' | 'inversores', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === 'partners') {
      setPorcentajePartnersCustom(value);
      setPorcentajeInversoresCustom((100 - numValue).toString());
    } else {
      setPorcentajeInversoresCustom(value);
      setPorcentajePartnersCustom((100 - numValue).toString());
    }
  };

  const handlePreview = async () => {
    if (!porcentaje || !mesActual || totalInversionCalculado === 0) {
      alert('No hay inversión total calculada. Verifique que existan transacciones en el sistema.');
      return;
    }

    setLoading(true);
    try {
      // Obtener partners activos
      const { count: partnersActivos } = await supabase
        .from('partners')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true);

      // Calcular ganancias
      const gananciasBrutas = (parseFloat(porcentaje) * totalInversionCalculado) / 100;
      
      const porcentajePartnersUsado = usarConfiguracionPersonalizada 
        ? parseFloat(porcentajePartnersCustom) 
        : configuracionActual?.porcentaje_partners || 30;
      
      const porcentajeInversoresUsado = usarConfiguracionPersonalizada 
        ? parseFloat(porcentajeInversoresCustom) 
        : configuracionActual?.porcentaje_inversores || 70;

      const gananciasPartners = (gananciasBrutas * porcentajePartnersUsado) / 100;
      const gananciasInversores = (gananciasBrutas * porcentajeInversoresUsado) / 100;
      const gananciaPorPartner = partnersActivos > 0 ? gananciasPartners / partnersActivos : 0;

      const previewResult = {
        total_inversion: totalInversionCalculado,
        ganancia_bruta: gananciasBrutas,
        ganancia_partners: gananciasPartners,
        ganancia_inversores: gananciasInversores,
        porcentaje_partners_usado: porcentajePartnersUsado,
        porcentaje_inversores_usado: porcentajeInversoresUsado,
        total_partners_activos: partnersActivos || 0,
        ganancia_por_partner: gananciaPorPartner
      };

      setPreviewData(previewResult);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      setSuccessMessage('Error al generar vista previa: ' + (error as Error).message);
      setShowSuccessModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!previewData) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('procesar_ganancias_mensuales_v2', {
        p_porcentaje_ganancia: parseFloat(porcentaje),
        p_admin_id: admin?.id,
        p_usar_configuracion_personalizada: usarConfiguracionPersonalizada,
        p_porcentaje_partners_custom: usarConfiguracionPersonalizada ? parseFloat(porcentajePartnersCustom) : null,
        p_porcentaje_inversores_custom: usarConfiguracionPersonalizada ? parseFloat(porcentajeInversoresCustom) : null
      });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        setShowPreview(false);
        setPorcentaje('');
        setPreviewData(null);
        setSuccessMessage(result.message + ' Se han enviado notificaciones a todos los inversores y partners. Las ganancias se han registrado con identificación de mes específico.');
        setShowSuccessModal(true);
        fetchMesActual();
        calcularTotalInversion(); // Recalcular después de procesar
        onUpdate();
      } else {
        setSuccessMessage('Error: ' + result.message);
        setShowSuccessModal(true);
      }
      
    } catch (error) {
      console.error('Error processing earnings:', error);
      setSuccessMessage('Error al procesar las ganancias: ' + (error as Error).message);
      setShowSuccessModal(true);
    } finally {
      setProcessing(false);
    }
  };

  if (!mesActual) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3" />
          Procesar Ganancias Mensuales
        </h3>
        
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-6">
          <div className="flex items-center space-x-3 text-yellow-300">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h4 className="font-semibold">No hay meses configurados</h4>
              <p className="text-sm text-yellow-200 mt-1">
                Debe crear al menos un mes en la sección "Gestión de Períodos Mensuales" antes de procesar ganancias.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mesActual.procesado) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3" />
          Procesar Ganancias Mensuales
        </h3>
        
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center space-x-3 text-green-300">
            <CheckCircle className="w-6 h-6" />
            <div>
              <h4 className="font-semibold">Mes {mesActual.numero_mes} ya procesado</h4>
              <p className="text-sm text-green-200 mt-1">
                {mesActual.nombre_mes} ({formatDate(mesActual.fecha_inicio)} - {formatDate(mesActual.fecha_fin)})
              </p>
              <p className="text-sm text-green-200 mt-1">
                Cree un nuevo mes en "Gestión de Períodos Mensuales" para procesar más ganancias.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar loading mientras se calcula el total
  if (totalInversionCalculado === 0) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3" />
          Procesar Ganancias Mensuales
        </h3>
        
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span className="ml-3 text-white">Calculando total de inversión...</span>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Información del sistema de distribución */}
      <div className="bg-blue-500/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-blue-200/30">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Sistema de Distribución de Ganancias V2
        </h3>
        
        {configuracionActual && (
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <h4 className="text-blue-200 font-semibold mb-2">Configuración Actual del Sistema</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <h5 className="font-semibold text-blue-200 mb-1">Parte Proporcional ({configuracionActual.porcentaje_inversores}%)</h5>
                <p>Se distribuye proporcionalmente entre TODOS según su inversión individual.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <h5 className="font-semibold text-yellow-200 mb-1">Parte Exclusiva Partners ({configuracionActual.porcentaje_partners}%)</h5>
                <p>Se divide equitativamente entre todos los partners activos.</p>
              </div>
            </div>
          </div>
        )}

        {/* Opción de configuración personalizada */}
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              id="usar_configuracion_personalizada"
              checked={usarConfiguracionPersonalizada}
              onChange={(e) => setUsarConfiguracionPersonalizada(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="usar_configuracion_personalizada" className="text-white font-medium flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Usar configuración personalizada para este procesamiento</span>
            </label>
          </div>
          
          {usarConfiguracionPersonalizada && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  % Exclusivo Partners
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={porcentajePartnersCustom}
                    onChange={(e) => handleCustomPercentageChange('partners', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-center"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  % Proporcional
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={porcentajeInversoresCustom}
                    onChange={(e) => handleCustomPercentageChange('inversores', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formulario principal */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3" />
          Procesar Ganancias Mensuales - {mesActual.nombre_mes}
        </h3>

        {/* Información del mes actual */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-6">
          <h4 className="text-white font-semibold mb-3">Mes a Procesar</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-white/70 text-sm">Mes</p>
              <p className="text-xl font-bold text-blue-300">Mes {mesActual.numero_mes}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Período</p>
              <p className="text-lg font-bold text-white">
                {formatDate(mesActual.fecha_inicio)} - {formatDate(mesActual.fecha_fin)}
              </p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Total Inversión</p>
              <p className="text-xl font-bold text-green-300">{formatCurrency(totalInversionCalculado)}</p>
            </div>
          </div>
        </div>

        {/* Porcentaje de ganancia */}
        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-2 text-center">
            Porcentaje de Ganancia Mensual (%)
          </label>
          <div className="relative max-w-md mx-auto">
            <Calculator className="absolute left-3 top-3 w-5 h-5 text-white/80" />
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-center text-lg"
              placeholder="Ej: 5.0"
            />
          </div>
          <p className="text-white/60 text-xs mt-2 text-center">
            Porcentaje sobre el total de inversión
          </p>
        </div>

        {/* Vista previa de cálculos */}
        {porcentaje && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-6">
            <p className="text-blue-200 text-sm text-center mb-3">
              <strong>Ganancia bruta calculada:</strong> {formatCurrency((parseFloat(porcentaje) * totalInversionCalculado) / 100)}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-blue-300">Parte Proporcional ({usarConfiguracionPersonalizada ? porcentajeInversoresCustom : configuracionActual?.porcentaje_inversores}%)</p>
                <p className="font-semibold">{formatCurrency((parseFloat(porcentaje) * totalInversionCalculado) / 100 * (parseFloat(usarConfiguracionPersonalizada ? porcentajeInversoresCustom : configuracionActual?.porcentaje_inversores.toString() || '70') / 100))}</p>
              </div>
              <div className="text-center">
                <p className="text-yellow-300">Parte Exclusiva Partners ({usarConfiguracionPersonalizada ? porcentajePartnersCustom : configuracionActual?.porcentaje_partners}%)</p>
                <p className="font-semibold">{formatCurrency((parseFloat(porcentaje) * totalInversionCalculado) / 100 * (parseFloat(usarConfiguracionPersonalizada ? porcentajePartnersCustom : configuracionActual?.porcentaje_partners.toString() || '30') / 100))}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handlePreview}
            disabled={!porcentaje || loading}
            className="bg-yellow-500/30 text-yellow-100 px-8 py-4 rounded-lg hover:bg-yellow-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 mx-auto border border-yellow-400/50 font-bold text-lg"
          >
            <Calculator className="w-6 h-6" />
            <span>{loading ? 'Generando...' : 'Generar Vista Previa'}</span>
          </button>
        </div>
      </div>

      {/* Vista previa detallada */}
      {showPreview && previewData && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-3" />
            Vista Previa de Distribución - Mes {mesActual.numero_mes}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Total Inversión</h4>
              <p className="text-2xl font-bold text-white">{formatCurrency(previewData.total_inversion)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Ganancia Bruta</h4>
              <p className="text-2xl font-bold text-green-300">{formatCurrency(previewData.ganancia_bruta)}</p>
              <p className="text-white/60 text-xs mt-1">
                {porcentaje}% del total
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Parte Proporcional ({previewData.porcentaje_inversores_usado}%)</h4>
              <p className="text-2xl font-bold text-blue-300">{formatCurrency(previewData.ganancia_inversores)}</p>
              <p className="text-white/60 text-xs mt-1">Para todos según inversión</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Parte Exclusiva Partners ({previewData.porcentaje_partners_usado}%)</h4>
              <p className="text-2xl font-bold text-yellow-300">{formatCurrency(previewData.ganancia_partners)}</p>
              <p className="text-white/60 text-xs mt-1">Para {previewData.total_partners_activos} partners</p>
            </div>
          </div>

          {previewData.total_partners_activos > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
              <h4 className="text-purple-200 font-semibold mb-2">Detalle para Partners</h4>
              <p className="text-purple-100 text-sm">
                Cada partner recibirá: <strong>Ganancia proporcional</strong> (según su inversión) + <strong>{formatCurrency(previewData.ganancia_por_partner)}</strong> (parte exclusiva dividida equitativamente)
              </p>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="flex-1 bg-green-500/20 text-green-300 py-3 px-6 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Procesar Ganancias</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 bg-gray-500/20 text-gray-300 py-3 px-6 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      <SuccessModal
        show={showSuccessModal}
        message={successMessage}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessMessage('');
          fetchMesActual();
          calcularTotalInversion();
        }}
      />
    </div>
  );
};

export default GananciasProcessor;