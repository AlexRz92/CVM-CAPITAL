import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Send, MessageCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface HelpChatProps {
  userId?: string;
  userType: 'inversor' | 'partner';
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

const HelpChat: React.FC<HelpChatProps> = ({ userId, userType }) => {
  const [showChat, setShowChat] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [hasTicket, setHasTicket] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    mensaje: ''
  });

  useEffect(() => {
    if (userId && showChat) {
      fetchCurrentTicket();
    }
  }, [userId, showChat]);

  const fetchCurrentTicket = async () => {
    if (!userId) return;

    try {
      console.log('Buscando tickets para usuario:', userId, 'tipo:', userType);
      
      // Buscar ticket abierto o respondido del usuario usando consulta directa
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
        
        // Si el ticket tiene respuesta, obtener el nombre del admin
        let adminNombre = null;
        if (ticket.respondido_por) {
          const { data: adminData } = await supabase
            .from('admins')
            .select('nombre')
            .eq('id', ticket.respondido_por)
            .single();
          
          adminNombre = adminData?.nombre;
        }

        setCurrentTicket({
          id: ticket.id,
          titulo: ticket.titulo,
          mensaje: ticket.mensaje,
          estado: ticket.estado,
          respuesta: ticket.respuesta,
          fecha_creacion: ticket.fecha_creacion,
          fecha_respuesta: ticket.fecha_respuesta,
          admin_nombre: adminNombre
        });
        setHasTicket(true);
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

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !formData.titulo.trim() || !formData.mensaje.trim()) return;

    setLoading(true);
    try {
      console.log('Creando ticket para usuario:', userId);
      
      // Verificar si ya tiene un ticket abierto o respondido
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

      // Crear nuevo ticket
      const { data: newTicket, error: insertError } = await supabase
        .from('tickets')
        .insert({
          usuario_id: userId,
          tipo_usuario: userType,
          titulo: formData.titulo.trim(),
          mensaje: formData.mensaje.trim(),
          estado: 'abierto',
          fecha_creacion: new Date().toISOString()
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
        fecha_creacion: newTicket.fecha_creacion
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 animate-pulse"
        title="Ayuda y Soporte"
      >
        <HelpCircle className="w-8 h-8" />
      </button>

      {/* Chat de Ayuda */}
      {showChat && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-in slide-in-from-bottom-4 duration-300 max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Soporte CVM Capital</h3>
                  <p className="text-xs text-blue-100">Sistema de Tickets</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenido del Chat */}
          <div className="flex-1 overflow-y-auto">
            {hasTicket && currentTicket ? (
              /* Mostrar ticket existente */
              <div className="p-4 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Tu Ticket de Soporte</h4>
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentTicket.estado)}`}>
                      {getStatusIcon(currentTicket.estado)}
                      <span className="capitalize">{currentTicket.estado}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Título:</p>
                      <p className="text-gray-900">{currentTicket.titulo}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Tu mensaje:</p>
                      <p className="text-gray-900 bg-white p-3 rounded border">{currentTicket.mensaje}</p>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Creado: {formatDate(currentTicket.fecha_creacion)}
                    </div>
                  </div>
                </div>

                {currentTicket.respuesta && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Respuesta del Soporte</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-blue-900 bg-white p-3 rounded border border-blue-200">
                        {currentTicket.respuesta}
                      </p>
                      
                      <div className="text-xs text-blue-600">
                        {currentTicket.admin_nombre && `Respondido por: ${currentTicket.admin_nombre} • `}
                        {currentTicket.fecha_respuesta && formatDate(currentTicket.fecha_respuesta)}
                      </div>
                    </div>
                  </div>
                )}

                {currentTicket.estado === 'abierto' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-yellow-800">
                      <Clock className="w-5 h-5" />
                      <p className="text-sm font-medium">Tu ticket está siendo revisado por nuestro equipo de soporte.</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={fetchCurrentTicket}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Actualizar Estado
                </button>
              </div>
            ) : (
              /* Formulario para crear nuevo ticket */
              <div className="p-4">
                <div className="mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-blue-800 text-sm">
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Explica tu problema con el mayor detalle posible"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !formData.titulo.trim() || !formData.mensaje.trim()}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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