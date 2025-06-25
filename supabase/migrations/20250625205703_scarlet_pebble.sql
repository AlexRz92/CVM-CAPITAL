/*
  # Add admin_id column to notificaciones table

  1. Changes
    - Add `admin_id` column to `notificaciones` table as UUID foreign key
    - Add foreign key constraint to reference `admins` table
    - Update RLS policies if needed

  2. Security
    - Maintain existing RLS policies
    - Add appropriate access for admin notifications
*/

-- Add admin_id column to notificaciones table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notificaciones' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE notificaciones ADD COLUMN admin_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notificaciones_admin_id_fkey'
  ) THEN
    ALTER TABLE notificaciones 
    ADD CONSTRAINT notificaciones_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES admins(id);
  END IF;
END $$;

-- Add partner_id column for partner notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notificaciones' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE notificaciones ADD COLUMN partner_id uuid;
  END IF;
END $$;

-- Add foreign key constraint for partner_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notificaciones_partner_id_fkey'
  ) THEN
    ALTER TABLE notificaciones 
    ADD CONSTRAINT notificaciones_partner_id_fkey 
    FOREIGN KEY (partner_id) REFERENCES partners(id);
  END IF;
END $$;