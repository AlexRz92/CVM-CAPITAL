/*
  # Corregir estadísticas de admin y seguimiento de inversión

  1. Corregir función de estadísticas de admin
  2. Arreglar constraint de configuración del sistema
  3. Optimizar cálculos de inversión
  4. Simplificar descripciones de transacciones
*/

-- Primero, agregar constraint único si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'configuracion_sistema_clave_key'
  ) THEN
    ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_clave_key UNIQUE (clave);
  END IF;
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
  SELECT COALESCE(SUM(p.inversion_inicial), 0) INTO v_total_partners_capital
  FROM partners p
  WHERE p.activo = true;
  
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

-- Función actualizada para procesar retiros de inversores con descripción simplificada
CREATE OR REPLACE FUNCTION procesar_retiro_inversor()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar cuando cambia de pendiente a aprobado
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'retiro' THEN
    -- Descontar del total del inversor
    UPDATE inversores 
    SET total = total - NEW.monto
    WHERE id = NEW.inversor_id;
    
    -- Crear transacción de retiro con descripción simplificada
    INSERT INTO transacciones (
      inversor_id,
      monto,
      tipo,
      descripcion,
      fecha
    ) VALUES (
      NEW.inversor_id,
      NEW.monto,
      'retiro',
      'Retiro Aprobado',
      NEW.fecha_procesado
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id,
      tipo_usuario,
      titulo,
      mensaje,
      tipo_notificacion
    ) VALUES (
      NEW.inversor_id,
      'inversor',
      'Retiro Aprobado',
      'Su retiro de $' || NEW.monto || ' USD ha sido aprobado y procesado.',
      'success'
    );
  END IF;
  
  -- Procesar depósitos aprobados
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'deposito' THEN
    -- Sumar al total del inversor
    UPDATE inversores 
    SET total = total + NEW.monto
    WHERE id = NEW.inversor_id;
    
    -- Crear transacción de depósito con descripción simplificada
    INSERT INTO transacciones (
      inversor_id,
      monto,
      tipo,
      descripcion,
      fecha
    ) VALUES (
      NEW.inversor_id,
      NEW.monto,
      'deposito',
      'Depósito Aprobado',
      NEW.fecha_procesado
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id,
      tipo_usuario,
      titulo,
      mensaje,
      tipo_notificacion
    ) VALUES (
      NEW.inversor_id,
      'inversor',
      'Depósito Aprobado',
      'Su depósito de $' || NEW.monto || ' USD ha sido aprobado y agregado a su cuenta.',
      'success'
    );
  END IF;
  
  -- Procesar rechazos
  IF OLD.estado = 'pendiente' AND NEW.estado = 'rechazado' THEN
    -- Crear notificación de rechazo
    INSERT INTO notificaciones (
      usuario_id,
      tipo_usuario,
      titulo,
      mensaje,
      tipo_notificacion
    ) VALUES (
      NEW.inversor_id,
      'inversor',
      CASE 
        WHEN NEW.tipo = 'deposito' THEN 'Depósito Rechazado'
        ELSE 'Retiro Rechazado'
      END,
      'Su ' || NEW.tipo || ' de $' || NEW.monto || ' USD ha sido rechazado. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
      'error'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función actualizada para procesar solicitudes de partners con descripción simplificada
CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar cuando cambia de pendiente a aprobado
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'retiro' THEN
    -- Descontar de la inversión inicial del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial - NEW.monto
    WHERE id = NEW.partner_id;
    
    -- Crear transacción de retiro con descripción simplificada
    INSERT INTO partner_transacciones (
      partner_id,
      monto,
      tipo,
      descripcion,
      fecha
    ) VALUES (
      NEW.partner_id,
      NEW.monto,
      'retiro',
      'Retiro Aprobado',
      NEW.fecha_procesado
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id,
      tipo_usuario,
      titulo,
      mensaje,
      tipo_notificacion
    ) VALUES (
      NEW.partner_id,
      'partner',
      'Retiro Aprobado',
      'Su retiro de $' || NEW.monto || ' USD ha sido aprobado y procesado.',
      'success'
    );
  END IF;
  
  -- Procesar depósitos aprobados
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'deposito' THEN
    -- Sumar a la inversión inicial del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + NEW.monto
    WHERE id = NEW.partner_id;
    
    -- Crear transacción de depósito con descripción simplificada
    INSERT INTO partner_transacciones (
      partner_id,
      monto,
      tipo,
      descripcion,
      fecha
    ) VALUES (
      NEW.partner_id,
      NEW.monto,
      'deposito',
      'Depósito Aprobado',
      NEW.fecha_procesado
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id,
      tipo_usuario,
      titulo,
      mensaje,
      tipo_notificacion
    ) VALUES (
      NEW.partner_id,
      'partner',
      'Depósito Aprobado',
      'Su depósito de $' || NEW.monto || ' USD ha sido aprobado y agregado a su cuenta.',
      'success'
    );
  END IF;
  
  -- Procesar rechazos
  IF OLD.estado = 'pendiente' AND NEW.estado = 'rechazado' THEN
    -- Crear notificación de rechazo
    INSERT INTO notificaciones (
      usuario_id,
      tipo_usuario,
      titulo,
      mensaje,
      tipo_notificacion
    ) VALUES (
      NEW.partner_id,
      'partner',
      CASE 
        WHEN NEW.tipo = 'deposito' THEN 'Depósito Rechazado'
        ELSE 'Retiro Rechazado'
      END,
      'Su ' || NEW.tipo || ' de $' || NEW.monto || ' USD ha sido rechazado. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
      'error'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular total de inversión actualizado (corregida)
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

-- Función para crear transacción inicial del partner (corregida)
CREATE OR REPLACE FUNCTION crear_transaccion_inicial_partner()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear transacción si tiene inversión inicial mayor a 0
  IF NEW.inversion_inicial > 0 THEN
    INSERT INTO partner_transacciones (
      partner_id,
      monto,
      tipo,
      descripcion,
      fecha
    ) VALUES (
      NEW.id,
      NEW.inversion_inicial,
      'deposito',
      'Depósito Inicial',
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;