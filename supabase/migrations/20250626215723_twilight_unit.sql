/*
  # Corrección del cálculo de ganancias propias de partners

  1. Problema identificado
    - Los partners normales no estaban recibiendo su parte del 30% de sus propias ganancias
    - Solo recibían el 70%, pero también deben recibir 1/3 del 30% restante
    - El operador debe recibir 2/3 del 30% de las ganancias de todos los partners

  2. Corrección implementada
    - Partner normal: 70% + (30% ÷ 3) = 70% + 10% = 80% de sus propias ganancias
    - Operador recibe: (30% × 2/3) = 20% de las ganancias de cada partner normal
    - Operador+Partner: 100% de sus propias ganancias (sin cambios)

  3. Ejemplo con Alexis ($1,000):
    - Ganancia total: $1,000 × 5% = $50
    - Alexis recibe: $50 × 80% = $40
    - Andrés recibe: $50 × 20% = $10
*/

-- Función corregida para obtener distribución de partners
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
        -- Operador+Partner: 100% ganancia propia + 100% del 30% de inversores
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30)
      ELSE 
        -- Partner normal: 80% ganancia propia (70% + 10%) + 1/3 del 30% de inversores
        (p.inversion_inicial * 0.05 * 0.80) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3)
    END as ganancia_comision,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        0 -- El operador no recibe ganancia adicional aquí
      ELSE 
        0 -- Partners normales no tienen ganancia de operador
    END as ganancia_operador,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Total para operador+partner
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30)
      ELSE 
        -- Total para partner normal: 80% propio + 1/3 del 30% de inversores
        (p.inversion_inicial * 0.05 * 0.80) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3)
    END as ganancia_total
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  ORDER BY p.nombre::text;
END;
$$;

-- Función principal corregida para procesar ganancias semanales
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
  v_ganancia_inversores numeric;
  v_ganancia_partners numeric;
  v_operador_id uuid;
  v_regalias_operador numeric := 0;
  rec_partner RECORD;
  rec_inversor RECORD;
BEGIN
  -- Obtener semana actual
  SELECT valor::integer INTO v_semana_actual 
  FROM configuracion_sistema 
  WHERE clave = 'semana_actual';
  
  -- Calcular total de inversión (inversores + partners)
  SELECT 
    COALESCE(SUM(i.total), 0) + COALESCE(SUM(p.inversion_inicial), 0)
  INTO v_total_inversion
  FROM inversores i
  FULL OUTER JOIN partners p ON p.activo = true;
  
  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSE
    v_ganancia_bruta := v_total_inversion * (p_porcentaje / 100);
  END IF;
  
  -- Distribución: 70% inversores, 30% partners
  v_ganancia_inversores := v_ganancia_bruta * 0.70;
  v_ganancia_partners := v_ganancia_bruta * 0.30;
  
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
    v_semana_actual,
    CURRENT_DATE,
    CURRENT_DATE + interval '6 days',
    v_total_inversion,
    COALESCE(p_porcentaje, 5),
    v_ganancia_bruta,
    v_ganancia_partners,
    v_ganancia_inversores,
    true,
    now(),
    p_admin_id
  ) ON CONFLICT (semana_numero) DO UPDATE SET
    total_inversion = EXCLUDED.total_inversion,
    porcentaje_ganancia = EXCLUDED.porcentaje_ganancia,
    ganancia_bruta = EXCLUDED.ganancia_bruta,
    ganancia_partners = EXCLUDED.ganancia_partners,
    ganancia_inversores = EXCLUDED.ganancia_inversores,
    procesado = true,
    fecha_procesado = now(),
    procesado_por = p_admin_id;
  
  -- PROCESAR PARTNERS
  FOR rec_partner IN 
    SELECT p.*, 
           COALESCE(COUNT(pi.inversor_id), 0) as total_inversores,
           COALESCE(SUM(i.total), 0) as monto_inversores
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id
  LOOP
    DECLARE
      v_ganancia_propia numeric;
      v_ganancia_comision numeric;
      v_ganancia_operador numeric := 0;
      v_ganancia_total numeric;
      v_regalias_para_operador numeric := 0;
    BEGIN
      IF rec_partner.tipo = 'operador_partner' THEN
        -- OPERADOR + PARTNER: 100% ganancia propia + 100% del 30% de inversores
        v_ganancia_propia := rec_partner.inversion_inicial * 0.05;
        v_ganancia_comision := rec_partner.monto_inversores * 0.05 * 0.30;
        v_ganancia_total := v_ganancia_propia + v_ganancia_comision;
        
      ELSE
        -- PARTNER NORMAL: 80% ganancia propia (70% + 10%) + 1/3 del 30% de inversores
        v_ganancia_propia := rec_partner.inversion_inicial * 0.05 * 0.80;
        v_ganancia_comision := rec_partner.monto_inversores * 0.05 * 0.30 / 3;
        v_ganancia_total := v_ganancia_propia + v_ganancia_comision;
        
        -- Calcular regalías para el operador
        -- 20% de ganancia propia + 2/3 del 30% de inversores
        v_regalias_para_operador := (rec_partner.inversion_inicial * 0.05 * 0.20) + 
                                   (rec_partner.monto_inversores * 0.05 * 0.30 * 2 / 3);
        v_regalias_operador := v_regalias_operador + v_regalias_para_operador;
      END IF;
      
      -- Actualizar saldo del partner
      UPDATE partners 
      SET inversion_inicial = inversion_inicial + v_ganancia_total
      WHERE id = rec_partner.id;
      
      -- Registrar transacción de ganancia
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      VALUES (rec_partner.id, v_ganancia_total, 'ganancia', 
              'Ganancia semana ' || v_semana_actual);
      
      -- Registrar ganancia del partner
      INSERT INTO partner_ganancias (
        partner_id, semana_numero, ganancia_total, ganancia_comision,
        ganancia_operador, total_inversores, monto_total_inversores
      ) VALUES (
        rec_partner.id, v_semana_actual, v_ganancia_total, v_ganancia_comision,
        v_ganancia_operador, rec_partner.total_inversores, rec_partner.monto_inversores
      ) ON CONFLICT (partner_id, semana_numero) DO UPDATE SET
        ganancia_total = EXCLUDED.ganancia_total,
        ganancia_comision = EXCLUDED.ganancia_comision,
        ganancia_operador = EXCLUDED.ganancia_operador,
        total_inversores = EXCLUDED.total_inversores,
        monto_total_inversores = EXCLUDED.monto_total_inversores;
      
      -- Notificar al partner
      INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
      VALUES (rec_partner.id, 'partner', 
              'Ganancias Procesadas - Semana ' || v_semana_actual,
              'Se han procesado tus ganancias. Total: $' || v_ganancia_total::text,
              'success');
    END;
  END LOOP;
  
  -- Agregar regalías al operador si existe
  IF v_operador_id IS NOT NULL AND v_regalias_operador > 0 THEN
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + v_regalias_operador
    WHERE id = v_operador_id;
    
    INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
    VALUES (v_operador_id, v_regalias_operador, 'regalias', 
            'Regalías de partners - Semana ' || v_semana_actual);
    
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (v_operador_id, 'partner', 
            'Regalías Recibidas - Semana ' || v_semana_actual,
            'Has recibido regalías de tus partners. Total: $' || v_regalias_operador::text,
            'success');
  END IF;
  
  -- PROCESAR INVERSORES (70% de ganancia total distribuida proporcionalmente)
  FOR rec_inversor IN 
    SELECT i.*, 
           CASE 
             WHEN (SELECT SUM(total) FROM inversores) > 0 THEN
               (i.total / (SELECT SUM(total) FROM inversores)) * v_ganancia_inversores
             ELSE 0 
           END as ganancia_individual
    FROM inversores i
    WHERE i.total > 0
  LOOP
    -- Actualizar saldo del inversor
    UPDATE inversores 
    SET total = total + rec_inversor.ganancia_individual,
        ganancia_semanal = rec_inversor.ganancia_individual
    WHERE id = rec_inversor.id;
    
    -- Registrar transacción
    INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
    VALUES (rec_inversor.id, rec_inversor.ganancia_individual, 'ganancia',
            'Ganancia semana ' || v_semana_actual);
    
    -- Notificar al inversor
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (rec_inversor.id, 'inversor', 
            'Ganancias Procesadas - Semana ' || v_semana_actual,
            'Se han procesado tus ganancias. Total: $' || rec_inversor.ganancia_individual::text,
            'success');
  END LOOP;
  
END;
$$;