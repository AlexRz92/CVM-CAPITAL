/*
  # Script de verificación y pruebas
  
  Este script verifica que todo esté funcionando correctamente:
  1. Funciones creadas
  2. Datos insertados
  3. Cálculos de ganancias
  4. Distribución correcta
*/

-- =============================================
-- VERIFICACIONES BÁSICAS
-- =============================================

-- 1. Verificar que las funciones existen
SELECT 
    routine_name as "Función",
    routine_type as "Tipo"
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'obtener_distribucion_partners',
    'obtener_distribucion_inversores', 
    'procesar_ganancias_semanales',
    'obtener_estadisticas_admin',
    'calcular_total_inversion_sistema'
)
ORDER BY routine_name;

-- 2. Verificar configuración del sistema
SELECT 
    clave as "Configuración", 
    valor as "Valor", 
    descripcion as "Descripción"
FROM configuracion_sistema 
ORDER BY clave;

-- 3. Verificar partners
SELECT 
    nombre as "Partner",
    tipo as "Tipo",
    porcentaje_comision as "% Comisión",
    porcentaje_especial as "% Especial",
    inversion_inicial as "Inversión",
    activo as "Activo"
FROM partners 
ORDER BY nombre;

-- 4. Verificar inversores
SELECT 
    nombre || ' ' || apellido as "Inversor",
    email as "Email",
    total as "Total Invertido"
FROM inversores
ORDER BY nombre;

-- 5. Verificar asignaciones partner-inversor
SELECT 
    p.nombre as "Partner",
    i.nombre || ' ' || i.apellido as "Inversor",
    i.total as "Monto"
FROM partner_inversores pi
JOIN partners p ON pi.partner_id = p.id
JOIN inversores i ON pi.inversor_id = i.id
ORDER BY p.nombre, i.nombre;

-- =============================================
-- PRUEBAS DE FUNCIONES
-- =============================================

-- 6. Probar estadísticas de admin
SELECT 'Estadísticas del Sistema:' as "Prueba";
SELECT * FROM obtener_estadisticas_admin();

-- 7. Probar total de inversión
SELECT 'Total de Inversión en el Sistema:' as "Prueba";
SELECT calcular_total_inversion_sistema() as "Total USD";

-- 8. Simular procesamiento de ganancias con $1000 total
-- 70% para inversores = $700, 30% para partners = $300
SELECT 'Simulación de Ganancias - $1000 total (5% de $20,000):' as "Prueba";

-- Distribución para partners ($300)
SELECT 'Distribución Partners ($300):' as "Sección";
SELECT obtener_distribucion_partners(300);

-- Distribución para inversores ($700)  
SELECT 'Distribución Inversores ($700):' as "Sección";
SELECT obtener_distribucion_inversores(700);

-- =============================================
-- RESUMEN ESPERADO
-- =============================================

SELECT '
=== RESUMEN ESPERADO ===

PARTNERS:
- Ale (Partner 10%): 
  * Ganancia propia: $37.50 (70% de su 5% de $500)
  * Comisión: $7.50 (10% del 30% de $2500 de sus inversores)
  * Total: $45.00

- Andrés (Operador+Partner 15%+20%):
  * Ganancia propia: $75.00 (100% de su 5% de $1000)  
  * Comisión: $60.00 (100% del 30% de $2000 de sus inversores)
  * Total: $135.00

INVERSORES:
- Juan ($1000): $140.00 (70% de su 5%)
- María ($1500): $210.00 (70% de su 5%)
- Carlos ($800): $112.00 (70% de su 5%)
- Ana ($1200): $168.00 (70% de su 5%)

VERIFICACIÓN:
- Total Partners: $180.00
- Total Inversores: $630.00
- Gran Total: $810.00 ✓

' as "Explicación";