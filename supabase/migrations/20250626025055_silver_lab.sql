-- =============================================
-- CORREGIR ERROR DE CLAVE DUPLICADA
-- =============================================

-- Verificar y actualizar configuraciones existentes
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('semana_actual', '1', 'Número de semana actual del sistema'),
  ('porcentaje_inversores', '70', 'Porcentaje de ganancias para inversores (70% inversores, 30% partners)'),
  ('porcentaje_ganancia_general', '5', 'Porcentaje de ganancia general aplicado'),
  ('fecha_inicio_semana', '2025-01-01', 'Fecha de inicio de la semana actual'),
  ('fecha_fin_semana', '2025-01-07', 'Fecha de fin de la semana actual')
ON CONFLICT (clave) DO UPDATE SET
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();

-- =============================================
-- INSERTAR DATOS DE EJEMPLO SI NO EXISTEN
-- =============================================

-- Insertar admin por defecto si no existe
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
) ON CONFLICT (username) DO NOTHING;

-- Insertar partners de ejemplo si no existen
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
  )
ON CONFLICT (username) DO NOTHING;

-- Insertar inversores de ejemplo si no existen
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
  )
ON CONFLICT (email) DO NOTHING;

-- Asignar inversores a partners (solo si no existen las asignaciones)
-- Ale (partner normal) tendrá a Juan y María
INSERT INTO partner_inversores (partner_id, inversor_id) 
SELECT p.id, i.id 
FROM partners p, inversores i 
WHERE p.username = 'ale_partner' 
  AND i.email IN ('juan@example.com', 'maria@example.com')
  AND NOT EXISTS (
    SELECT 1 FROM partner_inversores pi2 
    WHERE pi2.inversor_id = i.id
  );

-- Andrés (operador+partner) tendrá a Carlos y Ana
INSERT INTO partner_inversores (partner_id, inversor_id) 
SELECT p.id, i.id 
FROM partners p, inversores i 
WHERE p.username = 'andres_operador' 
  AND i.email IN ('carlos@example.com', 'ana@example.com')
  AND NOT EXISTS (
    SELECT 1 FROM partner_inversores pi2 
    WHERE pi2.inversor_id = i.id
  );

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

-- Mostrar resumen de datos insertados
SELECT 'RESUMEN DE DATOS INSERTADOS:' as "Estado";

SELECT 
  'Configuraciones: ' || COUNT(*) as "Configuración"
FROM configuracion_sistema;

SELECT 
  'Admins: ' || COUNT(*) as "Administradores"
FROM admins;

SELECT 
  'Partners: ' || COUNT(*) as "Partners"
FROM partners;

SELECT 
  'Inversores: ' || COUNT(*) as "Inversores"
FROM inversores;

SELECT 
  'Asignaciones: ' || COUNT(*) as "Asignaciones"
FROM partner_inversores;

-- Verificar que las funciones principales existen
SELECT 
  'Funciones disponibles: ' || COUNT(*) as "Funciones"
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'obtener_distribucion_partners',
  'obtener_distribucion_inversores', 
  'procesar_ganancias_semanales',
  'obtener_estadisticas_admin'
);

SELECT 'Base de datos lista para usar ✅' as "Estado Final";