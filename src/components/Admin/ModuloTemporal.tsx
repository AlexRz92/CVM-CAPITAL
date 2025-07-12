import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { Settings, Save, ToggleLeft, ToggleRight, Edit, CheckCircle, AlertTriangle } from 'lucide-react';

interface ModuloTemporalConfig {
  id: string;
  activo: boolean;
  titulo_temporal: string;
  descripcion: string;
  fecha_creacion: string;
  updated_by: string;
}

interface ModuloTemporalProps {
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

const ModuloTemporal: React.FC<ModuloTemporalProps> = ({ onUpdate }) => {
  const { admin } = useAdmin();
  const [config, setConfig] = useState<ModuloTemporalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    activo: false,
    titulo_temporal: 'Reporte Temporal',
    descripcion: ''
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('modulo_temporal_config')
        .select('*')
        .order('fecha_creacion', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
        setFormData({
          activo: data.activo,
          titulo_temporal: data.titulo_temporal,
          descripcion: ''
        });
      }
    } catch (error) {
      console.error('Error fetching modulo temporal config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!admin) return;

    if (!formData.titulo_temporal.trim()) {
      alert('El título temporal es requerido');
      return;
    }

    setSaving(true);
    try {
      const configData = {
        activo: formData.activo,
        titulo_temporal: formData.titulo_temporal.trim(),
        descripcion: formData.descripcion.trim() || 'Configuración actualizada desde panel de administración',
        updated_by: admin.id,
        fecha_creacion: new Date().toISOString()
      };

      if (config) {
        // Actualizar configuración existente
        const { error } = await supabase
          .from('modulo_temporal_config')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Crear nueva configuración
        const { error } = await supabase
          .from('modulo_temporal_config')
          .insert(configData);

        if (error) throw error;
      }

      setSuccessMessage('Configuración del módulo temporal guardada exitosamente');
      setShowSuccessModal(true);
      fetchConfig();
      onUpdate();
    } catch (error) {
      console.error('Error saving modulo temporal config:', error);
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
      {/* Configuración del Módulo Temporal */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-3" />
          Administración del Módulo Temporal
        </h3>

        {/* Estado Actual */}
        {config && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <h4 className="text-blue-200 font-semibold mb-3">Estado Actual</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-white/80 text-sm">Estado</p>
                <div className="flex items-center space-x-2">
                  {config.activo ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-green-400" />
                      <span className="text-green-300 font-semibold">ACTIVO</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-red-400" />
                      <span className="text-red-300 font-semibold">INACTIVO</span>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-white/80 text-sm">Título Temporal</p>
                <p className="text-white font-semibold">{config.titulo_temporal}</p>
              </div>
            </div>
            <p className="text-blue-200 text-sm mt-3">
              Última actualización: {formatDate(config.fecha_creacion)}
            </p>
          </div>
        )}

        {/* Formulario de Configuración */}
        <div className="space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-yellow-300 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-semibold">Información del Módulo Temporal</h4>
            </div>
            <div className="text-yellow-200 text-sm space-y-2">
              <p><strong>Cuando está ACTIVO:</strong> Los inversores verán dos títulos en su dashboard: "Reporte C.V.M" y el título personalizado.</p>
              <p><strong>Cuando está INACTIVO:</strong> Los inversores solo verán "Reporte de Ganancias" como título principal.</p>
              <p><strong>Dashboard Temporal:</strong> Incluye solicitud de depósito, saldo actual, gráficos y transacciones independientes.</p>
            </div>
          </div>

          {/* Toggle de Activación */}
          <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg border border-white/20">
            <div>
              <h4 className="text-white font-semibold">Activar Módulo Temporal</h4>
              <p className="text-white/70 text-sm">Habilita el dashboard temporal para todos los inversores</p>
            </div>
            <button
              onClick={() => setFormData({...formData, activo: !formData.activo})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.activo ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.activo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Título Temporal */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Título del Dashboard Temporal
            </label>
            <div className="relative">
              <Edit className="absolute left-3 top-3 w-5 h-5 text-white/80" />
              <input
                type="text"
                value={formData.titulo_temporal}
                onChange={(e) => setFormData({...formData, titulo_temporal: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/50 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Ej: Reporte Temporal"
                maxLength={50}
              />
            </div>
            <p className="text-white/60 text-xs mt-2">
              Este será el título que aparecerá junto a "Reporte C.V.M" cuando el módulo esté activo
            </p>
          </div>

          {/* Descripción del Cambio */}
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

          {/* Vista Previa */}
          <div className="bg-white/5 border border-white/20 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3">Vista Previa del Dashboard</h4>
            <div className="bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 rounded-lg p-4">
              <div className="text-center mb-4">
                {formData.activo ? (
                  <div className="flex justify-center space-x-4">
                    <button className="text-white font-bold text-lg border-b-2 border-white pb-1">
                      Reporte C.V.M
                    </button>
                    <button className="text-white/70 font-bold text-lg hover:text-white transition-colors">
                      {formData.titulo_temporal || 'Reporte Temporal'}
                    </button>
                  </div>
                ) : (
                  <h2 className="text-white font-bold text-2xl">
                    REPORTE DE GANANCIAS
                  </h2>
                )}
              </div>
              <p className="text-white/80 text-sm text-center">
                {formData.activo 
                  ? 'Los inversores podrán cambiar entre dashboards haciendo clic en los títulos'
                  : 'Dashboard único como está actualmente'
                }
              </p>
            </div>
          </div>

          {/* Botón de Guardar */}
          <div className="flex justify-center">
            <button
              onClick={handleSave}
              disabled={saving || !formData.titulo_temporal.trim()}
              className="bg-green-500/20 text-green-300 py-3 px-8 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 border border-green-400/50 font-semibold"
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
          </div>
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

export default ModuloTemporal;