import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { TrendingUp, DollarSign, Calculator, Send, CheckCircle } from 'lucide-react';

interface TemporalGananciasProcessorProps {
  onUpdate: () => void;
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
          <h3 className="text-xl font-bold text-gray-900 mb-4">¡Ganancias Temporales Procesadas!</h3>
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

const TemporalGananciasProcessor: React.FC<TemporalGananciasProcessorProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [porcentaje, setPorcentaje] = useState('');
  const [totalInversionTemporal, setTotalInversionTemporal] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    calcularTotalInversionTemporal();
  }, []);

  const calcularTotalInversionTemporal = async () => {
    try {
      console.log('Calculando total de inversión temporal...');
      
      const { data: transacciones, error } = await supabase
        .from('transacciones_temporal')
        .select('monto, tipo');

      if (error) throw error;

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

      console.log('Total inversión temporal calculado:', totalCalculado);
      setTotalInversionTemporal(Math.max(0, totalCalculado));
    } catch (error) {
      console.error('Error calculando total inversión temporal:', error);
      setTotalInversionTemporal(0);
    }
  };

  const handleProcess = async () => {
    if (!porcentaje || !admin) return;

    setProcessing(true);
    try {
      const gananciasBrutas = (parseFloat(porcentaje) * totalInversionTemporal) / 100;

      // Obtener todos los inversores con transacciones temporales
      const { data: inversoresData, error: inversoresError } = await supabase
        .from('transacciones_temporal')
        .select('inversor_id')
        .not('inversor_id', 'is', null);

      if (inversoresError) throw inversoresError;

      const inversoresUnicos = [...new Set(inversoresData?.map(t => t.inversor_id) || [])];

      if (inversoresUnicos.length === 0) {
        throw new Error('No hay inversores con transacciones temporales');
      }

      // Calcular ganancia por inversor (distribución equitativa)
      const gananciaPorInversor = gananciasBrutas / inversoresUnicos.length;

      // Crear transacciones de ganancia para cada inversor
      const transaccionesGanancias = inversoresUnicos.map(inversorId => ({
        inversor_id: inversorId,
        monto: gananciaPorInversor,
        tipo: 'ganancia',
        descripcion: `Ganancia temporal mensual - ${porcentaje}% sobre inversión total`,
        fecha: new Date().toISOString()
      }));

      const { error: transError } = await supabase
        .from('transacciones_temporal')
        .insert(transaccionesGanancias);

      if (transError) throw transError;

      // Enviar notificaciones a todos los inversores
      const notificaciones = inversoresUnicos.map(inversorId => ({
        usuario_id: inversorId,
        tipo_usuario: 'inversor',
        titulo: 'Ganancia Temporal Procesada',
        mensaje: `Se ha procesado tu ganancia temporal de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(gananciaPorInversor)} correspondiente al ${porcentaje}% mensual.`,
        tipo_notificacion: 'success'
      }));

      const { error: notifError } = await supabase
        .from('notificaciones')
        .insert(notificaciones);

      if (notifError) throw notifError;

      setPorcentaje('');
      setSuccessMessage(`Ganancias temporales procesadas exitosamente. Se distribuyeron ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(gananciasBrutas)} entre ${inversoresUnicos.length} inversores. Se han enviado notificaciones a todos los inversores.`);
      setShowSuccessModal(true);
      calcularTotalInversionTemporal();
      onUpdate();
      
    } catch (error) {
      console.error('Error processing temporal earnings:', error);
      setSuccessMessage('Error al procesar las ganancias temporales: ' + (error as Error).message);
      setShowSuccessModal(true);
    } finally {
      setProcessing(false);
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

  return (
    <div className="space-y-6">
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3" />
          Procesar Ganancias Temporales
        </h3>

        {/* Información del sistema temporal */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-6">
          <h4 className="text-white font-semibold mb-3">Sistema Temporal</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-white/70 text-sm">Total Inversión Temporal</p>
              <p className="text-xl font-bold text-green-300">{formatCurrency(totalInversionTemporal)}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Distribución</p>
              <p className="text-lg font-bold text-white">Equitativa entre inversores</p>
            </div>
          </div>
        </div>

        {/* Porcentaje de ganancia */}
        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-2 text-center">
            Porcentaje de Ganancia Temporal (%)
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
            Porcentaje sobre el total de inversión temporal
          </p>
        </div>

        {/* Vista previa de cálculos */}
        {porcentaje && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-6">
            <p className="text-blue-200 text-sm text-center mb-3">
              <strong>Ganancia bruta temporal calculada:</strong> {formatCurrency((parseFloat(porcentaje) * totalInversionTemporal) / 100)}
            </p>
            <p className="text-blue-200 text-xs text-center">
              Se distribuirá equitativamente entre todos los inversores con transacciones temporales
            </p>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleProcess}
            disabled={!porcentaje || processing || totalInversionTemporal === 0}
            className="bg-green-500/30 text-green-100 px-8 py-4 rounded-lg hover:bg-green-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 mx-auto border border-green-400/50 font-bold text-lg"
          >
            {processing ? (
              <div className="w-6 h-6 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-6 h-6" />
                <span>Procesar Ganancias Temporales</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de éxito */}
      <SuccessModal
        show={showSuccessModal}
        message={successMessage}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessMessage('');
        }}
      />
    </div>
  );
};

export default TemporalGananciasProcessor;