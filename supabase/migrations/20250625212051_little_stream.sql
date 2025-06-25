/*
  # Crear Tablas de Ganancias

  1. Ganancias semanales generales
  2. Ganancias de partners por semana
*/

-- Tabla de ganancias semanales generales
CREATE TABLE IF NOT EXISTS ganancias_semanales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_numero integer NOT NULL,
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

-- Tabla de ganancias de partners
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

-- Habilitar RLS
ALTER TABLE ganancias_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ganancias ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público
CREATE POLICY "public_access_ganancias_semanales" ON ganancias_semanales FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public_access_partner_ganancias" ON partner_ganancias FOR ALL TO public USING (true) WITH CHECK (true);