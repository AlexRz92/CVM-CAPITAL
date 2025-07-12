import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../config/supabase';
import AdminHeader from './AdminHeader';
import InversoresList from './InversoresList';
import AprobacionesList from './AprobacionesList';
import PartnerAprobacionesList from './PartnerAprobacionesList';
import AvisosList from './AvisosList';
import TicketsList from './TicketsList';
import AdministracionPanel from './AdministracionPanel';
import ImportExportManager from './ImportExportManager';
import TemporalAprobacionesList from './TemporalAprobacionesList';
import TemporalResumenGeneral from './TemporalResumenGeneral';
import CalendarMonthsManager from './CalendarMonthsManager';
import TemporalGananciasProcessor from './TemporalGananciasProcessor';
import { Users, CheckCircle, MessageSquare, Settings, UsersIcon, HelpCircle, DollarSign, Upload, TrendingUp } from 'lucide-react';

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
          <h3 className="text-xl font-bold text-gray-900 mb-4">Información</h3>
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

const Operaciones: React.FC = () => {
  const { admin } = useAdmin();
  const [activeTab, setActiveTab] = useState('resumen');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [stats, setStats] = useState({
    totalInversores: 0,
    solicitudesPendientes: 0,
    solicitudesPartnersPendientes: 0,
    avisosActivos: 0,
    ticketsPendientes: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total inversores
      const { count: inversoresCount } = await supabase
        .from('inversores')
        .select('*', { count: 'exact', head: true });

      // Solicitudes pendientes de inversores
      const { count: solicitudesCount } = await supabase
        .from('solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      // Solicitudes pendientes de partners
      const { count: solicitudesPartnersCount } = await supabase
        .from('partner_solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      // Avisos activos
      const { count: avisosCount } = await supabase
        .from('avisos')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      // Tickets pendientes
      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'abierto');

      setStats({
        totalInversores: inversoresCount || 0,
        solicitudesPendientes: solicitudesCount || 0,
        solicitudesPartnersPendientes: solicitudesPartnersCount || 0,
        avisosActivos: avisosCount || 0,
        ticketsPendientes: ticketsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showSuccessMessage = (message: string) => {
    setModalMessage(message);
    setShowModal(true);
  };

  const tabs = [
    { id: 'resumen', label: 'Resumen General', icon: DollarSign, count: 0 },
    { id: 'aprobaciones', label: 'Aprobaciones de Inversores', icon: CheckCircle, count: stats.solicitudesPendientes },
    { id: 'aprobaciones-socios', label: 'Aprobaciones Socios', icon: UsersIcon, count: stats.solicitudesPartnersPendientes },
    { id: 'tickets', label: 'Tickets de Soporte', icon: HelpCircle, count: stats.ticketsPendientes },
    { id: 'avisos', label: 'Avisos', icon: MessageSquare, count: stats.avisosActivos },
    { id: 'administracion', label: 'Administración', icon: Settings, count: 0 },
    { id: 'importexport', label: 'Importar/Exportar', icon: Upload, count: 0 },
    { id: 'modulo-temporal', label: 'Módulo Temporal', icon: Settings, count: 0 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800">
      <AdminHeader />
      
      <main className="container mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2 tracking-wide uppercase">
            Panel de Operaciones
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-200 to-white mx-auto rounded-full"></div>
        </div>

        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30 mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-white/30 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {activeTab === 'resumen' && <ResumenGeneral onStatsUpdate={fetchStats} />}
          {activeTab === 'aprobaciones' && <AprobacionesList onStatsUpdate={fetchStats} />}
          {activeTab === 'aprobaciones-socios' && <PartnerAprobacionesList onStatsUpdate={fetchStats} />}
          {activeTab === 'tickets' && <TicketsList onStatsUpdate={fetchStats} />}
          {activeTab === 'avisos' && <AvisosList onStatsUpdate={fetchStats} />}
          {activeTab === 'administracion' && <AdministracionPanel onStatsUpdate={fetchStats} />}
          {activeTab === 'importexport' && <ImportExportManager onUpdate={fetchStats} />}
          {activeTab === 'modulo-temporal' && <ModuloTemporalPanel onStatsUpdate={fetchStats} />}
        </div>
      </main>

      <SuccessModal
        show={showModal}
        message={modalMessage}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

// Componente separado para Resumen General - CORREGIDO
const ResumenGeneral: React.FC<{ onStatsUpdate: () => void }> = ({ onStatsUpdate }) => {
  const [estadisticas, setEstadisticas] = useState({
    total_inversores: 0,
    total_partners: 0,
    total_inversion: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const fetchEstadisticas = async () => {
    try {
      console.log('Fetching estadísticas del sistema...');
      
      // Obtener estadísticas directamente desde las tablas
      const [inversoresResult, partnersResult] = await Promise.all([
        // Total inversores
        supabase.from('inversores').select('id', { count: 'exact', head: true }),
        
        // Total partners activos  
        supabase.from('partners').select('id', { count: 'exact', head: true }).eq('activo', true)
      ]);

      // Calcular total de inversión desde transacciones
      const { data: transaccionesData, error: transaccionesError } = await supabase
        .from('transacciones')
        .select('monto, tipo, usuario_tipo');

      if (transaccionesError) {
        console.error('Error fetching transactions:', transaccionesError);
        throw transaccionesError;
      }

      // Calcular total de inversión actual
      let totalInversion = 0;
      
      transaccionesData?.forEach(transaccion => {
        switch (transaccion.tipo.toLowerCase()) {
          case 'deposito':
            totalInversion += Number(transaccion.monto);
            break;
          case 'retiro':
            totalInversion -= Number(transaccion.monto);
            break;
          case 'ganancia':
            totalInversion += Number(transaccion.monto);
            break;
        }
      });

      const stats = {
        total_inversores: inversoresResult.count || 0,
        total_partners: partnersResult.count || 0,
        total_inversion: Math.max(0, totalInversion) // Asegurar que no sea negativo
      };

      console.log('Estadísticas calculadas:', stats);
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setEstadisticas({
        total_inversores: 0,
        total_partners: 0,
        total_inversion: 0
      });
    } finally {
      setLoading(false);
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
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <DollarSign className="w-6 h-6 mr-3" />
          Resumen General del Sistema
        </h3>
        <button
          onClick={fetchEstadisticas}
          className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
        >
          Actualizar
        </button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <h4 className="text-white font-semibold mb-2">Total en Inversión</h4>
            <p className="text-2xl font-bold text-green-300">{formatCurrency(estadisticas.total_inversion)}</p>
            <p className="text-white/70 text-sm mt-2">
              Inversores + Partners activos
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h4 className="text-white font-semibold mb-2">Partners Activos</h4>
            <p className="text-2xl font-bold text-blue-300">{estadisticas.total_partners}</p>
            <p className="text-white/70 text-sm mt-2">
              Partners registrados y activos
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h4 className="text-white font-semibold mb-2">Total Inversores</h4>
            <p className="text-2xl font-bold text-purple-300">{estadisticas.total_inversores}</p>
            <p className="text-white/70 text-sm mt-2">
              Inversores registrados
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

// Componente separado para el panel del módulo temporal
const ModuloTemporalPanel: React.FC<{ onStatsUpdate: () => void }> = ({ onStatsUpdate }) => {
  const [activeSection, setActiveSection] = useState('resumen');

  const sections = [
    { id: 'resumen', label: 'Resumen General', icon: DollarSign },
    { id: 'aprobaciones', label: 'Aprobaciones Temporales', icon: CheckCircle },
    { id: 'periodos', label: 'Gestión de Períodos Mensuales', icon: Settings },
    { id: 'ganancias', label: 'Procesar Ganancias', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Navegación de secciones */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Settings className="w-6 h-6 mr-3" />
            Panel del Módulo Temporal
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
      {activeSection === 'resumen' && (
        <TemporalResumenGeneral onStatsUpdate={onStatsUpdate} />
      )}

      {activeSection === 'aprobaciones' && (
        <TemporalAprobacionesList onStatsUpdate={onStatsUpdate} />
      )}

      {activeSection === 'periodos' && (
        <CalendarMonthsManager onUpdate={onStatsUpdate} />
      )}

      {activeSection === 'ganancias' && (
        <TemporalGananciasProcessor onUpdate={onStatsUpdate} />
      )}
    </div>
  );
};

export default Operaciones;