import React, { useEffect, useState } from 'react';
import { useModulo } from '../../contexts/ModuloContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePartner } from '../../contexts/PartnerContext';
import { Package, ChevronDown, Check, Home, ChevronLeft, ChevronRight } from 'lucide-react';

interface ModuloSelectorProps {
  showMainDashboard?: boolean;
  onMainDashboardSelect?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ModuloSelector: React.FC<ModuloSelectorProps> = ({ 
  showMainDashboard = false, 
  onMainDashboardSelect,
  collapsed = false,
  onToggleCollapse
}) => {
  const { modulos, moduloActual, setModuloActual, verificarAcceso } = useModulo();
  const { user } = useAuth();
  const { partner } = usePartner();
  const [showDropdown, setShowDropdown] = useState(false);
  const [modulosAccesibles, setModulosAccesibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((user || partner) && modulos.length > 0) {
      verificarAccesoModulos();
    }
  }, [user, partner, modulos]);

  const verificarAccesoModulos = async () => {
    if (!user && !partner) return;
    
    setLoading(true);
    try {
      const accesos = await Promise.all(
        modulos.map(async (modulo) => {
          const tieneAcceso = await verificarAcceso(
            modulo.id,
            user?.id || partner?.id || '',
            user ? 'inversor' : 'partner'
          );
          return tieneAcceso ? modulo.id : null;
        })
      );
      
      const modulosConAcceso = accesos.filter(Boolean) as string[];
      setModulosAccesibles(modulosConAcceso);
      
      // Si no hay módulo actual seleccionado y hay módulos accesibles, seleccionar el primero
      if (!moduloActual && modulosConAcceso.length > 0) {
        const primerModulo = modulos.find(m => modulosConAcceso.includes(m.id));
        if (primerModulo) {
          setModuloActual(primerModulo);
        }
      }
    } catch (error) {
      console.error('Error verificando acceso a módulos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectModulo = (modulo: any) => {
    setModuloActual(modulo);
    setShowDropdown(false);
  };

  const handleMainDashboard = () => {
    setModuloActual(null);
    setShowDropdown(false);
    if (onMainDashboardSelect) {
      onMainDashboardSelect();
    }
  };

  // No mostrar el selector si no hay módulos accesibles y no se permite dashboard principal
  if (loading || (modulosAccesibles.length === 0 && !showMainDashboard)) {
    return null;
  }

  const modulosDisponibles = modulos.filter(m => modulosAccesibles.includes(m.id));

  // Versión colapsada (estilo sidebar)
  if (collapsed !== undefined) {
    return (
      <div className={`${collapsed ? 'w-16' : 'w-80'} transition-all duration-300 bg-black/30 backdrop-blur-lg border-r border-white/20 min-h-screen relative`}>
        {/* Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="absolute -right-3 top-6 bg-black/40 backdrop-blur-lg rounded-full p-1.5 text-white hover:bg-black/50 transition-colors border border-white/30 z-10"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        {/* Header */}
        <div className="p-6 border-b border-white/20">
          {!collapsed ? (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Navegación de Módulos</h2>
              <p className="text-white/70 text-sm">Selecciona un módulo o dashboard</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {/* Dashboard Principal */}
          {showMainDashboard && (
            <button
              onClick={handleMainDashboard}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                !moduloActual
                  ? 'bg-white/25 text-white shadow-lg border border-white/40'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}
              title={collapsed ? 'Resumen General' : ''}
            >
              <div className="flex items-center space-x-3">
                <Home className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">Resumen General</div>
                    <div className="text-xs text-white/60">Vista consolidada de módulos</div>
                  </div>
                )}
              </div>

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  Resumen General
                </div>
              )}
            </button>
          )}

          {/* Módulos */}
          {modulosDisponibles.map((modulo) => (
            <button
              key={modulo.id}
              onClick={() => handleSelectModulo(modulo)}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                moduloActual?.id === modulo.id
                  ? 'bg-white/25 text-white shadow-lg border border-white/40'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}
              title={collapsed ? modulo.nombre : ''}
            >
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{modulo.nombre}</div>
                    {modulo.descripcion && (
                      <div className="text-xs text-white/60">{modulo.descripcion}</div>
                    )}
                  </div>
                )}
              </div>
              
              {moduloActual?.id === modulo.id && (
                <Check className={`w-4 h-4 text-white ${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}`} />
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  {modulo.nombre}
                  {modulo.descripcion && (
                    <div className="text-xs text-gray-300">{modulo.descripcion}</div>
                  )}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20">
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-white/80 text-xs">
                <div className="font-medium mb-1">Módulos Disponibles</div>
                <div>{modulosDisponibles.length} módulo(s) asignado(s)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Versión dropdown (original mejorada)
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors border border-white/30"
      >
        {!moduloActual ? <Home className="w-5 h-5" /> : <Package className="w-5 h-5" />}
        <span className="font-medium">
          {!moduloActual ? 'Resumen General' : moduloActual.nombre}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-3 py-2 font-medium uppercase tracking-wide">
              Navegación
            </div>
            
            {/* Dashboard Principal */}
            {showMainDashboard && (
              <button
                onClick={handleMainDashboard}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Home className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Resumen General</div>
                    <div className="text-sm text-gray-500">Vista consolidada</div>
                  </div>
                </div>
                {!moduloActual && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            )}

            {modulosDisponibles.length > 0 && (
              <>
                <div className="text-xs text-gray-500 px-3 py-2 font-medium uppercase tracking-wide border-t border-gray-100 mt-2">
                  Módulos Disponibles
                </div>
                {modulosDisponibles.map((modulo) => (
                  <button
                    key={modulo.id}
                    onClick={() => handleSelectModulo(modulo)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Package className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="font-medium text-gray-900">{modulo.nombre}</div>
                        {modulo.descripcion && (
                          <div className="text-sm text-gray-500">{modulo.descripcion}</div>
                        )}
                      </div>
                    </div>
                    {moduloActual?.id === modulo.id && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuloSelector;