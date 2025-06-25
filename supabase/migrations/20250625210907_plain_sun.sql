/*
  # Crear Tablas de Transacciones y Solicitudes

  1. Transacciones de inversores
  2. Transacciones de partners
  3. Solicitudes de inversores
  4. Solicitudes de partners
  5. Relación partner-inversores
*/

-- Tabla de transacciones de inversores
CREATE TABLE IF NOT EXISTS transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id uuid REFERENCES inversores(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  tipo varchar(20) NOT NULL,
  fecha timestamptz DEFAULT now(),
  descripcion text
);

-- Tabla de transacciones de partners
CREATE TABLE IF NOT EXISTS partner_transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  tipo varchar(20) NOT NULL,
  descripcion text,
  fecha timestamptz DEFAULT now()
);

-- Tabla de solicitudes de inversores
CREATE TABLE IF NOT EXISTS solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id uuid REFERENCES inversores(id) ON DELETE CASCADE,
  tipo varchar(20) CHECK (tipo IN ('deposito', 'retiro')) NOT NULL,
  monto numeric NOT NULL,
  estado varchar(20) CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')) DEFAULT 'pendiente',
  motivo_rechazo text,
  fecha_solicitud timestamptz DEFAULT now(),
  fecha_procesado timestamptz,
  procesado_por uuid,
  notas text
);

-- Tabla de solicitudes de partners
CREATE TABLE IF NOT EXISTS partner_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  tipo varchar(20) CHECK (tipo IN ('deposito', 'retiro')) NOT NULL,
  monto numeric NOT NULL,
  estado varchar(20) CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')) DEFAULT 'pendiente',
  motivo_rechazo text,
  fecha_solicitud timestamptz DEFAULT now(),
  fecha_procesado timestamptz,
  procesado_por uuid
);

-- Tabla de relación partner-inversores
CREATE TABLE IF NOT EXISTS partner_inversores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  inversor_id uuid REFERENCES inversores(id) ON DELETE CASCADE UNIQUE,
  fecha_asignacion timestamptz DEFAULT now(),
  asignado_por uuid
);

-- Habilitar RLS
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_inversores ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público
CREATE POLICY "public_access_transacciones" ON transacciones FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_access_partner_transacciones" ON partner_transacciones FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_access_solicitudes" ON solicitudes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_access_partner_solicitudes" ON partner_solicitudes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_access_partner_inversores" ON partner_inversores FOR ALL TO public USING (true) WITH CHECK (true);