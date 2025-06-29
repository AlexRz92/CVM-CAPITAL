/*
  # Corrección completa de consistencia de base de datos

  1. Normalización de tipos de transacciones
    - Estandarizar solo "deposito" y "retiro" (sin acentos)
    - Actualizar todas las transacciones existentes
    - Eliminar variaciones con acentos

  2. Funciones optimizadas de cálculo
    - Función para calcular totales reales
    - Validación de consistencia
    - Sincronización automática

  3. Triggers automáticos
    - Mantener totales actualizados en tiempo real
    - Prevenir inconsistencias futuras

  4. Constraints mejorados
    - Solo permitir valores específicos
    - Prevenir errores de escritura
*/

-- 1. NORMALIZACIÓN DE DATOS EXISTENTES
-- Actualizar transacciones de inversores
UPDATE transacciones 
SET tipo = 'deposito' 
WHERE tipo IN ('depósito', 'Depósito', 'DEPOSITO', 'Deposito');

UPDATE transacciones 
SET tipo = 'retiro' 
WHERE tipo IN ('Retiro', 'RETIRO');

UPDATE transacciones 
SET tipo = 'ganancia' 
WHERE tipo IN ('Ganancia', 'GANANCIA');

UPDATE transacciones 
SET tipo = 'reinversion' 
WHERE tipo IN ('reinversión', 'Reinversión', 'REINVERSION', 'Reinversion');

-- Actualizar transacciones de partners
UPDATE partner_transacciones 
SET tipo = 'deposito' 
WHERE tipo IN ('depósito', 'Depósito', 'DEPOSITO', 'Deposito');

UPDATE partner_transacciones 
SET tipo = 'retiro' 
WHERE tipo IN ('Retiro', 'RETIRO');

UPDATE partner_transacciones 
SET tipo = 'ganancia' 
WHERE tipo IN ('Ganancia', 'GANANCIA');

UPDATE partner_transacciones 
SET tipo = 'reinversion' 
WHERE tipo IN ('reinversión', 'Reinversión', 'REINVERSION', 'Reinversion');

-- 2. ELIMINAR CONSTRAINTS EXISTENTES Y RECREAR CON VALORES CORRECTOS
ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_tipo_check;
ALTER TABLE transacciones ADD CONSTRAINT transacciones_tipo_check 
CHECK (tipo = ANY (ARRAY['deposito'::text, 'retiro'::text, 'ganancia'::text, 'reinversion'::text]));

ALTER TABLE partner_transacciones DROP CONSTRAINT IF EXISTS partner_transacciones_tipo_check;
ALTER TABLE partner_transacciones ADD CONSTRAINT partner_transacciones_tipo_check 
CHECK (tipo = ANY (ARRAY['deposito'::text, 'retiro'::text, 'ganancia'::text, 'reinversion'::text]));

ALTER TABLE solicitudes DROP CONSTRAINT IF EXISTS solicitudes_tipo_check;
ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_tipo_check 
CHECK (tipo = ANY (ARRAY['deposito'::text, 'retiro'::text]));

ALTER TABLE partner_solicitudes DROP CONSTRAINT IF EXISTS partner_solicitudes_tipo_check;
ALTER TABLE partner_solicitudes ADD CONSTRAINT partner_solicitudes_tipo_check 
CHECK (tipo = ANY (ARRAY['deposito'::text, 'retiro'::text]));

-- 3. FUNCIÓN PARA CALCULAR TOTAL REAL DE INVERSOR
CREATE OR REPLACE FUNCTION calcular_total_real_inversor(p_inversor_id UUID)
RETURNS NUMERIC(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total NUMERIC(15,2) := 0;
BEGIN
    SELECT COALESCE(
        SUM(CASE 
            WHEN tipo IN ('deposito', 'ganancia', 'reinversion') THEN monto
            WHEN tipo = 'retiro' THEN -monto
            ELSE 0
        END), 0
    )
    INTO v_total
    FROM transacciones
    WHERE inversor_id = p_inversor_id;
    
    RETURN GREATEST(v_total, 0); -- No permitir negativos
END;
$$;

-- 4. FUNCIÓN PARA CALCULAR TOTAL REAL DE PARTNER
CREATE OR REPLACE FUNCTION calcular_total_real_partner(p_partner_id UUID)
RETURNS NUMERIC(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total NUMERIC(15,2) := 0;
BEGIN
    SELECT COALESCE(
        SUM(CASE 
            WHEN tipo IN ('deposito', 'ganancia', 'reinversion') THEN monto
            WHEN tipo = 'retiro' THEN -monto
            ELSE 0
        END), 0
    )
    INTO v_total
    FROM partner_transacciones
    WHERE partner_id = p_partner_id;
    
    RETURN GREATEST(v_total, 0); -- No permitir negativos
END;
$$;

-- 5. FUNCIÓN DE SINCRONIZACIÓN COMPLETA
CREATE OR REPLACE FUNCTION sincronizar_totales_sistema()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inversores_actualizados INTEGER := 0;
    v_partners_actualizados INTEGER := 0;
    v_record RECORD;
    v_nuevo_total NUMERIC(15,2);
BEGIN
    -- Actualizar totales de inversores
    FOR v_record IN SELECT id FROM inversores LOOP
        v_nuevo_total := calcular_total_real_inversor(v_record.id);
        
        UPDATE inversores 
        SET total = v_nuevo_total,
            capital_inicial = CASE 
                WHEN capital_inicial = 0 AND v_nuevo_total > 0 THEN v_nuevo_total
                ELSE capital_inicial
            END
        WHERE id = v_record.id;
        
        v_inversores_actualizados := v_inversores_actualizados + 1;
    END LOOP;
    
    -- Actualizar totales de partners
    FOR v_record IN SELECT id FROM partners LOOP
        v_nuevo_total := calcular_total_real_partner(v_record.id);
        
        UPDATE partners 
        SET inversion_inicial = v_nuevo_total
        WHERE id = v_record.id;
        
        v_partners_actualizados := v_partners_actualizados + 1;
    END LOOP;
    
    RETURN format('✅ Sincronización completada: %s inversores y %s partners actualizados', 
                  v_inversores_actualizados, v_partners_actualizados);
END;
$$;

-- 6. FUNCIÓN DE VALIDACIÓN DE CONSISTENCIA
CREATE OR REPLACE FUNCTION validar_consistencia_datos()
RETURNS TABLE (
    inversor_id UUID,
    nombre TEXT,
    apellido TEXT,
    total_actual NUMERIC(15,2),
    total_calculado NUMERIC(15,2),
    diferencia NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.nombre,
        i.apellido,
        i.total,
        calcular_total_real_inversor(i.id),
        i.total - calcular_total_real_inversor(i.id)
    FROM inversores i
    WHERE ABS(i.total - calcular_total_real_inversor(i.id)) > 0.01
    ORDER BY ABS(i.total - calcular_total_real_inversor(i.id)) DESC;
END;
$$;

-- 7. FUNCIÓN OPTIMIZADA PARA TOTALES DEL SISTEMA
CREATE OR REPLACE FUNCTION obtener_total_inversion_sistema()
RETURNS TABLE (
    total_inversores NUMERIC(15,2),
    total_partners NUMERIC(15,2),
    total_sistema NUMERIC(15,2),
    count_inversores INTEGER,
    count_partners INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_inv NUMERIC(15,2);
    v_total_part NUMERIC(15,2);
BEGIN
    -- Calcular total de inversores
    SELECT COALESCE(SUM(total), 0) INTO v_total_inv FROM inversores;
    
    -- Calcular total de partners activos
    SELECT COALESCE(SUM(inversion_inicial), 0) INTO v_total_part 
    FROM partners WHERE activo = true;
    
    RETURN QUERY
    SELECT 
        v_total_inv as total_inversores,
        v_total_part as total_partners,
        v_total_inv + v_total_part as total_sistema,
        (SELECT COUNT(*)::INTEGER FROM inversores) as count_inversores,
        (SELECT COUNT(*)::INTEGER FROM partners WHERE activo = true) as count_partners;
END;
$$;

-- 8. TRIGGERS PARA MANTENER CONSISTENCIA AUTOMÁTICA
CREATE OR REPLACE FUNCTION trigger_actualizar_total_inversor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inversor_id UUID;
BEGIN
    -- Determinar el ID del inversor afectado
    IF TG_OP = 'DELETE' THEN
        v_inversor_id := OLD.inversor_id;
    ELSE
        v_inversor_id := NEW.inversor_id;
    END IF;
    
    -- Actualizar el total del inversor
    UPDATE inversores 
    SET total = calcular_total_real_inversor(v_inversor_id)
    WHERE id = v_inversor_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_actualizar_total_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id UUID;
BEGIN
    -- Determinar el ID del partner afectado
    IF TG_OP = 'DELETE' THEN
        v_partner_id := OLD.partner_id;
    ELSE
        v_partner_id := NEW.partner_id;
    END IF;
    
    -- Actualizar el total del partner
    UPDATE partners 
    SET inversion_inicial = calcular_total_real_partner(v_partner_id)
    WHERE id = v_partner_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 9. CREAR/RECREAR TRIGGERS
DROP TRIGGER IF EXISTS trigger_transacciones_actualizar_total ON transacciones;
CREATE TRIGGER trigger_transacciones_actualizar_total
    AFTER INSERT OR UPDATE OR DELETE ON transacciones
    FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_total_inversor();

DROP TRIGGER IF EXISTS trigger_partner_transacciones_actualizar_total ON partner_transacciones;
CREATE TRIGGER trigger_partner_transacciones_actualizar_total
    AFTER INSERT OR UPDATE OR DELETE ON partner_transacciones
    FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_total_partner();

-- 10. ACTUALIZAR FUNCIÓN EXISTENTE PARA COMPATIBILIDAD
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id UUID)
RETURNS NUMERIC(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN calcular_total_real_inversor(p_inversor_id);
END;
$$;

-- 11. FUNCIÓN PARA VALIDAR RETIROS
CREATE OR REPLACE FUNCTION validar_retiro_inversor(p_inversor_id UUID, p_monto NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_actual NUMERIC(15,2);
BEGIN
    SELECT total INTO v_total_actual FROM inversores WHERE id = p_inversor_id;
    RETURN COALESCE(v_total_actual, 0) >= p_monto;
END;
$$;

CREATE OR REPLACE FUNCTION validar_retiro_partner(p_partner_id UUID, p_monto NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_actual NUMERIC(15,2);
BEGIN
    SELECT inversion_inicial INTO v_total_actual FROM partners WHERE id = p_partner_id;
    RETURN COALESCE(v_total_actual, 0) >= p_monto;
END;
$$;

-- 12. ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_transacciones_inversor_tipo ON transacciones(inversor_id, tipo);
CREATE INDEX IF NOT EXISTS idx_partner_transacciones_partner_tipo ON partner_transacciones(partner_id, tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo_monto ON transacciones(tipo, monto);
CREATE INDEX IF NOT EXISTS idx_partner_transacciones_tipo_monto ON partner_transacciones(tipo, monto);

-- 13. FUNCIÓN DE REPORTE DETALLADO
CREATE OR REPLACE FUNCTION reporte_detallado_sistema()
RETURNS TABLE (
    categoria TEXT,
    subcategoria TEXT,
    cantidad INTEGER,
    monto_total NUMERIC(15,2),
    promedio NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Inversores
    SELECT 
        'Inversores'::TEXT as categoria,
        'Total Registrados'::TEXT as subcategoria,
        COUNT(*)::INTEGER as cantidad,
        SUM(total) as monto_total,
        AVG(total) as promedio
    FROM inversores
    
    UNION ALL
    
    -- Partners
    SELECT 
        'Partners'::TEXT,
        'Activos'::TEXT,
        COUNT(*)::INTEGER,
        SUM(inversion_inicial),
        AVG(inversion_inicial)
    FROM partners WHERE activo = true
    
    UNION ALL
    
    -- Transacciones por tipo
    SELECT 
        'Transacciones'::TEXT,
        'Depósitos'::TEXT,
        COUNT(*)::INTEGER,
        SUM(monto),
        AVG(monto)
    FROM transacciones WHERE tipo = 'deposito'
    
    UNION ALL
    
    SELECT 
        'Transacciones'::TEXT,
        'Retiros'::TEXT,
        COUNT(*)::INTEGER,
        SUM(monto),
        AVG(monto)
    FROM transacciones WHERE tipo = 'retiro'
    
    UNION ALL
    
    SELECT 
        'Transacciones'::TEXT,
        'Ganancias'::TEXT,
        COUNT(*)::INTEGER,
        SUM(monto),
        AVG(monto)
    FROM transacciones WHERE tipo = 'ganancia';
END;
$$;

-- 14. EJECUTAR SINCRONIZACIÓN INICIAL
SELECT sincronizar_totales_sistema();

-- 15. CREAR VISTA PARA MONITOREO
CREATE OR REPLACE VIEW vista_resumen_sistema AS
SELECT 
    'Sistema General' as categoria,
    (SELECT COUNT(*) FROM inversores) as total_inversores,
    (SELECT COUNT(*) FROM partners WHERE activo = true) as total_partners,
    (SELECT SUM(total) FROM inversores) as inversion_inversores,
    (SELECT SUM(inversion_inicial) FROM partners WHERE activo = true) as inversion_partners,
    (SELECT SUM(total) FROM inversores) + 
    (SELECT SUM(inversion_inicial) FROM partners WHERE activo = true) as total_sistema;

-- 16. FUNCIÓN PARA LIMPIAR DATOS INCONSISTENTES
CREATE OR REPLACE FUNCTION limpiar_datos_inconsistentes()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_registros_limpiados INTEGER := 0;
BEGIN
    -- Eliminar transacciones con montos negativos o cero
    DELETE FROM transacciones WHERE monto <= 0;
    GET DIAGNOSTICS v_registros_limpiados = ROW_COUNT;
    
    -- Eliminar transacciones de partners con montos negativos o cero
    DELETE FROM partner_transacciones WHERE monto <= 0;
    
    -- Actualizar totales después de la limpieza
    PERFORM sincronizar_totales_sistema();
    
    RETURN format('Limpieza completada: %s registros inconsistentes eliminados', v_registros_limpiados);
END;
$$;