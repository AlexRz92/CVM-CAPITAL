/*
  # Reestructuración completa del sistema de partners
  
  1. Eliminar campos de porcentajes personalizables
  2. Establecer valores predefinidos
  3. Limitar decimales a máximo 2
  4. Nuevas funciones para gráficos y listados mejorados
*/

-- =============================================
-- PASO 1: MODIFICAR TABLA PARTNERS
-- =============================================

-- Eliminar columnas de porcentajes personalizables
ALTER TABLE partners 
DROP COLUMN IF EXISTS porcentaje_comision,
DROP COLUMN IF EXISTS porcentaje_especial;

-- Agregar constraint para limitar decimales en inversion_inicial
ALTER TABLE partners 
ALTER COLUMN inversion_inicial TYPE NUMERIC(15,2);

-- =============================================
-- PASO 2: LIMITAR DECIMALES EN TODAS LAS TABLAS
-- =============================================

-- Tabla inversores
ALTER TABLE inversores 
ALTER COLUMN capital_inicial TYPE NUMERIC(15,2),
ALTER COLUMN ganancia_semanal TYPE NUMERIC(15,2),
ALTER COLUMN total TYPE NUMERIC(15,2);

-- Tabla transacciones
ALTER TABLE transacciones 
ALTER COLUMN monto TYPE NUMERIC(15,2);

-- Tabla partner_transacciones
ALTER TABLE partner_transacciones 
ALTER COLUMN monto TYPE NUMERIC(15,2);

-- Tabla solicitudes
ALTER TABLE solicitudes 
ALTER COLUMN monto TYPE NUMERIC(15,2);

-- Tabla partner_solicitudes
ALTER TABLE partner_solicitudes 
ALTER COLUMN monto TYPE NUMERIC(15,2);

-- Tabla ganancias_semanales
ALTER TABLE ganancias_semanales 
ALTER COLUMN total_inversion TYPE NUMERIC(15,2),
ALTER COLUMN porcentaje_ganancia TYPE NUMERIC(5,2),
ALTER COLUMN ganancia_bruta TYPE NUMERIC(15,2),
ALTER COLUMN ganancia_partners TYPE NUMERIC(15,2),
ALTER COLUMN ganancia_inversores TYPE NUMERIC(15,2);

-- Tabla partner_ganancias
ALTER TABLE partner_ganancias 
ALTER COLUMN ganancia_total TYPE NUMERIC(15,2),
ALTER COLUMN ganancia_comision TYPE NUMERIC(15,2),
ALTER COLUMN ganancia_operador TYPE NUMERIC(15,2),
ALTER COLUMN monto_total_inversores TYPE NUMERIC(15,2);

-- =============================================
-- PASO 3: ACTUALIZAR FUNCIÓN DE DISTRIBUCIÓN DE PARTNERS
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
    
    -- CÁLCULO CON VALORES PREDEFINIDOS
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
    
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Operador recibe 50% adicional (valor predefinido)
        ROUND(COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * 0.50, 2)
      ELSE 
        0::numeric
    END as ganancia_operador,
    
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        -- Total operador: ganancia propia + comisión + 50% adicional
        ROUND((p.inversion_inicial * 0.05) + 
              (COALESCE(SUM(i.total), 0) * 0.05 * 0.30) +
              (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * 0.50), 2)
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
-- PASO 4: FUNCIÓN PARA GRÁFICO DE TORTA DE PARTNERS
-- =============================================

CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id uuid)
RETURNS TABLE (
  name text,
  value numeric,
  color text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_depositos numeric := 0;
  v_retiros numeric := 0;
  v_ganancias_propias numeric := 0;
  v_ganancias_operador numeric := 0;
  v_regalias numeric := 0;
  v_inversion_inicial numeric := 0;
BEGIN
  -- Obtener inversión inicial del partner
  SELECT COALESCE(inversion_inicial, 0) INTO v_inversion_inicial
  FROM partners 
  WHERE id = p_partner_id;

  -- Calcular depósitos
  SELECT COALESCE(SUM(monto), 0) INTO v_depositos
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id 
    AND tipo IN ('deposito', 'depósito');

  -- Calcular retiros
  SELECT COALESCE(SUM(monto), 0) INTO v_retiros
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id 
    AND tipo = 'retiro';

  -- Calcular ganancias propias
  SELECT COALESCE(SUM(monto), 0) INTO v_ganancias_propias
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id 
    AND tipo IN ('ganancia_propia', 'ganancia');

  -- Calcular ganancias de operador
  SELECT COALESCE(SUM(monto), 0) INTO v_ganancias_operador
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id 
    AND tipo = 'ganancia_operador';

  -- Calcular regalías
  SELECT COALESCE(SUM(monto), 0) INTO v_regalias
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id 
    AND tipo = 'regalias';

  -- Retornar datos para el gráfico (solo valores > 0)
  IF v_inversion_inicial > 0 THEN
    RETURN QUERY SELECT 'Inversión Inicial'::text, v_inversion_inicial, '#6366f1'::text;
  END IF;
  
  IF v_depositos > 0 THEN
    RETURN QUERY SELECT 'Depósitos'::text, v_depositos, '#10b981'::text;
  END IF;
  
  IF v_retiros > 0 THEN
    RETURN QUERY SELECT 'Retiros'::text, v_retiros, '#ef4444'::text;
  END IF;
  
  IF v_ganancias_propias > 0 THEN
    RETURN QUERY SELECT 'Ganancias Propias'::text, v_ganancias_propias, '#3b82f6'::text;
  END IF;
  
  IF v_ganancias_operador > 0 THEN
    RETURN QUERY SELECT 'Ganancias Operador'::text, v_ganancias_operador, '#f59e0b'::text;
  END IF;
  
  IF v_regalias > 0 THEN
    RETURN QUERY SELECT 'Regalías'::text, v_regalias, '#8b5cf6'::text;
  END IF;
END;
$$;

-- =============================================
-- PASO 5: FUNCIÓN PARA LISTADO DE INVERSORES CON GANANCIAS
-- =============================================

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
    
    -- Calcular ganancia que va al partner según su tipo
    CASE 
      WHEN v_partner_tipo = 'operador_partner' THEN 
        -- Operador recibe 100% del 30%
        ROUND(i.total * 0.05 * 0.30, 2)
      ELSE 
        -- Partner normal recibe 1/3 del 30%
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
-- PASO 6: FUNCIÓN PARA VALIDAR ELIMINACIÓN DE PARTNER
-- =============================================

CREATE OR REPLACE FUNCTION validar_eliminacion_partner(p_partner_id uuid)
RETURNS TABLE (
  puede_eliminar boolean,
  total_inversores integer,
  monto_total_inversores numeric,
  mensaje text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_inversores integer;
  v_monto_total numeric;
BEGIN
  -- Contar inversores asignados
  SELECT COUNT(*), COALESCE(SUM(i.total), 0)
  INTO v_total_inversores, v_monto_total
  FROM partner_inversores pi
  INNER JOIN inversores i ON pi.inversor_id = i.id
  WHERE pi.partner_id = p_partner_id;

  RETURN QUERY
  SELECT 
    true as puede_eliminar, -- Siempre se puede eliminar, pero con advertencia
    v_total_inversores,
    v_monto_total,
    CASE 
      WHEN v_total_inversores > 0 THEN 
        'Este partner tiene ' || v_total_inversores || ' inversores asignados con un total de $' || 
        v_monto_total::text || '. Los inversores serán liberados y podrán ser reasignados.'
      ELSE 
        'Este partner no tiene inversores asignados. Se puede eliminar sin problemas.'
    END as mensaje;
END;
$$;

-- =============================================
-- PASO 7: ACTUALIZAR FUNCIÓN DE PROCESAMIENTO DE GANANCIAS
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

  -- PROCESAR GANANCIAS DE INVERSORES (70%)
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

  -- PROCESAR GANANCIAS DE PARTNERS CON VALORES PREDEFINIDOS
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
      -- OPERADOR + PARTNER (valores predefinidos)
      v_ganancia_comision := ROUND((v_partner.inversion_inicial * 0.05) + 
                                  (v_partner.monto_total_inversores * 0.05 * 0.30), 2);
      
      -- Ganancia adicional como operador: 50% predefinido
      v_ganancia_operador := ROUND(v_partner.monto_total_inversores * 0.05 * 0.30 * 0.50, 2);
      
    ELSE
      -- PARTNER NORMAL (valores predefinidos)
      v_ganancia_comision := ROUND((v_partner.inversion_inicial * 0.05 * 0.80) + 
                                  (v_partner.monto_total_inversores * 0.05 * 0.30 / 3), 2);
      v_ganancia_operador := 0;
      
      -- CALCULAR REGALÍAS PARA EL OPERADOR
      IF v_operador_id IS NOT NULL THEN
        v_regalias_operador_propia := ROUND(v_partner.inversion_inicial * 0.05 * 0.20, 2);
        v_regalias_operador_inversores := ROUND(v_partner.monto_total_inversores * 0.05 * 0.30 * (2.0/3.0), 2);
        
        INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
        VALUES (v_operador_id, v_regalias_operador_propia + v_regalias_operador_inversores, 'regalias',
                'Regalías de ' || v_partner.nombre || ' - Semana ' || v_semana_actual);
        
        UPDATE partners 
        SET inversion_inicial = inversion_inicial + v_regalias_operador_propia + v_regalias_operador_inversores
        WHERE id = v_operador_id;
        
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
      v_ganancia_comision + v_ganancia_operador,
      v_ganancia_comision, v_ganancia_operador,
      v_partner.total_inversores, v_partner.monto_total_inversores
    ) ON CONFLICT (partner_id, semana_numero) DO UPDATE SET
      ganancia_total = EXCLUDED.ganancia_total,
      ganancia_comision = EXCLUDED.ganancia_comision,
      ganancia_operador = EXCLUDED.ganancia_operador,
      total_inversores = EXCLUDED.total_inversores,
      monto_total_inversores = EXCLUDED.monto_total_inversores;

    UPDATE partners 
    SET inversion_inicial = inversion_inicial + v_ganancia_comision + v_ganancia_operador
    WHERE id = v_partner.id;

    -- Registrar transacciones separadas para ganancia propia y comisión
    IF v_ganancia_comision > 0 THEN
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      VALUES (v_partner.id, v_ganancia_comision, 'ganancia_propia',
              'Ganancia propia semana ' || v_semana_actual);
    END IF;

    IF v_ganancia_operador > 0 THEN
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      VALUES (v_partner.id, v_ganancia_operador, 'ganancia_operador',
              'Ganancia operador semana ' || v_semana_actual);
    END IF;

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
-- PASO 8: CONSTRAINTS Y VALIDACIONES
-- =============================================

-- Agregar constraint para validar tipo de partner
ALTER TABLE partners 
DROP CONSTRAINT IF EXISTS partners_tipo_check;

ALTER TABLE partners 
ADD CONSTRAINT partners_tipo_check 
CHECK (tipo IN ('partner', 'operador_partner'));

-- Agregar constraint para validar que inversion_inicial sea positiva
ALTER TABLE partners 
DROP CONSTRAINT IF EXISTS partners_inversion_inicial_positive;

ALTER TABLE partners 
ADD CONSTRAINT partners_inversion_inicial_positive 
CHECK (inversion_inicial >= 0);

-- Agregar constraint para validar montos en transacciones
ALTER TABLE transacciones 
DROP CONSTRAINT IF EXISTS transacciones_monto_positive;

ALTER TABLE transacciones 
ADD CONSTRAINT transacciones_monto_positive 
CHECK (monto > 0);

ALTER TABLE partner_transacciones 
DROP CONSTRAINT IF EXISTS partner_transacciones_monto_positive;

ALTER TABLE partner_transacciones 
ADD CONSTRAINT partner_transacciones_monto_positive 
CHECK (monto > 0);

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

SELECT 'Reestructuración completada exitosamente' as status;

/*
  ✅ REESTRUCTURACIÓN COMPLETADA:

  1. **Eliminación de campos personalizables**:
     - Removidos porcentaje_comision y porcentaje_especial de partners
     - Valores ahora son predefinidos en las funciones

  2. **Valores predefinidos establecidos**:
     - Partner normal: 80% ganancia propia + 1/3 del 30% de inversores
     - Operador+Partner: 100% ganancia propia + 100% del 30% + 50% adicional
     - Operador recibe regalías: 20% de partners + 2/3 del 30% de sus inversores

  3. **Limitación de decimales**:
     - Todos los campos numéricos limitados a máximo 2 decimales
     - Tipo NUMERIC(15,2) para montos
     - Tipo NUMERIC(5,2) para porcentajes

  4. **Nuevas funcionalidades**:
     - Gráfico de torta completo para partners (depósitos, retiros, ganancias separadas)
     - Listado de inversores con ganancia específica para cada partner
     - Validación para eliminación de partners con modal informativo
     - Transacciones separadas para ganancia propia y comisión

  ✅ La base de datos está completamente reestructurada según los requerimientos.
*/