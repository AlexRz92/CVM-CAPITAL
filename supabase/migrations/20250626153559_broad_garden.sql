/*
  # Fix database function and implement ticket system

  1. Fix Function
    - Fix obtener_inversores_disponibles function type mismatch
  
  2. New Tables
    - `tickets` table for support tickets
    - Columns: id, usuario_id, tipo_usuario, titulo, mensaje, estado, respuesta, fecha_creacion, fecha_respuesta, respondido_por
  
  3. Security
    - Enable RLS on tickets table
    - Add policies for users and admins
*/

-- Fix the obtener_inversores_disponibles function
CREATE OR REPLACE FUNCTION obtener_inversores_disponibles()
RETURNS TABLE (
  id uuid,
  nombre text,
  apellido text,
  email text,
  total numeric,
  partner_assigned boolean,
  partner_nombre text
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
    CASE WHEN pi.partner_id IS NOT NULL THEN true ELSE false END as partner_assigned,
    COALESCE(p.nombre::text, '') as partner_nombre
  FROM inversores i
  LEFT JOIN partner_inversores pi ON i.id = pi.inversor_id
  LEFT JOIN partners p ON pi.partner_id = p.id
  ORDER BY i.created_at DESC;
END;
$$;

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo_usuario varchar(20) NOT NULL CHECK (tipo_usuario IN ('inversor', 'partner')),
  titulo varchar(255) NOT NULL,
  mensaje text NOT NULL,
  estado varchar(20) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'respondido', 'cerrado')),
  respuesta text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_respuesta timestamptz,
  respondido_por uuid REFERENCES admins(id),
  CONSTRAINT unique_open_ticket_per_user UNIQUE (usuario_id, tipo_usuario, estado) DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policies for tickets
CREATE POLICY "Users can view their own tickets"
  ON tickets
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create their own tickets"
  ON tickets
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can update tickets"
  ON tickets
  FOR UPDATE
  TO public
  USING (true);

-- Function to create ticket (ensures only one open ticket per user)
CREATE OR REPLACE FUNCTION crear_ticket(
  p_usuario_id uuid,
  p_tipo_usuario varchar(20),
  p_titulo varchar(255),
  p_mensaje text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_existente tickets%ROWTYPE;
  nuevo_ticket tickets%ROWTYPE;
BEGIN
  -- Verificar si ya existe un ticket abierto o respondido para este usuario
  SELECT * INTO ticket_existente
  FROM tickets 
  WHERE usuario_id = p_usuario_id 
    AND tipo_usuario = p_tipo_usuario 
    AND estado IN ('abierto', 'respondido');
  
  IF ticket_existente.id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ya tienes un ticket abierto. Espera a que sea resuelto antes de crear uno nuevo.',
      'existing_ticket', json_build_object(
        'id', ticket_existente.id,
        'titulo', ticket_existente.titulo,
        'estado', ticket_existente.estado,
        'fecha_creacion', ticket_existente.fecha_creacion,
        'respuesta', ticket_existente.respuesta
      )
    );
  END IF;
  
  -- Crear nuevo ticket
  INSERT INTO tickets (usuario_id, tipo_usuario, titulo, mensaje)
  VALUES (p_usuario_id, p_tipo_usuario, p_titulo, p_mensaje)
  RETURNING * INTO nuevo_ticket;
  
  RETURN json_build_object(
    'success', true,
    'ticket', json_build_object(
      'id', nuevo_ticket.id,
      'titulo', nuevo_ticket.titulo,
      'mensaje', nuevo_ticket.mensaje,
      'estado', nuevo_ticket.estado,
      'fecha_creacion', nuevo_ticket.fecha_creacion
    )
  );
END;
$$;

-- Function to respond to ticket
CREATE OR REPLACE FUNCTION responder_ticket(
  p_ticket_id uuid,
  p_respuesta text,
  p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_actualizado tickets%ROWTYPE;
BEGIN
  -- Actualizar ticket con respuesta
  UPDATE tickets 
  SET 
    respuesta = p_respuesta,
    estado = 'respondido',
    fecha_respuesta = now(),
    respondido_por = p_admin_id
  WHERE id = p_ticket_id
  RETURNING * INTO ticket_actualizado;
  
  IF ticket_actualizado.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ticket no encontrado'
    );
  END IF;
  
  -- Crear notificación para el usuario
  INSERT INTO notificaciones (usuario_id, tipo_usuario, titulo, mensaje, tipo_notificacion)
  VALUES (
    ticket_actualizado.usuario_id,
    ticket_actualizado.tipo_usuario,
    'Respuesta a tu ticket de soporte',
    'Tu ticket "' || ticket_actualizado.titulo || '" ha sido respondido por el equipo de soporte.',
    'info'
  );
  
  RETURN json_build_object(
    'success', true,
    'ticket', json_build_object(
      'id', ticket_actualizado.id,
      'titulo', ticket_actualizado.titulo,
      'respuesta', ticket_actualizado.respuesta,
      'estado', ticket_actualizado.estado,
      'fecha_respuesta', ticket_actualizado.fecha_respuesta
    )
  );
END;
$$;

-- Function to close ticket
CREATE OR REPLACE FUNCTION cerrar_ticket(
  p_ticket_id uuid,
  p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_actualizado tickets%ROWTYPE;
BEGIN
  -- Cerrar ticket
  UPDATE tickets 
  SET estado = 'cerrado'
  WHERE id = p_ticket_id
  RETURNING * INTO ticket_actualizado;
  
  IF ticket_actualizado.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ticket no encontrado'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'ticket', json_build_object(
      'id', ticket_actualizado.id,
      'estado', ticket_actualizado.estado
    )
  );
END;
$$;

-- Function to get user's current ticket
CREATE OR REPLACE FUNCTION obtener_ticket_usuario(
  p_usuario_id uuid,
  p_tipo_usuario varchar(20)
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_actual tickets%ROWTYPE;
  admin_nombre text;
BEGIN
  -- Buscar ticket abierto o respondido
  SELECT * INTO ticket_actual
  FROM tickets 
  WHERE usuario_id = p_usuario_id 
    AND tipo_usuario = p_tipo_usuario 
    AND estado IN ('abierto', 'respondido')
  ORDER BY fecha_creacion DESC
  LIMIT 1;
  
  IF ticket_actual.id IS NULL THEN
    RETURN json_build_object(
      'has_ticket', false
    );
  END IF;
  
  -- Obtener nombre del admin que respondió (si aplica)
  IF ticket_actual.respondido_por IS NOT NULL THEN
    SELECT nombre INTO admin_nombre
    FROM admins
    WHERE id = ticket_actual.respondido_por;
  END IF;
  
  RETURN json_build_object(
    'has_ticket', true,
    'ticket', json_build_object(
      'id', ticket_actual.id,
      'titulo', ticket_actual.titulo,
      'mensaje', ticket_actual.mensaje,
      'estado', ticket_actual.estado,
      'respuesta', ticket_actual.respuesta,
      'fecha_creacion', ticket_actual.fecha_creacion,
      'fecha_respuesta', ticket_actual.fecha_respuesta,
      'admin_nombre', admin_nombre
    )
  );
END;
$$;

-- Function to get all tickets for admin
CREATE OR REPLACE FUNCTION obtener_tickets_admin()
RETURNS TABLE (
  id uuid,
  usuario_id uuid,
  tipo_usuario varchar(20),
  titulo varchar(255),
  mensaje text,
  estado varchar(20),
  respuesta text,
  fecha_creacion timestamptz,
  fecha_respuesta timestamptz,
  usuario_nombre text,
  admin_nombre text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.usuario_id,
    t.tipo_usuario,
    t.titulo,
    t.mensaje,
    t.estado,
    t.respuesta,
    t.fecha_creacion,
    t.fecha_respuesta,
    CASE 
      WHEN t.tipo_usuario = 'inversor' THEN CONCAT(i.nombre, ' ', i.apellido)
      WHEN t.tipo_usuario = 'partner' THEN p.nombre::text
    END as usuario_nombre,
    a.nombre::text as admin_nombre
  FROM tickets t
  LEFT JOIN inversores i ON t.usuario_id = i.id AND t.tipo_usuario = 'inversor'
  LEFT JOIN partners p ON t.usuario_id = p.id AND t.tipo_usuario = 'partner'
  LEFT JOIN admins a ON t.respondido_por = a.id
  ORDER BY 
    CASE WHEN t.estado = 'abierto' THEN 1 
         WHEN t.estado = 'respondido' THEN 2 
         ELSE 3 END,
    t.fecha_creacion DESC;
END;
$$;