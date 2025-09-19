import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAdmin } from '../../contexts/AdminContext';
import { CheckCircle, XCircle, Clock, DollarSign, User, Users, Package } from 'lucide-react';

interface SolicitudUnificada {
  id: string;
  usuario_id: string;
  usuario_tipo: 'inversor' | 'partner';
  tipo: string;
  monto: number;
  estado: string;
  fecha_solicitud: string;
  motivo_rechazo?: string;
  notas?: string;
  modulo_id?: string;
  origen: 'principal' | 'modulo';
  usuario_nombre: string;
  modulo_nombre?: string;
}

interface AprobacionesUnificadasProps {
  onStatsUpdate: () => void;
}

const AprobacionesUnificadas: React.FC<AprobacionesUnificadasProps> = ({ onStatsUpdate }) => {
  const { admin } = useAdmin();
  const [solicitudes, setSolicitudes] = useState<SolicitudUnificada[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<'pendientes' | 'procesadas'>('pendientes');

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const solicitudesUnificadas: SolicitudUnificada[] = [];

      // 1. Solicitudes principales de inversores
      const { data: solicitudesInversores, error: errorInversores } = await supabase
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

      if (errorInversores) throw errorInversores;

      solicitudesInversores?.forEach(solicitud => {
        if (solicitud.inversores) {
          solicitudesUnificadas.push({
            id: solicitud.id,
            usuario_id: solicitud.inversor_id,
            usuario_tipo: 'inversor',
            tipo: solicitud.tipo,
            monto: solicitud.monto,
            estado: solicitud.estado,
            fecha_solicitud: solicitud.fecha_solicitud,
            motivo_rechazo: solicitud.motivo_rechazo,
            origen: 'principal',
          notas: solicitud.notas,
            usuario_nombre: `${solicitud.inversores.nombre} ${solicitud.inversores.apellido}`
          });
        }
      });

      // 2. Solicitudes principales de partners
      const { data: solicitudesPartners, error: errorPartners } = await supabase
        .from('partner_solicitudes')
        .select(`
          *,
          partners (
            nombre
          )
        `)
        .order('fecha_solicitud', { ascending: false });

      if (errorPartners) throw errorPartners;

      solicitudesPartners?.forEach(solicitud => {
        if (solicitud.partners) {
          solicitudesUnificadas.push({
            id: solicitud.id,
            usuario_id: solicitud.partner_id,
            usuario_tipo: 'partner',
            tipo: solicitud.tipo,
            monto: solicitud.monto,
            estado: solicitud.estado,
            fecha_solicitud: solicitud.fecha_solicitud,
            motivo_rechazo: solicitud.motivo_rechazo,
            notas: solicitud.notas,
            origen: 'principal',
            usuario_nombre: solicitud.partners.nombre
          });
        }
      });

      // 3. Solicitudes de módulos de inversores
      const { data: solicitudesModulosInversores, error: errorModulosInversores } = await supabase
        .from('modulo_solicitudes')
        .select(`
          *,
          inversores (
            nombre,
            apellido,
            email
          ),
          modulos_independientes (
            nombre
          )
        `)
        .order('fecha_solicitud', { ascending: false });

      if (errorModulosInversores) throw errorModulosInversores;

      solicitudesModulosInversores?.forEach(solicitud => {
        if (solicitud.inversores && solicitud.modulos_independientes) {
          solicitudesUnificadas.push({
            id: solicitud.id,
            usuario_id: solicitud.inversor_id,
            usuario_tipo: 'inversor',
            tipo: solicitud.tipo,
            monto: solicitud.monto,
            estado: solicitud.estado,
            fecha_solicitud: solicitud.fecha_solicitud,
            motivo_rechazo: solicitud.motivo_rechazo,
            notas: solicitud.notas,
            modulo_id: solicitud.modulo_id,
            origen: 'modulo',
            usuario_nombre: `${solicitud.inversores.nombre} ${solicitud.inversores.apellido}`,
            modulo_nombre: solicitud.modulos_independientes.nombre
          });
        }
      });

      // 4. Solicitudes de módulos de partners
      const { data: solicitudesModulosPartners, error: errorModulosPartners } = await supabase
        .from('modulo_partner_solicitudes')
        .select(`
          *,
          partners (
            nombre
          ),
          modulos_independientes (
            nombre
          )
        `)
        .order('fecha_solicitud', { ascending: false });

      if (errorModulosPartners) throw errorModulosPartners;

      solicitudesModulosPartners?.forEach(solicitud => {
        if (solicitud.partners && solicitud.modulos_independientes) {
          solicitudesUnificadas.push({
            id: solicitud.id,
            usuario_id: solicitud.partner_id,
            usuario_tipo: 'partner',
            tipo: solicitud.tipo,
            monto: solicitud.monto,
            estado: solicitud.estado,
            fecha_solicitud: solicitud.fecha_solicitud,
            motivo_rechazo: solicitud.motivo_rechazo,
            notas: solicitud.notas,
            modulo_id: solicitud.modulo_id,
            origen: 'modulo',
            usuario_nombre: solicitud.partners.nombre,
            modulo_nombre: solicitud.modulos_independientes.nombre
          });
        }
      });

      // Ordenar por fecha
      solicitudesUnificadas.sort((a, b) => 
        new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime()
      );

      setSolicitudes(solicitudesUnificadas);
    } catch (error) {
      console.error('Error fetching solicitudes unificadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTableName = (solicitud: SolicitudUnificada) => {
    if (solicitud.origen === 'principal') {
      return solicitud.usuario_tipo === 'inversor' ? 'solicitudes' : 'partner_solicitudes';
    } else {
      return solicitud.usuario_tipo === 'inversor' ? 'modulo_solicitudes' : 'modulo_partner_solicitudes';
    }
  };

  const handleApprove = async (solicitud: SolicitudUnificada) => {
    if (admin?.role !== 'admin') return;
    
    setProcessingId(solicitud.id);
    try {
      const tableName = getTableName(solicitud);
      
      // Actualizar estado de la solicitud
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          estado: 'aprobado',
          fecha_procesado: new Date().toISOString(),
          procesado_por: admin.id
        })
        .eq('id', solicitud.id);

      if (updateError) throw updateError;

      // Procesar la transacción según el tipo
      if (solicitud.tipo === 'transferencia') {
        // Procesar transferencia entre módulos
        await procesarTransferencia(solicitud);
      } else {
        // Procesar depósito o retiro normal
        await procesarTransaccion(solicitud);
      }

      fetchSolicitudes();
      onStatsUpdate();
    } catch (error) {
      console.error('Error approving solicitud:', error);
      alert('Error al aprobar la solicitud: ' + (error as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || admin?.role !== 'admin') return;
    
    const solicitud = solicitudes.find(s => s.id === showRejectModal);
    if (!solicitud) return;

    setProcessingId(showRejectModal);
    try {
      const tableName = getTableName(solicitud);
      
      const { error } = await supabase
        .from(tableName)
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

  const getUserIcon = (tipo: string) => {
    return tipo === 'partner' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  const getOrigenIcon = (origen: string) => {
    return origen === 'modulo' ? <Package className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />;
  };

  const procesarTransaccion = async (solicitud: SolicitudUnificada) => {
    const userField = solicitud.usuario_tipo === 'inversor' ? 'inversor_id' : 'partner_id';
    
    if (solicitud.origen === 'principal') {
      // Transacción en el dashboard principal
      const { error } = await supabase
        .from('transacciones')
        .insert({
          [userField]: solicitud.usuario_id,
          usuario_tipo: solicitud.usuario_tipo,
          monto: solicitud.monto,
          tipo: solicitud.tipo,
          descripcion: `${solicitud.tipo.charAt(0).toUpperCase() + solicitud.tipo.slice(1)} aprobado por administrador`,
          fecha: new Date().toISOString()
        });
      
      if (error) throw error;
    } else {
      // Transacción en módulo específico
      const { error } = await supabase
        .from('modulo_transacciones')
        .insert({
          modulo_id: solicitud.modulo_id,
          [userField]: solicitud.usuario_id,
          usuario_tipo: solicitud.usuario_tipo,
          monto: solicitud.monto,
          tipo: solicitud.tipo,
          descripcion: `${solicitud.tipo.charAt(0).toUpperCase() + solicitud.tipo.slice(1)} aprobado por administrador - ${solicitud.modulo_nombre}`,
          fecha: new Date().toISOString()
        });
      
      if (error) throw error;
    }
  };

  const procesarTransferencia = async (solicitud: SolicitudUnificada) => {
    // Extraer información de la transferencia desde las notas
    const notas = solicitud.notas || solicitud.motivo_rechazo || '';
    console.log('Procesando transferencia con notas:', notas);
    
    // Intentar extraer información de diferentes formatos posibles
    let moduloOrigenId = '';
    let moduloDestinoId = '';
    let moduloOrigenNombre = '';
    let moduloDestinoNombre = '';
    
    // Formato 1: "Origen: ID, Destino: ID"
    const origenMatch = notas.match(/Origen:\s*([^,]+)/);
    const destinoMatch = notas.match(/Destino:\s*(.+?)(?:\.|$)/);
    
    if (origenMatch && destinoMatch) {
      moduloOrigenId = origenMatch[1].trim();
      moduloDestinoId = destinoMatch[1].trim();
    } else {
      // Formato 2: Buscar UUIDs en las notas
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      const uuids = notas.match(uuidRegex);
      
      if (uuids && uuids.length >= 2) {
        moduloOrigenId = uuids[0];
        moduloDestinoId = uuids[1];
      } else {
        console.error('No se pudo extraer información de transferencia de las notas:', notas);
        throw new Error('Información de transferencia incompleta. Notas: ' + notas);
      }
    }
    
    // Obtener nombres de los módulos
    try {
      const { data: moduloOrigen, error: errorOrigen } = await supabase
        .from('modulos_independientes')
        .select('nombre')
        .eq('id', moduloOrigenId)
        .single();
      
      if (errorOrigen) throw errorOrigen;
      moduloOrigenNombre = moduloOrigen.nombre;
      
      const { data: moduloDestino, error: errorDestino } = await supabase
        .from('modulos_independientes')
        .select('nombre')
        .eq('id', moduloDestinoId)
        .single();
      
      if (errorDestino) throw errorDestino;
      moduloDestinoNombre = moduloDestino.nombre;
    } catch (error) {
      console.error('Error obteniendo nombres de módulos:', error);
      moduloOrigenNombre = 'Módulo Origen';
      moduloDestinoNombre = 'Módulo Destino';
    }
    
    console.log('Módulo origen extraído:', moduloOrigenId);
    console.log('Módulo destino extraído:', moduloDestinoId);
    console.log('Módulo origen nombre:', moduloOrigenNombre);
    console.log('Módulo destino nombre:', moduloDestinoNombre);
    
    if (!moduloOrigenId || !moduloDestinoId) {
      throw new Error('No se pudieron identificar los módulos de origen y destino');
    }
    
    const userField = solicitud.usuario_tipo === 'inversor' ? 'inversor_id' : 'partner_id';
    
    // 1. Crear retiro del módulo origen
    const { error: retiroError } = await supabase
      .from('modulo_transacciones')
      .insert({
        modulo_id: moduloOrigenId,
        [userField]: solicitud.usuario_id,
        usuario_tipo: solicitud.usuario_tipo,
        monto: solicitud.monto,
        tipo: 'retiro',
        descripcion: `Transferencia hacia ${moduloDestinoNombre} - Retiro de ${moduloOrigenNombre}`,
        fecha: new Date().toISOString()
      });

    if (retiroError) throw retiroError;

    // 2. Crear depósito en el módulo destino
    const { error: depositoError } = await supabase
      .from('modulo_transacciones')
      .insert({
        modulo_id: moduloDestinoId,
        [userField]: solicitud.usuario_id,
        usuario_tipo: solicitud.usuario_tipo,
        monto: solicitud.monto,
        tipo: 'deposito',
        descripcion: `Transferencia desde ${moduloOrigenNombre} - Depósito en ${moduloDestinoNombre}`,
        fecha: new Date().toISOString()
      });

    if (depositoError) throw depositoError;
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
      {/* Navegación de tabs */}
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <CheckCircle className="w-6 h-6 mr-3" />
          Sistema de Aprobaciones Unificado
        </h3>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === 'pendientes'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Pendientes ({pendientes.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('procesadas')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === 'procesadas'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Procesadas ({procesadas.length})</span>
          </button>
        </div>

        {/* Información del sistema */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-blue-200 font-semibold mb-2">Sistema Unificado de Aprobaciones</h4>
          <p className="text-blue-100 text-sm">
            Este panel muestra todas las solicitudes del sistema: depósitos y retiros tanto del dashboard principal como de módulos independientes, para inversores y partners.
          </p>
        </div>
      </div>

      {/* Solicitudes Pendientes */}
      {activeTab === 'pendientes' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-yellow-300" />
            Todas las Solicitudes Pendientes ({pendientes.length})
          </h4>
          
          {pendientes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendientes.map((solicitud) => (
                <div key={`${solicitud.origen}-${solicitud.id}`} className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 bg-gradient-to-br rounded-full flex items-center justify-center ${
                        solicitud.usuario_tipo === 'inversor' 
                          ? 'from-blue-400 to-blue-600' 
                          : 'from-purple-400 to-purple-600'
                      }`}>
                        {getUserIcon(solicitud.usuario_tipo)}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="text-white font-semibold">
                            {solicitud.usuario_nombre}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            solicitud.usuario_tipo === 'partner'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                          }`}>
                            {solicitud.usuario_tipo === 'partner' ? 'PARTNER' : 'INVERSOR'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            solicitud.origen === 'modulo'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                              : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                          }`}>
                            {solicitud.tipo === 'transferencia' ? 'TRANSFERENCIA' : 
                             solicitud.origen === 'modulo' ? 'MÓDULO' : 'PRINCIPAL'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-white/70 text-sm">
                          {getOrigenIcon(solicitud.origen)}
                          <span>
                            {solicitud.tipo === 'transferencia' ? 
                              (solicitud.notas ? 
                                `Transferencia: ${solicitud.notas.split('Transferencia de ')[1]?.split('. Origen:')[0] || 'Entre módulos'}` :
                                'Transferencia entre módulos'
                              ) :
                             solicitud.origen === 'modulo' && solicitud.modulo_nombre 
                              ? `Módulo: ${solicitud.modulo_nombre}`
                              : 'Dashboard Principal'
                            }
                          </span>
                        </div>
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
                            onClick={() => handleApprove(solicitud)}
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
      )}

      {/* Solicitudes Procesadas */}
      {activeTab === 'procesadas' && (
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-6 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
            Todas las Solicitudes Procesadas ({procesadas.length})
          </h4>
          
          {procesadas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70">No hay solicitudes procesadas</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {procesadas.map((solicitud) => (
                <div key={`${solicitud.origen}-${solicitud.id}`} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 bg-gradient-to-br rounded-full flex items-center justify-center ${
                        solicitud.usuario_tipo === 'inversor' 
                          ? 'from-gray-400 to-gray-600' 
                          : 'from-gray-500 to-gray-700'
                      }`}>
                        {getUserIcon(solicitud.usuario_tipo)}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="text-white font-medium">
                            {solicitud.usuario_nombre}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            solicitud.usuario_tipo === 'partner'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                          }`}>
                            {solicitud.usuario_tipo === 'partner' ? 'PARTNER' : 'INVERSOR'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            solicitud.origen === 'modulo'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                              : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                          }`}>
                            {solicitud.origen === 'modulo' ? 'MÓDULO' : 'PRINCIPAL'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-white/60 text-sm">
                          {getOrigenIcon(solicitud.origen)}
                          <span>
                            {solicitud.origen === 'modulo' && solicitud.modulo_nombre 
                              ? `Módulo: ${solicitud.modulo_nombre}`
                              : 'Dashboard Principal'
                            }
                          </span>
                        </div>
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
                  
                  {solicitud.tipo === 'transferencia' && solicitud.notas && (
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-300 text-sm">
                        <strong>Detalles de transferencia:</strong> {solicitud.notas}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

export default AprobacionesUnificadas;