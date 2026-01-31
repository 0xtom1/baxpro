-- Add phantom_wallet column to users table for Phantom wallet authentication
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phantom_wallet VARCHAR(44);

-- Create index for faster lookups by phantom wallet
CREATE INDEX IF NOT EXISTS idx_users_phantom_wallet ON public.users(phantom_wallet) WHERE phantom_wallet IS NOT NULL;
