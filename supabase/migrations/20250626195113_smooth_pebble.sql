/*
  # Fix RPC functions type mismatch

  1. Updates
    - Fix `obtener_distribucion_partners` function to cast varchar columns to text
    - Fix `obtener_distribucion_inversores` function to cast varchar columns to text
    - Ensure all varchar columns are explicitly cast to text to prevent type mismatch errors

  2. Changes
    - Cast `nombre` columns from varchar(100) to text
    - Cast any other varchar columns that might cause similar issues
    - Update function return types to match expected text types
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric);
DROP FUNCTION IF EXISTS obtener_distribucion_inversores(numeric);

-- Create obtener_distribucion_partners function with proper type casting
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
  WITH partner_stats AS (
    SELECT 
      p.id,
      p.nombre::text as nombre_text,
      p.tipo::text as tipo_text,
      p.porcentaje_comision,
      p.porcentaje_especial,
      p.inversion_inicial,
      COALESCE(COUNT(pi.inversor_id), 0)::integer as total_inversores,
      COALESCE(SUM(i.total), 0) as monto_total_inversores
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  ),
  total_inversores_sistema AS (
    SELECT COALESCE(SUM(total), 0) as total_sistema
    FROM inversores
  ),
  calculations AS (
    SELECT 
      ps.*,
      tis.total_sistema,
      CASE 
        WHEN ps.tipo_text = 'operador_partner' THEN
          -- Operador partner: ganancia propia completa + ganancia de sus inversores
          (ps.inversion_inicial * 0.05) + 
          (ps.monto_total_inversores * 0.05)
        ELSE
          -- Partner normal: porcentaje de su ganancia propia + comisión de sus inversores
          (ps.inversion_inicial * 0.05 * 0.70) + 
          (ps.monto_total_inversores * 0.05 * (ps.porcentaje_comision / 100))
      END as ganancia_operador_calc,
      CASE 
        WHEN ps.tipo_text = 'operador_partner' THEN 0
        ELSE (ps.monto_total_inversores * 0.05 * (ps.porcentaje_comision / 100))
      END as ganancia_comision_calc
    FROM partner_stats ps
    CROSS JOIN total_inversores_sistema tis
  )
  SELECT 
    c.id,
    c.nombre_text,
    c.tipo_text,
    c.porcentaje_comision,
    c.porcentaje_especial,
    c.inversion_inicial,
    c.total_inversores,
    c.monto_total_inversores,
    c.ganancia_comision_calc,
    c.ganancia_operador_calc,
    (c.ganancia_operador_calc + c.ganancia_comision_calc)
  FROM calculations c
  WHERE c.inversion_inicial > 0 OR c.total_inversores > 0
  ORDER BY (c.ganancia_operador_calc + c.ganancia_comision_calc) DESC;
END;
$$;

-- Create obtener_distribucion_inversores function with proper type casting
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS TABLE (
  inversor_id uuid,
  nombre text,
  apellido text,
  email text,
  inversion numeric,
  porcentaje_ganancia numeric,
  porcentaje_inversor numeric,
  ganancia_individual numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH total_inversion AS (
    SELECT COALESCE(SUM(total), 0) as total_sistema
    FROM inversores
    WHERE total > 0
  )
  SELECT 
    i.id,
    i.nombre::text as nombre_text,
    i.apellido::text as apellido_text,
    i.email::text as email_text,
    i.total,
    5.0::numeric as porcentaje_ganancia,
    70.0::numeric as porcentaje_inversor,
    (i.total * 0.05 * 0.70)::numeric as ganancia_individual
  FROM inversores i
  CROSS JOIN total_inversion ti
  WHERE i.total > 0
  ORDER BY i.total DESC;
END;
$$;

-- Also create the main processing function if it doesn't exist
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
  v_ganancia_partners numeric;
  v_ganancia_inversores numeric;
  v_porcentaje_inversores numeric;
  v_fecha_inicio date;
  v_fecha_fin date;
  partner_record record;
  inversor_record record;
BEGIN
  -- Obtener configuración
  SELECT COALESCE(valor::integer, 1) INTO v_semana_actual
  FROM configuracion_sistema 
  WHERE clave = 'semana_actual';
  
  SELECT COALESCE(valor::numeric, 70) INTO v_porcentaje_inversores
  FROM configuracion_sistema 
  WHERE clave = 'porcentaje_inversores';

  -- Calcular total de inversión
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversion
  FROM inversores;

  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := (p_porcentaje * v_total_inversion) / 100;
  ELSE
    RAISE EXCEPTION 'Debe proporcionar porcentaje o ganancia bruta';
  END IF;

  -- Calcular distribución
  v_ganancia_partners := v_ganancia_bruta * ((100 - v_porcentaje_inversores) / 100);
  v_ganancia_inversores := v_ganancia_bruta * (v_porcentaje_inversores / 100);

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
    COALESCE(p_porcentaje, (v_ganancia_bruta * 100 / v_total_inversion)),
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
      'Ganancia semanal ' || v_semana_actual || ' - ' || 
      CASE 
        WHEN partner_record.tipo = 'operador_partner' THEN 'Operador + Partner'
        ELSE 'Partner'
      END
    );

    -- Crear notificación para el partner
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      partner_record.partner_id, 'partner',
      'Ganancia Semanal Procesada',
      'Se ha procesado tu ganancia de la semana ' || v_semana_actual || 
      '. Monto: $' || partner_record.ganancia_total::text,
      'success'
    );
  END LOOP;

  -- Procesar ganancias de inversores
  FOR inversor_record IN 
    SELECT * FROM obtener_distribucion_inversores(v_ganancia_inversores)
  LOOP
    -- Actualizar total del inversor
    UPDATE inversores 
    SET 
      ganancia_semanal = inversor_record.ganancia_individual,
      total = total + inversor_record.ganancia_individual
    WHERE id = inversor_record.inversor_id;

    -- Crear transacción para el inversor
    INSERT INTO transacciones (
      inversor_id, monto, tipo, descripcion
    ) VALUES (
      inversor_record.inversor_id, inversor_record.ganancia_individual, 'ganancia',
      'Ganancia semanal ' || v_semana_actual
    );

    -- Crear notificación para el inversor
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      inversor_record.inversor_id, 'inversor',
      'Ganancia Semanal Procesada',
      'Se ha procesado tu ganancia de la semana ' || v_semana_actual || 
      '. Monto: $' || inversor_record.ganancia_individual::text,
      'success'
    );
  END LOOP;

  -- Incrementar semana actual
  UPDATE configuracion_sistema 
  SET 
    valor = (v_semana_actual + 1)::text,
    updated_at = NOW(),
    updated_by = p_admin_id
  WHERE clave = 'semana_actual';

  -- Si no existe la configuración de semana actual, crearla
  IF NOT FOUND THEN
    INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
    VALUES ('semana_actual', (v_semana_actual + 1)::text, 'Número de semana actual del sistema', p_admin_id);
  END IF;

END;
$$;