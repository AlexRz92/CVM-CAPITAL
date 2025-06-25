/*
  # Corregir descuento de retiros y seguimiento de inversión

  1. Trigger para descontar retiros aprobados de inversores
  2. Trigger para descontar retiros aprobados de partners
  3. Función para calcular inversión total basada en depósitos
  4. Actualizar triggers existentes
*/

-- Función para procesar retiros aprobados de inversores
CREATE OR REPLACE FUNCTION procesar_retiro_inversor()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar cuando cambia de pendiente a aprobado
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'retiro' THEN
    -- Descontar del total del inversor
    UPDATE inversores 
    SET total = total - NEW.monto
    WHERE id = NEW.inversor_id;
    
    -- Crear transacción de retiro
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
      'Retiro aprobado - Solicitud #' || NEW.id,
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
      'Su retiro de ' || NEW.monto || ' USD ha sido aprobado y procesado.',
      'success'
    );
  END IF;
  
  -- Procesar depósitos aprobados
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'deposito' THEN
    -- Sumar al total del inversor
    UPDATE inversores 
    SET total = total + NEW.monto
    WHERE id = NEW.inversor_id;
    
    -- Crear transacción de depósito
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
      'Depósito aprobado - Solicitud #' || NEW.id,
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
      'Su depósito de ' || NEW.monto || ' USD ha sido aprobado y agregado a su cuenta.',
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
      'Su ' || NEW.tipo || ' de ' || NEW.monto || ' USD ha sido rechazado. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
      'error'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para solicitudes de inversores
DROP TRIGGER IF EXISTS trigger_procesar_solicitud_inversor ON solicitudes;
CREATE TRIGGER trigger_procesar_solicitud_inversor
  AFTER UPDATE ON solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_retiro_inversor();

-- Función para procesar retiros aprobados de partners (actualizada)
CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar cuando cambia de pendiente a aprobado
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'retiro' THEN
    -- Descontar de la inversión inicial del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial - NEW.monto
    WHERE id = NEW.partner_id;
    
    -- Crear transacción de retiro
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
      'Retiro aprobado - Solicitud #' || NEW.id,
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
      'Su retiro de ' || NEW.monto || ' USD ha sido aprobado y procesado.',
      'success'
    );
  END IF;
  
  -- Procesar depósitos aprobados
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'deposito' THEN
    -- Sumar a la inversión inicial del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + NEW.monto
    WHERE id = NEW.partner_id;
    
    -- Crear transacción de depósito
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
      'Depósito aprobado - Solicitud #' || NEW.id,
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
      'Su depósito de ' || NEW.monto || ' USD ha sido aprobado y agregado a su cuenta.',
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
      'Su ' || NEW.tipo || ' de ' || NEW.monto || ' USD ha sido rechazado. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
      'error'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular inversión total de inversor basada en depósitos
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_depositos NUMERIC := 0;
BEGIN
  -- Sumar todos los depósitos aprobados
  SELECT COALESCE(SUM(monto), 0) INTO v_total_depositos
  FROM transacciones
  WHERE inversor_id = p_inversor_id 
    AND tipo IN ('deposito', 'depósito');
  
  RETURN v_total_depositos;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular inversión total de partner basada en depósitos
CREATE OR REPLACE FUNCTION calcular_inversion_total_partner(p_partner_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_depositos NUMERIC := 0;
BEGIN
  -- Sumar todos los depósitos (incluyendo inversión inicial)
  SELECT COALESCE(SUM(monto), 0) INTO v_total_depositos
  FROM partner_transacciones
  WHERE partner_id = p_partner_id 
    AND tipo IN ('deposito', 'depósito', 'inversion_inicial');
  
  RETURN v_total_depositos;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos actualizados de inversor
CREATE OR REPLACE FUNCTION obtener_datos_inversor_actualizados(p_inversor_id UUID)
RETURNS JSON AS $$
DECLARE
  v_inversor RECORD;
  v_inversion_total NUMERIC;
  v_result JSON;
BEGIN
  -- Obtener datos del inversor
  SELECT * INTO v_inversor
  FROM inversores
  WHERE id = p_inversor_id;
  
  -- Calcular inversión total basada en depósitos
  v_inversion_total := calcular_inversion_total_inversor(p_inversor_id);
  
  v_result := json_build_object(
    'id', v_inversor.id,
    'nombre', v_inversor.nombre,
    'apellido', v_inversor.apellido,
    'email', v_inversor.email,
    'capital_inicial', v_inversion_total, -- Ahora basado en depósitos
    'ganancia_semanal', v_inversor.ganancia_semanal,
    'total', v_inversor.total
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos actualizados de partner
CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(p_partner_id UUID)
RETURNS JSON AS $$
DECLARE
  v_partner RECORD;
  v_inversion_total NUMERIC;
  v_result JSON;
BEGIN
  -- Obtener datos del partner
  SELECT * INTO v_partner
  FROM partners
  WHERE id = p_partner_id;
  
  -- Calcular inversión total basada en depósitos
  v_inversion_total := calcular_inversion_total_partner(p_partner_id);
  
  v_result := json_build_object(
    'id', v_partner.id,
    'nombre', v_partner.nombre,
    'email', v_partner.email,
    'username', v_partner.username,
    'tipo', v_partner.tipo,
    'porcentaje_comision', v_partner.porcentaje_comision,
    'porcentaje_especial', v_partner.porcentaje_especial,
    'inversion_inicial', v_partner.inversion_inicial, -- Saldo actual
    'inversion_total', v_inversion_total -- Total invertido histórico
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;