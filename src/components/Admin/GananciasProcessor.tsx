import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { TrendingUp, DollarSign, Users, Calculator, Send, Settings } from 'lucide-react';

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
  distribucion_inversores: any[];
}

const GananciasProcessor: React.FC<GananciasProcessorProps> = ({ totalInversion, onUpdate }) => {
  const { admin } = useAdmin();
  const [formData, setFormData] = useState({
    porcentaje: '',
    ganancia_bruta: ''
  });
  const [porcentajeInversores, setPorcentajeInversores] = useState(70);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [semanaActual, setSemanaActual] = useState(1);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetchSemanaActual();
    fetchPorcentajeInversores();
  }, []);

  const fetchSemanaActual = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'semana_actual')
        .single();

      if (error) throw error;
      setSemanaActual(parseInt(data?.valor || '1'));
    } catch (error) {
      console.error('Error fetching semana actual:', error);
    }
  };

  const fetchPorcentajeInversores = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'porcentaje_inversores')
        .single();

      if (error) {
        // Si no existe, crear con valor por defecto
        await supabase
          .from('configuracion_sistema')
          .insert({
            clave: 'porcentaje_inversores',
            valor: '70',
            descripcion: 'Porcentaje de ganancias para inversores'
          });
        setPorcentajeInversores(70);
      } else {
        setPorcentajeInversores(parseInt(data?.valor || '70'));
      }
    } catch (error) {
      console.error('Error fetching porcentaje inversores:', error);
      setPorcentajeInversores(70);
    }
  };

  const updatePorcentajeInversores = async () => {
    try {
      const { error } = await supabase
        .from('configuracion_sistema')
        .upsert({
          clave: 'porcentaje_inversores',
          valor: porcentajeInversores.toString(),
          descripcion: 'Porcentaje de ganancias para inversores',
          updated_by: admin?.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Porcentaje de inversores actualizado correctamente');
    } catch (error) {
      console.error('Error updating porcentaje inversores:', error);
      alert('Error al actualizar el porcentaje');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Manejar cambios en los campos con exclusión mutua
  const handlePorcentajeChange = (value: string) => {
    setFormData({
      porcentaje: value,
      ganancia_bruta: '' // Limpiar el otro campo
    });
  };

  const handleGananciaBrutaChange = (value: string) => {
    setFormData({
      porcentaje: '', // Limpiar el otro campo
      ganancia_bruta: value
    });
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

      const ganancia_partners = ganancia_bruta * ((100 - porcentajeInversores) / 100);
      const ganancia_inversores = ganancia_bruta * (porcentajeInversores / 100);

      // Obtener distribución de partners usando la función corregida
      const { data: distribucionPartners, error: partnersError } = await supabase.rpc('obtener_distribucion_partners_preview', {
        p_total_inversion: totalInversion,
        p_porcentaje: formData.porcentaje ? parseFloat(formData.porcentaje) : null,
        p_ganancia_bruta: formData.ganancia_bruta ? parseFloat(formData.ganancia_bruta) : null
      });

      if (partnersError) throw partnersError;

      // Obtener distribución de inversores
      const { data: distribucionInversores, error: inversoresError } = await supabase.rpc('obtener_distribucion_inversores_preview', {
        p_total_inversion: totalInversion,
        p_porcentaje: formData.porcentaje ? parseFloat(formData.porcentaje) : null,
        p_ganancia_bruta: formData.ganancia_bruta ? parseFloat(formData.ganancia_bruta) : null
      });

      if (inversoresError) throw inversoresError;

      setPreviewData({
        total_inversion: totalInversion,
        ganancia_bruta,
        ganancia_partners,
        ganancia_inversores,
        semana: semanaActual,
        distribucion_partners: distribucionPartners || [],
        distribucion_inversores: distribucionInversores || []
      });

      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error al generar vista previa: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!previewData) return;

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('procesar_ganancias_semanales', {
        p_porcentaje: formData.porcentaje ? parseFloat(formData.porcentaje) : null,
        p_ganancia_bruta: formData.ganancia_bruta ? parseFloat(formData.ganancia_bruta) : null,
        p_admin_id: admin?.id
      });

      if (error) throw error;

      setShowPreview(false);
      setFormData({ porcentaje: '', ganancia_bruta: '' });
      setPreviewData(null);
      onUpdate();
      
      alert('Ganancias procesadas exitosamente. Se han enviado notificaciones a todos los inversores y partners.');
    } catch (error) {
      console.error('Error processing earnings:', error);
      alert('Error al procesar las ganancias: ' + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuración de Porcentajes */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configuración de Distribución
          </h3>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        {showConfig && (
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Porcentaje para Inversores (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={porcentajeInversores}
                  onChange={(e) => setPorcentajeInversores(parseInt(e.target.value) || 70)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <p className="text-white/60 text-xs mt-1">
                  Partners recibirán: {100 - porcentajeInversores}%
                </p>
              </div>
              <div className="flex items-end">
                <button
                  onClick={updatePorcentajeInversores}
                  className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de entrada */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3" />
          Procesar Ganancias Semanales
        </h3>

        {/* Información actual */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-6">
          <h4 className="text-white font-semibold mb-3">Información Actual</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-white/70 text-sm">Total en Inversión</p>
              <p className="text-xl font-bold text-green-300">{formatCurrency(totalInversion)}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Semana Actual</p>
              <p className="text-xl font-bold text-blue-300">{semanaActual}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Distribución</p>
              <p className="text-sm text-white/80">
                Inversores: {porcentajeInversores}% | Partners: {100 - porcentajeInversores}%
              </p>
            </div>
          </div>
        </div>

        {/* Formulario con campos excluyentes */}
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
                  onChange={(e) => handlePorcentajeChange(e.target.value)}
                  disabled={!!formData.ganancia_bruta}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Ej: 5.5"
                />
              </div>
              {formData.ganancia_bruta && (
                <p className="text-yellow-300 text-xs mt-1">
                  Deshabilitado porque se ingresó cantidad fija
                </p>
              )}
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
                  onChange={(e) => handleGananciaBrutaChange(e.target.value)}
                  disabled={!!formData.porcentaje}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Ej: 5000"
                />
              </div>
              {formData.porcentaje && (
                <p className="text-yellow-300 text-xs mt-1">
                  Deshabilitado porque se ingresó porcentaje
                </p>
              )}
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
            Vista Previa de Distribución - Semana {previewData.semana}
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
                {formData.porcentaje ? `${formData.porcentaje}% del total` : 'Cantidad fija ingresada'}
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Para Partners ({100 - porcentajeInversores}%)</h4>
              <p className="text-2xl font-bold text-yellow-300">{formatCurrency(previewData.ganancia_partners)}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h4 className="text-white/80 text-sm font-medium mb-2">Para Inversores ({porcentajeInversores}%)</h4>
              <p className="text-2xl font-bold text-purple-300">{formatCurrency(previewData.ganancia_inversores)}</p>
            </div>
          </div>

          {/* Distribución por Partners */}
          {previewData.distribucion_partners.length > 0 && (
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-4">Distribución por Partners</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
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
                        <p className="text-white/60 text-xs">
                          Inversión propia: {formatCurrency(partner.inversion_inicial)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold text-lg">
                          {formatCurrency(partner.ganancia_total)}
                        </p>
                        <div className="text-white/70 text-sm">
                          <span className="block">Ganancia: {formatCurrency(partner.ganancia_comision)}</span>
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

          {/* Distribución por Inversores */}
          {previewData.distribucion_inversores.length > 0 && (
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-4">
                Distribución por Inversores ({previewData.distribucion_inversores.length})
              </h4>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {previewData.distribucion_inversores.map((inversor: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {inversor.nombre} {inversor.apellido}
                        </p>
                        <p className="text-white/60 text-xs">
                          Inversión: {formatCurrency(inversor.inversion)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-300 font-semibold text-sm">
                          {formatCurrency(inversor.ganancia_individual)}
                        </p>
                        <p className="text-white/60 text-xs">
                          {porcentajeInversores}% de 5%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <h4 className="text-yellow-300 font-semibold mb-2">Cálculo Detallado</h4>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>• <strong>Partners + Operadores:</strong> Reciben 100% de su ganancia propia + 100% del {100 - porcentajeInversores}% de sus inversores</li>
              <li>• <strong>Partners normales:</strong> Reciben 80% de su ganancia propia + 1/3 del {100 - porcentajeInversores}% de sus inversores</li>
              <li>• <strong>Inversores:</strong> Reciben {porcentajeInversores}% de su ganancia (5% de su inversión)</li>
              <li>• <strong>Distribución:</strong> {porcentajeInversores}% para inversores, {100 - porcentajeInversores}% para partners</li>
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