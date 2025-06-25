/*
  # Insertar Datos Iniciales

  1. Admin por defecto
  2. Configuración inicial del sistema
*/

-- Insertar admin por defecto (KatanaRz)
INSERT INTO admins (
  id,
  username,
  password_hash,
  password_salt,
  role,
  nombre,
  email,
  is_active
) VALUES (
  '2a91ad5c-6bfe-4488-ac56-91d3ffd785d3',
  'KatanaRz',
  'admin_hash_placeholder',
  'admin_salt_placeholder',
  'admin',
  'Administrador Principal',
  'admin@cvmcapital.com',
  true
) ON CONFLICT (username) DO NOTHING;

-- Configuración inicial del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('semana_actual', '1', 'Número de semana actual del sistema'),
  ('fecha_inicio_semana', CURRENT_DATE::text, 'Fecha de inicio de la semana actual')
ON CONFLICT (clave) DO NOTHING;