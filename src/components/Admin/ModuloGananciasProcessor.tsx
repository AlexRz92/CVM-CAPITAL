import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { TrendingUp, DollarSign, Users, Calculator, Send, Info, CheckCircle, AlertTriangle, Percent, Settings } from 'lucide-react';

interface ModuloGananciasProcessorProps {
  moduloId: string;
  moduloNombre: string;
  onUpdate: () => void;
  showMessage: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

interface PreviewData {
  total_inversion: number;
  ganancia_bruta: number;
  ganancia_partners: number;
  ganancia_inversores: number;
  porcentaje_partners_usado: number;
  porcentaje_inversores_usado: number;
  total_partners_activos: number;
  total_inversores_activos: number;
  ganancia_por_partner: number;
  usuarios_asignados: any[];
}

interface ModuloMesActual {
  id: string;
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

const ModuloGananciasProcessor: React.FC<ModuloGananciasProcessorProps> = ({ 
  moduloId, 
  moduloNombre, 
  onUpdate, 
  showMessage 
}) => {
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
  const [mesActual, setMesActual] = useState<ModuloMesActual | null>(null);
  const [configuracionActual, setConfiguracionActual] = useState<ConfiguracionActual | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchMesActual();
    fetchConfiguracionActual();
  }, [moduloId]);

  useEffect(() => {
    if (mesActual) {
      calcularTotalInversion();
    }
  }, [mesActual, moduloId]);

  const calcularTotalInversion = async () => {
    try {
      console.log('Calculando total de inversión del módulo desde modulo_transacciones...');
      
      // Obtener todas las transacciones del módulo
      const { data: transacciones, error } = await supabase
        .from('modulo_transacciones')
        .select('monto, tipo, usuario_tipo')
        .eq('modulo_id', moduloId);

      if (error) throw error;

      // Calcular total de inversión actual del módulo
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

      console.log('Total inversión del módulo calculado:', totalCalculado);
      setTotalInversionCalculado(Math.max(0, totalCalculado));
    } catch (error) {
      console.error('Error calculando total inversión del módulo:', error);
      setTotalInversionCalculado(0);
    }
  };

  const fetchMesActual = async () => {
    try {
      // Buscar el mes actual del módulo que no esté procesado
      const { data, error } = await supabase
        .from('modulo_meses')
        .select('*')
        .eq('modulo_id', moduloId)
        .eq('procesado', false)
        .order('numero_mes', { ascending: true })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setMesActual(data[0]);
      } else {
        setMesActual(null);
      }
    } catch (error) {
      console.error('Error fetching mes actual del módulo:', error);
    }
  };

  const fetchConfiguracionActual = async () => {
    try {
      // Obtener configuración global del sistema
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*')
        .in('clave', ['porcentaje_partners', 'porcentaje_inversores']);
      
      if (error) throw error;
      
      if (data && data.length >= 2) {
        const partnersConfig = data.find(c => c.clave === 'porcentaje_partners');
        const inversoresConfig = data.find(c => c.clave === 'porcentaje_inversores');
        
        const config = {
          porcentaje_partners: partnersConfig ? parseFloat(partnersConfig.valor) : 30,
          porcentaje_inversores: inversoresConfig ? parseFloat(inversoresConfig.valor) : 70,
          descripcion: 'Configuración del sistema'
        };
        
        setConfiguracionActual(config);
        setPorcentajePartnersCustom(config.porcentaje_partners.toString());
        setPorcentajeInversoresCustom(config.porcentaje_inversores.toString());
      } else {
        // Configuración por defecto
        const defaultConfig = {
          porcentaje_partners: 30,
          porcentaje_inversores: 70,
          descripcion: 'Configuración por defecto'
        };
        setConfiguracionActual(defaultConfig);
      }
    } catch (error) {
      console.error('Error fetching configuracion:', error);
      // Configuración por defecto en caso de error
      const defaultConfig = {
        porcentaje_partners: 30,
        porcentaje_inversores: 70,
        descripcion: 'Configuración por defecto'
      };
      setConfiguracionActual(defaultConfig);
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

  const obtenerUsuariosAsignados = async () => {
    try {
      // Obtener inversores asignados al módulo
      const { data: inversoresAsignados, error: inversoresError } = await supabase
        .from('modulo_asignaciones')
        .select(`
          inversor_id,
          activo,
          inversores (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('modulo_id', moduloId)
        .eq('activo', true)
        .not('inversor_id', 'is', null);

      if (inversoresError) throw inversoresError;

      // Obtener partners asignados al módulo
      const { data: partnersAsignados, error: partnersError } = await supabase
        .from('modulo_asignaciones')
        .select(`
          partner_id,
          activo,
          partners (
            id,
            nombre,
            username
          )
        `)
        .eq('modulo_id', moduloId)
        .eq('activo', true)
        .not('partner_id', 'is', null);

      if (partnersError) throw partnersError;

      // Calcular saldo de cada usuario en el módulo
      const usuariosConSaldos = [];

      // Procesar inversores
      for (const asignacion of inversoresAsignados || []) {
        if (asignacion.inversores) {
          const { data: transacciones, error: transError } = await supabase
            .from('modulo_transacciones')
            .select('monto, tipo')
            .eq('modulo_id', moduloId)
            .eq('inversor_id', asignacion.inversor_id)
            .eq('usuario_tipo', 'inversor');

          if (transError) throw transError;

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

          usuariosConSaldos.push({
            id: asignacion.inversor_id,
            nombre: `${asignacion.inversores.nombre} ${asignacion.inversores.apellido}`,
            email: asignacion.inversores.email,
            tipo: 'inversor',
            saldo_modulo: saldo
          });
        }
      }

      // Procesar partners
      for (const asignacion of partnersAsignados || []) {
        if (asignacion.partners) {
          const { data: transacciones, error: transError } = await supabase
            .from('modulo_transacciones')
            .select('monto, tipo')
            .eq('modulo_id', moduloId)
            .eq('partner_id', asignacion.partner_id)
            .eq('usuario_tipo', 'partner');

          if (transError) throw transError;

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

          usuariosConSaldos.push({
            id: asignacion.partner_id,
            nombre: asignacion.partners.nombre,
            username: asignacion.partners.username,
            tipo: 'partner',
            saldo_modulo: saldo
          });
        }
      }

      return usuariosConSaldos;
    } catch (error) {
      console.error('Error obteniendo usuarios asignados:', error);
      return [];
    }
  };

  const handlePreview = async () => {
    if (!porcentaje || !mesActual || totalInversionCalculado === 0) {
      showMessage('Error', 'No hay inversión total calculada en este módulo. Verifique que existan transacciones.', 'error');
      return;
    }

    setLoading(true);
    try {
      const usuariosAsignados = await obtenerUsuariosAsignados();
      
      const partnersActivos = usuariosAsignados.filter(u => u.tipo === 'partner').length;
      const inversoresActivos = usuariosAsignados.filter(u => u.tipo === 'inversor').length;

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
        total_partners_activos: partnersActivos,
        total_inversores_activos: inversoresActivos,
        ganancia_por_partner: gananciaPorPartner,
        usuarios_asignados: usuariosAsignados
      };

      setPreviewData(previewResult);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      showMessage('Error', 'Error al generar vista previa: ' + (error as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!previewData || !mesActual) return;

    setProcessing(true);
    try {
      console.log('Procesando ganancias del módulo:', moduloId);

      // 1. Marcar el mes como procesado
      const { error: updateMesError } = await supabase
        .from('modulo_meses')
        .update({
          procesado: true,
          fecha_procesado: new Date().toISOString(),
          total_inversion: previewData.total_inversion,
          porcentaje_ganancia: parseFloat(porcentaje),
          ganancia_bruta: previewData.ganancia_bruta,
          procesado_por: admin?.id
        })
        .eq('id', mesActual.id);

      if (updateMesError) throw updateMesError;

      // 2. Procesar ganancias para cada usuario
      const transaccionesGanancias = [];
      const notificaciones = [];

      // Calcular ganancia proporcional para cada usuario
      for (const usuario of previewData.usuarios_asignados) {
        if (usuario.saldo_modulo <= 0) continue;

        // Ganancia proporcional basada en su inversión
        const proporcion = usuario.saldo_modulo / previewData.total_inversion;
        const gananciaProporcional = previewData.ganancia_inversores * proporcion;

        let gananciaTotal = gananciaProporcional;
        let descripcionGanancia = `Ganancia proporcional ${mesActual.nombre_mes} - Módulo ${moduloNombre}`;

        // Si es partner, agregar ganancia adicional
        if (usuario.tipo === 'partner' && previewData.total_partners_activos > 0) {
          gananciaTotal += previewData.ganancia_por_partner;
          descripcionGanancia = `Ganancia ${mesActual.nombre_mes} - Módulo ${moduloNombre} (Proporcional: ${formatCurrency(gananciaProporcional)} + Adicional: ${formatCurrency(previewData.ganancia_por_partner)})`;
        }

        // Crear transacción de ganancia
        transaccionesGanancias.push({
          modulo_id: moduloId,
          [usuario.tipo === 'inversor' ? 'inversor_id' : 'partner_id']: usuario.id,
          usuario_tipo: usuario.tipo,
          monto: gananciaTotal,
          tipo: 'ganancia',
          descripcion: descripcionGanancia,
          fecha: new Date().toISOString()
        });

        // Crear notificación
        notificaciones.push({
          usuario_id: usuario.id,
          tipo_usuario: usuario.tipo,
          titulo: `Ganancias ${mesActual.nombre_mes} - ${moduloNombre}`,
          mensaje: `Has recibido ${formatCurrency(gananciaTotal)} en ganancias del módulo ${moduloNombre} correspondientes a ${mesActual.nombre_mes}.`,
          tipo_notificacion: 'success',
          leida: false,
          fecha_creacion: new Date().toISOString()
        });
      }

      // 3. Insertar todas las transacciones de ganancias
      if (transaccionesGanancias.length > 0) {
        const { error: transaccionesError } = await supabase
          .from('modulo_transacciones')
          .insert(transaccionesGanancias);

        if (transaccionesError) throw transaccionesError;
      }

      // 4. Insertar todas las notificaciones
      if (notificaciones.length > 0) {
        const { error: notificacionesError } = await supabase
          .from('notificaciones')
          .insert(notificaciones);

        if (notificacionesError) throw notificacionesError;
      }

      setShowPreview(false);
      setPorcentaje('');
      setPreviewData(null);
      setSuccessMessage(`Ganancias del módulo ${moduloNombre} procesadas exitosamente. Se procesaron ${transaccionesGanancias.length} ganancias y se enviaron ${notificaciones.length} notificaciones. Total distribuido: ${formatCurrency(previewData.ganancia_bruta)}.`);
      setShowSuccessModal(true);
      fetchMesActual();
      calcularTotalInversion();
      onUpdate();
      
    } catch (error) {
      console.error('Error processing module earnings:', error);
      showMessage('Error', 'Error al procesar las ganancias del módulo: ' + (error as Error).message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!mesActual) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Procesar Ganancias - {moduloNombre}
        </h4>
        
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-6">
          <div className="flex items-center space-x-3 text-yellow-300">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h5 className="font-semibold">No hay períodos configurados</h5>
              <p className="text-sm text-yellow-200 mt-1">
                Debe crear al menos un período en el calendario de este módulo antes de procesar ganancias.
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
        <h4 className="text-lg font-bold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Procesar Ganancias - {moduloNombre}
        </h4>
        
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center space-x-3 text-green-300">
            <CheckCircle className="w-6 h-6" />
            <div>
              <h5 className="font-semibold">Período {mesActual.numero_mes} ya procesado</h5>
              <p className="text-sm text-green-200 mt-1">
                {mesActual.nombre_mes} ({formatDate(mesActual.fecha_inicio)} - {formatDate(mesActual.fecha_fin)})
              </p>
              <p className="text-sm text-green-200 mt-1">
                Cree un nuevo período en el calendario del módulo para procesar más ganancias.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (totalInversionCalculado === 0) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Procesar Ganancias - {moduloNombre}
        </h4>
        
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center space-x-3 text-red-300">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h5 className="font-semibold">Sin inversión en el módulo</h5>
              <p className="text-sm text-red-200 mt-1">
                No hay usuarios asignados con saldo positivo en este módulo. Asigne usuarios y realice depósitos antes de procesar ganancias.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información del sistema de distribución */}
      <div className="bg-blue-500/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-blue-200/30">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Sistema de Distribución de Ganancias - {moduloNombre}
        </h4>
        
        {configuracionActual && (
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <h5 className="text-blue-200 font-semibold mb-2">Configuración del Sistema</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <h6 className="font-semibold text-blue-200 mb-1">Parte Proporcional ({configuracionActual.porcentaje_inversores}%)</h6>
                <p>Se distribuye proporcionalmente entre TODOS los usuarios del módulo según su inversión individual.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <h6 className="font-semibold text-yellow-200 mb-1">Parte Exclusiva Partners ({configuracionActual.porcentaje_partners}%)</h6>
                <p>Se divide equitativamente entre todos los partners asignados al módulo.</p>
              </div>
            </div>
          </div>
        )}

        {/* Opción de configuración personalizada */}
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              id="usar_configuracion_personalizada_modulo"
              checked={usarConfiguracionPersonalizada}
              onChange={(e) => setUsarConfiguracionPersonalizada(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="usar_configuracion_personalizada_modulo" className="text-white font-medium flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Usar configuración personalizada para este módulo</span>
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
        <h4 className="text-lg font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Procesar Ganancias - {moduloNombre} - {mesActual.nombre_mes}
        </h4>

        {/* Información del mes actual */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-6">
          <h5 className="text-white font-semibold mb-3">Período a Procesar</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-white/70 text-sm">Período</p>
              <p className="text-xl font-bold text-blue-300">Mes {mesActual.numero_mes}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Fechas</p>
              <p className="text-lg font-bold text-white">
                {formatDate(mesActual.fecha_inicio)} - {formatDate(mesActual.fecha_fin)}
              </p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Total Inversión Módulo</p>
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
            Porcentaje sobre el total de inversión del módulo
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
          <h4 className="text-lg font-bold text-white mb-6 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Vista Previa de Distribución - {moduloNombre} - Mes {mesActual.numero_mes}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h5 className="text-white/80 text-sm font-medium mb-2">Total Inversión Módulo</h5>
              <p className="text-2xl font-bold text-white">{formatCurrency(previewData.total_inversion)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h5 className="text-white/80 text-sm font-medium mb-2">Ganancia Bruta</h5>
              <p className="text-2xl font-bold text-green-300">{formatCurrency(previewData.ganancia_bruta)}</p>
              <p className="text-white/60 text-xs mt-1">
                {porcentaje}% del total del módulo
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h5 className="text-white/80 text-sm font-medium mb-2">Parte Proporcional ({previewData.porcentaje_inversores_usado}%)</h5>
              <p className="text-2xl font-bold text-blue-300">{formatCurrency(previewData.ganancia_inversores)}</p>
              <p className="text-white/60 text-xs mt-1">Para todos según inversión</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h5 className="text-white/80 text-sm font-medium mb-2">Parte Exclusiva Partners ({previewData.porcentaje_partners_usado}%)</h5>
              <p className="text-2xl font-bold text-yellow-300">{formatCurrency(previewData.ganancia_partners)}</p>
              <p className="text-white/60 text-xs mt-1">Para {previewData.total_partners_activos} partners</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h5 className="text-blue-200 font-semibold mb-2">Usuarios en el Módulo</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-100">Inversores: <strong>{previewData.total_inversores_activos}</strong></p>
                </div>
                <div>
                  <p className="text-blue-100">Partners: <strong>{previewData.total_partners_activos}</strong></p>
                </div>
              </div>
            </div>

            {previewData.total_partners_activos > 0 && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h5 className="text-purple-200 font-semibold mb-2">Detalle para Partners</h5>
                <p className="text-purple-100 text-sm">
                  Cada partner recibirá: <strong>Ganancia proporcional</strong> + <strong>{formatCurrency(previewData.ganancia_por_partner)}</strong> (parte exclusiva)
                </p>
              </div>
            )}
          </div>

          {/* Lista de usuarios y sus ganancias calculadas */}
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <h5 className="text-white font-semibold mb-3">Distribución Detallada por Usuario</h5>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {previewData.usuarios_asignados.map((usuario, index) => {
                if (usuario.saldo_modulo <= 0) return null;
                
                const proporcion = usuario.saldo_modulo / previewData.total_inversion;
                const gananciaProporcional = previewData.ganancia_inversores * proporcion;
                const gananciaAdicional = usuario.tipo === 'partner' ? previewData.ganancia_por_partner : 0;
                const gananciaTotal = gananciaProporcional + gananciaAdicional;

                return (
                  <div key={index} className="bg-white/10 rounded p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{usuario.nombre}</p>
                      <p className="text-white/70 text-sm">
                        {usuario.tipo === 'partner' ? 'Partner' : 'Inversor'} - Saldo: {formatCurrency(usuario.saldo_modulo)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-300 font-bold">{formatCurrency(gananciaTotal)}</p>
                      {usuario.tipo === 'partner' && gananciaAdicional > 0 && (
                        <p className="text-yellow-200 text-xs">
                          Prop: {formatCurrency(gananciaProporcional)} + Adic: {formatCurrency(gananciaAdicional)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
                  <span>Procesar Ganancias del Módulo</span>
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

export default ModuloGananciasProcessor;