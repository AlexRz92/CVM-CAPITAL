import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { TrendingUp, DollarSign, Users, Calculator, Send } from 'lucide-react';

interface GananciasProcessorProps {
  totalInversion: number;
  onUpdate: () => void;
}

interface PreviewData {
  total_inversion: number;
  ganancia_bruta: number;
  ganancia_partners: number;
  ganancia_inversores: number;
  semana: number;
  distribucion_partners: any[];
}

const GananciasProcessor: React.FC<GananciasProcessorProps> = ({ totalInversion, onUpdate }) => {
  const { admin } = useAdmin();
  const [formData, setFormData] = useState({
    porcentaje: '',
    ganancia_bruta: ''
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handlePreview = async () => {
    if (!formData.porcentaje && !formData.ganancia_bruta) return;

    setLoading(true);
    try {
      let ganancia_bruta = 0;
      
      if (formData.ganancia_bruta) {
        ganancia_bruta = parseFloat(formData.ganancia_bruta);
      } else if (formData.porcentaje) {
        ganancia_bruta = (parseFloat(formData.porcentaje) * totalInversion) / 100;
      }

      const ganancia_partners = ganancia_bruta * 0.30;
      const ganancia_inversores = ganancia_bruta * 0.70;

      // Obtener distribución de partners
      const { data: distribucionPartners, error } = await supabase.rpc('obtener_distribucion_partners', {
        p_ganancia_partners: ganancia_partners
      });

      if (error) throw error;

      // Obtener semana actual
      const { data: configData, error: configError } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'semana_actual')
        .single();

      if (configError) throw configError;

      setPreviewData({
        total_inversion: totalInversion,
        ganancia_bruta,
        ganancia_partners,
        ganancia_inversores,
        semana: parseInt(configData?.valor || '1'),
        distribucion_partners: distribucionPartners || []
      });

      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error al generar vista previa');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!previewData) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('procesar_ganancias_semanales', {
        p_porcentaje: formData.porcentaje ? parseFloat(formData.porcentaje) : null,
        p_ganancia_bruta: formData.ganancia_bruta ? parseFloat(formData.ganancia_bruta) : null,
        p_admin_id: admin?.id
      });

      if (error) throw error;

      setShowPreview(false);
      setFormData({ porcentaje: '', ganancia_bruta: '' });
      setPreviewData(null);
      onUpdate();
      
      alert('Ganancias procesadas exitosamente. Se han enviado notificaciones a todos los inversores.');
    } catch (error) {
      console.error('Error processing earnings:', error);
      alert('Error al procesar las ganancias. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulario de entrada */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3" />
          Procesar Ganancias Semanales
        </h3>

        {/* Información actual */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-6">
          <h4 className="text-white font-semibold mb-3">Información Actual</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-white/70 text-sm">Total en Inversión</p>
              <p className="text-xl font-bold text-green-300">{formatCurrency(totalInversion)}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Semana Actual</p>
              <p className="text-xl font-bold text-blue-300">1</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Porcentaje de Ganancia (%)
              </label>
              <div className="relative">
                <Calculator className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.porcentaje}
                  onChange={(e) => setFormData({...formData, porcentaje: e.target.value, ganancia_bruta: ''})}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Ej: 5.5"
                  disabled={!!formData.ganancia_bruta}
                />
              </div>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                O Ganancia en Número (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.ganancia_bruta}
                  onChange={(e) => setFormData({...formData, ganancia_bruta: e.target.value, porcentaje: ''})}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Ej: 5000"
                  disabled={!!formData.porcentaje}
                />
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handlePreview}
              disabled={(!formData.porcentaje && !formData.ganancia_bruta) || loading}
              className="bg-yellow-500/30 text-yellow-100 px-8 py-4 rounded-lg hover:bg-yellow-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 mx-auto border border-yellow-400/50 font-bold text-lg"
            >
              <Calculator className="w-6 h-6" />
              <span>{loading ? 'Generando...' : 'Generar Vista Previa'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vista previa */}
      {showPreview && previewData && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-3" />
            Vista Previa de Distribución
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Total Inversión</h4>
              <p className="text-2xl font-bold text-white">{formatCurrency(previewData.total_inversion)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Ganancia Bruta</h4>
              <p className="text-2xl font-bold text-green-300">{formatCurrency(previewData.ganancia_bruta)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Para Partners (30%)</h4>
              <p className="text-2xl font-bold text-yellow-300">{formatCurrency(previewData.ganancia_partners)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Para Inversores (70%)</h4>
              <p className="text-2xl font-bold text-purple-300">{formatCurrency(previewData.ganancia_inversores)}</p>
            </div>
          </div>

          {/* Distribución por Partners */}
          {previewData.distribucion_partners.length > 0 && (
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-4">Distribución por Partners</h4>
              <div className="space-y-3">
                {previewData.distribucion_partners.map((partner, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-white font-medium">{partner.nombre}</h5>
                        <p className="text-white/70 text-sm">
                          {partner.tipo === 'operador_partner' ? 'Partner + Operador' : 'Partner'} • 
                          {partner.total_inversores} inversores • 
                          {formatCurrency(partner.monto_total_inversores)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {formatCurrency(partner.ganancia_comision + partner.ganancia_operador)}
                        </p>
                        <div className="text-white/70 text-sm">
                          {partner.ganancia_comision > 0 && (
                            <span>Partner: {formatCurrency(partner.ganancia_comision)}</span>
                          )}
                          {partner.ganancia_operador > 0 && (
                            <span className="block">Operador: {formatCurrency(partner.ganancia_operador)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <h4 className="text-yellow-300 font-semibold mb-2">Información Importante</h4>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>• Las ganancias se distribuirán proporcionalmente según la inversión de cada usuario</li>
              <li>• Se enviará una notificación automática a todos los inversores</li>
              <li>• Los totales de los usuarios se actualizarán automáticamente</li>
              <li>• Se creará un registro de transacción para cada inversor</li>
              <li>• Los partners recibirán sus comisiones según su configuración</li>
            </ul>
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
    </div>
  );
};

export default GananciasProcessor;