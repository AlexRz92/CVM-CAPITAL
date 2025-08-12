import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

interface Modulo {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fecha_creacion: string;
}

interface ModuloContextType {
  modulos: Modulo[];
  moduloActual: Modulo | null;
  setModuloActual: (modulo: Modulo | null) => void;
  loading: boolean;
  fetchModulos: () => Promise<void>;
  verificarAcceso: (moduloId: string, usuarioId: string, tipoUsuario: 'inversor' | 'partner') => Promise<boolean>;
}

const ModuloContext = createContext<ModuloContextType | undefined>(undefined);

export const useModulo = () => {
  const context = useContext(ModuloContext);
  if (context === undefined) {
    throw new Error('useModulo must be used within a ModuloProvider');
  }
  return context;
};

export const ModuloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [moduloActual, setModuloActual] = useState<Modulo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModulos();
  }, []);

  const fetchModulos = async () => {
    try {
      const { data, error } = await supabase
        .from('modulos_independientes')
        .select('*')
        .eq('activo', true)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setModulos(data || []);
    } catch (error) {
      console.error('Error fetching modulos:', error);
      setModulos([]);
    } finally {
      setLoading(false);
    }
  };

  const verificarAcceso = async (moduloId: string, usuarioId: string, tipoUsuario: 'inversor' | 'partner'): Promise<boolean> => {
    try {
      console.log('Verificando acceso para:', { moduloId, usuarioId, tipoUsuario });
      
      // Verificar directamente en la tabla modulo_asignaciones
      const { data, error } = await supabase
        .from('modulo_asignaciones')
        .select('id')
        .eq('modulo_id', moduloId)
        .eq(tipoUsuario === 'inversor' ? 'inversor_id' : 'partner_id', usuarioId)
        .eq('activo', true)
        .maybeSingle();

      if (error) throw error;
      
      const tieneAcceso = !!data;
      console.log('Resultado verificación acceso:', tieneAcceso);
      return tieneAcceso;
    } catch (error) {
      console.error('Error verificando acceso:', error);
      return false;
    }
  };

  const value = {
    modulos,
    moduloActual,
    setModuloActual,
    loading,
    fetchModulos,
    verificarAcceso
  };

  return <ModuloContext.Provider value={value}>{children}</ModuloContext.Provider>;
};