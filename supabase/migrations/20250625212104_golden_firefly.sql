/*
  # Crear Funciones del Sistema

  1. Funciones para cálculos de inversión
  2. Funciones para gráficos
  3. Funciones para procesamiento de ganancias
  4. Funciones para notificaciones
*/

-- Función para calcular total de inversión
CREATE OR REPLACE FUNCTION calcular_total_inversion()
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(total) 
    FROM inversores 
    WHERE total > 0
  ), 0);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos del gráfico semanal
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS TABLE(week text, ganancia numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Sem ' || gs.semana_numero::text as week,
    COALESCE(gs.ganancia_bruta, 0) as ganancia
  FROM ganancias_semanales gs
  ORDER BY gs.semana_numero
  LIMIT 8;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener distribución de partners (CORREGIDA)
CREATE OR REPLACE FUNCTION obtener_distribucion_partners(p_ganancia_partners numeric)
RETURNS TABLE(
  partner_id uuid,
  nombre varchar,
  tipo varchar,
  total_inversores bigint,
  monto_total_inversores numeric,
  ganancia_comision numeric,
  ganancia_operador numeric
) AS $$
DECLARE
  total_inversion_global numeric;
BEGIN
  -- Calcular total de inversión global una sola vez
  SELECT calcular_total_inversion() INTO total_inversion_global;
  
  -- Si no hay inversión global, retornar vacío
  IF total_inversion_global = 0 THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.nombre,
    p.tipo,
    COUNT(pi.inversor_id) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total_inversores,
    CASE 
      WHEN COUNT(pi.inversor_id) > 0 THEN 
        (COALESCE(SUM(i.total), 0) / total_inversion_global) * p_ganancia_partners * (p.porcentaje_comision / 100)
      ELSE 0 
    END as ganancia_comision,
    CASE 
      WHEN p.tipo = 'operador_partner' AND COUNT(pi.inversor_id) > 0 THEN 
        (COALESCE(SUM(i.total), 0) / total_inversion_global) * p_ganancia_partners * (p.porcentaje_especial / 100)
      ELSE 0 
    END as ganancia_operador
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener distribución de inversores
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS TABLE(
  inversor_id uuid,
  nombre varchar,
  apellido varchar,
  total numeric,
  ganancia_individual numeric
) AS $$
DECLARE
  total_inversion numeric;
BEGIN
  total_inversion := calcular_total_inversion();
  
  IF total_inversion = 0 THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.nombre,
    i.apellido,
    i.total,
    (i.total / total_inversion) * p_ganancia_inversores as ganancia_individual
  FROM inversores i
  WHERE i.total > 0;
END;
$$ LANGUAGE plpgsql;

-- Función para enviar notificación a todos los usuarios
CREATE OR REPLACE FUNCTION enviar_notificacion_global(
  p_titulo text,
  p_mensaje text,
  p_tipo text DEFAULT 'info'
)
RETURNS void AS $$
BEGIN
  -- Enviar a todos los inversores
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT id, 'inversor', p_titulo, p_mensaje, p_tipo
  FROM inversores;
  
  -- Enviar a todos los partners activos
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT id, 'partner', p_titulo, p_mensaje, p_tipo
  FROM partners
  WHERE activo = true;
END;
$$ LANGUAGE plpgsql;

-- Función para enviar aviso a todos los inversores
CREATE OR REPLACE FUNCTION enviar_aviso_a_todos_inversores(
  p_titulo text,
  p_mensaje text,
  p_tipo text DEFAULT 'info',
  p_admin_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Crear el aviso
  INSERT INTO avisos (titulo, mensaje, tipo, creado_por)
  VALUES (p_titulo, p_mensaje, p_tipo, p_admin_id);
  
  -- Enviar notificación a todos los inversores
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT id, 'inversor', p_titulo, p_mensaje, p_tipo
  FROM inversores;
  
  -- Enviar notificación a todos los partners activos
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT id, 'partner', p_titulo, p_mensaje, p_tipo
  FROM partners
  WHERE activo = true;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener inversores disponibles
CREATE OR REPLACE FUNCTION obtener_inversores_disponibles()
RETURNS TABLE(
  id uuid,
  nombre varchar,
  apellido varchar,
  email varchar,
  total numeric,
  partner_assigned boolean,
  partner_nombre varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nombre,
    i.apellido,
    i.email,
    i.total,
    CASE WHEN pi.partner_id IS NOT NULL THEN true ELSE false END as partner_assigned,
    p.nombre as partner_nombre
  FROM inversores i
  LEFT JOIN partner_inversores pi ON i.id = pi.inversor_id
  LEFT JOIN partners p ON pi.partner_id = p.id
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de partners
CREATE OR REPLACE FUNCTION obtener_resumen_partners()
RETURNS TABLE(
  partner_id uuid,
  partner_nombre varchar,
  partner_tipo varchar,
  total_inversores bigint,
  monto_total numeric,
  inversores json
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nombre,
    p.tipo,
    COUNT(pi.inversor_id) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total,
    COALESCE(
      json_agg(
        json_build_object(
          'id', i.id,
          'nombre', i.nombre,
          'apellido', i.apellido,
          'email', i.email,
          'total', i.total
        )
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::json
    ) as inversores
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo
  HAVING COUNT(pi.inversor_id) > 0
  ORDER BY p.nombre;
END;
$$ LANGUAGE plpgsql;

-- Función para procesar ganancias semanales
CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_semana_actual integer;
  v_total_inversion numeric;
  v_ganancia_bruta numeric;
  v_ganancia_partners numeric;
  v_ganancia_inversores numeric;
  v_partner record;
  v_inversor record;
BEGIN
  -- Obtener semana actual
  SELECT COALESCE(valor::integer, 1) INTO v_semana_actual
  FROM configuracion_sistema 
  WHERE clave = 'semana_actual';
  
  -- Calcular total de inversión
  v_total_inversion := calcular_total_inversion();
  
  IF v_total_inversion = 0 THEN
    RAISE EXCEPTION 'No hay inversión total para procesar';
  END IF;
  
  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := (p_porcentaje * v_total_inversion) / 100;
  ELSE
    RAISE EXCEPTION 'Debe proporcionar porcentaje o ganancia bruta';
  END IF;
  
  -- Calcular distribución
  v_ganancia_partners := v_ganancia_bruta * 0.30;
  v_ganancia_inversores := v_ganancia_bruta * 0.70;
  
  -- Registrar ganancia semanal
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion,
    porcentaje_ganancia, ganancia_bruta, ganancia_partners,
    ganancia_inversores, procesado, fecha_procesado, procesado_por
  ) VALUES (
    v_semana_actual,
    CURRENT_DATE - INTERVAL '6 days',
    CURRENT_DATE,
    v_total_inversion,
    COALESCE(p_porcentaje, (v_ganancia_bruta / v_total_inversion) * 100),
    v_ganancia_bruta,
    v_ganancia_partners,
    v_ganancia_inversores,
    true,
    NOW(),
    p_admin_id
  );
  
  -- Procesar ganancias de partners
  FOR v_partner IN 
    SELECT * FROM obtener_distribucion_partners(v_ganancia_partners)
  LOOP
    INSERT INTO partner_ganancias (
      partner_id, semana_numero, ganancia_total, ganancia_comision,
      ganancia_operador, total_inversores, monto_total_inversores
    ) VALUES (
      v_partner.partner_id,
      v_semana_actual,
      v_partner.ganancia_comision + v_partner.ganancia_operador,
      v_partner.ganancia_comision,
      v_partner.ganancia_operador,
      v_partner.total_inversores,
      v_partner.monto_total_inversores
    )
    ON CONFLICT (partner_id, semana_numero) 
    DO UPDATE SET
      ganancia_total = EXCLUDED.ganancia_total,
      ganancia_comision = EXCLUDED.ganancia_comision,
      ganancia_operador = EXCLUDED.ganancia_operador,
      total_inversores = EXCLUDED.total_inversores,
      monto_total_inversores = EXCLUDED.monto_total_inversores,
      fecha_calculo = NOW();
    
    -- Crear transacción para el partner
    IF v_partner.ganancia_comision + v_partner.ganancia_operador > 0 THEN
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      VALUES (
        v_partner.partner_id,
        v_partner.ganancia_comision + v_partner.ganancia_operador,
        'ganancia',
        'Ganancia semana ' || v_semana_actual
      );
    END IF;
  END LOOP;
  
  -- Procesar ganancias de inversores
  FOR v_inversor IN 
    SELECT * FROM obtener_distribucion_inversores(v_ganancia_inversores)
  LOOP
    -- Actualizar ganancia semanal y total del inversor
    UPDATE inversores 
    SET 
      ganancia_semanal = v_inversor.ganancia_individual,
      total = total + v_inversor.ganancia_individual
    WHERE id = v_inversor.inversor_id;
    
    -- Crear transacción para el inversor
    INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
    VALUES (
      v_inversor.inversor_id,
      v_inversor.ganancia_individual,
      'ganancia',
      'Ganancia semana ' || v_semana_actual
    );
  END LOOP;
  
  -- Enviar notificación global
  PERFORM enviar_notificacion_global(
    'Ganancias Procesadas - Semana ' || v_semana_actual,
    'Se han procesado las ganancias de la semana ' || v_semana_actual || '. Revisa tu dashboard para ver los detalles.',
    'success'
  );
  
  -- Incrementar semana actual
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
  VALUES (
    'semana_actual',
    (v_semana_actual + 1)::text,
    'Número de semana actual del sistema',
    p_admin_id
  )
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = (v_semana_actual + 1)::text,
    updated_at = NOW(),
    updated_by = p_admin_id;
END;
$$ LANGUAGE plpgsql;

-- Función para configurar semana
CREATE OR REPLACE FUNCTION configurar_semana(
  p_semana_numero integer,
  p_fecha_inicio date,
  p_admin_id uuid
)
RETURNS void AS $$
BEGIN
  -- Actualizar semana actual
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
  VALUES (
    'semana_actual',
    p_semana_numero::text,
    'Número de semana actual del sistema',
    p_admin_id
  )
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = p_semana_numero::text,
    updated_at = NOW(),
    updated_by = p_admin_id;
    
  -- Actualizar fecha de inicio
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
  VALUES (
    'fecha_inicio_semana',
    p_fecha_inicio::text,
    'Fecha de inicio de la semana actual',
    p_admin_id
  )
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = p_fecha_inicio::text,
    updated_at = NOW(),
    updated_by = p_admin_id;
END;
$$ LANGUAGE plpgsql;