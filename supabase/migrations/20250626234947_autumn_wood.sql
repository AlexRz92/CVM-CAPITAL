/*
  # Reparación completa de la base de datos CVM Capital

  1. Verificar y crear todas las tablas necesarias
  2. Crear todas las funciones faltantes
  3. Configurar RLS correctamente
  4. Insertar datos iniciales necesarios
  5. Crear triggers automáticos
*/

-- =====================================================
-- 1. CREAR TABLAS PRINCIPALES (SI NO EXISTEN)
-- =====================================================

-- Tabla de inversores
CREATE TABLE IF NOT EXISTS inversores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  email text UNIQUE NOT NULL,
  pregunta_secreta text NOT NULL,
  respuesta_secreta text NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  capital_inicial numeric(15,2) DEFAULT 0,
  ganancia_semanal numeric(15,2) DEFAULT 0,
  total numeric(15,2) DEFAULT 0,
  last_login timestamptz,
  failed_attempts integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS admins (
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

-- Tabla de partners
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  tipo text DEFAULT 'partner' CHECK (tipo IN ('partner', 'operador_partner')),
  inversion_inicial numeric(15,2) DEFAULT 0 CHECK (inversion_inicial >= 0),
  activo boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text UNIQUE NOT NULL,
  valor text NOT NULL,
  descripcion text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Tabla de transacciones de inversores
CREATE TABLE IF NOT EXISTS transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id uuid NOT NULL REFERENCES inversores(id) ON DELETE CASCADE,
  monto numeric(15,2) NOT NULL CHECK (monto > 0),
  tipo text NOT NULL,
  fecha timestamptz DEFAULT now(),
  descripcion text
);

-- Tabla de transacciones de partners
CREATE TABLE IF NOT EXISTS partner_transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  monto numeric(15,2) NOT NULL CHECK (monto > 0),
  tipo text NOT NULL,
  descripcion text,
  fecha timestamptz DEFAULT now()
);

-- Tabla de solicitudes de inversores
CREATE TABLE IF NOT EXISTS solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id uuid NOT NULL REFERENCES inversores(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('deposito', 'retiro')),
  monto numeric(15,2) NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  fecha_solicitud timestamptz DEFAULT now(),
  fecha_procesado timestamptz,
  procesado_por uuid,
  notas text
);

-- Tabla de solicitudes de partners
CREATE TABLE IF NOT EXISTS partner_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('deposito', 'retiro')),
  monto numeric(15,2) NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  fecha_solicitud timestamptz DEFAULT now(),
  fecha_procesado timestamptz,
  procesado_por uuid
);

-- Tabla de relación partner-inversores
CREATE TABLE IF NOT EXISTS partner_inversores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  inversor_id uuid UNIQUE NOT NULL REFERENCES inversores(id) ON DELETE CASCADE,
  fecha_asignacion timestamptz DEFAULT now(),
  asignado_por uuid
);

-- Tabla de ganancias semanales
CREATE TABLE IF NOT EXISTS ganancias_semanales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_numero integer UNIQUE NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  total_inversion numeric(15,2) DEFAULT 0,
  porcentaje_ganancia numeric(5,2) DEFAULT 5,
  ganancia_bruta numeric(15,2) DEFAULT 0,
  ganancia_partners numeric(15,2) DEFAULT 0,
  ganancia_inversores numeric(15,2) DEFAULT 0,
  procesado boolean DEFAULT false,
  fecha_procesado timestamptz,
  procesado_por uuid
);

-- Tabla de ganancias de partners
CREATE TABLE IF NOT EXISTS partner_ganancias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  semana_numero integer NOT NULL,
  ganancia_total numeric(15,2) DEFAULT 0,
  ganancia_comision numeric(15,2) DEFAULT 0,
  ganancia_operador numeric(15,2) DEFAULT 0,
  total_inversores integer DEFAULT 0,
  monto_total_inversores numeric(15,2) DEFAULT 0,
  fecha_calculo timestamptz DEFAULT now(),
  UNIQUE(partner_id, semana_numero)
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
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
CREATE TABLE IF NOT EXISTS avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensaje text NOT NULL,
  tipo text DEFAULT 'info' CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_expiracion timestamptz,
  creado_por uuid NOT NULL
);

-- Tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo_usuario text NOT NULL CHECK (tipo_usuario IN ('inversor', 'partner')),
  titulo text NOT NULL,
  mensaje text NOT NULL,
  estado text DEFAULT 'abierto' CHECK (estado IN ('abierto', 'respondido', 'cerrado')),
  respuesta text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_respuesta timestamptz,
  respondido_por uuid
);

-- =====================================================
-- 2. HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ganancias_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ganancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREAR POLÍTICAS RLS PERMISIVAS
-- =====================================================

-- Políticas para inversores
DROP POLICY IF EXISTS "Allow all operations" ON inversores;
CREATE POLICY "Allow all operations" ON inversores FOR ALL TO public USING (true);

-- Políticas para admins
DROP POLICY IF EXISTS "Allow all operations" ON admins;
CREATE POLICY "Allow all operations" ON admins FOR ALL TO public USING (true);

-- Políticas para partners
DROP POLICY IF EXISTS "Allow all operations" ON partners;
CREATE POLICY "Allow all operations" ON partners FOR ALL TO public USING (true);

-- Políticas para configuracion_sistema
DROP POLICY IF EXISTS "Allow all operations" ON configuracion_sistema;
CREATE POLICY "Allow all operations" ON configuracion_sistema FOR ALL TO public USING (true);

-- Políticas para transacciones
DROP POLICY IF EXISTS "Allow all operations" ON transacciones;
CREATE POLICY "Allow all operations" ON transacciones FOR ALL TO public USING (true);

-- Políticas para partner_transacciones
DROP POLICY IF EXISTS "Allow all operations" ON partner_transacciones;
CREATE POLICY "Allow all operations" ON partner_transacciones FOR ALL TO public USING (true);

-- Políticas para solicitudes
DROP POLICY IF EXISTS "Allow all operations" ON solicitudes;
CREATE POLICY "Allow all operations" ON solicitudes FOR ALL TO public USING (true);

-- Políticas para partner_solicitudes
DROP POLICY IF EXISTS "Allow all operations" ON partner_solicitudes;
CREATE POLICY "Allow all operations" ON partner_solicitudes FOR ALL TO public USING (true);

-- Políticas para partner_inversores
DROP POLICY IF EXISTS "Allow all operations" ON partner_inversores;
CREATE POLICY "Allow all operations" ON partner_inversores FOR ALL TO public USING (true);

-- Políticas para ganancias_semanales
DROP POLICY IF EXISTS "Allow all operations" ON ganancias_semanales;
CREATE POLICY "Allow all operations" ON ganancias_semanales FOR ALL TO public USING (true);

-- Políticas para partner_ganancias
DROP POLICY IF EXISTS "Allow all operations" ON partner_ganancias;
CREATE POLICY "Allow all operations" ON partner_ganancias FOR ALL TO public USING (true);

-- Políticas para notificaciones
DROP POLICY IF EXISTS "Allow all operations" ON notificaciones;
CREATE POLICY "Allow all operations" ON notificaciones FOR ALL TO public USING (true);

-- Políticas para avisos
DROP POLICY IF EXISTS "Allow all operations" ON avisos;
CREATE POLICY "Allow all operations" ON avisos FOR ALL TO public USING (true);

-- Políticas para tickets
DROP POLICY IF EXISTS "Allow all operations" ON tickets;
CREATE POLICY "Allow all operations" ON tickets FOR ALL TO public USING (true);

-- =====================================================
-- 4. INSERTAR DATOS INICIALES NECESARIOS
-- =====================================================

-- Insertar admin principal (mantener credenciales existentes)
INSERT INTO admins (username, password_hash, password_salt, role, nombre, email, is_active)
VALUES ('KatanaRz', 'admin_hash_placeholder', 'admin_salt_placeholder', 'admin', 'Administrador Principal', 'admin@cvmcapital.com', true)
ON CONFLICT (username) DO NOTHING;

-- Insertar configuración inicial del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('semana_actual', '1', 'Número de la semana actual del sistema'),
('fecha_inicio_semana', '2024-01-01', 'Fecha de inicio de la semana actual'),
('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores'),
('porcentaje_partners', '30', 'Porcentaje de ganancias para partners')
ON CONFLICT (clave) DO NOTHING;

-- =====================================================
-- 5. CREAR TODAS LAS FUNCIONES NECESARIAS
-- =====================================================

-- Función para obtener datos del gráfico semanal
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS TABLE(week text, ganancia numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Sem ' || gs.semana_numero::text as week,
    COALESCE(gs.ganancia_bruta, 0) as ganancia
  FROM ganancias_semanales gs
  ORDER BY gs.semana_numero DESC
  LIMIT 8;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular inversión total del inversor
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id uuid)
RETURNS numeric AS $$
DECLARE
  total_depositos numeric := 0;
  total_retiros numeric := 0;
BEGIN
  -- Sumar depósitos
  SELECT COALESCE(SUM(monto), 0) INTO total_depositos
  FROM transacciones 
  WHERE inversor_id = p_inversor_id 
  AND tipo IN ('deposito', 'depósito');
  
  -- Sumar retiros
  SELECT COALESCE(SUM(monto), 0) INTO total_retiros
  FROM transacciones 
  WHERE inversor_id = p_inversor_id 
  AND tipo = 'retiro';
  
  RETURN total_depositos - total_retiros;
END;
$$ LANGUAGE plpgsql;

-- Función para validar retiro de inversor
CREATE OR REPLACE FUNCTION validar_retiro_inversor(p_inversor_id uuid, p_monto numeric)
RETURNS boolean AS $$
DECLARE
  saldo_actual numeric;
BEGIN
  SELECT total INTO saldo_actual FROM inversores WHERE id = p_inversor_id;
  RETURN p_monto <= COALESCE(saldo_actual, 0);
END;
$$ LANGUAGE plpgsql;

-- Función para validar retiro de partner
CREATE OR REPLACE FUNCTION validar_retiro_partner(p_partner_id uuid, p_monto numeric)
RETURNS boolean AS $$
DECLARE
  saldo_actual numeric;
BEGIN
  SELECT inversion_inicial INTO saldo_actual FROM partners WHERE id = p_partner_id;
  RETURN p_monto <= COALESCE(saldo_actual, 0);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener inversores disponibles
CREATE OR REPLACE FUNCTION obtener_inversores_disponibles()
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  email text,
  total numeric,
  partner_assigned boolean,
  partner_nombre text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nombre,
    i.apellido,
    i.email,
    i.total,
    CASE WHEN pi.inversor_id IS NOT NULL THEN true ELSE false END as partner_assigned,
    p.nombre as partner_nombre
  FROM inversores i
  LEFT JOIN partner_inversores pi ON i.id = pi.inversor_id
  LEFT JOIN partners p ON pi.partner_id = p.id
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de partners
CREATE OR REPLACE FUNCTION obtener_resumen_partners()
RETURNS TABLE(
  partner_id uuid,
  partner_nombre text,
  partner_tipo text,
  total_inversores bigint,
  monto_total numeric,
  inversores json
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as partner_id,
    p.nombre as partner_nombre,
    p.tipo as partner_tipo,
    COUNT(pi.inversor_id) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total,
    COALESCE(
      json_agg(
        json_build_object(
          'id', i.id,
          'nombre', i.nombre,
          'apellido', i.apellido,
          'email', i.email,
          'total', i.total
        )
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::json
    ) as inversores
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo
  HAVING COUNT(pi.inversor_id) > 0
  ORDER BY p.nombre;
END;
$$ LANGUAGE plpgsql;

-- Función para validar eliminación de partner
CREATE OR REPLACE FUNCTION validar_eliminacion_partner(p_partner_id uuid)
RETURNS TABLE(
  puede_eliminar boolean,
  total_inversores bigint,
  mensaje text
) AS $$
DECLARE
  count_inversores bigint;
BEGIN
  SELECT COUNT(*) INTO count_inversores
  FROM partner_inversores
  WHERE partner_id = p_partner_id;
  
  RETURN QUERY
  SELECT 
    true as puede_eliminar,
    count_inversores as total_inversores,
    CASE 
      WHEN count_inversores = 0 THEN 'El partner puede ser eliminado sin problemas.'
      ELSE 'El partner tiene ' || count_inversores || ' inversores asignados que serán liberados.'
    END as mensaje;
END;
$$ LANGUAGE plpgsql;

-- Función para configurar semana del sistema
CREATE OR REPLACE FUNCTION configurar_semana_sistema(
  p_semana_numero integer,
  p_fecha_inicio date,
  p_admin_id uuid
)
RETURNS json AS $$
BEGIN
  -- Actualizar semana actual
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
  VALUES ('semana_actual', p_semana_numero::text, 'Número de la semana actual del sistema', p_admin_id, now())
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = p_semana_numero::text,
    updated_by = p_admin_id,
    updated_at = now();
  
  -- Actualizar fecha de inicio
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
  VALUES ('fecha_inicio_semana', p_fecha_inicio::text, 'Fecha de inicio de la semana actual', p_admin_id, now())
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = p_fecha_inicio::text,
    updated_by = p_admin_id,
    updated_at = now();
  
  RETURN json_build_object('success', true, 'message', 'Configuración actualizada correctamente');
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos de partner actualizados
CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(p_partner_id uuid)
RETURNS TABLE(
  inversion_total numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN pt.tipo = 'deposito' THEN pt.monto
        WHEN pt.tipo = 'retiro' THEN -pt.monto
        ELSE 0
      END
    ), 0) + COALESCE(p.inversion_inicial, 0) as inversion_total
  FROM partners p
  LEFT JOIN partner_transacciones pt ON p.id = pt.partner_id
  WHERE p.id = p_partner_id
  GROUP BY p.id, p.inversion_inicial;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos de torta del partner
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id uuid)
RETURNS TABLE(
  name text,
  value numeric,
  color text
) AS $$
DECLARE
  total_depositos numeric := 0;
  total_retiros numeric := 0;
  total_ganancias numeric := 0;
BEGIN
  -- Calcular depósitos
  SELECT COALESCE(SUM(monto), 0) INTO total_depositos
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id AND tipo = 'deposito';
  
  -- Calcular retiros
  SELECT COALESCE(SUM(monto), 0) INTO total_retiros
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id AND tipo = 'retiro';
  
  -- Calcular ganancias
  SELECT COALESCE(SUM(monto), 0) INTO total_ganancias
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id AND tipo = 'ganancia';
  
  -- Retornar datos solo si hay valores
  IF total_depositos > 0 THEN
    RETURN QUERY SELECT 'Depósitos'::text, total_depositos, '#10b981'::text;
  END IF;
  
  IF total_retiros > 0 THEN
    RETURN QUERY SELECT 'Retiros'::text, total_retiros, '#ef4444'::text;
  END IF;
  
  IF total_ganancias > 0 THEN
    RETURN QUERY SELECT 'Ganancias'::text, total_ganancias, '#3b82f6'::text;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener inversores con ganancias del partner
CREATE OR REPLACE FUNCTION obtener_inversores_con_ganancias_partner(p_partner_id uuid)
RETURNS TABLE(
  inversor_id uuid,
  nombre text,
  apellido text,
  email text,
  total_invertido numeric,
  ganancia_semanal numeric,
  ganancia_para_partner numeric,
  porcentaje_ganancia numeric
) AS $$
DECLARE
  porcentaje_inversores numeric;
  partner_tipo text;
BEGIN
  -- Obtener configuración
  SELECT valor::numeric INTO porcentaje_inversores
  FROM configuracion_sistema 
  WHERE clave = 'porcentaje_inversores';
  
  IF porcentaje_inversores IS NULL THEN
    porcentaje_inversores := 70;
  END IF;
  
  -- Obtener tipo de partner
  SELECT tipo INTO partner_tipo
  FROM partners 
  WHERE id = p_partner_id;
  
  RETURN QUERY
  SELECT 
    i.id as inversor_id,
    i.nombre,
    i.apellido,
    i.email,
    i.total as total_invertido,
    i.ganancia_semanal,
    CASE 
      WHEN partner_tipo = 'operador_partner' THEN 
        (i.total * 0.05 * (100 - porcentaje_inversores) / 100)
      ELSE 
        (i.total * 0.05 * (100 - porcentaje_inversores) / 100 / 3)
    END as ganancia_para_partner,
    porcentaje_inversores
  FROM inversores i
  INNER JOIN partner_inversores pi ON i.id = pi.inversor_id
  WHERE pi.partner_id = p_partner_id
  ORDER BY i.nombre, i.apellido;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener tickets del admin
CREATE OR REPLACE FUNCTION obtener_tickets_admin()
RETURNS TABLE(
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.usuario_id,
    t.tipo_usuario,
    t.titulo,
    t.mensaje,
    t.estado,
    t.respuesta,
    t.fecha_creacion,
    t.fecha_respuesta,
    CASE 
      WHEN t.tipo_usuario = 'inversor' THEN i.nombre || ' ' || i.apellido
      WHEN t.tipo_usuario = 'partner' THEN p.nombre
      ELSE 'Usuario desconocido'
    END as usuario_nombre,
    a.nombre as admin_nombre
  FROM tickets t
  LEFT JOIN inversores i ON t.usuario_id = i.id AND t.tipo_usuario = 'inversor'
  LEFT JOIN partners p ON t.usuario_id = p.id AND t.tipo_usuario = 'partner'
  LEFT JOIN admins a ON t.respondido_por = a.id
  ORDER BY t.fecha_creacion DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener ticket del usuario
CREATE OR REPLACE FUNCTION obtener_ticket_usuario(p_usuario_id uuid, p_tipo_usuario text)
RETURNS json AS $$
DECLARE
  ticket_data json;
  has_ticket boolean := false;
BEGIN
  SELECT json_build_object(
    'id', t.id,
    'titulo', t.titulo,
    'mensaje', t.mensaje,
    'estado', t.estado,
    'respuesta', t.respuesta,
    'fecha_creacion', t.fecha_creacion,
    'fecha_respuesta', t.fecha_respuesta,
    'admin_nombre', a.nombre
  ) INTO ticket_data
  FROM tickets t
  LEFT JOIN admins a ON t.respondido_por = a.id
  WHERE t.usuario_id = p_usuario_id 
  AND t.tipo_usuario = p_tipo_usuario
  AND t.estado IN ('abierto', 'respondido')
  ORDER BY t.fecha_creacion DESC
  LIMIT 1;
  
  IF ticket_data IS NOT NULL THEN
    has_ticket := true;
  END IF;
  
  RETURN json_build_object(
    'has_ticket', has_ticket,
    'ticket', ticket_data
  );
END;
$$ LANGUAGE plpgsql;

-- Función para crear ticket
CREATE OR REPLACE FUNCTION crear_ticket(
  p_usuario_id uuid,
  p_tipo_usuario text,
  p_titulo text,
  p_mensaje text
)
RETURNS json AS $$
DECLARE
  existing_ticket json;
  new_ticket_id uuid;
BEGIN
  -- Verificar si ya tiene un ticket abierto
  SELECT json_build_object(
    'id', id,
    'titulo', titulo,
    'estado', estado,
    'fecha_creacion', fecha_creacion
  ) INTO existing_ticket
  FROM tickets
  WHERE usuario_id = p_usuario_id 
  AND tipo_usuario = p_tipo_usuario
  AND estado IN ('abierto', 'respondido')
  LIMIT 1;
  
  IF existing_ticket IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ya tienes un ticket abierto. Espera a que sea respondido antes de crear uno nuevo.',
      'existing_ticket', existing_ticket
    );
  END IF;
  
  -- Crear nuevo ticket
  INSERT INTO tickets (usuario_id, tipo_usuario, titulo, mensaje)
  VALUES (p_usuario_id, p_tipo_usuario, p_titulo, p_mensaje)
  RETURNING id INTO new_ticket_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Ticket creado exitosamente',
    'ticket', json_build_object(
      'id', new_ticket_id,
      'titulo', p_titulo,
      'mensaje', p_mensaje,
      'estado', 'abierto',
      'fecha_creacion', now()
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Función para responder ticket
CREATE OR REPLACE FUNCTION responder_ticket(
  p_ticket_id uuid,
  p_respuesta text,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  ticket_usuario_id uuid;
  ticket_tipo_usuario text;
  ticket_titulo text;
BEGIN
  -- Obtener datos del ticket
  SELECT usuario_id, tipo_usuario, titulo 
  INTO ticket_usuario_id, ticket_tipo_usuario, ticket_titulo
  FROM tickets 
  WHERE id = p_ticket_id;
  
  IF ticket_usuario_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Ticket no encontrado');
  END IF;
  
  -- Actualizar ticket
  UPDATE tickets 
  SET 
    respuesta = p_respuesta,
    estado = 'respondido',
    fecha_respuesta = now(),
    respondido_por = p_admin_id
  WHERE id = p_ticket_id;
  
  -- Crear notificación para el usuario
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  VALUES (
    ticket_usuario_id,
    ticket_tipo_usuario,
    'Respuesta a tu ticket: ' || ticket_titulo,
    'Tu ticket de soporte ha sido respondido. Revisa la respuesta en el sistema de tickets.',
    'info'
  );
  
  RETURN json_build_object('success', true, 'message', 'Ticket respondido exitosamente');
END;
$$ LANGUAGE plpgsql;

-- Función para cerrar ticket
CREATE OR REPLACE FUNCTION cerrar_ticket(
  p_ticket_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
BEGIN
  UPDATE tickets 
  SET estado = 'cerrado'
  WHERE id = p_ticket_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Ticket no encontrado');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Ticket cerrado exitosamente');
END;
$$ LANGUAGE plpgsql;

-- Función para enviar aviso a todos los inversores
CREATE OR REPLACE FUNCTION enviar_aviso_a_todos_inversores(
  p_titulo text,
  p_mensaje text,
  p_tipo text,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  aviso_id uuid;
  total_notificaciones integer := 0;
BEGIN
  -- Crear el aviso
  INSERT INTO avisos (titulo, mensaje, tipo, creado_por)
  VALUES (p_titulo, p_mensaje, p_tipo, p_admin_id)
  RETURNING id INTO aviso_id;
  
  -- Enviar notificación a todos los inversores
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT 
    i.id,
    'inversor',
    p_titulo,
    p_mensaje,
    p_tipo
  FROM inversores i;
  
  GET DIAGNOSTICS total_notificaciones = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Aviso creado y ' || total_notificaciones || ' notificaciones enviadas',
    'aviso_id', aviso_id
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNCIONES DE PREVIEW PARA GANANCIAS
-- =====================================================

-- Función para obtener distribución de partners (preview)
CREATE OR REPLACE FUNCTION obtener_distribucion_partners_preview(
  p_total_inversion numeric,
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL
)
RETURNS TABLE(
  partner_id uuid,
  nombre text,
  tipo text,
  inversion_inicial numeric,
  total_inversores bigint,
  monto_total_inversores numeric,
  ganancia_comision numeric,
  ganancia_operador numeric,
  ganancia_total numeric
) AS $$
DECLARE
  ganancia_bruta_calc numeric;
  porcentaje_inversores numeric;
BEGIN
  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    ganancia_bruta_calc := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    ganancia_bruta_calc := (p_porcentaje * p_total_inversion) / 100;
  ELSE
    ganancia_bruta_calc := 0;
  END IF;
  
  -- Obtener porcentaje para inversores
  SELECT valor::numeric INTO porcentaje_inversores
  FROM configuracion_sistema 
  WHERE clave = 'porcentaje_inversores';
  
  IF porcentaje_inversores IS NULL THEN
    porcentaje_inversores := 70;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as partner_id,
    p.nombre,
    p.tipo,
    p.inversion_inicial,
    COUNT(pi.inversor_id) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total_inversores,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Operador+Partner: 100% de su ganancia + 100% de comisión de inversores
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * (100 - porcentaje_inversores) / 100)
      ELSE 
        -- Partner normal: 80% de su ganancia + 1/3 de comisión de inversores
        (p.inversion_inicial * 0.05 * 0.8) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * (100 - porcentaje_inversores) / 100 / 3)
    END as ganancia_comision,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Ganancia adicional como operador (50% extra)
        (p.inversion_inicial * 0.05 * 0.5)
      ELSE 
        0
    END as ganancia_operador,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Total para operador+partner
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * (100 - porcentaje_inversores) / 100) +
        (p.inversion_inicial * 0.05 * 0.5)
      ELSE 
        -- Total para partner normal
        (p.inversion_inicial * 0.05 * 0.8) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * (100 - porcentaje_inversores) / 100 / 3)
    END as ganancia_total
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.inversion_inicial, porcentaje_inversores
  ORDER BY p.nombre;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener distribución de inversores (preview)
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores_preview(
  p_total_inversion numeric,
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL
)
RETURNS TABLE(
  inversor_id uuid,
  nombre text,
  apellido text,
  email text,
  inversion numeric,
  ganancia_individual numeric
) AS $$
DECLARE
  ganancia_bruta_calc numeric;
  porcentaje_inversores numeric;
BEGIN
  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    ganancia_bruta_calc := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    ganancia_bruta_calc := (p_porcentaje * p_total_inversion) / 100;
  ELSE
    ganancia_bruta_calc := 0;
  END IF;
  
  -- Obtener porcentaje para inversores
  SELECT valor::numeric INTO porcentaje_inversores
  FROM configuracion_sistema 
  WHERE clave = 'porcentaje_inversores';
  
  IF porcentaje_inversores IS NULL THEN
    porcentaje_inversores := 70;
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id as inversor_id,
    i.nombre,
    i.apellido,
    i.email,
    i.total as inversion,
    (i.total * 0.05 * porcentaje_inversores / 100) as ganancia_individual
  FROM inversores i
  WHERE i.total > 0
  ORDER BY i.nombre, i.apellido;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNCIÓN PRINCIPAL PARA PROCESAR GANANCIAS
-- =====================================================

CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  semana_actual integer;
  total_inversion numeric;
  ganancia_bruta_calc numeric;
  ganancia_partners numeric;
  ganancia_inversores numeric;
  porcentaje_inversores numeric;
  fecha_inicio date;
  fecha_fin date;
  result_message text;
BEGIN
  -- Obtener semana actual
  SELECT valor::integer INTO semana_actual
  FROM configuracion_sistema 
  WHERE clave = 'semana_actual';
  
  IF semana_actual IS NULL THEN
    semana_actual := 1;
  END IF;
  
  -- Obtener porcentaje para inversores
  SELECT valor::numeric INTO porcentaje_inversores
  FROM configuracion_sistema 
  WHERE clave = 'porcentaje_inversores';
  
  IF porcentaje_inversores IS NULL THEN
    porcentaje_inversores := 70;
  END IF;
  
  -- Calcular total de inversión
  SELECT 
    COALESCE(SUM(i.total), 0) + COALESCE(SUM(p.inversion_inicial), 0)
  INTO total_inversion
  FROM inversores i
  FULL OUTER JOIN partners p ON true
  WHERE (i.total > 0 OR p.inversion_inicial > 0) AND (p.activo IS NULL OR p.activo = true);
  
  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    ganancia_bruta_calc := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    ganancia_bruta_calc := (p_porcentaje * total_inversion) / 100;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Debe proporcionar porcentaje o ganancia bruta');
  END IF;
  
  -- Calcular distribución
  ganancia_inversores := ganancia_bruta_calc * (porcentaje_inversores / 100);
  ganancia_partners := ganancia_bruta_calc * ((100 - porcentaje_inversores) / 100);
  
  -- Calcular fechas
  SELECT valor::date INTO fecha_inicio
  FROM configuracion_sistema 
  WHERE clave = 'fecha_inicio_semana';
  
  IF fecha_inicio IS NULL THEN
    fecha_inicio := CURRENT_DATE;
  END IF;
  
  fecha_fin := fecha_inicio + INTERVAL '6 days';
  
  -- Verificar si ya existe la semana
  IF EXISTS (SELECT 1 FROM ganancias_semanales WHERE semana_numero = semana_actual) THEN
    RETURN json_build_object('success', false, 'error', 'La semana ' || semana_actual || ' ya ha sido procesada');
  END IF;
  
  -- Insertar registro de ganancias semanales
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion,
    porcentaje_ganancia, ganancia_bruta, ganancia_partners, ganancia_inversores,
    procesado, fecha_procesado, procesado_por
  ) VALUES (
    semana_actual, fecha_inicio, fecha_fin, total_inversion,
    COALESCE(p_porcentaje, (ganancia_bruta_calc * 100 / total_inversion)), 
    ganancia_bruta_calc, ganancia_partners, ganancia_inversores,
    true, now(), p_admin_id
  );
  
  -- Procesar ganancias de inversores
  UPDATE inversores 
  SET 
    ganancia_semanal = total * 0.05 * (porcentaje_inversores / 100),
    total = total + (total * 0.05 * (porcentaje_inversores / 100))
  WHERE total > 0;
  
  -- Crear transacciones para inversores
  INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
  SELECT 
    id,
    total * 0.05 * (porcentaje_inversores / 100),
    'ganancia',
    'Ganancia semanal - Semana ' || semana_actual
  FROM inversores 
  WHERE total > 0;
  
  -- Procesar ganancias de partners
  INSERT INTO partner_ganancias (
    partner_id, semana_numero, ganancia_total, ganancia_comision, ganancia_operador,
    total_inversores, monto_total_inversores
  )
  SELECT 
    p.id,
    semana_actual,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * (100 - porcentaje_inversores) / 100) +
        (p.inversion_inicial * 0.05 * 0.5)
      ELSE 
        (p.inversion_inicial * 0.05 * 0.8) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * (100 - porcentaje_inversores) / 100 / 3)
    END,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * (100 - porcentaje_inversores) / 100)
      ELSE 
        (p.inversion_inicial * 0.05 * 0.8) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * (100 - porcentaje_inversores) / 100 / 3)
    END,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN (p.inversion_inicial * 0.05 * 0.5)
      ELSE 0
    END,
    COUNT(pi.inversor_id),
    COALESCE(SUM(i.total), 0)
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.tipo, p.inversion_inicial;
  
  -- Actualizar inversión de partners
  UPDATE partners 
  SET inversion_inicial = inversion_inicial + (inversion_inicial * 0.05)
  WHERE activo = true AND inversion_inicial > 0;
  
  -- Crear transacciones para partners
  INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
  SELECT 
    pg.partner_id,
    pg.ganancia_total,
    'ganancia',
    'Ganancia semanal - Semana ' || semana_actual
  FROM partner_ganancias pg
  WHERE pg.semana_numero = semana_actual;
  
  -- Enviar notificaciones a inversores
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT 
    i.id,
    'inversor',
    'Ganancias Procesadas - Semana ' || semana_actual,
    'Tus ganancias de la semana ' || semana_actual || ' han sido procesadas. Ganancia: $' || 
    ROUND(i.ganancia_semanal, 2) || '. Nuevo saldo: $' || ROUND(i.total, 2),
    'success'
  FROM inversores i
  WHERE i.total > 0;
  
  -- Enviar notificaciones a partners
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT 
    p.id,
    'partner',
    'Ganancias Procesadas - Semana ' || semana_actual,
    'Tus ganancias de la semana ' || semana_actual || ' han sido procesadas. Ganancia total: $' || 
    ROUND(pg.ganancia_total, 2),
    'success'
  FROM partners p
  INNER JOIN partner_ganancias pg ON p.id = pg.partner_id
  WHERE pg.semana_numero = semana_actual;
  
  result_message := 'Ganancias de la semana ' || semana_actual || ' procesadas exitosamente. ' ||
                   'Total inversión: $' || ROUND(total_inversion, 2) || ', ' ||
                   'Ganancia bruta: $' || ROUND(ganancia_bruta_calc, 2);
  
  RETURN json_build_object('success', true, 'message', result_message);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CREAR TRIGGERS PARA PROCESAMIENTO AUTOMÁTICO
-- =====================================================

-- Función para procesar solicitud de inversor
CREATE OR REPLACE FUNCTION procesar_solicitud_inversor()
RETURNS trigger AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'aprobado'
  IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
    -- Crear transacción
    INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
    VALUES (NEW.inversor_id, NEW.monto, NEW.tipo, 'Solicitud aprobada - ID: ' || NEW.id);
    
    -- Actualizar saldo del inversor
    IF NEW.tipo = 'deposito' THEN
      UPDATE inversores 
      SET total = total + NEW.monto
      WHERE id = NEW.inversor_id;
    ELSIF NEW.tipo = 'retiro' THEN
      UPDATE inversores 
      SET total = total - NEW.monto
      WHERE id = NEW.inversor_id;
    END IF;
    
    -- Crear notificación
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (
      NEW.inversor_id,
      'inversor',
      'Solicitud Aprobada',
      'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada.',
      'success'
    );
  ELSIF NEW.estado = 'rechazado' AND OLD.estado = 'pendiente' THEN
    -- Crear notificación de rechazo
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (
      NEW.inversor_id,
      'inversor',
      'Solicitud Rechazada',
      'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido rechazada. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
      'warning'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para procesar solicitud de partner
CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS trigger AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'aprobado'
  IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
    -- Crear transacción
    INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
    VALUES (NEW.partner_id, NEW.monto, NEW.tipo, 'Solicitud aprobada - ID: ' || NEW.id);
    
    -- Actualizar saldo del partner
    IF NEW.tipo = 'deposito' THEN
      UPDATE partners 
      SET inversion_inicial = inversion_inicial + NEW.monto
      WHERE id = NEW.partner_id;
    ELSIF NEW.tipo = 'retiro' THEN
      UPDATE partners 
      SET inversion_inicial = inversion_inicial - NEW.monto
      WHERE id = NEW.partner_id;
    END IF;
    
    -- Crear notificación
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (
      NEW.partner_id,
      'partner',
      'Solicitud Aprobada',
      'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada.',
      'success'
    );
  ELSIF NEW.estado = 'rechazado' AND OLD.estado = 'pendiente' THEN
    -- Crear notificación de rechazo
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (
      NEW.partner_id,
      'partner',
      'Solicitud Rechazada',
      'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido rechazada. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
      'warning'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS trigger_procesar_solicitud_inversor ON solicitudes;
CREATE TRIGGER trigger_procesar_solicitud_inversor
  AFTER UPDATE ON solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_inversor();

DROP TRIGGER IF EXISTS trigger_procesar_solicitud_partner ON partner_solicitudes;
CREATE TRIGGER trigger_procesar_solicitud_partner
  AFTER UPDATE ON partner_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_partner();