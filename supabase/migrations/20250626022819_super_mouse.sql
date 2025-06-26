/*
  # Migración completa para corregir funciones y cálculos

  1. Eliminación de funciones existentes
    - Elimina todas las funciones que tienen conflictos de tipos
    - Limpia funciones obsoletas o con errores

  2. Recreación de funciones corregidas
    - obtener_distribucion_partners: Cálculo correcto de ganancias
    - obtener_distribucion_inversores: Distribución para inversores
    - procesar_ganancias_semanales: Procesamiento completo
    - Funciones auxiliares y de validación

  3. Corrección de cálculos
    - Ale (Partner 10%, $500): Ganancia propia + comisión de inversores
    - Andrés (Operador+Partner 15%+20%, $1000): Ganancia completa
    - Distribución correcta 70% inversores, 30% partners
*/

-- =============================================
-- PASO 1: ELIMINAR FUNCIONES EXISTENTES
-- =============================================

DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric);
DROP FUNCTION IF EXISTS obtener_distribucion_inversores(numeric);
DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid);
DROP FUNCTION IF EXISTS obtener_estadisticas_admin();
DROP FUNCTION IF EXISTS obtener_datos_grafico_semanal();
DROP FUNCTION IF EXISTS obtener_datos_torta_partner(uuid);
DROP FUNCTION IF EXISTS obtener_datos_partner_actualizados(uuid);
DROP FUNCTION IF EXISTS calcular_inversion_total_inversor(uuid);
DROP FUNCTION IF EXISTS validar_retiro_inversor(uuid, numeric);
DROP FUNCTION IF EXISTS validar_retiro_partner(uuid, numeric);
DROP FUNCTION IF EXISTS configurar_semana_sistema(integer, date, uuid);
DROP FUNCTION IF EXISTS enviar_aviso_a_todos_inversores(text, text, text, uuid);
DROP FUNCTION IF EXISTS obtener_inversores_disponibles();
DROP FUNCTION IF EXISTS obtener_resumen_partners();

-- =============================================
-- PASO 2: RECREAR FUNCIONES CORREGIDAS
-- =============================================

-- Función para obtener distribución de partners con cálculos correctos
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
    ganancia_operador numeric,
    ganancia_comision numeric,
    ganancia_total numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
    total_inversion_partners numeric := 0;
    porcentaje_inversores numeric := 70; -- Por defecto 70%
BEGIN
    -- Obtener porcentaje de inversores desde configuración
    SELECT COALESCE(valor::numeric, 70) INTO porcentaje_inversores
    FROM configuracion_sistema 
    WHERE clave = 'porcentaje_inversores';

    -- Calcular total de inversión de partners activos
    SELECT COALESCE(SUM(p.inversion_inicial), 0) INTO total_inversion_partners
    FROM partners p
    WHERE p.activo = true;

    RETURN QUERY
    SELECT 
        p.id,
        p.nombre,
        p.tipo::text,
        p.porcentaje_comision,
        p.porcentaje_especial,
        p.inversion_inicial,
        COALESCE(pi_stats.total_inversores, 0)::integer,
        COALESCE(pi_stats.monto_total, 0),
        -- Ganancia operador (de su propia inversión)
        CASE 
            WHEN total_inversion_partners > 0 THEN
                (p.inversion_inicial * p_ganancia_partners / total_inversion_partners) * (porcentaje_inversores / 100.0)
            ELSE 0
        END as ganancia_operador,
        -- Ganancia por comisión (de sus inversores)
        CASE 
            WHEN p.tipo = 'operador_partner' THEN
                -- Operador+Partner: recibe 100% de la ganancia de sus inversores
                COALESCE(pi_stats.monto_total, 0) * p_ganancia_partners / GREATEST(total_inversion_partners, 1)
            ELSE
                -- Partner normal: recibe su % de comisión de la ganancia de sus inversores
                (COALESCE(pi_stats.monto_total, 0) * p_ganancia_partners / GREATEST(total_inversion_partners, 1)) * (p.porcentaje_comision / 100.0)
        END as ganancia_comision,
        -- Ganancia total
        CASE 
            WHEN total_inversion_partners > 0 THEN
                -- Ganancia propia
                (p.inversion_inicial * p_ganancia_partners / total_inversion_partners) * (porcentaje_inversores / 100.0) +
                -- Ganancia por comisión
                CASE 
                    WHEN p.tipo = 'operador_partner' THEN
                        COALESCE(pi_stats.monto_total, 0) * p_ganancia_partners / total_inversion_partners
                    ELSE
                        (COALESCE(pi_stats.monto_total, 0) * p_ganancia_partners / total_inversion_partners) * (p.porcentaje_comision / 100.0)
                END
            ELSE 0
        END as ganancia_total
    FROM partners p
    LEFT JOIN (
        SELECT 
            pi.partner_id,
            COUNT(pi.inversor_id) as total_inversores,
            SUM(i.total) as monto_total
        FROM partner_inversores pi
        JOIN inversores i ON pi.inversor_id = i.id
        GROUP BY pi.partner_id
    ) pi_stats ON p.id = pi_stats.partner_id
    WHERE p.activo = true
    ORDER BY p.nombre;
END;
$$;

-- Función para obtener distribución de inversores
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS TABLE (
    inversor_id uuid,
    nombre text,
    apellido text,
    inversion numeric,
    porcentaje_ganancia numeric,
    porcentaje_inversor numeric,
    ganancia_individual numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
    total_inversion_inversores numeric := 0;
    porcentaje_inversores numeric := 70; -- Por defecto 70%
BEGIN
    -- Obtener porcentaje de inversores desde configuración
    SELECT COALESCE(valor::numeric, 70) INTO porcentaje_inversores
    FROM configuracion_sistema 
    WHERE clave = 'porcentaje_inversores';

    -- Calcular total de inversión de inversores
    SELECT COALESCE(SUM(total), 0) INTO total_inversion_inversores
    FROM inversores;

    RETURN QUERY
    SELECT 
        i.id,
        i.nombre,
        i.apellido,
        i.total,
        5.0::numeric as porcentaje_ganancia, -- 5% fijo
        porcentaje_inversores,
        CASE 
            WHEN total_inversion_inversores > 0 THEN
                (i.total * p_ganancia_inversores / total_inversion_inversores)
            ELSE 0
        END as ganancia_individual
    FROM inversores i
    WHERE i.total > 0
    ORDER BY i.nombre, i.apellido;
END;
$$;

-- Función principal para procesar ganancias semanales
CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
    p_porcentaje numeric DEFAULT NULL,
    p_ganancia_bruta numeric DEFAULT NULL,
    p_admin_id uuid DEFAULT NULL
)
RETURNS TABLE (
    success boolean,
    message text,
    semana_numero integer,
    ganancia_bruta numeric,
    ganancia_partners numeric,
    ganancia_inversores numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_semana_actual integer;
    v_total_inversion numeric;
    v_ganancia_bruta numeric;
    v_porcentaje_inversores numeric := 70;
    v_ganancia_partners numeric;
    v_ganancia_inversores numeric;
    v_fecha_inicio date;
    v_fecha_fin date;
    partner_record record;
    inversor_record record;
BEGIN
    -- Obtener semana actual
    SELECT COALESCE(valor::integer, 1) INTO v_semana_actual
    FROM configuracion_sistema 
    WHERE clave = 'semana_actual';

    -- Obtener porcentaje de inversores
    SELECT COALESCE(valor::numeric, 70) INTO v_porcentaje_inversores
    FROM configuracion_sistema 
    WHERE clave = 'porcentaje_inversores';

    -- Calcular total de inversión (partners + inversores)
    SELECT 
        COALESCE(SUM(p.inversion_inicial), 0) + COALESCE(SUM(i.total), 0)
    INTO v_total_inversion
    FROM partners p
    FULL OUTER JOIN inversores i ON false
    WHERE (p.activo = true OR p.activo IS NULL);

    -- Calcular ganancia bruta
    IF p_ganancia_bruta IS NOT NULL THEN
        v_ganancia_bruta := p_ganancia_bruta;
    ELSIF p_porcentaje IS NOT NULL THEN
        v_ganancia_bruta := (p_porcentaje * v_total_inversion) / 100.0;
    ELSE
        RETURN QUERY SELECT false, 'Debe proporcionar porcentaje o ganancia bruta'::text, 0, 0::numeric, 0::numeric, 0::numeric;
        RETURN;
    END IF;

    -- Calcular distribución
    v_ganancia_inversores := v_ganancia_bruta * (v_porcentaje_inversores / 100.0);
    v_ganancia_partners := v_ganancia_bruta * ((100 - v_porcentaje_inversores) / 100.0);

    -- Calcular fechas de la semana
    v_fecha_inicio := CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::integer - 1);
    v_fecha_fin := v_fecha_inicio + 6;

    -- Insertar registro de ganancias semanales
    INSERT INTO ganancias_semanales (
        semana_numero, fecha_inicio, fecha_fin, total_inversion,
        porcentaje_ganancia, ganancia_bruta, ganancia_partners, 
        ganancia_inversores, procesado, fecha_procesado, procesado_por
    ) VALUES (
        v_semana_actual, v_fecha_inicio, v_fecha_fin, v_total_inversion,
        COALESCE(p_porcentaje, (v_ganancia_bruta * 100.0 / v_total_inversion)),
        v_ganancia_bruta, v_ganancia_partners, v_ganancia_inversores,
        true, NOW(), p_admin_id
    );

    -- Procesar ganancias de partners
    FOR partner_record IN 
        SELECT * FROM obtener_distribucion_partners(v_ganancia_partners)
    LOOP
        -- Insertar ganancia del partner
        INSERT INTO partner_ganancias (
            partner_id, semana_numero, ganancia_total, ganancia_comision,
            ganancia_operador, total_inversores, monto_total_inversores
        ) VALUES (
            partner_record.partner_id, v_semana_actual, partner_record.ganancia_total,
            partner_record.ganancia_comision, partner_record.ganancia_operador,
            partner_record.total_inversores, partner_record.monto_total_inversores
        );

        -- Crear transacción para el partner
        INSERT INTO partner_transacciones (
            partner_id, monto, tipo, descripcion
        ) VALUES (
            partner_record.partner_id, partner_record.ganancia_total, 'ganancia',
            'Ganancia semana ' || v_semana_actual
        );

        -- Actualizar inversión inicial del partner
        UPDATE partners 
        SET inversion_inicial = inversion_inicial + partner_record.ganancia_total
        WHERE id = partner_record.partner_id;

        -- Enviar notificación al partner
        INSERT INTO notificaciones (
            usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
        ) VALUES (
            partner_record.partner_id, 'partner',
            'Ganancias Procesadas - Semana ' || v_semana_actual,
            'Se han procesado tus ganancias: ' || partner_record.ganancia_total::text || ' USD. Ganancia propia: ' || partner_record.ganancia_operador::text || ' USD, Comisión: ' || partner_record.ganancia_comision::text || ' USD.',
            'success'
        );
    END LOOP;

    -- Procesar ganancias de inversores
    FOR inversor_record IN 
        SELECT * FROM obtener_distribucion_inversores(v_ganancia_inversores)
    LOOP
        -- Crear transacción para el inversor
        INSERT INTO transacciones (
            inversor_id, monto, tipo, descripcion
        ) VALUES (
            inversor_record.inversor_id, inversor_record.ganancia_individual, 'ganancia',
            'Ganancia semana ' || v_semana_actual
        );

        -- Actualizar totales del inversor
        UPDATE inversores 
        SET 
            ganancia_semanal = inversor_record.ganancia_individual,
            total = total + inversor_record.ganancia_individual
        WHERE id = inversor_record.inversor_id;

        -- Enviar notificación al inversor
        INSERT INTO notificaciones (
            usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
        ) VALUES (
            inversor_record.inversor_id, 'inversor',
            'Ganancias Procesadas - Semana ' || v_semana_actual,
            'Se han procesado tus ganancias: ' || inversor_record.ganancia_individual::text || ' USD (5% de tu inversión).',
            'success'
        );
    END LOOP;

    -- Incrementar semana
    UPDATE configuracion_sistema 
    SET valor = (v_semana_actual + 1)::text
    WHERE clave = 'semana_actual';

    RETURN QUERY SELECT true, 'Ganancias procesadas exitosamente'::text, v_semana_actual, v_ganancia_bruta, v_ganancia_partners, v_ganancia_inversores;
END;
$$;

-- Función para obtener estadísticas de admin
CREATE OR REPLACE FUNCTION obtener_estadisticas_admin()
RETURNS TABLE (
    total_inversion numeric,
    partners_activos integer,
    total_inversores integer,
    semana_actual integer,
    ganancia_semanal_actual numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COALESCE(SUM(p.inversion_inicial), 0) + COALESCE(SUM(i.total), 0)
         FROM partners p FULL OUTER JOIN inversores i ON false
         WHERE (p.activo = true OR p.activo IS NULL)) as total_inversion,
        (SELECT COUNT(*)::integer FROM partners WHERE activo = true) as partners_activos,
        (SELECT COUNT(*)::integer FROM inversores) as total_inversores,
        (SELECT COALESCE(valor::integer, 1) FROM configuracion_sistema WHERE clave = 'semana_actual') as semana_actual,
        (SELECT COALESCE(ganancia_bruta, 0) FROM ganancias_semanales ORDER BY semana_numero DESC LIMIT 1) as ganancia_semanal_actual;
END;
$$;

-- Función para datos del gráfico semanal
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
        ('Sem ' || gs.semana_numero::text) as week,
        COALESCE(gs.ganancia_bruta, 0) as ganancia
    FROM ganancias_semanales gs
    ORDER BY gs.semana_numero DESC
    LIMIT 8;
END;
$$;

-- Función para datos de torta de partner
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
    SELECT 
        pt.tipo::text as name,
        SUM(pt.monto) as value,
        CASE pt.tipo
            WHEN 'deposito' THEN '#10b981'
            WHEN 'retiro' THEN '#ef4444'
            WHEN 'ganancia' THEN '#3b82f6'
            ELSE '#6b7280'
        END as color
    FROM partner_transacciones pt
    WHERE pt.partner_id = p_partner_id
    GROUP BY pt.tipo
    HAVING SUM(pt.monto) > 0;
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
        COALESCE(SUM(CASE WHEN pt.tipo = 'deposito' OR pt.tipo = 'ganancia' THEN pt.monto ELSE -pt.monto END), 0) as inversion_total
    FROM partner_transacciones pt
    WHERE pt.partner_id = p_partner_id;
END;
$$;

-- Función para calcular inversión total del inversor
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    total_inversion numeric := 0;
BEGIN
    SELECT COALESCE(SUM(CASE WHEN t.tipo = 'deposito' OR t.tipo = 'ganancia' THEN t.monto ELSE -t.monto END), 0)
    INTO total_inversion
    FROM transacciones t
    WHERE t.inversor_id = p_inversor_id;
    
    RETURN total_inversion;
END;
$$;

-- Función para validar retiro de inversor
CREATE OR REPLACE FUNCTION validar_retiro_inversor(p_inversor_id uuid, p_monto numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    saldo_actual numeric;
BEGIN
    SELECT total INTO saldo_actual FROM inversores WHERE id = p_inversor_id;
    RETURN COALESCE(saldo_actual, 0) >= p_monto;
END;
$$;

-- Función para validar retiro de partner
CREATE OR REPLACE FUNCTION validar_retiro_partner(p_partner_id uuid, p_monto numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    saldo_actual numeric;
BEGIN
    SELECT inversion_inicial INTO saldo_actual FROM partners WHERE id = p_partner_id;
    RETURN COALESCE(saldo_actual, 0) >= p_monto;
END;
$$;

-- Función para configurar semana del sistema
CREATE OR REPLACE FUNCTION configurar_semana_sistema(
    p_semana_numero integer,
    p_fecha_inicio date,
    p_admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    -- Actualizar semana actual
    INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
    VALUES ('semana_actual', p_semana_numero::text, 'Semana actual del sistema', p_admin_id)
    ON CONFLICT (clave) DO UPDATE SET
        valor = p_semana_numero::text,
        updated_by = p_admin_id,
        updated_at = NOW();

    -- Actualizar fecha de inicio
    INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
    VALUES ('fecha_inicio_semana', p_fecha_inicio::text, 'Fecha de inicio de semana', p_admin_id)
    ON CONFLICT (clave) DO UPDATE SET
        valor = p_fecha_inicio::text,
        updated_by = p_admin_id,
        updated_at = NOW();

    RETURN true;
END;
$$;

-- Función para enviar avisos a todos los inversores
CREATE OR REPLACE FUNCTION enviar_aviso_a_todos_inversores(
    p_titulo text,
    p_mensaje text,
    p_tipo text,
    p_admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    -- Crear aviso
    INSERT INTO avisos (titulo, mensaje, tipo, creado_por)
    VALUES (p_titulo, p_mensaje, p_tipo, p_admin_id);

    -- Enviar notificación a todos los inversores
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    SELECT i.id, 'inversor', p_titulo, p_mensaje, p_tipo
    FROM inversores i;

    RETURN true;
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
        i.nombre,
        i.apellido,
        i.email,
        i.total,
        (pi.partner_id IS NOT NULL) as partner_assigned,
        p.nombre as partner_nombre
    FROM inversores i
    LEFT JOIN partner_inversores pi ON i.id = pi.inversor_id
    LEFT JOIN partners p ON pi.partner_id = p.id
    ORDER BY i.nombre, i.apellido;
END;
$$;

-- Función para obtener resumen de partners
CREATE OR REPLACE FUNCTION obtener_resumen_partners()
RETURNS TABLE (
    partner_id uuid,
    partner_nombre text,
    partner_tipo text,
    total_inversores integer,
    monto_total numeric,
    inversores json
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nombre,
        p.tipo::text,
        COUNT(pi.inversor_id)::integer,
        COALESCE(SUM(i.total), 0),
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
        )
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo
    HAVING COUNT(pi.inversor_id) > 0
    ORDER BY p.nombre;
END;
$$;