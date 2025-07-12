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

interface NotificationBellProps {
  userId?: string;
  userType: 'inversor' | 'partner';
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId, userType }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Configurar polling para nuevas notificaciones cada 10 segundos
      const interval = setInterval(fetchNotifications, 10000);
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
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Marcar todas como leídas
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No tienes notificaciones</p>
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
                      <div className={`border-l-4 ${style.borderColor} ${style.bgColor} p-3 rounded-r-lg`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
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
                              <p className="text-sm text-gray-600 mb-2">
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
    </div>
  );
};

export default NotificationBell;