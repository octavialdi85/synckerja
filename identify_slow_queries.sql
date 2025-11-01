-- Identify Slow Queries in Supabase

-- 1. Check current query statistics
SELECT 
  queryid,
  query,
  calls,
  total_exec_time / 1000 as total_time_seconds,
  mean_exec_time / 1000 as avg_time_seconds,
  max_exec_time / 1000 as max_time_seconds,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND mean_exec_time > 100 -- Queries taking more than 100ms on average
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 2. Check for missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename IN ('daily_tasks', 'task_steps', 'task_steps_to_steps', 'task_step_history')
ORDER BY tablename, attname;

-- 3. Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('daily_tasks', 'task_steps', 'task_steps_to_steps', 'task_step_history', 'task_files')
ORDER BY size_bytes DESC;

-- 4. Check existing indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('daily_tasks', 'task_steps', 'task_steps_to_steps', 'task_step_history')
ORDER BY tablename, indexname;




