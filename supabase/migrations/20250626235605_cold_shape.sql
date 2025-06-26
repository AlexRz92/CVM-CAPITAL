-- =====================================================
-- SQL COMPLETO PARA BASE DE DATOS CVM CAPITAL
-- EJECUTAR MANUALMENTE EN SUPABASE
-- =====================================================

-- PASO 1: ELIMINAR TODAS LAS FUNCIONES EXISTENTES
-- =====================================================

DROP FUNCTION IF EXISTS configurar_semana_sistema(integer, date, uuid) CASCADE;
DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_distribucion_partners_preview(numeric, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS obtener_distribucion_inversores_preview(numeric, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS validar_retiro_inversor(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS validar_retiro_partner(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS calcular_inversion_total_inversor(uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_datos_partner_actualizados(uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_datos_grafico_semanal() CASCADE;
DROP FUNCTION IF EXISTS obtener_datos_torta_partner(uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_inversores_disponibles() CASCADE;
DROP FUNCTION IF EXISTS obtener_resumen_partners() CASCADE;
DROP FUNCTION IF EXISTS validar_eliminacion_partner(uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_inversores_con_ganancias_partner(uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_tickets_admin() CASCADE;
DROP FUNCTION IF EXISTS obtener_ticket_usuario(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS crear_ticket(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS responder_ticket(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS cerrar_ticket(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS enviar_aviso_a_todos_inversores(text, text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS procesar_solicitud_inversor() CASCADE;
DROP FUNCTION IF EXISTS procesar_solicitud_partner() CASCADE;

-- PASO 2: ELIMINAR TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_procesar_solicitud_inversor ON solicitudes CASCADE;
DROP TRIGGER IF EXISTS trigger_procesar_solicitud_partner ON partner_solicitudes CASCADE;

-- PASO 3: ELIMINAR TABLAS SI EXISTEN (OPCIONAL - SOLO SI QUIERES EMPEZAR DESDE CERO)
-- =====================================================

-- Descomenta las siguientes líneas SOLO si quieres eliminar todas las tablas
-- DROP TABLE IF EXISTS notificaciones CASCADE;
-- DROP TABLE IF EXISTS tickets CASCADE;
-- DROP TABLE IF EXISTS avisos CASCADE;
-- DROP TABLE IF EXISTS partner_ganancias CASCADE;
-- DROP TABLE IF EXISTS ganancias_semanales CASCADE;
-- DROP TABLE IF EXISTS partner_inversores CASCADE;
-- DROP TABLE IF EXISTS partner_solicitudes CASCADE;
-- DROP TABLE IF EXISTS solicitudes CASCADE;
-- DROP TABLE IF EXISTS partner_transacciones CASCADE;
-- DROP TABLE IF EXISTS transacciones CASCADE;
-- DROP TABLE IF EXISTS configuracion_sistema CASCADE;
-- DROP TABLE IF EXISTS partners CASCADE;
-- DROP TABLE IF EXISTS admins CASCADE;
-- DROP TABLE IF EXISTS inversores CASCADE;

-- PASO 4: CREAR TODAS LAS TABLAS
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

-- PASO 5: HABILITAR RLS EN TODAS LAS TABLAS
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

-- PASO 6: CREAR POLÍTICAS RLS PERMISIVAS
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

-- PASO 7: INSERTAR DATOS INICIALES
-- =====================================================

-- Insertar admin por defecto (solo si no existe)
INSERT INTO admins (username, password_hash, password_salt, role, nombre, email, is_active)
SELECT 'KatanaRz', 'admin_hash_default', 'admin_salt_default', 'admin', 'Administrador Principal', 'admin@cvmcapital.com', true
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'KatanaRz');

-- Insertar configuración inicial
INSERT INTO configuracion_sistema (clave, valor, descripcion) 
VALUES 
    ('semana_actual', '1', 'Número de semana actual del sistema'),
    ('fecha_inicio_semana', '2024-01-01', 'Fecha de inicio de la semana actual'),
    ('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores')
ON CONFLICT (clave) DO NOTHING;

-- PASO 8: CREAR TODAS LAS FUNCIONES
-- =====================================================

-- Función para configurar semana del sistema
CREATE OR REPLACE FUNCTION configurar_semana_sistema(
    p_semana_numero integer,
    p_fecha_inicio date,
    p_admin_id uuid
) RETURNS void AS $$
BEGIN
    -- Actualizar o insertar semana actual
    INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
    VALUES ('semana_actual', p_semana_numero::text, 'Número de semana actual del sistema', p_admin_id, now())
    ON CONFLICT (clave) DO UPDATE SET 
        valor = p_semana_numero::text,
        updated_by = p_admin_id,
        updated_at = now();
    
    -- Actualizar o insertar fecha de inicio
    INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
    VALUES ('fecha_inicio_semana', p_fecha_inicio::text, 'Fecha de inicio de la semana actual', p_admin_id, now())
    ON CONFLICT (clave) DO UPDATE SET 
        valor = p_fecha_inicio::text,
        updated_by = p_admin_id,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Función para validar retiro de inversor
CREATE OR REPLACE FUNCTION validar_retiro_inversor(
    p_inversor_id uuid,
    p_monto numeric
) RETURNS boolean AS $$
DECLARE
    v_saldo_actual numeric;
BEGIN
    SELECT total INTO v_saldo_actual
    FROM inversores
    WHERE id = p_inversor_id;
    
    RETURN COALESCE(v_saldo_actual, 0) >= p_monto;
END;
$$ LANGUAGE plpgsql;

-- Función para validar retiro de partner
CREATE OR REPLACE FUNCTION validar_retiro_partner(
    p_partner_id uuid,
    p_monto numeric
) RETURNS boolean AS $$
DECLARE
    v_saldo_actual numeric;
BEGIN
    SELECT inversion_inicial INTO v_saldo_actual
    FROM partners
    WHERE id = p_partner_id;
    
    RETURN COALESCE(v_saldo_actual, 0) >= p_monto;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular inversión total del inversor
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(
    p_inversor_id uuid
) RETURNS numeric AS $$
DECLARE
    v_total_depositos numeric := 0;
    v_total_retiros numeric := 0;
    v_inversion_total numeric := 0;
BEGIN
    -- Calcular total de depósitos
    SELECT COALESCE(SUM(monto), 0) INTO v_total_depositos
    FROM transacciones
    WHERE inversor_id = p_inversor_id 
    AND tipo IN ('deposito', 'depósito');
    
    -- Calcular total de retiros
    SELECT COALESCE(SUM(monto), 0) INTO v_total_retiros
    FROM transacciones
    WHERE inversor_id = p_inversor_id 
    AND tipo = 'retiro';
    
    v_inversion_total := v_total_depositos - v_total_retiros;
    
    RETURN GREATEST(v_inversion_total, 0);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos actualizados del partner
CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(
    p_partner_id uuid
) RETURNS TABLE(
    inversion_total numeric
) AS $$
DECLARE
    v_total_depositos numeric := 0;
    v_total_retiros numeric := 0;
BEGIN
    -- Calcular total de depósitos del partner
    SELECT COALESCE(SUM(monto), 0) INTO v_total_depositos
    FROM partner_transacciones
    WHERE partner_id = p_partner_id 
    AND tipo IN ('deposito', 'depósito');
    
    -- Calcular total de retiros del partner
    SELECT COALESCE(SUM(monto), 0) INTO v_total_retiros
    FROM partner_transacciones
    WHERE partner_id = p_partner_id 
    AND tipo = 'retiro';
    
    RETURN QUERY SELECT GREATEST(v_total_depositos - v_total_retiros, 0);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos del gráfico semanal
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS TABLE(
    week text,
    ganancia numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Sem ' || gs.semana_numero::text as week,
        COALESCE(gs.ganancia_bruta, 0) as ganancia
    FROM ganancias_semanales gs
    ORDER BY gs.semana_numero DESC
    LIMIT 8;
    
    -- Si no hay datos, devolver datos por defecto
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 'Sem ' || generate_series(1,4)::text, 0::numeric;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos de la gráfica de torta del partner
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(
    p_partner_id uuid
) RETURNS TABLE(
    name text,
    value numeric,
    color text
) AS $$
DECLARE
    v_depositos numeric := 0;
    v_retiros numeric := 0;
    v_ganancias numeric := 0;
BEGIN
    -- Calcular depósitos
    SELECT COALESCE(SUM(monto), 0) INTO v_depositos
    FROM partner_transacciones
    WHERE partner_id = p_partner_id 
    AND tipo IN ('deposito', 'depósito');
    
    -- Calcular retiros
    SELECT COALESCE(SUM(monto), 0) INTO v_retiros
    FROM partner_transacciones
    WHERE partner_id = p_partner_id 
    AND tipo = 'retiro';
    
    -- Calcular ganancias
    SELECT COALESCE(SUM(monto), 0) INTO v_ganancias
    FROM partner_transacciones
    WHERE partner_id = p_partner_id 
    AND tipo = 'ganancia';
    
    -- Devolver solo los que tienen valor > 0
    IF v_depositos > 0 THEN
        RETURN QUERY SELECT 'Depósitos'::text, v_depositos, '#10b981'::text;
    END IF;
    
    IF v_retiros > 0 THEN
        RETURN QUERY SELECT 'Retiros'::text, v_retiros, '#ef4444'::text;
    END IF;
    
    IF v_ganancias > 0 THEN
        RETURN QUERY SELECT 'Ganancias'::text, v_ganancias, '#3b82f6'::text;
    END IF;
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
        CASE WHEN pi.partner_id IS NOT NULL THEN true ELSE false END as partner_assigned,
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
CREATE OR REPLACE FUNCTION validar_eliminacion_partner(
    p_partner_id uuid
) RETURNS TABLE(
    puede_eliminar boolean,
    total_inversores bigint,
    mensaje text
) AS $$
DECLARE
    v_total_inversores bigint;
BEGIN
    SELECT COUNT(*) INTO v_total_inversores
    FROM partner_inversores
    WHERE partner_id = p_partner_id;
    
    RETURN QUERY SELECT 
        true as puede_eliminar,
        v_total_inversores,
        CASE 
            WHEN v_total_inversores = 0 THEN 'El partner puede ser eliminado sin problemas.'
            ELSE 'El partner tiene ' || v_total_inversores || ' inversores asignados que serán liberados.'
        END as mensaje;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener inversores con ganancias del partner
CREATE OR REPLACE FUNCTION obtener_inversores_con_ganancias_partner(
    p_partner_id uuid
) RETURNS TABLE(
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
    v_partner_tipo text;
    v_porcentaje_inversores numeric := 70; -- Por defecto 70%
BEGIN
    -- Obtener tipo de partner
    SELECT tipo INTO v_partner_tipo
    FROM partners
    WHERE id = p_partner_id;
    
    -- Obtener porcentaje configurado para inversores
    SELECT valor::numeric INTO v_porcentaje_inversores
    FROM configuracion_sistema
    WHERE clave = 'porcentaje_inversores';
    
    IF v_porcentaje_inversores IS NULL THEN
        v_porcentaje_inversores := 70;
    END IF;
    
    RETURN QUERY
    SELECT 
        i.id as inversor_id,
        i.nombre,
        i.apellido,
        i.email,
        i.total as total_invertido,
        i.ganancia_semanal,
        CASE 
            WHEN v_partner_tipo = 'operador_partner' THEN
                -- Operador+Partner recibe 100% de la porción de partners
                (i.total * 0.05 * (100 - v_porcentaje_inversores) / 100)
            ELSE
                -- Partner normal recibe 1/3 de la porción de partners
                (i.total * 0.05 * (100 - v_porcentaje_inversores) / 100 / 3)
        END as ganancia_para_partner,
        v_porcentaje_inversores as porcentaje_ganancia
    FROM inversores i
    INNER JOIN partner_inversores pi ON i.id = pi.inversor_id
    WHERE pi.partner_id = p_partner_id
    ORDER BY i.nombre, i.apellido;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener tickets para admin
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

-- Función para obtener ticket de usuario
CREATE OR REPLACE FUNCTION obtener_ticket_usuario(
    p_usuario_id uuid,
    p_tipo_usuario text
) RETURNS TABLE(
    has_ticket boolean,
    ticket json
) AS $$
DECLARE
    v_ticket_data json;
    v_has_ticket boolean := false;
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
    ) INTO v_ticket_data
    FROM tickets t
    LEFT JOIN admins a ON t.respondido_por = a.id
    WHERE t.usuario_id = p_usuario_id 
    AND t.tipo_usuario = p_tipo_usuario
    AND t.estado IN ('abierto', 'respondido')
    ORDER BY t.fecha_creacion DESC
    LIMIT 1;
    
    IF v_ticket_data IS NOT NULL THEN
        v_has_ticket := true;
    END IF;
    
    RETURN QUERY SELECT v_has_ticket, v_ticket_data;
END;
$$ LANGUAGE plpgsql;

-- Función para crear ticket
CREATE OR REPLACE FUNCTION crear_ticket(
    p_usuario_id uuid,
    p_tipo_usuario text,
    p_titulo text,
    p_mensaje text
) RETURNS TABLE(
    success boolean,
    error text,
    ticket json,
    existing_ticket json
) AS $$
DECLARE
    v_existing_ticket json;
    v_new_ticket json;
    v_ticket_id uuid;
BEGIN
    -- Verificar si ya tiene un ticket abierto o respondido
    SELECT json_build_object(
        'id', t.id,
        'titulo', t.titulo,
        'mensaje', t.mensaje,
        'estado', t.estado,
        'respuesta', t.respuesta,
        'fecha_creacion', t.fecha_creacion,
        'fecha_respuesta', t.fecha_respuesta
    ) INTO v_existing_ticket
    FROM tickets t
    WHERE t.usuario_id = p_usuario_id 
    AND t.tipo_usuario = p_tipo_usuario
    AND t.estado IN ('abierto', 'respondido')
    ORDER BY t.fecha_creacion DESC
    LIMIT 1;
    
    IF v_existing_ticket IS NOT NULL THEN
        RETURN QUERY SELECT false, 'Ya tienes un ticket abierto. Espera a que sea respondido o cerrado.'::text, null::json, v_existing_ticket;
        RETURN;
    END IF;
    
    -- Crear nuevo ticket
    INSERT INTO tickets (usuario_id, tipo_usuario, titulo, mensaje)
    VALUES (p_usuario_id, p_tipo_usuario, p_titulo, p_mensaje)
    RETURNING id INTO v_ticket_id;
    
    -- Obtener el ticket creado
    SELECT json_build_object(
        'id', t.id,
        'titulo', t.titulo,
        'mensaje', t.mensaje,
        'estado', t.estado,
        'respuesta', t.respuesta,
        'fecha_creacion', t.fecha_creacion,
        'fecha_respuesta', t.fecha_respuesta
    ) INTO v_new_ticket
    FROM tickets t
    WHERE t.id = v_ticket_id;
    
    RETURN QUERY SELECT true, null::text, v_new_ticket, null::json;
END;
$$ LANGUAGE plpgsql;

-- Función para responder ticket
CREATE OR REPLACE FUNCTION responder_ticket(
    p_ticket_id uuid,
    p_respuesta text,
    p_admin_id uuid
) RETURNS TABLE(
    success boolean,
    error text
) AS $$
DECLARE
    v_ticket_estado text;
    v_usuario_id uuid;
    v_tipo_usuario text;
    v_titulo text;
BEGIN
    -- Verificar que el ticket existe y está abierto
    SELECT estado, usuario_id, tipo_usuario, titulo 
    INTO v_ticket_estado, v_usuario_id, v_tipo_usuario, v_titulo
    FROM tickets
    WHERE id = p_ticket_id;
    
    IF v_ticket_estado IS NULL THEN
        RETURN QUERY SELECT false, 'Ticket no encontrado'::text;
        RETURN;
    END IF;
    
    IF v_ticket_estado != 'abierto' THEN
        RETURN QUERY SELECT false, 'El ticket ya ha sido respondido o cerrado'::text;
        RETURN;
    END IF;
    
    -- Actualizar el ticket
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
        v_usuario_id,
        v_tipo_usuario,
        'Respuesta a tu ticket: ' || v_titulo,
        'Tu ticket de soporte ha sido respondido. Revisa la respuesta en el sistema de tickets.',
        'info'
    );
    
    RETURN QUERY SELECT true, null::text;
END;
$$ LANGUAGE plpgsql;

-- Función para cerrar ticket
CREATE OR REPLACE FUNCTION cerrar_ticket(
    p_ticket_id uuid,
    p_admin_id uuid
) RETURNS TABLE(
    success boolean,
    error text
) AS $$
DECLARE
    v_ticket_estado text;
    v_usuario_id uuid;
    v_tipo_usuario text;
    v_titulo text;
BEGIN
    -- Verificar que el ticket existe
    SELECT estado, usuario_id, tipo_usuario, titulo 
    INTO v_ticket_estado, v_usuario_id, v_tipo_usuario, v_titulo
    FROM tickets
    WHERE id = p_ticket_id;
    
    IF v_ticket_estado IS NULL THEN
        RETURN QUERY SELECT false, 'Ticket no encontrado'::text;
        RETURN;
    END IF;
    
    IF v_ticket_estado = 'cerrado' THEN
        RETURN QUERY SELECT false, 'El ticket ya está cerrado'::text;
        RETURN;
    END IF;
    
    -- Cerrar el ticket
    UPDATE tickets
    SET estado = 'cerrado'
    WHERE id = p_ticket_id;
    
    -- Crear notificación para el usuario
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (
        v_usuario_id,
        v_tipo_usuario,
        'Ticket cerrado: ' || v_titulo,
        'Tu ticket de soporte ha sido cerrado. Si necesitas más ayuda, puedes crear un nuevo ticket.',
        'info'
    );
    
    RETURN QUERY SELECT true, null::text;
END;
$$ LANGUAGE plpgsql;

-- Función para enviar aviso a todos los inversores
CREATE OR REPLACE FUNCTION enviar_aviso_a_todos_inversores(
    p_titulo text,
    p_mensaje text,
    p_tipo text,
    p_admin_id uuid
) RETURNS void AS $$
BEGIN
    -- Crear el aviso
    INSERT INTO avisos (titulo, mensaje, tipo, creado_por)
    VALUES (p_titulo, p_mensaje, p_tipo, p_admin_id);
    
    -- Enviar notificación a todos los inversores
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    SELECT 
        i.id,
        'inversor',
        p_titulo,
        p_mensaje,
        p_tipo
    FROM inversores i;
    
    -- Enviar notificación a todos los partners
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    SELECT 
        p.id,
        'partner',
        p_titulo,
        p_mensaje,
        p_tipo
    FROM partners p
    WHERE p.activo = true;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener distribución de partners (PREVIEW)
CREATE OR REPLACE FUNCTION obtener_distribucion_partners_preview(
    p_total_inversion numeric,
    p_porcentaje numeric DEFAULT NULL,
    p_ganancia_bruta numeric DEFAULT NULL
) RETURNS TABLE(
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
    v_ganancia_bruta numeric;
    v_porcentaje_inversores numeric := 70;
    v_ganancia_partners numeric;
BEGIN
    -- Obtener porcentaje configurado para inversores
    SELECT valor::numeric INTO v_porcentaje_inversores
    FROM configuracion_sistema
    WHERE clave = 'porcentaje_inversores';
    
    IF v_porcentaje_inversores IS NULL THEN
        v_porcentaje_inversores := 70;
    END IF;
    
    -- Calcular ganancia bruta
    IF p_ganancia_bruta IS NOT NULL THEN
        v_ganancia_bruta := p_ganancia_bruta;
    ELSIF p_porcentaje IS NOT NULL THEN
        v_ganancia_bruta := (p_porcentaje * p_total_inversion) / 100;
    ELSE
        v_ganancia_bruta := 0;
    END IF;
    
    -- Calcular ganancia para partners (30% por defecto)
    v_ganancia_partners := v_ganancia_bruta * ((100 - v_porcentaje_inversores) / 100);
    
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
                -- Operador+Partner: 100% de su ganancia propia + 100% de comisión de inversores
                (p.inversion_inicial * 0.05) + 
                (COALESCE(SUM(i.total), 0) * 0.05 * (100 - v_porcentaje_inversores) / 100)
            ELSE
                -- Partner normal: 80% de su ganancia propia + 1/3 de comisión de inversores
                (p.inversion_inicial * 0.05 * 0.8) + 
                (COALESCE(SUM(i.total), 0) * 0.05 * (100 - v_porcentaje_inversores) / 100 / 3)
        END as ganancia_comision,
        CASE 
            WHEN p.tipo = 'operador_partner' THEN
                -- Ganancia adicional como operador (50% extra del total)
                ((p.inversion_inicial + COALESCE(SUM(i.total), 0)) * 0.05 * 0.5)
            ELSE
                0
        END as ganancia_operador,
        CASE 
            WHEN p.tipo = 'operador_partner' THEN
                -- Total para operador+partner
                (p.inversion_inicial * 0.05) + 
                (COALESCE(SUM(i.total), 0) * 0.05 * (100 - v_porcentaje_inversores) / 100) +
                ((p.inversion_inicial + COALESCE(SUM(i.total), 0)) * 0.05 * 0.5)
            ELSE
                -- Total para partner normal
                (p.inversion_inicial * 0.05 * 0.8) + 
                (COALESCE(SUM(i.total), 0) * 0.05 * (100 - v_porcentaje_inversores) / 100 / 3)
        END as ganancia_total
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.inversion_inicial
    ORDER BY p.nombre;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener distribución de inversores (PREVIEW)
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores_preview(
    p_total_inversion numeric,
    p_porcentaje numeric DEFAULT NULL,
    p_ganancia_bruta numeric DEFAULT NULL
) RETURNS TABLE(
    inversor_id uuid,
    nombre text,
    apellido text,
    email text,
    inversion numeric,
    ganancia_individual numeric
) AS $$
DECLARE
    v_ganancia_bruta numeric;
    v_porcentaje_inversores numeric := 70;
    v_ganancia_inversores numeric;
BEGIN
    -- Obtener porcentaje configurado para inversores
    SELECT valor::numeric INTO v_porcentaje_inversores
    FROM configuracion_sistema
    WHERE clave = 'porcentaje_inversores';
    
    IF v_porcentaje_inversores IS NULL THEN
        v_porcentaje_inversores := 70;
    END IF;
    
    -- Calcular ganancia bruta
    IF p_ganancia_bruta IS NOT NULL THEN
        v_ganancia_bruta := p_ganancia_bruta;
    ELSIF p_porcentaje IS NOT NULL THEN
        v_ganancia_bruta := (p_porcentaje * p_total_inversion) / 100;
    ELSE
        v_ganancia_bruta := 0;
    END IF;
    
    -- Calcular ganancia para inversores (70% por defecto)
    v_ganancia_inversores := v_ganancia_bruta * (v_porcentaje_inversores / 100);
    
    RETURN QUERY
    SELECT 
        i.id as inversor_id,
        i.nombre,
        i.apellido,
        i.email,
        i.total as inversion,
        (i.total * 0.05 * v_porcentaje_inversores / 100) as ganancia_individual
    FROM inversores i
    WHERE i.total > 0
    ORDER BY i.nombre, i.apellido;
END;
$$ LANGUAGE plpgsql;

-- Función principal para procesar ganancias semanales
CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
    p_porcentaje numeric DEFAULT NULL,
    p_ganancia_bruta numeric DEFAULT NULL,
    p_admin_id uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_semana_actual integer;
    v_total_inversion numeric;
    v_ganancia_bruta numeric;
    v_porcentaje_inversores numeric := 70;
    v_ganancia_partners numeric;
    v_ganancia_inversores numeric;
    v_fecha_inicio date;
    v_fecha_fin date;
    rec_partner RECORD;
    rec_inversor RECORD;
BEGIN
    -- Obtener semana actual
    SELECT valor::integer INTO v_semana_actual
    FROM configuracion_sistema
    WHERE clave = 'semana_actual';
    
    IF v_semana_actual IS NULL THEN
        v_semana_actual := 1;
    END IF;
    
    -- Obtener porcentaje configurado para inversores
    SELECT valor::numeric INTO v_porcentaje_inversores
    FROM configuracion_sistema
    WHERE clave = 'porcentaje_inversores';
    
    IF v_porcentaje_inversores IS NULL THEN
        v_porcentaje_inversores := 70;
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
        v_ganancia_bruta := (p_porcentaje * v_total_inversion) / 100;
    ELSE
        RAISE EXCEPTION 'Debe proporcionar porcentaje o ganancia bruta';
    END IF;
    
    -- Calcular distribución
    v_ganancia_partners := v_ganancia_bruta * ((100 - v_porcentaje_inversores) / 100);
    v_ganancia_inversores := v_ganancia_bruta * (v_porcentaje_inversores / 100);
    
    -- Calcular fechas de la semana
    SELECT valor::date INTO v_fecha_inicio
    FROM configuracion_sistema
    WHERE clave = 'fecha_inicio_semana';
    
    IF v_fecha_inicio IS NULL THEN
        v_fecha_inicio := CURRENT_DATE;
    END IF;
    
    v_fecha_fin := v_fecha_inicio + INTERVAL '6 days';
    
    -- Insertar o actualizar registro de ganancias semanales
    INSERT INTO ganancias_semanales (
        semana_numero, fecha_inicio, fecha_fin, total_inversion,
        porcentaje_ganancia, ganancia_bruta, ganancia_partners,
        ganancia_inversores, procesado, fecha_procesado, procesado_por
    ) VALUES (
        v_semana_actual, v_fecha_inicio, v_fecha_fin, v_total_inversion,
        COALESCE(p_porcentaje, (v_ganancia_bruta * 100 / v_total_inversion)), 
        v_ganancia_bruta, v_ganancia_partners, v_ganancia_inversores,
        true, now(), p_admin_id
    ) ON CONFLICT (semana_numero) DO UPDATE SET
        total_inversion = v_total_inversion,
        porcentaje_ganancia = COALESCE(p_porcentaje, (v_ganancia_bruta * 100 / v_total_inversion)),
        ganancia_bruta = v_ganancia_bruta,
        ganancia_partners = v_ganancia_partners,
        ganancia_inversores = v_ganancia_inversores,
        procesado = true,
        fecha_procesado = now(),
        procesado_por = p_admin_id;
    
    -- Procesar ganancias de partners
    FOR rec_partner IN 
        SELECT 
            p.id, p.nombre, p.tipo, p.inversion_inicial,
            COUNT(pi.inversor_id) as total_inversores,
            COALESCE(SUM(i.total), 0) as monto_total_inversores
        FROM partners p
        LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
        LEFT JOIN inversores i ON pi.inversor_id = i.id
        WHERE p.activo = true
        GROUP BY p.id, p.nombre, p.tipo, p.inversion_inicial
    LOOP
        DECLARE
            v_ganancia_comision numeric;
            v_ganancia_operador numeric;
            v_ganancia_total numeric;
        BEGIN
            -- Calcular ganancias según tipo de partner
            IF rec_partner.tipo = 'operador_partner' THEN
                -- Operador+Partner: 100% de su ganancia propia + 100% de comisión de inversores
                v_ganancia_comision := (rec_partner.inversion_inicial * 0.05) + 
                                     (rec_partner.monto_total_inversores * 0.05 * (100 - v_porcentaje_inversores) / 100);
                v_ganancia_operador := ((rec_partner.inversion_inicial + rec_partner.monto_total_inversores) * 0.05 * 0.5);
                v_ganancia_total := v_ganancia_comision + v_ganancia_operador;
            ELSE
                -- Partner normal: 80% de su ganancia propia + 1/3 de comisión de inversores
                v_ganancia_comision := (rec_partner.inversion_inicial * 0.05 * 0.8) + 
                                     (rec_partner.monto_total_inversores * 0.05 * (100 - v_porcentaje_inversores) / 100 / 3);
                v_ganancia_operador := 0;
                v_ganancia_total := v_ganancia_comision;
            END IF;
            
            -- Insertar o actualizar ganancias del partner
            INSERT INTO partner_ganancias (
                partner_id, semana_numero, ganancia_total, ganancia_comision,
                ganancia_operador, total_inversores, monto_total_inversores
            ) VALUES (
                rec_partner.id, v_semana_actual, v_ganancia_total, v_ganancia_comision,
                v_ganancia_operador, rec_partner.total_inversores, rec_partner.monto_total_inversores
            ) ON CONFLICT (partner_id, semana_numero) DO UPDATE SET
                ganancia_total = v_ganancia_total,
                ganancia_comision = v_ganancia_comision,
                ganancia_operador = v_ganancia_operador,
                total_inversores = rec_partner.total_inversores,
                monto_total_inversores = rec_partner.monto_total_inversores,
                fecha_calculo = now();
            
            -- Crear transacción de ganancia para el partner
            INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
            VALUES (rec_partner.id, v_ganancia_total, 'ganancia', 
                   'Ganancia semanal ' || v_semana_actual || ' - ' || 
                   CASE WHEN rec_partner.tipo = 'operador_partner' THEN 'Partner+Operador' ELSE 'Partner' END);
            
            -- Actualizar inversión inicial del partner
            UPDATE partners 
            SET inversion_inicial = inversion_inicial + v_ganancia_total
            WHERE id = rec_partner.id;
            
            -- Crear notificación para el partner
            INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
            VALUES (
                rec_partner.id,
                'partner',
                'Ganancia Semanal Procesada',
                'Tu ganancia de la semana ' || v_semana_actual || ' ha sido procesada: $' || 
                ROUND(v_ganancia_total, 2) || '. Revisa tu dashboard para más detalles.',
                'success'
            );
        END;
    END LOOP;
    
    -- Procesar ganancias de inversores
    FOR rec_inversor IN 
        SELECT id, nombre, apellido, total
        FROM inversores
        WHERE total > 0
    LOOP
        DECLARE
            v_ganancia_individual numeric;
        BEGIN
            -- Calcular ganancia individual (70% de 5%)
            v_ganancia_individual := rec_inversor.total * 0.05 * (v_porcentaje_inversores / 100);
            
            -- Crear transacción de ganancia
            INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
            VALUES (rec_inversor.id, v_ganancia_individual, 'ganancia', 
                   'Ganancia semanal ' || v_semana_actual);
            
            -- Actualizar totales del inversor
            UPDATE inversores 
            SET 
                ganancia_semanal = v_ganancia_individual,
                total = total + v_ganancia_individual
            WHERE id = rec_inversor.id;
            
            -- Crear notificación para el inversor
            INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
            VALUES (
                rec_inversor.id,
                'inversor',
                'Ganancia Semanal Procesada',
                'Tu ganancia de la semana ' || v_semana_actual || ' ha sido procesada: $' || 
                ROUND(v_ganancia_individual, 2) || '. Revisa tu dashboard para más detalles.',
                'success'
            );
        END;
    END LOOP;
    
    -- Avanzar a la siguiente semana
    UPDATE configuracion_sistema 
    SET valor = (v_semana_actual + 1)::text,
        updated_at = now(),
        updated_by = p_admin_id
    WHERE clave = 'semana_actual';
    
    -- Actualizar fecha de inicio de semana
    UPDATE configuracion_sistema 
    SET valor = (v_fecha_fin + INTERVAL '1 day')::text,
        updated_at = now(),
        updated_by = p_admin_id
    WHERE clave = 'fecha_inicio_semana';
END;
$$ LANGUAGE plpgsql;

-- PASO 9: CREAR FUNCIONES DE TRIGGERS
-- =====================================================

-- Función para procesar solicitudes de inversores
CREATE OR REPLACE FUNCTION procesar_solicitud_inversor()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar si el estado cambió a 'aprobado'
    IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
        -- Crear transacción
        INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
        VALUES (NEW.inversor_id, NEW.monto, NEW.tipo, 
               'Solicitud aprobada - ' || NEW.tipo || ' de $' || NEW.monto);
        
        -- Actualizar saldo del inversor
        IF NEW.tipo = 'deposito' THEN
            UPDATE inversores 
            SET total = total + NEW.monto,
                capital_inicial = capital_inicial + NEW.monto
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
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada y procesada.',
            'success'
        );
    ELSIF NEW.estado = 'rechazado' AND OLD.estado = 'pendiente' THEN
        -- Crear notificación de rechazo
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (
            NEW.inversor_id,
            'inversor',
            'Solicitud Rechazada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido rechazada. Motivo: ' || 
            COALESCE(NEW.motivo_rechazo, 'No especificado'),
            'warning'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para procesar solicitudes de partners
CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar si el estado cambió a 'aprobado'
    IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
        -- Crear transacción
        INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
        VALUES (NEW.partner_id, NEW.monto, NEW.tipo, 
               'Solicitud aprobada - ' || NEW.tipo || ' de $' || NEW.monto);
        
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
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada y procesada.',
            'success'
        );
    ELSIF NEW.estado = 'rechazado' AND OLD.estado = 'pendiente' THEN
        -- Crear notificación de rechazo
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (
            NEW.partner_id,
            'partner',
            'Solicitud Rechazada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido rechazada. Motivo: ' || 
            COALESCE(NEW.motivo_rechazo, 'No especificado'),
            'warning'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 10: CREAR TRIGGERS
-- =====================================================

-- Trigger para procesar solicitudes de inversores
CREATE TRIGGER trigger_procesar_solicitud_inversor
    AFTER UPDATE ON solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION procesar_solicitud_inversor();

-- Trigger para procesar solicitudes de partners
CREATE TRIGGER trigger_procesar_solicitud_partner
    AFTER UPDATE ON partner_solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION procesar_solicitud_partner();

-- =====================================================
-- FIN DEL SQL COMPLETO
-- =====================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos CVM Capital configurada correctamente';
    RAISE NOTICE 'Todas las tablas, funciones y triggers han sido creados';
    RAISE NOTICE 'El sistema está listo para funcionar';
END $$;