import React, { useState } from 'react';
import { HelpCircle, X, Copy, MessageCircle } from 'lucide-react';

const HelpChat: React.FC = () => {
  const [showChat, setShowChat] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

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
        <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Soporte CVM Capital</h3>
                  <p className="text-xs text-blue-100">Estamos aquí para ayudarte</p>
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
          <div className="p-4">
            {/* Mensaje del sistema */}
            <div className="mb-4">
              <div className="bg-gray-100 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Soporte CVM</span>
                </div>
                <p className="text-sm text-gray-700">
                  ¡Hola! Para ayuda o creación de ticket, favor de comunicarse por:
                </p>
              </div>
            </div>

            {/* Opciones de contacto */}
            <div className="space-y-3">
              <button
                onClick={() => copyToClipboard('pnf.alexisruiz@gmail.com')}
                className="w-full flex items-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <Copy className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="text-blue-600 font-medium">Correo</p>
                  <p className="text-sm text-blue-500">pnf.alexisruiz@gmail.com</p>
                </div>
              </button>

              <button
                onClick={openTelegram}
                className="w-full flex items-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <MessageCircle className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="text-blue-600 font-medium">Telegram</p>
                  <p className="text-sm text-blue-500">@TheAlexRz92</p>
                </div>
              </button>
            </div>

            {/* Mensaje de confirmación */}
            {copyMessage && (
              <div className="mt-3 p-2 bg-green-100 text-green-700 text-sm rounded-lg text-center animate-in fade-in duration-300">
                {copyMessage}
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Tiempo de respuesta: 24-48 horas
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpChat;