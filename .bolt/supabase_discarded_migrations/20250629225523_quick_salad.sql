/*
  # Corrección y optimización de cálculos de inversión

  1. Problemas identificados
    - Inconsistencias entre campo `total` y suma de transacciones
    - Funciones que no consideran todos los tipos de transacciones
    - Falta de triggers para mantener campos actualizados
    - Inconsistencias en nombres de tipos ('deposito' vs 'depósito')

  2. Soluciones implementadas
    - Normalización de tipos de transacciones
    - Triggers automáticos para actualizar totales
    - Funciones optimizadas de cálculo
    - Corrección de datos existentes

  3. Nuevas funciones
    - Cálculo en tiempo real de totales
    - Validación de consistencia de datos
    - Funciones de corrección automática
*/

-- 1. Normalizar tipos de transacciones existentes
UPDATE transacciones 
SET tipo = 'deposito' 
WHERE tipo IN ('depósito', 'Depósito', 'DEPOSITO');

UPDATE transacciones 
SET tipo = 'retiro' 
WHERE tipo IN ('Retiro', 'RETIRO');

UPDATE transacciones 
SET tipo = 'ganancia' 
WHERE tipo IN ('Ganancia', 'GANANCIA');

UPDATE transacciones 
SET tipo = 'reinversion' 
WHERE tipo IN ('reinversión', 'Reinversión', 'REINVERSION');

-- Hacer lo mismo para partner_transacciones
UPDATE partner_transacciones 
SET tipo = 'deposito' 
WHERE tipo IN ('depósito', 'Depósito', 'DEPOSITO');

UPDATE partner_transacciones 
SET tipo = 'retiro' 
WHERE tipo IN ('Retiro', 'RETIRO');

UPDATE partner_transacciones 
SET tipo = 'ganancia' 
WHERE tipo IN ('Ganancia', 'GANANCIA');

UPDATE partner_transacciones 
SET tipo = 'reinversion' 
WHERE tipo IN ('reinversión', 'Reinversión', 'REINVERSION');

-- 2. Función para calcular el total real de un inversor
CREATE OR REPLACE FUNCTION calcular_total_real_inversor(p_inversor_id UUID)
RETURNS NUMERIC(15,2)
LANGUAGE plpgsql
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
    
    RETURN v_total;
END;
$$;

-- 3. Función para calcular el total real de un partner
CREATE OR REPLACE FUNCTION calcular_total_real_partner(p_partner_id UUID)
RETURNS NUMERIC(15,2)
LANGUAGE plpgsql
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
    
    RETURN v_total;
END;
$$;

-- 4. Función para sincronizar todos los totales
CREATE OR REPLACE FUNCTION sincronizar_totales_sistema()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_inversores_actualizados INTEGER := 0;
    v_partners_actualizados INTEGER := 0;
    v_record RECORD;
BEGIN
    -- Actualizar totales de inversores
    FOR v_record IN SELECT id FROM inversores LOOP
        UPDATE inversores 
        SET total = calcular_total_real_inversor(v_record.id)
        WHERE id = v_record.id;
        v_inversores_actualizados := v_inversores_actualizados + 1;
    END LOOP;
    
    -- Actualizar totales de partners
    FOR v_record IN SELECT id FROM partners LOOP
        UPDATE partners 
        SET inversion_inicial = calcular_total_real_partner(v_record.id)
        WHERE id = v_record.id;
        v_partners_actualizados := v_partners_actualizados + 1;
    END LOOP;
    
    RETURN format('Actualizados: %s inversores, %s partners', 
                  v_inversores_actualizados, v_partners_actualizados);
END;
$$;

-- 5. Trigger para mantener actualizado el total de inversores
CREATE OR REPLACE FUNCTION trigger_actualizar_total_inversor()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE inversores 
        SET total = calcular_total_real_inversor(NEW.inversor_id)
        WHERE id = NEW.inversor_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE inversores 
        SET total = calcular_total_real_inversor(OLD.inversor_id)
        WHERE id = OLD.inversor_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 6. Trigger para mantener actualizado el total de partners
CREATE OR REPLACE FUNCTION trigger_actualizar_total_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE partners 
        SET inversion_inicial = calcular_total_real_partner(NEW.partner_id)
        WHERE id = NEW.partner_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE partners 
        SET inversion_inicial = calcular_total_real_partner(OLD.partner_id)
        WHERE id = OLD.partner_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 7. Crear triggers
DROP TRIGGER IF EXISTS trigger_transacciones_actualizar_total ON transacciones;
CREATE TRIGGER trigger_transacciones_actualizar_total
    AFTER INSERT OR UPDATE OR DELETE ON transacciones
    FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_total_inversor();

DROP TRIGGER IF EXISTS trigger_partner_transacciones_actualizar_total ON partner_transacciones;
CREATE TRIGGER trigger_partner_transacciones_actualizar_total
    AFTER INSERT OR UPDATE OR DELETE ON partner_transacciones
    FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_total_partner();

-- 8. Función optimizada para obtener total de inversión del sistema
CREATE OR REPLACE FUNCTION obtener_total_inversion_sistema()
RETURNS TABLE (
    total_inversores NUMERIC(15,2),
    total_partners NUMERIC(15,2),
    total_sistema NUMERIC(15,2),
    count_inversores INTEGER,
    count_partners INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT SUM(total) FROM inversores), 0) as total_inversores,
        COALESCE((SELECT SUM(inversion_inicial) FROM partners WHERE activo = true), 0) as total_partners,
        COALESCE((SELECT SUM(total) FROM inversores), 0) + 
        COALESCE((SELECT SUM(inversion_inicial) FROM partners WHERE activo = true), 0) as total_sistema,
        (SELECT COUNT(*)::INTEGER FROM inversores) as count_inversores,
        (SELECT COUNT(*)::INTEGER FROM partners WHERE activo = true) as count_partners;
END;
$$;

-- 9. Función para validar consistencia de datos
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

-- 10. Actualizar función existente para ser más precisa
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id UUID)
RETURNS NUMERIC(15,2)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Usar la nueva función optimizada
    RETURN calcular_total_real_inversor(p_inversor_id);
END;
$$;

-- 11. Función para obtener datos del gráfico semanal optimizada
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS TABLE (
    week TEXT,
    ganancia NUMERIC(15,2)
)
LANGUAGE plpgsql
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

-- 12. Ejecutar sincronización inicial
SELECT sincronizar_totales_sistema();

-- 13. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_transacciones_inversor_tipo ON transacciones(inversor_id, tipo);
CREATE INDEX IF NOT EXISTS idx_partner_transacciones_partner_tipo ON partner_transacciones(partner_id, tipo);
CREATE INDEX IF NOT EXISTS idx_ganancias_semanales_procesado ON ganancias_semanales(procesado, semana_numero);

-- 14. Función para reporte de totales del sistema
CREATE OR REPLACE FUNCTION reporte_totales_sistema()
RETURNS TABLE (
    concepto TEXT,
    cantidad INTEGER,
    monto NUMERIC(15,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 'Inversores Registrados'::TEXT, COUNT(*)::INTEGER, SUM(total)
    FROM inversores
    UNION ALL
    SELECT 'Partners Activos'::TEXT, COUNT(*)::INTEGER, SUM(inversion_inicial)
    FROM partners WHERE activo = true
    UNION ALL
    SELECT 'Total Depósitos'::TEXT, COUNT(*)::INTEGER, SUM(monto)
    FROM transacciones WHERE tipo = 'deposito'
    UNION ALL
    SELECT 'Total Retiros'::TEXT, COUNT(*)::INTEGER, SUM(monto)
    FROM transacciones WHERE tipo = 'retiro'
    UNION ALL
    SELECT 'Total Ganancias Pagadas'::TEXT, COUNT(*)::INTEGER, SUM(monto)
    FROM transacciones WHERE tipo = 'ganancia';
END;
$$;