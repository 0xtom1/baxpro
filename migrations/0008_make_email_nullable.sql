-- Make email column nullable to support Phantom wallet users who don't have email addresses
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
