import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { CheckCircle, XCircle, Clock, DollarSign, User } from 'lucide-react';

interface Solicitud {
  id: string;
  inversor_id: string;
  tipo: string;
  monto: number;
  estado: string;
  fecha_solicitud: string;
  motivo_rechazo?: string;
  inversores: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

interface AprobacionesListProps {
  onStatsUpdate: () => void;
}

const AprobacionesList: React.FC<AprobacionesListProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes')
        .select(`
          *,
          inversores (
            nombre,
            apellido,
            email
          )
        `)
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (solicitudId: string) => {
    if (admin?.role !== 'admin') return;
    
    setProcessingId(solicitudId);
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({
          estado: 'aprobado',
          fecha_procesado: new Date().toISOString(),
          procesado_por: admin.id
        })
        .eq('id', solicitudId);

      if (error) throw error;

      fetchSolicitudes();
      onStatsUpdate();
    } catch (error) {
      console.error('Error approving solicitud:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || admin?.role !== 'admin') return;
    
    setProcessingId(showRejectModal);
    try {
      const { error } = await supabase
        .from('solicitudes')
        .update({
          estado: 'rechazado',
          fecha_procesado: new Date().toISOString(),
          procesado_por: admin.id,
          motivo_rechazo: rejectReason
        })
        .eq('id', showRejectModal);

      if (error) throw error;

      setShowRejectModal(null);
      setRejectReason('');
      fetchSolicitudes();
      onStatsUpdate();
    } catch (error) {
      console.error('Error rejecting solicitud:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
      case 'pendiente':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'aprobado':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'rechazado':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getTypeColor = (tipo: string) => {
    return tipo === 'deposito' ? 'text-green-300' : 'text-red-300';
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

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const procesadas = solicitudes.filter(s => s.estado !== 'pendiente');

  return (
    <div className="space-y-6">
      {/* Solicitudes Pendientes */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Clock className="w-6 h-6 mr-3 text-yellow-300" />
          Solicitudes Pendientes ({pendientes.length})
        </h3>
        
        {pendientes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendientes.map((solicitud) => (
              <div key={solicitud.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    
                    <div>
                      <h4 className="text-white font-semibold">
                        {solicitud.inversores.nombre} {solicitud.inversores.apellido}
                      </h4>
                      <p className="text-white/70 text-sm">{solicitud.inversores.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${getTypeColor(solicitud.tipo)}`}>
                        {formatCurrency(solicitud.monto)}
                      </p>
                      <p className="text-white/70 text-sm capitalize">{solicitud.tipo}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-white/80 text-sm">
                        {formatDate(solicitud.fecha_solicitud)}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(solicitud.estado)}`}>
                        {solicitud.estado.toUpperCase()}
                      </span>
                    </div>
                    
                    {admin?.role === 'admin' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleApprove(solicitud.id)}
                          disabled={processingId === solicitud.id}
                          className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Aprobar</span>
                        </button>
                        
                        <button
                          onClick={() => setShowRejectModal(solicitud.id)}
                          disabled={processingId === solicitud.id}
                          className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solicitudes Procesadas */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <CheckCircle className="w-6 h-6 mr-3 text-green-300" />
          Solicitudes Procesadas ({procesadas.length})
        </h3>
        
        {procesadas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">No hay solicitudes procesadas</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {procesadas.map((solicitud) => (
              <div key={solicitud.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    
                    <div>
                      <h4 className="text-white font-medium">
                        {solicitud.inversores.nombre} {solicitud.inversores.apellido}
                      </h4>
                      <p className="text-white/60 text-sm">{solicitud.inversores.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`font-semibold ${getTypeColor(solicitud.tipo)}`}>
                        {formatCurrency(solicitud.monto)}
                      </p>
                      <p className="text-white/60 text-sm capitalize">{solicitud.tipo}</p>
                    </div>
                    
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(solicitud.estado)}`}>
                        {solicitud.estado.toUpperCase()}
                      </span>
                      <p className="text-white/60 text-xs mt-1">
                        {formatDate(solicitud.fecha_solicitud)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {solicitud.motivo_rechazo && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-sm">
                      <strong>Motivo de rechazo:</strong> {solicitud.motivo_rechazo}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de rechazo */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rechazar Solicitud</h3>
            <p className="text-gray-600 mb-4">
              Por favor, indica el motivo del rechazo:
            </p>
            
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Motivo del rechazo..."
              required
            />
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processingId === showRejectModal}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === showRejectModal ? 'Procesando...' : 'Rechazar'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
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

export default AprobacionesList;