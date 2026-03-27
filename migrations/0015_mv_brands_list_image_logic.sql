-- Update mv_brands_list: MIN(producer), improved image_url fallback logic

-- Drop existing indexes
DROP INDEX IF EXISTS baxus.mv_brands_list_brand_name_idx;
DROP INDEX IF EXISTS baxus.mv_brands_list_listed_count_idx;
DROP INDEX IF EXISTS baxus.mv_brands_list_max_activity_date_idx;

-- Drop and recreate the materialized view
DROP MATERIALIZED VIEW IF EXISTS baxus.mv_brands_list;

CREATE MATERIALIZED VIEW baxus.mv_brands_list AS
SELECT 
  v.brand_name,
  MIN(v.producer) as producer,
  COUNT(*) as asset_count,
  COUNT(*) FILTER (WHERE v.is_listed = true) as listed_count,
  MIN(v.price) FILTER (WHERE v.is_listed = true) as floor_price,
  COALESCE(
    bi.image_url,
    MAX(v.image_url) FILTER (WHERE v.image_url ILIKE '%baxus%'),
    MIN(v.image_url)
  ) as image_url,
  SUM(v.volume_7d) as volume_7d,
  SUM(v.volume_30d) as volume_30d,
  COUNT(DISTINCT v.current_owner_id) as distinct_owners_count,
  MAX(v.max_activity_date) as max_activity_date
FROM baxus.v_asset_summary v
LEFT JOIN baxus.brands_image bi ON v.brand_name = bi.brand_name
WHERE v.brand_name IS NOT NULL
GROUP BY v.brand_name, bi.image_url;

-- Recreate indexes
CREATE UNIQUE INDEX mv_brands_list_brand_name_idx 
ON baxus.mv_brands_list (brand_name);

CREATE INDEX mv_brands_list_listed_count_idx 
ON baxus.mv_brands_list (listed_count DESC, asset_count DESC);

CREATE INDEX mv_brands_list_max_activity_date_idx 
ON baxus.mv_brands_list (max_activity_date DESC NULLS LAST);

-- To refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY baxus.mv_brands_list;
