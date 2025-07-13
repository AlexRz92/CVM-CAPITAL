import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import CryptoJS from 'crypto-js';

interface Admin {
  id: string;
  username: string;
  role: 'admin' | 'moderador';
  nombre: string;
  email?: string;
}

interface AdminContextType {
  admin: Admin | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Función para hashear contraseñas (simplificada para el admin por defecto)
const hashPassword = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión de admin guardada
    const savedAdmin = localStorage.getItem('cvm_admin_data');
    
    if (savedAdmin) {
      try {
        const adminData = JSON.parse(savedAdmin);
        setAdmin(adminData);
      } catch (error) {
        console.error('Error parsing saved admin data:', error);
        localStorage.removeItem('cvm_admin_data');
      }
    }
    
    setLoading(false);

    // Detectar cuando la página se recarga (F5 o refresh)
    const handleBeforeUnload = () => {
      // Limpiar sesión al recargar la página
      localStorage.removeItem('cvm_admin_data');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('Intentando login de admin con:', username);
      
      // Buscar admin en la base de datos - usar maybeSingle() en lugar de single()
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) {
        console.error('Error verificando admin:', adminError);
        return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
      }

      if (!adminData) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Verificar contraseña
      let isValidPassword = false;
      
      // Para el admin por defecto, usar verificación especial
      if (username === 'KatanaRz' && password === '^NYDwnJ%0OAwbn') {
        isValidPassword = true;
      } else {
        // Para otros admins, usar hash normal
        const hashedPassword = hashPassword(password, adminData.password_salt || '');
        isValidPassword = hashedPassword === adminData.password_hash;
      }

      if (!isValidPassword) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Actualizar último login
      await supabase
        .from('admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', adminData.id);

      const adminUser: Admin = {
        id: adminData.id,
        username: adminData.username,
        role: adminData.role,
        nombre: adminData.nombre,
        email: adminData.email
      };

      // Guardar sesión
      localStorage.setItem('cvm_admin_data', JSON.stringify(adminUser));
      setAdmin(adminUser);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Error en login de admin:', error);
      return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
    }
  };

  const logout = () => {
    try {
      console.log('Cerrando sesión de admin...');
      localStorage.removeItem('cvm_admin_data');
      setAdmin(null);
    } catch (error) {
      console.error('Error during admin logout:', error);
    }
  };

  const value = {
    admin,
    login,
    logout,
    loading
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};