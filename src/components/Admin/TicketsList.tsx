import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { MessageSquare, Send, CheckCircle, Clock, User, Users, X } from 'lucide-react';

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
}

interface TicketsListProps {
  onStatsUpdate: () => void;
}

const TicketsList: React.FC<TicketsListProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respuestaForm, setRespuestaForm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_tickets_admin');

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponder = async (ticketId: string) => {
    if (!respuestaForm.trim()) return;

    setProcessingId(ticketId);
    try {
      const { data, error } = await supabase.rpc('responder_ticket', {
        p_ticket_id: ticketId,
        p_respuesta: respuestaForm.trim(),
        p_admin_id: admin?.id
      });

      if (error) throw error;

      if (data.success) {
        setRespondingId(null);
        setRespuestaForm('');
        fetchTickets();
        onStatsUpdate();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error responding to ticket:', error);
      alert('Error al responder el ticket');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCerrar = async (ticketId: string) => {
    setProcessingId(ticketId);
    try {
      const { data, error } = await supabase.rpc('cerrar_ticket', {
        p_ticket_id: ticketId,
        p_admin_id: admin?.id
      });

      if (error) throw error;

      if (data.success) {
        setShowCloseModal(null);
        fetchTickets();
        onStatsUpdate();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      alert('Error al cerrar el ticket');
    } finally {
      setProcessingId(null);
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

  if (loading) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const ticketsAbiertos = tickets.filter(t => t.estado === 'abierto');
  const ticketsRespondidos = tickets.filter(t => t.estado === 'respondido');
  const ticketsCerrados = tickets.filter(t => t.estado === 'cerrado');

  return (
    <div className="space-y-6">
      {/* Tickets Abiertos */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Clock className="w-6 h-6 mr-3 text-yellow-300" />
          Tickets Abiertos ({ticketsAbiertos.length})
        </h3>
        
        {ticketsAbiertos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay tickets abiertos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ticketsAbiertos.map((ticket) => (
              <div key={ticket.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                      {getUserIcon(ticket.tipo_usuario)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-white font-semibold">{ticket.titulo}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.estado)}`}>
                          {ticket.estado.toUpperCase()}
                        </span>
                        <span className="text-white/60 text-xs">
                          {ticket.tipo_usuario === 'partner' ? 'Socio' : 'Inversor'}
                        </span>
                      </div>
                      
                      <p className="text-white/80 text-sm mb-2">
                        <strong>Usuario:</strong> {ticket.usuario_nombre}
                      </p>
                      
                      <div className="bg-white/5 rounded p-3 mb-3">
                        <p className="text-white/90 text-sm">{ticket.mensaje}</p>
                      </div>
                      
                      <p className="text-white/60 text-xs">
                        {formatDate(ticket.fecha_creacion)}
                      </p>
                    </div>
                  </div>
                </div>

                {respondingId === ticket.id ? (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                    <h5 className="text-white font-medium mb-3">Responder Ticket</h5>
                    <textarea
                      value={respuestaForm}
                      onChange={(e) => setRespuestaForm(e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-white/50"
                      placeholder="Escribe tu respuesta..."
                    />
                    <div className="flex space-x-3 mt-3">
                      <button
                        onClick={() => handleResponder(ticket.id)}
                        disabled={!respuestaForm.trim() || processingId === ticket.id}
                        className="flex items-center space-x-2 bg-blue-500/20 text-white px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{processingId === ticket.id ? 'Enviando...' : 'Enviar Respuesta'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setRespondingId(null);
                          setRespuestaForm('');
                        }}
                        className="flex items-center space-x-2 bg-gray-500/20 text-white px-4 py-2 rounded-lg hover:bg-gray-500/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setRespondingId(ticket.id)}
                      className="flex items-center space-x-2 bg-blue-500/20 text-white px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Responder</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tickets Respondidos */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <MessageSquare className="w-6 h-6 mr-3 text-blue-300" />
          Tickets Respondidos ({ticketsRespondidos.length})
        </h3>
        
        {ticketsRespondidos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay tickets respondidos</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {ticketsRespondidos.map((ticket) => (
              <div key={ticket.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      {getUserIcon(ticket.tipo_usuario)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-white font-medium">{ticket.titulo}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.estado)}`}>
                          {ticket.estado.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-white/70 text-sm mb-2">
                        {ticket.usuario_nombre} ({ticket.tipo_usuario === 'partner' ? 'Socio' : 'Inversor'})
                      </p>
                      
                      {ticket.respuesta && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mb-2">
                          <p className="text-blue-200 text-sm">{ticket.respuesta}</p>
                        </div>
                      )}
                      
                      <p className="text-white/60 text-xs">
                        Respondido: {ticket.fecha_respuesta && formatDate(ticket.fecha_respuesta)}
                        {ticket.admin_nombre && ` por ${ticket.admin_nombre}`}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowCloseModal(ticket.id)}
                    disabled={processingId === ticket.id}
                    className="flex items-center space-x-2 bg-green-500/20 text-white px-3 py-2 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{processingId === ticket.id ? 'Cerrando...' : 'Cerrar'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tickets Cerrados */}
      {ticketsCerrados.length > 0 && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <CheckCircle className="w-6 h-6 mr-3 text-green-300" />
            Tickets Cerrados ({ticketsCerrados.length})
          </h3>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {ticketsCerrados.map((ticket) => (
              <div key={ticket.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium text-sm">{ticket.titulo}</h4>
                    <p className="text-white/60 text-xs">
                      {ticket.usuario_nombre} • {formatDate(ticket.fecha_creacion)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.estado)}`}>
                    CERRADO
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmación para cerrar ticket */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cerrar Ticket</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas cerrar este ticket? Esta acción marcará el ticket como resuelto.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => handleCerrar(showCloseModal)}
                disabled={processingId === showCloseModal}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === showCloseModal ? 'Cerrando...' : 'Cerrar Ticket'}
              </button>
              <button
                onClick={() => setShowCloseModal(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsList;