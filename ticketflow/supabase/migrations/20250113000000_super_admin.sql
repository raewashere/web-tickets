-- =============================================================================
-- TicketFlow — Migration 013: Super-Admin Functions & Moderation RPCs
-- 20250113000000_super_admin.sql
-- =============================================================================

-- 1. Helper function: Check if current authenticated user has 'admin' role
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
$$;

-- 2. RPC: Get all users with their assigned roles (only for admins)
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  roles TEXT[],
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only super-administrators can view global user accounts.';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    COALESCE(p.display_name, (u.raw_user_meta_data->>'full_name'), (u.raw_user_meta_data->>'display_name'), u.email)::TEXT AS display_name,
    COALESCE(p.avatar_url, (u.raw_user_meta_data->>'avatar_url'), (u.raw_user_meta_data->>'picture'))::TEXT AS avatar_url,
    ARRAY_REMOVE(ARRAY_AGG(ur.role), NULL)::TEXT[] AS roles,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.email, p.display_name, p.avatar_url, u.raw_user_meta_data, u.created_at, u.last_sign_in_at
  ORDER BY u.created_at DESC;
END;
$$;

-- 3. RPC: Toggle or set a user role (only for admins)
CREATE OR REPLACE FUNCTION admin_set_user_role(
  p_target_user_id UUID,
  p_role role_type,
  p_should_have BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only super-administrators can modify user roles.';
  END IF;

  IF p_should_have THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_target_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = p_target_user_id AND role = p_role;
  END IF;
END;
$$;

-- 4. RPC: Toggle venue verification (only for admins)
CREATE OR REPLACE FUNCTION admin_toggle_venue_verification(
  p_venue_id UUID,
  p_verified BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only super-administrators can verify venues.';
  END IF;

  UPDATE public.venues
  SET verified = p_verified
  WHERE id = p_venue_id;
END;
$$;

-- 5. RPC: Get global platform business metrics (only for admins)
CREATE OR REPLACE FUNCTION get_global_platform_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_gmv NUMERIC;
  v_commissions NUMERIC;
  v_orders_count BIGINT;
  v_tickets_sold BIGINT;
  v_events_count BIGINT;
  v_active_events_count BIGINT;
  v_venues_count BIGINT;
  v_verified_venues_count BIGINT;
  v_artists_count BIGINT;
  v_users_count BIGINT;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only super-administrators can view platform metrics.';
  END IF;

  -- 1. GMV & Orders
  SELECT COALESCE(SUM(total), 0), COUNT(id)
  INTO v_gmv, v_orders_count
  FROM orders
  WHERE status = 'confirmed';

  -- 2. Commission & Tickets Sold
  SELECT COALESCE(SUM(oi.unit_price * oi.quantity * (COALESCE(e.commission_rate, 0.05))), 0),
         COALESCE(SUM(oi.quantity), 0)
  INTO v_commissions, v_tickets_sold
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN events e ON e.id = o.event_id
  WHERE o.status = 'confirmed';

  -- 3. Events
  SELECT COUNT(id), COUNT(id) FILTER (WHERE status = 'published' AND event_date >= NOW())
  INTO v_events_count, v_active_events_count
  FROM events;

  -- 4. Venues
  SELECT COUNT(id), COUNT(id) FILTER (WHERE verified = true)
  INTO v_venues_count, v_verified_venues_count
  FROM venues;

  -- 5. Artists & Users
  SELECT COUNT(id) INTO v_artists_count FROM artists;
  SELECT COUNT(id) INTO v_users_count FROM auth.users;

  RETURN jsonb_build_object(
    'total_gmv', v_gmv,
    'total_platform_commission', v_commissions,
    'total_orders_count', v_orders_count,
    'total_tickets_sold', v_tickets_sold,
    'total_events_count', v_events_count,
    'active_events_count', v_active_events_count,
    'total_venues_count', v_venues_count,
    'verified_venues_count', v_verified_venues_count,
    'total_artists_count', v_artists_count,
    'total_users_count', v_users_count
  );
END;
$$;

-- 6. RPC: Get all venues with stats for moderation (only for admins)
CREATE OR REPLACE FUNCTION get_all_venues_for_moderation()
RETURNS TABLE (
  id UUID,
  name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  map_url TEXT,
  verified BOOLEAN,
  created_at TIMESTAMPTZ,
  created_by UUID,
  creator_email TEXT,
  configurations_count BIGINT,
  total_capacity BIGINT,
  events_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only super-administrators can access venue moderation.';
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.name,
    v.latitude,
    v.longitude,
    v.map_url,
    v.verified,
    v.created_at,
    v.created_by,
    u.email::TEXT AS creator_email,
    COUNT(DISTINCT vc.id) AS configurations_count,
    COALESCE(SUM(DISTINCT vc.capacity), 0)::BIGINT AS total_capacity,
    COUNT(DISTINCT e.id) AS events_count
  FROM venues v
  LEFT JOIN auth.users u ON u.id = v.created_by
  LEFT JOIN venue_configurations vc ON vc.venue_id = v.id
  LEFT JOIN events e ON e.venue_id = v.id
  GROUP BY v.id, v.name, v.latitude, v.longitude, v.map_url, v.verified, v.created_at, v.created_by, u.email
  ORDER BY v.created_at DESC;
END;
$$;
