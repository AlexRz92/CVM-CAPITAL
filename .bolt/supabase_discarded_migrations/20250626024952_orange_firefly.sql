-- =============================================
-- CORREGIR ERROR DE CLAVE DUPLICADA
-- =============================================

-- Primero, verificar si la tabla existe y tiene datos
DO $$ 
BEGIN
  -- Si la tabla configuracion_sistema ya existe, actualizar los valores
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracion_sistema') THEN
    
    -- Actualizar configuraciones existentes o insertar si no existen
    INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
      ('semana_actual', '1', 'Número de semana actual del sistema'),
      ('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores (70% inversores, 30% partners)'),
      ('porcentaje_ganancia_general', '5', 'Porcentaje de ganancia general aplicado'),
      ('fecha_inicio_semana', '2025-01-01', 'Fecha de inicio de la semana actual'),
      ('fecha_fin_semana', '2025-01-07', 'Fecha de fin de la semana actual')
    ON CONFLICT (clave) DO UPDATE SET
      valor = EXCLUDED.valor,
      descripcion = EXCLUDED.descripcion,
      updated_at = now();
      
    RAISE NOTICE 'Configuraciones actualizadas correctamente';
    
  ELSE
    -- Si no existe la tabla, crearla
    CREATE TABLE configuracion_sistema (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      clave varchar(100) UNIQUE NOT NULL,
      valor text NOT NULL,
      descripcion text,
      updated_at timestamptz DEFAULT now(),
      updated_by uuid
    );
    
    -- Insertar configuraciones iniciales
    INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
      ('semana_actual', '1', 'Número de semana actual del sistema'),
      ('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores (70% inversores, 30% partners)'),
      ('porcentaje_ganancia_general', '5', 'Porcentaje de ganancia general aplicado'),
      ('fecha_inicio_semana', '2025-01-01', 'Fecha de inicio de la semana actual'),
      ('fecha_fin_semana', '2025-01-07', 'Fecha de fin de la semana actual');
      
    RAISE NOTICE 'Tabla configuracion_sistema creada con datos iniciales';
  END IF;
END $$;

-- =============================================
-- VERIFICAR Y CREAR OTRAS TABLAS SI NO EXISTEN
-- =============================================

-- Crear tabla de inversores si no existe
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

-- Crear tabla de partners si no existe
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) NOT NULL,
  email varchar(255),
  username varchar(50) UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  tipo varchar(20) DEFAULT 'partner' CHECK (tipo IN ('partner', 'operador_partner')),
  porcentaje_comision numeric DEFAULT 0,
  porcentaje_especial numeric DEFAULT 0,
  inversion_inicial numeric DEFAULT 0,
  activo boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Crear tabla de administradores si no existe
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(50) UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  role varchar(20) DEFAULT 'moderador' CHECK (role IN ('admin', 'moderador')),
  nombre varchar(100) NOT NULL,
  email varchar(255),
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  last_login timestamptz,
  is_active boolean DEFAULT true
);

-- Crear tabla de transacciones si no existe
CREATE TABLE IF NOT EXISTS transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id uuid REFERENCES inversores(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  tipo varchar(20) NOT NULL,
  fecha timestamptz DEFAULT now(),
  descripcion text
);

-- Crear tabla de transacciones de partners si no existe
CREATE TABLE IF NOT EXISTS partner_transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  tipo varchar(20) NOT NULL,
  descripcion text,
  fecha timestamptz DEFAULT now()
);

-- Crear tabla de solicitudes si no existe
CREATE TABLE IF NOT EXISTS solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id uuid REFERENCES inversores(id) ON DELETE CASCADE,
  tipo varchar(20) NOT NULL CHECK (tipo IN ('deposito', 'retiro')),
  monto numeric NOT NULL,
  estado varchar(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  fecha_solicitud timestamptz DEFAULT now(),
  fecha_procesado timestamptz,
  procesado_por uuid,
  notas text
);

-- Crear tabla de solicitudes de partners si no existe
CREATE TABLE IF NOT EXISTS partner_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  tipo varchar(20) NOT NULL CHECK (tipo IN ('deposito', 'retiro')),
  monto numeric NOT NULL,
  estado varchar(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  fecha_solicitud timestamptz DEFAULT now(),
  fecha_procesado timestamptz,
  procesado_por uuid
);

-- Crear tabla de asignaciones partner-inversor si no existe
CREATE TABLE IF NOT EXISTS partner_inversores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  inversor_id uuid UNIQUE REFERENCES inversores(id) ON DELETE CASCADE,
  fecha_asignacion timestamptz DEFAULT now(),
  asignado_por uuid
);

-- Crear tabla de ganancias semanales si no existe
CREATE TABLE IF NOT EXISTS ganancias_semanales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_numero integer UNIQUE NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  total_inversion numeric DEFAULT 0,
  porcentaje_ganancia numeric DEFAULT 0,
  ganancia_bruta numeric DEFAULT 0,
  ganancia_partners numeric DEFAULT 0,
  ganancia_inversores numeric DEFAULT 0,
  procesado boolean DEFAULT false,
  fecha_procesado timestamptz,
  procesado_por uuid
);

-- Crear tabla de ganancias de partners si no existe
CREATE TABLE IF NOT EXISTS partner_ganancias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  semana_numero integer NOT NULL,
  ganancia_total numeric DEFAULT 0,
  ganancia_comision numeric DEFAULT 0,
  ganancia_operador numeric DEFAULT 0,
  total_inversores integer DEFAULT 0,
  monto_total_inversores numeric DEFAULT 0,
  fecha_calculo timestamptz DEFAULT now(),
  UNIQUE(partner_id, semana_numero)
);

-- Crear tabla de notificaciones si no existe
CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo_usuario varchar(20) NOT NULL CHECK (tipo_usuario IN ('inversor', 'partner')),
  titulo varchar(255) NOT NULL,
  mensaje text NOT NULL,
  tipo_notificacion varchar(20) DEFAULT 'info' CHECK (tipo_notificacion IN ('info', 'success', 'warning', 'error')),
  leida boolean DEFAULT false,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_leida timestamptz
);

-- Crear tabla de avisos si no existe
CREATE TABLE IF NOT EXISTS avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo varchar(255) NOT NULL,
  mensaje text NOT NULL,
  tipo varchar(20) DEFAULT 'info' CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_expiracion timestamptz,
  creado_por uuid REFERENCES admins(id)
);

-- =============================================
-- HABILITAR RLS Y CREAR POLÍTICAS
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ganancias_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ganancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;

-- Crear políticas de acceso público (solo si no existen)
DO $$ 
BEGIN
  -- Políticas para configuracion_sistema
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracion_sistema' AND policyname = 'public_access_configuracion') THEN
    CREATE POLICY "public_access_configuracion" ON configuracion_sistema FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para inversores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inversores' AND policyname = 'public_access_inversores') THEN
    CREATE POLICY "public_access_inversores" ON inversores FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para partners
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partners' AND policyname = 'public_access_partners') THEN
    CREATE POLICY "public_access_partners" ON partners FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'public_access_admins') THEN
    CREATE POLICY "public_access_admins" ON admins FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para transacciones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transacciones' AND policyname = 'public_access_transacciones') THEN
    CREATE POLICY "public_access_transacciones" ON transacciones FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para partner_transacciones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_transacciones' AND policyname = 'public_access_partner_transacciones') THEN
    CREATE POLICY "public_access_partner_transacciones" ON partner_transacciones FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para solicitudes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitudes' AND policyname = 'public_access_solicitudes') THEN
    CREATE POLICY "public_access_solicitudes" ON solicitudes FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para partner_solicitudes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_solicitudes' AND policyname = 'public_access_partner_solicitudes') THEN
    CREATE POLICY "public_access_partner_solicitudes" ON partner_solicitudes FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para partner_inversores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_inversores' AND policyname = 'public_access_partner_inversores') THEN
    CREATE POLICY "public_access_partner_inversores" ON partner_inversores FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para ganancias_semanales
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ganancias_semanales' AND policyname = 'public_access_ganancias_semanales') THEN
    CREATE POLICY "public_access_ganancias_semanales" ON ganancias_semanales FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para partner_ganancias
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_ganancias' AND policyname = 'public_access_partner_ganancias') THEN
    CREATE POLICY "public_access_partner_ganancias" ON partner_ganancias FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para notificaciones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones' AND policyname = 'public_access_notificaciones') THEN
    CREATE POLICY "public_access_notificaciones" ON notificaciones FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  
  -- Políticas para avisos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'avisos' AND policyname = 'public_access_avisos') THEN
    CREATE POLICY "public_access_avisos" ON avisos FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================
-- CREAR ÍNDICES SI NO EXISTEN
-- =============================================

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id, tipo_usuario);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_creacion DESC);

-- Mensaje de confirmación
SELECT 'Esquema de base de datos verificado y actualizado correctamente' as "Estado";