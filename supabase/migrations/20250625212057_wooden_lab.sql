/*
  # Crear Sistema de Notificaciones Unificado

  1. Una sola tabla de notificaciones para inversores y partners
  2. Los admins y moderadores no reciben notificaciones
*/

-- Tabla de notificaciones unificada
CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL, -- ID del inversor o partner
  tipo_usuario varchar(20) CHECK (tipo_usuario IN ('inversor', 'partner')) NOT NULL,
  titulo varchar(255) NOT NULL,
  mensaje text NOT NULL,
  tipo_notificacion varchar(20) CHECK (tipo_notificacion IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
  leida boolean DEFAULT false,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_leida timestamptz
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id, tipo_usuario);
CREATE INDEX idx_notificaciones_fecha ON notificaciones(fecha_creacion DESC);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);

-- Habilitar RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Política de acceso público
CREATE POLICY "public_access_notificaciones" ON notificaciones FOR ALL TO public USING (true) WITH CHECK (true);