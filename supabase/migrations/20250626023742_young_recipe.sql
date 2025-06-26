/*
  # Triggers y datos iniciales
  
  1. Triggers para procesamiento automático
    - procesar_retiro_inversor: Procesar solicitudes de inversores
    - procesar_solicitud_partner: Procesar solicitudes de partners
    - crear_transaccion_inicial_partner: Crear transacción inicial
    
  2. Datos iniciales
    - Admin por defecto (KatanaRz)
    - Partners de ejemplo (Ale y Andrés)
    - Inversores de ejemplo
*/

-- =============================================
-- FUNCIONES PARA TRIGGERS
-- =============================================

-- Función para procesar solicitudes de inversores
CREATE OR REPLACE FUNCTION procesar_retiro_inversor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo procesar cuando cambia de pendiente a aprobado
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'retiro' THEN
    -- Descontar del total del inversor
    UPDATE inversores 
    SET total = total - NEW.monto
    WHERE id = NEW.inversor_id;
    
    -- Crear transacción de retiro
    INSERT INTO transacciones (
      inversor_id, monto, tipo, descripcion, fecha
    ) VALUES (
      NEW.inversor_id, NEW.monto, 'retiro', 'Retiro Aprobado', NEW.fecha_procesado
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.inversor_id, 'inversor', 'Retiro Aprobado',
      'Su retiro de $' || NEW.monto || ' USD ha sido aprobado y procesado.', 'success'
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
      inversor_id, monto, tipo, descripcion, fecha
    ) VALUES (
      NEW.inversor_id, NEW.monto, 'deposito', 'Depósito Aprobado', NEW.fecha_procesado
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.inversor_id, 'inversor', 'Depósito Aprobado',
      'Su depósito de $' || NEW.monto || ' USD ha sido aprobado y agregado a su cuenta.', 'success'
    );
  END IF;
  
  -- Procesar rechazos
  IF OLD.estado = 'pendiente' AND NEW.estado = 'rechazado' THEN
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.inversor_id, 'inversor',
      CASE WHEN NEW.tipo = 'deposito' THEN 'Depósito Rechazado' ELSE 'Retiro Rechazado' END,
      'Su ' || NEW.tipo || ' de $' || NEW.monto || ' USD ha sido rechazado. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
      'error'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Función para procesar solicitudes de partners
CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo procesar cuando cambia de pendiente a aprobado
  IF OLD.estado = 'pendiente' AND NEW.estado = 'aprobado' AND NEW.tipo = 'retiro' THEN
    -- Descontar de la inversión inicial del partner
    UPDATE partners 
    SET inversion_inicial = inversion_inicial - NEW.monto
    WHERE id = NEW.partner_id;
    
    -- Crear transacción de retiro
    INSERT INTO partner_transacciones (
      partner_id, monto, tipo, descripcion, fecha
    ) VALUES (
      NEW.partner_id, NEW.monto, 'retiro', 'Retiro Aprobado', NEW.fecha_procesado
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.partner_id, 'partner', 'Retiro Aprobado',
      'Su retiro de $' || NEW.monto || ' USD ha sido aprobado y procesado.', 'success'
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
      partner_id, monto, tipo, descripcion, fecha
    ) VALUES (
      NEW.partner_id, NEW.monto, 'deposito', 'Depósito Aprobado', NEW.fecha_procesado
    );
    
    -- Crear notificación
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.partner_id, 'partner', 'Depósito Aprobado',
      'Su depósito de $' || NEW.monto || ' USD ha sido aprobado y agregado a su cuenta.', 'success'
    );
  END IF;
  
  -- Procesar rechazos
  IF OLD.estado = 'pendiente' AND NEW.estado = 'rechazado' THEN
    INSERT INTO notificaciones (
      usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion
    ) VALUES (
      NEW.partner_id, 'partner',
      CASE WHEN NEW.tipo = 'deposito' THEN 'Depósito Rechazado' ELSE 'Retiro Rechazado' END,
      'Su ' || NEW.tipo || ' de $' || NEW.monto || ' USD ha sido rechazado. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
      'error'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Función para crear transacción inicial del partner
CREATE OR REPLACE FUNCTION crear_transaccion_inicial_partner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo crear transacción si tiene inversión inicial mayor a 0
  IF NEW.inversion_inicial > 0 THEN
    INSERT INTO partner_transacciones (
      partner_id, monto, tipo, descripcion, fecha
    ) VALUES (
      NEW.id, NEW.inversion_inicial, 'deposito', 'Depósito Inicial', NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================
-- CREAR TRIGGERS
-- =============================================

-- Trigger para solicitudes de inversores
CREATE TRIGGER trigger_procesar_solicitud_inversor
  AFTER UPDATE ON solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_retiro_inversor();

-- Trigger para solicitudes de partners
CREATE TRIGGER trigger_procesar_solicitud_partner
  AFTER UPDATE ON partner_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_partner();

-- Trigger para transacción inicial de partners
CREATE TRIGGER trigger_transaccion_inicial_partner
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION crear_transaccion_inicial_partner();

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Insertar admin por defecto (KatanaRz con contraseña especial)
INSERT INTO admins (
  username, password_hash, password_salt, role, nombre, email, is_active
) VALUES (
  'KatanaRz', 
  'special_admin_hash', 
  'special_admin_salt', 
  'admin', 
  'Administrador Principal', 
  'admin@cvmcapital.com', 
  true
);

-- Insertar partners de ejemplo
INSERT INTO partners (
  nombre, email, username, password_hash, password_salt, tipo, 
  porcentaje_comision, porcentaje_especial, inversion_inicial, activo
) VALUES 
  (
    'Ale', 
    'ale@cvmcapital.com', 
    'ale_partner', 
    'temp_hash_ale', 
    'temp_salt_ale', 
    'partner', 
    10, 
    0, 
    500, 
    true
  ),
  (
    'Andrés', 
    'andres@cvmcapital.com', 
    'andres_operador', 
    'temp_hash_andres', 
    'temp_salt_andres', 
    'operador_partner', 
    15, 
    20, 
    1000, 
    true
  );

-- Insertar inversores de ejemplo
INSERT INTO inversores (
  nombre, apellido, email, pregunta_secreta, respuesta_secreta, 
  password_hash, password_salt, total
) VALUES 
  (
    'Juan', 
    'Pérez', 
    'juan@example.com', 
    '¿Cuál es tu color favorito?', 
    'azul', 
    'temp_hash_juan', 
    'temp_salt_juan', 
    1000
  ),
  (
    'María', 
    'García', 
    'maria@example.com', 
    '¿En qué ciudad naciste?', 
    'madrid', 
    'temp_hash_maria', 
    'temp_salt_maria', 
    1500
  ),
  (
    'Carlos', 
    'López', 
    'carlos@example.com', 
    '¿Cuál es tu comida favorita?', 
    'pizza', 
    'temp_hash_carlos', 
    'temp_salt_carlos', 
    800
  ),
  (
    'Ana', 
    'Martínez', 
    'ana@example.com', 
    '¿Cómo se llama tu mascota?', 
    'luna', 
    'temp_hash_ana', 
    'temp_salt_ana', 
    1200
  );

-- Asignar inversores a partners
-- Ale (partner normal) tendrá a Juan y María
INSERT INTO partner_inversores (partner_id, inversor_id) 
SELECT p.id, i.id 
FROM partners p, inversores i 
WHERE p.username = 'ale_partner' AND i.email IN ('juan@example.com', 'maria@example.com');

-- Andrés (operador+partner) tendrá a Carlos y Ana
INSERT INTO partner_inversores (partner_id, inversor_id) 
SELECT p.id, i.id 
FROM partners p, inversores i 
WHERE p.username = 'andres_operador' AND i.email IN ('carlos@example.com', 'ana@example.com');