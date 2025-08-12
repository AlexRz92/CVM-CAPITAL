import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, X, DollarSign, Package, Hash, Wallet, Mail, AlertTriangle, Check, Save, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useModulo } from '../../contexts/ModuloContext';

interface FloatingTransferButtonProps {
  userId?: string;
  userType: 'inversor' | 'partner';
  showPanel?: boolean;
  setShowPanel?: (show: boolean) => void;
  setShowOtherPanels?: () => void;
}

interface Modulo {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface SolicitudPendiente {
  id: string;
  tipo: 'transferencia' | 'deposito' | 'retiro';
  monto: number;
  fecha_solicitud: string;
  modulo_nombre?: string;
  notas?: string;
  dias_pendiente: number;
}

interface EmailGuardado {
  email: string;
  fecha_guardado: string;
}

const FloatingTransferButton: React.FC<FloatingTransferButtonProps> = ({ 
  userId, 
  userType, 
  showPanel: externalShowPanel, 
  setShowPanel: externalSetShowPanel,
  setShowOtherPanels 
}) => {
  const { modulos, verificarAcceso } = useModulo();
  const [internalShowPanel, setInternalShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'transferencia' | 'deposito' | 'retiro'>('transferencia');
  const [modulosAccesibles, setModulosAccesibles] = useState<Modulo[]>([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados para transferencia
  const [moduloOrigen, setModuloOrigen] = useState('');
  const [moduloDestino, setModuloDestino] = useState('');
  const [montoTransferencia, setMontoTransferencia] = useState('');

  // Estados para depósito
  const [moduloDeposito, setModuloDeposito] = useState('');
  const [montoDeposito, setMontoDeposito] = useState('');
  const [txHash, setTxHash] = useState('');

  // Estados para retiro
  const [moduloRetiro, setModuloRetiro] = useState('');
  const [montoRetiro, setMontoRetiro] = useState('');
  const [metodoRetiro, setMetodoRetiro] = useState<'wallet' | 'email'>('wallet');
  const [walletAddress, setWalletAddress] = useState('');
  const [redWallet, setRedWallet] = useState('');
  const [emailBinance, setEmailBinance] = useState('');
  const [saveEmail, setSaveEmail] = useState(false);
  const [emailsGuardados, setEmailsGuardados] = useState<EmailGuardado[]>([]);
  const [selectedSavedEmail, setSelectedSavedEmail] = useState('');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  // Estados para modales
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Usar estado externo si está disponible, sino usar estado interno
  const showPanel = externalShowPanel !== undefined ? externalShowPanel : internalShowPanel;
  const setShowPanel = externalSetShowPanel || setInternalShowPanel;

  useEffect(() => {
    if (userId && showPanel) {
      verificarAccesoModulos();
      fetchSolicitudesPendientes();
      loadSavedEmails();
    }
  }, [userId, userType, showPanel, modulos]);

  const verificarAccesoModulos = async () => {
    if (!userId) return;
    
    try {
      const accesos = await Promise.all(
        modulos.map(async (modulo) => {
          const tieneAcceso = await verificarAcceso(modulo.id, userId, userType);
          return tieneAcceso ? modulo : null;
        })
      );
      
      const modulosConAcceso = accesos.filter(Boolean) as Modulo[];
      setModulosAccesibles(modulosConAcceso);
    } catch (error) {
      console.error('Error verificando acceso a módulos:', error);
    }
  };

  const fetchSolicitudesPendientes = async () => {
    if (!userId) return;
    
    try {
      const solicitudes: SolicitudPendiente[] = [];
      
      // Obtener solicitudes de módulos
      const tableName = userType === 'inversor' ? 'modulo_solicitudes' : 'modulo_partner_solicitudes';
      const userField = userType === 'inversor' ? 'inversor_id' : 'partner_id';
      
      const { data: solicitudesModulo, error } = await supabase
        .from(tableName)
        .select(`
          id,
          tipo,
          monto,
          fecha_solicitud,
          notas,
          modulos_independientes (
            nombre
          )
        `)
        .eq(userField, userId)
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;

      solicitudesModulo?.forEach(solicitud => {
        const fechaSolicitud = new Date(solicitud.fecha_solicitud);
        const ahora = new Date();
        const diffTime = Math.abs(ahora.getTime() - fechaSolicitud.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        solicitudes.push({
          id: solicitud.id,
          tipo: solicitud.tipo as 'transferencia' | 'deposito' | 'retiro',
          monto: solicitud.monto,
          fecha_solicitud: solicitud.fecha_solicitud,
          modulo_nombre: solicitud.modulos_independientes?.nombre,
          notas: solicitud.notas,
          dias_pendiente: diffDays
        });
      });

      setSolicitudesPendientes(solicitudes);
    } catch (error) {
      console.error('Error fetching pending transfer requests:', error);
    }
  };

  const loadSavedEmails = () => {
    if (!userId) return;
    
    try {
      const saved = localStorage.getItem(`binance_emails_${userId}`);
      if (saved) {
        const emails = JSON.parse(saved);
        setEmailsGuardados(emails);
      }
    } catch (error) {
      console.error('Error loading saved emails:', error);
      setEmailsGuardados([]);
    }
  };

  const saveEmailToStorage = (email: string) => {
    if (!userId) return;
    
    try {
      const newEmail: EmailGuardado = {
        email: email,
        fecha_guardado: new Date().toISOString()
      };
      
      const emailsActuales = emailsGuardados.filter(e => e.email !== email);
      const emailsActualizados = [newEmail, ...emailsActuales].slice(0, 5);
      
      localStorage.setItem(`binance_emails_${userId}`, JSON.stringify(emailsActualizados));
      setEmailsGuardados(emailsActualizados);
    } catch (error) {
      console.error('Error saving email:', error);
    }
  };

  const handleAmountChange = (value: string, setter: (value: string) => void) => {
    if (value.startsWith('0') && value.length > 1) return;
    if (value.includes(',')) return;
    
    if (value === '' || /^\d+$/.test(value)) {
      setter(value);
    }
  };

  const validateTxHash = (hash: string): boolean => {
    const txHashRegex = /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/;
    return txHashRegex.test(hash);
  };

  const validateWalletAddress = (address: string): boolean => {
    const walletRegex = /^[a-zA-Z0-9]{25,62}$/;
    return walletRegex.test(address);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleTransferenciaSubmit = async () => {
    if (!userId || !moduloOrigen || !moduloDestino || !montoTransferencia) return;
    
    if (moduloOrigen === moduloDestino) {
      alert('No puedes transferir al mismo módulo');
      return;
    }

    const amount = parseInt(montoTransferencia);
    if (amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const moduloOrigenNombre = modulosAccesibles.find(m => m.id === moduloOrigen)?.nombre || 'Módulo Origen';
      const moduloDestinoNombre = modulosAccesibles.find(m => m.id === moduloDestino)?.nombre || 'Módulo Destino';
      
      const tableName = userType === 'inversor' ? 'modulo_solicitudes' : 'modulo_partner_solicitudes';
      const userField = userType === 'inversor' ? 'inversor_id' : 'partner_id';
      
      const { error } = await supabase
        .from(tableName)
        .insert({
          modulo_id: moduloOrigen, // Se usa el módulo origen como referencia
          [userField]: userId,
          tipo: 'transferencia',
          monto: amount,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString(),
          notas: `Transferencia de ${formatCurrency(amount)} desde ${moduloOrigenNombre} hacia ${moduloDestinoNombre}. Origen: ${moduloOrigen}, Destino: ${moduloDestino}.`
        });

      if (error) throw error;

      resetTransferenciaForm();
      setSuccessMessage('Solicitud de transferencia enviada exitosamente. Será revisada por el administrador.');
      setShowSuccessModal(true);
      fetchSolicitudesPendientes();
    } catch (error) {
      console.error('Error creating transfer request:', error);
      alert('Error al crear la solicitud de transferencia.');
    } finally {
      setLoading(false);
    }
  };

  const handleDepositoSubmit = async () => {
    if (!userId || !moduloDeposito || !montoDeposito || !txHash) return;
    
    const amount = parseInt(montoDeposito);
    if (amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (!validateTxHash(txHash)) {
      alert('Por favor ingresa un TxHash válido (64 caracteres hexadecimales)');
      return;
    }

    setLoading(true);
    try {
      const moduloNombre = modulosAccesibles.find(m => m.id === moduloDeposito)?.nombre || 'Módulo';
      
      const tableName = userType === 'inversor' ? 'modulo_solicitudes' : 'modulo_partner_solicitudes';
      const userField = userType === 'inversor' ? 'inversor_id' : 'partner_id';
      
      const { error } = await supabase
        .from(tableName)
        .insert({
          modulo_id: moduloDeposito,
          [userField]: userId,
          tipo: 'deposito',
          monto: amount,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString(),
          notas: `TxHash: ${txHash}`
        });

      if (error) throw error;

      resetDepositoForm();
      setSuccessMessage(`Solicitud de depósito al módulo ${moduloNombre} enviada exitosamente con TxHash: ${txHash}`);
      setShowSuccessModal(true);
      fetchSolicitudesPendientes();
    } catch (error) {
      console.error('Error creating deposit request:', error);
      alert('Error al crear la solicitud de depósito.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetiroSubmit = async () => {
    if (!userId || !moduloRetiro || !montoRetiro) return;
    
    const amount = parseInt(montoRetiro);
    if (amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    let paymentInfo = '';
    let finalEmail = '';
    
    if (metodoRetiro === 'wallet') {
      if (!walletAddress || !validateWalletAddress(walletAddress) || !redWallet) {
        alert('Por favor completa la dirección de wallet y la red');
        return;
      }
      paymentInfo = `Wallet: ${walletAddress}, Red: ${redWallet}`;
    } else {
      const emailToUse = selectedSavedEmail || emailBinance;
      if (!emailToUse || !validateEmail(emailToUse)) {
        alert('Por favor ingresa un email de Binance válido');
        return;
      }
      finalEmail = emailToUse;
      paymentInfo = `Email Binance: ${finalEmail}`;
      
      if (!showEmailConfirmation) {
        setShowEmailConfirmation(true);
        return;
      }
    }

    setLoading(true);
    try {
      const moduloNombre = modulosAccesibles.find(m => m.id === moduloRetiro)?.nombre || 'Módulo';
      
      const tableName = userType === 'inversor' ? 'modulo_solicitudes' : 'modulo_partner_solicitudes';
      const userField = userType === 'inversor' ? 'inversor_id' : 'partner_id';
      
      const { error } = await supabase
        .from(tableName)
        .insert({
          modulo_id: moduloRetiro,
          [userField]: userId,
          tipo: 'retiro',
          monto: amount,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString(),
          notas: paymentInfo
        });

      if (error) throw error;

      // Guardar email si se seleccionó la opción
      if (metodoRetiro === 'email' && saveEmail && finalEmail && !selectedSavedEmail) {
        saveEmailToStorage(finalEmail);
      }

      resetRetiroForm();
      setSuccessMessage(`Solicitud de retiro del módulo ${moduloNombre} enviada exitosamente. Método: ${paymentInfo}`);
      setShowSuccessModal(true);
      fetchSolicitudesPendientes();
    } catch (error) {
      console.error('Error creating withdraw request:', error);
      alert('Error al crear la solicitud de retiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSolicitud = async (solicitudId: string, tipo: string) => {
    setDeletingId(solicitudId);
    try {
      const tableName = userType === 'inversor' ? 'modulo_solicitudes' : 'modulo_partner_solicitudes';
      const userField = userType === 'inversor' ? 'inversor_id' : 'partner_id';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', solicitudId)
        .eq(userField, userId)
        .eq('estado', 'pendiente');

      if (error) throw error;

      fetchSolicitudesPendientes();
      setSuccessMessage(`Solicitud de ${tipo} cancelada exitosamente.`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting solicitud:', error);
      alert('Error al cancelar la solicitud.');
    } finally {
      setDeletingId(null);
    }
  };

  const resetTransferenciaForm = () => {
    setModuloOrigen('');
    setModuloDestino('');
    setMontoTransferencia('');
  };

  const resetDepositoForm = () => {
    setModuloDeposito('');
    setMontoDeposito('');
    setTxHash('');
  };

  const resetRetiroForm = () => {
    setModuloRetiro('');
    setMontoRetiro('');
    setWalletAddress('');
    setRedWallet('');
    setEmailBinance('');
    setSelectedSavedEmail('');
    setMetodoRetiro('wallet');
    setSaveEmail(false);
    setShowEmailConfirmation(false);
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

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'transferencia':
        return <ArrowRightLeft className="w-4 h-4" />;
      case 'deposito':
        return <ArrowUpCircle className="w-4 h-4" />;
      case 'retiro':
        return <ArrowDownCircle className="w-4 h-4" />;
      default:
        return <ArrowRightLeft className="w-4 h-4" />;
    }
  };

  const getTabColor = (tab: string) => {
    switch (tab) {
      case 'transferencia':
        return activeTab === tab ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'deposito':
        return activeTab === tab ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'retiro':
        return activeTab === tab ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      {/* Botón Flotante */}
      <button
        onClick={() => {
          setShowPanel(!showPanel);
          if (setShowOtherPanels) {
            setShowOtherPanels();
          }
        }}
        className="fixed bottom-24 sm:bottom-24 right-4 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 animate-pulse"
        title="Transferencias entre Módulos"
      > 
        <ArrowRightLeft className="w-8 h-8" />
        {solicitudesPendientes.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-bounce">
            {solicitudesPendientes.length > 9 ? '9+' : solicitudesPendientes.length}
          </span>
        )}
      </button>

      {/* Panel de Transferencias */}
      {showPanel && (
        <div className="fixed bottom-16 sm:bottom-24 right-2 sm:right-24 w-[calc(100vw-1rem)] sm:w-96 max-w-sm sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-in slide-in-from-bottom-4 duration-300 max-h-[70vh] sm:max-h-[75vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-3 sm:p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Operaciones entre Módulos</h3>
                  <p className="text-xs text-blue-100 hidden sm:block">Transferencias, Depósitos y Retiros</p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Solicitudes Pendientes */}
          {solicitudesPendientes.length > 0 && (
            <div className="p-3 sm:p-4 bg-yellow-50 border-b border-yellow-200">
              <h4 className="text-xs sm:text-sm font-semibold text-yellow-800 mb-2">
                Solicitudes Pendientes ({solicitudesPendientes.length})
              </h4>
              <div className="space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
                {solicitudesPendientes.map((solicitud) => (
                  <div key={solicitud.id} className="bg-white rounded-lg p-2 sm:p-3 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900 capitalize">
                          {solicitud.tipo} - {formatCurrency(solicitud.monto)}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {solicitud.modulo_nombre} • Hace {solicitud.dias_pendiente} día(s)
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSolicitud(solicitud.id, solicitud.tipo)}
                        disabled={deletingId === solicitud.id}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                        title="Cancelar solicitud"
                      >
                        {deletingId === solicitud.id ? (
                          <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex space-x-1 sm:space-x-2">
              {(['transferencia', 'deposito', 'retiro'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${getTabColor(tab)}`}
                >
                  {getTabIcon(tab)}
                  <span className="capitalize hidden sm:inline">{tab}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {/* Tab Transferencia */}
            {activeTab === 'transferencia' && (
              <div className="space-y-3 sm:space-y-4">
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Transferir entre Módulos</h4>
                
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                      Módulo Origen *
                    </label>
                    <select
                      value={moduloOrigen}
                      onChange={(e) => setModuloOrigen(e.target.value)}
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    >
                      <option value="">Seleccionar origen</option>
                      {modulosAccesibles.map((modulo) => (
                        <option key={modulo.id} value={modulo.id}>
                          {modulo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                      Módulo Destino *
                    </label>
                    <select
                      value={moduloDestino}
                      onChange={(e) => setModuloDestino(e.target.value)}
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    >
                      <option value="">Seleccionar destino</option>
                      {modulosAccesibles
                        .filter(m => m.id !== moduloOrigen)
                        .map((modulo) => (
                          <option key={modulo.id} value={modulo.id}>
                            {modulo.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                    Monto a Transferir (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 sm:left-3 top-2 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      value={montoTransferencia}
                      onChange={(e) => handleAmountChange(e.target.value, setMontoTransferencia)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Monto"
                      required
                    />
                  </div>
                </div>

                {moduloOrigen === moduloDestino && moduloOrigen && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">
                      No puedes transferir al mismo módulo
                    </p>
                  </div>
                )}

                <button
                  onClick={handleTransferenciaSubmit}
                  disabled={loading || !moduloOrigen || !moduloDestino || !montoTransferencia || moduloOrigen === moduloDestino}
                  className="w-full bg-blue-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Enviando...' : 'Solicitar Transferencia'}
                </button>
              </div>
            )}

            {/* Tab Depósito */}
            {activeTab === 'deposito' && (
              <div className="space-y-3 sm:space-y-4">
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Depositar a Módulo</h4>
                
                <div>
                  <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                    Módulo Destino *
                  </label>
                  <select
                    value={moduloDeposito}
                    onChange={(e) => setModuloDeposito(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  >
                    <option value="">Seleccionar módulo</option>
                    {modulosAccesibles.map((modulo) => (
                      <option key={modulo.id} value={modulo.id}>
                        {modulo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                    Monto del Depósito (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 sm:left-3 top-2 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      value={montoDeposito}
                      onChange={(e) => handleAmountChange(e.target.value, setMontoDeposito)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="Monto"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                    TxHash de la Transacción *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-2 sm:left-3 top-2 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="0x... o hash de 64 caracteres"
                      required
                    />
                  </div>
                  {txHash && !validateTxHash(txHash) && (
                    <p className="text-red-500 text-xs mt-1">
                      TxHash inválido. Debe tener 64 caracteres hexadecimales
                    </p>
                  )}
                </div>

                <button
                  onClick={handleDepositoSubmit}
                  disabled={loading || !moduloDeposito || !montoDeposito || !txHash || !validateTxHash(txHash)}
                  className="w-full bg-green-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Enviando...' : 'Solicitar Depósito'}
                </button>
              </div>
            )}

            {/* Tab Retiro */}
            {activeTab === 'retiro' && (
              <div className="space-y-3 sm:space-y-4">
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Retirar de Módulo</h4>
                
                <div>
                  <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                    Módulo Origen *
                  </label>
                  <select
                    value={moduloRetiro}
                    onChange={(e) => setModuloRetiro(e.target.value)}
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    required
                  >
                    <option value="">Seleccionar módulo</option>
                    {modulosAccesibles.map((modulo) => (
                      <option key={modulo.id} value={modulo.id}>
                        {modulo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                    Monto del Retiro (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 sm:left-3 top-2 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      value={montoRetiro}
                      onChange={(e) => handleAmountChange(e.target.value, setMontoRetiro)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      placeholder="Monto"
                      required
                    />
                  </div>
                </div>

                {/* Método de retiro */}
                <div>
                  <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                    Método de Retiro *
                  </label>
                  <div className="grid grid-cols-2 gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoRetiro('wallet')}
                      className={`flex items-center justify-center space-x-1 sm:space-x-2 p-2 sm:p-3 rounded-lg border-2 transition-colors ${
                        metodoRetiro === 'wallet'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">Wallet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoRetiro('email')}
                      className={`flex items-center justify-center space-x-1 sm:space-x-2 p-2 sm:p-3 rounded-lg border-2 transition-colors ${
                        metodoRetiro === 'email'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">Email</span>
                    </button>
                  </div>
                </div>

                {/* Campos específicos por método */}
                {metodoRetiro === 'wallet' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                        Dirección de Wallet *
                      </label>
                      <div className="relative">
                        <Wallet className="absolute left-2 sm:left-3 top-2 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        <input
                          type="text"
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          placeholder="Dirección de tu wallet"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                        Red *
                      </label>
                      <select
                        value={redWallet}
                        onChange={(e) => setRedWallet(e.target.value)}
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        required
                      >
                        <option value="">Seleccionar red</option>
                        <option value="BEP20">BEP20 (BSC)</option>
                        <option value="ERC20">ERC20 (Ethereum)</option>
                        <option value="TRC20">TRC20 (Tron)</option>
                        <option value="Polygon">Polygon</option>
                        <option value="Arbitrum">Arbitrum</option>
                        <option value="Optimism">Optimism</option>
                      </select>
                    </div>
                  </div>
                )}

                {metodoRetiro === 'email' && (
                  <div className="space-y-3">
                    {/* Emails guardados */}
                    {emailsGuardados.length > 0 && (
                      <div>
                        <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                          Emails Guardados
                        </label>
                        <select
                          value={selectedSavedEmail}
                          onChange={(e) => {
                            setSelectedSavedEmail(e.target.value);
                            setEmailBinance('');
                          }}
                          className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        >
                          <option value="">Seleccionar email guardado</option>
                          {emailsGuardados.map((emailData, index) => (
                            <option key={index} value={emailData.email}>
                              {emailData.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Nuevo email */}
                    <div>
                      <label className="block text-gray-700 text-xs sm:text-sm font-medium mb-2">
                        {selectedSavedEmail ? 'O ingresa un nuevo email' : 'Email de Binance *'}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-2 sm:left-3 top-2 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        <input
                          type="email"
                          value={emailBinance}
                          onChange={(e) => {
                            setEmailBinance(e.target.value);
                            setSelectedSavedEmail('');
                          }}
                          className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          placeholder="tu-email@binance.com"
                          required={!selectedSavedEmail}
                        />
                      </div>
                    </div>

                    {/* Opción de guardar email */}
                    {emailBinance && !selectedSavedEmail && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="save_email_transfer"
                          checked={saveEmail}
                          onChange={(e) => setSaveEmail(e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                        />
                        <label htmlFor="save_email_transfer" className="text-xs sm:text-sm text-gray-700 flex items-center space-x-1">
                          <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Guardar este email</span>
                          <span className="sm:hidden">Guardar</span>
                        </label>
                      </div>
                    )}

                    {/* Confirmación de email */}
                    {showEmailConfirmation && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                          <h4 className="text-yellow-800 font-semibold text-sm sm:text-base">Confirmar Email</h4>
                        </div>
                        <p className="text-yellow-700 text-xs sm:text-sm mb-3">
                          Los fondos serán enviados a:
                        </p>
                        <div className="bg-white border border-yellow-300 rounded p-2 sm:p-3 mb-3">
                          <p className="font-mono text-gray-900 break-all text-xs sm:text-sm">
                            {selectedSavedEmail || emailBinance}
                          </p>
                        </div>
                        <p className="text-yellow-700 text-xs sm:text-sm">
                          ¿Confirmas que este email es correcto?
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex space-x-2 sm:space-x-3">
                  {showEmailConfirmation && metodoRetiro === 'email' ? (
                    <>
                      <button
                        onClick={handleRetiroSubmit}
                        disabled={loading}
                        className="flex-1 bg-red-500 text-white py-2 sm:py-3 px-2 sm:px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                      >
                        {loading ? 'Enviando...' : 'Confirmar y Enviar'}
                      </button>
                      <button
                        onClick={() => setShowEmailConfirmation(false)}
                        className="flex-1 bg-gray-200 text-gray-800 py-2 sm:py-3 px-2 sm:px-4 rounded-lg hover:bg-gray-300 transition-colors text-xs sm:text-sm"
                      >
                        Revisar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={metodoRetiro === 'email' ? () => setShowEmailConfirmation(true) : handleRetiroSubmit}
                      disabled={
                        loading || 
                        !moduloRetiro || 
                        !montoRetiro ||
                        (metodoRetiro === 'wallet' && (!walletAddress || !redWallet || !validateWalletAddress(walletAddress))) ||
                        (metodoRetiro === 'email' && !selectedSavedEmail && (!emailBinance || !validateEmail(emailBinance)))
                      }
                      className="w-full bg-red-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {loading ? 'Enviando...' : metodoRetiro === 'email' ? 'Revisar y Continuar' : 'Solicitar Retiro'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Solicitud Enviada</h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">{successMessage}</p>
            </div>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-blue-500 text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingTransferButton;
