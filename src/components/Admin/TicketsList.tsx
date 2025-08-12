import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { MessageSquare, Send, CheckCircle, Clock, User, Users, X, Plus, Search, AlertTriangle, UserPlus, MessageCircle } from 'lucide-react';

interface Ticket {
  id: string;
  usuario_id: string;
  tipo_usuario: 'inversor' | 'partner';
  titulo: string;
  mensaje: string;
  estado: string;
  respuesta?: string;
  fecha_creacion: string;
  fecha_respuesta?: string;
  usuario_nombre: string;
  admin_nombre?: string;
  es_aviso?: boolean;
  creado_por_admin?: boolean;
  conversacion?: ConversacionMensaje[];
}

interface ConversacionMensaje {
  id: string;
  mensaje: string;
  enviado_por: string;
  tipo_usuario: 'admin' | 'inversor' | 'partner';
  fecha: string;
  nombre_usuario: string;
}

interface Inversor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface TicketsListProps {
  onStatsUpdate: () => void;
}

const TicketsList: React.FC<TicketsListProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateAvisoModal, setShowCreateAvisoModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInversor, setSelectedInversor] = useState<Inversor | null>(null);
  const [avisoForm, setAvisoForm] = useState({
    titulo: '',
    mensaje: ''
  });
  const [creatingAviso, setCreatingAviso] = useState(false);
  const { modalState, hideModal, showSuccess, showError } = useModal();

  useEffect(() => {
    fetchTickets();
    fetchInversores();
    
    // Configurar polling para actualizaciones en tiempo real
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchInversores = async () => {
    try {
      const { data, error } = await supabase
        .from('inversores')
        .select('id, nombre, apellido, email')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setInversores(data || []);
    } catch (error) {
      console.error('Error fetching inversores:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      console.log('Fetching tickets...');
      
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        throw ticketsError;
      }

      const enrichedTickets = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          let usuario_nombre = 'Usuario desconocido';
          let admin_nombre = null;

          if (ticket.tipo_usuario === 'inversor') {
            const { data: inversorData } = await supabase
              .from('inversores')
              .select('nombre, apellido')
              .eq('id', ticket.usuario_id)
              .single();
            
            if (inversorData) {
              usuario_nombre = `${inversorData.nombre} ${inversorData.apellido}`;
            }
          } else if (ticket.tipo_usuario === 'partner') {
            const { data: partnerData } = await supabase
              .from('partners')
              .select('nombre')
              .eq('id', ticket.usuario_id)
              .single();
            
            if (partnerData) {
              usuario_nombre = partnerData.nombre;
            }
          }

          if (ticket.respondido_por) {
            const { data: adminData } = await supabase
              .from('admins')
              .select('nombre')
              .eq('id', ticket.respondido_por)
              .single();
            
            if (adminData) {
              admin_nombre = adminData.nombre;
            }
          }

          let conversacion: ConversacionMensaje[] = [];
          if (ticket.conversacion) {
            try {
             // Only parse if conversacion is a non-empty string
             if (typeof ticket.conversacion === 'string' && ticket.conversacion.trim() !== '') {
               conversacion = JSON.parse(ticket.conversacion);
             }
            } catch (error) {
              console.error('Error parsing conversacion:', error);
            }
          }

          return {
            ...ticket,
            usuario_nombre,
            admin_nombre,
            conversacion
          };
        })
      );

      setTickets(enrichedTickets);
      
      // Actualizar ticket seleccionado si existe
      if (selectedTicket) {
        const updatedTicket = enrichedTickets.find(t => t.id === selectedTicket.id);
        if (updatedTicket) {
          setSelectedTicket(updatedTicket);
        }
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAviso = async () => {
    if (!selectedInversor || !avisoForm.titulo.trim() || !avisoForm.mensaje.trim() || !admin) {
      return;
    }

    setCreatingAviso(true);
    try {
      const conversacionInicial: ConversacionMensaje[] = [
        {
          id: Date.now().toString(),
          mensaje: avisoForm.mensaje.trim(),
          enviado_por: admin.id,
          tipo_usuario: 'admin',
          fecha: new Date().toISOString(),
          nombre_usuario: admin.nombre
        }
      ];

      const { error } = await supabase
        .from('tickets')
        .insert({
          usuario_id: selectedInversor.id,
          tipo_usuario: 'inversor',
          titulo: avisoForm.titulo.trim(),
          mensaje: avisoForm.mensaje.trim(),
          estado: 'abierto',
          fecha_creacion: new Date().toISOString(),
          es_aviso: true,
          creado_por_admin: true,
          respondido_por: admin.id,
          conversacion: JSON.stringify(conversacionInicial)
        });

      if (error) throw error;

      await supabase
        .from('notificaciones')
        .insert({
          usuario_id: selectedInversor.id,
          tipo_usuario: 'inversor',
          titulo: 'Nuevo Aviso Administrativo',
          mensaje: `Has recibido un nuevo aviso: ${avisoForm.titulo}`,
          tipo_notificacion: 'info',
          fecha_creacion: new Date().toISOString()
        });

      setShowCreateAvisoModal(false);
      setSelectedInversor(null);
      setAvisoForm({ titulo: '', mensaje: '' });
      setSearchTerm('');
      await fetchTickets();
      onStatsUpdate();
      
      showSuccess(
        'Aviso Enviado',
        'El aviso ha sido enviado exitosamente al inversor. Aparecerá en su sistema de tickets.'
      );
    } catch (error) {
      console.error('Error creating aviso:', error);
      showError(
        'Error al Crear Aviso',
        'No se pudo crear el aviso. Por favor, inténtalo más tarde.'
      );
    } finally {
      setCreatingAviso(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !admin) return;

    setSendingMessage(true);
    try {
      let conversacionActual: ConversacionMensaje[] = selectedTicket.conversacion || [];
      
      const nuevoMensaje: ConversacionMensaje = {
        id: Date.now().toString(),
        mensaje: newMessage.trim(),
        enviado_por: admin.id,
        tipo_usuario: 'admin',
        fecha: new Date().toISOString(),
        nombre_usuario: admin.nombre
      };
      
      conversacionActual.push(nuevoMensaje);

      const { error } = await supabase
        .from('tickets')
        .update({
          estado: 'respondido',
          respuesta: newMessage.trim(),
          fecha_respuesta: new Date().toISOString(),
          respondido_por: admin.id,
          conversacion: JSON.stringify(conversacionActual)
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      await supabase
        .from('notificaciones')
        .insert({
          usuario_id: selectedTicket.usuario_id,
          tipo_usuario: selectedTicket.tipo_usuario,
          titulo: selectedTicket.es_aviso ? 'Respuesta a Aviso' : 'Respuesta a Ticket',
          mensaje: `Has recibido una respuesta: ${newMessage.trim().substring(0, 100)}${newMessage.trim().length > 100 ? '...' : ''}`,
          tipo_notificacion: 'info',
          fecha_creacion: new Date().toISOString()
        });

      setNewMessage('');
      await fetchTickets();
      onStatsUpdate();
    } catch (error) {
      console.error('Error sending message:', error);
      showError(
        'Error al Enviar Mensaje',
        'No se pudo enviar el mensaje. Por favor, inténtalo más tarde.'
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCerrar = async (ticketId: string) => {
    if (!admin) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          estado: 'cerrado',
          fecha_cierre: new Date().toISOString(),
          cerrado_por: admin.id
        })
        .eq('id', ticketId);

      if (error) throw error;
      
      setSelectedTicket(null);
      await fetchTickets();
      onStatsUpdate();
      
      showSuccess(
        'Ticket Cerrado',
        'El ticket ha sido cerrado exitosamente.'
      );
    } catch (error) {
      console.error('Error closing ticket:', error);
      showError(
        'Error al Cerrar Ticket',
        'No se pudo cerrar el ticket. Por favor, inténtalo más tarde.'
      );
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

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'abierto':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'respondido':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'cerrado':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getUserIcon = (tipo: string) => {
    return tipo === 'partner' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  const filteredInversores = inversores.filter(inv => 
    inv.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ticketsAbiertos = tickets.filter(t => t.estado !== 'cerrado');

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
      {/* Botón para crear aviso */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center">
            <UserPlus className="w-6 h-6 mr-3 text-green-300" />
            Gestión de Avisos Administrativos
          </h3>
          
          <button
            onClick={() => setShowCreateAvisoModal(true)}
            className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors border border-green-400/50"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Aviso</span>
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-200 text-sm">
            <strong>Avisos Administrativos:</strong> Envía mensajes directos a inversores específicos. 
            Los avisos aparecerán en su sistema de tickets y podrán responder como una conversación.
          </p>
        </div>
      </div>

      {/* Layout principal con lista y chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Tickets */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <MessageSquare className="w-6 h-6 mr-3 text-blue-300" />
            Tickets Activos ({ticketsAbiertos.length})
          </h3>
          
          {ticketsAbiertos.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">No hay tickets activos</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {ticketsAbiertos.map((ticket) => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedTicket?.id === ticket.id
                      ? 'bg-blue-500/20 border-blue-400/50 shadow-lg'
                      : 'bg-white/10 border-white/20 hover:bg-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        {getUserIcon(ticket.tipo_usuario)}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm">{ticket.titulo}</h4>
                        <p className="text-white/70 text-xs">{ticket.usuario_nombre}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      {ticket.es_aviso && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/50">
                          AVISO
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.estado)}`}>
                        {ticket.estado.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-white/60 text-xs">
                      {formatDate(ticket.fecha_creacion)}
                    </p>
                    {ticket.conversacion && ticket.conversacion.length > 1 && (
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3 text-blue-300" />
                        <span className="text-blue-300 text-xs">{ticket.conversacion.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat del Ticket Seleccionado */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-200/30 flex flex-col h-[600px]">
          {selectedTicket ? (
            <>
              {/* Header del Chat */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      {getUserIcon(selectedTicket.tipo_usuario)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedTicket.usuario_nombre}</h3>
                      <p className="text-xs text-blue-100">
                        {selectedTicket.es_aviso ? 'Aviso Administrativo' : 'Ticket de Soporte'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedTicket.estado)}`}>
                      {selectedTicket.estado.toUpperCase()}
                    </span>
                    {selectedTicket.estado !== 'cerrado' && (
                      <button
                        onClick={() => handleCerrar(selectedTicket.id)}
                        className="text-xs bg-red-500/20 text-red-200 px-2 py-1 rounded hover:bg-red-500/30 transition-colors"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 text-sm">
                  <p className="text-blue-100 font-medium">{selectedTicket.titulo}</p>
                </div>
              </div>

              {/* Área de Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
                {selectedTicket.conversacion && selectedTicket.conversacion.length > 0 ? (
                  selectedTicket.conversacion.map((mensaje, index) => (
                    <div
                      key={mensaje.id}
                      className={`flex ${mensaje.tipo_usuario === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                          mensaje.tipo_usuario === 'admin'
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-xs font-medium ${
                            mensaje.tipo_usuario === 'admin' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {mensaje.nombre_usuario}
                          </span>
                          <span className={`text-xs ${
                            mensaje.tipo_usuario === 'admin' ? 'text-blue-200' : 'text-gray-400'
                          }`}>
                            {formatChatTime(mensaje.fecha)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{mensaje.mensaje}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl rounded-bl-md bg-white text-gray-800 border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {selectedTicket.usuario_nombre}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatChatTime(selectedTicket.fecha_creacion)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{selectedTicket.mensaje}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Área de Escritura */}
              {selectedTicket.estado !== 'cerrado' && (
                <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="w-full p-3 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Escribe tu respuesta..."
                        rows={2}
                        disabled={sendingMessage}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingMessage ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Presiona Enter para enviar, Shift+Enter para nueva línea
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/70">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-white/30" />
                <p>Selecciona un ticket para ver la conversación</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear aviso */}
      {showCreateAvisoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <UserPlus className="w-6 h-6 mr-3 text-green-600" />
              Crear Aviso Administrativo
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Buscar Inversor *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Buscar por nombre, apellido o email..."
                  />
                </div>
                
                {searchTerm && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg">
                    {filteredInversores.length === 0 ? (
                      <div className="p-3 text-gray-500 text-center">
                        No se encontraron inversores
                      </div>
                    ) : (
                      filteredInversores.map((inversor) => (
                        <button
                          key={inversor.id}
                          onClick={() => {
                            setSelectedInversor(inversor);
                            setSearchTerm('');
                          }}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {inversor.nombre} {inversor.apellido}
                          </div>
                          <div className="text-sm text-gray-500">{inversor.email}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {selectedInversor && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-800">
                          {selectedInversor.nombre} {selectedInversor.apellido}
                        </div>
                        <div className="text-sm text-green-600">{selectedInversor.email}</div>
                      </div>
                      <button
                        onClick={() => setSelectedInversor(null)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Título del Aviso *
                </label>
                <input
                  type="text"
                  value={avisoForm.titulo}
                  onChange={(e) => setAvisoForm({...avisoForm, titulo: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Título del aviso..."
                  maxLength={255}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Mensaje del Aviso *
                </label>
                <textarea
                  value={avisoForm.mensaje}
                  onChange={(e) => setAvisoForm({...avisoForm, mensaje: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none h-32"
                  placeholder="Escribe el mensaje del aviso..."
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                  <h4 className="text-blue-800 font-semibold">Información del Aviso</h4>
                </div>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• El aviso aparecerá en el sistema de tickets del inversor</li>
                  <li>• El inversor recibirá una notificación inmediata</li>
                  <li>• Se puede mantener una conversación bidireccional</li>
                  <li>• El aviso se puede cerrar cuando sea necesario</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleCreateAviso}
                disabled={!selectedInversor || !avisoForm.titulo.trim() || !avisoForm.mensaje.trim() || creatingAviso}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {creatingAviso ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Aviso</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCreateAvisoModal(false);
                  setSelectedInversor(null);
                  setAvisoForm({ titulo: '', mensaje: '' });
                  setSearchTerm('');
                }}
                disabled={creatingAviso}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <UnifiedModal
        show={modalState.show}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
        confirmText={modalState.confirmText}
        onConfirm={modalState.onConfirm}
        cancelText={modalState.cancelText}
      />
    </div>
  );
};

export default TicketsList;