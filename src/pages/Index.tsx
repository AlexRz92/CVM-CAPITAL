import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePartner } from '../contexts/PartnerContext';
import { AlertTriangle } from 'lucide-react';

export const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAuth();
  const { partner, loading: partnerLoading } = usePartner();

  useEffect(() => {
    // Si ya hay un usuario logueado, redirigir inmediatamente
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    if (partner) {
      navigate('/socio', { replace: true });
      return;
    }
  }, [navigate, user, partner]);

  const handleIniciarSesion = () => {
    navigate('/login');
  };

  // Mostrar loading mientras se verifican las sesiones
  if (userLoading || partnerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header con logo y título principal */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="relative animate-bounce-slow">
              <img 
                src="/Logo_index.gif" 
                alt="CVM Capital Logo" 
                className="h-32 w-auto object-contain"
              />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4 animate-slide-up">
            Bienvenido a CVM CAPITAL
          </h1>
          <p className="text-xl text-white/90 italic mb-8 animate-slide-up-delay">
            "Inversión Inteligente, siempre con ustedes"
          </p>
          
          <button
            onClick={handleIniciarSesion}
            className="bg-gradient-to-r from-white/20 to-white/30 text-white px-8 py-3 rounded-full font-semibold text-lg hover:from-white/30 hover:to-white/40 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/30 backdrop-blur-sm animate-pulse-slow"
          >
            INICIAR SESIÓN
          </button>
        </div>

        {/* Grid de secciones informativas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* ¿Quiénes Somos? */}
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 animate-slide-in-left hover:scale-105 transition-all duration-300 hover:bg-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">¿Quiénes Somos?</h2>
            <div className="text-white/90 space-y-3">
              <p>
                Somos un fondo de inversión especializado en la gestión de activos financieros. 
                A través de una estrategia de inversión diversificada, operamos en el dinámico 
                mercado de divisas (Forex) y Cripto.
              </p>
              <p>
                Nuestro objetivo principal es generar retornos sostenibles sin exponer 
                significativamente el capital, gracias a nuestra sólida experiencia técnica 
                y estrategia de control de riesgo.
              </p>
            </div>
          </div>

          {/* Depósitos y Retiros */}
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 animate-slide-in-right hover:scale-105 transition-all duration-300 hover:bg-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Depósitos y Retiros</h2>
            <div className="text-white/90 space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Depósitos:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Monto mínimo: USD 500</li>
                  <li>• Ingreso: Al finalizar cada mes</li>
                  <li>• Métodos: Binance Pay, Wallet USDT, Zelle</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Retiros:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Solicitud: Días finales del mes</li>
                  <li>• Procesamiento: 1-2 días hábiles</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Estructura de Comisiones */}
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 animate-slide-in-left-delay hover:scale-105 transition-all duration-300 hover:bg-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Estructura de Comisiones</h2>
            <div className="text-white/90 space-y-3">
              <p className="mb-4">
                Nuestro modelo establece una distribución clara de las ganancias:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-3 h-3 bg-green-400 rounded-full mr-3"></span>
                  70% de los beneficios para el inversor
                </li>
                <li className="flex items-center">
                  <span className="w-3 h-3 bg-blue-400 rounded-full mr-3"></span>
                  30% destinado al fondo para costos operativos
                </li>
              </ul>
              <p className="text-sm text-white/70 mt-3">* Sujeto a cambios según condiciones del mercado</p>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 animate-slide-in-right-delay hover:scale-105 transition-all duration-300 hover:bg-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Información Adicional</h2>
            <div className="text-white/90 space-y-3">
              <p>
                Operamos con transparencia total y comunicación constante con nuestros inversores. 
                Nuestro equipo técnico cuenta con amplia experiencia en mercados financieros 
                internacionales.
              </p>
              <p>
                Mantenemos estrictos protocolos de gestión de riesgo para proteger el capital 
                de nuestros inversores.
              </p>
            </div>
          </div>
        </div>

        {/* Cláusula Importante */}
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-lg rounded-2xl p-6 shadow-xl border-2 border-red-400/50 mb-8 animate-fade-in-up hover:scale-102 transition-all duration-300">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-300 mr-2 animate-pulse" />
            <h2 className="text-2xl font-bold text-red-200">CLÁUSULA IMPORTANTE</h2>
            <AlertTriangle className="w-6 h-6 text-red-300 ml-2 animate-pulse" />
          </div>
          
          <div className="text-red-100 space-y-4">
            <div>
              <h3 className="font-semibold text-red-200 mb-2">Cláusula de Resguardo Institucional:</h3>
              <p className="text-sm leading-relaxed">
                C.V.M Capital se reserva expresamente el derecho de excluir, limitar o cancelar 
                la participación de cualquier inversor cuya conducta implique amenazas, presiones, 
                intimidaciones o comportamientos que puedan afectar la integridad del equipo de la empresa.
              </p>
            </div>
            
            <p className="text-sm leading-relaxed">
              En tales casos, la empresa podrá proceder a la devolución íntegra del capital aportado 
              y ganancias generadas hasta la fecha de exclusión, sin reconocimiento de responsabilidad adicional.
            </p>
            
            <p className="text-sm leading-relaxed font-medium">
              Esta medida se aplicará como acción preventiva en resguardo del bienestar de los equipos internos.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center animate-fade-in-up-delay">
          <p className="text-white/70 text-sm">
            © 2024 C.V.M Capital - Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Estilos CSS personalizados */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes slide-in-left {
          from { 
            opacity: 0; 
            transform: translateX(-50px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        
        @keyframes slide-in-right {
          from { 
            opacity: 0; 
            transform: translateX(50px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes bounce-slow {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        
        .animate-slide-up-delay {
          animation: slide-up 0.8s ease-out 0.2s both;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.8s ease-out 0.3s both;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.8s ease-out 0.4s both;
        }
        
        .animate-slide-in-left-delay {
          animation: slide-in-left 0.8s ease-out 0.5s both;
        }
        
        .animate-slide-in-right-delay {
          animation: slide-in-right 0.8s ease-out 0.6s both;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out 0.7s both;
        }
        
        .animate-fade-in-up-delay {
          animation: fade-in-up 0.8s ease-out 0.8s both;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse 3s infinite;
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};