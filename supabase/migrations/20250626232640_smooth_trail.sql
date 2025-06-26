/*
  # Create preview functions for earnings distribution

  1. New Functions
    - `obtener_distribucion_partners_preview` - Preview partner earnings distribution
    - `obtener_distribucion_inversores_preview` - Preview investor earnings distribution
  
  2. Security
    - Functions are accessible to authenticated users
    - Return preview data without modifying database
*/

-- Function to preview partner earnings distribution
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
  -- Calculate gross earnings
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := (p_porcentaje * p_total_inversion) / 100;
  ELSE
    RAISE EXCEPTION 'Either p_porcentaje or p_ganancia_bruta must be provided';
  END IF;

  -- Get partner percentage from configuration (default 30%)
  SELECT COALESCE(
    (SELECT valor::numeric FROM configuracion_sistema WHERE clave = 'porcentaje_inversores'),
    70
  ) INTO v_porcentaje_partners;
  
  v_porcentaje_partners := 100 - v_porcentaje_partners; -- Partners get the remaining percentage

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
      -- Calculate partner's own earnings (5% of their investment)
      CASE 
        WHEN ps.tipo = 'operador_partner' THEN 
          (ps.inversion_inicial * 0.05) -- 100% of own earnings for operator partners
        ELSE 
          (ps.inversion_inicial * 0.05 * 0.8) -- 80% of own earnings for regular partners
      END as ganancia_propia,
      
      -- Calculate commission from investors
      CASE 
        WHEN ps.tipo = 'operador_partner' THEN 
          -- Operator partners get 100% of their investors' partner share
          (ps.monto_total_inversores * 0.05 * v_porcentaje_partners / 100)
        ELSE 
          -- Regular partners get 1/3 of their investors' partner share
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

-- Function to preview investor earnings distribution
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
  -- Calculate gross earnings
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := (p_porcentaje * p_total_inversion) / 100;
  ELSE
    RAISE EXCEPTION 'Either p_porcentaje or p_ganancia_bruta must be provided';
  END IF;

  -- Get investor percentage from configuration (default 70%)
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
    -- Each investor gets their percentage of 5% of their investment
    (i.capital_inicial * 0.05 * v_porcentaje_inversores / 100)::numeric as ganancia_individual
  FROM inversores i
  WHERE i.capital_inicial > 0
  ORDER BY i.capital_inicial DESC;
END;
$$;