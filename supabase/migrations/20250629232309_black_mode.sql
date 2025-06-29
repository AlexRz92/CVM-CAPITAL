/*
  # Restricción de solicitudes pendientes

  1. Nuevas funciones de validación
    - Verificar si existe solicitud pendiente antes de crear nueva
    - Funciones para inversores y partners

  2. Modificación de componentes
    - Mostrar estado de solicitudes pendientes
    - Deshabilitar botones cuando hay solicitudes pendientes
    - Mostrar información clara al usuario

  3. Funciones de consulta
    - Obtener estado de solicitudes pendientes
    - Información detallada para mostrar en UI
*/

-- 1. Función para verificar solicitudes pendientes de inversores
CREATE OR REPLACE FUNCTION verificar_solicitud_pendiente_inversor(
    p_inversor_id UUID,
    p_tipo TEXT
)
RETURNS TABLE (
    tiene_pendiente BOOLEAN,
    solicitud_id UUID,
    monto NUMERIC(15,2),
    fecha_solicitud TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN s.id IS NOT NULL THEN true ELSE false END as tiene_pendiente,
        s.id as solicitud_id,
        s.monto,
        s.fecha_solicitud
    FROM solicitudes s
    WHERE s.inversor_id = p_inversor_id 
      AND s.tipo = p_tipo 
      AND s.estado = 'pendiente'
    ORDER BY s.fecha_solicitud DESC
    LIMIT 1;
    
    -- Si no hay resultados, devolver false
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT false, NULL::UUID, 0::NUMERIC(15,2), NULL::TIMESTAMPTZ;
    END IF;
END;
$$;

-- 2. Función para verificar solicitudes pendientes de partners
CREATE OR REPLACE FUNCTION verificar_solicitud_pendiente_partner(
    p_partner_id UUID,
    p_tipo TEXT
)
RETURNS TABLE (
    tiene_pendiente BOOLEAN,
    solicitud_id UUID,
    monto NUMERIC(15,2),
    fecha_solicitud TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN s.id IS NOT NULL THEN true ELSE false END as tiene_pendiente,
        s.id as solicitud_id,
        s.monto,
        s.fecha_solicitud
    FROM partner_solicitudes s
    WHERE s.partner_id = p_partner_id 
      AND s.tipo = p_tipo 
      AND s.estado = 'pendiente'
    ORDER BY s.fecha_solicitud DESC
    LIMIT 1;
    
    -- Si no hay resultados, devolver false
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT false, NULL::UUID, 0::NUMERIC(15,2), NULL::TIMESTAMPTZ;
    END IF;
END;
$$;

-- 3. Función para crear solicitud de inversor con validación
CREATE OR REPLACE FUNCTION crear_solicitud_inversor(
    p_inversor_id UUID,
    p_tipo TEXT,
    p_monto NUMERIC(15,2)
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    solicitud_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tiene_pendiente BOOLEAN;
    v_nuevo_id UUID;
BEGIN
    -- Verificar si ya tiene una solicitud pendiente del mismo tipo
    SELECT tiene_pendiente INTO v_tiene_pendiente
    FROM verificar_solicitud_pendiente_inversor(p_inversor_id, p_tipo);
    
    IF v_tiene_pendiente THEN
        RETURN QUERY
        SELECT false, 'Ya tienes una solicitud de ' || p_tipo || ' pendiente. Espera a que sea procesada.', NULL::UUID;
        RETURN;
    END IF;
    
    -- Validar monto para retiros
    IF p_tipo = 'retiro' THEN
        IF NOT validar_retiro_inversor(p_inversor_id, p_monto) THEN
            RETURN QUERY
            SELECT false, 'Monto insuficiente para el retiro solicitado.', NULL::UUID;
            RETURN;
        END IF;
    END IF;
    
    -- Crear la solicitud
    INSERT INTO solicitudes (inversor_id, tipo, monto)
    VALUES (p_inversor_id, p_tipo, p_monto)
    RETURNING id INTO v_nuevo_id;
    
    RETURN QUERY
    SELECT true, 'Solicitud creada exitosamente.', v_nuevo_id;
END;
$$;

-- 4. Función para crear solicitud de partner con validación
CREATE OR REPLACE FUNCTION crear_solicitud_partner(
    p_partner_id UUID,
    p_tipo TEXT,
    p_monto NUMERIC(15,2)
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    solicitud_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tiene_pendiente BOOLEAN;
    v_nuevo_id UUID;
BEGIN
    -- Verificar si ya tiene una solicitud pendiente del mismo tipo
    SELECT tiene_pendiente INTO v_tiene_pendiente
    FROM verificar_solicitud_pendiente_partner(p_partner_id, p_tipo);
    
    IF v_tiene_pendiente THEN
        RETURN QUERY
        SELECT false, 'Ya tienes una solicitud de ' || p_tipo || ' pendiente. Espera a que sea procesada.', NULL::UUID;
        RETURN;
    END IF;
    
    -- Validar monto para retiros
    IF p_tipo = 'retiro' THEN
        IF NOT validar_retiro_partner(p_partner_id, p_monto) THEN
            RETURN QUERY
            SELECT false, 'Monto insuficiente para el retiro solicitado.', NULL::UUID;
            RETURN;
        END IF;
    END IF;
    
    -- Crear la solicitud
    INSERT INTO partner_solicitudes (partner_id, tipo, monto)
    VALUES (p_partner_id, p_tipo, p_monto)
    RETURNING id INTO v_nuevo_id;
    
    RETURN QUERY
    SELECT true, 'Solicitud creada exitosamente.', v_nuevo_id;
END;
$$;

-- 5. Función para obtener todas las solicitudes pendientes de un inversor
CREATE OR REPLACE FUNCTION obtener_solicitudes_pendientes_inversor(p_inversor_id UUID)
RETURNS TABLE (
    tipo TEXT,
    monto NUMERIC(15,2),
    fecha_solicitud TIMESTAMPTZ,
    dias_pendiente INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.tipo,
        s.monto,
        s.fecha_solicitud,
        EXTRACT(DAY FROM (NOW() - s.fecha_solicitud))::INTEGER as dias_pendiente
    FROM solicitudes s
    WHERE s.inversor_id = p_inversor_id 
      AND s.estado = 'pendiente'
    ORDER BY s.fecha_solicitud DESC;
END;
$$;

-- 6. Función para obtener todas las solicitudes pendientes de un partner
CREATE OR REPLACE FUNCTION obtener_solicitudes_pendientes_partner(p_partner_id UUID)
RETURNS TABLE (
    tipo TEXT,
    monto NUMERIC(15,2),
    fecha_solicitud TIMESTAMPTZ,
    dias_pendiente INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.tipo,
        s.monto,
        s.fecha_solicitud,
        EXTRACT(DAY FROM (NOW() - s.fecha_solicitud))::INTEGER as dias_pendiente
    FROM partner_solicitudes s
    WHERE s.partner_id = p_partner_id 
      AND s.estado = 'pendiente'
    ORDER BY s.fecha_solicitud DESC;
END;
$$;

-- 7. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_solicitudes_inversor_estado_tipo ON solicitudes(inversor_id, estado, tipo);
CREATE INDEX IF NOT EXISTS idx_partner_solicitudes_partner_estado_tipo ON partner_solicitudes(partner_id, estado, tipo);