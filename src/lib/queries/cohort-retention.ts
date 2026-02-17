/** @bypass-validator Razão: CTE necessário para cohort analysis. Query é constante, não input de usuário. */
import { query } from '../db';

const COHORT_SQL = `
  WITH user_cohorts AS (
    SELECT session_id, DATE_TRUNC('week', MIN(created_at)) AS cohort_week
    FROM poc_medbrain_wpp
    GROUP BY session_id
  ),
  user_activity AS (
    SELECT DISTINCT
      p.session_id,
      uc.cohort_week,
      DATE_TRUNC('week', p.created_at) AS activity_week
    FROM poc_medbrain_wpp p
    JOIN user_cohorts uc ON p.session_id = uc.session_id
  ),
  retention AS (
    SELECT
      cohort_week,
      (EXTRACT(EPOCH FROM (activity_week - cohort_week)) / 604800)::int AS weeks_after,
      COUNT(DISTINCT session_id) AS active_users
    FROM user_activity
    GROUP BY cohort_week, weeks_after
  ),
  cohort_sizes AS (
    SELECT cohort_week, COUNT(DISTINCT session_id) AS cohort_size
    FROM user_cohorts
    GROUP BY cohort_week
  )
  SELECT
    r.cohort_week,
    r.weeks_after,
    r.active_users,
    cs.cohort_size,
    ROUND((r.active_users * 100.0 / cs.cohort_size)::numeric, 1) AS retention_pct
  FROM retention r
  JOIN cohort_sizes cs ON r.cohort_week = cs.cohort_week
  WHERE r.weeks_after <= 12
  ORDER BY r.cohort_week, r.weeks_after
`;

export async function getCohortData() {
  return query(COHORT_SQL);
}
