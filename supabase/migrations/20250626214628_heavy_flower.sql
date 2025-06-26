/*
  # Corrección del Sistema de Cálculo de Ganancias
  
  1. Actualización de funciones para el cálculo correcto de ganancias
  2. Implementación de la lógica específica:
     - Operador+Partner: 100% de ganancia propia + comisiones de inversores
     - Partner normal: 70% de ganancia propia + 1/3 del 30% de sus inversores
     - El resto del 30% va al operador como regalías
  3. Distribución correcta entre inversores según proporción de inversión
*/

-- Función para calcular distribución de partners con la lógica correcta
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
DECLARE
  porcentaje_ganancia numeric := 5.0; -- 5% fijo
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
        -- Operador+Partner: 100% de ganancia propia + 100% del 30% de sus inversores
        (p.inversion_inicial * porcentaje_ganancia / 100) + 
        (COALESCE(SUM(i.total), 0) * porcentaje_ganancia / 100 * 0.30)
      ELSE 
        -- Partner normal: 70% de ganancia propia + 1/3 del 30% de sus inversores
        (p.inversion_inicial * porcentaje_ganancia / 100 * 0.70) + 
        (COALESCE(SUM(i.total), 0) * porcentaje_ganancia / 100 * 0.30 / 3)
    END as ganancia_comision,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- El operador no recibe ganancia adicional de operador de sí mismo
        0
      ELSE 
        -- Los 2/3 restantes del 30% van al operador como regalías
        (COALESCE(SUM(i.total), 0) * porcentaje_ganancia / 100 * 0.30 * 2 / 3)
    END as ganancia_operador,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Total para operador+partner
        (p.inversion_inicial * porcentaje_ganancia / 100) + 
        (COALESCE(SUM(i.total), 0) * porcentaje_ganancia / 100 * 0.30)
      ELSE 
        -- Total para partner normal (solo su parte, las regalías van al operador)
        (p.inversion_inicial * porcentaje_ganancia / 100 * 0.70) + 
        (COALESCE(SUM(i.total), 0) * porcentaje_ganancia / 100 * 0.30 / 3)
    END as ganancia_total
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  ORDER BY p.nombre::text;
END;
$$;

-- Función para calcular distribución de inversores con proporción correcta
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS TABLE (
  inversor_id uuid,
  nombre text,
  apellido text,
  inversion numeric,
  proporcion_inversion numeric,
  ganancia_individual numeric,
  porcentaje_ganancia numeric,
  porcentaje_inversor numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  total_inversion numeric;
  porcentaje_ganancia numeric := 5.0; -- 5% fijo
  porcentaje_inversor numeric := 70.0; -- 70% para inversores
BEGIN
  -- Calcular total de inversión
  SELECT COALESCE(SUM(total), 0) INTO total_inversion FROM inversores;
  
  RETURN QUERY
  SELECT 
    i.id as inversor_id,
    i.nombre::text,
    i.apellido::text,
    i.total as inversion,
    CASE 
      WHEN total_inversion > 0 THEN (i.total / total_inversion)
      ELSE 0
    END as proporcion_inversion,
    CASE 
      WHEN total_inversion > 0 THEN 
        -- Ganancia individual = (inversión individual / total inversión) * ganancia total para inversores
        (i.total / total_inversion) * (total_inversion * porcentaje_ganancia / 100 * porcentaje_inversor / 100)
      ELSE 0
    END as ganancia_individual,
    porcentaje_ganancia,
    porcentaje_inversor
  FROM inversores i
  WHERE i.total > 0
  ORDER BY i.nombre::text, i.apellido::text;
END;
$$;

-- Función principal para procesar ganancias semanales con la lógica correcta
CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message text,
  semana_procesada integer,
  ganancia_bruta numeric,
  ganancia_inversores numeric,
  ganancia_partners numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_semana_actual integer;
  v_total_inversion numeric;
  v_ganancia_bruta numeric;
  v_ganancia_inversores numeric;
  v_ganancia_partners numeric;
  v_porcentaje_ganancia numeric := 5.0; -- 5% fijo
  v_porcentaje_inversores numeric := 70.0; -- 70% para inversores
  v_fecha_inicio date;
  v_fecha_fin date;
  partner_record record;
  inversor_record record;
  v_operador_id uuid;
  v_regalias_operador numeric := 0;
BEGIN
  -- Obtener semana actual
  SELECT valor::integer INTO v_semana_actual 
  FROM configuracion_sistema 
  WHERE clave = 'semana_actual';
  
  IF v_semana_actual IS NULL THEN
    v_semana_actual := 1;
  END IF;

  -- Verificar si ya fue procesada
  IF EXISTS (SELECT 1 FROM ganancias_semanales WHERE semana_numero = v_semana_actual AND procesado = true) THEN
    RETURN QUERY SELECT false, 'La semana ' || v_semana_actual || ' ya fue procesada'::text, v_semana_actual, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Calcular total de inversión (inversores + partners)
  SELECT COALESCE(SUM(total), 0) + COALESCE((SELECT SUM(inversion_inicial) FROM partners WHERE activo = true), 0)
  INTO v_total_inversion FROM inversores;

  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := v_total_inversion * p_porcentaje / 100;
  ELSE
    v_ganancia_bruta := v_total_inversion * v_porcentaje_ganancia / 100;
  END IF;

  -- Calcular distribución
  v_ganancia_inversores := v_ganancia_bruta * v_porcentaje_inversores / 100;
  v_ganancia_partners := v_ganancia_bruta * (100 - v_porcentaje_inversores) / 100;

  -- Fechas de la semana
  v_fecha_inicio := CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::integer - 1);
  v_fecha_fin := v_fecha_inicio + 6;

  -- Buscar operador (operador_partner)
  SELECT id INTO v_operador_id 
  FROM partners 
  WHERE tipo = 'operador_partner' AND activo = true 
  LIMIT 1;

  -- Registrar ganancia semanal
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion, 
    porcentaje_ganancia, ganancia_bruta, ganancia_partners, 
    ganancia_inversores, procesado, fecha_procesado, procesado_por
  ) VALUES (
    v_semana_actual, v_fecha_inicio, v_fecha_fin, v_total_inversion,
    v_porcentaje_ganancia, v_ganancia_bruta, v_ganancia_partners,
    v_ganancia_inversores, true, NOW(), p_admin_id
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
      'Ganancia semanal ' || v_semana_actual
    );

    -- Actualizar saldo del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + partner_record.ganancia_total
    WHERE id = partner_record.partner_id;

    -- Acumular regalías para el operador (solo de partners normales)
    IF partner_record.tipo != 'operador_partner' THEN
      v_regalias_operador := v_regalias_operador + partner_record.ganancia_operador;
    END IF;

    -- Enviar notificación al partner
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      partner_record.partner_id, 'partner',
      'Ganancia Semanal Procesada',
      'Se ha procesado tu ganancia de la semana ' || v_semana_actual || ': ' || partner_record.ganancia_total::text,
      'success'
    );
  END LOOP;

  -- Procesar regalías del operador
  IF v_operador_id IS NOT NULL AND v_regalias_operador > 0 THEN
    INSERT INTO partner_transacciones (
      partner_id, monto, tipo, descripcion
    ) VALUES (
      v_operador_id, v_regalias_operador, 'regalias',
      'Regalías de partners semana ' || v_semana_actual
    );

    UPDATE partners 
    SET inversion_inicial = inversion_inicial + v_regalias_operador
    WHERE id = v_operador_id;

    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      v_operador_id, 'partner',
      'Regalías de Partners Recibidas',
      'Has recibido regalías por $' || v_regalias_operador::text || ' de partners en la semana ' || v_semana_actual,
      'success'
    );
  END IF;

  -- Procesar ganancias de inversores
  FOR inversor_record IN 
    SELECT * FROM obtener_distribucion_inversores(v_ganancia_inversores)
  LOOP
    -- Crear transacción para el inversor
    INSERT INTO transacciones (
      inversor_id, monto, tipo, descripcion
    ) VALUES (
      inversor_record.inversor_id, inversor_record.ganancia_individual, 'ganancia',
      'Ganancia semanal ' || v_semana_actual
    );

    -- Actualizar saldos del inversor
    UPDATE inversores 
    SET 
      ganancia_semanal = inversor_record.ganancia_individual,
      total = total + inversor_record.ganancia_individual
    WHERE id = inversor_record.inversor_id;

    -- Enviar notificación al inversor
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      inversor_record.inversor_id, 'inversor',
      'Ganancia Semanal Procesada',
      'Se ha procesado tu ganancia de la semana ' || v_semana_actual || ': $' || inversor_record.ganancia_individual::text,
      'success'
    );
  END LOOP;

  -- Incrementar semana
  UPDATE configuracion_sistema 
  SET valor = (v_semana_actual + 1)::text, updated_at = NOW(), updated_by = p_admin_id
  WHERE clave = 'semana_actual';

  RETURN QUERY SELECT true, 'Ganancias procesadas exitosamente'::text, v_semana_actual, v_ganancia_bruta, v_ganancia_inversores, v_ganancia_partners;
END;
$$;