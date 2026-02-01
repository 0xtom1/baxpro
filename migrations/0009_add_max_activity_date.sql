-- Add max_activity_date to v_asset_summary and mv_brands_list

-- Drop materialized view first (depends on the view)
DROP MATERIALIZED VIEW IF EXISTS baxus.mv_brands_list;

-- Update v_asset_summary to include max_activity_date
DROP VIEW IF EXISTS baxus.v_asset_summary;

CREATE OR REPLACE VIEW baxus.v_asset_summary AS
SELECT 
  a.asset_idx,
  a.asset_id,
  a.name,
  (a.asset_json -> 'bottle_release' ->> 'brand_name') AS brand_name,
  a.is_listed,
  a.listed_date,
  a.price,
  a.age,
  a.bottled_year,
  (a.asset_json -> 'bottle_release' ->> 'market_price')::DOUBLE PRECISION AS market_price,
  jsonb_path_query_first(a.metadata_json, '$.attributes[*] ? (@.trait_type == "Producer").value') #>> '{}' AS producer,
  a.metadata_json ->> 'image' AS image_url,
  a.asset_json ->> 'current_owner_id' AS current_owner_id,
  (
    SELECT COALESCE(SUM(af.price), 0)
    FROM baxus.activity_feed af
    JOIN baxus.dim_activity_types dat ON af.activity_type_idx = dat.activity_type_idx
    WHERE af.asset_idx = a.asset_idx
      AND dat.activity_type_code = 'PURCHASE'
      AND af.activity_date >= CURRENT_DATE - INTERVAL '7 days'
  ) AS volume_7d,
  (
    SELECT COALESCE(SUM(af.price), 0)
    FROM baxus.activity_feed af
    JOIN baxus.dim_activity_types dat ON af.activity_type_idx = dat.activity_type_idx
    WHERE af.asset_idx = a.asset_idx
      AND dat.activity_type_code = 'PURCHASE'
      AND af.activity_date >= CURRENT_DATE - INTERVAL '30 days'
  ) AS volume_30d,
  (
    SELECT MAX(af.activity_date)
    FROM baxus.activity_feed af
    WHERE af.asset_idx = a.asset_idx
  ) AS max_activity_date
FROM baxus.assets a
WHERE (a.asset_json ->> 'status') IS DISTINCT FROM 'REDEEMED';

-- Create materialized view with max_activity_date
CREATE MATERIALIZED VIEW baxus.mv_brands_list AS
SELECT 
  v.brand_name,
  v.producer,
  COUNT(*) as asset_count,
  COUNT(*) FILTER (WHERE v.is_listed = true) as listed_count,
  MIN(v.price) FILTER (WHERE v.is_listed = true) as floor_price,
  MAX(v.image_url) as image_url,
  SUM(v.volume_7d) as volume_7d,
  SUM(v.volume_30d) as volume_30d,
  COUNT(DISTINCT v.current_owner_id) as distinct_owners_count,
  MAX(v.max_activity_date) as max_activity_date
FROM baxus.v_asset_summary v
WHERE v.brand_name IS NOT NULL
GROUP BY v.brand_name, v.producer;

-- Create indexes for faster ordering/pagination
CREATE UNIQUE INDEX mv_brands_list_brand_producer_idx 
ON baxus.mv_brands_list (brand_name, producer);

CREATE INDEX mv_brands_list_listed_count_idx 
ON baxus.mv_brands_list (listed_count DESC, asset_count DESC);

CREATE INDEX mv_brands_list_max_activity_date_idx 
ON baxus.mv_brands_list (max_activity_date DESC NULLS LAST);

-- To refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY baxus.mv_brands_list;
