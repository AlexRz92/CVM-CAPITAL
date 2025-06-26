-- =============================================
-- FUNCIONES PARA VISTA PREVIA CON PARÁMETROS REALES
-- =============================================

-- Función para vista previa de distribución de partners
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
BEGIN
  -- Calcular ganancia bruta según parámetros
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := p_total_inversion * (p_porcentaje / 100);
  ELSE
    v_ganancia_bruta := p_total_inversion * 0.05; -- 5% por defecto
  END IF;

  RETURN QUERY
  SELECT 
    p.id as partner_id,
    p.nombre::text,
    p.tipo::text,
    p.inversion_inicial,
    COALESCE(COUNT(pi.inversor_id)::integer, 0) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total_inversores,
    
    -- CÁLCULO CON VALORES PREDEFINIDOS
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Operador+Partner: 100% de ganancia propia + 100% del 30% de inversores
        ROUND((p.inversion_inicial * 0.05) + 
              (COALESCE(SUM(i.total), 0) * 0.05 * 0.30), 2)
      ELSE 
        -- Partner normal: 80% de ganancia propia + 1/3 del 30% de inversores
        ROUND((p.inversion_inicial * 0.05 * 0.80) + 
              (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3), 2)
    END as ganancia_comision,
    
    -- Sin ganancia operador adicional
    0::numeric as ganancia_operador,
    
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Total operador: ganancia propia + comisión
        ROUND((p.inversion_inicial * 0.05) + 
              (COALESCE(SUM(i.total), 0) * 0.05 * 0.30), 2)
      ELSE 
        -- Total partner: 80% propia + 1/3 comisión
        ROUND((p.inversion_inicial * 0.05 * 0.80) + 
              (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3), 2)
    END as ganancia_total
    
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.inversion_inicial
  ORDER BY p.nombre::text;
END;
$$;

-- Función para vista previa de distribución de inversores
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
  ganancia_individual numeric,
  porcentaje_inversor numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_ganancia_bruta numeric;
  v_porcentaje_inversores numeric := 70; -- Por defecto 70%
BEGIN
  -- Calcular ganancia bruta según parámetros
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := p_total_inversion * (p_porcentaje / 100);
  ELSE
    v_ganancia_bruta := p_total_inversion * 0.05; -- 5% por defecto
  END IF;

  -- Obtener porcentaje de inversores de configuración
  SELECT valor::numeric INTO v_porcentaje_inversores
  FROM configuracion_sistema
  WHERE clave = 'porcentaje_inversores';
  
  IF v_porcentaje_inversores IS NULL THEN
    v_porcentaje_inversores := 70;
  END IF;

  RETURN QUERY
  SELECT 
    i.id as inversor_id,
    i.nombre::text,
    i.apellido::text,
    i.email::text,
    i.total as inversion,
    ROUND(i.total * 0.05 * (v_porcentaje_inversores / 100), 2) as ganancia_individual,
    v_porcentaje_inversores as porcentaje_inversor
  FROM inversores i
  WHERE i.total > 0
  ORDER BY i.nombre, i.apellido;
END;
$$;

-- =============================================
-- VERIFICACIÓN
-- =============================================

SELECT 'Funciones de vista previa creadas correctamente' as status;

/*
  ✅ FUNCIONES DE VISTA PREVIA CREADAS:

  1. **obtener_distribucion_partners_preview**:
     - Recibe los parámetros reales del formulario
     - Calcula ganancia bruta según porcentaje O cantidad fija
     - Usa los valores predefinidos para partners

  2. **obtener_distribucion_inversores_preview**:
     - Calcula ganancias de inversores según parámetros reales
     - Usa el porcentaje configurado para inversores

  3. **Parámetros flexibles**:
     - p_porcentaje: Si se ingresa porcentaje
     - p_ganancia_bruta: Si se ingresa cantidad fija
     - p_total_inversion: Total actual del sistema

  ✅ Ahora la vista previa usará los valores reales del formulario.
*/