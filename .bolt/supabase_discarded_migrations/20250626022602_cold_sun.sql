/*
  # Paso 2: Corregir constraints problemáticos
  
  Elimina y recrea constraints que causan conflictos
*/

-- Eliminar constraint problemático si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'configuracion_sistema_clave_key'
    ) THEN
        ALTER TABLE configuracion_sistema DROP CONSTRAINT configuracion_sistema_clave_key;
    END IF;
END $$;

-- Recrear constraint con nombre único
ALTER TABLE configuracion_sistema 
ADD CONSTRAINT configuracion_sistema_clave_unique UNIQUE (clave);