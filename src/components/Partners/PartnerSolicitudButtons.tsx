import React, { useState } from 'react';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Copy, MessageCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { usePartner } from '../../contexts/PartnerContext';

const PartnerSolicitudButtons: React.FC = () => {
  const { partner } = usePartner();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const handleDepositSubmit = async () => {
    if (!partner || !depositAmount) return;
    
    const amount = parseInt(depositAmount);
    if (amount <= 0) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('partner_solicitudes')
        .insert({
          partner_id: partner.id,
          tipo: 'deposito',
          monto: amount
        });

      if (error) throw error;

      setShowDepositModal(false);
      setDepositAmount('');
      setSuccessMessage('Estaremos validando su depósito, por favor espere un mínimo de 24H. De haber pasado 24H y no se refleje comuníquese por Correo: pnf.alexisruiz@gmail.com o Telegram: @TheAlexRz92');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating deposit request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!partner || !withdrawAmount) return;
    
    const amount = parseInt(withdrawAmount);
    if (amount <= 0) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('partner_solicitudes')
        .insert({
          partner_id: partner.id,
          tipo: 'retiro',
          monto: amount
        });

      if (error) throw error;

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setSuccessMessage('Estaremos validando su retiro, por favor espere un mínimo de 48H. De h aber pasado 48H y no se refleje comuníquese por Correo: pnf.alexisruiz@gmail.com o Telegram: @TheAlexRz92');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating withdraw request:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyMessage('¡Correo copiado al portapapeles!');
    setTimeout(() => setCopyMessage(''), 3000);
  };

  const openTelegram = () => {
    window.open('https://t.me/TheAlexRz92', '_blank');
  };

  return (
    <>
      {/* Botones de Solicitud */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button
          onClick={() => setShowDepositModal(true)}
          className="bg-green-500/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-green-200/30 hover:scale-105 transition-all duration-300 group"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <ArrowUpCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Solicitar Depósito</h3>
          <p className="text-green-200 text-sm">Envía una solicitud de depósito para aumentar tu inversión</p>
        </button>

        <button
          onClick={() => setShowWithdrawModal(true)}
          className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-red-200/30 hover:scale-105 transition-all duration-300 group"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <ArrowDownCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Solicitar Retiro</h3>
          <p className="text-red-200 text-sm">Envía una solicitud de retiro de tu inversión</p>
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
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Monto del Depósito (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ingrese el monto"
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">Solo se permiten números enteros</p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleDepositSubmit}
                disabled={loading || !depositAmount || parseInt(depositAmount) <= 0}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositAmount('');
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <ArrowDownCircle className="w-6 h-6 mr-3 text-red-600" />
              Solicitar Retiro
            </h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Monto del Retiro (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ingrese el monto"
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">Solo se permiten números enteros</p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleWithdrawSubmit}
                disabled={loading || !withdrawAmount || parseInt(withdrawAmount) <= 0}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Solicitud Enviada</h3>
            
            <p className="text-gray-600 mb-6">{successMessage}</p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => copyToClipboard('pnf.alexisruiz@gmail.com')}
                className="w-full flex items-center justify-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5 text-blue-600" />
                <span className="text-blue-600 font-medium">pnf.alexisruiz@gmail.com</span>
              </button>

              <button
                onClick={openTelegram}
                className="w-full flex items-center justify-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span className="text-blue-600 font-medium">Telegram: @TheAlexRz92</span>
              </button>
            </div>

            {copyMessage && (
              <div className="mb-4 p-2 bg-green-100 text-green-700 text-sm rounded-lg text-center">
                {copyMessage}
              </div>
            )}
            
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

export default PartnerSolicitudButtons;