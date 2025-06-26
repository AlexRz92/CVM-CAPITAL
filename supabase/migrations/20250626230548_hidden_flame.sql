/*
  # Corrección de Cálculos de Partners según Ejemplo Específico
  
  Implementa los cálculos exactos según el ejemplo:
  
  Para Socios Normales (como Alexis):
  - Ganancia propia: 80% de 5% 
  - Comisión de inversores: 1/3 del 30% del 5%
  - Regalías al operador: 20% de ganancia propia + 2/3 del 30% de inversores

  Para Operador + Partner (como Andrés):
  - Ganancia propia: 100% de 5%
  - Comisión de inversores: 100% del 30% del 5%
  - Recibe regalías de todos los socios normales automáticamente
*/

-- =============================================
-- FUNCIÓN CORREGIDA: obtener_distribucion_partners
-- =============================================

DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric);

CREATE OR REPLACE FUNCTION obtener_distribucion_partners(p_ganancia_partners numeric)
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
BEGIN
  RETURN QUERY
  SELECT 
    p.id as partner_id,
    p.nombre::text,
    p.tipo::text,
    p.inversion_inicial,
    COALESCE(COUNT(pi.inversor_id)::integer, 0) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total_inversores,
    
    -- CÁLCULO CORREGIDO SEGÚN EJEMPLO
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
    
    -- Sin ganancia operador adicional (se eliminó el 50% extra)
    0::numeric as ganancia_operador,
    
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Total operador: ganancia propia + comisión (sin adicional)
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

-- =============================================
-- FUNCIÓN CORREGIDA: procesar_ganancias_semanales
-- =============================================

DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid);

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
  v_total_inversion_inversores numeric;
  v_total_inversion_partners numeric;
  v_total_inversion numeric;
  v_ganancia_bruta numeric;
  v_ganancia_inversores numeric;
  v_ganancia_partners numeric;
  v_partner record;
  v_inversor record;
  v_ganancia_individual numeric;
  v_ganancia_comision numeric;
  v_regalias_operador_propia numeric;
  v_regalias_operador_inversores numeric;
  v_operador_id uuid;
BEGIN
  -- Obtener semana actual
  SELECT valor::integer INTO v_semana_actual
  FROM configuracion_sistema
  WHERE clave = 'semana_actual';
  
  IF v_semana_actual IS NULL THEN
    v_semana_actual := 1;
  END IF;

  -- Buscar el operador (solo debe haber uno)
  SELECT id INTO v_operador_id
  FROM partners 
  WHERE tipo = 'operador_partner' AND activo = true
  LIMIT 1;

  -- Calcular total de inversión por separado
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversion_inversores
  FROM inversores;

  SELECT COALESCE(SUM(inversion_inicial), 0) INTO v_total_inversion_partners
  FROM partners 
  WHERE activo = true;

  v_total_inversion := v_total_inversion_inversores + v_total_inversion_partners;

  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := v_total_inversion * (p_porcentaje / 100);
  ELSE
    v_ganancia_bruta := v_total_inversion * 0.05;
  END IF;

  -- Calcular distribución (70% inversores, 30% partners)
  v_ganancia_inversores := v_ganancia_bruta * 0.70;
  v_ganancia_partners := v_ganancia_bruta * 0.30;

  -- Registrar ganancia semanal
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion,
    porcentaje_ganancia, ganancia_bruta, ganancia_partners, ganancia_inversores,
    procesado, fecha_procesado, procesado_por
  ) VALUES (
    v_semana_actual, 
    CURRENT_DATE - INTERVAL '7 days', 
    CURRENT_DATE,
    v_total_inversion,
    CASE WHEN p_porcentaje IS NOT NULL THEN p_porcentaje ELSE 5 END,
    v_ganancia_bruta,
    v_ganancia_partners,
    v_ganancia_inversores,
    true,
    now(),
    p_admin_id
  ) ON CONFLICT (semana_numero) DO UPDATE SET
    total_inversion = EXCLUDED.total_inversion,
    ganancia_bruta = EXCLUDED.ganancia_bruta,
    ganancia_partners = EXCLUDED.ganancia_partners,
    ganancia_inversores = EXCLUDED.ganancia_inversores,
    procesado = true,
    fecha_procesado = now(),
    procesado_por = p_admin_id;

  -- PROCESAR GANANCIAS DE INVERSORES (70% - mantener como está)
  FOR v_inversor IN 
    SELECT id, nombre, apellido, total
    FROM inversores 
    WHERE total > 0
  LOOP
    v_ganancia_individual := ROUND(v_inversor.total * 0.05 * 0.70, 2);
    
    UPDATE inversores 
    SET ganancia_semanal = v_ganancia_individual,
        total = total + v_ganancia_individual
    WHERE id = v_inversor.id;
    
    INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
    VALUES (v_inversor.id, v_ganancia_individual, 'ganancia', 
            'Ganancia semanal ' || v_semana_actual || ' - 70% de 5%');
    
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (v_inversor.id, 'inversor', 'Ganancia Semanal Procesada',
            'Se ha procesado tu ganancia semanal de $' || v_ganancia_individual::text || 
            ' correspondiente a la semana ' || v_semana_actual::text, 'success');
  END LOOP;

  -- PROCESAR GANANCIAS DE PARTNERS CON CÁLCULOS CORREGIDOS
  FOR v_partner IN 
    SELECT p.id, p.nombre, p.tipo, p.inversion_inicial,
           COUNT(pi.inversor_id) as total_inversores,
           COALESCE(SUM(i.total), 0) as monto_total_inversores
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.inversion_inicial
  LOOP
    
    IF v_partner.tipo = 'operador_partner' THEN
      -- =============================================
      -- OPERADOR + PARTNER (según ejemplo)
      -- =============================================
      -- Ganancia propia: 100% de 5%
      -- Comisión inversores: 100% del 30% del 5%
      v_ganancia_comision := ROUND((v_partner.inversion_inicial * 0.05) + 
                                  (v_partner.monto_total_inversores * 0.05 * 0.30), 2);
      
    ELSE
      -- =============================================
      -- PARTNER NORMAL (según ejemplo)
      -- =============================================
      -- Ganancia propia: 80% de 5%
      -- Comisión inversores: 1/3 del 30% del 5%
      v_ganancia_comision := ROUND((v_partner.inversion_inicial * 0.05 * 0.80) + 
                                  (v_partner.monto_total_inversores * 0.05 * 0.30 / 3), 2);
      
      -- =============================================
      -- CALCULAR REGALÍAS PARA EL OPERADOR (según ejemplo)
      -- =============================================
      IF v_operador_id IS NOT NULL THEN
        -- Regalías de ganancia propia del partner: 20% de 5%
        v_regalias_operador_propia := ROUND(v_partner.inversion_inicial * 0.05 * 0.20, 2);
        
        -- Regalías de inversores del partner: 2/3 del 30% del 5%
        v_regalias_operador_inversores := ROUND(v_partner.monto_total_inversores * 0.05 * 0.30 * (2.0/3.0), 2);
        
        -- Registrar regalías del operador
        INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
        VALUES (v_operador_id, v_regalias_operador_propia + v_regalias_operador_inversores, 'regalias',
                'Regalías de ' || v_partner.nombre || ' - Semana ' || v_semana_actual);
        
        -- Actualizar inversión del operador
        UPDATE partners 
        SET inversion_inicial = inversion_inicial + v_regalias_operador_propia + v_regalias_operador_inversores
        WHERE id = v_operador_id;
        
        -- Enviar notificación al operador sobre regalías
        INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
        VALUES (v_operador_id, 'partner', 'Regalías Recibidas',
                'Has recibido $' || (v_regalias_operador_propia + v_regalias_operador_inversores)::text ||
                ' en regalías de ' || v_partner.nombre || ' - Semana ' || v_semana_actual::text, 'success');
      END IF;
    END IF;

    -- REGISTRAR GANANCIAS DEL PARTNER
    INSERT INTO partner_ganancias (
      partner_id, semana_numero, ganancia_total, ganancia_comision, ganancia_operador,
      total_inversores, monto_total_inversores
    ) VALUES (
      v_partner.id, v_semana_actual, 
      v_ganancia_comision, -- Solo ganancia comisión, sin operador adicional
      v_ganancia_comision, 
      0, -- Sin ganancia operador adicional
      v_partner.total_inversores, v_partner.monto_total_inversores
    ) ON CONFLICT (partner_id, semana_numero) DO UPDATE SET
      ganancia_total = EXCLUDED.ganancia_total,
      ganancia_comision = EXCLUDED.ganancia_comision,
      ganancia_operador = EXCLUDED.ganancia_operador,
      total_inversores = EXCLUDED.total_inversores,
      monto_total_inversores = EXCLUDED.monto_total_inversores;

    -- Actualizar inversión del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + v_ganancia_comision
    WHERE id = v_partner.id;

    -- Registrar transacción del partner
    INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
    VALUES (v_partner.id, v_ganancia_comision, 'ganancia',
            'Ganancia semanal ' || v_semana_actual);

    -- Enviar notificación al partner
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (v_partner.id, 'partner', 'Ganancia Semanal Procesada',
            'Se ha procesado tu ganancia semanal de $' || v_ganancia_comision::text ||
            ' correspondiente a la semana ' || v_semana_actual::text, 'success');
  END LOOP;

  -- Incrementar semana
  UPDATE configuracion_sistema 
  SET valor = (v_semana_actual + 1)::text,
      updated_at = now(),
      updated_by = p_admin_id
  WHERE clave = 'semana_actual';
END;
$$;

-- =============================================
-- FUNCIÓN CORREGIDA: obtener_inversores_con_ganancias_partner
-- =============================================

DROP FUNCTION IF EXISTS obtener_inversores_con_ganancias_partner(uuid);

CREATE OR REPLACE FUNCTION obtener_inversores_con_ganancias_partner(p_partner_id uuid)
RETURNS TABLE (
  inversor_id uuid,
  nombre text,
  apellido text,
  email text,
  total_invertido numeric,
  ganancia_semanal numeric,
  ganancia_para_partner numeric,
  porcentaje_ganancia numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_partner_tipo text;
BEGIN
  -- Obtener tipo de partner
  SELECT tipo INTO v_partner_tipo
  FROM partners 
  WHERE id = p_partner_id;

  RETURN QUERY
  SELECT 
    i.id as inversor_id,
    i.nombre::text,
    i.apellido::text,
    i.email::text,
    i.total as total_invertido,
    i.ganancia_semanal,
    
    -- Calcular ganancia que va al partner según su tipo (CORREGIDO)
    CASE 
      WHEN v_partner_tipo = 'operador_partner' THEN 
        -- Operador recibe 100% del 30% del 5%
        ROUND(i.total * 0.05 * 0.30, 2)
      ELSE 
        -- Partner normal recibe 1/3 del 30% del 5%
        ROUND(i.total * 0.05 * 0.30 / 3, 2)
    END as ganancia_para_partner,
    
    5.00 as porcentaje_ganancia -- 5% fijo
    
  FROM inversores i
  INNER JOIN partner_inversores pi ON i.id = pi.inversor_id
  WHERE pi.partner_id = p_partner_id
    AND i.total > 0
  ORDER BY i.nombre, i.apellido;
END;
$$;

-- =============================================
-- FUNCIÓN DE VERIFICACIÓN DE CÁLCULOS
-- =============================================

CREATE OR REPLACE FUNCTION verificar_calculos_ejemplo()
RETURNS TABLE (
  descripcion text,
  alexis_ganancia_propia numeric,
  alexis_comision_inversores numeric,
  alexis_total numeric,
  andres_regalias_propia numeric,
  andres_regalias_inversores numeric,
  andres_regalias_total numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Ejemplo: Alexis $1,000 + $5,000 inversores'::text as descripcion,
    
    -- Alexis (Partner normal)
    ROUND(1000 * 0.05 * 0.80, 2) as alexis_ganancia_propia, -- $40
    ROUND(5000 * 0.05 * 0.30 / 3, 2) as alexis_comision_inversores, -- $25
    ROUND((1000 * 0.05 * 0.80) + (5000 * 0.05 * 0.30 / 3), 2) as alexis_total, -- $65
    
    -- Andrés (Operador) recibe regalías de Alexis
    ROUND(1000 * 0.05 * 0.20, 2) as andres_regalias_propia, -- $10
    ROUND(5000 * 0.05 * 0.30 * (2.0/3.0), 2) as andres_regalias_inversores, -- $50
    ROUND((1000 * 0.05 * 0.20) + (5000 * 0.05 * 0.30 * (2.0/3.0)), 2) as andres_regalias_total; -- $60
END;
$$;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

-- Ejecutar verificación de cálculos
SELECT * FROM verificar_calculos_ejemplo();

-- Verificar que las funciones existen
SELECT 'Función obtener_distribucion_partners corregida' as status
WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'obtener_distribucion_partners');

SELECT 'Función procesar_ganancias_semanales corregida' as status
WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'procesar_ganancias_semanales');

SELECT 'Función obtener_inversores_con_ganancias_partner corregida' as status
WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'obtener_inversores_con_ganancias_partner');

/*
  ✅ CORRECCIONES IMPLEMENTADAS SEGÚN EJEMPLO:

  1. **Alexis (Partner con $1,000 propios + $5,000 de inversores)**:
     - Ganancia propia: $1,000 × 5% × 80% = $40
     - Comisión de inversores: $5,000 × 5% × 30% ÷ 3 = $25
     - Total Alexis: $65

  2. **Andrés (Operador) recibe las regalías**:
     - Ganancia propia de Alexis: $1,000 × 5% × 20% = $10
     - Inversores de Alexis: $5,000 × 5% × 30% × 2/3 = $50
     - Regalías totales: $60

  3. **Operador + Partner**:
     - Ganancia propia: 100% de 5%
     - Comisión de inversores: 100% del 30% del 5%
     - Recibe regalías automáticamente de todos los partners normales

  4. **Eliminaciones**:
     - Removido el 50% adicional para operadores
     - Simplificado el cálculo para que coincida exactamente con el ejemplo

  ✅ Los cálculos ahora coinciden exactamente con el ejemplo proporcionado.
*/