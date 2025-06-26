/*
  # Eliminar y recrear funciones con cálculos corregidos

  1. Eliminar funciones existentes que causan conflictos
  2. Recrear con cálculos exactos según especificaciones
  3. Corregir constraint de configuración
  4. Implementar fórmulas correctas para partners
*/

-- Eliminar funciones existentes para evitar conflictos de tipo de retorno
DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric);
DROP FUNCTION IF EXISTS obtener_distribucion_inversores(numeric);
DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid);
DROP FUNCTION IF EXISTS configurar_semana_sistema(integer, date, uuid);
DROP FUNCTION IF EXISTS obtener_estadisticas_admin();

-- Eliminar constraint problemático y recrear correctamente
DO $$ 
BEGIN
  -- Eliminar constraints existentes si existen
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'configuracion_sistema_clave_key'
  ) THEN
    ALTER TABLE configuracion_sistema DROP CONSTRAINT configuracion_sistema_clave_key;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'configuracion_sistema_clave_unique'
  ) THEN
    ALTER TABLE configuracion_sistema DROP CONSTRAINT configuracion_sistema_clave_unique;
  END IF;
  
  -- Crear constraint único correctamente
  ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_clave_unique UNIQUE (clave);
END $$;

-- Función corregida para obtener estadísticas del panel de administración
CREATE OR REPLACE FUNCTION obtener_estadisticas_admin()
RETURNS JSON AS $$
DECLARE
  v_total_inversion NUMERIC := 0;
  v_total_inversores_capital NUMERIC := 0;
  v_total_partners_capital NUMERIC := 0;
  v_partners_activos INTEGER := 0;
  v_total_inversores INTEGER := 0;
  v_semana_actual INTEGER := 1;
  v_ganancia_semanal_actual NUMERIC := 0;
  v_result JSON;
BEGIN
  -- Calcular total de capital de inversores
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversores_capital
  FROM inversores;
  
  -- Calcular total de capital de partners activos
  SELECT COALESCE(SUM(inversion_inicial), 0) INTO v_total_partners_capital
  FROM partners
  WHERE activo = true;
  
  -- Total de inversión combinado
  v_total_inversion := v_total_inversores_capital + v_total_partners_capital;
  
  -- Contar partners activos
  SELECT COUNT(*) INTO v_partners_activos
  FROM partners
  WHERE activo = true;
  
  -- Contar total de inversores
  SELECT COUNT(*) INTO v_total_inversores
  FROM inversores;
  
  -- Obtener semana actual
  SELECT COALESCE(valor::INTEGER, 1) INTO v_semana_actual
  FROM configuracion_sistema
  WHERE clave = 'semana_actual';
  
  -- Obtener ganancia semanal actual (si existe)
  SELECT COALESCE(ganancia_bruta, 0) INTO v_ganancia_semanal_actual
  FROM ganancias_semanales
  WHERE semana_numero = v_semana_actual;
  
  v_result := json_build_object(
    'total_inversion', v_total_inversion,
    'partners_activos', v_partners_activos,
    'total_inversores', v_total_inversores,
    'semana_actual', v_semana_actual,
    'ganancia_semanal_actual', v_ganancia_semanal_actual
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función corregida para configurar semanas
CREATE OR REPLACE FUNCTION configurar_semana_sistema(
  p_semana_numero INTEGER,
  p_fecha_inicio DATE,
  p_admin_id UUID
) RETURNS JSON AS $$
DECLARE
  v_fecha_fin DATE;
  v_result JSON;
BEGIN
  -- Calcular fecha fin (6 días después del inicio)
  v_fecha_fin := p_fecha_inicio + INTERVAL '6 days';
  
  -- Actualizar o insertar configuración de semana actual
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
  VALUES ('semana_actual', p_semana_numero::TEXT, 'Número de semana actual del sistema', p_admin_id, NOW())
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = p_semana_numero::TEXT,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
  -- Actualizar o insertar fecha de inicio
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
  VALUES ('fecha_inicio_semana', p_fecha_inicio::TEXT, 'Fecha de inicio de la semana actual', p_admin_id, NOW())
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = p_fecha_inicio::TEXT,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
  -- Actualizar o insertar fecha de fin
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
  VALUES ('fecha_fin_semana', v_fecha_fin::TEXT, 'Fecha de fin de la semana actual', p_admin_id, NOW())
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = v_fecha_fin::TEXT,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
  -- Insertar configuración de porcentaje para inversores si no existe
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
  VALUES ('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores', p_admin_id, NOW())
  ON CONFLICT (clave) DO NOTHING;
  
  -- Crear o actualizar registro en ganancias_semanales si no existe
  INSERT INTO ganancias_semanales (
    semana_numero, 
    fecha_inicio, 
    fecha_fin,
    total_inversion,
    procesado
  )
  VALUES (
    p_semana_numero,
    p_fecha_inicio,
    v_fecha_fin,
    0,
    false
  )
  ON CONFLICT (semana_numero) 
  DO UPDATE SET 
    fecha_inicio = p_fecha_inicio,
    fecha_fin = v_fecha_fin;
  
  v_result := json_build_object(
    'success', true,
    'semana', p_semana_numero,
    'fecha_inicio', p_fecha_inicio,
    'fecha_fin', v_fecha_fin
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener distribución de partners con cálculo CORREGIDO según especificaciones exactas
CREATE OR REPLACE FUNCTION obtener_distribucion_partners(
  p_ganancia_partners NUMERIC
) RETURNS JSON AS $$
DECLARE
  v_partner RECORD;
  v_inversores RECORD;
  v_ganancia_propia NUMERIC;
  v_ganancia_comision NUMERIC;
  v_ganancia_operador NUMERIC;
  v_ganancia_total NUMERIC;
  v_porcentaje_ganancia NUMERIC := 5; -- 5% fijo
  v_porcentaje_inversores NUMERIC;
  v_result JSON[];
  v_partner_result JSON;
BEGIN
  -- Obtener porcentaje para inversores
  SELECT COALESCE(valor::NUMERIC, 70) INTO v_porcentaje_inversores
  FROM configuracion_sistema WHERE clave = 'porcentaje_inversores';
  
  v_result := ARRAY[]::JSON[];
  
  -- Iterar sobre todos los partners activos
  FOR v_partner IN 
    SELECT p.*, 
           COUNT(pi.inversor_id) as total_inversores,
           COALESCE(SUM(i.total), 0) as monto_total_inversores
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  LOOP
    -- Calcular ganancia propia del partner (5% de su inversión)
    v_ganancia_propia := (v_partner.inversion_inicial * v_porcentaje_ganancia) / 100;
    
    -- Inicializar ganancias por comisión
    v_ganancia_comision := 0;
    v_ganancia_operador := 0;
    
    -- Si es Partner + Operador
    IF v_partner.tipo = 'operador_partner' THEN
      -- Ganancia operador: 100% de su propia ganancia (5% de su inversión)
      v_ganancia_operador := v_ganancia_propia;
      
      -- Ganancia por comisión: 100% del 30% de ganancias de sus inversores
      FOR v_inversores IN
        SELECT i.total
        FROM partner_inversores pi
        JOIN inversores i ON pi.inversor_id = i.id
        WHERE pi.partner_id = v_partner.id
      LOOP
        DECLARE
          v_ganancia_inversor NUMERIC;
          v_parte_partners NUMERIC;
        BEGIN
          -- Ganancia del inversor (5% de su inversión)
          v_ganancia_inversor := (v_inversores.total * v_porcentaje_ganancia) / 100;
          -- 30% va para partners
          v_parte_partners := (v_ganancia_inversor * (100 - v_porcentaje_inversores)) / 100;
          
          -- Partner + Operador se lleva el 100% del 30%
          v_ganancia_comision := v_ganancia_comision + v_parte_partners;
        END;
      END LOOP;
      
    -- Si es solo Partner - FÓRMULA CORREGIDA
    ELSE
      -- Ganancia propia: 70% de su ganancia + (30% de su ganancia ÷ 3)
      -- Según especificación: $25 × 70% = $17.5 + ($25 × 30% ÷ 3) = $17.5 + $2.5 = $20
      v_ganancia_operador := (v_ganancia_propia * v_porcentaje_inversores) / 100 + 
                            ((v_ganancia_propia * (100 - v_porcentaje_inversores)) / 100) / 3;
      
      -- Ganancia por comisión: (30% de ganancias de inversores) ÷ 3
      FOR v_inversores IN
        SELECT i.total
        FROM partner_inversores pi
        JOIN inversores i ON pi.inversor_id = i.id
        WHERE pi.partner_id = v_partner.id
      LOOP
        DECLARE
          v_ganancia_inversor NUMERIC;
          v_parte_partners NUMERIC;
          v_comision_partner NUMERIC;
        BEGIN
          -- Ganancia del inversor (5% de su inversión)
          v_ganancia_inversor := (v_inversores.total * v_porcentaje_ganancia) / 100;
          -- 30% va para partners
          v_parte_partners := (v_ganancia_inversor * (100 - v_porcentaje_inversores)) / 100;
          
          -- Partner normal: (30% ÷ 3) según especificación
          -- Ejemplo: $15 ÷ 3 = $5, $75 ÷ 3 = $25
          v_comision_partner := v_parte_partners / 3;
          v_ganancia_comision := v_ganancia_comision + v_comision_partner;
        END;
      END LOOP;
    END IF;
    
    v_ganancia_total := v_ganancia_operador + v_ganancia_comision;
    
    -- Construir resultado para este partner
    v_partner_result := json_build_object(
      'partner_id', v_partner.id,
      'nombre', v_partner.nombre,
      'tipo', v_partner.tipo,
      'porcentaje_comision', v_partner.porcentaje_comision,
      'porcentaje_especial', v_partner.porcentaje_especial,
      'inversion_inicial', v_partner.inversion_inicial,
      'total_inversores', v_partner.total_inversores,
      'monto_total_inversores', v_partner.monto_total_inversores,
      'ganancia_propia', v_ganancia_propia,
      'ganancia_comision', v_ganancia_comision,
      'ganancia_operador', v_ganancia_operador,
      'ganancia_total', v_ganancia_total
    );
    
    v_result := v_result || v_partner_result;
  END LOOP;
  
  RETURN array_to_json(v_result);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener distribución de inversores con cálculo detallado
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(
  p_ganancia_inversores NUMERIC
) RETURNS JSON AS $$
DECLARE
  v_inversor RECORD;
  v_porcentaje_ganancia NUMERIC := 5; -- 5% fijo
  v_porcentaje_inversores NUMERIC;
  v_ganancia_individual NUMERIC;
  v_result JSON[];
  v_inversor_result JSON;
BEGIN
  -- Obtener porcentaje para inversores
  SELECT COALESCE(valor::NUMERIC, 70) INTO v_porcentaje_inversores
  FROM configuracion_sistema WHERE clave = 'porcentaje_inversores';
  
  v_result := ARRAY[]::JSON[];
  
  -- Iterar sobre todos los inversores
  FOR v_inversor IN 
    SELECT id, nombre, apellido, email, total
    FROM inversores
    WHERE total > 0
  LOOP
    -- Calcular ganancia individual: porcentaje_inversores% del 5% de su inversión
    v_ganancia_individual := (v_inversor.total * v_porcentaje_ganancia * v_porcentaje_inversores) / 10000;
    
    -- Construir resultado para este inversor
    v_inversor_result := json_build_object(
      'inversor_id', v_inversor.id,
      'nombre', v_inversor.nombre,
      'apellido', v_inversor.apellido,
      'email', v_inversor.email,
      'inversion', v_inversor.total,
      'porcentaje_ganancia', v_porcentaje_ganancia,
      'porcentaje_inversor', v_porcentaje_inversores,
      'ganancia_individual', v_ganancia_individual
    );
    
    v_result := v_result || v_inversor_result;
  END LOOP;
  
  RETURN array_to_json(v_result);
END;
$$ LANGUAGE plpgsql;

-- Función para procesar ganancias semanales con cálculo CORREGIDO
CREATE OR REPLACE FUNCTION procesar_ganancias_semanales(
  p_porcentaje NUMERIC DEFAULT NULL,
  p_ganancia_bruta NUMERIC DEFAULT NULL,
  p_admin_id UUID
) RETURNS JSON AS $$
DECLARE
  v_semana_actual INTEGER;
  v_total_inversion NUMERIC;
  v_ganancia_bruta NUMERIC;
  v_porcentaje_ganancia NUMERIC;
  v_porcentaje_inversores NUMERIC;
  v_ganancia_partners NUMERIC;
  v_ganancia_inversores NUMERIC;
  v_partner RECORD;
  v_inversor RECORD;
  v_result JSON;
BEGIN
  -- Obtener semana actual
  SELECT COALESCE(valor::INTEGER, 1) INTO v_semana_actual
  FROM configuracion_sistema WHERE clave = 'semana_actual';
  
  -- Obtener porcentaje para inversores
  SELECT COALESCE(valor::NUMERIC, 70) INTO v_porcentaje_inversores
  FROM configuracion_sistema WHERE clave = 'porcentaje_inversores';
  
  -- Calcular total de inversión
  v_total_inversion := calcular_total_inversion_actualizado();
  
  -- Determinar ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
    v_porcentaje_ganancia := (p_ganancia_bruta * 100) / v_total_inversion;
  ELSE
    v_porcentaje_ganancia := p_porcentaje;
    v_ganancia_bruta := (v_total_inversion * p_porcentaje) / 100;
  END IF;
  
  -- Calcular distribución
  v_ganancia_partners := (v_ganancia_bruta * (100 - v_porcentaje_inversores)) / 100;
  v_ganancia_inversores := (v_ganancia_bruta * v_porcentaje_inversores) / 100;
  
  -- Guardar configuración de porcentaje de ganancia
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by, updated_at)
  VALUES ('porcentaje_ganancia_general', v_porcentaje_ganancia::TEXT, 'Porcentaje de ganancia general aplicado', p_admin_id, NOW())
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = v_porcentaje_ganancia::TEXT,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
  -- Actualizar registro de ganancias semanales
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion,
    porcentaje_ganancia, ganancia_bruta, ganancia_partners, ganancia_inversores,
    procesado, fecha_procesado, procesado_por
  )
  VALUES (
    v_semana_actual, CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', v_total_inversion,
    v_porcentaje_ganancia, v_ganancia_bruta, v_ganancia_partners, v_ganancia_inversores,
    true, NOW(), p_admin_id
  )
  ON CONFLICT (semana_numero)
  DO UPDATE SET
    total_inversion = v_total_inversion,
    porcentaje_ganancia = v_porcentaje_ganancia,
    ganancia_bruta = v_ganancia_bruta,
    ganancia_partners = v_ganancia_partners,
    ganancia_inversores = v_ganancia_inversores,
    procesado = true,
    fecha_procesado = NOW(),
    procesado_por = p_admin_id;
  
  -- Procesar ganancias de partners con FÓRMULA CORREGIDA
  FOR v_partner IN
    SELECT p.*, 
           COUNT(pi.inversor_id) as total_inversores,
           COALESCE(SUM(i.total), 0) as monto_total_inversores
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  LOOP
    DECLARE
      v_ganancia_propia NUMERIC;
      v_ganancia_comision NUMERIC := 0;
      v_ganancia_operador NUMERIC := 0;
      v_ganancia_total NUMERIC;
      v_inversores RECORD;
    BEGIN
      -- Ganancia propia del partner (5% de su inversión)
      v_ganancia_propia := (v_partner.inversion_inicial * v_porcentaje_ganancia) / 100;
      
      -- Calcular según tipo de partner
      IF v_partner.tipo = 'operador_partner' THEN
        -- Partner + Operador: 100% de su ganancia + 100% del 30% de sus inversores
        v_ganancia_operador := v_ganancia_propia;
        
        FOR v_inversores IN
          SELECT i.total
          FROM partner_inversores pi
          JOIN inversores i ON pi.inversor_id = i.id
          WHERE pi.partner_id = v_partner.id
        LOOP
          DECLARE
            v_ganancia_inversor NUMERIC;
            v_parte_partners NUMERIC;
          BEGIN
            v_ganancia_inversor := (v_inversores.total * v_porcentaje_ganancia) / 100;
            v_parte_partners := (v_ganancia_inversor * (100 - v_porcentaje_inversores)) / 100;
            v_ganancia_comision := v_ganancia_comision + v_parte_partners;
          END;
        END LOOP;
        
      ELSE
        -- Partner normal: FÓRMULA CORREGIDA
        -- 70% de su ganancia + (30% de su ganancia ÷ 3)
        v_ganancia_operador := (v_ganancia_propia * v_porcentaje_inversores) / 100 + 
                              ((v_ganancia_propia * (100 - v_porcentaje_inversores)) / 100) / 3;
        
        -- Comisión: (30% de ganancias de inversores) ÷ 3
        FOR v_inversores IN
          SELECT i.total
          FROM partner_inversores pi
          JOIN inversores i ON pi.inversor_id = i.id
          WHERE pi.partner_id = v_partner.id
        LOOP
          DECLARE
            v_ganancia_inversor NUMERIC;
            v_parte_partners NUMERIC;
            v_comision_partner NUMERIC;
          BEGIN
            v_ganancia_inversor := (v_inversores.total * v_porcentaje_ganancia) / 100;
            v_parte_partners := (v_ganancia_inversor * (100 - v_porcentaje_inversores)) / 100;
            -- Fórmula corregida: 30% ÷ 3
            v_comision_partner := v_parte_partners / 3;
            v_ganancia_comision := v_ganancia_comision + v_comision_partner;
          END;
        END LOOP;
      END IF;
      
      v_ganancia_total := v_ganancia_operador + v_ganancia_comision;
      
      -- Guardar ganancias del partner
      INSERT INTO partner_ganancias (
        partner_id, semana_numero, ganancia_total, ganancia_comision, ganancia_operador,
        total_inversores, monto_total_inversores
      )
      VALUES (
        v_partner.id, v_semana_actual, v_ganancia_total, v_ganancia_comision, v_ganancia_operador,
        v_partner.total_inversores, v_partner.monto_total_inversores
      )
      ON CONFLICT (partner_id, semana_numero)
      DO UPDATE SET
        ganancia_total = v_ganancia_total,
        ganancia_comision = v_ganancia_comision,
        ganancia_operador = v_ganancia_operador,
        total_inversores = v_partner.total_inversores,
        monto_total_inversores = v_partner.monto_total_inversores;
      
      -- Crear transacción para el partner
      INSERT INTO partner_transacciones (
        partner_id, monto, tipo, descripcion
      ) VALUES (
        v_partner.id, v_ganancia_total, 'ganancia', 
        'Ganancia Semana ' || v_semana_actual
      );
      
      -- Crear notificación para el partner
      INSERT INTO notificaciones (
        usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
      ) VALUES (
        v_partner.id, 'partner', 'Ganancias Procesadas',
        'Sus ganancias de la semana ' || v_semana_actual || ' han sido procesadas: $' || v_ganancia_total,
        'success'
      );
    END;
  END LOOP;
  
  -- Procesar ganancias de inversores
  FOR v_inversor IN
    SELECT id, nombre, apellido, total
    FROM inversores
    WHERE total > 0
  LOOP
    DECLARE
      v_ganancia_individual NUMERIC;
    BEGIN
      -- Calcular ganancia individual: porcentaje_inversores% del 5% de su inversión
      v_ganancia_individual := (v_inversor.total * v_porcentaje_ganancia * v_porcentaje_inversores) / 10000;
      
      -- Actualizar total del inversor
      UPDATE inversores 
      SET ganancia_semanal = v_ganancia_individual,
          total = total + v_ganancia_individual
      WHERE id = v_inversor.id;
      
      -- Crear transacción
      INSERT INTO transacciones (
        inversor_id, monto, tipo, descripcion
      ) VALUES (
        v_inversor.id, v_ganancia_individual, 'ganancia',
        'Ganancia Semana ' || v_semana_actual
      );
      
      -- Crear notificación
      INSERT INTO notificaciones (
        usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
      ) VALUES (
        v_inversor.id, 'inversor', 'Ganancias Procesadas',
        'Sus ganancias de la semana ' || v_semana_actual || ' han sido procesadas: $' || v_ganancia_individual,
        'success'
      );
    END;
  END LOOP;
  
  v_result := json_build_object(
    'success', true,
    'semana', v_semana_actual,
    'total_inversion', v_total_inversion,
    'ganancia_bruta', v_ganancia_bruta,
    'porcentaje_ganancia', v_porcentaje_ganancia,
    'ganancia_partners', v_ganancia_partners,
    'ganancia_inversores', v_ganancia_inversores
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Insertar configuraciones por defecto si no existen
INSERT INTO configuracion_sistema (clave, valor, descripcion) 
VALUES 
  ('semana_actual', '1', 'Número de semana actual del sistema'),
  ('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores'),
  ('porcentaje_ganancia_general', '5', 'Porcentaje de ganancia general aplicado')
ON CONFLICT (clave) DO NOTHING;