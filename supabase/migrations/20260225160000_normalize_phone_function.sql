-- SQL helper for normalized phone matching.
-- Strips country code (54/549), leading zeros, and formatting characters,
-- leaving 10 raw digits for Argentine numbers.

CREATE OR REPLACE FUNCTION public.normalize_phone(phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT
    CASE
      WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 13
        AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '549%'
        THEN substring(regexp_replace(phone, '[^0-9]', '', 'g') FROM 4)
      WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 12
        AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '54%'
        THEN substring(regexp_replace(phone, '[^0-9]', '', 'g') FROM 3)
      WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
        AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '0%'
        THEN substring(regexp_replace(phone, '[^0-9]', '', 'g') FROM 2)
      ELSE regexp_replace(phone, '[^0-9]', '', 'g')
    END;
$$;

-- Allow public read access (used in edge functions via service role)
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO authenticated, service_role;
