import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Copy, MessageCircle, HelpCircle, Clock, AlertTriangle, X, Wallet, Mail, Hash, Save } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { handleAmountChange } from '../../utils/validation';

interface SolicitudPendiente {
  id: string;
  tipo: string;
  monto: number;
  fecha_solicitud: string;
  dias_pendiente: number;
}

interface EmailGuardado {
  email: string;
  fecha_guardado: string;
}

const SolicitudButtons: React.FC = () => {
  const { user } = useAuth();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [binanceEmail, setBinanceEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'email'>('wallet');
  const [saveEmail, setSaveEmail] = useState(false);
  const [emailsGuardados, setEmailsGuardados] = useState<EmailGuardado[]>([]);
  const [selectedSavedEmail, setSelectedSavedEmail] = useState('');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [saldoActual, setSaldoActual] = useState(0);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudPendiente[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSaldoActual(user.total);
      fetchSolicitudesPendientes();
      loadSavedEmails();
    }
  }, [user]);

  const loadSavedEmails = () => {
    if (!user) return;
    
    try {
      const saved = localStorage.getItem(`binance_emails_${user.id}`);
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
    if (!user) return;
    
    try {
      const newEmail: EmailGuardado = {
        email: email,
        fecha_guardado: new Date().toISOString()
      };
      
      // Evitar duplicados
      const emailsActuales = emailsGuardados.filter(e => e.email !== email);
      const emailsActualizados = [newEmail, ...emailsActuales].slice(0, 5); // Máximo 5 emails guardados
      
      localStorage.setItem(`binance_emails_${user.id}`, JSON.stringify(emailsActualizados));
      setEmailsGuardados(emailsActualizados);
    } catch (error) {
      console.error('Error saving email:', error);
    }
  };

  const fetchSolicitudesPendientes = async () => {
    if (!user) return;
    
    setLoadingSolicitudes(true);
    try {
      // Query solicitudes table directly
      const { data, error } = await supabase
        .from('solicitudes')
        .select('id, tipo, monto, fecha_solicitud')
        .eq('inversor_id', user.id)
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;
      
      // Calculate dias_pendiente for each request
      const solicitudesWithDays = (data || []).map(solicitud => {
        const fechaSolicitud = new Date(solicitud.fecha_solicitud);
        const ahora = new Date();
        const diffTime = Math.abs(ahora.getTime() - fechaSolicitud.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...solicitud,
          dias_pendiente: diffDays
        };
      });
      
      setSolicitudesPendientes(solicitudesWithDays);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  const validateTxHash = (hash: string): boolean => {
    // Validar que sea un hash de transacción válido (64 caracteres hexadecimales)
    const txHashRegex = /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/;
    return txHashRegex.test(hash);
  };

  const validateWalletAddress = (address: string): boolean => {
    // Validar dirección de wallet (formato básico)
    const walletRegex = /^[a-zA-Z0-9]{25,62}$/;
    return walletRegex.test(address);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleDepositSubmit = async () => {
    if (!user || !depositAmount || !txHash) return;
    
    const amount = parseInt(depositAmount);
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
      // Verificar si ya tiene una solicitud de depósito pendiente
      const { data: existingSolicitud, error: checkError } = await supabase
        .from('solicitudes')
        .select('id')
        .eq('inversor_id', user.id)
        .eq('tipo', 'deposito')
        .eq('estado', 'pendiente')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingSolicitud) {
        alert('Ya tienes una solicitud de depósito pendiente. Espera a que sea procesada antes de crear una nueva.');
        setLoading(false);
        return;
      }

      // Crear nueva solicitud que requiere aprobación
      const { error: insertError } = await supabase
        .from('solicitudes')
        .insert({
          inversor_id: user.id,
          tipo: 'deposito',
          monto: amount,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString(),
          notas: `TxHash: ${txHash}`
        });

      if (insertError) throw insertError;

      setShowDepositModal(false);
      resetDepositForm();
      setSuccessMessage('Solicitud de depósito enviada exitosamente con el TxHash proporcionado. Será revisada por el administrador antes de ser procesada.');
      setShowSuccessModal(true);
      fetchSolicitudesPendientes(); // Actualizar lista de pendientes
    } catch (error) {
      console.error('Error creating deposit request:', error);
      alert('Error al crear la solicitud. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!user || !withdrawAmount) return;
    
    const amount = parseInt(withdrawAmount);
    if (amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    // Verificar que el monto no sea mayor al saldo disponible
    if (amount > saldoActual) {
      alert('El monto no puede ser mayor a tu saldo disponible.');
      return;
    }

    // Validar información de pago
    let paymentInfo = '';
    let finalEmail = '';
    
    if (paymentMethod === 'wallet') {
      if (!walletAddress || !validateWalletAddress(walletAddress)) {
        alert('Por favor ingresa una dirección de wallet válida');
        return;
      }
      paymentInfo = `Wallet: ${walletAddress}`;
    } else {
      const emailToUse = selectedSavedEmail || binanceEmail;
      if (!emailToUse || !validateEmail(emailToUse)) {
        alert('Por favor ingresa un email de Binance válido');
        return;
      }
      finalEmail = emailToUse;
      paymentInfo = `Email Binance: ${finalEmail}`;
      
      // Mostrar confirmación del email antes de proceder
      if (!showEmailConfirmation) {
        setShowEmailConfirmation(true);
        return;
      }
    }

    setLoading(true);
    try {
      // Verificar si ya tiene una solicitud de retiro pendiente
      const { data: existingSolicitud, error: checkError } = await supabase
        .from('solicitudes')
        .select('id')
        .eq('inversor_id', user.id)
        .eq('tipo', 'retiro')
        .eq('estado', 'pendiente')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingSolicitud) {
        alert('Ya tienes una solicitud de retiro pendiente. Espera a que sea procesada antes de crear una nueva.');
        setLoading(false);
        return;
      }

      // Crear nueva solicitud que requiere aprobación
      const { error: insertError } = await supabase
        .from('solicitudes')
        .insert({
          inversor_id: user.id,
          tipo: 'retiro',
          monto: amount,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString(),
          notas: paymentInfo
        });

      if (insertError) throw insertError;

      // Guardar email si se seleccionó la opción
      if (paymentMethod === 'email' && saveEmail && finalEmail && !selectedSavedEmail) {
        saveEmailToStorage(finalEmail);
      }

      setShowWithdrawModal(false);
      resetWithdrawForm();
      setSuccessMessage(`Solicitud de retiro enviada exitosamente. Los fondos serán enviados a: ${paymentInfo}. Será revisada por el administrador antes de ser procesada.`);
      setShowSuccessModal(true);
      fetchSolicitudesPendientes(); // Actualizar lista de pendientes
    } catch (error) {
      console.error('Error creating withdraw request:', error);
      alert('Error al crear la solicitud. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const resetDepositForm = () => {
    setDepositAmount('');
    setTxHash('');
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount('');
    setWalletAddress('');
    setBinanceEmail('');
    setSelectedSavedEmail('');
    setPaymentMethod('wallet');
    setSaveEmail(false);
    setShowEmailConfirmation(false);
  };

  const handleDeleteSolicitud = async (solicitudId: string, tipo: string) => {
    if (!user) return;
    
    setDeletingId(solicitudId);
    try {
      const { error } = await supabase
        .from('solicitudes')
        .delete()
        .eq('id', solicitudId)
        .eq('inversor_id', user.id)
        .eq('estado', 'pendiente');

      if (error) throw error;

      // Actualizar la lista de solicitudes pendientes
      fetchSolicitudesPendientes();
      setSuccessMessage(`Solicitud de ${tipo} eliminada exitosamente.`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting solicitud:', error);
      alert('Error al eliminar la solicitud. Inténtalo más tarde.');
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyMessage('¡Email copiado al portapapeles!');
    setTimeout(() => setCopyMessage(''), 3000);
  };

  const openTelegram = () => {
    window.open('https://t.me/TheAlexRz92', '_blank');
  };

  const getSolicitudPendiente = (tipo: string) => {
    return solicitudesPendientes.find(s => s.tipo === tipo);
  };

  const depositoPendiente = getSolicitudPendiente('deposito');
  const retiroPendiente = getSolicitudPendiente('retiro');

  return (
    <>
      {/* Mostrar solicitudes pendientes */}
      {!loadingSolicitudes && solicitudesPendientes.length > 0 && (
        <div className="bg-yellow-500/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-yellow-200/30 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-yellow-300" />
            Solicitudes Pendientes (Click X para eliminar)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {solicitudesPendientes.map((solicitud, index) => (
              <div key={index} className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-semibold capitalize">
                      {solicitud.tipo === 'deposito' ? 'Depósito' : 'Retiro'}
                    </span>
                    <span className="text-yellow-300 font-bold">
                      {formatCurrency(solicitud.monto)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSolicitud(solicitud.id, solicitud.tipo)}
                    disabled={deletingId === solicitud.id}
                    className="p-1 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                    title="Eliminar solicitud"
                  >
                    {deletingId === solicitud.id ? (
                      <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin"></div>
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-white/70 text-sm">
                  <p>Enviado: {formatDate(solicitud.fecha_solicitud)}</p>
                  <p>Hace {solicitud.dias_pendiente} día(s)</p>
                </div>
                <div className="mt-2 flex items-center text-yellow-200 text-xs">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  <span>En proceso de validación - Click X para eliminar</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de Solicitud */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button
          onClick={() => setShowDepositModal(true)}
          disabled={!!depositoPendiente}
          className={`backdrop-blur-lg rounded-2xl p-6 shadow-2xl border transition-all duration-300 group ${
            depositoPendiente 
              ? 'bg-gray-500/20 border-gray-400/30 cursor-not-allowed opacity-60'
              : 'bg-green-500/20 border-green-200/30 hover:scale-105'
          }`}
        >
          <div className="flex items-center justify-center mb-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg transition-transform ${
              depositoPendiente 
                ? 'bg-gray-400'
                : 'bg-gradient-to-br from-green-400 to-green-600 group-hover:scale-110'
            }`}>
              {depositoPendiente ? (
                <Clock className="w-8 h-8 text-white" />
              ) : (
                <ArrowUpCircle className="w-8 h-8 text-white" />
              )}
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {depositoPendiente ? 'Depósito Pendiente' : 'Solicitar Depósito'}
          </h3>
          <p className={`text-sm ${depositoPendiente ? 'text-gray-300' : 'text-green-200'}`}>
            {depositoPendiente 
              ? `Tienes un depósito de ${formatCurrency(depositoPendiente.monto)} en proceso`
              : 'Envía una solicitud de depósito para aumentar tu capital'
            }
          </p>
        </button>

        <button
          onClick={() => setShowWithdrawModal(true)}
          disabled={!!retiroPendiente}
          className={`backdrop-blur-lg rounded-2xl p-6 shadow-2xl border transition-all duration-300 group ${
            retiroPendiente 
              ? 'bg-gray-500/20 border-gray-400/30 cursor-not-allowed opacity-60'
              : 'bg-red-500/20 border-red-200/30 hover:scale-105'
          }`}
        >
          <div className="flex items-center justify-center mb-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg transition-transform ${
              retiroPendiente 
                ? 'bg-gray-400'
                : 'bg-gradient-to-br from-red-400 to-red-600 group-hover:scale-110'
            }`}>
              {retiroPendiente ? (
                <Clock className="w-8 h-8 text-white" />
              ) : (
                <ArrowDownCircle className="w-8 h-8 text-white" />
              )}
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {retiroPendiente ? 'Retiro Pendiente' : 'Solicitar Retiro'}
          </h3>
          <p className={`text-sm ${retiroPendiente ? 'text-gray-300' : 'text-red-200'}`}>
            {retiroPendiente 
              ? `Tienes un retiro de ${formatCurrency(retiroPendiente.monto)} en proceso`
              : 'Envía una solicitud de retiro de tus ganancias'
            }
          </p>
          {!retiroPendiente && (
            <p className="text-red-100 text-xs mt-2">Saldo disponible: {formatCurrency(saldoActual)}</p>
          )}
        </button>
      </div>

      {/* Modal de Depósito */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <ArrowUpCircle className="w-6 h-6 mr-3 text-green-600" />
              Solicitar Depósito
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Monto del Depósito (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={depositAmount}
                    onChange={(e) => handleAmountChange(e.target.value, setDepositAmount)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ingrese el monto"
                    required
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Solo números enteros, sin comas ni decimales</p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  TxHash de la Transacción *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0x... o hash de 64 caracteres"
                    required
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Hash de la transacción de tu depósito (64 caracteres hexadecimales)
                </p>
                {txHash && !validateTxHash(txHash) && (
                  <p className="text-red-500 text-xs mt-1">
                    TxHash inválido. Debe tener 64 caracteres hexadecimales
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <strong>Importante:</strong> El TxHash es necesario para verificar tu depósito en la blockchain.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleDepositSubmit}
                disabled={loading || !depositAmount || !txHash || parseInt(depositAmount) <= 0 || !validateTxHash(txHash)}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  resetDepositForm();
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Retiro */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <ArrowDownCircle className="w-6 h-6 mr-3 text-red-600" />
              Solicitar Retiro
            </h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Saldo disponible:</strong> {formatCurrency(saldoActual)}
                </p>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Monto del Retiro (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => handleAmountChange(e.target.value, setWithdrawAmount)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ingrese el monto"
                    max={saldoActual}
                    required
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Solo números enteros, sin comas ni decimales</p>
                {withdrawAmount && parseInt(withdrawAmount) > saldoActual && (
                  <p className="text-red-500 text-xs mt-1">
                    El monto no puede ser mayor a su saldo disponible
                  </p>
                )}
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Método de Retiro *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'wallet'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-medium">Wallet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('email')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'email'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span className="text-sm font-medium">Email Binance</span>
                  </button>
                </div>
              </div>

              {/* Wallet Address */}
              {paymentMethod === 'wallet' && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Dirección de Wallet *
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Dirección de tu wallet"
                      required
                    />
                  </div>
                  {walletAddress && !validateWalletAddress(walletAddress) && (
                    <p className="text-red-500 text-xs mt-1">
                      Dirección de wallet inválida
                    </p>
                  )}
                </div>
              )}

              {/* Email Binance */}
              {paymentMethod === 'email' && (
                <div className="space-y-3">
                  {/* Emails guardados */}
                  {emailsGuardados.length > 0 && (
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Emails Guardados
                      </label>
                      <select
                        value={selectedSavedEmail}
                        onChange={(e) => {
                          setSelectedSavedEmail(e.target.value);
                          setBinanceEmail('');
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      {selectedSavedEmail ? 'O ingresa un nuevo email' : 'Email de Binance *'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={binanceEmail}
                        onChange={(e) => {
                          setBinanceEmail(e.target.value);
                          setSelectedSavedEmail('');
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="tu-email@binance.com"
                        required={!selectedSavedEmail}
                      />
                    </div>
                    {binanceEmail && !validateEmail(binanceEmail) && (
                      <p className="text-red-500 text-xs mt-1">
                        Email inválido
                      </p>
                    )}
                  </div>

                  {/* Opción de guardar email */}
                  {binanceEmail && !selectedSavedEmail && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="save_email"
                        checked={saveEmail}
                        onChange={(e) => setSaveEmail(e.target.checked)}
                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                      />
                      <label htmlFor="save_email" className="text-sm text-gray-700 flex items-center space-x-1">
                        <Save className="w-4 h-4" />
                        <span>Guardar este email para futuras solicitudes</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmación de email */}
              {showEmailConfirmation && paymentMethod === 'email' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h4 className="text-yellow-800 font-semibold">Confirmar Email de Destino</h4>
                  </div>
                  <p className="text-yellow-700 text-sm mb-3">
                    Los fondos serán enviados al siguiente email de Binance:
                  </p>
                  <div className="bg-white border border-yellow-300 rounded p-3 mb-3">
                    <p className="font-mono text-gray-900 break-all">
                      {selectedSavedEmail || binanceEmail}
                    </p>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    ¿Confirmas que este es el email correcto para recibir los fondos?
                  </p>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">
                  <strong>Importante:</strong> Verifica que la información de {paymentMethod === 'wallet' ? 'wallet' : 'email'} sea correcta. 
                  Los fondos se enviarán a la dirección proporcionada.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              {showEmailConfirmation && paymentMethod === 'email' ? (
                <>
                  <button
                    onClick={handleWithdrawSubmit}
                    disabled={loading}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enviando...' : 'Confirmar y Enviar'}
                  </button>
                  <button
                    onClick={() => setShowEmailConfirmation(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Revisar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={paymentMethod === 'email' ? () => setShowEmailConfirmation(true) : handleWithdrawSubmit}
                    disabled={
                      loading || 
                      !withdrawAmount || 
                      parseInt(withdrawAmount) <= 0 || 
                      parseInt(withdrawAmount) > saldoActual ||
                      (paymentMethod === 'wallet' && (!walletAddress || !validateWalletAddress(walletAddress))) ||
                      (paymentMethod === 'email' && !selectedSavedEmail && (!binanceEmail || !validateEmail(binanceEmail)))
                    }
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enviando...' : paymentMethod === 'email' ? 'Revisar y Continuar' : 'Enviar Solicitud'}
                  </button>
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      resetWithdrawForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Solicitud Enviada</h3>
            
            <div className="flex items-start space-x-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-gray-600">{successMessage}</p>
            </div>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SolicitudButtons;