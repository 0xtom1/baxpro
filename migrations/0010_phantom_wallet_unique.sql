-- Migration: Add unique constraint to phantom_wallet
-- First, clean up duplicate Phantom users (keep oldest, delete others)

-- Delete duplicate Phantom users, keeping only the oldest record for each provider_id
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY provider_id 
        ORDER BY created_at ASC
      ) as row_num
    FROM users
    WHERE provider = 'phantom'
  ) duplicates
  WHERE row_num > 1
);

-- Add unique constraint to phantom_wallet column
ALTER TABLE users ADD CONSTRAINT users_phantom_wallet_unique UNIQUE (phantom_wallet);
