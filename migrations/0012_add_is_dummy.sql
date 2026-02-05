-- Add is_dummy column to assets table for test/dummy data identification
-- Step 1: Add column as nullable first
ALTER TABLE baxus.assets ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN;

-- Step 2: Populate all existing rows with false
UPDATE baxus.assets SET is_dummy = false WHERE is_dummy IS NULL;

-- Step 3: Set NOT NULL constraint and default
ALTER TABLE baxus.assets ALTER COLUMN is_dummy SET NOT NULL;
ALTER TABLE baxus.assets ALTER COLUMN is_dummy SET DEFAULT false;
