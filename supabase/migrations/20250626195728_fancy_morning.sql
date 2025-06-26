/*
  # Reset completo de la base de datos CVM Capital
  
  1. Eliminación de datos
    - Eliminar todos los datos de todas las tablas
    - Mantener solo el usuario admin principal
    
  2. Configuración inicial
    - Configurar semana actual en 1
    - Configurar porcentaje de inversores en 70%
    - Configurar fecha de inicio de semana
    
  3. Funciones RPC corregidas
    - Funciones de distribución con casting correcto
    - Función de procesamiento de ganancias optimizada
    - Funciones auxiliares para el sistema
    
  4. Triggers y funciones auxiliares
    - Triggers para transacciones automáticas
    - Funciones de validación
    - Funciones de cálculo
*/

-- =============================================
-- 1. ELIMINACIÓN COMPLETA DE DATOS
-- =============================================

-- Deshabilitar triggers temporalmente
SET session_replication_role = replica;

-- Eliminar datos en orden correcto (respetando foreign keys)
DELETE FROM notificaciones;
DELETE FROM tickets;
DELETE FROM avisos;
DELETE FROM partner_ganancias;
DELETE FROM ganancias_semanales;
DELETE FROM partner_transacciones;
DELETE FROM transacciones;
DELETE FROM partner_solicitudes;
DELETE FROM solicitudes;
DELETE FROM partner_inversores;
DELETE FROM partners;
DELETE FROM inversores;
DELETE FROM configuracion_sistema;

-- Mantener solo el admin principal
DELETE FROM admins WHERE username != 'KatanaRz';

-- Rehabilitar triggers
SET session_replication_role = DEFAULT;

-- =============================================
-- 2. CONFIGURACIÓN INICIAL DEL SISTEMA
-- =============================================

-- Insertar configuraciones básicas del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('semana_actual', '1', 'Número de semana actual del sistema'),
('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores'),
('fecha_inicio_semana', CURRENT_DATE::text, 'Fecha de inicio de la semana actual'),
('porcentaje_ganancia_base', '5', 'Porcentaje base de ganancia semanal');

-- =============================================
-- 3. FUNCIONES RPC CORREGIDAS
-- =============================================

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric);
DROP FUNCTION IF EXISTS obtener_distribucion_inversores(numeric);
DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid);
DROP FUNCTION IF EXISTS calcular_inversion_total_sistema();
DROP FUNCTION IF EXISTS obtener_datos_grafico_semanal();
DROP FUNCTION IF EXISTS obtener_datos_torta_partner(uuid);
DROP FUNCTION IF EXISTS obtener_datos_partner_actualizados(uuid);
DROP FUNCTION IF EXISTS validar_retiro_inversor(uuid, numeric);
DROP FUNCTION IF EXISTS validar_retiro_partner(uuid, numeric);

-- Función para calcular inversión total del sistema
CREATE OR REPLACE FUNCTION calcular_inversion_total_sistema()
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  total_inversores numeric := 0;
  total_partners numeric := 0;
BEGIN
  -- Sumar total de inversores
  SELECT COALESCE(SUM(total), 0) INTO total_inversores
  FROM inversores;
  
  -- Sumar inversión inicial de partners activos
  SELECT COALESCE(SUM(inversion_inicial), 0) INTO total_partners
  FROM partners
  WHERE activo = true;
  
  RETURN total_inversores + total_partners;
END;
$$;

-- Función para obtener distribución de partners con casting correcto
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
  WITH partner_stats AS (
    SELECT 
      p.id,
      p.nombre::text as nombre_text,
      p.tipo::text as tipo_text,
      p.porcentaje_comision,
      p.porcentaje_especial,
      p.inversion_inicial,
      COALESCE(COUNT(pi.inversor_id), 0)::integer as total_inversores,
      COALESCE(SUM(i.total), 0) as monto_total_inversores
    FROM partners p
    LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
    LEFT JOIN inversores i ON pi.inversor_id = i.id
    WHERE p.activo = true
    GROUP BY p.id, p.nombre, p.tipo, p.porcentaje_comision, p.porcentaje_especial, p.inversion_inicial
  )
  SELECT 
    ps.id,
    ps.nombre_text,
    ps.tipo_text,
    ps.porcentaje_comision,
    ps.porcentaje_especial,
    ps.inversion_inicial,
    ps.total_inversores,
    ps.monto_total_inversores,
    -- Ganancia como comisión (partner normal o parte partner de operador+partner)
    CASE 
      WHEN ps.tipo_text = 'operador_partner' THEN
        -- Operador+Partner: ganancia propia (70% de 5%) + 100% del 30% de sus inversores
        (ps.inversion_inicial * 0.05 * 0.70) + (ps.monto_total_inversores * 0.05 * 0.30)
      ELSE
        -- Partner normal: 70% de su ganancia propia + su % de comisión del 30% de sus inversores
        (ps.inversion_inicial * 0.05 * 0.70) + (ps.monto_total_inversores * 0.05 * 0.30 * (ps.porcentaje_comision / 100))
    END as ganancia_comision,
    -- Ganancia como operador (solo para operador+partner)
    CASE 
      WHEN ps.tipo_text = 'operador_partner' THEN
        -- Ganancia adicional como operador: su % especial del 30% de sus inversores
        (ps.monto_total_inversores * 0.05 * 0.30 * (ps.porcentaje_especial / 100))
      ELSE
        0
    END as ganancia_operador,
    -- Ganancia total
    CASE 
      WHEN ps.tipo_text = 'operador_partner' THEN
        -- Total para operador+partner: ganancia propia + comisión completa + operador
        (ps.inversion_inicial * 0.05 * 0.70) + 
        (ps.monto_total_inversores * 0.05 * 0.30) +
        (ps.monto_total_inversores * 0.05 * 0.30 * (ps.porcentaje_especial / 100))
      ELSE
        -- Total para partner normal: ganancia propia + comisión
        (ps.inversion_inicial * 0.05 * 0.70) + 
        (ps.monto_total_inversores * 0.05 * 0.30 * (ps.porcentaje_comision / 100))
    END as ganancia_total
  FROM partner_stats ps
  WHERE ps.inversion_inicial > 0 OR ps.total_inversores > 0
  ORDER BY ps.nombre_text;
END;
$$;

-- Función para obtener distribución de inversores con casting correcto
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores(p_ganancia_inversores numeric)
RETURNS TABLE (
  inversor_id uuid,
  nombre text,
  apellido text,
  email text,
  inversion numeric,
  porcentaje_ganancia numeric,
  porcentaje_inversor numeric,
  ganancia_individual numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nombre::text,
    i.apellido::text,
    i.email::text,
    i.total,
    5.0::numeric as porcentaje_ganancia,
    70.0::numeric as porcentaje_inversor,
    (i.total * 0.05 * 0.70)::numeric as ganancia_individual
  FROM inversores i
  WHERE i.total > 0
  ORDER BY i.total DESC;
END;
$$;

-- Función principal para procesar ganancias semanales
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
  v_ganancia_partners numeric;
  v_ganancia_inversores numeric;
  v_porcentaje_inversores numeric;
  v_fecha_inicio date;
  v_fecha_fin date;
  partner_record record;
  inversor_record record;
BEGIN
  -- Obtener configuración
  SELECT COALESCE(valor::integer, 1) INTO v_semana_actual
  FROM configuracion_sistema 
  WHERE clave = 'semana_actual';
  
  SELECT COALESCE(valor::numeric, 70) INTO v_porcentaje_inversores
  FROM configuracion_sistema 
  WHERE clave = 'porcentaje_inversores';

  -- Calcular total de inversión del sistema
  SELECT calcular_inversion_total_sistema() INTO v_total_inversion;

  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := (p_porcentaje * v_total_inversion) / 100;
  ELSE
    RAISE EXCEPTION 'Debe proporcionar porcentaje o ganancia bruta';
  END IF;

  -- Calcular distribución
  v_ganancia_partners := v_ganancia_bruta * ((100 - v_porcentaje_inversores) / 100);
  v_ganancia_inversores := v_ganancia_bruta * (v_porcentaje_inversores / 100);

  -- Calcular fechas de la semana
  v_fecha_inicio := CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::integer - 1);
  v_fecha_fin := v_fecha_inicio + 6;

  -- Insertar registro de ganancias semanales
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion,
    porcentaje_ganancia, ganancia_bruta, ganancia_partners,
    ganancia_inversores, procesado, fecha_procesado, procesado_por
  ) VALUES (
    v_semana_actual, v_fecha_inicio, v_fecha_fin, v_total_inversion,
    COALESCE(p_porcentaje, (v_ganancia_bruta * 100 / NULLIF(v_total_inversion, 0))),
    v_ganancia_bruta, v_ganancia_partners, v_ganancia_inversores,
    true, NOW(), p_admin_id
  );

  -- Procesar ganancias de partners
  FOR partner_record IN 
    SELECT * FROM obtener_distribucion_partners(v_ganancia_partners)
  LOOP
    -- Insertar ganancia del partner
    INSERT INTO partner_ganancias (
      partner_id, semana_numero, ganancia_total, ganancia_comision,
      ganancia_operador, total_inversores, monto_total_inversores
    ) VALUES (
      partner_record.partner_id, v_semana_actual, partner_record.ganancia_total,
      partner_record.ganancia_comision, partner_record.ganancia_operador,
      partner_record.total_inversores, partner_record.monto_total_inversores
    );

    -- Actualizar inversión del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial + partner_record.ganancia_total
    WHERE id = partner_record.partner_id;

    -- Crear transacción para el partner
    INSERT INTO partner_transacciones (
      partner_id, monto, tipo, descripcion
    ) VALUES (
      partner_record.partner_id, partner_record.ganancia_total, 'ganancia',
      'Ganancia semanal ' || v_semana_actual || ' - ' || 
      CASE 
        WHEN partner_record.tipo = 'operador_partner' THEN 'Operador + Partner'
        ELSE 'Partner'
      END
    );

    -- Crear notificación para el partner
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      partner_record.partner_id, 'partner',
      'Ganancia Semanal Procesada',
      'Se ha procesado tu ganancia de la semana ' || v_semana_actual || 
      '. Monto: $' || ROUND(partner_record.ganancia_total, 2)::text,
      'success'
    );
  END LOOP;

  -- Procesar ganancias de inversores
  FOR inversor_record IN 
    SELECT * FROM obtener_distribucion_inversores(v_ganancia_inversores)
  LOOP
    -- Actualizar total del inversor
    UPDATE inversores 
    SET 
      ganancia_semanal = inversor_record.ganancia_individual,
      total = total + inversor_record.ganancia_individual
    WHERE id = inversor_record.inversor_id;

    -- Crear transacción para el inversor
    INSERT INTO transacciones (
      inversor_id, monto, tipo, descripcion
    ) VALUES (
      inversor_record.inversor_id, inversor_record.ganancia_individual, 'ganancia',
      'Ganancia semanal ' || v_semana_actual
    );

    -- Crear notificación para el inversor
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      inversor_record.inversor_id, 'inversor',
      'Ganancia Semanal Procesada',
      'Se ha procesado tu ganancia de la semana ' || v_semana_actual || 
      '. Monto: $' || ROUND(inversor_record.ganancia_individual, 2)::text,
      'success'
    );
  END LOOP;

  -- Incrementar semana actual
  UPDATE configuracion_sistema 
  SET 
    valor = (v_semana_actual + 1)::text,
    updated_at = NOW(),
    updated_by = p_admin_id
  WHERE clave = 'semana_actual';

END;
$$;

-- =============================================
-- 4. FUNCIONES AUXILIARES
-- =============================================

-- Función para obtener datos del gráfico semanal
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS TABLE (
  week text,
  ganancia numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ('Sem ' || gs.semana_numero)::text as week,
    COALESCE(gs.ganancia_bruta, 0) as ganancia
  FROM ganancias_semanales gs
  WHERE gs.procesado = true
  ORDER BY gs.semana_numero DESC
  LIMIT 8;
END;
$$;

-- Función para obtener datos de la gráfica de torta del partner
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id uuid)
RETURNS TABLE (
  name text,
  value numeric,
  color text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH partner_data AS (
    SELECT 
      COALESCE(SUM(CASE WHEN pt.tipo = 'deposito' THEN pt.monto ELSE 0 END), 0) as depositos,
      COALESCE(SUM(CASE WHEN pt.tipo = 'retiro' THEN pt.monto ELSE 0 END), 0) as retiros,
      COALESCE(SUM(CASE WHEN pt.tipo = 'ganancia' THEN pt.monto ELSE 0 END), 0) as ganancias
    FROM partner_transacciones pt
    WHERE pt.partner_id = p_partner_id
  )
  SELECT 'Depósitos'::text, pd.depositos, '#10b981'::text FROM partner_data pd WHERE pd.depositos > 0
  UNION ALL
  SELECT 'Retiros'::text, pd.retiros, '#ef4444'::text FROM partner_data pd WHERE pd.retiros > 0
  UNION ALL
  SELECT 'Ganancias'::text, pd.ganancias, '#3b82f6'::text FROM partner_data pd WHERE pd.ganancias > 0;
END;
$$;

-- Función para obtener datos actualizados del partner
CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(p_partner_id uuid)
RETURNS TABLE (
  inversion_total numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN pt.tipo = 'deposito' THEN pt.monto ELSE 0 END), 0) as inversion_total
  FROM partner_transacciones pt
  WHERE pt.partner_id = p_partner_id;
END;
$$;

-- Función para validar retiro de inversor
CREATE OR REPLACE FUNCTION validar_retiro_inversor(p_inversor_id uuid, p_monto numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_actual numeric;
BEGIN
  SELECT COALESCE(total, 0) INTO v_saldo_actual
  FROM inversores
  WHERE id = p_inversor_id;
  
  RETURN p_monto <= v_saldo_actual;
END;
$$;

-- Función para validar retiro de partner
CREATE OR REPLACE FUNCTION validar_retiro_partner(p_partner_id uuid, p_monto numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_actual numeric;
BEGIN
  SELECT COALESCE(inversion_inicial, 0) INTO v_saldo_actual
  FROM partners
  WHERE id = p_partner_id;
  
  RETURN p_monto <= v_saldo_actual;
END;
$$;

-- =============================================
-- 5. FUNCIONES PARA TICKETS Y NOTIFICACIONES
-- =============================================

-- Función para crear ticket
CREATE OR REPLACE FUNCTION crear_ticket(
  p_usuario_id uuid,
  p_tipo_usuario text,
  p_titulo text,
  p_mensaje text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_existente record;
  v_nuevo_ticket record;
BEGIN
  -- Verificar si ya tiene un ticket abierto o respondido
  SELECT * INTO v_ticket_existente
  FROM tickets
  WHERE usuario_id = p_usuario_id 
    AND tipo_usuario = p_tipo_usuario
    AND estado IN ('abierto', 'respondido');
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ya tienes un ticket activo. Espera a que sea cerrado para crear uno nuevo.',
      'existing_ticket', row_to_json(v_ticket_existente)
    );
  END IF;
  
  -- Crear nuevo ticket
  INSERT INTO tickets (usuario_id, tipo_usuario, titulo, mensaje)
  VALUES (p_usuario_id, p_tipo_usuario, p_titulo, p_mensaje)
  RETURNING * INTO v_nuevo_ticket;
  
  RETURN json_build_object(
    'success', true,
    'ticket', row_to_json(v_nuevo_ticket)
  );
END;
$$;

-- Función para obtener ticket de usuario
CREATE OR REPLACE FUNCTION obtener_ticket_usuario(
  p_usuario_id uuid,
  p_tipo_usuario text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket record;
BEGIN
  SELECT 
    t.*,
    a.nombre as admin_nombre
  INTO v_ticket
  FROM tickets t
  LEFT JOIN admins a ON t.respondido_por = a.id
  WHERE t.usuario_id = p_usuario_id 
    AND t.tipo_usuario = p_tipo_usuario
    AND t.estado IN ('abierto', 'respondido')
  ORDER BY t.fecha_creacion DESC
  LIMIT 1;
  
  IF FOUND THEN
    RETURN json_build_object(
      'has_ticket', true,
      'ticket', row_to_json(v_ticket)
    );
  ELSE
    RETURN json_build_object(
      'has_ticket', false
    );
  END IF;
END;
$$;

-- =============================================
-- 6. TRIGGERS PARA TRANSACCIONES AUTOMÁTICAS
-- =============================================

-- Trigger para crear transacción inicial del partner
CREATE OR REPLACE FUNCTION crear_transaccion_inicial_partner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.inversion_inicial > 0 THEN
    INSERT INTO partner_transacciones (
      partner_id, monto, tipo, descripcion
    ) VALUES (
      NEW.id, NEW.inversion_inicial, 'deposito', 'Inversión inicial'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para procesar solicitudes de retiro de inversor
CREATE OR REPLACE FUNCTION procesar_retiro_inversor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'aprobado' y es un retiro
  IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' AND NEW.tipo = 'retiro' THEN
    -- Actualizar saldo del inversor
    UPDATE inversores 
    SET total = total - NEW.monto
    WHERE id = NEW.inversor_id;
    
    -- Crear transacción
    INSERT INTO transacciones (
      inversor_id, monto, tipo, descripcion
    ) VALUES (
      NEW.inversor_id, NEW.monto, 'retiro', 
      'Retiro aprobado - Solicitud #' || NEW.id
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.inversor_id, 'inversor',
      'Retiro Aprobado',
      'Tu solicitud de retiro por $' || NEW.monto || ' ha sido aprobada.',
      'success'
    );
  ELSIF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' AND NEW.tipo = 'deposito' THEN
    -- Actualizar saldo del inversor
    UPDATE inversores 
    SET total = total + NEW.monto
    WHERE id = NEW.inversor_id;
    
    -- Crear transacción
    INSERT INTO transacciones (
      inversor_id, monto, tipo, descripcion
    ) VALUES (
      NEW.inversor_id, NEW.monto, 'deposito', 
      'Depósito aprobado - Solicitud #' || NEW.id
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.inversor_id, 'inversor',
      'Depósito Aprobado',
      'Tu solicitud de depósito por $' || NEW.monto || ' ha sido aprobada.',
      'success'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para procesar solicitudes de partner
CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'aprobado'
  IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
    IF NEW.tipo = 'retiro' THEN
      -- Actualizar inversión del partner
      UPDATE partners 
      SET inversion_inicial = inversion_inicial - NEW.monto
      WHERE id = NEW.partner_id;
    ELSIF NEW.tipo = 'deposito' THEN
      -- Actualizar inversión del partner
      UPDATE partners 
      SET inversion_inicial = inversion_inicial + NEW.monto
      WHERE id = NEW.partner_id;
    END IF;
    
    -- Crear transacción
    INSERT INTO partner_transacciones (
      partner_id, monto, tipo, descripcion
    ) VALUES (
      NEW.partner_id, NEW.monto, NEW.tipo, 
      CASE 
        WHEN NEW.tipo = 'retiro' THEN 'Retiro aprobado - Solicitud #' || NEW.id
        ELSE 'Depósito aprobado - Solicitud #' || NEW.id
      END
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.partner_id, 'partner',
      CASE 
        WHEN NEW.tipo = 'retiro' THEN 'Retiro Aprobado'
        ELSE 'Depósito Aprobado'
      END,
      'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada.',
      'success'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================
-- 7. RECREAR TRIGGERS
-- =============================================

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_transaccion_inicial_partner ON partners;
DROP TRIGGER IF EXISTS trigger_procesar_solicitud_inversor ON solicitudes;
DROP TRIGGER IF EXISTS trigger_procesar_solicitud_partner ON partner_solicitudes;

-- Crear triggers
CREATE TRIGGER trigger_transaccion_inicial_partner
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION crear_transaccion_inicial_partner();

CREATE TRIGGER trigger_procesar_solicitud_inversor
  AFTER UPDATE ON solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_retiro_inversor();

CREATE TRIGGER trigger_procesar_solicitud_partner
  AFTER UPDATE ON partner_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_partner();

-- =============================================
-- 8. VERIFICACIÓN FINAL
-- =============================================

-- Verificar que el admin principal existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE username = 'KatanaRz') THEN
    RAISE EXCEPTION 'Admin principal no encontrado. La base de datos no se puede resetear sin el admin.';
  END IF;
END;
$$;

-- Mensaje de confirmación
SELECT 'Base de datos reseteada correctamente. Sistema listo para usar.' as status;