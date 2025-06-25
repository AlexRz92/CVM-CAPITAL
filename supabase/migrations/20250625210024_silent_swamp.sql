/*
  # Add missing columns to notificaciones table

  1. Changes
    - Add `partner_id` column (uuid, nullable, foreign key to partners table)
    - Add `admin_id` column (uuid, nullable, foreign key to admins table)
  
  2. Security
    - Maintain existing RLS policies
    - Add foreign key constraints for data integrity
*/

-- Add partner_id column to notificaciones table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notificaciones' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE notificaciones ADD COLUMN partner_id uuid;
  END IF;
END $$;

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

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add foreign key for partner_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notificaciones_partner_id_fkey'
  ) THEN
    ALTER TABLE notificaciones 
    ADD CONSTRAINT notificaciones_partner_id_fkey 
    FOREIGN KEY (partner_id) REFERENCES partners(id);
  END IF;

  -- Add foreign key for admin_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notificaciones_admin_id_fkey'
  ) THEN
    ALTER TABLE notificaciones 
    ADD CONSTRAINT notificaciones_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES admins(id);
  END IF;
END $$;