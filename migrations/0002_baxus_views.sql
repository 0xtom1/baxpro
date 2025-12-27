DROP VIEW IF EXISTS baxus.v_brands;
DROP VIEW IF EXISTS baxus.v_bottle_releases_shared_sub_brand_attributes;
DROP VIEW IF EXISTS baxus.v_bottle_releases_shared_brand_attributes;
DROP VIEW IF EXISTS baxus.v_bottle_releases_assets;
DROP VIEW IF EXISTS baxus.v_assets;
DROP VIEW IF EXISTS baxus.v_activity_feed;

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

CREATE OR REPLACE VIEW baxus.v_assets AS
SELECT 
  a.asset_idx,
  a.asset_id,
  a.baxus_idx,
  a.name,
  a.price,
  a.bottled_year,
  a.age,
  jsonb_path_query_first(a.metadata_json, '$.attributes[*] ? (@.trait_type == "Producer").value') #>> '{}' AS producer,
  a.is_listed,
  a.listed_date,
  a.asset_json,
  a.metadata_json,
  a.added_date,
  a.last_updated,
  a.count_updated
FROM baxus.assets a;

CREATE OR REPLACE VIEW baxus.v_bottle_releases_assets AS
SELECT 
  r.bottle_idx,
  r.sub_brand_idx,
  r.bottle_name,
  r.bottled_year,
  r.bottle_age,
  (ARRAY_AGG(metadata_json ORDER BY asset_idx DESC))[1] AS metadata_json,
  (ARRAY_AGG(asset_json ORDER BY asset_idx DESC))[1] AS asset_json,
  COUNT(a.*) AS asset_count
FROM baxus.bottle_releases AS r
JOIN baxus.assets AS a ON a.bottle_idx = r.bottle_idx
GROUP BY 
  r.bottle_idx,
  r.sub_brand_idx,
  r.bottle_name,
  r.bottled_year,
  r.bottle_age;

CREATE OR REPLACE VIEW baxus.v_bottle_releases_shared_brand_attributes AS
SELECT 
  sb.brand_idx,
  kv.key,
  (ARRAY_AGG(kv.value))[1] AS value
FROM baxus.v_bottle_releases_assets AS r
JOIN baxus.sub_brands AS sb ON r.sub_brand_idx = sb.sub_brand_idx,
LATERAL jsonb_each(asset_json -> 'bottle_release') AS kv(key, value)
WHERE kv.key NOT IN (
  'updated_at', 'brand_name', 'brand_id', 'bottle_release_id', 'created_at', 
  'image_url', 'market_price', 'name', 'objectID', 'outturn', 'popularity', 
  'community_bar_average_price', 'community_bar_count', 'description', 
  'price_confidence_score', 'market_price_updated_at', 'bottle_class_id', 'msrp_updated_at'
)
GROUP BY sb.brand_idx, kv.key
HAVING COUNT(DISTINCT kv.value) = 1 AND (ARRAY_AGG(kv.value))[1] != 'null';

CREATE OR REPLACE VIEW baxus.v_bottle_releases_shared_sub_brand_attributes AS
SELECT 
  r.sub_brand_idx,
  kv.key,
  (ARRAY_AGG(kv.value))[1] AS value
FROM baxus.v_bottle_releases_assets AS r,
LATERAL jsonb_each(asset_json -> 'bottle_release') AS kv(key, value)
WHERE kv.key NOT IN (
  'updated_at', 'brand_name', 'brand_id', 'bottle_release_id', 'created_at', 
  'image_url', 'market_price', 'name', 'objectID', 'outturn', 'popularity', 
  'community_bar_average_price', 'community_bar_count', 'description', 
  'price_confidence_score', 'market_price_updated_at', 'bottle_class_id', 'msrp_updated_at'
)
GROUP BY r.sub_brand_idx, kv.key
HAVING COUNT(DISTINCT kv.value) = 1 AND (ARRAY_AGG(kv.value))[1] != 'null';

CREATE OR REPLACE VIEW baxus.v_brands AS
SELECT 
  p.producer_idx,
  p.producer_name,
  p.added_date AS producer_added_date,
  b.brand_idx,
  b.brand_name,
  b.added_date AS brand_added_date,
  sb.sub_brand_idx,
  sb.sub_brand_name,
  sb.added_date AS sub_brand_added_date,
  COALESCE(SUM(vbr.asset_count), 0)::BIGINT AS asset_count
FROM baxus.producers p
JOIN baxus.brands b ON p.producer_idx = b.producer_idx
JOIN baxus.sub_brands sb ON b.brand_idx = sb.brand_idx
LEFT JOIN baxus.v_bottle_releases_assets vbr ON vbr.sub_brand_idx = sb.sub_brand_idx
GROUP BY 
  p.producer_idx, p.producer_name, p.added_date,
  b.brand_idx, b.brand_name, b.added_date,
  sb.sub_brand_idx, sb.sub_brand_name, sb.added_date;
