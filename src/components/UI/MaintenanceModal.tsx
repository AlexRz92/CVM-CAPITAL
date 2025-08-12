import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Settings, Wrench, Zap, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MaintenanceModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
  canClose?: boolean;
  persistent?: boolean;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ 
  show, 
  message, 
  onClose, 
  canClose = true,
  persistent = false
}) => {
  const navigate = useNavigate();
  
  if (!show) return null;

  const handleClose = () => {
    if (!canClose || persistent) return;
    onClose();
    navigate('/login');
  };

  const handleXClick = () => {
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-cyan-700 via-blue-400 to-blue-800 flex items-center justify-center p-4 z-[9999]"
      onClick={canClose && !persistent ? handleClose : undefined}
    >
      {/* Partículas flotantes mejoradas */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float-enhanced"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 6}s`
            }}
          />
        ))}
      </div>

      {/* Ondas de fondo mejoradas */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 animate-pulse-enhanced"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full animate-ripple"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-300/10 rounded-full animate-ripple-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/10 rounded-full animate-float-slow"></div>
      </div>

      <div 
        className="relative bg-white/15 backdrop-blur-xl rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-white/30 animate-modal-entrance"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón X en la esquina superior derecha */}
        <button
          onClick={handleXClick}
          className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group"
          title="Cerrar y ir al login"
        >
          <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* Header épico con animaciones mejoradas */}
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-6">
            {/* Icono principal con múltiples capas de animación mejoradas */}
            <div className="relative w-24 h-24 mx-auto">
              {/* Círculos exteriores con animaciones más fluidas */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 rounded-full animate-pulse-ring opacity-20"></div>
              <div className="absolute inset-2 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full animate-pulse-ring-delayed opacity-30"></div>
              <div className="absolute inset-4 bg-gradient-to-br from-red-400 to-pink-600 rounded-full animate-pulse-ring-slow opacity-40"></div>
              
              {/* Icono central con rotación suave */}
              <div className="absolute inset-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl animate-rotate-smooth">
                <Wrench className="w-6 h-6 text-white animate-bounce-gentle" />
              </div>
              
              {/* Iconos orbitales con movimiento fluido */}
              <div className="absolute inset-0 animate-orbit">
                <Settings className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-5 h-5 text-white/80 animate-float-gentle" />
                <Zap className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 text-yellow-300 animate-glow" />
                <Shield className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 text-cyan-300 animate-float-gentle" />
                <AlertTriangle className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-4 h-4 text-orange-300 animate-glow" />
              </div>
            </div>
          </div>
          
          {/* Título con efecto de aparición mejorado */}
          <h2 className="text-3xl font-bold text-white mb-4 animate-slide-up-smooth">
            <span className="bg-gradient-to-r from-orange-300 to-red-300 bg-clip-text text-transparent animate-text-glow">
              Sistema en Mantenimiento
            </span>
          </h2>
          
          {/* Línea decorativa con animación fluida */}
          <div className="relative w-32 h-1 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-600 rounded-full"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-full animate-pulse-gentle"></div>
            <div className="absolute top-0 left-0 w-8 h-1 bg-white rounded-full animate-slide-smooth"></div>
          </div>
        </div>

        {/* Contenido del mensaje con efectos mejorados */}
        <div className="text-center mb-8 animate-fade-in-smooth">
          <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-inner">
            {/* Efectos de brillo en las esquinas con animación suave */}
            <div className="absolute top-2 left-2 w-3 h-3 bg-white/40 rounded-full animate-twinkle"></div>
            <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-300/60 rounded-full animate-twinkle-delayed"></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 bg-yellow-300/60 rounded-full animate-twinkle-slow"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-orange-300/40 rounded-full animate-twinkle"></div>
            
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center animate-pulse-gentle">
                <AlertTriangle className="w-5 h-5 text-white animate-bounce-gentle" />
              </div>
              <span className="text-white font-bold text-lg tracking-wide animate-text-shimmer">AVISO IMPORTANTE</span>
              <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse-gentle">
                <AlertTriangle className="w-5 h-5 text-white animate-bounce-gentle" />
              </div>
            </div>
            
            <p className="text-white/95 leading-relaxed text-lg font-medium animate-text-appear">
              {message}
            </p>
          </div>
        </div>

        {/* Botón de cerrar épico mejorado */}
        {canClose && !persistent && (
          <div className="flex justify-center animate-slide-up-smooth">
            <button
              onClick={handleClose}
              className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 font-bold text-lg animate-button-glow"
            >
              {/* Efecto de brillo al hover mejorado */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <div className="relative flex items-center space-x-3">
                <X className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Ir al Login</span>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse-gentle"></div>
              </div>
            </button>
          </div>
        )}

        {/* Mensaje para modal persistente */}
        {persistent && (
          <div className="text-center mt-6">
            <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-300/30">
              <p className="text-red-200 text-sm font-medium">
                El sistema permanecerá en mantenimiento hasta que sea desactivado por un administrador.
              </p>
            </div>
          </div>
        )}

        {/* Indicadores de carga épicos mejorados */}
        <div className="flex justify-center mt-6 space-x-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-wave"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Efectos de partículas en movimiento mejorados */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full animate-particle-dance"
              style={{
                left: `${10 + (i * 8)}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${5 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Estilos CSS personalizados para animaciones épicas mejoradas */}
      <style jsx>{`
        @keyframes modal-entrance {
          0% { 
            opacity: 0; 
            transform: scale(0.8) translateY(50px) rotateX(15deg); 
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05) translateY(-10px) rotateX(5deg);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0) rotateX(0deg); 
          }
        }
        
        @keyframes slide-up-smooth {
          0% { 
            opacity: 0; 
            transform: translateY(40px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes fade-in-smooth {
          0% { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        
        @keyframes float-enhanced {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) rotate(0deg); 
            opacity: 0.3;
          }
          25% { 
            transform: translateY(-20px) translateX(15px) rotate(90deg); 
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-35px) translateX(-10px) rotate(180deg); 
            opacity: 1;
          }
          75% { 
            transform: translateY(-15px) translateX(-20px) rotate(270deg); 
            opacity: 0.6;
          }
        }
        
        @keyframes particle-dance {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) rotate(0deg) scale(1); 
            opacity: 0.4;
          }
          20% { 
            transform: translateY(-25px) translateX(20px) rotate(72deg) scale(1.2); 
            opacity: 0.8;
          }
          40% { 
            transform: translateY(-40px) translateX(-15px) rotate(144deg) scale(0.8); 
            opacity: 1;
          }
          60% { 
            transform: translateY(-20px) translateX(-25px) rotate(216deg) scale(1.1); 
            opacity: 0.7;
          }
          80% { 
            transform: translateY(-30px) translateX(10px) rotate(288deg) scale(0.9); 
            opacity: 0.5;
          }
        }
        
        @keyframes rotate-smooth {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        
        @keyframes bounce-gentle {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
          60% { transform: translateY(-4px); }
        }
        
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-15px) scale(1.1); }
        }
        
        @keyframes glow {
          0%, 100% { 
            opacity: 0.6; 
            filter: brightness(1) drop-shadow(0 0 5px currentColor);
          }
          50% { 
            opacity: 1; 
            filter: brightness(1.3) drop-shadow(0 0 15px currentColor);
          }
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        
        @keyframes pulse-ring-delayed {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        
        @keyframes pulse-ring-slow {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        
        @keyframes ripple-delayed {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
        
        @keyframes pulse-enhanced {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes pulse-gentle {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        @keyframes slide-smooth {
          0% { transform: translateX(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(300%); opacity: 0; }
        }
        
        @keyframes twinkle {
          0%, 100% { 
            opacity: 0.3; 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            opacity: 1; 
            transform: scale(1.3) rotate(180deg); 
          }
        }
        
        @keyframes twinkle-delayed {
          0%, 100% { 
            opacity: 0.4; 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            opacity: 0.9; 
            transform: scale(1.2) rotate(-180deg); 
          }
        }
        
        @keyframes twinkle-slow {
          0%, 100% { 
            opacity: 0.2; 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.4) rotate(360deg); 
          }
        }
        
        @keyframes text-glow {
          0%, 100% { 
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
          50% { 
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 165, 0, 0.6);
          }
        }
        
        @keyframes text-shimmer {
          0% { 
            background-position: -200% center;
          }
          100% { 
            background-position: 200% center;
          }
        }
        
        @keyframes text-appear {
          0% { 
            opacity: 0; 
            transform: translateY(20px) scale(0.9); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        
        @keyframes button-glow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.3);
          }
          50% { 
            box-shadow: 0 0 40px rgba(255, 165, 0, 0.6), 0 0 60px rgba(255, 69, 0, 0.4);
          }
        }
        
        @keyframes wave {
          0%, 40%, 100% { transform: translateY(0); }
          20% { transform: translateY(-10px); }
        }
        
        .animate-modal-entrance {
          animation: modal-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-slide-up-smooth {
          animation: slide-up-smooth 0.8s ease-out 0.2s both;
        }
        
        .animate-fade-in-smooth {
          animation: fade-in-smooth 0.8s ease-out 0.4s both;
        }
        
        .animate-float-enhanced {
          animation: float-enhanced 6s ease-in-out infinite;
        }
        
        .animate-particle-dance {
          animation: particle-dance 8s ease-in-out infinite;
        }
        
        .animate-rotate-smooth {
          animation: rotate-smooth 6s linear infinite;
        }
        
        .animate-orbit {
          animation: orbit 8s linear infinite;
        }
        
        .animate-bounce-gentle {
          animation: bounce-gentle 2s infinite;
        }
        
        .animate-float-gentle {
          animation: float-gentle 3s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-pulse-ring-delayed {
          animation: pulse-ring-delayed 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s;
        }
        
        .animate-pulse-ring-slow {
          animation: pulse-ring-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite 1s;
        }
        
        .animate-ripple {
          animation: ripple 4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-ripple-delayed {
          animation: ripple-delayed 4s cubic-bezier(0, 0, 0.2, 1) infinite 2s;
        }
        
        .animate-pulse-enhanced {
          animation: pulse-enhanced 3s ease-in-out infinite;
        }
        
        .animate-pulse-gentle {
          animation: pulse-gentle 2s ease-in-out infinite;
        }
        
        .animate-slide-smooth {
          animation: slide-smooth 3s ease-in-out infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        
        .animate-twinkle-delayed {
          animation: twinkle-delayed 2s ease-in-out infinite 0.7s;
        }
        
        .animate-twinkle-slow {
          animation: twinkle-slow 3s ease-in-out infinite 1.4s;
        }
        
        .animate-text-glow {
          animation: text-glow 3s ease-in-out infinite;
        }
        
        .animate-text-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          background-size: 200% 100%;
          animation: text-shimmer 2s ease-in-out infinite;
          -webkit-background-clip: text;
          background-clip: text;
        }
        
        .animate-text-appear {
          animation: text-appear 0.8s ease-out 0.6s both;
        }
        
        .animate-button-glow {
          animation: button-glow 3s ease-in-out infinite;
        }
        
        .animate-wave {
          animation: wave 1.5s ease-in-out infinite;
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
};

export default MaintenanceModal;