CREATE SCHEMA IF NOT EXISTS baxus;
CREATE SCHEMA IF NOT EXISTS drizzle;


CREATE OR REPLACE FUNCTION baxus.update_last_updated_and_counter() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_updated  := now();
    NEW.count_updated := OLD.count_updated + 1;
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS baxus.activity_feed (
    activity_idx SERIAL PRIMARY KEY,
    activity_type_idx integer NOT NULL,
    asset_idx integer NOT NULL,
    price double precision,
    activity_date timestamp  DEFAULT now() NOT NULL,
    signature VARCHAR(89)
);
-- Index on activity_feed activity_type_idx for joining to dim_activity_types
CREATE INDEX IF NOT EXISTS idx_activity_feed_activity_type_idx ON baxus.activity_feed(activity_type_idx);
-- Index on activity_feed price for filtering
CREATE INDEX IF NOT EXISTS idx_activity_feed_price ON baxus.activity_feed(price);
-- Index on activity_feed activity_date for querying
CREATE INDEX IF NOT EXISTS idx_activity_feed_activity_date ON baxus.activity_feed(activity_date);

CREATE TABLE IF NOT EXISTS baxus.activity_feed_import (
    asset_id CHAR(44) NOT NULL,
    price double precision,
    activity_date timestamp  NOT NULL
);

-- Log table of asset json values, append only
CREATE TABLE IF NOT EXISTS baxus.asset_json_feed (
    asset_json_idx SERIAL PRIMARY KEY,
    asset_idx integer NOT NULL,
    asset_json jsonb,
    metadata_json jsonb,
    added_date timestamp  DEFAULT now() NOT NULL
);

-- Main table of Baxus assets
CREATE TABLE IF NOT EXISTS baxus.assets (
    asset_idx SERIAL PRIMARY KEY,
    asset_id CHAR(44) NOT NULL,
    baxus_idx integer,
    name text NOT NULL,
    price double precision,
    bottled_year integer,
    age integer,
    is_listed boolean,
    listed_date timestamp ,
    asset_json jsonb NOT NULL,
    metadata_json jsonb,
    added_date timestamp  DEFAULT now() NOT NULL,
    last_updated timestamp  DEFAULT now() NOT NULL,
    count_updated integer DEFAULT 1 NOT NULL,
    sub_brand_idx integer,
    bottle_idx integer
);
-- Trigger to update last_updated and count_updated fields
DROP TRIGGER IF EXISTS trigger_assets_update ON baxus.assets;
CREATE TRIGGER trigger_assets_update BEFORE UPDATE ON baxus.assets FOR EACH ROW EXECUTE FUNCTION baxus.update_last_updated_and_counter();
-- Index on assets bottled_year for filtering
CREATE INDEX IF NOT EXISTS idx_assets_bottled_year ON baxus.assets(bottled_year);
-- Index on activity_feed asset_idx for joining to assets
CREATE INDEX IF NOT EXISTS idx_activity_feed_asset_idx ON baxus.activity_feed(asset_idx);
-- Index on assets age for filtering  
CREATE INDEX IF NOT EXISTS idx_assets_age ON baxus.assets(age);

CREATE TABLE IF NOT EXISTS baxus.producers (
    producer_idx SERIAL PRIMARY KEY,
    producer_name text,
    added_date timestamp  DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS baxus.brands (
    brand_idx SERIAL PRIMARY KEY,
    producer_idx integer NOT NULL,
    brand_name text,
    added_date timestamp  DEFAULT now() NOT NULL,
    reviewed_by text,
    reviewed_at timestamp ,
    CONSTRAINT fk_baxus_brands_producer_idx
        FOREIGN KEY (producer_idx)
        REFERENCES baxus.producers (producer_idx)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS baxus.sub_brands (
    sub_brand_idx SERIAL PRIMARY KEY,
    brand_idx integer NOT NULL,
    sub_brand_name text,
    added_date timestamp  DEFAULT now() NOT NULL,
    CONSTRAINT fk_baxus_sub_brands_brand_idx  
        FOREIGN KEY (brand_idx)
        REFERENCES baxus.brands (brand_idx)
        ON DELETE NO ACTION  
        ON UPDATE NO ACTION  
);

CREATE TABLE IF NOT EXISTS baxus.dim_activity_types (
    activity_type_idx SERIAL PRIMARY KEY,
    activity_type_code VARCHAR(50),
    activity_type_name VARCHAR(100)
);
-- Add unique constraint if it doesn't exist (for existing tables)
CREATE UNIQUE INDEX IF NOT EXISTS dim_activity_types_activity_type_code_unique ON baxus.dim_activity_types(activity_type_code);

INSERT INTO baxus.dim_activity_types (activity_type_code, activity_type_name)
VALUES 
  ('NEW_LISTING', 'New Listing'),
  ('BURN', 'Burn'),
  ('MINT', 'Mint'),
  ('PURCHASE', 'Purchase')
ON CONFLICT (activity_type_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS baxus.bottle_releases (
    bottle_idx SERIAL PRIMARY KEY,
    sub_brand_idx integer NOT NULL,
    bottle_name text NOT NULL,
    bottled_year integer,
    bottle_age integer,
    added_date timestamp  DEFAULT now() NOT NULL,
      CONSTRAINT fk_baxus_bottle_releases_sub_brand_idx
        FOREIGN KEY (sub_brand_idx)
        REFERENCES baxus.sub_brands (sub_brand_idx)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
);
