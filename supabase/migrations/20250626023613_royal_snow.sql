/*
  # Funciones principales del sistema CVM Capital
  
  1. Funciones de validación
    - validar_retiro_inversor: Validar si un inversor puede retirar
    - validar_retiro_partner: Validar si un partner puede retirar
    
  2. Funciones de cálculo
    - calcular_total_inversion_sistema: Total de inversión en el sistema
    - calcular_inversion_total_inversor: Total invertido por un inversor
    - obtener_estadisticas_admin: Estadísticas para el panel de admin
    
  3. Funciones de configuración
    - configurar_semana_sistema: Configurar nueva semana
    - enviar_aviso_a_todos_inversores: Enviar avisos masivos
    
  4. Funciones de datos
    - obtener_inversores_disponibles: Lista de inversores para asignación
    - obtener_resumen_partners: Resumen de partners e inversores
    - obtener_datos_grafico_semanal: Datos para gráficos
    - obtener_datos_torta_partner: Datos para gráfico de torta
*/

-- =============================================
-- FUNCIONES DE VALIDACIÓN
-- =============================================

-- Validar retiro de inversor
CREATE OR REPLACE FUNCTION validar_retiro_inversor(
  p_inversor_id uuid,
  p_monto numeric
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_actual numeric;
BEGIN
  SELECT total INTO v_saldo_actual
  FROM inversores
  WHERE id = p_inversor_id;
  
  RETURN COALESCE(v_saldo_actual, 0) >= p_monto;
END;
$$;

-- Validar retiro de partner
CREATE OR REPLACE FUNCTION validar_retiro_partner(
  p_partner_id uuid,
  p_monto numeric
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_actual numeric;
BEGIN
  SELECT inversion_inicial INTO v_saldo_actual
  FROM partners
  WHERE id = p_partner_id;
  
  RETURN COALESCE(v_saldo_actual, 0) >= p_monto;
END;
$$;

-- =============================================
-- FUNCIONES DE CÁLCULO
-- =============================================

-- Calcular total de inversión en el sistema
CREATE OR REPLACE FUNCTION calcular_total_inversion_sistema()
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_inversores numeric := 0;
  v_total_partners numeric := 0;
BEGIN
  -- Sumar total de inversores
  SELECT COALESCE(SUM(total), 0) INTO v_total_inversores
  FROM inversores;
  
  -- Sumar inversión inicial de partners activos
  SELECT COALESCE(SUM(inversion_inicial), 0) INTO v_total_partners
  FROM partners
  WHERE activo = true;
  
  RETURN v_total_inversores + v_total_partners;
END;
$$;

-- Calcular inversión total de un inversor
CREATE OR REPLACE FUNCTION calcular_inversion_total_inversor(p_inversor_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_depositos numeric := 0;
BEGIN
  SELECT COALESCE(SUM(monto), 0) INTO v_total_depositos
  FROM transacciones
  WHERE inversor_id = p_inversor_id 
    AND tipo IN ('deposito', 'depósito');
  
  RETURN v_total_depositos;
END;
$$;

-- Obtener estadísticas para el panel de administración
CREATE OR REPLACE FUNCTION obtener_estadisticas_admin()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_inversion numeric;
  v_partners_activos integer;
  v_total_inversores integer;
  v_semana_actual integer;
  v_ganancia_semanal_actual numeric;
BEGIN
  -- Calcular total de inversión
  v_total_inversion := calcular_total_inversion_sistema();
  
  -- Contar partners activos
  SELECT COUNT(*) INTO v_partners_activos
  FROM partners WHERE activo = true;
  
  -- Contar total de inversores
  SELECT COUNT(*) INTO v_total_inversores
  FROM inversores;
  
  -- Obtener semana actual
  SELECT COALESCE(valor::integer, 1) INTO v_semana_actual
  FROM configuracion_sistema WHERE clave = 'semana_actual';
  
  -- Obtener ganancia semanal actual
  SELECT COALESCE(ganancia_bruta, 0) INTO v_ganancia_semanal_actual
  FROM ganancias_semanales
  WHERE semana_numero = v_semana_actual;
  
  RETURN json_build_object(
    'total_inversion', v_total_inversion,
    'partners_activos', v_partners_activos,
    'total_inversores', v_total_inversores,
    'semana_actual', v_semana_actual,
    'ganancia_semanal_actual', v_ganancia_semanal_actual
  );
END;
$$;

-- =============================================
-- FUNCIONES DE CONFIGURACIÓN
-- =============================================

-- Configurar semana del sistema
CREATE OR REPLACE FUNCTION configurar_semana_sistema(
  p_semana_numero integer,
  p_fecha_inicio date,
  p_admin_id uuid
) RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_fecha_fin date;
BEGIN
  v_fecha_fin := p_fecha_inicio + INTERVAL '6 days';
  
  -- Actualizar configuraciones
  UPDATE configuracion_sistema 
  SET valor = p_semana_numero::text, updated_by = p_admin_id, updated_at = now()
  WHERE clave = 'semana_actual';
  
  UPDATE configuracion_sistema 
  SET valor = p_fecha_inicio::text, updated_by = p_admin_id, updated_at = now()
  WHERE clave = 'fecha_inicio_semana';
  
  UPDATE configuracion_sistema 
  SET valor = v_fecha_fin::text, updated_by = p_admin_id, updated_at = now()
  WHERE clave = 'fecha_fin_semana';
  
  -- Crear registro en ganancias_semanales si no existe
  INSERT INTO ganancias_semanales (
    semana_numero, fecha_inicio, fecha_fin, total_inversion, procesado
  ) VALUES (
    p_semana_numero, p_fecha_inicio, v_fecha_fin, 0, false
  ) ON CONFLICT (semana_numero) DO UPDATE SET
    fecha_inicio = p_fecha_inicio,
    fecha_fin = v_fecha_fin;
  
  RETURN json_build_object(
    'success', true,
    'semana', p_semana_numero,
    'fecha_inicio', p_fecha_inicio,
    'fecha_fin', v_fecha_fin
  );
END;
$$;

-- Enviar aviso a todos los inversores
CREATE OR REPLACE FUNCTION enviar_aviso_a_todos_inversores(
  p_titulo text,
  p_mensaje text,
  p_tipo text,
  p_admin_id uuid
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Crear aviso
  INSERT INTO avisos (titulo, mensaje, tipo, creado_por)
  VALUES (p_titulo, p_mensaje, p_tipo, p_admin_id);

  -- Enviar notificación a todos los inversores
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  SELECT i.id, 'inversor', p_titulo, p_mensaje, p_tipo
  FROM inversores i;

  RETURN true;
END;
$$;

-- =============================================
-- FUNCIONES DE DATOS
-- =============================================

-- Obtener inversores disponibles para asignación
CREATE OR REPLACE FUNCTION obtener_inversores_disponibles()
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', i.id,
        'nombre', i.nombre,
        'apellido', i.apellido,
        'email', i.email,
        'total', i.total,
        'partner_assigned', (pi.partner_id IS NOT NULL),
        'partner_nombre', p.nombre
      )
    )
    FROM inversores i
    LEFT JOIN partner_inversores pi ON i.id = pi.inversor_id
    LEFT JOIN partners p ON pi.partner_id = p.id
    ORDER BY i.nombre, i.apellido
  );
END;
$$;

-- Obtener resumen de partners
CREATE OR REPLACE FUNCTION obtener_resumen_partners()
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'partner_id', p.id,
        'partner_nombre', p.nombre,
        'partner_tipo', p.tipo,
        'total_inversores', COALESCE(stats.total_inversores, 0),
        'monto_total', COALESCE(stats.monto_total, 0),
        'inversores', COALESCE(stats.inversores, '[]'::json)
      )
    )
    FROM partners p
    LEFT JOIN (
      SELECT 
        pi.partner_id,
        COUNT(pi.inversor_id) as total_inversores,
        SUM(i.total) as monto_total,
        json_agg(
          json_build_object(
            'id', i.id,
            'nombre', i.nombre,
            'apellido', i.apellido,
            'email', i.email,
            'total', i.total
          )
        ) as inversores
      FROM partner_inversores pi
      JOIN inversores i ON pi.inversor_id = i.id
      GROUP BY pi.partner_id
    ) stats ON p.id = stats.partner_id
    WHERE p.activo = true AND stats.total_inversores > 0
    ORDER BY p.nombre
  );
END;
$$;

-- Obtener datos para gráfico semanal
CREATE OR REPLACE FUNCTION obtener_datos_grafico_semanal()
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'week', 'Sem ' || semana_numero,
        'ganancia', COALESCE(ganancia_bruta, 0)
      )
    )
    FROM ganancias_semanales
    ORDER BY semana_numero DESC
    LIMIT 8
  );
END;
$$;

-- Obtener datos para gráfico de torta de partner
CREATE OR REPLACE FUNCTION obtener_datos_torta_partner(p_partner_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'name', 
        CASE tipo
          WHEN 'deposito' THEN 'Depósitos'
          WHEN 'retiro' THEN 'Retiros'
          WHEN 'ganancia' THEN 'Ganancias'
          ELSE 'Otros'
        END,
        'value', total_monto,
        'color',
        CASE tipo
          WHEN 'deposito' THEN '#10b981'
          WHEN 'retiro' THEN '#ef4444'
          WHEN 'ganancia' THEN '#3b82f6'
          ELSE '#6b7280'
        END
      )
    )
    FROM (
      SELECT 
        tipo,
        SUM(monto) as total_monto
      FROM partner_transacciones
      WHERE partner_id = p_partner_id
      GROUP BY tipo
      HAVING SUM(monto) > 0
    ) grouped_data
  );
END;
$$;

-- Obtener datos actualizados del partner
CREATE OR REPLACE FUNCTION obtener_datos_partner_actualizados(p_partner_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_inversion_total numeric;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN tipo IN ('deposito', 'ganancia') THEN monto
      ELSE -monto
    END
  ), 0) INTO v_inversion_total
  FROM partner_transacciones
  WHERE partner_id = p_partner_id;
  
  RETURN json_build_object('inversion_total', v_inversion_total);
END;
$$;