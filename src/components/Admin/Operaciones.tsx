import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../config/supabase';
import AdminHeader from './AdminHeader';
import InversoresList from './InversoresList';
import AprobacionesList from './AprobacionesList';
import PartnerAprobacionesList from './PartnerAprobacionesList';
import AvisosList from './AvisosList';
import ModeradoresList from './ModeradoresList';
import AdministracionPanel from './AdministracionPanel';
import { Users, CheckCircle, MessageSquare, UserPlus, Settings, UsersIcon } from 'lucide-react';

const Operaciones: React.FC = () => {
  const { admin } = useAdmin();
  const [activeTab, setActiveTab] = useState('inversores');
  const [stats, setStats] = useState({
    totalInversores: 0,
    solicitudesPendientes: 0,
    solicitudesPartnersPendientes: 0,
    avisosActivos: 0,
    moderadores: 0
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

      // Moderadores
      const { count: moderadoresCount } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'moderador')
        .eq('is_active', true);

      setStats({
        totalInversores: inversoresCount || 0,
        solicitudesPendientes: solicitudesCount || 0,
        solicitudesPartnersPendientes: solicitudesPartnersCount || 0,
        avisosActivos: avisosCount || 0,
        moderadores: moderadoresCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const tabs = [
    { id: 'inversores', label: 'Inversores', icon: Users, count: stats.totalInversores },
    { id: 'aprobaciones', label: 'Aprobaciones', icon: CheckCircle, count: stats.solicitudesPendientes },
    { id: 'aprobaciones-socios', label: 'Aprobaciones Socios', icon: UsersIcon, count: stats.solicitudesPartnersPendientes },
    { id: 'avisos', label: 'Avisos', icon: MessageSquare, count: stats.avisosActivos },
    ...(admin?.role === 'admin' ? [
      { id: 'moderadores', label: 'Moderadores', icon: UserPlus, count: stats.moderadores },
      { id: 'administracion', label: 'Administración', icon: Settings, count: 0 }
    ] : [])
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
          {activeTab === 'inversores' && <InversoresList onStatsUpdate={fetchStats} />}
          {activeTab === 'aprobaciones' && <AprobacionesList onStatsUpdate={fetchStats} />}
          {activeTab === 'aprobaciones-socios' && <PartnerAprobacionesList onStatsUpdate={fetchStats} />}
          {activeTab === 'avisos' && <AvisosList onStatsUpdate={fetchStats} />}
          {activeTab === 'moderadores' && admin?.role === 'admin' && <ModeradoresList onStatsUpdate={fetchStats} />}
          {activeTab === 'administracion' && admin?.role === 'admin' && <AdministracionPanel onStatsUpdate={fetchStats} />}
        </div>
      </main>
    </div>
  );
};

export default Operaciones;