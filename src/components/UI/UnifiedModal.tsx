import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface UnifiedModalProps {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
}

const UnifiedModal: React.FC<UnifiedModalProps> = ({
  show,
  type,
  title,
  message,
  onClose,
  confirmText = 'OK',
  onConfirm,
  cancelText = 'Cancelar'
}) => {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-600" />;
      default:
        return <Info className="w-8 h-8 text-blue-600" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-100',
          text: 'text-green-900',
          button: 'bg-green-500 hover:bg-green-600'
        };
      case 'error':
        return {
          bg: 'bg-red-100',
          text: 'text-red-900',
          button: 'bg-red-500 hover:bg-red-600'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-900',
          button: 'bg-yellow-500 hover:bg-yellow-600'
        };
      case 'info':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-900',
          button: 'bg-blue-500 hover:bg-blue-600'
        };
      default:
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-900',
          button: 'bg-blue-500 hover:bg-blue-600'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.bg}`}>
              {getIcon()}
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>
        
        <div className="flex space-x-3">
          {onConfirm ? (
            <>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 text-white py-2 px-4 rounded-lg transition-colors font-medium ${colors.button}`}
              >
                {confirmText}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                {cancelText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={`w-full text-white py-2 px-4 rounded-lg transition-colors font-medium ${colors.button}`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedModal;