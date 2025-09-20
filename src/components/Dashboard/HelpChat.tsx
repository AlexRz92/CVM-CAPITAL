import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Send, MessageCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface HelpChatProps {
  userId?: string;
  userType: 'inversor' | 'partner';
  showChat?: boolean;
  setShowChat?: (show: boolean) => void;
  setShowOtherPanels?: () => void;
}

interface Ticket {
  id: string;
  titulo: string;
  mensaje: string;
  estado: string;
  respuesta?: string;
  fecha_creacion: string;
  fecha_respuesta?: string;
  admin_nombre?: string;
  es_aviso?: boolean;
  conversacion?: ConversacionMensaje[];
  fecha_cierre?: string;
}

interface ConversacionMensaje {
  id: string;
  mensaje: string;
  enviado_por: string;
  tipo_usuario: 'admin' | 'inversor' | 'partner';
  fecha: string;
  nombre_usuario: string;
}

interface SuccessModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

interface ErrorModalProps {
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
          <h3 className="text-xl font-bold text-gray-900 mb-4">¡Ticket Creado!</h3>
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

const ErrorModal: React.FC<ErrorModalProps> = ({ show, message, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Error</h3>
          <p className="text-gray-600 mb-6">{message}</p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};

const HelpChat: React.FC<HelpChatProps> = ({ 
  userId, 
  userType, 
  showChat: externalShowChat, 
  setShowChat: externalSetShowChat,
  setShowOtherPanels 
}) => {
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [ticketHistory, setTicketHistory] = useState<Ticket[]>([]);
  const [hasTicket, setHasTicket] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [internalShowChat, setInternalShowChat] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    mensaje: ''
  });

  const showChat = externalShowChat !== undefined ? externalShowChat : internalShowChat;
  const setShowChat = externalSetShowChat || setInternalShowChat;

  useEffect(() => {
    if (userId && showChat) {
      fetchCurrentTicket();
      fetchTicketHistory();
    }
  }, [userId, showChat]);

  useEffect(() => {
    if (userId) {
      // Configurar polling para verificar nuevos mensajes
      const interval = setInterval(checkForNewMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [userId, userType]);

  const checkForNewMessages = async () => {
    if (!userId) return;

    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('conversacion, fecha_respuesta')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .in('estado', ['abierto', 'respondido'])
        .order('fecha_creacion', { ascending: false })
        .limit(1);

      if (error || !tickets || tickets.length === 0) return;

      const ticket = tickets[0];
      if (ticket.conversacion) {
        try {
          const conversacion = JSON.parse(ticket.conversacion);
          const lastMessage = conversacion[conversacion.length - 1];
          
          // Verificar si el último mensaje es del admin y es reciente
          if (lastMessage && lastMessage.tipo_usuario === 'admin') {
            const messageTime = new Date(lastMessage.fecha).getTime();
            const now = new Date().getTime();
            const diffInMinutes = (now - messageTime) / (1000 * 60);
            
            // Si el mensaje es de los últimos 5 minutos, marcar como no leído
            if (diffInMinutes < 5) {
              setHasUnreadMessages(true);
            }
          }
        } catch (error) {
          console.error('Error parsing conversacion:', error);
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  };

  const fetchCurrentTicket = async () => {
    if (!userId) return;

    try {
      console.log('Buscando tickets para usuario:', userId, 'tipo:', userType);
      
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .in('estado', ['abierto', 'respondido'])
        .order('fecha_creacion', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching tickets:', error);
        return;
      }

      console.log('Tickets encontrados:', tickets);

      if (tickets && tickets.length > 0) {
        const ticket = tickets[0];
        
        let adminNombre = null;
        if (ticket.respondido_por) {
          const { data: adminData } = await supabase
            .from('admins')
            .select('nombre')
            .eq('id', ticket.respondido_por)
            .single();
          
          adminNombre = adminData?.nombre;
        }

        let conversacion: ConversacionMensaje[] = [];
        if (ticket.conversacion) {
          try {
            conversacion = JSON.parse(ticket.conversacion);
          } catch (error) {
            console.error('Error parsing conversacion:', error);
          }
        }

        setCurrentTicket({
          id: ticket.id,
          titulo: ticket.titulo,
          mensaje: ticket.mensaje,
          estado: ticket.estado,
          respuesta: ticket.respuesta,
          fecha_creacion: ticket.fecha_creacion,
          fecha_respuesta: ticket.fecha_respuesta,
          fecha_cierre: ticket.fecha_cierre,
          admin_nombre: adminNombre,
          es_aviso: ticket.es_aviso,
          conversacion
        });
        setHasTicket(true);
        setHasUnreadMessages(false); // Resetear cuando se abre el chat
      } else {
        setCurrentTicket(null);
        setHasTicket(false);
      }
    } catch (error) {
      console.error('Error fetching current ticket:', error);
      setCurrentTicket(null);
      setHasTicket(false);
    }
  };

  const fetchTicketHistory = async () => {
    if (!userId) return;

    setLoadingHistory(true);
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .eq('estado', 'cerrado')
        .order('fecha_cierre', { ascending: false })
        .limit(10);

      if (error) throw error;

      const ticketsWithAdminNames = await Promise.all(
        (tickets || []).map(async (ticket) => {
          let adminNombre = null;
          if (ticket.respondido_por) {
            const { data: adminData } = await supabase
              .from('admins')
              .select('nombre')
              .eq('id', ticket.respondido_por)
              .single();
            
            adminNombre = adminData?.nombre;
          }

          let conversacion: ConversacionMensaje[] = [];
          if (ticket.conversacion) {
            try {
              conversacion = JSON.parse(ticket.conversacion);
            } catch (error) {
              console.error('Error parsing conversacion:', error);
            }
          }

          return {
            id: ticket.id,
            titulo: ticket.titulo,
            mensaje: ticket.mensaje,
            estado: ticket.estado,
            respuesta: ticket.respuesta,
            fecha_creacion: ticket.fecha_creacion,
            fecha_respuesta: ticket.fecha_respuesta,
            fecha_cierre: ticket.fecha_cierre,
            admin_nombre: adminNombre,
            es_aviso: ticket.es_aviso,
            conversacion
          };
        })
      );

      setTicketHistory(ticketsWithAdminNames);
    } catch (error) {
      console.error('Error fetching ticket history:', error);
      setTicketHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteHistoryTicket = async (ticketId: string) => {
    if (!userId) return;

    setDeletingTicketId(ticketId);
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId)
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .eq('estado', 'cerrado');

      if (error) throw error;

      // Actualizar historial
      fetchTicketHistory();
      setModalMessage('Ticket eliminado del historial exitosamente.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting ticket from history:', error);
      setModalMessage('Error al eliminar el ticket del historial.');
      setShowErrorModal(true);
    } finally {
      setDeletingTicketId(null);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !formData.titulo.trim() || !formData.mensaje.trim()) return;

    setLoading(true);
    try {
      console.log('Creando ticket para usuario:', userId);
      
      const { data: existingTickets, error: checkError } = await supabase
        .from('tickets')
        .select('id, estado')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .in('estado', ['abierto', 'respondido']);

      if (checkError) {
        console.error('Error verificando tickets existentes:', checkError);
        throw checkError;
      }

      if (existingTickets && existingTickets.length > 0) {
        setModalMessage('Ya tienes un ticket abierto. Espera a que sea respondido antes de crear uno nuevo.');
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      const conversacionInicial: ConversacionMensaje[] = [
        {
          id: Date.now().toString(),
          mensaje: formData.mensaje.trim(),
          enviado_por: userId,
          tipo_usuario: userType,
          fecha: new Date().toISOString(),
          nombre_usuario: 'Tú'
        }
      ];

      const { data: newTicket, error: insertError } = await supabase
        .from('tickets')
        .insert({
          usuario_id: userId,
          tipo_usuario: userType,
          titulo: formData.titulo.trim(),
          mensaje: formData.mensaje.trim(),
          estado: 'abierto',
          fecha_creacion: new Date().toISOString(),
          es_aviso: false,
          creado_por_admin: false,
          conversacion: JSON.stringify(conversacionInicial)
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error insertando ticket:', insertError);
        throw insertError;
      }

      console.log('Ticket creado exitosamente:', newTicket);

      setCurrentTicket({
        id: newTicket.id,
        titulo: newTicket.titulo,
        mensaje: newTicket.mensaje,
        estado: newTicket.estado,
        fecha_creacion: newTicket.fecha_creacion,
        es_aviso: false,
        conversacion: conversacionInicial
      });
      setHasTicket(true);
      setFormData({ titulo: '', mensaje: '' });
      setModalMessage('Tu ticket ha sido creado exitosamente. Nuestro equipo de soporte lo revisará pronto.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating ticket:', error);
      setModalMessage('Error al crear el ticket. Inténtalo más tarde.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async () => {
    if (!currentTicket || !responseMessage.trim() || !userId) return;

    setSendingResponse(true);
    try {
      let conversacionActual: ConversacionMensaje[] = currentTicket.conversacion || [];
      
      const nuevoMensaje: ConversacionMensaje = {
        id: Date.now().toString(),
        mensaje: responseMessage.trim(),
        enviado_por: userId,
        tipo_usuario: userType,
        fecha: new Date().toISOString(),
        nombre_usuario: 'Tú'
      };
      
      conversacionActual.push(nuevoMensaje);

      const { error } = await supabase
        .from('tickets')
        .update({
          estado: 'respondido',
          respuesta: responseMessage.trim(),
          fecha_respuesta: new Date().toISOString(),
          conversacion: JSON.stringify(conversacionActual)
        })
        .eq('id', currentTicket.id);

      if (error) throw error;

      setCurrentTicket({
        ...currentTicket,
        estado: 'respondido',
        respuesta: responseMessage.trim(),
        fecha_respuesta: new Date().toISOString(),
        conversacion: conversacionActual
      });

      setResponseMessage('');
      setModalMessage('Tu respuesta ha sido enviada exitosamente.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error sending response:', error);
      setModalMessage('Error al enviar la respuesta. Inténtalo más tarde.');
      setShowErrorModal(true);
    } finally {
      setSendingResponse(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!currentTicket) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          estado: 'cerrado',
          fecha_cierre: new Date().toISOString()
        })
        .eq('id', currentTicket.id);

      if (error) throw error;

      setCurrentTicket(null);
      setHasTicket(false);
      fetchTicketHistory(); // Actualizar historial cuando se cierra un ticket
      setModalMessage(currentTicket.es_aviso ? 'Aviso cerrado exitosamente.' : 'Ticket cerrado exitosamente.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error closing ticket:', error);
      setModalMessage('Error al cerrar el ticket. Inténtalo más tarde.');
      setShowErrorModal(true);
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

  const formatChatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'abierto':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'respondido':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'cerrado':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'abierto':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'respondido':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cerrado':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      {/* Botón de Ayuda */}
      <button
        onClick={() => {
          setShowChat(!showChat);
          if (setShowOtherPanels) {
            setShowOtherPanels();
          }
        }}
        className={`fixed bottom-6 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 ${
          hasTicket || hasUnreadMessages ? 'animate-bounce' : 'animate-pulse'
        }`}
        title="Ayuda y Soporte"
      >
        <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8" />
        {(hasTicket || hasUnreadMessages) && (
          <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold animate-pulse">
            !
          </span>
        )}
      </button>

      {/* Chat de Ayuda */}
      {showChat && (
        <div className="fixed bottom-16 sm:bottom-24 right-2 sm:right-24 w-[calc(100vw-1rem)] sm:w-96 max-w-sm sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-in slide-in-from-bottom-4 duration-300 max-h-[70vh] overflow-hidden flex flex-col">
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Soporte CVM</h3>
                  <p className="text-xs text-blue-100 hidden sm:block">
                    {hasTicket ? (currentTicket?.es_aviso ? 'Aviso Activo' : 'Ticket Activo') : 'Sistema de Tickets'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!hasTicket && ticketHistory.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-white/80 hover:text-white transition-colors px-2 py-1 rounded bg-white/20 hover:bg-white/30"
                    title="Ver historial de tickets"
                  >
                    <span className="text-xs">Historial ({ticketHistory.length})</span>
                  </button>
                )}
                <button
                  onClick={() => setShowChat(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Contenido del Chat */}
          <div className="flex-1 overflow-y-auto">
            {showHistory && !hasTicket ? (
              /* Historial de Tickets */
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Historial de Tickets</h4>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : ticketHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No hay tickets en el historial</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {ticketHistory.map((ticket) => (
                      <div key={ticket.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 text-sm">{ticket.titulo}</h5>
                            <p className="text-gray-600 text-xs mt-1">
                              {ticket.es_aviso ? 'Aviso' : 'Ticket'} • Cerrado: {formatDate(ticket.fecha_cierre || ticket.fecha_creacion)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteHistoryTicket(ticket.id)}
                            disabled={deletingTicketId === ticket.id}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Eliminar del historial"
                          >
                            {deletingTicketId === ticket.id ? (
                              <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        
                        {/* Mostrar conversación del ticket histórico */}
                        {ticket.conversacion && ticket.conversacion.length > 0 && (
                          <div className="mt-3 max-h-32 overflow-y-auto space-y-2">
                            {ticket.conversacion.map((mensaje, index) => (
                              <div
                                key={index}
                                className={`text-xs p-2 rounded ${
                                  mensaje.tipo_usuario === 'admin'
                                    ? 'bg-blue-100 text-blue-800 ml-4'
                                    : 'bg-gray-100 text-gray-800 mr-4'
                                }`}
                              >
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium">{mensaje.nombre_usuario}</span>
                                  <span className="text-gray-500">{formatChatTime(mensaje.fecha)}</span>
                                </div>
                                <p>{mensaje.mensaje}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Crear Nuevo Ticket
                </button>
              </div>
            ) : hasTicket && currentTicket ? (
              <div className="flex flex-col h-full">
                {/* Header del ticket */}
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {currentTicket.es_aviso ? 'Aviso Administrativo' : 'Tu Ticket de Soporte'}
                    </h4>
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentTicket.estado)}`}>
                      {getStatusIcon(currentTicket.estado)}
                      <span className="capitalize">{currentTicket.estado}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700">Título:</p>
                    <p className="text-gray-900">{currentTicket.titulo}</p>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {currentTicket.es_aviso ? 'Aviso recibido' : 'Creado'}: {formatDate(currentTicket.fecha_creacion)}
                  </div>
                </div>

                {/* Área de mensajes estilo WhatsApp */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3 min-h-[200px]">
                  {currentTicket.conversacion && currentTicket.conversacion.length > 0 ? (
                    currentTicket.conversacion.map((mensaje) => (
                      <div
                        key={mensaje.id}
                        className={`flex ${mensaje.tipo_usuario === 'admin' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                            mensaje.tipo_usuario === 'admin'
                              ? 'bg-white text-gray-800 border border-gray-200 rounded-tl-md'
                              : 'bg-blue-500 text-white rounded-tr-md'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-xs font-medium ${
                              mensaje.tipo_usuario === 'admin' ? 'text-gray-500' : 'text-blue-100'
                            }`}>
                              {mensaje.nombre_usuario}
                            </span>
                            <span className={`text-xs ${
                              mensaje.tipo_usuario === 'admin' ? 'text-gray-400' : 'text-blue-200'
                            }`}>
                              {formatChatTime(mensaje.fecha)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{mensaje.mensaje}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-end">
                      <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl rounded-tr-md bg-blue-500 text-white shadow-sm">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-blue-100">Tú</span>
                          <span className="text-xs text-blue-200">
                            {formatChatTime(currentTicket.fecha_creacion)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{currentTicket.mensaje}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Área de respuesta */}
                {currentTicket.estado !== 'cerrado' && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <textarea
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendResponse();
                            }
                          }}
                          className="w-full p-2 sm:p-3 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Escribe tu respuesta..."
                          rows={2}
                          disabled={sendingResponse}
                        />
                      </div>
                      <button
                        onClick={handleSendResponse}
                        disabled={!responseMessage.trim() || sendingResponse}
                        className="bg-blue-500 text-white p-2 sm:p-3 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingResponse ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-gray-500 hidden sm:block">
                        Enter para enviar, Shift+Enter para nueva línea
                      </p>
                      <button
                        onClick={handleCloseTicket}
                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={fetchCurrentTicket}
                  className="w-full bg-blue-500 text-white py-2 px-4 hover:bg-blue-600 transition-colors text-sm"
                >
                  Actualizar Estado
                </button>
              </div>
            ) : (
              <div className="p-4">
                {/* Mostrar botón de historial si hay tickets cerrados */}
                {ticketHistory.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowHistory(true)}
                      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center space-x-2"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Ver Historial ({ticketHistory.length})</span>
                    </button>
                  </div>
                )}
                
                <div className="mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-blue-800 text-xs sm:text-sm">
                      <strong>¿Necesitas ayuda?</strong> Crea un ticket de soporte y nuestro equipo te ayudará.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Título del problema
                    </label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Describe brevemente tu problema"
                      required
                      maxLength={255}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Descripción detallada
                    </label>
                    <textarea
                      value={formData.mensaje}
                      onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg resize-none h-20 sm:h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Explica tu problema con el mayor detalle posible"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !formData.titulo.trim() || !formData.mensaje.trim()}
                    className="w-full bg-blue-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Ticket</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Tiempo de respuesta: 24-48 horas
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modales */}
      <SuccessModal
        show={showSuccessModal}
        message={modalMessage}
        onClose={() => setShowSuccessModal(false)}
      />

      <ErrorModal
        show={showErrorModal}
        message={modalMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </>
  );
};

export default HelpChat;