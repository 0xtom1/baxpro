-- Update v_asset_summary to exclude REDEEMED assets
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
  a.metadata_json ->> 'image' AS image_url
FROM baxus.assets a
WHERE (a.asset_json ->> 'status') IS DISTINCT FROM 'REDEEMED';

-- Materialized view for brands list (dashboard page)
-- This pre-computes the aggregations for faster dashboard loading

CREATE MATERIALIZED VIEW IF NOT EXISTS baxus.mv_brands_list AS
SELECT 
  v.brand_name,
  v.producer,
  COUNT(*) as asset_count,
  COUNT(*) FILTER (WHERE v.is_listed = true) as listed_count,
  MIN(v.price) FILTER (WHERE v.is_listed = true) as floor_price,
  MAX(v.image_url) as image_url
FROM baxus.v_asset_summary v
WHERE v.brand_name IS NOT NULL
GROUP BY v.brand_name, v.producer;

-- Create index for faster ordering/pagination
CREATE UNIQUE INDEX IF NOT EXISTS mv_brands_list_brand_producer_idx 
ON baxus.mv_brands_list (brand_name, producer);

CREATE INDEX IF NOT EXISTS mv_brands_list_listed_count_idx 
ON baxus.mv_brands_list (listed_count DESC, asset_count DESC);

-- To refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY baxus.mv_brands_list;
