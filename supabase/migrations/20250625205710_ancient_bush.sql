/*
  # Create distribution functions for earnings processing

  1. Functions
    - `obtener_distribucion_partners` - Calculate partner earnings distribution
    - `obtener_distribucion_inversores` - Calculate investor earnings distribution
    - `procesar_ganancias_semanales` - Process weekly earnings

  2. Security
    - Functions are accessible to authenticated users
    - Proper error handling included
*/

-- Function to get partner distribution
CREATE OR REPLACE FUNCTION obtener_distribucion_partners(p_ganancia_partners numeric)
RETURNS TABLE (
  partner_id uuid,
  nombre varchar,
  tipo varchar,
  total_inversores integer,
  monto_total_inversores numeric,
  ganancia_comision numeric,
  ganancia_operador numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH partner_stats AS (
    SELECT 
      p.id,
      p.nombre,
      p.tipo,
      p.porcentaje_comision,
      p.porcentaje_especial,
      COUNT(pi.inversor_id)::integer as total_inv,
      COALESCE(SUM(i.total), 0) as monto_total
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial
  ),
  total_inversion AS (
    SELECT COALESCE(SUM(monto_total), 0) as total_global
    FROM partner_stats
  )
  SELECT 
    ps.id,
    ps.nombre,
    ps.tipo,
    ps.total_inv,
    ps.monto_total,
    CASE 
      WHEN ti.total_global > 0 THEN
        (ps.monto_total / ti.total_global) * p_ganancia_partners * (ps.porcentaje_comision / 100)
      ELSE 0
    END as ganancia_comision,
    CASE 
      WHEN ps.tipo = 'operador_partner' AND ti.total_global > 0 THEN
        (ps.monto_total / ti.total_global) * p_ganancia_partners * (ps.porcentaje_especial / 100)
      ELSE 0
    END as ganancia_operador
  FROM partner_stats ps
  CROSS JOIN total_inversion ti
  WHERE ps.total_inv > 0;
END;
$$;

-- Function to get investor distribution
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS TABLE (
  inversor_id uuid,
  nombre varchar,
  apellido varchar,
  email varchar,
  capital_actual numeric,
  ganancia_individual numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH total_inversion AS (
    SELECT COALESCE(SUM(total), 0) as total_global
    FROM inversores
    WHERE total > 0
  )
  SELECT 
    i.id,
    i.nombre,
    i.apellido,
    i.email,
    i.total,
    CASE 
      WHEN ti.total_global > 0 THEN
        (i.total / ti.total_global) * p_ganancia_inversores
      ELSE 0
    END as ganancia_individual
  FROM inversores i
  CROSS JOIN total_inversion ti
  WHERE i.total > 0;
END;
$$;

-- Function to process weekly earnings
CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_semana_actual integer;
  v_total_inversion numeric;
  v_ganancia_bruta numeric;
  v_ganancia_partners numeric;
  v_ganancia_inversores numeric;
  v_fecha_inicio date;
  v_fecha_fin date;
  v_ganancia_id uuid;
  rec record;
  v_result json;
BEGIN
  -- Get current week
  SELECT COALESCE(valor::integer, 1) INTO v_semana_actual
  FROM configuracion_sistema 
  WHERE clave = 'semana_actual';

  -- Calculate total investment
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversion
  FROM inversores
  WHERE total > 0;

  -- Calculate gross earnings
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := (p_porcentaje * v_total_inversion) / 100;
  ELSE
    RAISE EXCEPTION 'Either percentage or gross earnings must be provided';
  END IF;

  -- Calculate distributions
  v_ganancia_partners := v_ganancia_bruta * 0.30;
  v_ganancia_inversores := v_ganancia_bruta * 0.70;

  -- Calculate week dates
  v_fecha_inicio := CURRENT_DATE - INTERVAL '6 days';
  v_fecha_fin := CURRENT_DATE;

  -- Insert weekly earnings record
  INSERT INTO ganancias_semanales (
    semana_numero,
    fecha_inicio,
    fecha_fin,
    total_inversion,
    porcentaje_ganancia,
    ganancia_bruta,
    ganancia_partners,
    ganancia_inversores,
    procesado,
    fecha_procesado,
    procesado_por
  ) VALUES (
    v_semana_actual,
    v_fecha_inicio,
    v_fecha_fin,
    v_total_inversion,
    p_porcentaje,
    v_ganancia_bruta,
    v_ganancia_partners,
    v_ganancia_inversores,
    true,
    NOW(),
    p_admin_id
  ) RETURNING id INTO v_ganancia_id;

  -- Process partner earnings
  FOR rec IN 
    SELECT * FROM obtener_distribucion_partners(v_ganancia_partners)
  LOOP
    -- Insert partner earnings
    INSERT INTO partner_ganancias (
      partner_id,
      semana_numero,
      ganancia_total,
      ganancia_comision,
      ganancia_operador,
      total_inversores,
      monto_total_inversores,
      fecha_calculo
    ) VALUES (
      rec.partner_id,
      v_semana_actual,
      rec.ganancia_comision + rec.ganancia_operador,
      rec.ganancia_comision,
      rec.ganancia_operador,
      rec.total_inversores,
      rec.monto_total_inversores,
      NOW()
    );

    -- Create partner transaction
    INSERT INTO partner_transacciones (
      partner_id,
      monto,
      tipo,
      descripcion,
      fecha
    ) VALUES (
      rec.partner_id,
      rec.ganancia_comision + rec.ganancia_operador,
      'ganancia',
      'Ganancia semanal - Semana ' || v_semana_actual,
      NOW()
    );

    -- Create partner notification
    INSERT INTO notificaciones (
      partner_id,
      titulo,
      mensaje,
      tipo,
      leida,
      fecha_creacion
    ) VALUES (
      rec.partner_id,
      'Nueva Ganancia Semanal',
      'Se ha procesado tu ganancia de la semana ' || v_semana_actual || ': $' || ROUND(rec.ganancia_comision + rec.ganancia_operador, 2),
      'success',
      false,
      NOW()
    );
  END LOOP;

  -- Process investor earnings
  FOR rec IN 
    SELECT * FROM obtener_distribucion_inversores(v_ganancia_inversores)
  LOOP
    -- Update investor total
    UPDATE inversores 
    SET 
      total = total + rec.ganancia_individual,
      ganancia_semanal = rec.ganancia_individual
    WHERE id = rec.inversor_id;

    -- Create investor transaction
    INSERT INTO transacciones (
      inversor_id,
      monto,
      tipo,
      fecha,
      descripcion
    ) VALUES (
      rec.inversor_id,
      rec.ganancia_individual,
      'ganancia',
      NOW(),
      'Ganancia semanal - Semana ' || v_semana_actual
    );

    -- Create investor notification
    INSERT INTO notificaciones (
      inversor_id,
      titulo,
      mensaje,
      tipo,
      leida,
      fecha_creacion
    ) VALUES (
      rec.inversor_id,
      'Nueva Ganancia Semanal',
      'Se ha procesado tu ganancia de la semana ' || v_semana_actual || ': $' || ROUND(rec.ganancia_individual, 2),
      'success',
      false,
      NOW()
    );
  END LOOP;

  -- Update current week
  UPDATE configuracion_sistema 
  SET 
    valor = (v_semana_actual + 1)::text,
    updated_at = NOW(),
    updated_by = p_admin_id
  WHERE clave = 'semana_actual';

  -- Return success result
  v_result := json_build_object(
    'success', true,
    'semana_procesada', v_semana_actual,
    'ganancia_bruta', v_ganancia_bruta,
    'ganancia_partners', v_ganancia_partners,
    'ganancia_inversores', v_ganancia_inversores
  );

  RETURN v_result;
END;
$$;