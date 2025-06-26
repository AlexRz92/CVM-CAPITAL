/*
  # Funciones para procesamiento de ganancias
  
  1. Funciones de distribución
    - obtener_distribucion_partners: Calcular ganancias de partners
    - obtener_distribucion_inversores: Calcular ganancias de inversores
    
  2. Función principal
    - procesar_ganancias_semanales: Procesar ganancias completas
    
  3. Lógica de cálculo
    - Partners normales: 70% de su ganancia + % comisión del 30% de sus inversores
    - Partners+Operadores: 100% de su ganancia + 100% del 30% de sus inversores
    - Inversores: 70% del 5% de su inversión
*/

-- =============================================
-- FUNCIÓN PARA DISTRIBUCIÓN DE PARTNERS
-- =============================================

CREATE OR REPLACE FUNCTION obtener_distribucion_partners(p_ganancia_partners numeric)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_result json;
  v_porcentaje_inversores numeric := 70;
  v_total_inversion_partners numeric := 0;
BEGIN
  -- Obtener porcentaje de inversores desde configuración
  SELECT COALESCE(valor::numeric, 70) INTO v_porcentaje_inversores
  FROM configuracion_sistema WHERE clave = 'porcentaje_inversores';

  -- Calcular total de inversión de partners activos
  SELECT COALESCE(SUM(inversion_inicial), 0) INTO v_total_inversion_partners
  FROM partners WHERE activo = true;

  -- Si no hay partners, retornar array vacío
  IF v_total_inversion_partners = 0 THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(
    json_build_object(
      'partner_id', p.id,
      'nombre', p.nombre,
      'tipo', p.tipo,
      'porcentaje_comision', p.porcentaje_comision,
      'porcentaje_especial', p.porcentaje_especial,
      'inversion_inicial', p.inversion_inicial,
      'total_inversores', COALESCE(pi_stats.total_inversores, 0),
      'monto_total_inversores', COALESCE(pi_stats.monto_total, 0),
      'ganancia_operador', 
        -- Ganancia de su propia inversión
        CASE 
          WHEN p.tipo = 'operador_partner' THEN
            -- Operador+Partner: 100% de su ganancia
            (p.inversion_inicial * p_ganancia_partners / v_total_inversion_partners)
          ELSE
            -- Partner normal: 70% de su ganancia
            (p.inversion_inicial * p_ganancia_partners / v_total_inversion_partners) * (v_porcentaje_inversores / 100.0)
        END,
      'ganancia_comision',
        -- Ganancia por comisión de sus inversores
        CASE 
          WHEN p.tipo = 'operador_partner' THEN
            -- Operador+Partner: 100% del 30% de sus inversores
            COALESCE(pi_stats.monto_total, 0) * (p_ganancia_partners / v_total_inversion_partners) * ((100 - v_porcentaje_inversores) / 100.0)
          ELSE
            -- Partner normal: su % de comisión del 30% de sus inversores
            COALESCE(pi_stats.monto_total, 0) * (p_ganancia_partners / v_total_inversion_partners) * ((100 - v_porcentaje_inversores) / 100.0) * (p.porcentaje_comision / 100.0)
        END,
      'ganancia_total',
        -- Ganancia total = ganancia propia + ganancia por comisión
        CASE 
          WHEN p.tipo = 'operador_partner' THEN
            -- Operador+Partner
            (p.inversion_inicial * p_ganancia_partners / v_total_inversion_partners) +
            COALESCE(pi_stats.monto_total, 0) * (p_ganancia_partners / v_total_inversion_partners) * ((100 - v_porcentaje_inversores) / 100.0)
          ELSE
            -- Partner normal
            (p.inversion_inicial * p_ganancia_partners / v_total_inversion_partners) * (v_porcentaje_inversores / 100.0) +
            COALESCE(pi_stats.monto_total, 0) * (p_ganancia_partners / v_total_inversion_partners) * ((100 - v_porcentaje_inversores) / 100.0) * (p.porcentaje_comision / 100.0)
        END
    )
  ) INTO v_result
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
  WHERE p.activo = true;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- =============================================
-- FUNCIÓN PARA DISTRIBUCIÓN DE INVERSORES
-- =============================================

CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_result json;
  v_porcentaje_inversores numeric := 70;
  v_total_inversion_inversores numeric := 0;
BEGIN
  -- Obtener porcentaje de inversores desde configuración
  SELECT COALESCE(valor::numeric, 70) INTO v_porcentaje_inversores
  FROM configuracion_sistema WHERE clave = 'porcentaje_inversores';

  -- Calcular total de inversión de inversores
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversion_inversores
  FROM inversores WHERE total > 0;

  -- Si no hay inversores, retornar array vacío
  IF v_total_inversion_inversores = 0 THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(
    json_build_object(
      'inversor_id', i.id,
      'nombre', i.nombre,
      'apellido', i.apellido,
      'email', i.email,
      'inversion', i.total,
      'porcentaje_ganancia', 5.0,
      'porcentaje_inversor', v_porcentaje_inversores,
      'ganancia_individual', (i.total * p_ganancia_inversores / v_total_inversion_inversores)
    )
  ) INTO v_result
  FROM inversores i
  WHERE i.total > 0
  ORDER BY i.nombre, i.apellido;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- =============================================
-- FUNCIÓN PRINCIPAL PARA PROCESAR GANANCIAS
-- =============================================

CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_semana_actual integer;
  v_total_inversion numeric;
  v_ganancia_bruta numeric;
  v_porcentaje_ganancia numeric;
  v_porcentaje_inversores numeric;
  v_ganancia_partners numeric;
  v_ganancia_inversores numeric;
  v_fecha_inicio date;
  v_fecha_fin date;
  v_partner_data json;
  v_inversor_data json;
  v_partner record;
  v_inversor record;
BEGIN
  -- Obtener semana actual
  SELECT COALESCE(valor::integer, 1) INTO v_semana_actual
  FROM configuracion_sistema WHERE clave = 'semana_actual';

  -- Obtener porcentaje de inversores
  SELECT COALESCE(valor::numeric, 70) INTO v_porcentaje_inversores
  FROM configuracion_sistema WHERE clave = 'porcentaje_inversores';

  -- Calcular total de inversión
  v_total_inversion := calcular_total_inversion_sistema();

  -- Determinar ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
    v_porcentaje_ganancia := (p_ganancia_bruta * 100.0) / GREATEST(v_total_inversion, 1);
  ELSIF p_porcentaje IS NOT NULL THEN
    v_porcentaje_ganancia := p_porcentaje;
    v_ganancia_bruta := (v_total_inversion * p_porcentaje) / 100.0;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Debe proporcionar porcentaje o ganancia bruta');
  END IF;

  -- Calcular distribución
  v_ganancia_inversores := v_ganancia_bruta * (v_porcentaje_inversores / 100.0);
  v_ganancia_partners := v_ganancia_bruta * ((100 - v_porcentaje_inversores) / 100.0);

  -- Calcular fechas de la semana
  v_fecha_inicio := CURRENT_DATE;
  v_fecha_fin := v_fecha_inicio + INTERVAL '6 days';

  -- Guardar configuración de porcentaje de ganancia
  UPDATE configuracion_sistema 
  SET valor = v_porcentaje_ganancia::text, updated_by = p_admin_id, updated_at = now()
  WHERE clave = 'porcentaje_ganancia_general';

  -- Insertar o actualizar registro de ganancias semanales
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion,
    porcentaje_ganancia, ganancia_bruta, ganancia_partners, 
    ganancia_inversores, procesado, fecha_procesado, procesado_por
  ) VALUES (
    v_semana_actual, v_fecha_inicio, v_fecha_fin, v_total_inversion,
    v_porcentaje_ganancia, v_ganancia_bruta, v_ganancia_partners, 
    v_ganancia_inversores, true, now(), p_admin_id
  ) ON CONFLICT (semana_numero) DO UPDATE SET
    total_inversion = v_total_inversion,
    porcentaje_ganancia = v_porcentaje_ganancia,
    ganancia_bruta = v_ganancia_bruta,
    ganancia_partners = v_ganancia_partners,
    ganancia_inversores = v_ganancia_inversores,
    procesado = true,
    fecha_procesado = now(),
    procesado_por = p_admin_id;

  -- Obtener distribución de partners
  v_partner_data := obtener_distribucion_partners(v_ganancia_partners);

  -- Procesar ganancias de partners
  FOR v_partner IN SELECT * FROM json_populate_recordset(null::record, v_partner_data)
  LOOP
    -- Insertar ganancia del partner
    INSERT INTO partner_ganancias (
      partner_id, semana_numero, ganancia_total, ganancia_comision,
      ganancia_operador, total_inversores, monto_total_inversores
    ) VALUES (
      (v_partner.value->>'partner_id')::uuid, 
      v_semana_actual, 
      (v_partner.value->>'ganancia_total')::numeric,
      (v_partner.value->>'ganancia_comision')::numeric, 
      (v_partner.value->>'ganancia_operador')::numeric,
      (v_partner.value->>'total_inversores')::integer, 
      (v_partner.value->>'monto_total_inversores')::numeric
    ) ON CONFLICT (partner_id, semana_numero) DO UPDATE SET
      ganancia_total = (v_partner.value->>'ganancia_total')::numeric,
      ganancia_comision = (v_partner.value->>'ganancia_comision')::numeric,
      ganancia_operador = (v_partner.value->>'ganancia_operador')::numeric,
      total_inversores = (v_partner.value->>'total_inversores')::integer,
      monto_total_inversores = (v_partner.value->>'monto_total_inversores')::numeric;

    -- Crear transacción para el partner
    INSERT INTO partner_transacciones (
      partner_id, monto, tipo, descripcion
    ) VALUES (
      (v_partner.value->>'partner_id')::uuid, 
      (v_partner.value->>'ganancia_total')::numeric, 
      'ganancia',
      'Ganancia semana ' || v_semana_actual
    );

    -- Actualizar inversión inicial del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + (v_partner.value->>'ganancia_total')::numeric
    WHERE id = (v_partner.value->>'partner_id')::uuid;

    -- Enviar notificación al partner
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      (v_partner.value->>'partner_id')::uuid, 
      'partner',
      'Ganancias Procesadas - Semana ' || v_semana_actual,
      'Se han procesado tus ganancias: $' || (v_partner.value->>'ganancia_total')::numeric || ' USD. Ganancia propia: $' || (v_partner.value->>'ganancia_operador')::numeric || ' USD, Comisión: $' || (v_partner.value->>'ganancia_comision')::numeric || ' USD.',
      'success'
    );
  END LOOP;

  -- Obtener distribución de inversores
  v_inversor_data := obtener_distribucion_inversores(v_ganancia_inversores);

  -- Procesar ganancias de inversores
  FOR v_inversor IN SELECT * FROM json_populate_recordset(null::record, v_inversor_data)
  LOOP
    -- Crear transacción para el inversor
    INSERT INTO transacciones (
      inversor_id, monto, tipo, descripcion
    ) VALUES (
      (v_inversor.value->>'inversor_id')::uuid, 
      (v_inversor.value->>'ganancia_individual')::numeric, 
      'ganancia',
      'Ganancia semana ' || v_semana_actual
    );

    -- Actualizar totales del inversor
    UPDATE inversores 
    SET 
      ganancia_semanal = (v_inversor.value->>'ganancia_individual')::numeric,
      total = total + (v_inversor.value->>'ganancia_individual')::numeric
    WHERE id = (v_inversor.value->>'inversor_id')::uuid;

    -- Enviar notificación al inversor
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      (v_inversor.value->>'inversor_id')::uuid, 
      'inversor',
      'Ganancias Procesadas - Semana ' || v_semana_actual,
      'Se han procesado tus ganancias: $' || (v_inversor.value->>'ganancia_individual')::numeric || ' USD (5% de tu inversión).',
      'success'
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'message', 'Ganancias procesadas exitosamente',
    'semana_numero', v_semana_actual,
    'ganancia_bruta', v_ganancia_bruta,
    'ganancia_partners', v_ganancia_partners,
    'ganancia_inversores', v_ganancia_inversores,
    'total_inversion', v_total_inversion,
    'porcentaje_ganancia', v_porcentaje_ganancia
  );
END;
$$;