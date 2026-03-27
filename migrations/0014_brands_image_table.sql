-- Create brands_image table for overridable brand images
CREATE TABLE IF NOT EXISTS baxus.brands_image (
  brands_image_idx SERIAL NOT NULL PRIMARY KEY,
  brand_name TEXT,
  image_url TEXT
);

-- Populate from current mv_brands_list
INSERT INTO baxus.brands_image (brand_name, image_url)
SELECT brand_name, image_url
FROM baxus.mv_brands_list
WHERE brand_name IS NOT NULL
      AND image_url LIKE '%baxus%';

-- Drop existing indexes
DROP INDEX IF EXISTS baxus.mv_brands_list_brand_name_idx;
DROP INDEX IF EXISTS baxus.mv_brands_list_listed_count_idx;
DROP INDEX IF EXISTS baxus.mv_brands_list_max_activity_date_idx;

-- Recreate materialized view with left join to brands_image
DROP MATERIALIZED VIEW IF EXISTS baxus.mv_brands_list;

CREATE MATERIALIZED VIEW baxus.mv_brands_list AS
SELECT 
  v.brand_name,
  MAX(v.producer) as producer,
  COUNT(*) as asset_count,
  COUNT(*) FILTER (WHERE v.is_listed = true) as listed_count,
  MIN(v.price) FILTER (WHERE v.is_listed = true) as floor_price,
  COALESCE(bi.image_url, MAX(v.image_url)) as image_url,
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
