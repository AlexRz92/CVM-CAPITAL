/*
  # Paso 3: Crear funciones corregidas
  
  Crea todas las funciones con los cálculos exactos especificados
*/

-- Función para obtener distribución de partners
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
) AS $$
DECLARE
    v_porcentaje_inversores numeric;
BEGIN
    -- Obtener porcentaje de inversores desde configuración
    SELECT COALESCE(valor::numeric, 70) INTO v_porcentaje_inversores
    FROM configuracion_sistema 
    WHERE clave = 'porcentaje_inversores';

    RETURN QUERY
    WITH partner_stats AS (
        SELECT 
            p.id,
            p.nombre,
            p.tipo,
            p.porcentaje_comision,
            p.porcentaje_especial,
            p.inversion_inicial,
            COUNT(pi.inversor_id)::integer as total_inversores,
            COALESCE(SUM(i.total), 0) as monto_total_inversores
        FROM partners p
        LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
        LEFT JOIN inversores i ON pi.inversor_id = i.id
        WHERE p.activo = true
        GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
    )
    SELECT 
        ps.id,
        ps.nombre,
        ps.tipo,
        ps.porcentaje_comision,
        ps.porcentaje_especial,
        ps.inversion_inicial,
        ps.total_inversores,
        ps.monto_total_inversores,
        CASE 
            WHEN ps.tipo = 'operador_partner' THEN
                -- Partner + Operador: 100% de su ganancia + 100% del 30% de sus inversores
                (ps.monto_total_inversores * 5 * (100 - v_porcentaje_inversores)) / 10000
            ELSE
                -- Partner normal: (30% ÷ 3) de su ganancia + (30% ÷ 3) de sus inversores
                ((ps.inversion_inicial * 5 * (100 - v_porcentaje_inversores)) / 10000) / 3 +
                ((ps.monto_total_inversores * 5 * (100 - v_porcentaje_inversores)) / 10000) / 3
        END as ganancia_comision,
        CASE 
            WHEN ps.tipo = 'operador_partner' THEN
                -- Partner + Operador: 100% de su ganancia propia
                (ps.inversion_inicial * 5 * v_porcentaje_inversores) / 10000
            ELSE
                -- Partner normal: 70% + (30% ÷ 3) de su ganancia propia
                (ps.inversion_inicial * 5 * v_porcentaje_inversores) / 10000 + 
                ((ps.inversion_inicial * 5 * (100 - v_porcentaje_inversores)) / 10000) / 3
        END as ganancia_operador,
        CASE 
            WHEN ps.tipo = 'operador_partner' THEN
                -- Total: ganancia propia + comisión completa
                (ps.inversion_inicial * 5 * v_porcentaje_inversores) / 10000 +
                (ps.monto_total_inversores * 5 * (100 - v_porcentaje_inversores)) / 10000
            ELSE
                -- Total: ganancia propia completa + comisión reducida
                (ps.inversion_inicial * 5 * v_porcentaje_inversores) / 10000 + 
                ((ps.inversion_inicial * 5 * (100 - v_porcentaje_inversores)) / 10000) / 3 +
                ((ps.monto_total_inversores * 5 * (100 - v_porcentaje_inversores)) / 10000) / 3
        END as ganancia_total
    FROM partner_stats ps;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener distribución de inversores
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS TABLE (
    inversor_id uuid,
    nombre text,
    apellido text,
    inversion numeric,
    ganancia_individual numeric,
    porcentaje_ganancia numeric,
    porcentaje_inversor numeric
) AS $$
DECLARE
    v_porcentaje_inversores numeric;
BEGIN
    -- Obtener porcentaje de inversores desde configuración
    SELECT COALESCE(valor::numeric, 70) INTO v_porcentaje_inversores
    FROM configuracion_sistema 
    WHERE clave = 'porcentaje_inversores';

    RETURN QUERY
    SELECT 
        i.id,
        i.nombre,
        i.apellido,
        i.total,
        (i.total * 5 * v_porcentaje_inversores) / 10000 as ganancia_individual,
        5::numeric as porcentaje_ganancia,
        v_porcentaje_inversores as porcentaje_inversor
    FROM inversores i
    WHERE i.total > 0
    ORDER BY i.nombre, i.apellido;
END;
$$ LANGUAGE plpgsql;

-- Función para configurar semana del sistema
CREATE OR REPLACE FUNCTION configurar_semana_sistema(
    p_semana_numero integer,
    p_fecha_inicio date,
    p_admin_id uuid
) RETURNS boolean AS $$
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

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de admin
CREATE OR REPLACE FUNCTION obtener_estadisticas_admin()
RETURNS TABLE (
    total_inversion numeric,
    partners_activos integer,
    total_inversores integer,
    semana_actual integer,
    ganancia_semanal_actual numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT SUM(total) FROM inversores), 0) + 
        COALESCE((SELECT SUM(inversion_inicial) FROM partners WHERE activo = true), 0) as total_inversion,
        COALESCE((SELECT COUNT(*)::integer FROM partners WHERE activo = true), 0) as partners_activos,
        COALESCE((SELECT COUNT(*)::integer FROM inversores), 0) as total_inversores,
        COALESCE((SELECT valor::integer FROM configuracion_sistema WHERE clave = 'semana_actual'), 1) as semana_actual,
        COALESCE((SELECT ganancia_bruta FROM ganancias_semanales ORDER BY semana_numero DESC LIMIT 1), 0) as ganancia_semanal_actual;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular inversión total del inversor
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id uuid)
RETURNS numeric AS $$
DECLARE
    v_total numeric := 0;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN tipo IN ('deposito', 'depósito', 'reinversion', 'reinversión') THEN monto
            ELSE 0
        END
    ), 0) INTO v_total
    FROM transacciones 
    WHERE inversor_id = p_inversor_id;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos actualizados del partner
CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(p_partner_id uuid)
RETURNS TABLE (
    inversion_total numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT COALESCE(SUM(
        CASE 
            WHEN tipo IN ('deposito', 'depósito', 'reinversion', 'reinversión') THEN monto
            ELSE 0
        END
    ), 0) as inversion_total
    FROM partner_transacciones 
    WHERE partner_id = p_partner_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos del gráfico de torta del partner
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id uuid)
RETURNS TABLE (
    name text,
    value numeric,
    color text
) AS $$
BEGIN
    RETURN QUERY
    WITH transacciones_agrupadas AS (
        SELECT 
            CASE 
                WHEN tipo IN ('deposito', 'depósito') THEN 'Depósitos'
                WHEN tipo = 'retiro' THEN 'Retiros'
                WHEN tipo IN ('reinversion', 'reinversión') THEN 'Reinversiones'
                WHEN tipo = 'ganancia' THEN 'Ganancias'
                ELSE 'Otros'
            END as categoria,
            SUM(monto) as total
        FROM partner_transacciones
        WHERE partner_id = p_partner_id
        GROUP BY 
            CASE 
                WHEN tipo IN ('deposito', 'depósito') THEN 'Depósitos'
                WHEN tipo = 'retiro' THEN 'Retiros'
                WHEN tipo IN ('reinversion', 'reinversión') THEN 'Reinversiones'
                WHEN tipo = 'ganancia' THEN 'Ganancias'
                ELSE 'Otros'
            END
        HAVING SUM(monto) > 0
    )
    SELECT 
        ta.categoria,
        ta.total,
        CASE ta.categoria
            WHEN 'Depósitos' THEN '#10b981'
            WHEN 'Retiros' THEN '#ef4444'
            WHEN 'Reinversiones' THEN '#3b82f6'
            WHEN 'Ganancias' THEN '#f59e0b'
            ELSE '#6b7280'
        END as color
    FROM transacciones_agrupadas ta
    ORDER BY ta.total DESC;
END;
$$ LANGUAGE plpgsql;