import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Index: React.FC = () => {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    // Prevent any automatic redirects or refreshes
    let timeoutId: NodeJS.Timeout;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          timeoutId = setTimeout(() => {
            navigate('/login', { replace: true });
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(timer);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigate]);

  const handleGoNow = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y Slogan */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo2.png" 
              alt="CVM Capital Logo" 
              className="h-32 w-auto object-contain"
              onError={(e) => {
                console.log('Error loading logo');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <p className="text-white text-xl font-medium italic">
            Inversión Inteligente, siempre con ustedes
          </p>
        </div>

        {/* Contenido Principal */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-cyan-200/30 text-center">
          <div className="animate-pulse mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-6">
              <div className="w-10 h-10 bg-white/30 rounded-full"></div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-6">
            Bienvenido a CVM Capital
          </h2>
          
          <p className="text-white/90 text-lg mb-8">
            Redirigiendo al sistema de acceso...
          </p>
          
          <div className="text-white mb-8">
            <div className="text-6xl font-bold mb-3">{countdown}</div>
            <div className="text-lg uppercase tracking-wide text-white/80">segundos</div>
          </div>
          
          <button
            onClick={handleGoNow}
            className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 text-lg"
          >
            Ir ahora
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/70 text-sm">
            © 2024 C.V.M Capital - Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
};