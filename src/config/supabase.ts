import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://omouzqcsylvmswyipcef.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tb3V6cWNzeWx2bXN3eWlwY2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNjIyMzcsImV4cCI6MjA2OTgzODIzN30.TF3A1iMJpsP0pNa7uCZThtJl_IKjyurdVd7rpNT_lZ0';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

export type Database = {
  public: {
    Tables: {
      modulos_independientes: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          activo: boolean;
          fecha_creacion: string;
          creado_por: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          activo?: boolean;
          fecha_creacion?: string;
          creado_por?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          descripcion?: string | null;
          activo?: boolean;
          fecha_creacion?: string;
          creado_por?: string | null;
        };
      };
      modulo_asignaciones: {
        Row: {
          id: string;
          modulo_id: string;
          inversor_id: string | null;
          partner_id: string | null;
          activo: boolean;
          fecha_asignacion: string;
          asignado_por: string | null;
        };
        Insert: {
          id?: string;
          modulo_id: string;
          inversor_id?: string | null;
          partner_id?: string | null;
          activo?: boolean;
          fecha_asignacion?: string;
          asignado_por?: string | null;
        };
        Update: {
          id?: string;
          modulo_id?: string;
          inversor_id?: string | null;
          partner_id?: string | null;
          activo?: boolean;
          fecha_asignacion?: string;
          asignado_por?: string | null;
        };
      };
      modulo_transacciones: {
        Row: {
          id: string;
          modulo_id: string;
          inversor_id: string | null;
          partner_id: string | null;
          usuario_tipo: 'inversor' | 'partner';
          monto: number;
          tipo: string;
          descripcion: string | null;
          fecha: string;
        };
        Insert: {
          id?: string;
          modulo_id: string;
          inversor_id?: string | null;
          partner_id?: string | null;
          usuario_tipo: 'inversor' | 'partner';
          monto: number;
          tipo: string;
          descripcion?: string | null;
          fecha?: string;
        };
        Update: {
          id?: string;
          modulo_id?: string;
          inversor_id?: string | null;
          partner_id?: string | null;
          usuario_tipo?: 'inversor' | 'partner';
          monto?: number;
          tipo?: string;
          descripcion?: string | null;
          fecha?: string;
        };
      };
      modulo_meses: {
        Row: {
          id: string;
          modulo_id: string;
          numero_mes: number;
          nombre_mes: string;
          fecha_inicio: string;
          fecha_fin: string;
          total_inversion: number;
          porcentaje_ganancia: number;
          ganancia_bruta: number;
          procesado: boolean;
          fecha_procesado: string | null;
          procesado_por: string | null;
        };
        Insert: {
          id?: string;
          modulo_id: string;
          numero_mes: number;
          nombre_mes: string;
          fecha_inicio: string;
          fecha_fin: string;
          total_inversion?: number;
          porcentaje_ganancia?: number;
          ganancia_bruta?: number;
          procesado?: boolean;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
        };
        Update: {
          id?: string;
          modulo_id?: string;
          numero_mes?: number;
          nombre_mes?: string;
          fecha_inicio?: string;
          fecha_fin?: string;
          total_inversion?: number;
          porcentaje_ganancia?: number;
          ganancia_bruta?: number;
          procesado?: boolean;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
        };
      };
      modulo_solicitudes: {
        Row: {
          id: string;
          modulo_id: string;
          inversor_id: string;
          tipo: 'deposito' | 'retiro'|'transferencia';
          monto: number;
          estado: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo: string | null;
          fecha_solicitud: string;
          fecha_procesado: string | null;
          procesado_por: string | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          modulo_id: string;
          inversor_id: string;
          tipo: 'deposito' | 'retiro'|'transferencia';
          monto: number;
          estado?: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo?: string | null;
          fecha_solicitud?: string;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          notas?: string | null;
        };
        Update: {
          id?: string;
          modulo_id?: string;
          inversor_id?: string;
          tipo?: 'deposito' | 'retiro'| 'transferencia';
          monto?: number;
          estado?: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo?: string | null;
          fecha_solicitud?: string;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          notas?: string | null;
        };
      };
      modulo_partner_solicitudes: {
        Row: {
          id: string;
          modulo_id: string;
          partner_id: string;
          tipo: 'deposito' | 'retiro'| 'transferencia';
          monto: number;
          estado: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo: string | null;
          fecha_solicitud: string;
          fecha_procesado: string | null;
          procesado_por: string | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          modulo_id: string;
          partner_id: string;
          tipo: 'deposito' | 'retiro'| 'transferencia';
          monto: number;
          estado?: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo?: string | null;
          fecha_solicitud?: string;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          notas?: string | null;
        };
        Update: {
          id?: string;
          modulo_id?: string;
          partner_id?: string;
          tipo?: 'deposito' | 'retiro';
          monto?: number;
          estado?: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo?: string | null;
          fecha_solicitud?: string;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          notas?: string | null;
        };
      };
      inversores: {
        Row: {
          id: string;
          nombre: string;
          apellido: string;
          email: string;
          pregunta_secreta: string;
          respuesta_secreta: string;
          password_hash: string;
          password_salt: string;
          total: number;
          last_login: string | null;
          failed_attempts: number;
          locked_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          apellido: string;
          email: string;
          pregunta_secreta: string;
          respuesta_secreta: string;
          password_hash: string;
          password_salt: string;
          total?: number;
          last_login?: string | null;
          failed_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          apellido?: string;
          email?: string;
          pregunta_secreta?: string;
          respuesta_secreta?: string;
          password_hash?: string;
          password_salt?: string;
          total?: number;
          last_login?: string | null;
          failed_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
        };
      };
      partners: {
        Row: {
          id: string;
          nombre: string;
          username: string;
          password_hash: string;
          password_salt: string;
          activo: boolean;
          last_login: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          username: string;
          password_hash: string;
          password_salt: string;
          activo?: boolean;
          last_login?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          username?: string;
          password_hash?: string;
          password_salt?: string;
          activo?: boolean;
          last_login?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
      };
      admins: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          password_salt: string;
          role: 'admin';
          nombre: string;
          email: string | null;
          created_at: string;
          created_by: string | null;
          last_login: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          password_salt: string;
          role?: 'admin';
          nombre: string;
          email?: string | null;
          created_at?: string;
          created_by?: string | null;
          last_login?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          username?: string;
          password_hash?: string;
          password_salt?: string;
          role?: 'admin';
          nombre?: string;
          email?: string | null;
          created_at?: string;
          created_by?: string | null;
          last_login?: string | null;
          is_active?: boolean;
        };
      };
      transacciones: {
        Row: {
          id: string;
          inversor_id: string | null;
          partner_id: string | null;
          usuario_tipo: 'inversor' | 'partner';
          monto: number;
          tipo: string;
          fecha: string;
          descripcion: string | null;
        };
        Insert: {
          id?: string;
          inversor_id?: string | null;
          partner_id?: string | null;
          usuario_tipo?: 'inversor' | 'partner';
          monto: number;
          tipo: string;
          fecha?: string;
          descripcion?: string | null;
        };
        Update: {
          id?: string;
          inversor_id?: string | null;
          partner_id?: string | null;
          usuario_tipo?: 'inversor' | 'partner';
          monto?: number;
          tipo?: string;
          fecha?: string;
          descripcion?: string | null;
        };
      };
      solicitudes: {
        Row: {
          id: string;
          inversor_id: string;
          tipo: 'deposito' | 'retiro'| 'transferencia';
          monto: number;
          estado: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo: string | null;
          fecha_solicitud: string;
          fecha_procesado: string | null;
          procesado_por: string | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          inversor_id: string;
          tipo: 'deposito' | 'retiro'| 'transferencia';
          monto: number;
          estado?: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo?: string | null;
          fecha_solicitud?: string;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          notas?: string | null;
        };
        Update: {
          id?: string;
          inversor_id?: string;
          tipo?: 'deposito' | 'retiro'| 'transferencia';
          monto?: number;
          estado?: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo?: string | null;
          fecha_solicitud?: string;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          notas?: string | null;
        };
      };
      partner_solicitudes: {
        Row: {
          id: string;
          partner_id: string;
          tipo: 'deposito' | 'retiro'| 'transferencia';
          monto: number;
          estado: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo: string | null;
          fecha_solicitud: string;
          fecha_procesado: string | null;
          procesado_por: string | null;
        };
        Insert: {
          id?: string;
          partner_id: string;
          tipo: 'deposito' | 'retiro'| 'transferencia';
          monto: number;
          estado?: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo?: string | null;
          fecha_solicitud?: string;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          notas?: string | null;
        };
        Update: {
          id?: string;
          partner_id?: string;
          tipo?: 'deposito' | 'retiro';
          monto?: number;
          estado?: 'pendiente' | 'aprobado' | 'rechazado';
          motivo_rechazo?: string | null;
          fecha_solicitud?: string;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          notas?: string | null;
        };
      };
      notificaciones: {
        Row: {
          id: string;
          usuario_id: string;
          tipo_usuario: 'inversor' | 'partner';
          titulo: string;
          mensaje: string;
          tipo_notificacion: 'info' | 'success' | 'warning' | 'error';
          leida: boolean;
          fecha_creacion: string;
          fecha_leida: string | null;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          tipo_usuario: 'inversor' | 'partner';
          titulo: string;
          mensaje: string;
          tipo_notificacion?: 'info' | 'success' | 'warning' | 'error';
          leida?: boolean;
          fecha_creacion?: string;
          fecha_leida?: string | null;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          tipo_usuario?: 'inversor' | 'partner';
          titulo?: string;
          mensaje?: string;
          tipo_notificacion?: 'info' | 'success' | 'warning' | 'error';
          leida?: boolean;
          fecha_creacion?: string;
          fecha_leida?: string | null;
        };
      };
      partner_inversores: {
        Row: {
          id: string;
          partner_id: string;
          inversor_id: string;
          fecha_asignacion: string;
          asignado_por: string | null;
        };
        Insert: {
          id?: string;
          partner_id: string;
          inversor_id: string;
          fecha_asignacion?: string;
          asignado_por?: string | null;
        };
        Update: {
          id?: string;
          partner_id?: string;
          inversor_id?: string;
          fecha_asignacion?: string;
          asignado_por?: string | null;
        };
      };
      semanas_procesadas: {
        Row: {
          id: string;
          numero_mes: number;
          nombre_mes: string;
          fecha_inicio: string;
          fecha_fin: string;
          total_inversion: number;
          porcentaje_ganancia: number;
          ganancia_bruta: number;
          ganancia_partners: number;
          ganancia_inversores: number;
          procesado: boolean;
          fecha_procesado: string | null;
          procesado_por: string | null;
          created_at: string;
          porcentaje_partners_usado: number | null;
          porcentaje_inversores_usado: number | null;
          configuracion_id: string | null;
        };
        Insert: {
          id?: string;
          numero_mes: number;
          nombre_mes: string;
          fecha_inicio: string;
          fecha_fin: string;
          total_inversion?: number;
          porcentaje_ganancia?: number;
          ganancia_bruta?: number;
          ganancia_partners?: number;
          ganancia_inversores?: number;
          procesado?: boolean;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          created_at?: string;
          porcentaje_partners_usado?: number | null;
          porcentaje_inversores_usado?: number | null;
          configuracion_id?: string | null;
        };
        Update: {
          id?: string;
          numero_mes?: number;
          nombre_mes?: string;
          fecha_inicio?: string;
          fecha_fin?: string;
          total_inversion?: number;
          porcentaje_ganancia?: number;
          ganancia_bruta?: number;
          ganancia_partners?: number;
          ganancia_inversores?: number;
          procesado?: boolean;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          created_at?: string;
          porcentaje_partners_usado?: number | null;
          porcentaje_inversores_usado?: number | null;
          configuracion_id?: string | null;
        };
      };
      ganancias_semanales: {
        Row: {
          id: string;
          numero_mes: number;
          nombre_mes: string;
          fecha_inicio: string;
          fecha_fin: string;
          total_inversion: number;
          porcentaje_ganancia: number;
          ganancia_bruta: number;
          ganancia_partners: number;
          ganancia_inversores: number;
          procesado: boolean;
          fecha_procesado: string | null;
          procesado_por: string | null;
          created_at: string;
          porcentaje_partners_usado: number | null;
          porcentaje_inversores_usado: number | null;
          configuracion_id: string | null;
        };
        Insert: {
          id?: string;
          numero_mes: number;
          nombre_mes: string;
          fecha_inicio: string;
          fecha_fin: string;
          total_inversion?: number;
          porcentaje_ganancia?: number;
          ganancia_bruta?: number;
          ganancia_partners?: number;
          ganancia_inversores?: number;
          procesado?: boolean;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          created_at?: string;
          porcentaje_partners_usado?: number | null;
          porcentaje_inversores_usado?: number | null;
          configuracion_id?: string | null;
        };
        Update: {
          id?: string;
          numero_mes?: number;
          nombre_mes?: string;
          fecha_inicio?: string;
          fecha_fin?: string;
          total_inversion?: number;
          porcentaje_ganancia?: number;
          ganancia_bruta?: number;
          ganancia_partners?: number;
          ganancia_inversores?: number;
          procesado?: boolean;
          fecha_procesado?: string | null;
          procesado_por?: string | null;
          created_at?: string;
          porcentaje_partners_usado?: number | null;
          porcentaje_inversores_usado?: number | null;
          configuracion_id?: string | null;
        };
      };
      partner_ganancias: {
        Row: {
          id: string;
          partner_id: string;
          mes_numero: number;
          ganancia_total: number;
          ganancia_comision: number;
          ganancia_operador: number;
          total_inversores: number;
          monto_total_inversores: number;
          fecha_calculo: string;
          ganancia_proporcional: number;
          ganancia_adicional_partners: number;
        };
        Insert: {
          id?: string;
          partner_id: string;
          mes_numero: number;
          ganancia_total?: number;
          ganancia_comision?: number;
          ganancia_operador?: number;
          total_inversores?: number;
          monto_total_inversores?: number;
          fecha_calculo?: string;
          ganancia_proporcional?: number;
          ganancia_adicional_partners?: number;
        };
        Update: {
          id?: string;
          partner_id?: string;
          mes_numero?: number;
          ganancia_total?: number;
          ganancia_comision?: number;
          ganancia_operador?: number;
          total_inversores?: number;
          monto_total_inversores?: number;
          fecha_calculo?: string;
          ganancia_proporcional?: number;
          ganancia_adicional_partners?: number;
        };
      };
      configuracion_sistema: {
        Row: {
          id: string;
          clave: string;
          valor: string;
          descripcion: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          clave: string;
          valor: string;
          descripcion?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          clave?: string;
          valor?: string;
          descripcion?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
    };
  };
};
