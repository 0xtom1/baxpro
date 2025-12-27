CREATE TABLE IF NOT EXISTS public.users (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    provider text NOT NULL,
    provider_id text NOT NULL,
    last_login_at timestamp ,
    created_at timestamp  DEFAULT now() NOT NULL,
    sms_consent boolean DEFAULT false NOT NULL,
    email_consent boolean DEFAULT false NOT NULL,
    seen_notification_setup boolean DEFAULT false NOT NULL,
    display_name text,
    baxus_wallet character varying(44) DEFAULT NULL,
    is_vip boolean DEFAULT false NOT NULL,
  CONSTRAINT users_email_unique UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS public.alerts (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    name text NOT NULL,
    match_strings text[] NOT NULL,
    max_price integer NOT NULL,
    bottled_year_min integer,
    bottled_year_max integer,
    age_min integer,
    age_max integer,
    created_at timestamp  DEFAULT now() NOT NULL,
    match_all boolean DEFAULT false NOT NULL,
    matching_assets_string character varying(200) DEFAULT NULL,
    matching_assets_last_updated timestamp ,
    CONSTRAINT alerts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.alert_matches (
    match_idx SERIAL PRIMARY KEY,
    alert_id character varying NOT NULL,
    listing_source character varying(50) NOT NULL,
    activity_idx integer NOT NULL,
    asset_idx integer NOT NULL,
    created_at timestamp  DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.alert_assets (
  alert_id varchar NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  activity_idx integer NOT NULL REFERENCES baxus.activity_feed(activity_idx) ON DELETE CASCADE,
  CONSTRAINT alert_assets_alert_id_activity_idx_unique UNIQUE(alert_id, activity_idx)
);
-- Index on alert_assets alert_id for lookups
CREATE INDEX IF NOT EXISTS idx_alert_assets_alert_id ON alert_assets(alert_id);

CREATE TABLE IF NOT EXISTS public.email_logs (
    email_idx SERIAL PRIMARY KEY,
    match_idx integer,
    user_id character varying NOT NULL,
    asset_idx integer NOT NULL,
    email_address character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    response_code integer,
    sent_at timestamp  DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS email_logs_user_id_idx ON email_logs (user_id);
CREATE INDEX IF NOT EXISTS email_logs_match_idx_idx ON email_logs (match_idx);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON email_logs (sent_at);
