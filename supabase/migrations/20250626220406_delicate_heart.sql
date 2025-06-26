/*
  # Base de datos CVM Capital - Recreación completa desde cero
  
  1. Eliminación completa de la base de datos
  2. Recreación de todas las tablas con correcciones
  3. Funciones corregidas para cálculo de ganancias
  4. Solo credenciales del administrador
  
  ## Estructura:
  - Tablas principales (inversores, partners, admins)
  - Tablas de transacciones y solicitudes
  - Tablas de ganancias y configuración
  - Funciones de cálculo corregidas
  - Políticas RLS
  - Datos iniciales mínimos
*/

-- =============================================
-- ELIMINACIÓN COMPLETA DE LA BASE DE DATOS
-- =============================================

-- Eliminar todas las funciones
DROP FUNCTION IF EXISTS login_inversor(text, text);
DROP FUNCTION IF EXISTS registrar_inversor(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS obtener_datos_grafico_semanal();
DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric);
DROP FUNCTION IF EXISTS obtener_distribucion_inversores(numeric);
DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid);
DROP FUNCTION IF EXISTS configurar_semana_sistema(integer, date, uuid);
DROP FUNCTION IF EXISTS obtener_inversores_disponibles();
DROP FUNCTION IF EXISTS obtener_resumen_partners();
DROP FUNCTION IF EXISTS calcular_inversion_total_inversor(uuid);
DROP FUNCTION IF EXISTS validar_retiro_inversor(uuid, numeric);
DROP FUNCTION IF EXISTS validar_retiro_partner(uuid, numeric);
DROP FUNCTION IF EXISTS obtener_datos_partner_actualizados(uuid);
DROP FUNCTION IF EXISTS obtener_datos_torta_partner(uuid);
DROP FUNCTION IF EXISTS crear_ticket(uuid, text, text, text);
DROP FUNCTION IF EXISTS obtener_ticket_usuario(uuid, text);
DROP FUNCTION IF EXISTS obtener_tickets_admin();
DROP FUNCTION IF EXISTS responder_ticket(uuid, text, uuid);
DROP FUNCTION IF EXISTS cerrar_ticket(uuid, uuid);
DROP FUNCTION IF EXISTS enviar_aviso_a_todos_inversores(text, text, text, uuid);

-- Eliminar todas las tablas en orden correcto
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS avisos CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS partner_ganancias CASCADE;
DROP TABLE IF EXISTS ganancias_semanales CASCADE;
DROP TABLE IF EXISTS configuracion_sistema CASCADE;
DROP TABLE IF EXISTS partner_inversores CASCADE;
DROP TABLE IF EXISTS partner_solicitudes CASCADE;
DROP TABLE IF EXISTS solicitudes CASCADE;
DROP TABLE IF EXISTS partner_transacciones CASCADE;
DROP TABLE IF EXISTS transacciones CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS inversores CASCADE;

-- =============================================
-- CREACIÓN DE TABLAS
-- =============================================

-- Tabla de inversores
CREATE TABLE inversores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  email text UNIQUE NOT NULL,
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

-- Tabla de partners
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  tipo text DEFAULT 'partner' CHECK (tipo IN ('partner', 'operador_partner')),
  porcentaje_comision numeric DEFAULT 0,
  porcentaje_especial numeric DEFAULT 0,
  inversion_inicial numeric DEFAULT 0,
  activo boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Tabla de administradores
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  role text DEFAULT 'moderador' CHECK (role IN ('admin', 'moderador')),
  nombre text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  last_login timestamptz,
  is_active boolean DEFAULT true
);

-- Tabla de transacciones de inversores
CREATE TABLE transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id uuid NOT NULL REFERENCES inversores(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  tipo text NOT NULL,
  fecha timestamptz DEFAULT now(),
  descripcion text
);

-- Tabla de transacciones de partners
CREATE TABLE partner_transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  tipo text NOT NULL,
  descripcion text,
  fecha timestamptz DEFAULT now()
);

-- Tabla de solicitudes de inversores
CREATE TABLE solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id uuid NOT NULL REFERENCES inversores(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('deposito', 'retiro')),
  monto numeric NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  fecha_solicitud timestamptz DEFAULT now(),
  fecha_procesado timestamptz,
  procesado_por uuid REFERENCES admins(id),
  notas text
);

-- Tabla de solicitudes de partners
CREATE TABLE partner_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('deposito', 'retiro')),
  monto numeric NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  fecha_solicitud timestamptz DEFAULT now(),
  fecha_procesado timestamptz,
  procesado_por uuid REFERENCES admins(id)
);

-- Tabla de relación partner-inversores
CREATE TABLE partner_inversores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  inversor_id uuid NOT NULL REFERENCES inversores(id) ON DELETE CASCADE,
  fecha_asignacion timestamptz DEFAULT now(),
  asignado_por uuid REFERENCES admins(id),
  UNIQUE(inversor_id)
);

-- Tabla de configuración del sistema
CREATE TABLE configuracion_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text UNIQUE NOT NULL,
  valor text NOT NULL,
  descripcion text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES admins(id)
);

-- Tabla de ganancias semanales
CREATE TABLE ganancias_semanales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_numero integer NOT NULL UNIQUE,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  total_inversion numeric DEFAULT 0,
  porcentaje_ganancia numeric DEFAULT 5,
  ganancia_bruta numeric DEFAULT 0,
  ganancia_partners numeric DEFAULT 0,
  ganancia_inversores numeric DEFAULT 0,
  procesado boolean DEFAULT false,
  fecha_procesado timestamptz,
  procesado_por uuid REFERENCES admins(id)
);

-- Tabla de ganancias de partners
CREATE TABLE partner_ganancias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  semana_numero integer NOT NULL,
  ganancia_total numeric DEFAULT 0,
  ganancia_comision numeric DEFAULT 0,
  ganancia_operador numeric DEFAULT 0,
  total_inversores integer DEFAULT 0,
  monto_total_inversores numeric DEFAULT 0,
  fecha_calculo timestamptz DEFAULT now(),
  UNIQUE(partner_id, semana_numero)
);

-- Tabla de notificaciones
CREATE TABLE notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo_usuario text NOT NULL CHECK (tipo_usuario IN ('inversor', 'partner')),
  titulo text NOT NULL,
  mensaje text NOT NULL,
  tipo_notificacion text DEFAULT 'info' CHECK (tipo_notificacion IN ('info', 'success', 'warning', 'error')),
  leida boolean DEFAULT false,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_leida timestamptz
);

-- Tabla de avisos
CREATE TABLE avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensaje text NOT NULL,
  tipo text DEFAULT 'info' CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_expiracion timestamptz,
  creado_por uuid NOT NULL REFERENCES admins(id)
);

-- Tabla de tickets de soporte
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo_usuario text NOT NULL CHECK (tipo_usuario IN ('inversor', 'partner')),
  titulo text NOT NULL,
  mensaje text NOT NULL,
  estado text DEFAULT 'abierto' CHECK (estado IN ('abierto', 'respondido', 'cerrado')),
  respuesta text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_respuesta timestamptz,
  respondido_por uuid REFERENCES admins(id)
);

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE ganancias_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ganancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir acceso completo por ahora)
CREATE POLICY "Allow all operations" ON inversores FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON partners FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON admins FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON transacciones FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON partner_transacciones FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON solicitudes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON partner_solicitudes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON partner_inversores FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON configuracion_sistema FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON ganancias_semanales FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON partner_ganancias FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON notificaciones FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON avisos FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tickets FOR ALL USING (true);

-- =============================================
-- FUNCIONES CORREGIDAS
-- =============================================

-- Función para obtener datos del gráfico semanal
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS TABLE (
  week text,
  ganancia numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ('Sem ' || gs.semana_numero::text)::text as week,
    COALESCE(gs.ganancia_bruta, 0) as ganancia
  FROM ganancias_semanales gs
  WHERE gs.procesado = true
  ORDER BY gs.semana_numero DESC
  LIMIT 8;
END;
$$;

-- Función para obtener distribución de partners (CORREGIDA)
CREATE OR REPLACE FUNCTION obtener_distribucion_partners(p_ganancia_partners numeric)
RETURNS TABLE (
  partner_id uuid,
  nombre text,
  tipo text,
  porcentaje_comision numeric,
  porcentaje_especial numeric,
  inversion_inicial numeric,
  total_inversores integer,
  monto_total_inversores numeric,
  ganancia_comision numeric,
  ganancia_operador numeric,
  ganancia_total numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as partner_id,
    p.nombre::text,
    p.tipo::text,
    p.porcentaje_comision,
    p.porcentaje_especial,
    p.inversion_inicial,
    COALESCE(COUNT(pi.inversor_id)::integer, 0) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total_inversores,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Para operador+partner: 100% de su ganancia propia + 100% del 30% de sus inversores
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30)
      ELSE 
        -- Para partner normal: 80% de su ganancia propia + 1/3 del 30% de sus inversores
        (p.inversion_inicial * 0.05 * 0.80) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3)
    END as ganancia_comision,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Ganancia como operador: su % especial del 30% de sus inversores
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * (p.porcentaje_especial / 100))
      ELSE 
        0
    END as ganancia_operador,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Total: ganancia propia + comisión + operador
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30) +
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * (p.porcentaje_especial / 100))
      ELSE 
        -- Total: 80% ganancia propia + 1/3 comisión
        (p.inversion_inicial * 0.05 * 0.80) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3)
    END as ganancia_total
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  ORDER BY p.nombre::text;
END;
$$;

-- Función para obtener distribución de inversores (CORREGIDA)
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS TABLE (
  inversor_id uuid,
  nombre text,
  apellido text,
  email text,
  inversion numeric,
  porcentaje_inversor numeric,
  porcentaje_ganancia numeric,
  ganancia_individual numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH total_inversion AS (
    SELECT SUM(total) as total_sum
    FROM inversores
    WHERE total > 0
  )
  SELECT 
    i.id as inversor_id,
    i.nombre::text,
    i.apellido::text,
    i.email::text,
    i.total as inversion,
    CASE 
      WHEN ti.total_sum > 0 THEN (i.total / ti.total_sum * 100)
      ELSE 0
    END as porcentaje_inversor,
    5.0 as porcentaje_ganancia,
    CASE 
      WHEN ti.total_sum > 0 THEN (i.total / ti.total_sum * p_ganancia_inversores)
      ELSE 0
    END as ganancia_individual
  FROM inversores i
  CROSS JOIN total_inversion ti
  WHERE i.total > 0
  ORDER BY i.nombre::text, i.apellido::text;
END;
$$;

-- Función para procesar ganancias semanales (CORREGIDA)
CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_semana_actual integer;
  v_total_inversion numeric;
  v_ganancia_bruta numeric;
  v_ganancia_inversores numeric;
  v_ganancia_partners numeric;
  v_partner record;
  v_inversor record;
  v_ganancia_individual numeric;
  v_ganancia_comision numeric;
  v_ganancia_operador numeric;
  v_regalias_operador numeric;
BEGIN
  -- Obtener semana actual
  SELECT valor::integer INTO v_semana_actual
  FROM configuracion_sistema
  WHERE clave = 'semana_actual';
  
  IF v_semana_actual IS NULL THEN
    v_semana_actual := 1;
  END IF;

  -- Calcular total de inversión (inversores + partners)
  SELECT 
    COALESCE(SUM(i.total), 0) + COALESCE(SUM(p.inversion_inicial), 0)
  INTO v_total_inversion
  FROM inversores i
  FULL OUTER JOIN partners p ON p.activo = true;

  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := v_total_inversion * (p_porcentaje / 100);
  ELSE
    v_ganancia_bruta := v_total_inversion * 0.05; -- 5% por defecto
  END IF;

  -- Calcular distribución (70% inversores, 30% partners)
  v_ganancia_inversores := v_ganancia_bruta * 0.70;
  v_ganancia_partners := v_ganancia_bruta * 0.30;

  -- Registrar ganancia semanal
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion,
    porcentaje_ganancia, ganancia_bruta, ganancia_partners, ganancia_inversores,
    procesado, fecha_procesado, procesado_por
  ) VALUES (
    v_semana_actual, 
    CURRENT_DATE - INTERVAL '7 days', 
    CURRENT_DATE,
    v_total_inversion,
    CASE WHEN p_porcentaje IS NOT NULL THEN p_porcentaje ELSE 5 END,
    v_ganancia_bruta,
    v_ganancia_partners,
    v_ganancia_inversores,
    true,
    now(),
    p_admin_id
  ) ON CONFLICT (semana_numero) DO UPDATE SET
    total_inversion = EXCLUDED.total_inversion,
    ganancia_bruta = EXCLUDED.ganancia_bruta,
    ganancia_partners = EXCLUDED.ganancia_partners,
    ganancia_inversores = EXCLUDED.ganancia_inversores,
    procesado = true,
    fecha_procesado = now(),
    procesado_por = p_admin_id;

  -- Procesar ganancias de inversores (70% de su ganancia)
  FOR v_inversor IN 
    SELECT id, nombre, apellido, total
    FROM inversores 
    WHERE total > 0
  LOOP
    v_ganancia_individual := v_inversor.total * 0.05 * 0.70;
    
    -- Actualizar ganancia semanal del inversor
    UPDATE inversores 
    SET ganancia_semanal = v_ganancia_individual,
        total = total + v_ganancia_individual
    WHERE id = v_inversor.id;
    
    -- Registrar transacción
    INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
    VALUES (v_inversor.id, v_ganancia_individual, 'ganancia', 
            'Ganancia semanal ' || v_semana_actual || ' - 70% de 5%');
    
    -- Enviar notificación
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (v_inversor.id, 'inversor', 'Ganancia Semanal Procesada',
            'Se ha procesado tu ganancia semanal de $' || v_ganancia_individual::text || 
            ' correspondiente a la semana ' || v_semana_actual::text, 'success');
  END LOOP;

  -- Procesar ganancias de partners
  FOR v_partner IN 
    SELECT p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial,
           COUNT(pi.inversor_id) as total_inversores,
           COALESCE(SUM(i.total), 0) as monto_total_inversores
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  LOOP
    IF v_partner.tipo = 'operador_partner' THEN
      -- Operador + Partner: 100% de ganancia propia + 100% del 30% de inversores
      v_ganancia_comision := (v_partner.inversion_inicial * 0.05) + 
                            (v_partner.monto_total_inversores * 0.05 * 0.30);
      v_ganancia_operador := v_partner.monto_total_inversores * 0.05 * 0.30 * (v_partner.porcentaje_especial / 100);
    ELSE
      -- Partner normal: 80% de ganancia propia + 1/3 del 30% de inversores
      v_ganancia_comision := (v_partner.inversion_inicial * 0.05 * 0.80) + 
                            (v_partner.monto_total_inversores * 0.05 * 0.30 / 3);
      v_ganancia_operador := 0;
      
      -- Calcular regalías para el operador (20% de ganancia propia + 2/3 del 30% de inversores)
      v_regalias_operador := (v_partner.inversion_inicial * 0.05 * 0.20) + 
                            (v_partner.monto_total_inversores * 0.05 * 0.30 * 2 / 3);
      
      -- Buscar el operador y añadir regalías
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      SELECT p_op.id, v_regalias_operador, 'regalias',
             'Regalías de ' || v_partner.nombre || ' - Semana ' || v_semana_actual
      FROM partners p_op 
      WHERE p_op.tipo = 'operador_partner' AND p_op.activo = true
      LIMIT 1;
      
      -- Actualizar inversión del operador
      UPDATE partners 
      SET inversion_inicial = inversion_inicial + v_regalias_operador
      WHERE tipo = 'operador_partner' AND activo = true;
    END IF;

    -- Registrar ganancias del partner
    INSERT INTO partner_ganancias (
      partner_id, semana_numero, ganancia_total, ganancia_comision, ganancia_operador,
      total_inversores, monto_total_inversores
    ) VALUES (
      v_partner.id, v_semana_actual, 
      v_ganancia_comision + v_ganancia_operador,
      v_ganancia_comision, v_ganancia_operador,
      v_partner.total_inversores, v_partner.monto_total_inversores
    ) ON CONFLICT (partner_id, semana_numero) DO UPDATE SET
      ganancia_total = EXCLUDED.ganancia_total,
      ganancia_comision = EXCLUDED.ganancia_comision,
      ganancia_operador = EXCLUDED.ganancia_operador,
      total_inversores = EXCLUDED.total_inversores,
      monto_total_inversores = EXCLUDED.monto_total_inversores;

    -- Actualizar inversión del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + v_ganancia_comision + v_ganancia_operador
    WHERE id = v_partner.id;

    -- Registrar transacción del partner
    INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
    VALUES (v_partner.id, v_ganancia_comision + v_ganancia_operador, 'ganancia',
            'Ganancia semanal ' || v_semana_actual);

    -- Enviar notificación al partner
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (v_partner.id, 'partner', 'Ganancia Semanal Procesada',
            'Se ha procesado tu ganancia semanal de $' || (v_ganancia_comision + v_ganancia_operador)::text ||
            ' correspondiente a la semana ' || v_semana_actual::text, 'success');
  END LOOP;

  -- Incrementar semana
  UPDATE configuracion_sistema 
  SET valor = (v_semana_actual + 1)::text,
      updated_at = now(),
      updated_by = p_admin_id
  WHERE clave = 'semana_actual';
END;
$$;

-- Función para configurar semana del sistema
CREATE OR REPLACE FUNCTION configurar_semana_sistema(
  p_semana_numero integer,
  p_fecha_inicio date,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar semana actual
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
  VALUES ('semana_actual', p_semana_numero::text, 'Semana actual del sistema', p_admin_id)
  ON CONFLICT (clave) DO UPDATE SET
    valor = p_semana_numero::text,
    updated_at = now(),
    updated_by = p_admin_id;

  -- Actualizar fecha de inicio
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
  VALUES ('fecha_inicio_semana', p_fecha_inicio::text, 'Fecha de inicio de semana', p_admin_id)
  ON CONFLICT (clave) DO UPDATE SET
    valor = p_fecha_inicio::text,
    updated_at = now(),
    updated_by = p_admin_id;
END;
$$;

-- Función para obtener inversores disponibles
CREATE OR REPLACE FUNCTION obtener_inversores_disponibles()
RETURNS TABLE (
  id uuid,
  nombre text,
  apellido text,
  email text,
  total numeric,
  partner_assigned boolean,
  partner_nombre text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nombre::text,
    i.apellido::text,
    i.email::text,
    i.total,
    CASE WHEN pi.partner_id IS NOT NULL THEN true ELSE false END as partner_assigned,
    p.nombre::text as partner_nombre
  FROM inversores i
  LEFT JOIN partner_inversores pi ON i.id = pi.inversor_id
  LEFT JOIN partners p ON pi.partner_id = p.id
  ORDER BY i.nombre::text, i.apellido::text;
END;
$$;

-- Función para obtener resumen de partners
CREATE OR REPLACE FUNCTION obtener_resumen_partners()
RETURNS TABLE (
  partner_id uuid,
  partner_nombre text,
  partner_tipo text,
  total_inversores bigint,
  monto_total numeric,
  inversores jsonb
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as partner_id,
    p.nombre::text as partner_nombre,
    p.tipo::text as partner_tipo,
    COUNT(pi.inversor_id) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'nombre', i.nombre,
          'apellido', i.apellido,
          'email', i.email,
          'total', i.total
        )
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::jsonb
    ) as inversores
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo
  HAVING COUNT(pi.inversor_id) > 0
  ORDER BY p.nombre::text;
END;
$$;

-- Función para calcular inversión total del inversor
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_depositos numeric := 0;
BEGIN
  SELECT COALESCE(SUM(monto), 0)
  INTO v_total_depositos
  FROM transacciones
  WHERE inversor_id = p_inversor_id 
    AND tipo IN ('deposito', 'depósito');
  
  RETURN v_total_depositos;
END;
$$;

-- Función para validar retiro de inversor
CREATE OR REPLACE FUNCTION validar_retiro_inversor(p_inversor_id uuid, p_monto numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_actual numeric;
BEGIN
  SELECT total INTO v_saldo_actual
  FROM inversores
  WHERE id = p_inversor_id;
  
  RETURN v_saldo_actual >= p_monto;
END;
$$;

-- Función para validar retiro de partner
CREATE OR REPLACE FUNCTION validar_retiro_partner(p_partner_id uuid, p_monto numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_actual numeric;
BEGIN
  SELECT inversion_inicial INTO v_saldo_actual
  FROM partners
  WHERE id = p_partner_id;
  
  RETURN v_saldo_actual >= p_monto;
END;
$$;

-- Función para obtener datos actualizados del partner
CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(p_partner_id uuid)
RETURNS TABLE (
  inversion_total numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(pt.monto), 0) as inversion_total
  FROM partner_transacciones pt
  WHERE pt.partner_id = p_partner_id 
    AND pt.tipo IN ('deposito', 'depósito');
END;
$$;

-- Función para obtener datos de gráfico de torta del partner
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id uuid)
RETURNS TABLE (
  name text,
  value numeric,
  color text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH transacciones_agrupadas AS (
    SELECT 
      CASE 
        WHEN tipo IN ('deposito', 'depósito') THEN 'Depósitos'
        WHEN tipo = 'retiro' THEN 'Retiros'
        WHEN tipo = 'ganancia' THEN 'Ganancias'
        WHEN tipo = 'regalias' THEN 'Regalías'
        ELSE 'Otros'
      END as categoria,
      SUM(monto) as total_monto
    FROM partner_transacciones
    WHERE partner_id = p_partner_id
    GROUP BY categoria
  )
  SELECT 
    ta.categoria::text as name,
    ta.total_monto as value,
    CASE ta.categoria
      WHEN 'Depósitos' THEN '#10b981'
      WHEN 'Retiros' THEN '#ef4444'
      WHEN 'Ganancias' THEN '#3b82f6'
      WHEN 'Regalías' THEN '#f59e0b'
      ELSE '#6b7280'
    END::text as color
  FROM transacciones_agrupadas ta
  WHERE ta.total_monto > 0
  ORDER BY ta.total_monto DESC;
END;
$$;

-- Función para crear ticket
CREATE OR REPLACE FUNCTION crear_ticket(
  p_usuario_id uuid,
  p_tipo_usuario text,
  p_titulo text,
  p_mensaje text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_existente uuid;
  v_nuevo_ticket_id uuid;
  v_ticket_data jsonb;
BEGIN
  -- Verificar si ya tiene un ticket abierto o respondido
  SELECT id INTO v_ticket_existente
  FROM tickets
  WHERE usuario_id = p_usuario_id 
    AND tipo_usuario = p_tipo_usuario
    AND estado IN ('abierto', 'respondido')
  LIMIT 1;

  IF v_ticket_existente IS NOT NULL THEN
    -- Retornar el ticket existente
    SELECT jsonb_build_object(
      'success', false,
      'error', 'Ya tienes un ticket abierto. Espera a que sea resuelto antes de crear uno nuevo.',
      'existing_ticket', jsonb_build_object(
        'id', t.id,
        'titulo', t.titulo,
        'mensaje', t.mensaje,
        'estado', t.estado,
        'fecha_creacion', t.fecha_creacion,
        'respuesta', t.respuesta,
        'fecha_respuesta', t.fecha_respuesta
      )
    ) INTO v_ticket_data
    FROM tickets t
    WHERE t.id = v_ticket_existente;
    
    RETURN v_ticket_data;
  END IF;

  -- Crear nuevo ticket
  INSERT INTO tickets (usuario_id, tipo_usuario, titulo, mensaje)
  VALUES (p_usuario_id, p_tipo_usuario, p_titulo, p_mensaje)
  RETURNING id INTO v_nuevo_ticket_id;

  -- Retornar el nuevo ticket
  SELECT jsonb_build_object(
    'success', true,
    'ticket', jsonb_build_object(
      'id', t.id,
      'titulo', t.titulo,
      'mensaje', t.mensaje,
      'estado', t.estado,
      'fecha_creacion', t.fecha_creacion
    )
  ) INTO v_ticket_data
  FROM tickets t
  WHERE t.id = v_nuevo_ticket_id;

  RETURN v_ticket_data;
END;
$$;

-- Función para obtener ticket del usuario
CREATE OR REPLACE FUNCTION obtener_ticket_usuario(
  p_usuario_id uuid,
  p_tipo_usuario text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_ticket', CASE WHEN t.id IS NOT NULL THEN true ELSE false END,
    'ticket', CASE 
      WHEN t.id IS NOT NULL THEN jsonb_build_object(
        'id', t.id,
        'titulo', t.titulo,
        'mensaje', t.mensaje,
        'estado', t.estado,
        'fecha_creacion', t.fecha_creacion,
        'respuesta', t.respuesta,
        'fecha_respuesta', t.fecha_respuesta,
        'admin_nombre', a.nombre
      )
      ELSE null
    END
  ) INTO v_ticket_data
  FROM tickets t
  LEFT JOIN admins a ON t.respondido_por = a.id
  WHERE t.usuario_id = p_usuario_id 
    AND t.tipo_usuario = p_tipo_usuario
    AND t.estado IN ('abierto', 'respondido')
  ORDER BY t.fecha_creacion DESC
  LIMIT 1;

  IF v_ticket_data IS NULL THEN
    v_ticket_data := jsonb_build_object('has_ticket', false, 'ticket', null);
  END IF;

  RETURN v_ticket_data;
END;
$$;

-- Función para obtener tickets para admin
CREATE OR REPLACE FUNCTION obtener_tickets_admin()
RETURNS TABLE (
  id uuid,
  usuario_id uuid,
  tipo_usuario text,
  titulo text,
  mensaje text,
  estado text,
  respuesta text,
  fecha_creacion timestamptz,
  fecha_respuesta timestamptz,
  usuario_nombre text,
  admin_nombre text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.usuario_id,
    t.tipo_usuario::text,
    t.titulo::text,
    t.mensaje::text,
    t.estado::text,
    t.respuesta::text,
    t.fecha_creacion,
    t.fecha_respuesta,
    CASE 
      WHEN t.tipo_usuario = 'inversor' THEN (i.nombre || ' ' || i.apellido)::text
      WHEN t.tipo_usuario = 'partner' THEN p.nombre::text
      ELSE 'Usuario desconocido'::text
    END as usuario_nombre,
    a.nombre::text as admin_nombre
  FROM tickets t
  LEFT JOIN inversores i ON t.usuario_id = i.id AND t.tipo_usuario = 'inversor'
  LEFT JOIN partners p ON t.usuario_id = p.id AND t.tipo_usuario = 'partner'
  LEFT JOIN admins a ON t.respondido_por = a.id
  ORDER BY 
    CASE t.estado 
      WHEN 'abierto' THEN 1 
      WHEN 'respondido' THEN 2 
      ELSE 3 
    END,
    t.fecha_creacion DESC;
END;
$$;

-- Función para responder ticket
CREATE OR REPLACE FUNCTION responder_ticket(
  p_ticket_id uuid,
  p_respuesta text,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_usuario_id uuid;
  v_ticket_tipo_usuario text;
  v_ticket_titulo text;
BEGIN
  -- Obtener datos del ticket
  SELECT usuario_id, tipo_usuario, titulo 
  INTO v_ticket_usuario_id, v_ticket_tipo_usuario, v_ticket_titulo
  FROM tickets 
  WHERE id = p_ticket_id;

  IF v_ticket_usuario_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket no encontrado');
  END IF;

  -- Actualizar ticket
  UPDATE tickets 
  SET respuesta = p_respuesta,
      estado = 'respondido',
      fecha_respuesta = now(),
      respondido_por = p_admin_id
  WHERE id = p_ticket_id;

  -- Enviar notificación al usuario
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  VALUES (v_ticket_usuario_id, v_ticket_tipo_usuario, 'Respuesta a tu Ticket',
          'Tu ticket "' || v_ticket_titulo || '" ha sido respondido por el equipo de soporte.', 'info');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Función para cerrar ticket
CREATE OR REPLACE FUNCTION cerrar_ticket(
  p_ticket_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_usuario_id uuid;
  v_ticket_tipo_usuario text;
  v_ticket_titulo text;
BEGIN
  -- Obtener datos del ticket
  SELECT usuario_id, tipo_usuario, titulo 
  INTO v_ticket_usuario_id, v_ticket_tipo_usuario, v_ticket_titulo
  FROM tickets 
  WHERE id = p_ticket_id;

  IF v_ticket_usuario_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket no encontrado');
  END IF;

  -- Cerrar ticket
  UPDATE tickets 
  SET estado = 'cerrado'
  WHERE id = p_ticket_id;

  -- Enviar notificación al usuario
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  VALUES (v_ticket_usuario_id, v_ticket_tipo_usuario, 'Ticket Cerrado',
          'Tu ticket "' || v_ticket_titulo || '" ha sido marcado como resuelto.', 'success');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Función para enviar aviso a todos los inversores
CREATE OR REPLACE FUNCTION enviar_aviso_a_todos_inversores(
  p_titulo text,
  p_mensaje text,
  p_tipo text,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_aviso_id uuid;
BEGIN
  -- Crear el aviso
  INSERT INTO avisos (titulo, mensaje, tipo, creado_por)
  VALUES (p_titulo, p_mensaje, p_tipo, p_admin_id)
  RETURNING id INTO v_aviso_id;

  -- Enviar notificación a todos los inversores
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT i.id, 'inversor', p_titulo, p_mensaje, p_tipo
  FROM inversores i;

  -- Enviar notificación a todos los partners
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT p.id, 'partner', p_titulo, p_mensaje, p_tipo
  FROM partners p
  WHERE p.activo = true;
END;
$$;

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Insertar administrador principal
INSERT INTO admins (username, password_hash, password_salt, role, nombre, email, is_active)
VALUES ('KatanaRz', 'admin_hash_placeholder', 'admin_salt_placeholder', 'admin', 'Administrador Principal', 'admin@cvmcapital.com', true);

-- Configuración inicial del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('semana_actual', '1', 'Semana actual del sistema de ganancias'),
('fecha_inicio_semana', CURRENT_DATE::text, 'Fecha de inicio de la semana actual'),
('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores');

-- =============================================
-- COMENTARIOS FINALES
-- =============================================

/*
  Base de datos recreada completamente con las siguientes correcciones:
  
  ✅ Eliminación completa de datos anteriores
  ✅ Solo credenciales del administrador principal
  ✅ Cálculo corregido de ganancias para partners normales:
     - Reciben 80% de sus ganancias propias (no 70%)
     - Reciben 1/3 del 30% de sus inversores
     - El operador recibe 20% de ganancias de partners + 2/3 del 30% de inversores
  ✅ Todas las columnas varchar convertidas a text
  ✅ Funciones corregidas para evitar errores de tipo
  ✅ Sistema de regalías automático
  ✅ Notificaciones y tickets funcionales
  
  La base de datos está lista para usar con las correcciones implementadas.
*/