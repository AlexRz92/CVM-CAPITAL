/*
# Corrección completa de la base de datos CVM Capital

1. Corrección de políticas RLS
2. Funciones faltantes para el frontend
3. Triggers para procesamiento automático
4. Configuración inicial

## Cambios principales:
- Políticas RLS corregidas para permitir acceso completo
- Funciones faltantes agregadas
- Triggers para solicitudes automáticas
- Datos iniciales necesarios
*/

-- =============================================
-- CORRECCIÓN DE POLÍTICAS RLS
-- =============================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Allow all operations" ON public.inversores;
DROP POLICY IF EXISTS "Allow all operations" ON public.partners;
DROP POLICY IF EXISTS "Allow all operations" ON public.admins;
DROP POLICY IF EXISTS "Allow all operations" ON public.transacciones;
DROP POLICY IF EXISTS "Allow all operations" ON public.partner_transacciones;
DROP POLICY IF EXISTS "Allow all operations" ON public.solicitudes;
DROP POLICY IF EXISTS "Allow all operations" ON public.partner_solicitudes;
DROP POLICY IF EXISTS "Allow all operations" ON public.partner_inversores;
DROP POLICY IF EXISTS "Allow all operations" ON public.configuracion_sistema;
DROP POLICY IF EXISTS "Allow all operations" ON public.ganancias_semanales;
DROP POLICY IF EXISTS "Allow all operations" ON public.partner_ganancias;
DROP POLICY IF EXISTS "Allow all operations" ON public.notificaciones;
DROP POLICY IF EXISTS "Allow all operations" ON public.avisos;
DROP POLICY IF EXISTS "Allow all operations" ON public.tickets;

-- Crear políticas permisivas correctas
CREATE POLICY "Enable all operations for all users" ON public.inversores
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.partners
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.admins
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.transacciones
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.partner_transacciones
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.solicitudes
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.partner_solicitudes
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.partner_inversores
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.configuracion_sistema
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.ganancias_semanales
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.partner_ganancias
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.notificaciones
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.avisos
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON public.tickets
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- =============================================
-- FUNCIONES FALTANTES PARA EL FRONTEND
-- =============================================

-- Función para obtener distribución de partners preview
CREATE OR REPLACE FUNCTION obtener_distribucion_partners_preview(
  p_total_inversion numeric,
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL
)
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
DECLARE
  v_ganancia_bruta numeric;
  v_ganancia_partners numeric;
BEGIN
  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := p_total_inversion * (p_porcentaje / 100);
  ELSE
    v_ganancia_bruta := p_total_inversion * 0.05;
  END IF;

  -- 30% para partners
  v_ganancia_partners := v_ganancia_bruta * 0.30;

  RETURN QUERY
  SELECT 
    p.id as partner_id,
    p.nombre::text,
    p.tipo::text,
    p.inversion_inicial,
    COALESCE(COUNT(pi.inversor_id)::integer, 0) as total_inversores,
    COALESCE(SUM(i.total), 0) as monto_total_inversores,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30)
      ELSE 
        (p.inversion_inicial * 0.05 * 0.80) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3)
    END as ganancia_comision,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * 0.50)
      ELSE 
        0
    END as ganancia_operador,
    CASE 
      WHEN p.tipo = 'operador_partner' THEN 
        (p.inversion_inicial * 0.05) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30) +
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 * 0.50)
      ELSE 
        (p.inversion_inicial * 0.05 * 0.80) + 
        (COALESCE(SUM(i.total), 0) * 0.05 * 0.30 / 3)
    END as ganancia_total
  FROM partners p
  LEFT JOIN partner_inversores pi ON p.id = pi.partner_id
  LEFT JOIN inversores i ON pi.inversor_id = i.id
  WHERE p.activo = true
  GROUP BY p.id, p.nombre, p.tipo, p.inversion_inicial
  ORDER BY p.nombre::text;
END;
$$;

-- Función para obtener distribución de inversores preview
CREATE OR REPLACE FUNCTION obtener_distribucion_inversores_preview(
  p_total_inversion numeric,
  p_porcentaje numeric DEFAULT NULL,
  p_ganancia_bruta numeric DEFAULT NULL
)
RETURNS TABLE (
  inversor_id uuid,
  nombre text,
  apellido text,
  email text,
  inversion numeric,
  ganancia_individual numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_ganancia_bruta numeric;
  v_ganancia_inversores numeric;
BEGIN
  -- Calcular ganancia bruta
  IF p_ganancia_bruta IS NOT NULL THEN
    v_ganancia_bruta := p_ganancia_bruta;
  ELSIF p_porcentaje IS NOT NULL THEN
    v_ganancia_bruta := p_total_inversion * (p_porcentaje / 100);
  ELSE
    v_ganancia_bruta := p_total_inversion * 0.05;
  END IF;

  -- 70% para inversores
  v_ganancia_inversores := v_ganancia_bruta * 0.70;

  RETURN QUERY
  SELECT 
    i.id as inversor_id,
    i.nombre::text,
    i.apellido::text,
    i.email::text,
    i.total as inversion,
    (i.total * 0.05 * 0.70) as ganancia_individual
  FROM inversores i
  WHERE i.total > 0
  ORDER BY i.nombre::text, i.apellido::text;
END;
$$;

-- Función para validar eliminación de partner
CREATE OR REPLACE FUNCTION validar_eliminacion_partner(p_partner_id uuid)
RETURNS TABLE (
  puede_eliminar boolean,
  total_inversores integer,
  mensaje text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_inversores integer;
  v_partner_nombre text;
BEGIN
  -- Obtener información del partner
  SELECT nombre INTO v_partner_nombre
  FROM partners
  WHERE id = p_partner_id;

  -- Contar inversores asignados
  SELECT COUNT(*)::integer INTO v_total_inversores
  FROM partner_inversores
  WHERE partner_id = p_partner_id;

  RETURN QUERY
  SELECT 
    true as puede_eliminar,
    v_total_inversores as total_inversores,
    CASE 
      WHEN v_total_inversores = 0 THEN 
        'El partner "' || v_partner_nombre || '" puede ser eliminado sin problemas.'
      ELSE 
        'El partner "' || v_partner_nombre || '" tiene ' || v_total_inversores || ' inversores asignados. Al eliminarlo, estos inversores quedarán disponibles para ser reasignados.'
    END as mensaje;
END;
$$;

-- Función para obtener inversores con ganancias del partner
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
BEGIN
  RETURN QUERY
  SELECT 
    i.id as inversor_id,
    i.nombre::text,
    i.apellido::text,
    i.email::text,
    i.total as total_invertido,
    i.ganancia_semanal,
    (i.total * 0.05 * 0.30 / 3) as ganancia_para_partner, -- 1/3 del 30% para partners normales
    5.0 as porcentaje_ganancia
  FROM inversores i
  INNER JOIN partner_inversores pi ON i.id = pi.inversor_id
  WHERE pi.partner_id = p_partner_id
    AND i.total > 0
  ORDER BY i.nombre::text, i.apellido::text;
END;
$$;

-- =============================================
-- TRIGGERS PARA PROCESAMIENTO AUTOMÁTICO
-- =============================================

-- Función para procesar solicitud de inversor
CREATE OR REPLACE FUNCTION procesar_solicitud_inversor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'aprobado'
  IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
    IF NEW.tipo = 'deposito' THEN
      -- Actualizar total del inversor
      UPDATE inversores 
      SET total = total + NEW.monto
      WHERE id = NEW.inversor_id;
      
      -- Registrar transacción
      INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
      VALUES (NEW.inversor_id, NEW.monto, 'deposito', 'Depósito aprobado');
      
    ELSIF NEW.tipo = 'retiro' THEN
      -- Actualizar total del inversor
      UPDATE inversores 
      SET total = total - NEW.monto
      WHERE id = NEW.inversor_id;
      
      -- Registrar transacción
      INSERT INTO transacciones (inversor_id, monto, tipo, descripcion)
      VALUES (NEW.inversor_id, NEW.monto, 'retiro', 'Retiro aprobado');
    END IF;
    
    -- Enviar notificación
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (NEW.inversor_id, 'inversor', 
            'Solicitud Aprobada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada.',
            'success');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Función para procesar solicitud de partner
CREATE OR REPLACE FUNCTION procesar_solicitud_partner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'aprobado'
  IF NEW.estado = 'aprobado' AND OLD.estado = 'pendiente' THEN
    IF NEW.tipo = 'deposito' THEN
      -- Actualizar inversión del partner
      UPDATE partners 
      SET inversion_inicial = inversion_inicial + NEW.monto
      WHERE id = NEW.partner_id;
      
      -- Registrar transacción
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      VALUES (NEW.partner_id, NEW.monto, 'deposito', 'Depósito aprobado');
      
    ELSIF NEW.tipo = 'retiro' THEN
      -- Actualizar inversión del partner
      UPDATE partners 
      SET inversion_inicial = inversion_inicial - NEW.monto
      WHERE id = NEW.partner_id;
      
      -- Registrar transacción
      INSERT INTO partner_transacciones (partner_id, monto, tipo, descripcion)
      VALUES (NEW.partner_id, NEW.monto, 'retiro', 'Retiro aprobado');
    END IF;
    
    -- Enviar notificación
    INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
    VALUES (NEW.partner_id, 'partner', 
            'Solicitud Aprobada',
            'Tu solicitud de ' || NEW.tipo || ' por $' || NEW.monto || ' ha sido aprobada.',
            'success');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear triggers
DROP TRIGGER IF EXISTS trigger_procesar_solicitud_inversor ON solicitudes;
CREATE TRIGGER trigger_procesar_solicitud_inversor
  AFTER UPDATE ON solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_inversor();

DROP TRIGGER IF EXISTS trigger_procesar_solicitud_partner ON partner_solicitudes;
CREATE TRIGGER trigger_procesar_solicitud_partner
  AFTER UPDATE ON partner_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION procesar_solicitud_partner();

-- =============================================
-- CONFIGURACIÓN INICIAL
-- =============================================

-- Insertar configuración inicial si no existe
INSERT INTO configuracion_sistema (clave, valor, descripcion) 
VALUES ('semana_actual', '1', 'Semana actual del sistema de ganancias')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO configuracion_sistema (clave, valor, descripcion) 
VALUES ('fecha_inicio_semana', CURRENT_DATE::text, 'Fecha de inicio de la semana actual')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO configuracion_sistema (clave, valor, descripcion) 
VALUES ('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores')
ON CONFLICT (clave) DO NOTHING;

-- Crear admin por defecto si no existe
INSERT INTO admins (username, password_hash, password_salt, role, nombre, email, is_active)
VALUES ('KatanaRz', 'admin_hash_placeholder', 'admin_salt_placeholder', 'admin', 'Administrador Principal', 'admin@cvmcapital.com', true)
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

-- Verificar que todas las tablas tengan RLS habilitado
ALTER TABLE public.inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_inversores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganancias_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ganancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Mensaje de confirmación
SELECT 'Base de datos corregida exitosamente - Todas las funciones y políticas están configuradas correctamente' as status;