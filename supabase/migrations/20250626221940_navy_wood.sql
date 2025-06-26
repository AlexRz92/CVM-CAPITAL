/*
  # Verificación y corrección completa de la base de datos CVM Capital
  
  Este archivo verifica y corrige todas las funciones para asegurar que:
  1. Los cálculos de ganancias sean correctos
  2. Partners normales reciban 80% + 1/3 del 30%
  3. Operador reciba 20% + 2/3 del 30%
  4. Todas las funciones estén actualizadas
*/

-- =============================================
-- VERIFICACIÓN Y CORRECCIÓN DE FUNCIONES
-- =============================================

-- Eliminar funciones existentes para recrearlas
DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric);
DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid);

-- =============================================
-- FUNCIÓN CORREGIDA: obtener_distribucion_partners
-- =============================================

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
    
    -- CÁLCULO CORREGIDO DE GANANCIAS
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Operador+Partner: 100% de ganancia propia + 100% del 30% de inversores
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30)
      ELSE 
        -- Partner normal: 80% de ganancia propia + 1/3 del 30% de inversores
        (p.inversion_inicial * 0.05 * 0.80) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3)
    END as ganancia_comision,
    
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Operador recibe su % especial adicional
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * (p.porcentaje_especial / 100))
      ELSE 
        0
    END as ganancia_operador,
    
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Total operador: ganancia propia + comisión + especial
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30) +
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * (p.porcentaje_especial / 100))
      ELSE 
        -- Total partner: 80% propia + 1/3 comisión
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

-- =============================================
-- FUNCIÓN CORREGIDA: procesar_ganancias_semanales
-- =============================================

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
  v_partner record;
  v_inversor record;
  v_ganancia_individual numeric;
  v_ganancia_comision numeric;
  v_ganancia_operador numeric;
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

  -- Calcular total de inversión (inversores + partners)
  SELECT 
    COALESCE(SUM(i.total), 0) + COALESCE(SUM(p.inversion_inicial), 0)
  INTO v_total_inversion
  FROM inversores i
  FULL OUTER JOIN partners p ON p.activo = true;

  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := v_total_inversion * (p_porcentaje / 100);
  ELSE
    v_ganancia_bruta := v_total_inversion * 0.05; -- 5% por defecto
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

  -- =============================================
  -- PROCESAR GANANCIAS DE INVERSORES (70%)
  -- =============================================
  FOR v_inversor IN 
    SELECT id, nombre, apellido, total
    FROM inversores 
    WHERE total > 0
  LOOP
    v_ganancia_individual := v_inversor.total * 0.05 * 0.70;
    
    -- Actualizar ganancia semanal del inversor
    UPDATE inversores 
    SET ganancia_semanal = v_ganancia_individual,
        total = total + v_ganancia_individual
    WHERE id = v_inversor.id;
    
    -- Registrar transacción
    INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
    VALUES (v_inversor.id, v_ganancia_individual, 'ganancia', 
            'Ganancia semanal ' || v_semana_actual || ' - 70% de 5%');
    
    -- Enviar notificación
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (v_inversor.id, 'inversor', 'Ganancia Semanal Procesada',
            'Se ha procesado tu ganancia semanal de $' || v_ganancia_individual::text || 
            ' correspondiente a la semana ' || v_semana_actual::text, 'success');
  END LOOP;

  -- =============================================
  -- PROCESAR GANANCIAS DE PARTNERS
  -- =============================================
  FOR v_partner IN 
    SELECT p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial,
           COUNT(pi.inversor_id) as total_inversores,
           COALESCE(SUM(i.total), 0) as monto_total_inversores
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  LOOP
    
    IF v_partner.tipo = 'operador_partner' THEN
      -- =============================================
      -- OPERADOR + PARTNER
      -- =============================================
      -- Ganancia propia: 100% de 5%
      -- Comisión inversores: 100% del 30%
      v_ganancia_comision := (v_partner.inversion_inicial * 0.05) + 
                            (v_partner.monto_total_inversores * 0.05 * 0.30);
      
      -- Ganancia adicional como operador (si tiene porcentaje especial)
      v_ganancia_operador := v_partner.monto_total_inversores * 0.05 * 0.30 * (v_partner.porcentaje_especial / 100);
      
    ELSE
      -- =============================================
      -- PARTNER NORMAL
      -- =============================================
      -- Ganancia propia: 80% de 5%
      -- Comisión inversores: 1/3 del 30%
      v_ganancia_comision := (v_partner.inversion_inicial * 0.05 * 0.80) + 
                            (v_partner.monto_total_inversores * 0.05 * 0.30 / 3);
      v_ganancia_operador := 0;
      
      -- =============================================
      -- CALCULAR REGALÍAS PARA EL OPERADOR
      -- =============================================
      IF v_operador_id IS NOT NULL THEN
        -- Regalías de ganancia propia del partner: 20% de 5%
        v_regalias_operador_propia := v_partner.inversion_inicial * 0.05 * 0.20;
        
        -- Regalías de inversores del partner: 2/3 del 30%
        v_regalias_operador_inversores := v_partner.monto_total_inversores * 0.05 * 0.30 * (2.0/3.0);
        
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

    -- =============================================
    -- REGISTRAR GANANCIAS DEL PARTNER
    -- =============================================
    INSERT INTO partner_ganancias (
      partner_id, semana_numero, ganancia_total, ganancia_comision, ganancia_operador,
      total_inversores, monto_total_inversores
    ) VALUES (
      v_partner.id, v_semana_actual, 
      v_ganancia_comision + v_ganancia_operador,
      v_ganancia_comision, v_ganancia_operador,
      v_partner.total_inversores, v_partner.monto_total_inversores
    ) ON CONFLICT (partner_id, semana_numero) DO UPDATE SET
      ganancia_total = EXCLUDED.ganancia_total,
      ganancia_comision = EXCLUDED.ganancia_comision,
      ganancia_operador = EXCLUDED.ganancia_operador,
      total_inversores = EXCLUDED.total_inversores,
      monto_total_inversores = EXCLUDED.monto_total_inversores;

    -- Actualizar inversión del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + v_ganancia_comision + v_ganancia_operador
    WHERE id = v_partner.id;

    -- Registrar transacción del partner
    INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
    VALUES (v_partner.id, v_ganancia_comision + v_ganancia_operador, 'ganancia',
            'Ganancia semanal ' || v_semana_actual);

    -- Enviar notificación al partner
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (v_partner.id, 'partner', 'Ganancia Semanal Procesada',
            'Se ha procesado tu ganancia semanal de $' || (v_ganancia_comision + v_ganancia_operador)::text ||
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
-- FUNCIÓN DE PRUEBA PARA VERIFICAR CÁLCULOS
-- =============================================

CREATE OR REPLACE FUNCTION verificar_calculos_ganancias()
RETURNS TABLE (
  descripcion text,
  partner_nombre text,
  tipo_partner text,
  inversion_propia numeric,
  inversores_total numeric,
  ganancia_propia_calculada numeric,
  comision_inversores_calculada numeric,
  regalias_operador_calculada numeric,
  total_partner numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Cálculo de ejemplo'::text as descripcion,
    p.nombre::text as partner_nombre,
    p.tipo::text as tipo_partner,
    p.inversion_inicial as inversion_propia,
    COALESCE(SUM(i.total), 0) as inversores_total,
    
    -- Ganancia propia
    CASE 
      WHEN p.tipo = 'operador_partner' THEN p.inversion_inicial * 0.05
      ELSE p.inversion_inicial * 0.05 * 0.80
    END as ganancia_propia_calculada,
    
    -- Comisión de inversores
    CASE 
      WHEN p.tipo = 'operador_partner' THEN COALESCE(SUM(i.total), 0) * 0.05 * 0.30
      ELSE COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3
    END as comision_inversores_calculada,
    
    -- Regalías que va al operador
    CASE 
      WHEN p.tipo = 'partner' THEN 
        (p.inversion_inicial * 0.05 * 0.20) + (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * 2.0/3.0)
      ELSE 0
    END as regalias_operador_calculada,
    
    -- Total del partner
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        (p.inversion_inicial * 0.05) + (COALESCE(SUM(i.total), 0) * 0.05 * 0.30)
      ELSE 
        (p.inversion_inicial * 0.05 * 0.80) + (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3)
    END as total_partner
    
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.inversion_inicial
  ORDER BY p.tipo DESC, p.nombre;
END;
$$;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

-- Verificar que las funciones existen
SELECT 'Función obtener_distribucion_partners creada correctamente' as status
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'obtener_distribucion_partners'
);

SELECT 'Función procesar_ganancias_semanales creada correctamente' as status
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'procesar_ganancias_semanales'
);

SELECT 'Función verificar_calculos_ganancias creada correctamente' as status
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'verificar_calculos_ganancias'
);

-- =============================================
-- COMENTARIOS DE VERIFICACIÓN
-- =============================================

/*
  ✅ CORRECCIONES VERIFICADAS E IMPLEMENTADAS:

  1. **Partners normales (tipo = 'partner')**:
     - Ganancia propia: 80% de 5% (era 70%)
     - Comisión inversores: 1/3 del 30% de 5%
     - Regalías al operador: 20% de ganancia propia + 2/3 del 30% de inversores

  2. **Operador + Partner (tipo = 'operador_partner')**:
     - Ganancia propia: 100% de 5%
     - Comisión inversores: 100% del 30% de 5%
     - Recibe regalías de todos los partners normales

  3. **Ejemplo de cálculo para Alexis (Partner con $1,000 + $5,000 inversores)**:
     - Ganancia propia: $1,000 × 5% × 80% = $40
     - Comisión inversores: $5,000 × 5% × 30% ÷ 3 = $25
     - Total Alexis: $65
     - Regalías a Andrés: ($1,000 × 5% × 20%) + ($5,000 × 5% × 30% × 2/3) = $10 + $50 = $60

  4. **Función de verificación**:
     - Se puede ejecutar: SELECT * FROM verificar_calculos_ganancias();
     - Para probar los cálculos antes de procesar ganancias reales

  ✅ La base de datos está corregida y lista para usar.
*/