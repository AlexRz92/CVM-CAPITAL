import { useState } from 'react';

interface ModalState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
}

export const useModal = () => {
  const [modalState, setModalState] = useState<ModalState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showModal = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      onConfirm?: () => void;
      cancelText?: string;
    }
  ) => {
    setModalState({
      show: true,
      type,
      title,
      message,
      confirmText: options?.confirmText,
      onConfirm: options?.onConfirm,
      cancelText: options?.cancelText
    });
  };

  const hideModal = () => {
    setModalState(prev => ({ ...prev, show: false }));
  };

  const showSuccess = (title: string, message: string) => {
    showModal('success', title, message);
  };

  const showError = (title: string, message: string) => {
    showModal('error', title, message);
  };

  const showWarning = (title: string, message: string) => {
    showModal('warning', title, message);
  };

  const showInfo = (title: string, message: string) => {
    showModal('info', title, message);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar'
  ) => {
    showModal('warning', title, message, {
      confirmText,
      onConfirm,
      cancelText
    });
  };

  return {
    modalState,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm
  };
};