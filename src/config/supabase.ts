import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wyuvhwdxizhdpoqsiyxc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dXZod2R4aXpoZHBvcXNpeXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNDc3MzQsImV4cCI6MjA2NTkyMzczNH0.2Cvp5kpqMMjzA-J4OHBQlCMM0nHI0EIY8CJqUNKBg7o';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      inversores: {
        Row: {
          id: string;
          nombre: string;
          apellido: string;
          email: string;
          pregunta_secreta: string;
          respuesta_secreta: string;
          capital_inicial: number;
          ganancia_semanal: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          apellido: string;
          email: string;
          pregunta_secreta: string;
          respuesta_secreta: string;
          capital_inicial?: number;
          ganancia_semanal?: number;
          total?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          apellido?: string;
          email?: string;
          pregunta_secreta?: string;
          respuesta_secreta?: string;
          capital_inicial?: number;
          ganancia_semanal?: number;
          total?: number;
          created_at?: string;
        };
      };
      transacciones: {
        Row: {
          id: string;
          inversor_id: string;
          monto: number;
          tipo: string;
          fecha: string;
          descripcion: string;
        };
        Insert: {
          id?: string;
          inversor_id: string;
          monto: number;
          tipo: string;
          fecha?: string;
          descripcion?: string;
        };
        Update: {
          id?: string;
          inversor_id?: string;
          monto?: number;
          tipo?: string;
          fecha?: string;
          descripcion?: string;
        };
      };
      notificaciones: {
        Row: {
          id: string;
          inversor_id: string | null;
          partner_id: string | null;
          admin_id: string | null;
          titulo: string;
          mensaje: string;
          tipo: string;
          leida: boolean;
          fecha_creacion: string;
          fecha_leida: string | null;
        };
        Insert: {
          id?: string;
          inversor_id?: string | null;
          partner_id?: string | null;
          admin_id?: string | null;
          titulo: string;
          mensaje: string;
          tipo: string;
          leida?: boolean;
          fecha_creacion?: string;
          fecha_leida?: string | null;
        };
        Update: {
          id?: string;
          inversor_id?: string | null;
          partner_id?: string | null;
          admin_id?: string | null;
          titulo?: string;
          mensaje?: string;
          tipo?: string;
          leida?: boolean;
          fecha_creacion?: string;
          fecha_leida?: string | null;
        };
      };
    };
  };
};