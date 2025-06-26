/*
  # Paso 1: Eliminar funciones conflictivas
  
  Elimina todas las funciones que causan conflictos de tipo de retorno
*/

-- Eliminar funciones conflictivas
DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric) CASCADE;
DROP FUNCTION IF EXISTS obtener_distribucion_inversores(numeric) CASCADE;
DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_estadisticas_admin() CASCADE;
DROP FUNCTION IF EXISTS calcular_inversion_total_inversor(uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_datos_partner_actualizados(uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_datos_torta_partner(uuid) CASCADE;
DROP FUNCTION IF EXISTS configurar_semana_sistema(integer, date, uuid) CASCADE;