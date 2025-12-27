DROP VIEW IF EXISTS alerts_with_email_consent;

CREATE OR REPLACE VIEW alerts_with_email_consent AS
SELECT 
  a.id,
  a.user_id,
  u.email AS user_email,
  a.name,
  a.match_strings,
  a.max_price,
  a.bottled_year_min,
  a.bottled_year_max,
  a.age_min,
  a.age_max,
  a.created_at,
  a.match_all
FROM alerts a
JOIN users u ON a.user_id = u.id
WHERE u.email_consent = true;
