/*
  # Corregir sistema de notificaciones y transacciones para partners

  1. Funciones para notificaciones automáticas
    - Notificaciones de aprobación/rechazo de solicitudes
    - Transacciones automáticas al aprobar solicitudes
    - Transacción inicial al crear partner

  2. Triggers para automatizar el proceso
    - Trigger en partner_solicitudes para notificaciones
    - Trigger en partners para transacción inicial

  3. Funciones auxiliares
    - Función para obtener datos del gráfico de torta
*/

-- Función para crear notificación a partner
CREATE OR REPLACE FUNCTION crear_notificacion_partner(
  p_partner_id UUID,
  p_titulo TEXT,
  p_mensaje TEXT,
  p_tipo TEXT DEFAULT 'info'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notificaciones (
    usuario_id,
    tipo_usuario,
    titulo,
    mensaje,
    tipo_notificacion
  ) VALUES (
    p_partner_id,
    'partner',
    p_titulo,
    p_mensaje,
    p_tipo
  );
END;
$$ LANGUAGE plpgsql;

-- Función para crear transacción de partner
CREATE OR REPLACE FUNCTION crear_transaccion_partner(
  p_partner_id UUID,
  p_monto NUMERIC,
  p_tipo TEXT,
  p_descripcion TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO partner_transacciones (
    partner_id,
    monto,
    tipo,
    descripcion
  ) VALUES (
    p_partner_id,
    p_monto,
    p_tipo,
    p_descripcion
  );
END;
$$ LANGUAGE plpgsql;

-- Función para procesar solicitudes de partners
CREATE OR REPLACE FUNCTION procesar_solicitud_partner() RETURNS TRIGGER AS $$
DECLARE
  partner_nombre TEXT;
BEGIN
  -- Solo procesar cuando cambia el estado a aprobado o rechazado
  IF OLD.estado = 'pendiente' AND NEW.estado IN ('aprobado', 'rechazado') THEN
    
    -- Obtener nombre del partner
    SELECT nombre INTO partner_nombre
    FROM partners
    WHERE id = NEW.partner_id;
    
    IF NEW.estado = 'aprobado' THEN
      -- Crear transacción
      PERFORM crear_transaccion_partner(
        NEW.partner_id,
        NEW.monto,
        NEW.tipo,
        CASE 
          WHEN NEW.tipo = 'deposito' THEN 'Depósito aprobado'
          WHEN NEW.tipo = 'retiro' THEN 'Retiro aprobado'
          ELSE 'Transacción aprobada'
        END
      );
      
      -- Actualizar inversión inicial del partner si es depósito
      IF NEW.tipo = 'deposito' THEN
        UPDATE partners 
        SET inversion_inicial = inversion_inicial + NEW.monto
        WHERE id = NEW.partner_id;
      ELSIF NEW.tipo = 'retiro' THEN
        UPDATE partners 
        SET inversion_inicial = GREATEST(0, inversion_inicial - NEW.monto)
        WHERE id = NEW.partner_id;
      END IF;
      
      -- Crear notificación de aprobación
      PERFORM crear_notificacion_partner(
        NEW.partner_id,
        CASE 
          WHEN NEW.tipo = 'deposito' THEN 'Depósito Aprobado'
          WHEN NEW.tipo = 'retiro' THEN 'Retiro Aprobado'
          ELSE 'Solicitud Aprobada'
        END,
        CASE 
          WHEN NEW.tipo = 'deposito' THEN 'Su depósito de $' || NEW.monto || ' ha sido aprobado y procesado exitosamente.'
          WHEN NEW.tipo = 'retiro' THEN 'Su retiro de $' || NEW.monto || ' ha sido aprobado y procesado exitosamente.'
          ELSE 'Su solicitud ha sido aprobada y procesada exitosamente.'
        END,
        'success'
      );
      
    ELSIF NEW.estado = 'rechazado' THEN
      -- Crear notificación de rechazo
      PERFORM crear_notificacion_partner(
        NEW.partner_id,
        CASE 
          WHEN NEW.tipo = 'deposito' THEN 'Depósito Rechazado'
          WHEN NEW.tipo = 'retiro' THEN 'Retiro Rechazado'
          ELSE 'Solicitud Rechazada'
        END,
        CASE 
          WHEN NEW.tipo = 'deposito' THEN 'Su depósito de $' || NEW.monto || ' ha sido rechazado. ' || COALESCE('Motivo: ' || NEW.motivo_rechazo, '')
          WHEN NEW.tipo = 'retiro' THEN 'Su retiro de $' || NEW.monto || ' ha sido rechazado. ' || COALESCE('Motivo: ' || NEW.motivo_rechazo, '')
          ELSE 'Su solicitud ha sido rechazada. ' || COALESCE('Motivo: ' || NEW.motivo_rechazo, '')
        END,
        'error'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para solicitudes de partners
DROP TRIGGER IF EXISTS trigger_procesar_solicitud_partner ON partner_solicitudes;
CREATE TRIGGER trigger_procesar_solicitud_partner
  AFTER UPDATE ON partner_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_partner();

-- Función para crear transacción inicial al crear partner
CREATE OR REPLACE FUNCTION crear_transaccion_inicial_partner() RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear transacción si hay inversión inicial
  IF NEW.inversion_inicial > 0 THEN
    PERFORM crear_transaccion_partner(
      NEW.id,
      NEW.inversion_inicial,
      'deposito',
      'Inversión inicial al crear cuenta'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para transacción inicial
DROP TRIGGER IF EXISTS trigger_transaccion_inicial_partner ON partners;
CREATE TRIGGER trigger_transaccion_inicial_partner
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION crear_transaccion_inicial_partner();

-- Función para obtener datos del gráfico de torta de partners
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id UUID)
RETURNS JSON AS $$
DECLARE
  total_depositos NUMERIC := 0;
  total_retiros NUMERIC := 0;
  total_reinversiones NUMERIC := 0;
  resultado JSON;
BEGIN
  -- Calcular totales por tipo de transacción
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'deposito' THEN monto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'retiro' THEN monto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'reinversion' THEN monto ELSE 0 END), 0)
  INTO total_depositos, total_retiros, total_reinversiones
  FROM partner_transacciones
  WHERE partner_id = p_partner_id;
  
  -- Construir JSON de respuesta
  resultado := json_build_array(
    json_build_object(
      'name', 'Depósitos',
      'value', total_depositos,
      'color', '#10b981'
    ),
    json_build_object(
      'name', 'Retiros', 
      'value', total_retiros,
      'color', '#ef4444'
    ),
    json_build_object(
      'name', 'Reinversiones',
      'value', total_reinversiones, 
      'color', '#3b82f6'
    )
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Actualizar transacciones existentes para partners que ya tienen inversión inicial
DO $$
DECLARE
  partner_record RECORD;
BEGIN
  FOR partner_record IN 
    SELECT id, inversion_inicial, nombre
    FROM partners 
    WHERE inversion_inicial > 0
    AND NOT EXISTS (
      SELECT 1 FROM partner_transacciones 
      WHERE partner_id = partners.id 
      AND descripcion = 'Inversión inicial al crear cuenta'
    )
  LOOP
    INSERT INTO partner_transacciones (
      partner_id,
      monto,
      tipo,
      descripcion,
      fecha
    ) VALUES (
      partner_record.id,
      partner_record.inversion_inicial,
      'deposito',
      'Inversión inicial al crear cuenta',
      NOW()
    );
  END LOOP;
END $$;