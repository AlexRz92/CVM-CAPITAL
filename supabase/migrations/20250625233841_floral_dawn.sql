/*
  # Corregir panel de administración y validaciones

  1. Funciones para validaciones de retiro
  2. Función para configurar semanas correctamente
  3. Función para obtener datos del panel de administración
  4. Función para calcular total de inversión actualizado
  5. Función para obtener ganancias semanales actuales
*/

-- Función para validar retiros de inversores
CREATE OR REPLACE FUNCTION validar_retiro_inversor(
  p_inversor_id UUID,
  p_monto NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_saldo_actual NUMERIC;
BEGIN
  -- Obtener el saldo actual del inversor
  SELECT total INTO v_saldo_actual
  FROM inversores
  WHERE id = p_inversor_id;
  
  -- Verificar si tiene saldo suficiente
  RETURN (v_saldo_actual >= p_monto);
END;
$$ LANGUAGE plpgsql;

-- Función para validar retiros de partners
CREATE OR REPLACE FUNCTION validar_retiro_partner(
  p_partner_id UUID,
  p_monto NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_saldo_actual NUMERIC;
BEGIN
  -- Obtener el saldo actual del partner
  SELECT inversion_inicial INTO v_saldo_actual
  FROM partners
  WHERE id = p_partner_id;
  
  -- Verificar si tiene saldo suficiente
  RETURN (v_saldo_actual >= p_monto);
END;
$$ LANGUAGE plpgsql;

-- Función para configurar semanas correctamente
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
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
  VALUES ('semana_actual', p_semana_numero::TEXT, 'Número de semana actual del sistema', p_admin_id)
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = p_semana_numero::TEXT,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
  -- Actualizar o insertar fecha de inicio
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
  VALUES ('fecha_inicio_semana', p_fecha_inicio::TEXT, 'Fecha de inicio de la semana actual', p_admin_id)
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = p_fecha_inicio::TEXT,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
  -- Actualizar o insertar fecha de fin
  INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_by)
  VALUES ('fecha_fin_semana', v_fecha_fin::TEXT, 'Fecha de fin de la semana actual', p_admin_id)
  ON CONFLICT (clave) 
  DO UPDATE SET 
    valor = v_fecha_fin::TEXT,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
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

-- Función para obtener estadísticas del panel de administración
CREATE OR REPLACE FUNCTION obtener_estadisticas_admin()
RETURNS JSON AS $$
DECLARE
  v_total_inversion NUMERIC := 0;
  v_partners_activos INTEGER := 0;
  v_total_inversores INTEGER := 0;
  v_semana_actual INTEGER := 1;
  v_ganancia_semanal_actual NUMERIC := 0;
  v_result JSON;
BEGIN
  -- Calcular total de inversión real
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversion
  FROM inversores;
  
  -- Sumar inversión inicial de partners
  SELECT COALESCE(SUM(inversion_inicial), 0) INTO v_total_inversion
  FROM (
    SELECT COALESCE(SUM(total), 0) as total FROM inversores
    UNION ALL
    SELECT COALESCE(SUM(inversion_inicial), 0) as total FROM partners WHERE activo = true
  ) as totales;
  
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

-- Función actualizada para calcular total de inversión
CREATE OR REPLACE FUNCTION calcular_total_inversion_actualizado()
RETURNS NUMERIC AS $$
DECLARE
  v_total_inversores NUMERIC := 0;
  v_total_partners NUMERIC := 0;
  v_total_final NUMERIC := 0;
BEGIN
  -- Sumar total de todos los inversores
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversores
  FROM inversores;
  
  -- Sumar inversión inicial de partners activos
  SELECT COALESCE(SUM(inversion_inicial), 0) INTO v_total_partners
  FROM partners
  WHERE activo = true;
  
  v_total_final := v_total_inversores + v_total_partners;
  
  RETURN v_total_final;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos de torta de partner
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id UUID)
RETURNS JSON AS $$
DECLARE
  v_depositos NUMERIC := 0;
  v_retiros NUMERIC := 0;
  v_reinversiones NUMERIC := 0;
  v_result JSON;
BEGIN
  -- Calcular depósitos
  SELECT COALESCE(SUM(monto), 0) INTO v_depositos
  FROM partner_transacciones
  WHERE partner_id = p_partner_id 
    AND tipo IN ('deposito', 'depósito', 'inversion_inicial');
  
  -- Calcular retiros
  SELECT COALESCE(SUM(monto), 0) INTO v_retiros
  FROM partner_transacciones
  WHERE partner_id = p_partner_id 
    AND tipo = 'retiro';
  
  -- Calcular reinversiones
  SELECT COALESCE(SUM(monto), 0) INTO v_reinversiones
  FROM partner_transacciones
  WHERE partner_id = p_partner_id 
    AND tipo IN ('reinversion', 'reinversión', 'ganancia');
  
  v_result := json_build_array(
    json_build_object('name', 'Depósitos', 'value', v_depositos, 'color', '#10b981'),
    json_build_object('name', 'Retiros', 'value', v_retiros, 'color', '#ef4444'),
    json_build_object('name', 'Reinversiones', 'value', v_reinversiones, 'color', '#3b82f6')
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;