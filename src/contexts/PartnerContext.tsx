import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import CryptoJS from 'crypto-js';

interface Partner {
  id: string;
  username: string;
  nombre: string;
  email?: string;
  tipo: 'partner' | 'operador_partner';
  porcentaje_comision: number;
  porcentaje_especial: number;
  inversion_inicial: number;
}

interface PartnerContextType {
  partner: Partner | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined);

// Función para hashear contraseñas
const hashPassword = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
};

export const usePartner = () => {
  const context = useContext(PartnerContext);
  if (context === undefined) {
    throw new Error('usePartner must be used within a PartnerProvider');
  }
  return context;
};

export const PartnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión de partner guardada
    const savedPartner = localStorage.getItem('cvm_partner_data');
    
    if (savedPartner) {
      try {
        const partnerData = JSON.parse(savedPartner);
        setPartner(partnerData);
      } catch (error) {
        console.error('Error parsing saved partner data:', error);
        localStorage.removeItem('cvm_partner_data');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('Intentando login de partner con:', username);
      
      // Buscar partner en la base de datos
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('username', username)
        .eq('activo', true)
        .single();

      if (partnerError) {
        console.error('Error verificando partner:', partnerError);
        if (partnerError.code === 'PGRST116') {
          return { success: false, error: 'Credenciales incorrectas' };
        }
        return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
      }

      if (!partnerData) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Verificar contraseña
      const hashedPassword = hashPassword(password, partnerData.password_salt || '');
      
      if (hashedPassword !== partnerData.password_hash) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      // Actualizar último login
      await supabase
        .from('partners')
        .update({ last_login: new Date().toISOString() })
        .eq('id', partnerData.id);

      const partnerUser: Partner = {
        id: partnerData.id,
        username: partnerData.username,
        nombre: partnerData.nombre,
        email: partnerData.email,
        tipo: partnerData.tipo,
        porcentaje_comision: partnerData.porcentaje_comision,
        porcentaje_especial: partnerData.porcentaje_especial,
        inversion_inicial: partnerData.inversion_inicial
      };

      // Guardar sesión
      localStorage.setItem('cvm_partner_data', JSON.stringify(partnerUser));
      setPartner(partnerUser);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Error en login de partner:', error);
      return { success: false, error: 'Error de conexión. Inténtalo más tarde.' };
    }
  };

  const logout = () => {
    try {
      console.log('Cerrando sesión de partner...');
      localStorage.removeItem('cvm_partner_data');
      setPartner(null);
    } catch (error) {
      console.error('Error during partner logout:', error);
    }
  };

  const value = {
    partner,
    login,
    logout,
    loading
  };

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
};