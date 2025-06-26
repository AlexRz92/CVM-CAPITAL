-- =============================================
-- SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN
-- =============================================

-- 1. Verificar que las funciones existen
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'obtener_distribucion_partners',
    'obtener_distribucion_inversores', 
    'procesar_ganancias_semanales',
    'obtener_estadisticas_admin'
)
ORDER BY routine_name;

-- 2. Verificar configuración del sistema
SELECT * FROM configuracion_sistema 
WHERE clave IN ('semana_actual', 'porcentaje_inversores')
ORDER BY clave;

-- 3. Verificar datos de partners
SELECT 
    id,
    nombre,
    tipo,
    porcentaje_comision,
    porcentaje_especial,
    inversion_inicial,
    activo
FROM partners 
WHERE activo = true
ORDER BY nombre;

-- 4. Verificar datos de inversores
SELECT 
    id,
    nombre,
    apellido,
    total
FROM inversores
ORDER BY nombre;

-- 5. Probar función de estadísticas
SELECT * FROM obtener_estadisticas_admin();

-- 6. Probar distribución de partners (con $1000 de ejemplo)
SELECT * FROM obtener_distribucion_partners(300);

-- 7. Probar distribución de inversores (con $700 de ejemplo)  
SELECT * FROM obtener_distribucion_inversores(700);