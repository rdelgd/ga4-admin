-- sql/ai_sources_daily.sql
-- Expect named params:
--   @from_sfx, @to_sfx  (YYYYMMDD for _TABLE_SUFFIX range)
--   @needle             (optional, case-insensitive substring to filter `source`)
-- Identifiers rendered by CLI:
--   {{project}} . {{dataset}} . events_*

WITH base AS (
  SELECT
    PARSE_DATE('%Y%m%d', event_date) AS event_date,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source')  AS source,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'medium')  AS medium,
    user_pseudo_id,
    event_name
  FROM `{{project}}.{{dataset}}.events_*`
  WHERE _TABLE_SUFFIX BETWEEN @from_sfx AND @to_sfx
),
ai_labeled AS (
  SELECT
    event_date,
    LOWER(source) AS source_lc,
    CASE
      WHEN LOWER(source) LIKE '%chatgpt%'            THEN 'ChatGPT - AI'
      WHEN LOWER(source) LIKE '%perplexity%'         THEN 'Perplexity - AI'
      WHEN LOWER(source) LIKE '%gemini%'             THEN 'Gemini - AI'
      WHEN LOWER(source) LIKE '%copilot.microsoft%'  THEN 'Copilot.microsoft - AI'
      WHEN LOWER(source) LIKE '%claude%'             THEN 'Claude - AI'
      WHEN LOWER(source) LIKE '%meta%'               THEN 'Meta - AI'
      ELSE NULL
    END AS ai_channel,
    user_pseudo_id,
    event_name
  FROM base
  -- Optional filter: pass --param needle="chatgpt" (or needle=null for no filter)
  WHERE (@needle IS NULL OR LOWER(source) LIKE CONCAT('%', LOWER(@needle), '%'))
),
sessionized AS (
  -- sessions are event-scoped in GA4 export; approximate via 'session_start'
  SELECT
    event_date,
    ai_channel,
    user_pseudo_id,
    COUNTIF(event_name = 'session_start') AS sessions
  FROM ai_labeled
  WHERE ai_channel IS NOT NULL
  GROUP BY event_date, ai_channel, user_pseudo_id
)
SELECT
  event_date,
  ai_channel,
  SUM(sessions)                  AS sessions,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM sessionized
GROUP BY event_date, ai_channel
ORDER BY event_date, ai_channel;
