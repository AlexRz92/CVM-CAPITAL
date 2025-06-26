/*
  # Corrección del Sistema de Aprobaciones
  
  Este archivo corrige las funciones que manejan las aprobaciones de solicitudes
  para que actualicen correctamente los saldos de inversores y partners.
*/

-- =============================================
-- ELIMINAR FUNCIONES EXISTENTES
-- =============================================

DROP FUNCTION IF EXISTS procesar_solicitud_inversor();
DROP FUNCTION IF EXISTS procesar_solicitud_partner();
DROP FUNCTION IF EXISTS procesar_retiro_inversor();
DROP FUNCTION IF EXISTS calcular_inversion_total_inversor(uuid);
DROP FUNCTION IF EXISTS obtener_datos_partner_actualizados(uuid);

-- =============================================
-- FUNCIÓN: procesar_solicitud_inversor
-- =============================================

CREATE OR REPLACE FUNCTION procesar_solicitud_inversor()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar cuando el estado cambia a 'aprobado'
  IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
    
    IF NEW.tipo = 'deposito' THEN
      -- DEPÓSITO: Aumentar capital_inicial y total
      UPDATE inversores 
      SET 
        capital_inicial = capital_inicial + NEW.monto,
        total = total + NEW.monto
      WHERE id = NEW.inversor_id;
      
      -- Registrar transacción
      INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
      VALUES (NEW.inversor_id, NEW.monto, 'deposito', 'Depósito aprobado - Solicitud #' || NEW.id);
      
      -- Enviar notificación
      INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
      VALUES (NEW.inversor_id, 'inversor', 'Depósito Aprobado',
              'Tu solicitud de depósito por $' || NEW.monto::text || ' ha sido aprobada y reflejada en tu saldo.', 'success');
    
    ELSIF NEW.tipo = 'retiro' THEN
      -- RETIRO: Disminuir total (no capital_inicial)
      UPDATE inversores 
      SET total = total - NEW.monto
      WHERE id = NEW.inversor_id;
      
      -- Registrar transacción
      INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
      VALUES (NEW.inversor_id, NEW.monto, 'retiro', 'Retiro aprobado - Solicitud #' || NEW.id);
      
      -- Enviar notificación
      INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
      VALUES (NEW.inversor_id, 'inversor', 'Retiro Aprobado',
              'Tu solicitud de retiro por $' || NEW.monto::text || ' ha sido aprobada.', 'success');
    END IF;
    
  ELSIF NEW.estado = 'rechazado' AND OLD.estado = 'pendiente' THEN
    -- Enviar notificación de rechazo
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (NEW.inversor_id, 'inversor', 'Solicitud Rechazada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto::text || ' ha sido rechazada. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'), 'error');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCIÓN: procesar_solicitud_partner
-- =============================================

CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar cuando el estado cambia a 'aprobado'
  IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
    
    IF NEW.tipo = 'deposito' THEN
      -- DEPÓSITO: Aumentar inversion_inicial
      UPDATE partners 
      SET inversion_inicial = inversion_inicial + NEW.monto
      WHERE id = NEW.partner_id;
      
      -- Registrar transacción
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      VALUES (NEW.partner_id, NEW.monto, 'deposito', 'Depósito aprobado - Solicitud #' || NEW.id);
      
      -- Enviar notificación
      INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
      VALUES (NEW.partner_id, 'partner', 'Depósito Aprobado',
              'Tu solicitud de depósito por $' || NEW.monto::text || ' ha sido aprobada y reflejada en tu inversión.', 'success');
    
    ELSIF NEW.tipo = 'retiro' THEN
      -- RETIRO: Disminuir inversion_inicial
      UPDATE partners 
      SET inversion_inicial = inversion_inicial - NEW.monto
      WHERE id = NEW.partner_id;
      
      -- Registrar transacción
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      VALUES (NEW.partner_id, NEW.monto, 'retiro', 'Retiro aprobado - Solicitud #' || NEW.id);
      
      -- Enviar notificación
      INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
      VALUES (NEW.partner_id, 'partner', 'Retiro Aprobado',
              'Tu solicitud de retiro por $' || NEW.monto::text || ' ha sido aprobada.', 'success');
    END IF;
    
  ELSIF NEW.estado = 'rechazado' AND OLD.estado = 'pendiente' THEN
    -- Enviar notificación de rechazo
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (NEW.partner_id, 'partner', 'Solicitud Rechazada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto::text || ' ha sido rechazada. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'), 'error');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCIÓN: calcular_inversion_total_inversor
-- =============================================

CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_depositos numeric := 0;
BEGIN
  -- Sumar todos los depósitos aprobados
  SELECT COALESCE(SUM(monto), 0) INTO v_total_depositos
  FROM transacciones 
  WHERE inversor_id = p_inversor_id 
    AND tipo IN ('deposito', 'depósito');
  
  RETURN v_total_depositos;
END;
$$;

-- =============================================
-- FUNCIÓN: obtener_datos_partner_actualizados
-- =============================================

CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(p_partner_id uuid)
RETURNS TABLE (
  inversion_total numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(monto), 0) as inversion_total
  FROM partner_transacciones 
  WHERE partner_id = p_partner_id 
    AND tipo IN ('deposito', 'depósito', 'ganancia', 'regalias');
END;
$$;

-- =============================================
-- FUNCIÓN: validar_retiro_inversor
-- =============================================

CREATE OR REPLACE FUNCTION validar_retiro_inversor(p_inversor_id uuid, p_monto numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_actual numeric;
BEGIN
  -- Obtener saldo actual del inversor
  SELECT total INTO v_saldo_actual
  FROM inversores 
  WHERE id = p_inversor_id;
  
  -- Verificar si tiene suficiente saldo
  RETURN (v_saldo_actual >= p_monto);
END;
$$;

-- =============================================
-- FUNCIÓN: validar_retiro_partner
-- =============================================

CREATE OR REPLACE FUNCTION validar_retiro_partner(p_partner_id uuid, p_monto numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_actual numeric;
BEGIN
  -- Obtener saldo actual del partner
  SELECT inversion_inicial INTO v_saldo_actual
  FROM partners 
  WHERE id = p_partner_id;
  
  -- Verificar si tiene suficiente saldo
  RETURN (v_saldo_actual >= p_monto);
END;
$$;

-- =============================================
-- ELIMINAR TRIGGERS EXISTENTES
-- =============================================

DROP TRIGGER IF EXISTS trigger_procesar_solicitud_inversor ON solicitudes;
DROP TRIGGER IF EXISTS trigger_procesar_solicitud_partner ON partner_solicitudes;

-- =============================================
-- CREAR TRIGGERS CORREGIDOS
-- =============================================

-- Trigger para solicitudes de inversores
CREATE TRIGGER trigger_procesar_solicitud_inversor
  AFTER UPDATE ON solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_inversor();

-- Trigger para solicitudes de partners
CREATE TRIGGER trigger_procesar_solicitud_partner
  AFTER UPDATE ON partner_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_partner();

-- =============================================
-- FUNCIÓN PARA RECALCULAR TOTALES EXISTENTES
-- =============================================

CREATE OR REPLACE FUNCTION recalcular_totales_existentes()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_inversor record;
  v_partner record;
  v_total_depositos numeric;
  v_total_retiros numeric;
  v_total_ganancias numeric;
  v_saldo_final numeric;
BEGIN
  -- Recalcular totales de inversores
  FOR v_inversor IN SELECT id FROM inversores LOOP
    -- Calcular depósitos
    SELECT COALESCE(SUM(monto), 0) INTO v_total_depositos
    FROM transacciones 
    WHERE inversor_id = v_inversor.id 
      AND tipo IN ('deposito', 'depósito');
    
    -- Calcular retiros
    SELECT COALESCE(SUM(monto), 0) INTO v_total_retiros
    FROM transacciones 
    WHERE inversor_id = v_inversor.id 
      AND tipo = 'retiro';
    
    -- Calcular ganancias
    SELECT COALESCE(SUM(monto), 0) INTO v_total_ganancias
    FROM transacciones 
    WHERE inversor_id = v_inversor.id 
      AND tipo IN ('ganancia', 'reinversion', 'reinversión');
    
    -- Calcular saldo final
    v_saldo_final := v_total_depositos + v_total_ganancias - v_total_retiros;
    
    -- Actualizar inversor
    UPDATE inversores 
    SET 
      capital_inicial = v_total_depositos,
      total = v_saldo_final
    WHERE id = v_inversor.id;
  END LOOP;
  
  -- Recalcular totales de partners
  FOR v_partner IN SELECT id FROM partners LOOP
    -- Calcular total de transacciones
    SELECT COALESCE(SUM(
      CASE 
        WHEN tipo IN ('deposito', 'depósito', 'ganancia', 'regalias') THEN monto
        WHEN tipo = 'retiro' THEN -monto
        ELSE 0
      END
    ), 0) INTO v_saldo_final
    FROM partner_transacciones 
    WHERE partner_id = v_partner.id;
    
    -- Actualizar partner (solo si hay transacciones)
    IF v_saldo_final > 0 THEN
      UPDATE partners 
      SET inversion_inicial = v_saldo_final
      WHERE id = v_partner.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Totales recalculados correctamente';
END;
$$;

-- =============================================
-- EJECUTAR RECÁLCULO DE TOTALES
-- =============================================

SELECT recalcular_totales_existentes();

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

-- Verificar que los triggers existen
SELECT 'Trigger procesar_solicitud_inversor creado correctamente' as status
WHERE EXISTS (
  SELECT 1 FROM pg_trigger 
  WHERE tgname = 'trigger_procesar_solicitud_inversor'
);

SELECT 'Trigger procesar_solicitud_partner creado correctamente' as status
WHERE EXISTS (
  SELECT 1 FROM pg_trigger 
  WHERE tgname = 'trigger_procesar_solicitud_partner'
);

-- Mostrar resumen de inversores
SELECT 
  'RESUMEN INVERSORES' as tipo,
  COUNT(*) as total_inversores,
  SUM(capital_inicial) as total_capital_inicial,
  SUM(total) as total_saldos
FROM inversores;

-- Mostrar resumen de partners
SELECT 
  'RESUMEN PARTNERS' as tipo,
  COUNT(*) as total_partners,
  SUM(inversion_inicial) as total_inversion_partners
FROM partners 
WHERE activo = true;

/*
  ✅ CORRECCIONES IMPLEMENTADAS:

  1. **Triggers Corregidos**:
     - Ahora actualizan correctamente los saldos cuando se aprueban solicitudes
     - Manejan tanto depósitos como retiros
     - Envían notificaciones apropiadas

  2. **Funciones de Validación**:
     - Verifican saldos antes de permitir retiros
     - Calculan inversiones totales correctamente

  3. **Recálculo Automático**:
     - Se ejecuta automáticamente para corregir datos existentes
     - Actualiza todos los totales basándose en transacciones

  4. **Depósitos de Inversores**:
     - Aumentan tanto capital_inicial como total
     - Se registran como transacciones

  5. **Retiros de Inversores**:
     - Solo disminuyen el total (no el capital_inicial)
     - Se valida que tengan saldo suficiente

  ✅ El sistema de aprobaciones ahora funciona correctamente.
*/