import React from 'react';
import { LogOut, Shield, User, Settings, Power, PowerOff } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { useMaintenance } from '../../hooks/useMaintenance';
import { useNavigate } from 'react-router-dom';

const AdminHeader: React.FC = () => {
  const { admin, logout } = useAdmin();
  const { activo: maintenanceActive, updateMaintenanceStatus, loading: maintenanceLoading } = useMaintenance();
  const navigate = useNavigate();
  
  const currentDate = new Date().toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  });

  const handleLogout = () => {
    logout();
  };

  const handleToggleMaintenance = async () => {
    if (maintenanceLoading) return;
    
    const newStatus = !maintenanceActive;
    const defaultMessage = 'El sistema está en mantenimiento. Estaremos de vuelta pronto.';
    
    try {
      await updateMaintenanceStatus(newStatus, defaultMessage, admin?.id);
    } catch (error) {
      console.error('Error toggling maintenance:', error);
    }
  };
  return (
    <header className="bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Panel de Administración</h1>
              <p className="text-sm text-cyan-100">CVM Capital - Sistema de Operaciones</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-cyan-100">{currentDate}</p>
              {admin && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{admin.nombre}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    admin.role === 'admin' 
                      ? 'bg-yellow-400 text-yellow-900' 
                      : 'bg-green-400 text-green-900'
                  }`}>
                    {admin.role === 'admin' ? 'ADMIN' : 'MODERADOR'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Botón de Mantenimiento */}
            {admin?.role === 'admin' && (
              <button
                onClick={handleToggleMaintenance}
                disabled={maintenanceLoading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-semibold border-2 ${
                  maintenanceActive
                    ? 'bg-red-500/20 text-red-200 border-red-400/50 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-200 border-green-400/50 hover:bg-green-500/30'
                } ${maintenanceLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={maintenanceActive ? 'Desactivar mantenimiento' : 'Activar mantenimiento'}
              >
                {maintenanceLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : maintenanceActive ? (
                  <PowerOff className="w-4 h-4" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                <span className="text-sm hidden sm:inline">
                  {maintenanceActive ? 'Desactivar' : 'Activar'}
                </span>
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors duration-200 font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
