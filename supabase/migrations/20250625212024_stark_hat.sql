/*
  # Reset Database - Eliminar todas las tablas existentes

  1. Eliminar todas las tablas existentes
  2. Limpiar completamente la base de datos
*/

-- Eliminar todas las tablas en orden correcto (respetando foreign keys)
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS partner_transacciones CASCADE;
DROP TABLE IF EXISTS partner_solicitudes CASCADE;
DROP TABLE IF EXISTS partner_ganancias CASCADE;
DROP TABLE IF EXISTS ganancias_semanales CASCADE;
DROP TABLE IF EXISTS partner_inversores CASCADE;
DROP TABLE IF EXISTS avisos CASCADE;
DROP TABLE IF EXISTS solicitudes CASCADE;
DROP TABLE IF EXISTS transacciones CASCADE;
DROP TABLE IF EXISTS configuracion_sistema CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS inversores CASCADE;

-- Eliminar funciones personalizadas si existen
DROP FUNCTION IF EXISTS calcular_total_inversion() CASCADE;
DROP FUNCTION IF EXISTS obtener_datos_grafico_semanal() CASCADE;
DROP FUNCTION IF EXISTS obtener_distribucion_partners(numeric) CASCADE;
DROP FUNCTION IF EXISTS obtener_distribucion_inversores(numeric) CASCADE;
DROP FUNCTION IF EXISTS procesar_ganancias_semanales(numeric, numeric, uuid) CASCADE;
DROP FUNCTION IF EXISTS configurar_semana(integer, date, uuid) CASCADE;
DROP FUNCTION IF EXISTS obtener_inversores_disponibles() CASCADE;
DROP FUNCTION IF EXISTS obtener_resumen_partners() CASCADE;
DROP FUNCTION IF EXISTS enviar_aviso_a_todos_inversores(text, text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS enviar_notificacion_global(text, text, text) CASCADE;