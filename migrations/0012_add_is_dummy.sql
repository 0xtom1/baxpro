-- Add is_dummy column to assets table for test/dummy data identification
ALTER TABLE baxus.assets ADD COLUMN is_dummy BOOLEAN NOT NULL DEFAULT false;

-- Update all existing rows to false (handled by default, but explicit for clarity)
UPDATE baxus.assets SET is_dummy = false WHERE is_dummy IS NULL;
