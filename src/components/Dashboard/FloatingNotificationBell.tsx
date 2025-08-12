import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface Notification {
  id: string;
  titulo: string;
  mensaje: string;
  tipo_notificacion: string;
  leida: boolean;
  fecha_creacion: string;
}

interface FloatingNotificationBellProps {
  userId?: string;
  userType: 'inversor' | 'partner';
  showPanel?: boolean;
  setShowPanel?: (show: boolean) => void;
  setShowOtherPanels?: () => void;
}

const FloatingNotificationBell: React.FC<FloatingNotificationBellProps> = ({ 
  userId, 
  userType, 
  showPanel: externalShowPanel, 
  setShowPanel: externalSetShowPanel,
  setShowOtherPanels 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [internalShowPanel, setInternalShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Usar estado externo si está disponible, sino usar estado interno
  const showPanel = externalShowPanel !== undefined ? externalShowPanel : internalShowPanel;
  const setShowPanel = externalSetShowPanel || setInternalShowPanel;

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Configurar polling para nuevas notificaciones cada 3 segundos
      const interval = setInterval(fetchNotifications, 3000);
      return () => clearInterval(interval);
    }
  }, [userId, userType]);

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .order('fecha_creacion', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.leida).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // En caso de error, mostrar array vacío en lugar de fallar
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ 
          leida: true, 
          fecha_leida: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ 
          leida: true, 
          fecha_leida: new Date().toISOString() 
        })
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .eq('leida', false);

      if (error) {
        throw error;
      }

      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getNotificationStyle = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return {
          borderColor: 'border-l-green-400',
          bgColor: 'bg-green-50',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />
        };
      case 'warning':
        return {
          borderColor: 'border-l-yellow-400',
          bgColor: 'bg-yellow-50',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />
        };
      case 'error':
        return {
          borderColor: 'border-l-red-400',
          bgColor: 'bg-red-50',
          icon: <XCircle className="w-5 h-5 text-red-500" />
        };
      default:
        return {
          borderColor: 'border-l-blue-400',
          bgColor: 'bg-blue-50',
          icon: <Info className="w-5 h-5 text-blue-500" />
        };
    }
  };

  return (
    <>
      {/* Botón de Notificaciones Flotante */}
      <button
        onClick={() => {
          setShowPanel(!showPanel);
          if (setShowOtherPanels) {
            setShowOtherPanels();
          }
        }}
        className="fixed bottom-50 sm:bottom-50 right-4 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 animate-pulse"
        title="Notificaciones"
      >
        <Bell className="w-6 h-6 sm:w-8 sm:h-8" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de Notificaciones */}
      {showPanel && (
        <div className="fixed bottom-16 sm:bottom-28 right-2 sm:right-24 w-[calc(100vw-1rem)] sm:w-96 max-w-sm sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-in slide-in-from-bottom-4 duration-300 max-h-[60vh] sm:max-h-[50vh] overflow-hidden flex flex-col">
          {/* Header del Panel */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-700 text-white p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Notificaciones</h3>
                  <p className="text-xs text-orange-100 hidden sm:block">
                    {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-orange-100 hover:text-white transition-colors px-2 py-1 rounded bg-white/20 hover:bg-white/30 hidden sm:block"
                  >
                    Marcar todas
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-orange-100 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Contenido del Panel */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm sm:text-base">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const style = getNotificationStyle(notification.tipo_notificacion);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.leida ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className={`border-l-4 ${style.borderColor} ${style.bgColor} p-2 sm:p-3 rounded-r-lg`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2 flex-1">
                            {style.icon}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className={`text-sm font-medium ${
                                  !notification.leida ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {notification.titulo}
                                </h4>
                                {!notification.leida && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                                {notification.mensaje}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatDate(notification.fecha_creacion)}
                              </p>
                            </div>
                          </div>
                          
                          {!notification.leida && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="ml-2 p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Marcar como leída"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingNotificationBell;