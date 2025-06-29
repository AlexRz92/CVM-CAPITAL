/*
  # Normalización completa de tipos de transacciones

  1. DROP de constraints y funciones existentes
  2. Normalización de datos existentes
  3. Recreación de constraints con valores correctos
  4. Nuevas funciones optimizadas
  5. Triggers para mantener consistencia

  ## Cambios principales:
  - Solo se permiten: 'deposito', 'retiro', 'ganancia', 'reinversion'
  - Eliminación de variantes con acentos y mayúsculas
  - Funciones optimizadas para cálculos
  - Triggers automáticos para mantener totales actualizados
*/

-- 1. DROP DE CONSTRAINTS EXISTENTES
ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_tipo_check;
ALTER TABLE partner_transacciones DROP CONSTRAINT IF EXISTS partner_transacciones_tipo_check;
ALTER TABLE solicitudes DROP CONSTRAINT IF EXISTS solicitudes_tipo_check;
ALTER TABLE partner_solicitudes DROP CONSTRAINT IF EXISTS partner_solicitudes_tipo_check;

-- 2. DROP DE TRIGGERS EXISTENTES
DROP TRIGGER IF EXISTS trigger_transacciones_actualizar_total ON transacciones;
DROP TRIGGER IF EXISTS trigger_partner_transacciones_actualizar_total ON partner_transacciones;
DROP TRIGGER IF EXISTS trigger_solicitudes_inversor ON solicitudes;
DROP TRIGGER IF EXISTS trigger_solicitudes_partner ON partner_solicitudes;

-- 3. DROP DE FUNCIONES EXISTENTES
DROP FUNCTION IF EXISTS calcular_inversion_total_inversor(UUID);
DROP FUNCTION IF EXISTS calcular_total_real_inversor(UUID);
DROP FUNCTION IF EXISTS calcular_total_real_partner(UUID);
DROP FUNCTION IF EXISTS sincronizar_totales_sistema();
DROP FUNCTION IF EXISTS validar_consistencia_datos();
DROP FUNCTION IF EXISTS obtener_total_inversion_sistema();
DROP FUNCTION IF EXISTS trigger_actualizar_total_inversor();
DROP FUNCTION IF EXISTS trigger_actualizar_total_partner();
DROP FUNCTION IF EXISTS trigger_procesar_solicitud_inversor();
DROP FUNCTION IF EXISTS trigger_procesar_solicitud_partner();
DROP FUNCTION IF EXISTS validar_retiro_inversor(UUID, NUMERIC);
DROP FUNCTION IF EXISTS validar_retiro_partner(UUID, NUMERIC);
DROP FUNCTION IF EXISTS obtener_datos_grafico_semanal();
DROP FUNCTION IF EXISTS obtener_datos_torta_partner(UUID);

-- 4. NORMALIZACIÓN DE DATOS EXISTENTES
-- Normalizar transacciones de inversores
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

-- Normalizar transacciones de partners
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

-- Normalizar solicitudes
UPDATE solicitudes 
SET tipo = 'deposito' 
WHERE tipo IN ('depósito', 'Depósito', 'DEPOSITO', 'Deposito');

UPDATE solicitudes 
SET tipo = 'retiro' 
WHERE tipo IN ('Retiro', 'RETIRO');

UPDATE partner_solicitudes 
SET tipo = 'deposito' 
WHERE tipo IN ('depósito', 'Depósito', 'DEPOSITO', 'Deposito');

UPDATE partner_solicitudes 
SET tipo = 'retiro' 
WHERE tipo IN ('Retiro', 'RETIRO');

-- 5. RECREAR CONSTRAINTS CON VALORES NORMALIZADOS
ALTER TABLE transacciones ADD CONSTRAINT transacciones_tipo_check 
CHECK (tipo = ANY (ARRAY['deposito'::text, 'retiro'::text, 'ganancia'::text, 'reinversion'::text]));

ALTER TABLE partner_transacciones ADD CONSTRAINT partner_transacciones_tipo_check 
CHECK (tipo = ANY (ARRAY['deposito'::text, 'retiro'::text, 'ganancia'::text, 'reinversion'::text]));

ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_tipo_check 
CHECK (tipo = ANY (ARRAY['deposito'::text, 'retiro'::text]));

ALTER TABLE partner_solicitudes ADD CONSTRAINT partner_solicitudes_tipo_check 
CHECK (tipo = ANY (ARRAY['deposito'::text, 'retiro'::text]));

-- 6. FUNCIÓN PARA CALCULAR TOTAL REAL DE INVERSOR
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

-- 7. FUNCIÓN PARA CALCULAR TOTAL REAL DE PARTNER
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

-- 8. FUNCIÓN DE SINCRONIZACIÓN COMPLETA
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

-- 9. FUNCIÓN DE VALIDACIÓN DE CONSISTENCIA
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

-- 10. FUNCIÓN OPTIMIZADA PARA TOTALES DEL SISTEMA
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

-- 11. TRIGGERS PARA MANTENER CONSISTENCIA AUTOMÁTICA
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

-- 12. RECREAR TRIGGERS DE SOLICITUDES
CREATE OR REPLACE FUNCTION trigger_procesar_solicitud_inversor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo procesar cuando el estado cambia a 'aprobado'
    IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
        -- Insertar transacción
        INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
        VALUES (NEW.inversor_id, NEW.monto, NEW.tipo, 
                'Solicitud aprobada - ID: ' || NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_procesar_solicitud_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo procesar cuando el estado cambia a 'aprobado'
    IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
        -- Insertar transacción
        INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
        VALUES (NEW.partner_id, NEW.monto, NEW.tipo, 
                'Solicitud aprobada - ID: ' || NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- 13. CREAR TODOS LOS TRIGGERS
CREATE TRIGGER trigger_transacciones_actualizar_total
    AFTER INSERT OR UPDATE OR DELETE ON transacciones
    FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_total_inversor();

CREATE TRIGGER trigger_partner_transacciones_actualizar_total
    AFTER INSERT OR UPDATE OR DELETE ON partner_transacciones
    FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_total_partner();

CREATE TRIGGER trigger_solicitudes_inversor
    AFTER UPDATE ON solicitudes
    FOR EACH ROW EXECUTE FUNCTION trigger_procesar_solicitud_inversor();

CREATE TRIGGER trigger_solicitudes_partner
    AFTER UPDATE ON partner_solicitudes
    FOR EACH ROW EXECUTE FUNCTION trigger_procesar_solicitud_partner();

-- 14. FUNCIONES DE VALIDACIÓN
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

-- 15. FUNCIÓN PARA COMPATIBILIDAD CON CÓDIGO EXISTENTE
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id UUID)
RETURNS NUMERIC(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN calcular_total_real_inversor(p_inversor_id);
END;
$$;

-- 16. FUNCIÓN PARA GRÁFICO SEMANAL
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS TABLE (
    week TEXT,
    ganancia NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Sem ' || gs.semana_numero::TEXT as week,
        COALESCE(gs.ganancia_bruta, 0) as ganancia
    FROM ganancias_semanales gs
    WHERE gs.procesado = true
    ORDER BY gs.semana_numero DESC
    LIMIT 8;
    
    -- Si no hay datos, devolver datos por defecto
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 'Sem ' || generate_series(1,4)::TEXT, 0::NUMERIC(15,2);
    END IF;
END;
$$;

-- 17. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_transacciones_inversor_tipo ON transacciones(inversor_id, tipo);
CREATE INDEX IF NOT EXISTS idx_partner_transacciones_partner_tipo ON partner_transacciones(partner_id, tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo_monto ON transacciones(tipo, monto);
CREATE INDEX IF NOT EXISTS idx_partner_transacciones_tipo_monto ON partner_transacciones(tipo, monto);
CREATE INDEX IF NOT EXISTS idx_ganancias_semanales_procesado ON ganancias_semanales(procesado, semana_numero);

-- 18. EJECUTAR SINCRONIZACIÓN INICIAL
SELECT sincronizar_totales_sistema();

-- 19. FUNCIÓN DE LIMPIEZA DE DATOS
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

-- 20. CREAR VISTA PARA MONITOREO
CREATE OR REPLACE VIEW vista_resumen_sistema AS
SELECT 
    'Sistema General' as categoria,
    (SELECT COUNT(*) FROM inversores) as total_inversores,
    (SELECT COUNT(*) FROM partners WHERE activo = true) as total_partners,
    (SELECT SUM(total) FROM inversores) as inversion_inversores,
    (SELECT SUM(inversion_inicial) FROM partners WHERE activo = true) as inversion_partners,
    (SELECT SUM(total) FROM inversores) + 
    (SELECT SUM(inversion_inicial) FROM partners WHERE activo = true) as total_sistema;