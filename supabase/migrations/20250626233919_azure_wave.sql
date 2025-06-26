-- =====================================================
-- CVM CAPITAL - BASE DE DATOS COMPLETA DESDE CERO
-- =====================================================
-- ELIMINAR TODAS LAS TABLAS EXISTENTES
-- =====================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- =====================================================
-- TABLA: inversores
-- =====================================================
CREATE TABLE inversores (
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

-- =====================================================
-- TABLA: admins
-- =====================================================
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

-- =====================================================
-- TABLA: partners
-- =====================================================
CREATE TABLE partners (
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

-- =====================================================
-- TABLA: configuracion_sistema
-- =====================================================
CREATE TABLE configuracion_sistema (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clave text UNIQUE NOT NULL,
    valor text NOT NULL,
    descripcion text,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid
);

-- =====================================================
-- TABLA: transacciones
-- =====================================================
CREATE TABLE transacciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inversor_id uuid NOT NULL REFERENCES inversores(id) ON DELETE CASCADE,
    monto numeric(15,2) NOT NULL CHECK (monto > 0),
    tipo text NOT NULL,
    fecha timestamptz DEFAULT now(),
    descripcion text
);

-- =====================================================
-- TABLA: partner_transacciones
-- =====================================================
CREATE TABLE partner_transacciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    monto numeric(15,2) NOT NULL CHECK (monto > 0),
    tipo text NOT NULL,
    descripcion text,
    fecha timestamptz DEFAULT now()
);

-- =====================================================
-- TABLA: solicitudes
-- =====================================================
CREATE TABLE solicitudes (
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

-- =====================================================
-- TABLA: partner_solicitudes
-- =====================================================
CREATE TABLE partner_solicitudes (
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

-- =====================================================
-- TABLA: partner_inversores
-- =====================================================
CREATE TABLE partner_inversores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    inversor_id uuid UNIQUE NOT NULL REFERENCES inversores(id) ON DELETE CASCADE,
    fecha_asignacion timestamptz DEFAULT now(),
    asignado_por uuid
);

-- =====================================================
-- TABLA: ganancias_semanales
-- =====================================================
CREATE TABLE ganancias_semanales (
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

-- =====================================================
-- TABLA: partner_ganancias
-- =====================================================
CREATE TABLE partner_ganancias (
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

-- =====================================================
-- TABLA: notificaciones
-- =====================================================
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

-- =====================================================
-- TABLA: avisos
-- =====================================================
CREATE TABLE avisos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    mensaje text NOT NULL,
    tipo text DEFAULT 'info' CHECK (tipo IN ('info', 'success', 'warning', 'error')),
    activo boolean DEFAULT true,
    fecha_creacion timestamptz DEFAULT now(),
    fecha_expiracion timestamptz,
    creado_por uuid NOT NULL
);

-- =====================================================
-- TABLA: tickets
-- =====================================================
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
    respondido_por uuid
);

-- =====================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
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
-- POLÍTICAS RLS (PERMITIR TODO PARA SIMPLIFICAR)
-- =====================================================
CREATE POLICY "Allow all operations" ON inversores FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON admins FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON partners FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON configuracion_sistema FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON transacciones FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON partner_transacciones FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON solicitudes FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON partner_solicitudes FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON partner_inversores FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON ganancias_semanales FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON partner_ganancias FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON notificaciones FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON avisos FOR ALL TO public USING (true);
CREATE POLICY "Allow all operations" ON tickets FOR ALL TO public USING (true);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Configuración inicial del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('semana_actual', '1', 'Número de semana actual del sistema'),
('fecha_inicio_semana', '2024-01-01', 'Fecha de inicio de la semana actual'),
('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores');

-- Admin por defecto (MANTENER CREDENCIALES EXISTENTES)
INSERT INTO admins (id, username, password_hash, password_salt, role, nombre, email, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'KatanaRz', 'admin_hash', 'admin_salt', 'admin', 'Administrador Principal', 'admin@cvmcapital.com', true);

-- =====================================================
-- FUNCIONES PRINCIPALES
-- =====================================================

-- Función para calcular inversión total de un inversor
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    v_total numeric := 0;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN tipo IN ('deposito', 'ganancia', 'reinversion') THEN monto
            WHEN tipo = 'retiro' THEN -monto
            ELSE 0
        END
    ), 0) INTO v_total
    FROM transacciones
    WHERE inversor_id = p_inversor_id;
    
    RETURN v_total;
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
    
    RETURN (v_saldo_actual >= p_monto);
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
    
    RETURN (v_saldo_actual >= p_monto);
END;
$$;

-- Función para obtener datos del gráfico semanal
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS TABLE(week text, ganancia numeric)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Sem ' || gs.semana_numero::text as week,
        COALESCE(gs.ganancia_bruta, 0) as ganancia
    FROM ganancias_semanales gs
    ORDER BY gs.semana_numero DESC
    LIMIT 8;
END;
$$;

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
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.nombre,
        i.apellido,
        i.email,
        i.total,
        (pi.partner_id IS NOT NULL) as partner_assigned,
        p.nombre as partner_nombre
    FROM inversores i
    LEFT JOIN partner_inversores pi ON i.id = pi.inversor_id
    LEFT JOIN partners p ON pi.partner_id = p.id
    ORDER BY i.created_at DESC;
END;
$$;

-- Función para obtener resumen de partners
CREATE OR REPLACE FUNCTION obtener_resumen_partners()
RETURNS TABLE(
    partner_id uuid,
    partner_nombre text,
    partner_tipo text,
    total_inversores bigint,
    monto_total numeric,
    inversores json
)
LANGUAGE plpgsql
AS $$
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
$$;

-- Función para validar eliminación de partner
CREATE OR REPLACE FUNCTION validar_eliminacion_partner(p_partner_id uuid)
RETURNS TABLE(
    puede_eliminar boolean,
    total_inversores bigint,
    mensaje text
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_inversores bigint;
BEGIN
    SELECT COUNT(*) INTO v_total_inversores
    FROM partner_inversores
    WHERE partner_id = p_partner_id;
    
    RETURN QUERY
    SELECT 
        true as puede_eliminar,
        v_total_inversores as total_inversores,
        CASE 
            WHEN v_total_inversores = 0 THEN 'El partner puede ser eliminado sin problemas.'
            ELSE 'El partner tiene ' || v_total_inversores || ' inversores asignados que serán liberados.'
        END as mensaje;
END;
$$;

-- Función para obtener datos actualizados del partner
CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(p_partner_id uuid)
RETURNS TABLE(
    inversion_total numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN pt.tipo IN ('deposito', 'ganancia') THEN pt.monto
                WHEN pt.tipo = 'retiro' THEN -pt.monto
                ELSE 0
            END
        ), p.inversion_inicial) as inversion_total
    FROM partners p
    LEFT JOIN partner_transacciones pt ON p.id = pt.partner_id
    WHERE p.id = p_partner_id
    GROUP BY p.id, p.inversion_inicial;
END;
$$;

-- Función para obtener datos de la torta del partner
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id uuid)
RETURNS TABLE(
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
                WHEN tipo IN ('deposito') THEN 'Depósitos'
                WHEN tipo = 'retiro' THEN 'Retiros'
                WHEN tipo = 'ganancia' THEN 'Ganancias'
                ELSE 'Otros'
            END as categoria,
            SUM(monto) as total
        FROM partner_transacciones
        WHERE partner_id = p_partner_id
        GROUP BY 
            CASE 
                WHEN tipo IN ('deposito') THEN 'Depósitos'
                WHEN tipo = 'retiro' THEN 'Retiros'
                WHEN tipo = 'ganancia' THEN 'Ganancias'
                ELSE 'Otros'
            END
    )
    SELECT 
        ta.categoria::text as name,
        ta.total::numeric as value,
        CASE 
            WHEN ta.categoria = 'Depósitos' THEN '#10b981'
            WHEN ta.categoria = 'Retiros' THEN '#ef4444'
            WHEN ta.categoria = 'Ganancias' THEN '#3b82f6'
            ELSE '#6b7280'
        END::text as color
    FROM transacciones_agrupadas ta
    WHERE ta.total > 0;
END;
$$;

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
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_porcentaje_inversores numeric;
    v_partner_tipo text;
BEGIN
    -- Obtener porcentaje de inversores
    SELECT COALESCE(
        (SELECT valor::numeric FROM configuracion_sistema WHERE clave = 'porcentaje_inversores'),
        70
    ) INTO v_porcentaje_inversores;
    
    -- Obtener tipo de partner
    SELECT tipo INTO v_partner_tipo
    FROM partners
    WHERE id = p_partner_id;
    
    RETURN QUERY
    SELECT 
        i.id as inversor_id,
        i.nombre,
        i.apellido,
        i.email,
        i.capital_inicial as total_invertido,
        i.ganancia_semanal,
        CASE 
            WHEN v_partner_tipo = 'operador_partner' THEN 
                -- Operador + Partner recibe 100% del 30% de la ganancia del inversor
                (i.capital_inicial * 0.05 * (100 - v_porcentaje_inversores) / 100)
            ELSE 
                -- Partner normal recibe 1/3 del 30% de la ganancia del inversor
                (i.capital_inicial * 0.05 * (100 - v_porcentaje_inversores) / 100 / 3)
        END as ganancia_para_partner,
        v_porcentaje_inversores as porcentaje_ganancia
    FROM inversores i
    INNER JOIN partner_inversores pi ON i.id = pi.inversor_id
    WHERE pi.partner_id = p_partner_id
    ORDER BY i.capital_inicial DESC;
END;
$$;

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
)
LANGUAGE plpgsql
AS $$
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
$$;

-- Función para obtener ticket de usuario
CREATE OR REPLACE FUNCTION obtener_ticket_usuario(p_usuario_id uuid, p_tipo_usuario text)
RETURNS TABLE(
    has_ticket boolean,
    ticket json
)
LANGUAGE plpgsql
AS $$
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
    
    RETURN QUERY
    SELECT v_has_ticket, v_ticket_data;
END;
$$;

-- Función para crear ticket
CREATE OR REPLACE FUNCTION crear_ticket(
    p_usuario_id uuid,
    p_tipo_usuario text,
    p_titulo text,
    p_mensaje text
)
RETURNS TABLE(
    success boolean,
    error text,
    ticket json,
    existing_ticket json
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_ticket json;
    v_new_ticket json;
BEGIN
    -- Verificar si ya tiene un ticket abierto
    SELECT json_build_object(
        'id', t.id,
        'titulo', t.titulo,
        'mensaje', t.mensaje,
        'estado', t.estado,
        'fecha_creacion', t.fecha_creacion
    ) INTO v_existing_ticket
    FROM tickets t
    WHERE t.usuario_id = p_usuario_id 
    AND t.tipo_usuario = p_tipo_usuario
    AND t.estado IN ('abierto', 'respondido')
    LIMIT 1;
    
    IF v_existing_ticket IS NOT NULL THEN
        RETURN QUERY
        SELECT false, 'Ya tienes un ticket abierto. Espera respuesta antes de crear otro.', null::json, v_existing_ticket;
        RETURN;
    END IF;
    
    -- Crear nuevo ticket
    INSERT INTO tickets (usuario_id, tipo_usuario, titulo, mensaje)
    VALUES (p_usuario_id, p_tipo_usuario, p_titulo, p_mensaje)
    RETURNING json_build_object(
        'id', id,
        'titulo', titulo,
        'mensaje', mensaje,
        'estado', estado,
        'fecha_creacion', fecha_creacion
    ) INTO v_new_ticket;
    
    RETURN QUERY
    SELECT true, null::text, v_new_ticket, null::json;
END;
$$;

-- Función para responder ticket
CREATE OR REPLACE FUNCTION responder_ticket(
    p_ticket_id uuid,
    p_respuesta text,
    p_admin_id uuid
)
RETURNS TABLE(
    success boolean,
    error text
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE tickets 
    SET 
        respuesta = p_respuesta,
        estado = 'respondido',
        fecha_respuesta = now(),
        respondido_por = p_admin_id
    WHERE id = p_ticket_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, null::text;
    ELSE
        RETURN QUERY SELECT false, 'Ticket no encontrado'::text;
    END IF;
END;
$$;

-- Función para cerrar ticket
CREATE OR REPLACE FUNCTION cerrar_ticket(
    p_ticket_id uuid,
    p_admin_id uuid
)
RETURNS TABLE(
    success boolean,
    error text
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE tickets 
    SET estado = 'cerrado'
    WHERE id = p_ticket_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, null::text;
    ELSE
        RETURN QUERY SELECT false, 'Ticket no encontrado'::text;
    END IF;
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
    VALUES ('semana_actual', p_semana_numero::text, 'Número de semana actual del sistema', p_admin_id)
    ON CONFLICT (clave) 
    DO UPDATE SET 
        valor = p_semana_numero::text,
        updated_at = now(),
        updated_by = p_admin_id;
    
    -- Actualizar fecha de inicio
    INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
    VALUES ('fecha_inicio_semana', p_fecha_inicio::text, 'Fecha de inicio de la semana actual', p_admin_id)
    ON CONFLICT (clave) 
    DO UPDATE SET 
        valor = p_fecha_inicio::text,
        updated_at = now(),
        updated_by = p_admin_id;
END;
$$;

-- =====================================================
-- FUNCIONES DE PREVIEW PARA GANANCIAS
-- =====================================================

-- Función para preview de distribución de partners
CREATE OR REPLACE FUNCTION obtener_distribucion_partners_preview(
    p_total_inversion numeric,
    p_porcentaje numeric DEFAULT NULL,
    p_ganancia_bruta numeric DEFAULT NULL
)
RETURNS TABLE (
    partner_id uuid,
    nombre text,
    tipo text,
    inversion_inicial numeric,
    total_inversores integer,
    monto_total_inversores numeric,
    ganancia_comision numeric,
    ganancia_operador numeric,
    ganancia_total numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_ganancia_bruta numeric;
    v_porcentaje_partners numeric;
BEGIN
    -- Calcular ganancia bruta
    IF p_ganancia_bruta IS NOT NULL THEN
        v_ganancia_bruta := p_ganancia_bruta;
    ELSIF p_porcentaje IS NOT NULL THEN
        v_ganancia_bruta := (p_porcentaje * p_total_inversion) / 100;
    ELSE
        RAISE EXCEPTION 'Either p_porcentaje or p_ganancia_bruta must be provided';
    END IF;

    -- Obtener porcentaje de partners
    SELECT COALESCE(
        (SELECT valor::numeric FROM configuracion_sistema WHERE clave = 'porcentaje_inversores'),
        70
    ) INTO v_porcentaje_partners;
    
    v_porcentaje_partners := 100 - v_porcentaje_partners;

    RETURN QUERY
    WITH partner_stats AS (
        SELECT 
            p.id,
            p.nombre,
            p.tipo,
            p.inversion_inicial,
            COUNT(pi.inversor_id) as total_inversores,
            COALESCE(SUM(i.capital_inicial), 0) as monto_total_inversores
        FROM partners p
        LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
        LEFT JOIN inversores i ON pi.inversor_id = i.id
        WHERE p.activo = true
        GROUP BY p.id, p.nombre, p.tipo, p.inversion_inicial
    ),
    earnings_calc AS (
        SELECT 
            ps.*,
            -- Ganancia propia del partner
            CASE 
                WHEN ps.tipo = 'operador_partner' THEN 
                    (ps.inversion_inicial * 0.05)
                ELSE 
                    (ps.inversion_inicial * 0.05 * 0.8)
            END as ganancia_propia,
            
            -- Comisión de inversores
            CASE 
                WHEN ps.tipo = 'operador_partner' THEN 
                    (ps.monto_total_inversores * 0.05 * v_porcentaje_partners / 100)
                ELSE 
                    (ps.monto_total_inversores * 0.05 * v_porcentaje_partners / 100 / 3)
            END as comision_inversores
        FROM partner_stats ps
    )
    SELECT 
        ec.id::uuid,
        ec.nombre::text,
        ec.tipo::text,
        ec.inversion_inicial::numeric,
        ec.total_inversores::integer,
        ec.monto_total_inversores::numeric,
        ec.comision_inversores::numeric as ganancia_comision,
        ec.ganancia_propia::numeric as ganancia_operador,
        (ec.ganancia_propia + ec.comision_inversores)::numeric as ganancia_total
    FROM earnings_calc ec
    WHERE ec.inversion_inicial > 0 OR ec.total_inversores > 0
    ORDER BY ec.ganancia_total DESC;
END;
$$;

-- Función para preview de distribución de inversores
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores_preview(
    p_total_inversion numeric,
    p_porcentaje numeric DEFAULT NULL,
    p_ganancia_bruta numeric DEFAULT NULL
)
RETURNS TABLE (
    inversor_id uuid,
    nombre text,
    apellido text,
    email text,
    inversion numeric,
    ganancia_individual numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_ganancia_bruta numeric;
    v_porcentaje_inversores numeric;
BEGIN
    -- Calcular ganancia bruta
    IF p_ganancia_bruta IS NOT NULL THEN
        v_ganancia_bruta := p_ganancia_bruta;
    ELSIF p_porcentaje IS NOT NULL THEN
        v_ganancia_bruta := (p_porcentaje * p_total_inversion) / 100;
    ELSE
        RAISE EXCEPTION 'Either p_porcentaje or p_ganancia_bruta must be provided';
    END IF;

    -- Obtener porcentaje de inversores
    SELECT COALESCE(
        (SELECT valor::numeric FROM configuracion_sistema WHERE clave = 'porcentaje_inversores'),
        70
    ) INTO v_porcentaje_inversores;

    RETURN QUERY
    SELECT 
        i.id::uuid,
        i.nombre::text,
        i.apellido::text,
        i.email::text,
        i.capital_inicial::numeric as inversion,
        (i.capital_inicial * 0.05 * v_porcentaje_inversores / 100)::numeric as ganancia_individual
    FROM inversores i
    WHERE i.capital_inicial > 0
    ORDER BY i.capital_inicial DESC;
END;
$$;

-- =====================================================
-- FUNCIÓN PRINCIPAL PARA PROCESAR GANANCIAS
-- =====================================================
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
    v_porcentaje_inversores numeric;
    v_ganancia_partners numeric;
    v_ganancia_inversores numeric;
    v_fecha_inicio date;
    v_fecha_fin date;
    partner_record RECORD;
    inversor_record RECORD;
BEGIN
    -- Obtener semana actual
    SELECT valor::integer INTO v_semana_actual
    FROM configuracion_sistema
    WHERE clave = 'semana_actual';
    
    IF v_semana_actual IS NULL THEN
        v_semana_actual := 1;
    END IF;
    
    -- Obtener porcentaje de inversores
    SELECT COALESCE(
        (SELECT valor::numeric FROM configuracion_sistema WHERE clave = 'porcentaje_inversores'),
        70
    ) INTO v_porcentaje_inversores;
    
    -- Calcular total de inversión
    SELECT 
        COALESCE(SUM(i.capital_inicial), 0) + COALESCE(SUM(p.inversion_inicial), 0)
    INTO v_total_inversion
    FROM inversores i
    FULL OUTER JOIN partners p ON true
    WHERE p.activo = true OR p.activo IS NULL;
    
    -- Calcular ganancia bruta
    IF p_ganancia_bruta IS NOT NULL THEN
        v_ganancia_bruta := p_ganancia_bruta;
    ELSIF p_porcentaje IS NOT NULL THEN
        v_ganancia_bruta := (p_porcentaje * v_total_inversion) / 100;
    ELSE
        RAISE EXCEPTION 'Either p_porcentaje or p_ganancia_bruta must be provided';
    END IF;
    
    -- Calcular distribución
    v_ganancia_partners := v_ganancia_bruta * ((100 - v_porcentaje_inversores) / 100);
    v_ganancia_inversores := v_ganancia_bruta * (v_porcentaje_inversores / 100);
    
    -- Calcular fechas
    v_fecha_inicio := CURRENT_DATE - INTERVAL '6 days';
    v_fecha_fin := CURRENT_DATE;
    
    -- Insertar registro de ganancias semanales
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
        ganancia_bruta = v_ganancia_bruta,
        ganancia_partners = v_ganancia_partners,
        ganancia_inversores = v_ganancia_inversores,
        procesado = true,
        fecha_procesado = now(),
        procesado_por = p_admin_id;
    
    -- Procesar ganancias de partners
    FOR partner_record IN 
        SELECT * FROM obtener_distribucion_partners_preview(v_total_inversion, p_porcentaje, p_ganancia_bruta)
    LOOP
        -- Insertar/actualizar ganancias del partner
        INSERT INTO partner_ganancias (
            partner_id, semana_numero, ganancia_total, ganancia_comision,
            ganancia_operador, total_inversores, monto_total_inversores
        ) VALUES (
            partner_record.partner_id, v_semana_actual, partner_record.ganancia_total,
            partner_record.ganancia_comision, partner_record.ganancia_operador,
            partner_record.total_inversores, partner_record.monto_total_inversores
        ) ON CONFLICT (partner_id, semana_numero) DO UPDATE SET
            ganancia_total = partner_record.ganancia_total,
            ganancia_comision = partner_record.ganancia_comision,
            ganancia_operador = partner_record.ganancia_operador,
            total_inversores = partner_record.total_inversores,
            monto_total_inversores = partner_record.monto_total_inversores,
            fecha_calculo = now();
        
        -- Crear transacción para el partner
        INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
        VALUES (
            partner_record.partner_id,
            partner_record.ganancia_total,
            'ganancia',
            'Ganancia semanal ' || v_semana_actual
        );
        
        -- Actualizar inversión inicial del partner
        UPDATE partners 
        SET inversion_inicial = inversion_inicial + partner_record.ganancia_total
        WHERE id = partner_record.partner_id;
        
        -- Enviar notificación al partner
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (
            partner_record.partner_id,
            'partner',
            'Ganancia Semanal Procesada',
            'Tu ganancia de la semana ' || v_semana_actual || ' ha sido procesada: $' || partner_record.ganancia_total,
            'success'
        );
    END LOOP;
    
    -- Procesar ganancias de inversores
    FOR inversor_record IN 
        SELECT * FROM obtener_distribucion_inversores_preview(v_total_inversion, p_porcentaje, p_ganancia_bruta)
    LOOP
        -- Crear transacción para el inversor
        INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
        VALUES (
            inversor_record.inversor_id,
            inversor_record.ganancia_individual,
            'ganancia',
            'Ganancia semanal ' || v_semana_actual
        );
        
        -- Actualizar campos del inversor
        UPDATE inversores 
        SET 
            ganancia_semanal = inversor_record.ganancia_individual,
            total = total + inversor_record.ganancia_individual
        WHERE id = inversor_record.inversor_id;
        
        -- Enviar notificación al inversor
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (
            inversor_record.inversor_id,
            'inversor',
            'Ganancia Semanal Procesada',
            'Tu ganancia de la semana ' || v_semana_actual || ' ha sido procesada: $' || inversor_record.ganancia_individual,
            'success'
        );
    END LOOP;
    
    -- Incrementar semana actual
    UPDATE configuracion_sistema 
    SET valor = (v_semana_actual + 1)::text, updated_at = now(), updated_by = p_admin_id
    WHERE clave = 'semana_actual';
END;
$$;

-- =====================================================
-- TRIGGERS PARA PROCESAMIENTO AUTOMÁTICO
-- =====================================================

-- Función para procesar solicitud de inversor
CREATE OR REPLACE FUNCTION procesar_solicitud_inversor()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Solo procesar si el estado cambió a 'aprobado'
    IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
        -- Crear transacción
        INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
        VALUES (
            NEW.inversor_id,
            NEW.monto,
            NEW.tipo,
            'Solicitud aprobada - ' || NEW.tipo
        );
        
        -- Actualizar campos del inversor
        IF NEW.tipo = 'deposito' THEN
            UPDATE inversores 
            SET 
                capital_inicial = capital_inicial + NEW.monto,
                total = total + NEW.monto
            WHERE id = NEW.inversor_id;
        ELSIF NEW.tipo = 'retiro' THEN
            UPDATE inversores 
            SET total = total - NEW.monto
            WHERE id = NEW.inversor_id;
        END IF;
        
        -- Enviar notificación
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (
            NEW.inversor_id,
            'inversor',
            'Solicitud Aprobada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada.',
            'success'
        );
    ELSIF NEW.estado = 'rechazado' AND OLD.estado = 'pendiente' THEN
        -- Enviar notificación de rechazo
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (
            NEW.inversor_id,
            'inversor',
            'Solicitud Rechazada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido rechazada. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
            'error'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Función para procesar solicitud de partner
CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Solo procesar si el estado cambió a 'aprobado'
    IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
        -- Crear transacción
        INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
        VALUES (
            NEW.partner_id,
            NEW.monto,
            NEW.tipo,
            'Solicitud aprobada - ' || NEW.tipo
        );
        
        -- Actualizar inversión inicial del partner
        IF NEW.tipo = 'deposito' THEN
            UPDATE partners 
            SET inversion_inicial = inversion_inicial + NEW.monto
            WHERE id = NEW.partner_id;
        ELSIF NEW.tipo = 'retiro' THEN
            UPDATE partners 
            SET inversion_inicial = inversion_inicial - NEW.monto
            WHERE id = NEW.partner_id;
        END IF;
        
        -- Enviar notificación
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (
            NEW.partner_id,
            'partner',
            'Solicitud Aprobada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada.',
            'success'
        );
    ELSIF NEW.estado = 'rechazado' AND OLD.estado = 'pendiente' THEN
        -- Enviar notificación de rechazo
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (
            NEW.partner_id,
            'partner',
            'Solicitud Rechazada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido rechazada. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
            'error'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear triggers
CREATE TRIGGER trigger_procesar_solicitud_inversor
    AFTER UPDATE ON solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION procesar_solicitud_inversor();

CREATE TRIGGER trigger_procesar_solicitud_partner
    AFTER UPDATE ON partner_solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION procesar_solicitud_partner();

-- =====================================================
-- FINALIZACIÓN
-- =====================================================
-- Base de datos completa creada exitosamente
-- Todas las tablas, funciones y triggers están configurados
-- El sistema está listo para funcionar completamente