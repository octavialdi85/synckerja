-- RPC calculate_prorate_upgrade: return single JSON object matching frontend ProRateCalculation.
-- Contract: org_id, new_member_count, target_plan_id (optional). Returns one JSONB object (not array).
-- Frontend expects: { success, current_plan: {...}, target_plan: {...}, calculation: {...} }
-- Or on error: { error: "message" } (returned as 400 by edge function).

CREATE OR REPLACE FUNCTION public.calculate_prorate_upgrade(
  p_org_id uuid,
  p_new_member_count integer,
  p_target_plan_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub           record;
  v_current_plan  jsonb;
  v_target_plan   jsonb;
  v_end_ts        timestamptz;
  v_start_ts      timestamptz;
  v_now           timestamptz := now();
  v_total_days    integer;
  v_remaining_days integer;
  v_prorate_pct   numeric;
  v_member_diff   integer;
  v_is_plan_change boolean;
  v_is_upgrade    boolean;
  v_plan_change_charge numeric := 0;
  v_member_change_charge numeric := 0;
  v_prorate_amount numeric := 0;
  v_charge_now    boolean;
  v_change_type   text;
  v_scheduled_date timestamptz;
  v_current_daily_rate numeric;
  v_target_daily_rate numeric;
  v_result        jsonb;
BEGIN
  -- Fetch current subscription
  SELECT os.id, os.subscription_plan_id, os.member_count, os.billing_cycle,
         os.subscription_start_date, os.subscription_end_date, os.created_at,
         sp.id AS plan_id, sp.name AS plan_name, sp.base_price_per_member
  INTO v_sub
  FROM organization_subscriptions os
  LEFT JOIN subscription_plans sp ON sp.id = os.subscription_plan_id
  WHERE os.organization_id = p_org_id
  ORDER BY os.updated_at DESC
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object('error', 'No active subscription found for organization');
  END IF;

  v_current_plan := jsonb_build_object(
    'id', v_sub.plan_id,
    'name', COALESCE(v_sub.plan_name, 'Unknown'),
    'member_count', v_sub.member_count,
    'base_price_per_member', COALESCE(v_sub.base_price_per_member, 0),
    'billing_cycle', COALESCE(v_sub.billing_cycle, 'monthly'),
    'end_date', v_sub.subscription_end_date
  );

  -- Target plan: same as current if p_target_plan_id is null or same
  IF p_target_plan_id IS NOT NULL AND p_target_plan_id IS DISTINCT FROM v_sub.subscription_plan_id THEN
    SELECT jsonb_build_object('id', id, 'name', name, 'base_price_per_member', base_price_per_member)
    INTO v_target_plan
    FROM subscription_plans
    WHERE id = p_target_plan_id AND is_active = true
    LIMIT 1;
    IF NOT FOUND OR v_target_plan IS NULL THEN
      RETURN jsonb_build_object('error', 'Target plan not found or inactive');
    END IF;
    v_is_plan_change := true;
  ELSE
    v_target_plan := jsonb_build_object(
      'id', v_sub.plan_id,
      'name', COALESCE(v_sub.plan_name, 'Unknown'),
      'base_price_per_member', COALESCE(v_sub.base_price_per_member, 0)
    );
    v_is_plan_change := false;
  END IF;

  v_end_ts := (v_sub.subscription_end_date)::timestamptz;
  v_start_ts := (COALESCE(v_sub.subscription_start_date::timestamptz, v_sub.created_at::timestamptz));
  v_total_days := GREATEST(1, (EXTRACT(epoch FROM (v_end_ts - v_start_ts)) / 86400)::integer);
  v_remaining_days := GREATEST(0, (EXTRACT(epoch FROM (v_end_ts - v_now)) / 86400)::integer);
  v_prorate_pct := CASE WHEN v_total_days > 0 THEN (v_remaining_days::numeric / v_total_days) * 100 ELSE 0 END;
  v_member_diff := p_new_member_count - v_sub.member_count;

  IF v_sub.billing_cycle = 'yearly' THEN
    v_current_daily_rate := (COALESCE(v_sub.base_price_per_member, 0) * v_sub.member_count * 12.0 / 365.0);
  ELSE
    v_current_daily_rate := (COALESCE(v_sub.base_price_per_member, 0) * v_sub.member_count / 30.0);
  END IF;

  IF v_is_plan_change THEN
    v_target_daily_rate := (v_target_plan->>'base_price_per_member')::numeric * p_new_member_count;
    IF v_sub.billing_cycle = 'yearly' THEN
      v_target_daily_rate := v_target_daily_rate * 12.0 / 365.0;
    ELSE
      v_target_daily_rate := v_target_daily_rate / 30.0;
    END IF;
    v_plan_change_charge := GREATEST(0, (v_target_daily_rate - v_current_daily_rate) * v_remaining_days);
  ELSE
    v_target_daily_rate := v_current_daily_rate;
  END IF;

  IF v_member_diff > 0 THEN
    v_member_change_charge := (COALESCE(v_sub.base_price_per_member, 0) * v_member_diff * v_remaining_days::numeric / v_total_days);
    IF v_sub.billing_cycle = 'yearly' THEN
      v_member_change_charge := v_member_change_charge * 12.0 / 30.0;
    END IF;
  END IF;

  v_prorate_amount := ROUND((v_plan_change_charge + v_member_change_charge)::numeric, 0);
  v_is_upgrade := (v_member_diff > 0 OR v_is_plan_change);
  v_charge_now := (v_prorate_amount > 0 AND v_remaining_days >= 0);
  v_scheduled_date := CASE WHEN v_charge_now THEN v_now ELSE v_end_ts END;
  v_change_type := CASE
    WHEN v_member_diff > 0 AND NOT v_is_plan_change THEN 'member_increase'
    WHEN v_is_plan_change AND v_member_diff >= 0 THEN 'upgrade'
    WHEN v_is_plan_change AND v_member_diff < 0 THEN 'downgrade'
    ELSE 'downgrade'
  END;

  v_result := jsonb_build_object(
    'success', true,
    'current_plan', v_current_plan,
    'target_plan', jsonb_build_object(
      'id', v_target_plan->>'id',
      'name', v_target_plan->>'name',
      'base_price_per_member', (v_target_plan->>'base_price_per_member')::numeric
    ),
    'calculation', jsonb_build_object(
      'new_member_count', p_new_member_count,
      'member_difference', v_member_diff,
      'remaining_days', v_remaining_days,
      'total_days', v_total_days,
      'prorate_percentage', ROUND(v_prorate_pct, 2),
      'prorate_amount', v_prorate_amount,
      'plan_change_charge', ROUND(v_plan_change_charge, 0),
      'member_change_charge', ROUND(v_member_change_charge, 0),
      'is_upgrade', v_is_upgrade,
      'is_plan_change', v_is_plan_change,
      'charge_now', v_charge_now,
      'change_type', v_change_type,
      'scheduled_date', to_char(v_scheduled_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'current_daily_rate', ROUND(v_current_daily_rate, 2),
      'target_daily_rate', ROUND(COALESCE(v_target_daily_rate, v_current_daily_rate), 2),
      'current_plan_credit', 0
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.calculate_prorate_upgrade(uuid, integer, uuid) IS
'Returns a single JSONB object for prorate upgrade calculation. Shape matches frontend ProRateCalculation (success, current_plan, target_plan, calculation). On validation error returns { error: "message" }.';
