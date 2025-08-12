import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { hashPassword } from '../utils/crypto';

interface Operador {
  id: string;
  username: string;
  role: 'moderador';
  nombre: string;
  email?: string;
}

interface OperadorContextType {
  operador: Operador | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const OperadorContext = createContext<OperadorContextType | undefined>(undefined);

export const useOperador = () => {
  const context = useContext(OperadorContext);
  if (context === undefined) {
    throw new Error('useOperador must be used within an OperadorProvider');
  }
  return context;
};

export const OperadorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operador, setOperador] = useState<Operador | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión de operador guardada
    const savedOperador = localStorage.getItem('cvm_operador_data');
    
    if (savedOperador) {
      try {
        const operadorData = JSON.parse(savedOperador);
        setOperador(operadorData);
      } catch (error) {
        console.error('Error parsing saved operador data:', error);
        localStorage.removeItem('cvm_operador_data');
      }
    }
    
    setLoading(false);

    // Detectar cuando la página se recarga (F5 o refresh)
    const handleBeforeUnload = () => {
      // Limpiar sesión al recargar la página
      localStorage.removeItem('cvm_operador_data');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('Intentando login de operador con:', username);
      
      // Buscar operador en la base de datos
      const { data: operadorData, error: operadorError } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .maybeSingle();

      if (operadorError) {
        console.error('Error verificando operador:', operadorError);
        return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
      }

      if (!operadorData || operadorData.role !== 'moderador') {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Verificar contraseña usando hash
      const hashedPassword = hashPassword(password, operadorData.password_salt || '');
      const isValidPassword = hashedPassword === operadorData.password_hash;

      if (!isValidPassword) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Actualizar último login
      await supabase
        .from('admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', operadorData.id);

      const operadorUser: Operador = {
        id: operadorData.id,
        username: operadorData.username,
        role: operadorData.role,
        nombre: operadorData.nombre,
        email: operadorData.email
      };

      // Guardar sesión
      localStorage.setItem('cvm_operador_data', JSON.stringify(operadorUser));
      setOperador(operadorUser);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Error en login de operador:', error);
      return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
    }
  };

  const logout = () => {
    try {
      console.log('Cerrando sesión de operador...');
      localStorage.removeItem('cvm_operador_data');
      setOperador(null);
    } catch (error) {
      console.error('Error during operador logout:', error);
    }
  };

  const value = {
    operador,
    login,
    logout,
    loading
  };

  return <OperadorContext.Provider value={value}>{children}</OperadorContext.Provider>;
};