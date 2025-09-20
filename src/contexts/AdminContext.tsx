import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { hashPassword } from '../utils/crypto';

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
      
      // Validar entrada
      if (!username || !password) {
        return { success: false, error: 'Usuario y contraseña son requeridos' };
      }
      
      // Buscar admin en la base de datos
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
        console.log('Admin no encontrado para username:', username);
        return { success: false, error: 'Credenciales incorrectas' };
      }

      console.log('Admin encontrado:', {
        id: adminData.id,
        username: adminData.username,
        role: adminData.role,
        salt_length: adminData.password_salt?.length || 0
      });

      // Verificar contraseña usando hash
      try {
        const hashedPassword = hashPassword(password, adminData.password_salt || '');
        const isValidPassword = hashedPassword === adminData.password_hash;
        
        console.log('Verificación de contraseña:', {
          provided_hash: hashedPassword.substring(0, 20) + '...',
          stored_hash: adminData.password_hash?.substring(0, 20) + '...',
          match: isValidPassword
        });

        if (!isValidPassword) {
          return { success: false, error: 'Credenciales incorrectas' };
        }
      } catch (hashError) {
        console.error('Error al hashear contraseña:', hashError);
        return { success: false, error: 'Error de autenticación' };
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
      // Redirigir al login principal
      window.location.href = '/login';
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