import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { Settings, Save, RotateCcw, Percent, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConfiguracionGanancias {
  id: string;
  porcentaje_partners: number;
  porcentaje_inversores: number;
  descripcion: string;
  fecha_creacion: string;
}

interface ConfiguracionGananciasProps {
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
          <h3 className="text-xl font-bold text-gray-900 mb-4">Configuración Guardada</h3>
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

const ConfiguracionGanancias: React.FC<ConfiguracionGananciasProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [configuracionActual, setConfiguracionActual] = useState<ConfiguracionGanancias | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    porcentaje_partners: 30,
    porcentaje_inversores: 70,
    descripcion: ''
  });

  useEffect(() => {
    fetchConfiguracionActual();
  }, []);

  const fetchConfiguracionActual = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_configuracion_ganancias');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const config = data[0];
        setConfiguracionActual(config);
        setFormData({
          porcentaje_partners: config.porcentaje_partners,
          porcentaje_inversores: config.porcentaje_inversores,
          descripcion: ''
        });
      }
    } catch (error) {
      console.error('Error fetching configuracion:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageChange = (field: 'porcentaje_partners' | 'porcentaje_inversores', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === 'porcentaje_partners') {
      setFormData({
        ...formData,
        porcentaje_partners: numValue,
        porcentaje_inversores: 100 - numValue
      });
    } else {
      setFormData({
        ...formData,
        porcentaje_inversores: numValue,
        porcentaje_partners: 100 - numValue
      });
    }
  };

  const handleReset = () => {
    if (configuracionActual) {
      setFormData({
        porcentaje_partners: configuracionActual.porcentaje_partners,
        porcentaje_inversores: configuracionActual.porcentaje_inversores,
        descripcion: ''
      });
    }
  };

  const handleSave = async () => {
    if (!admin) return;

    // Validaciones
    if (formData.porcentaje_partners + formData.porcentaje_inversores !== 100) {
      alert('Los porcentajes deben sumar exactamente 100%');
      return;
    }

    if (formData.porcentaje_partners < 0 || formData.porcentaje_inversores < 0) {
      alert('Los porcentajes no pueden ser negativos');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('guardar_configuracion_ganancias', {
        p_porcentaje_partners: formData.porcentaje_partners,
        p_porcentaje_inversores: formData.porcentaje_inversores,
        p_descripcion: formData.descripcion || 'Configuración actualizada desde panel de administración',
        p_admin_id: admin.id
      });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        setSuccessMessage(result.message);
        setShowSuccessModal(true);
        fetchConfiguracionActual();
        onUpdate();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error saving configuracion:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
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

  const hasChanges = configuracionActual && (
    configuracionActual.porcentaje_partners !== formData.porcentaje_partners ||
    configuracionActual.porcentaje_inversores !== formData.porcentaje_inversores
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
      {/* Configuración Actual */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-3" />
          Configuración de Distribución de Ganancias
        </h3>

        {configuracionActual && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <h4 className="text-blue-200 font-semibold mb-3">Configuración Actual</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-white/80 text-sm">Partners</p>
                <p className="text-xl font-bold text-purple-300">{configuracionActual.porcentaje_partners}%</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-white/80 text-sm">Inversores</p>
                <p className="text-xl font-bold text-green-300">{configuracionActual.porcentaje_inversores}%</p>
              </div>
            </div>
            <p className="text-blue-200 text-sm mt-3">
              Última actualización: {formatDate(configuracionActual.fecha_creacion)}
            </p>
          </div>
        )}

        {/* Formulario de Nueva Configuración */}
        <div className="space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-yellow-300 mb-2">
              <Info className="w-5 h-5" />
              <h4 className="font-semibold">Cómo Funciona la Distribución</h4>
            </div>
            <div className="text-yellow-200 text-sm space-y-2">
              <p><strong>Parte para Inversores ({formData.porcentaje_inversores}%):</strong> Se distribuye proporcionalmente entre TODOS (inversores y partners) según su inversión individual.</p>
              <p><strong>Parte Exclusiva para Partners ({formData.porcentaje_partners}%):</strong> Se divide equitativamente entre todos los partners activos como ganancia adicional.</p>
              <p><strong>Total para Partners:</strong> Ganancia proporcional + Ganancia adicional exclusiva</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Porcentaje Partners */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Porcentaje para Partners (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.porcentaje_partners}
                  onChange={(e) => handlePercentageChange('porcentaje_partners', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-center text-lg"
                />
              </div>
              <p className="text-white/60 text-xs mt-2 text-center">
                Parte exclusiva que se divide entre partners
              </p>
            </div>

            {/* Porcentaje Inversores */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Porcentaje Proporcional (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-3 w-5 h-5 text-white/80" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.porcentaje_inversores}
                  onChange={(e) => handlePercentageChange('porcentaje_inversores', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-center text-lg"
                />
              </div>
              <p className="text-white/60 text-xs mt-2 text-center">
                Se distribuye proporcionalmente entre todos
              </p>
            </div>
          </div>

          {/* Validación */}
          <div className="text-center">
            {formData.porcentaje_partners + formData.porcentaje_inversores === 100 ? (
              <div className="flex items-center justify-center space-x-2 text-green-300">
                <CheckCircle className="w-5 h-5" />
                <span>Los porcentajes suman correctamente 100%</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-red-300">
                <AlertTriangle className="w-5 h-5" />
                <span>Los porcentajes deben sumar exactamente 100% (actual: {formData.porcentaje_partners + formData.porcentaje_inversores}%)</span>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Descripción del Cambio (Opcional)
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              className="w-full p-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none h-20"
              placeholder="Describe el motivo del cambio..."
            />
          </div>

          {/* Botones */}
          <div className="flex space-x-4">
            <button
              onClick={handleSave}
              disabled={saving || formData.porcentaje_partners + formData.porcentaje_inversores !== 100 || !hasChanges}
              className="flex-1 bg-green-500/20 text-green-300 py-3 px-6 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 border border-green-400/50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={saving || !hasChanges}
              className="flex-1 bg-gray-500/20 text-gray-300 py-3 px-6 rounded-lg hover:bg-gray-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 border border-gray-400/50"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Restablecer</span>
            </button>
          </div>

          {!hasChanges && configuracionActual && (
            <div className="text-center">
              <p className="text-white/60 text-sm">No hay cambios pendientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de éxito */}
      <SuccessModal
        show={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
};

export default ConfiguracionGanancias;