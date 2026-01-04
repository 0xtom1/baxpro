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
  (a.asset_json -> 'bottle_release' ->> 'market_price')::DOUBLE PRECISION AS market_price
FROM baxus.assets a;
