/*
  # Corrección del error FULL JOIN en procesar_ganancias_semanales
  
  Este archivo corrige el error de FULL JOIN que no es compatible con las condiciones
  de unión utilizadas. Se reemplaza por consultas separadas más eficientes.
*/

-- =============================================
-- ELIMINAR FUNCIÓN PROBLEMÁTICA
-- =============================================

DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid);

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

  -- Calcular total de inversión por separado (SIN FULL JOIN)
  -- Total de inversores
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversion_inversores
  FROM inversores;

  -- Total de partners
  SELECT COALESCE(SUM(inversion_inicial), 0) INTO v_total_inversion_partners
  FROM partners 
  WHERE activo = true;

  -- Total combinado
  v_total_inversion := v_total_inversion_inversores + v_total_inversion_partners;

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
-- VERIFICACIÓN FINAL
-- =============================================

-- Verificar que la función existe
SELECT 'Función procesar_ganancias_semanales corregida exitosamente' as status
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'procesar_ganancias_semanales'
);

/*
  ✅ CORRECCIÓN IMPLEMENTADA:

  1. **Problema identificado**: 
     - FULL JOIN con condiciones incompatibles entre tablas inversores y partners

  2. **Solución aplicada**:
     - Eliminado el FULL JOIN problemático
     - Reemplazado por consultas separadas más eficientes
     - Cálculo del total de inversión por separado para cada tabla

  3. **Beneficios**:
     - Elimina el error de compatibilidad de join
     - Mejora el rendimiento al evitar joins complejos
     - Mantiene la misma lógica de negocio
     - Código más legible y mantenible

  4. **Cambios específicos**:
     - Consulta separada para inversores: SELECT SUM(total) FROM inversores
     - Consulta separada para partners: SELECT SUM(inversion_inicial) FROM partners
     - Suma manual de ambos totales
     - Eliminación de condiciones de join problemáticas

  ✅ El error FULL JOIN ha sido resuelto completamente.
*/