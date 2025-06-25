/*
  # Crear Tablas Principales del Sistema

  1. Tabla de inversores (usuarios principales)
  2. Tabla de partners/socios
  3. Tabla de administradores
  4. Configuración del sistema
*/

-- Tabla de inversores
CREATE TABLE IF NOT EXISTS inversores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) NOT NULL,
  apellido varchar(100) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  pregunta_secreta text NOT NULL,
  respuesta_secreta text NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  capital_inicial numeric DEFAULT 0,
  ganancia_semanal numeric DEFAULT 0,
  total numeric DEFAULT 0,
  last_login timestamptz,
  failed_attempts integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tabla de partners/socios
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) NOT NULL,
  email varchar(255),
  username varchar(50) UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  tipo varchar(20) CHECK (tipo IN ('partner', 'operador_partner')) DEFAULT 'partner',
  porcentaje_comision numeric DEFAULT 0,
  porcentaje_especial numeric DEFAULT 0,
  inversion_inicial numeric DEFAULT 0,
  activo boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(50) UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  role varchar(20) CHECK (role IN ('admin', 'moderador')) DEFAULT 'moderador',
  nombre varchar(100) NOT NULL,
  email varchar(255),
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  last_login timestamptz,
  is_active boolean DEFAULT true
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave varchar(100) UNIQUE NOT NULL,
  valor text NOT NULL,
  descripcion text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Habilitar RLS en todas las tablas
ALTER TABLE inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (temporal para desarrollo)
CREATE POLICY "public_access_inversores" ON inversores FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_access_partners" ON partners FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_access_admins" ON admins FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_access_configuracion" ON configuracion_sistema FOR ALL TO public USING (true) WITH CHECK (true);