-- Migration: Update baxus.activity_feed
-- - drop v_activity_feed
-- - Change signature from VARCHAR(89) → VARCHAR(88) without dropping it
-- - Ensure signature exists as VARCHAR(88) even if it was missing somehow
-- - Add from_user_account and to_user_account if missing
-- - create v_activity_feed
-- - Create baxus.sys_metadata

-- 0. Drop dependent view
DROP VIEW IF EXISTS baxus.v_activity_feed;

-- 1. Ensure signature column exists first (in case it was accidentally dropped before)
ALTER TABLE baxus.activity_feed
    ADD COLUMN IF NOT EXISTS signature VARCHAR(88);

-- 2. If signature currently has length 89 (or any other length), change it to 88
-- This works even if indexes/constraints exist on the column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'baxus'
          AND table_name   = 'activity_feed'
          AND column_name  = 'signature'
          AND character_maximum_length IS NOT NULL
          AND character_maximum_length != 88
    ) THEN
        ALTER TABLE baxus.activity_feed
            ALTER COLUMN signature TYPE VARCHAR(88);
    END IF;
END $$;

-- 2. Add new columns if they don't already exist
ALTER TABLE baxus.activity_feed
    ADD COLUMN IF NOT EXISTS from_user_account VARCHAR(88),
    ADD COLUMN IF NOT EXISTS to_user_account VARCHAR(88);


-- 3. Create dependent view
CREATE OR REPLACE VIEW baxus.v_activity_feed AS
SELECT 
  af.activity_idx,
  af.activity_type_idx,
  af.asset_idx,
  af.price,
  af.activity_date,
  af.signature,
  dat.activity_type_code,
  dat.activity_type_name,
  a.asset_id,
  a.name AS asset_name,
  jsonb_path_query_first(a.metadata_json, '$.attributes[*] ? (@.trait_type == "Producer").value') #>> '{}' AS producer,
  a.is_listed
FROM baxus.activity_feed af
INNER JOIN baxus.dim_activity_types dat ON af.activity_type_idx = dat.activity_type_idx
INNER JOIN baxus.assets a ON af.asset_idx = a.asset_idx
ORDER BY af.activity_date DESC;

-- 4. Create baxus.sys_metadata
CREATE TABLE IF NOT EXISTS baxus.sys_metadata (
    metadata_key VARCHAR(50)  PRIMARY KEY,
    metadata_value text NOT NULL
);
INSERT INTO baxus.sys_metadata (metadata_key, metadata_value)
VALUES 
  ('MAX_SIGNATURE', '5UPUzGkjEP2i1iHakE438HEwWL62wPQr7LznuirSg4HR6WAkcGAkS5Tpq2HZnLSnLbW6maswLRZprDXj9osnwpwv')
ON CONFLICT (metadata_key) DO NOTHING;



