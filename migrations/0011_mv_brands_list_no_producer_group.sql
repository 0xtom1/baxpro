-- Update mv_brands_list to not group by producer
-- Instead, use MAX(producer) to get a single producer per brand

-- Drop existing indexes
DROP INDEX IF EXISTS baxus.mv_brands_list_brand_producer_idx;
DROP INDEX IF EXISTS baxus.mv_brands_list_listed_count_idx;

-- Drop and recreate the materialized view
DROP MATERIALIZED VIEW IF EXISTS baxus.mv_brands_list;

CREATE MATERIALIZED VIEW baxus.mv_brands_list AS
SELECT 
  v.brand_name,
  MAX(v.producer) as producer,
  COUNT(*) as asset_count,
  COUNT(*) FILTER (WHERE v.is_listed = true) as listed_count,
  MIN(v.price) FILTER (WHERE v.is_listed = true) as floor_price,
  MAX(v.image_url) as image_url,
  SUM(v.volume_7d) as volume_7d,
  SUM(v.volume_30d) as volume_30d,
  COUNT(DISTINCT v.current_owner_id) as distinct_owners_count,
  MAX(af.activity_date) as max_activity_date
FROM baxus.v_asset_summary v
LEFT JOIN baxus.activity_feed af ON v.asset_idx = af.asset_idx
WHERE v.brand_name IS NOT NULL
GROUP BY v.brand_name;

-- Create unique index on brand_name only (required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX mv_brands_list_brand_name_idx 
ON baxus.mv_brands_list (brand_name);

CREATE INDEX mv_brands_list_listed_count_idx 
ON baxus.mv_brands_list (listed_count DESC, asset_count DESC);

-- To refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY baxus.mv_brands_list;
