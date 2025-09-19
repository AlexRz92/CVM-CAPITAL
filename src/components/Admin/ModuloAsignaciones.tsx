import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useModal } from '../../hooks/useModal';
import { UnifiedModal } from '../UI';
import { UserPlus, UserMinus, DollarSign, X, Search, ArrowRightLeft, Plus } from 'lucide-react';

interface ModuloAsignacionesProps {
  moduloId: string;
  moduloNombre: string;
  showMessage: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

interface Usuario {
  id: string;
  nombre: string;
  apellido?: string;
  email?: string;
  username?: string;
  total?: number;
  activo?: boolean;
}

const ModuloAsignaciones: React.FC<ModuloAsignacionesProps> = ({ moduloId, moduloNombre, showMessage }) => {
  const [inversores, setInversores] = useState<Usuario[]>([]);
  const [partners, setPartners] = useState<Usuario[]>([]);
  const [inversoresAsignados, setInversoresAsignados] = useState<Usuario[]>([]);
  const [partnersAsignados, setPartnersAsignados] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState<{ type: 'inversor' | 'partner', id: string, name: string } | null>(null);
  const [showTransferModal, setShowTransferModal] = useState<{ type: 'inversor' | 'partner', id: string, name: string, saldoPrincipal: number } | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermPartners, setSearchTermPartners] = useState('');
  const { modalState, hideModal, showSuccess, showError } = useModal();

  useEffect(() => {
    fetchData();
  }, [moduloId]);

  const fetchData = async () => {
    try {
      // Obtener todos los inversores con su saldo principal
      const { data: allInversores, error: inversoresError } = await supabase
        .from('inversores')
        .select('id, nombre, apellido, email, total')
        .order('nombre');

      if (inversoresError) throw inversoresError;

      // Obtener todos los partners
      const { data: allPartners, error: partnersError } = await supabase
        .from('partners')
        .select('id, nombre, username')
        .eq('activo', true)
        .order('nombre');

      if (partnersError) throw partnersError;

      // Obtener inversores asignados al módulo
      const { data: asignadosInversores, error: asignadosInversoresError } = await supabase
        .from('modulo_asignaciones')
        .select(`
          inversor_id,
          activo,
          inversores (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('modulo_id', moduloId)
        .eq('activo', true)
        .not('inversor_id', 'is', null);

      if (asignadosInversoresError) throw asignadosInversoresError;

      // Obtener partners asignados al módulo
      const { data: asignadosPartners, error: asignadosPartnersError } = await supabase
        .from('modulo_asignaciones')
        .select(`
          partner_id,
          activo,
          partners (
            id,
            nombre,
            username
          )
        `)
        .eq('modulo_id', moduloId)
        .eq('activo', true)
        .not('partner_id', 'is', null);

      if (asignadosPartnersError) throw asignadosPartnersError;

      // Calcular saldos en el módulo para usuarios asignados
      const inversoresConSaldos = await Promise.all(
        (asignadosInversores || []).map(async (asignacion) => {
          if (!asignacion.inversores) return null;
          
          const { data: transacciones, error } = await supabase
            .from('modulo_transacciones')
            .select('monto, tipo')
            .eq('modulo_id', moduloId)
            .eq('inversor_id', asignacion.inversor_id)
            .eq('usuario_tipo', 'inversor');

          if (error) {
            console.error('Error fetching transactions:', error);
            return {
              ...asignacion.inversores,
              activo: asignacion.activo,
              saldo_modulo: 0
            };
          }

          let saldo = 0;
          transacciones?.forEach(t => {
            switch (t.tipo.toLowerCase()) {
              case 'deposito':
                saldo += Number(t.monto);
                break;
              case 'retiro':
                saldo -= Number(t.monto);
                break;
              case 'ganancia':
                saldo += Number(t.monto);
                break;
            }
          });

          return {
            ...asignacion.inversores,
            activo: asignacion.activo,
            saldo_modulo: saldo
          };
        })
      );

      const partnersConSaldos = await Promise.all(
        (asignadosPartners || []).map(async (asignacion) => {
          if (!asignacion.partners) return null;
          
          const { data: transacciones, error } = await supabase
            .from('modulo_transacciones')
            .select('monto, tipo')
            .eq('modulo_id', moduloId)
            .eq('partner_id', asignacion.partner_id)
            .eq('usuario_tipo', 'partner');

          if (error) {
            console.error('Error fetching transactions:', error);
            return {
              ...asignacion.partners,
              activo: asignacion.activo,
              saldo_modulo: 0
            };
          }

          let saldo = 0;
          transacciones?.forEach(t => {
            switch (t.tipo.toLowerCase()) {
              case 'deposito':
                saldo += Number(t.monto);
                break;
              case 'retiro':
                saldo -= Number(t.monto);
                break;
              case 'ganancia':
                saldo += Number(t.monto);
                break;
            }
          });

          return {
            ...asignacion.partners,
            activo: asignacion.activo,
            saldo_modulo: saldo
          };
        })
      );

      setInversores(allInversores || []);
      setPartners(allPartners || []);
      setInversoresAsignados(inversoresConSaldos.filter(Boolean));
      setPartnersAsignados(partnersConSaldos.filter(Boolean));
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('Error', 'Error al cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDepositSubmit = async () => {
    if (!showDepositModal || !depositAmount) return;
    
    const amount = parseFloat(depositAmount);
    if (amount <= 0) {
      showError('Monto Inválido', 'El monto debe ser mayor a 0');
      return;
    }

    setSubmittingDeposit(true);
    try {
      // Verificar si ya existe una asignación para este usuario y módulo
      const userField = showDepositModal.type === 'inversor' ? 'inversor_id' : 'partner_id';
      const { data: existingAssignment, error: checkError } = await supabase
        .from('modulo_asignaciones')
        .select('id, activo')
        .eq('modulo_id', moduloId)
        .eq(userField, showDepositModal.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw checkError;
      }

      // Si existe una asignación
      if (existingAssignment) {
        if (existingAssignment.activo) {
          // Ya está asignado y activo, no hacer nada
        } else {
          // Reactivar la asignación existente
          const { error: updateError } = await supabase
            .from('modulo_asignaciones')
            .update({
              activo: true,
              fecha_asignacion: new Date().toISOString()
            })
            .eq('id', existingAssignment.id);

          if (updateError) throw updateError;
        }
      } else {
        // Crear nueva asignación
        const { error: assignError } = await supabase
          .from('modulo_asignaciones')
          .insert({
            modulo_id: moduloId,
            [userField]: showDepositModal.id,
            activo: true,
            fecha_asignacion: new Date().toISOString()
          });

        if (assignError) throw assignError;
      }

      // Crear solicitud de depósito que requiere aprobación
      // Crear transacción de depósito directamente (sin aprobación)
      const { error: transaccionError } = await supabase
        .from('modulo_transacciones')
        .insert({
          modulo_id: moduloId,
          [userField]: showDepositModal.id,
          usuario_tipo: showDepositModal.type,
          monto: amount,
          tipo: 'deposito',
          descripcion: depositDescription || `Depósito inicial al módulo ${moduloNombre}`,
          fecha: new Date().toISOString()
        });

      if (transaccionError) throw transaccionError;

      setShowDepositModal(null);
      setDepositAmount('');
      setDepositDescription('');
      fetchData();
      showSuccess(
        'Usuario Asignado',
        `${showDepositModal.type === 'inversor' ? 'Inversor' : 'Partner'} asignado exitosamente con depósito de ${formatCurrency(amount)} procesado directamente.`
      );
    } catch (error) {
      console.error('Error asignando con depósito:', error);
      showError(
        'Error de Asignación',
        'Error al asignar usuario con depósito: ' + (error as Error).message
      );
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!showTransferModal || !transferAmount) return;
    
    const amount = parseFloat(transferAmount);
    if (amount <= 0) {
      showError('Monto Inválido', 'El monto debe ser mayor a 0');
      return;
    }

    if (amount > showTransferModal.saldoPrincipal) {
      showError(
        'Saldo Insuficiente',
        'El monto no puede ser mayor al saldo principal disponible'
      );
      return;
    }

    setSubmittingTransfer(true);
    try {
      // Verificar si ya existe una asignación para este usuario y módulo
      const userField = showTransferModal.type === 'inversor' ? 'inversor_id' : 'partner_id';
      const { data: existingAssignment, error: checkError } = await supabase
        .from('modulo_asignaciones')
        .select('id, activo')
        .eq('modulo_id', moduloId)
        .eq(userField, showTransferModal.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw checkError;
      }

      // Si existe una asignación
      if (existingAssignment) {
        if (existingAssignment.activo) {
          // Ya está asignado y activo, no hacer nada
        } else {
          // Reactivar la asignación existente
          const { error: updateError } = await supabase
            .from('modulo_asignaciones')
            .update({
              activo: true,
              fecha_asignacion: new Date().toISOString()
            })
            .eq('id', existingAssignment.id);

          if (updateError) throw updateError;
        }
      } else {
        // Crear nueva asignación
        const { error: assignError } = await supabase
          .from('modulo_asignaciones')
          .insert({
            modulo_id: moduloId,
            [userField]: showTransferModal.id,
            activo: true,
            fecha_asignacion: new Date().toISOString()
          });

        if (assignError) throw assignError;
      }

      // Crear retiro del módulo principal (transacciones globales)
      const { error: retiroError } = await supabase
        .from('transacciones')
        .insert({
          [userField]: showTransferModal.id,
          usuario_tipo: showTransferModal.type,
          monto: amount,
          tipo: 'retiro',
          descripcion: `Transferencia a módulo ${moduloNombre}`,
          fecha: new Date().toISOString()
        });

      if (retiroError) throw retiroError;

      // Crear depósito en el módulo específico
      const { error: depositoError } = await supabase
        .from('modulo_transacciones')
        .insert({
          modulo_id: moduloId,
          [userField]: showTransferModal.id,
          usuario_tipo: showTransferModal.type,
          monto: amount,
          tipo: 'deposito',
          descripcion: `Transferencia desde saldo principal`,
          fecha: new Date().toISOString()
        });

      if (depositoError) throw depositoError;

      setShowTransferModal(null);
      setTransferAmount('');
      fetchData();
      showSuccess(
        'Usuario Asignado',
        `${showTransferModal.type === 'inversor' ? 'Inversor' : 'Partner'} asignado exitosamente con transferencia de ${formatCurrency(amount)} desde saldo principal.`
      );
    } catch (error) {
      console.error('Error asignando con transferencia:', error);
      showError(
        'Error de Asignación',
        'Error al asignar usuario con transferencia: ' + (error as Error).message
      );
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleAsignarInversor = async (inversorId: string) => {
    const inversor = inversores.find(inv => inv.id === inversorId);
    if (inversor) {
      setShowDepositModal({
        type: 'inversor',
        id: inversorId,
        name: `${inversor.nombre} ${inversor.apellido}`
      });
    }
  };

  const handleTransferirInversor = async (inversorId: string) => {
    const inversor = inversores.find(inv => inv.id === inversorId);
    if (inversor) {
      setShowTransferModal({
        type: 'inversor',
        id: inversorId,
        name: `${inversor.nombre} ${inversor.apellido}`,
        saldoPrincipal: inversor.total || 0
      });
    }
  };

  const handleRemoverInversor = async (inversorId: string) => {
    setProcessing(inversorId);
    try {
      // Primero, eliminar todas las transacciones del inversor en este módulo
      const { error: deleteTransactionsError } = await supabase
        .from('modulo_transacciones')
        .delete()
        .eq('modulo_id', moduloId)
        .eq('inversor_id', inversorId)
        .eq('usuario_tipo', 'inversor');

      if (deleteTransactionsError) {
        console.error('Error eliminando transacciones del inversor:', deleteTransactionsError);
        throw deleteTransactionsError;
      }

      // Luego, eliminar todas las solicitudes pendientes del inversor en este módulo
      const { error: deleteSolicitudesError } = await supabase
        .from('modulo_solicitudes')
        .delete()
        .eq('modulo_id', moduloId)
        .eq('inversor_id', inversorId);

      if (deleteSolicitudesError) {
        console.error('Error eliminando solicitudes del inversor:', deleteSolicitudesError);
        // No lanzar error aquí, ya que las solicitudes pueden no existir
      }

      // Finalmente, desactivar la asignación
      // Desactivar la asignación
      const { error } = await supabase
        .from('modulo_asignaciones')
        .update({ activo: false })
        .eq('modulo_id', moduloId)
        .eq('inversor_id', inversorId);

      if (error) throw error;
      
      fetchData();
      showSuccess(
        'Inversor Removido',
        'El inversor ha sido removido del módulo exitosamente. Se eliminaron todas sus transacciones y solicitudes pendientes.'
      );
    } catch (error) {
      console.error('Error removiendo inversor:', error);
      showError(
        'Error al Remover',
        'Error al remover inversor: ' + (error as Error).message
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleAsignarPartner = async (partnerId: string) => {
    const partner = partners.find(part => part.id === partnerId);
    if (partner) {
      setShowDepositModal({
        type: 'partner',
        id: partnerId,
        name: partner.nombre
      });
    }
  };

  const handleTransferirPartner = async (partnerId: string) => {
    setProcessing(partnerId);
    try {
      // Obtener saldo principal del partner
      const { data: transactions, error } = await supabase
        .from('transacciones')
        .select('monto, tipo')
        .eq('partner_id', partnerId)
        .eq('usuario_tipo', 'partner');

      if (error) {
        showMessage('Error', 'Error al obtener saldo del partner', 'error');
        return;
      }

      // Calcular saldo principal
      let saldoPrincipal = 0;
      transactions?.forEach(transaction => {
        switch (transaction.tipo.toLowerCase()) {
          case 'deposito':
            saldoPrincipal += Number(transaction.monto);
            break;
          case 'retiro':
            saldoPrincipal -= Number(transaction.monto);
            break;
          case 'ganancia':
            saldoPrincipal += Number(transaction.monto);
            break;
        }
      });

      const partner = partners.find(part => part.id === partnerId);
      if (partner) {
      setShowTransferModal({
        type: 'partner',
        id: partnerId,
        name: partner.nombre,
        saldoPrincipal: saldoPrincipal
      });
      }
    } catch (error) {
      console.error('Error obteniendo saldo partner:', error);
      showError(
        'Error de Datos',
        'Error al obtener el saldo del partner'
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleRemoverPartner = async (partnerId: string) => {
    setProcessing(partnerId);
    try {
      // Primero, eliminar todas las transacciones del partner en este módulo
      const { error: deleteTransactionsError } = await supabase
        .from('modulo_transacciones')
        .delete()
        .eq('modulo_id', moduloId)
        .eq('partner_id', partnerId)
        .eq('usuario_tipo', 'partner');

      if (deleteTransactionsError) {
        console.error('Error eliminando transacciones del partner:', deleteTransactionsError);
        throw deleteTransactionsError;
      }

      // Luego, eliminar todas las solicitudes pendientes del partner en este módulo
      const { error: deleteSolicitudesError } = await supabase
        .from('modulo_partner_solicitudes')
        .delete()
        .eq('modulo_id', moduloId)
        .eq('partner_id', partnerId);

      if (deleteSolicitudesError) {
        console.error('Error eliminando solicitudes del partner:', deleteSolicitudesError);
        // No lanzar error aquí, ya que las solicitudes pueden no existir
      }

      // Finalmente, desactivar la asignación
      // Desactivar la asignación
      const { error } = await supabase
        .from('modulo_asignaciones')
        .update({ activo: false })
        .eq('modulo_id', moduloId)
        .eq('partner_id', partnerId);

      if (error) throw error;
      
      fetchData();
      showSuccess(
        'Partner Removido',
        'El partner ha sido removido del módulo exitosamente. Se eliminaron todas sus transacciones y solicitudes pendientes.'
      );
    } catch (error) {
      console.error('Error removiendo partner:', error);
      showError(
        'Error al Remover',
        'Error al remover partner: ' + (error as Error).message
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleAmountChange = (value: string, setter: (value: string) => void) => {
    // Solo permitir números y punto decimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Filtrar inversores por búsqueda
  const filteredInversores = inversores.filter(inv => 
    !inversoresAsignados.some(asig => asig.id === inv.id) &&
    (inv.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (inv.apellido && inv.apellido.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Filtrar partners por búsqueda
  const filteredPartners = partners.filter(part => 
    !partnersAsignados.some(asig => asig.id === part.id) &&
    part.nombre.toLowerCase().includes(searchTermPartners.toLowerCase())
  );

  // Estado para almacenar saldos de partners
  const [partnerSaldos, setPartnerSaldos] = useState<{[key: string]: number}>({});

  // Cargar saldos de partners cuando se cargan los datos
  useEffect(() => {
    const loadPartnerSaldos = async () => {
      const saldos: {[key: string]: number} = {};
      for (const partner of filteredPartners) {
        try {
          const { data: transactions, error } = await supabase
            .from('transacciones')
            .select('monto, tipo')
            .eq('partner_id', partner.id)
            .eq('usuario_tipo', 'partner');

          if (!error && transactions) {
            let saldo = 0;
            transactions.forEach(transaction => {
              switch (transaction.tipo.toLowerCase()) {
                case 'deposito':
                  saldo += Number(transaction.monto);
                  break;
                case 'retiro':
                  saldo -= Number(transaction.monto);
                  break;
                case 'ganancia':
                  saldo += Number(transaction.monto);
                  break;
              }
            });
            saldos[partner.id] = saldo;
          } else {
            saldos[partner.id] = 0;
          }
        } catch (error) {
          saldos[partner.id] = 0;
        }
      }
      setPartnerSaldos(saldos);
    };

    if (filteredPartners.length > 0) {
      loadPartnerSaldos();
    }
  }, [filteredPartners.length]);

  if (loading) {
    return (
      <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sección de Asignados - Layout en Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inversores Asignados */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4">
            Inversores Asignados a {moduloNombre} ({inversoresAsignados.length})
          </h4>
          
          {inversoresAsignados.length === 0 ? (
            <p className="text-white/70 text-center py-8">No hay inversores asignados a este módulo</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {inversoresAsignados.map((inversor) => (
                <div key={inversor.id} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h5 className="text-white font-semibold">{inversor.nombre} {inversor.apellido}</h5>
                    <p className="text-white/70 text-sm">{inversor.email}</p>
                    <p className="text-green-300 text-sm">Saldo en módulo: {formatCurrency(inversor.saldo_modulo || 0)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoverInversor(inversor.id)}
                    disabled={processing === inversor.id}
                    className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>{processing === inversor.id ? 'Removiendo...' : 'Remover'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Partners Asignados */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4">
            Partners Asignados a {moduloNombre} ({partnersAsignados.length})
          </h4>
          
          {partnersAsignados.length === 0 ? (
            <p className="text-white/70 text-center py-8">No hay partners asignados a este módulo</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {partnersAsignados.map((partner) => (
                <div key={partner.id} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h5 className="text-white font-semibold">{partner.nombre}</h5>
                    <p className="text-white/70 text-sm">@{partner.username}</p>
                    <p className="text-green-300 text-sm">Saldo en módulo: {formatCurrency(partner.saldo_modulo || 0)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoverPartner(partner.id)}
                    disabled={processing === partner.id}
                    className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>{processing === partner.id ? 'Removiendo...' : 'Remover'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sección de Asignar - Layout en Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inversores Disponibles con Búsqueda */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4">Asignar Inversores</h4>
          
          {/* Barra de búsqueda */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-white/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Buscar inversor por nombre..."
              />
            </div>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {filteredInversores.length === 0 ? (
              <p className="text-white/70 text-center py-4">
                {searchTerm ? 'No se encontraron inversores con ese nombre' : 'No hay inversores disponibles para asignar'}
              </p>
            ) : (
              filteredInversores.map((inversor) => (
                <div key={inversor.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="text-white font-medium">{inversor.nombre} {inversor.apellido}</h5>
                      <p className="text-white/60 text-sm">{inversor.email}</p>
                      <p className="text-green-300 text-sm">Saldo principal: {formatCurrency(inversor.total || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTransferirInversor(inversor.id)}
                      disabled={processing === inversor.id || (inversor.total || 0) <= 0}
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 text-sm"
                      title="Transferir desde saldo principal"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Transferir</span>
                    </button>
                    <button
                      onClick={() => handleAsignarInversor(inversor.id)}
                      disabled={processing === inversor.id}
                      className="flex-1 flex items-center justify-center space-x-2 bg-green-500/20 text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nuevo Depósito</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Partners Disponibles con Búsqueda */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-cyan-200/30">
          <h4 className="text-lg font-bold text-white mb-4">Asignar Partners</h4>
          
          {/* Barra de búsqueda */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-white/60" />
              <input
                type="text"
                value={searchTermPartners}
                onChange={(e) => setSearchTermPartners(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Buscar partner por nombre..."
              />
            </div>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {filteredPartners.length === 0 ? (
              <p className="text-white/70 text-center py-4">
                {searchTermPartners ? 'No se encontraron partners con ese nombre' : 'No hay partners disponibles para asignar'}
              </p>
            ) : (
              filteredPartners.map((partner) => (
                <div key={partner.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="text-white font-medium">{partner.nombre}</h5>
                      <p className="text-white/60 text-sm">@{partner.username}</p>
                      <p className="text-green-300 text-sm">Saldo principal: {formatCurrency(partnerSaldos[partner.id] || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTransferirPartner(partner.id)}
                      disabled={processing === partner.id || (partnerSaldos[partner.id] || 0) <= 0}
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 text-sm"
                      title="Transferir desde saldo principal"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Transferir</span>
                    </button>
                    <button
                      onClick={() => handleAsignarPartner(partner.id)}
                      disabled={processing === partner.id}
                      className="flex-1 flex items-center justify-center space-x-2 bg-green-500/20 text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nuevo Depósito</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de depósito nuevo */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Asignar {showDepositModal.type === 'inversor' ? 'Inversor' : 'Partner'} con Depósito Nuevo
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                <strong>{showDepositModal.type === 'inversor' ? 'Inversor' : 'Partner'}:</strong> {showDepositModal.name}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Monto del Depósito Nuevo *
                </label>
                <input
                  type="text"
                  value={depositAmount}
                  onChange={(e) => handleAmountChange(e.target.value, setDepositAmount)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={depositDescription}
                  onChange={(e) => setDepositDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  placeholder="Descripción del depósito..."
                />
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <p className="text-green-800 text-sm">
                <strong>Depósito Directo:</strong> El depósito se procesará inmediatamente sin crear solicitud de aprobación.
              </p>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleDepositSubmit}
                disabled={!depositAmount || submittingDeposit}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingDeposit ? 'Procesando...' : 'Asignar y Depositar'}
              </button>
              <button
                onClick={() => {
                  setShowDepositModal(null);
                  setDepositAmount('');
                  setDepositDescription('');
                }}
                disabled={submittingDeposit}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de transferencia */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Asignar {showTransferModal.type === 'inversor' ? 'Inversor' : 'Partner'} con Transferencia
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                <strong>{showTransferModal.type === 'inversor' ? 'Inversor' : 'Partner'}:</strong> {showTransferModal.name}
              </p>
              <p className="text-blue-700 text-sm">
                <strong>Saldo Principal Disponible:</strong> {formatCurrency(showTransferModal.saldoPrincipal)}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Monto a Transferir *
                </label>
                <input
                  type="text"
                  value={transferAmount}
                  onChange={(e) => handleAmountChange(e.target.value, setTransferAmount)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
                {transferAmount && parseFloat(transferAmount) > showTransferModal.saldoPrincipal && (
                  <p className="text-red-500 text-xs mt-1">
                    El monto no puede ser mayor al saldo principal disponible
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-blue-800 text-sm">
                <strong>Transferencia:</strong> Se retirará del saldo principal y se depositará en este módulo.
              </p>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleTransferSubmit}
                disabled={!transferAmount || submittingTransfer || parseFloat(transferAmount || '0') > showTransferModal.saldoPrincipal}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingTransfer ? 'Procesando...' : 'Asignar con Transferencia'}
              </button>
              <button
                onClick={() => {
                  setShowTransferModal(null);
                  setTransferAmount('');
                }}
                disabled={submittingTransfer}
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

export default ModuloAsignaciones;
