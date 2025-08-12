import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface MaintenanceState {
  activo: boolean;
  mensaje: string;
  loading: boolean;
}

export const useMaintenance = () => {
  const [maintenanceState, setMaintenanceState] = useState<MaintenanceState>({
    activo: false,
    mensaje: '',
    loading: true
  });

  useEffect(() => {
    fetchMaintenanceStatus();
    
    // Configurar polling cada 30 segundos para verificar cambios
    const interval = setInterval(fetchMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('mantenimiento')
        .select('activo, mensaje')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching maintenance status:', error);
        // En caso de error, asumir que no hay mantenimiento
        setMaintenanceState({
          activo: false,
          mensaje: '',
          loading: false
        });
        return;
      }

      setMaintenanceState({
        activo: data?.activo || false,
        mensaje: data?.mensaje || 'El sistema está en mantenimiento. Por favor, inténtalo más tarde.',
        loading: false
      });
    } catch (error) {
      console.error('Error in fetchMaintenanceStatus:', error);
      setMaintenanceState({
        activo: false,
        mensaje: '',
        loading: false
      });
    }
  };

  const updateMaintenanceStatus = async (activo: boolean, mensaje: string, adminId?: string) => {
    try {
      // Verificar si existe un registro
      const { data: existing, error: checkError } = await supabase
        .from('mantenimiento')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (checkError) throw checkError;

      let error;
      if (existing) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('mantenimiento')
          .update({
            activo,
            mensaje,
            updated_at: new Date().toISOString(),
            updated_by: adminId
          })
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Crear nuevo registro
        const { error: insertError } = await supabase
          .from('mantenimiento')
          .insert({
            activo,
            mensaje,
            updated_at: new Date().toISOString(),
            updated_by: adminId
          });
        error = insertError;
      }

      if (error) throw error;

      // Actualizar estado local inmediatamente
      setMaintenanceState({
        activo,
        mensaje,
        loading: false
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating maintenance status:', error);
      return { success: false, error: (error as Error).message };
    }
  };

  return {
    ...maintenanceState,
    updateMaintenanceStatus,
    refreshStatus: fetchMaintenanceStatus
  };
};