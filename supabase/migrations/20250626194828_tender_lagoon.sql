/*
  # Fix obtener_distribucion_partners function type mismatch

  1. Function Updates
    - Update `obtener_distribucion_partners` function to cast nombre column to text
    - This resolves the "structure of query does not match function result type" error
    
  2. Changes Made
    - Cast `p.nombre` to `text` type in the SELECT statement
    - Ensures consistent return type matching expected text type
*/

-- Drop and recreate the function with proper type casting
DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric);

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
        -- Para operador+partner: ganancia propia (70% de su inversión) + 100% del 30% de sus inversores
        (p.inversion_inicial * 0.05 * 0.70) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30)
      ELSE 
        -- Para partner normal: 70% de su ganancia propia + su % de comisión del 30% de sus inversores
        (p.inversion_inicial * 0.05 * 0.70) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * (p.porcentaje_comision / 100))
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
        (p.inversion_inicial * 0.05 * 0.70) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30) +
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * (p.porcentaje_especial / 100))
      ELSE 
        -- Total: ganancia propia + comisión
        (p.inversion_inicial * 0.05 * 0.70) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * (p.porcentaje_comision / 100))
    END as ganancia_total
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  ORDER BY p.nombre;
END;
$$;