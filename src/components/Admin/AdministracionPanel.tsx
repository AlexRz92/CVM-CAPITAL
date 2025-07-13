import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import PartnersManager from './PartnersManager';
import GananciasProcessor from './GananciasProcessorV2';
import ConfiguracionGanancias from './ConfiguracionGanancias';
import CalendarMonthsManager from './CalendarMonthsManager';
import InversoresList from './InversoresList';
import { DollarSign, Users, TrendingUp, Calendar, Settings, Percent } from 'lucide-react';

interface AdministracionPanelProps {
  onStatsUpdate: () => void;
}

const AdministracionPanel: React.FC<AdministracionPanelProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [activeSection, setActiveSection] = useState('meses');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [activeSection]);

  const sections = [
    { id: 'meses', label: 'Gestión de Períodos Mensuales', icon: Calendar },
    { id: 'inversores', label: 'Gestión de Inversores', icon: Users },
    { id: 'partners', label: 'Gestión de Partners', icon: Users },
    { id: 'configuracion-ganancias', label: 'Configuración de Ganancias', icon: Percent },
    { id: 'ganancias', label: 'Procesar Ganancias', icon: TrendingUp }
  ];

  // Función para manejar actualizaciones de componentes hijos
  const handleChildUpdate = () => {
    if (onStatsUpdate && typeof onStatsUpdate === 'function') {
      onStatsUpdate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Navegación de secciones */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Settings className="w-6 h-6 mr-3" />
            Panel de Administración
          </h3>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-center">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeSection === section.id
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <section.icon className="w-5 h-5" />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de las secciones */}
      {activeSection === 'meses' && (
        <CalendarMonthsManager onUpdate={handleChildUpdate} />
      )}

      {activeSection === 'inversores' && (
        <InversoresList onStatsUpdate={handleChildUpdate} />
      )}

      {activeSection === 'partners' && (
        <PartnersManager onUpdate={handleChildUpdate} />
      )}

      {activeSection === 'configuracion-ganancias' && (
        <ConfiguracionGanancias onUpdate={handleChildUpdate} />
      )}

      {activeSection === 'ganancias' && (
        <GananciasProcessor 
          totalInversion={0}
          onUpdate={handleChildUpdate} 
        />
      )}
    </div>
  );
};

export default AdministracionPanel;