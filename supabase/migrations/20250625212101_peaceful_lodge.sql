/*
  # Crear Tabla de Avisos

  1. Tabla para avisos del sistema creados por admins
*/

-- Tabla de avisos
CREATE TABLE IF NOT EXISTS avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo varchar(255) NOT NULL,
  mensaje text NOT NULL,
  tipo varchar(20) CHECK (tipo IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_expiracion timestamptz,
  creado_por uuid REFERENCES admins(id)
);

-- Habilitar RLS
ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;

-- Política de acceso público
CREATE POLICY "public_access_avisos" ON avisos FOR ALL TO public USING (true) WITH CHECK (true);