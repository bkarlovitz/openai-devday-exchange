-- Run with psql -v ON_ERROR_STOP=1. Period labels must match the source.
\if :{?snapshot_id}
\else
\set snapshot_id ''
\endif

WITH requested AS (
    SELECT *
    FROM (VALUES
        ('baseline', :'baseline_year', :'baseline_period'),
        ('target', :'target_year', :'target_period')
    ) AS periods(role, year, period)
),
selected AS (
    SELECT id, dataset_id, resource_key, resource_url, sha256, fetched_at
    FROM snapshot
    WHERE dataset_id = 'incasol'
      AND resource_key = 'qww9-bvhh'
      AND id = COALESCE(
          NULLIF(:'snapshot_id', '')::bigint,
          (SELECT id FROM latest_snapshot
           WHERE dataset_id = 'incasol' AND resource_key = 'qww9-bvhh')
      )
),
matched AS (
    SELECT p.role, p.year, p.period, r.row_number, r.data,
           CASE WHEN r.data->>'Renda' ~ '^[0-9]+([.][0-9]+)?$'
                THEN (r.data->>'Renda')::numeric END AS rent
    FROM requested p
    CROSS JOIN selected s
    JOIN source_row r ON r.snapshot_id = s.id
    WHERE r.data->>'Àmbit territorial' = 'Municipi'
      AND r.data->>'Codi territorial' = '08019'
      AND r.data->>'Tram de preus' = '> 600 euros/mes'
      AND r.data->>'Any' = p.year
      AND r.data->>'Període' = p.period
),
operands AS (
    SELECT count(*) FILTER (WHERE role = 'baseline') AS baseline_count,
           count(*) FILTER (WHERE role = 'target') AS target_count,
           max(rent) FILTER (WHERE role = 'baseline') AS baseline,
           max(rent) FILTER (WHERE role = 'target') AS target
    FROM matched
),
result AS (
    SELECT *, CASE
        WHEN NOT EXISTS (SELECT 1 FROM selected) THEN 'snapshot_unavailable'
        WHEN baseline_count > 1 OR target_count > 1 THEN 'ambiguous_rows'
        WHEN baseline_count = 0 OR target_count = 0 THEN 'missing_period'
        WHEN baseline IS NULL OR target IS NULL THEN 'missing_value'
        WHEN baseline = 0 THEN 'zero_baseline'
        ELSE 'ok'
    END AS status
    FROM operands
)
SELECT jsonb_pretty(jsonb_build_object(
    'status', status,
    'territoryCode', '08019',
    'priceBand', '> 600 euros/mes',
    'requestedPeriods', (SELECT jsonb_agg(to_jsonb(p) ORDER BY role) FROM requested p),
    'snapshot', (SELECT to_jsonb(s) || jsonb_build_object('id', s.id::text) FROM selected s),
    'rows', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY role, row_number) FROM matched m), '[]'::jsonb),
    'calculation', CASE WHEN status = 'ok' THEN jsonb_build_object(
        'baseline', baseline, 'target', target, 'unit', 'EUR/month',
        'formula', '(target - baseline) / baseline * 100',
        'percentChange', round((target - baseline) / NULLIF(baseline, 0) * 100, 2)
    ) END
))
FROM result;
