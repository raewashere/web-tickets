  -- =============================================================================
    -- TicketFlow — Migration 017: Fix Super-Admin RPCs, Types & Permissions
    -- =============================================================================
    
    -- 1. Helper function: Check if user is admin
    CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public, auth
    AS $$
    BEGIN
      -- If executed directly in SQL Editor / DB console as postgres or service_role
      IF current_user IN ('postgres', 'supabase_admin', 'service_role') AND p_user_id IS NULL THEN
        RETURN TRUE;
      END IF;
    
      IF p_user_id IS NULL THEN
        RETURN FALSE;
      END IF;
    
      RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = p_user_id AND user_roles.role = 'admin'
      );
    END;
    $$;
    
    -- 2. RPC: Get global platform business metrics
    CREATE OR REPLACE FUNCTION get_global_platform_metrics()
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $$
    #variable_conflict use_column
    DECLARE
      v_gmv NUMERIC := 0;
      v_commissions NUMERIC := 0;
      v_orders_count BIGINT := 0;
      v_tickets_sold BIGINT := 0;
      v_events_count BIGINT := 0;
      v_active_events_count BIGINT := 0;
      v_venues_count BIGINT := 0;
      v_verified_venues_count BIGINT := 0;
      v_artists_count BIGINT := 0;
      v_users_count BIGINT := 0;
    BEGIN
      IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Only super-administrators can view platform metrics.';
      END IF;
    
      -- 1. GMV, Platform Commission & Orders
      SELECT
        COALESCE(SUM(o.total), 0),
        COALESCE(SUM(o.commission_amount), 0),
        COUNT(o.id)
      INTO v_gmv, v_commissions, v_orders_count
      FROM orders o
      WHERE o.status = 'confirmed';
    
      -- 2. Tickets Sold (Total sold across all ticket types)
      SELECT COALESCE(SUM(tt.sold), 0)
      INTO v_tickets_sold
      FROM ticket_types tt;
    
      -- 3. Events
      SELECT COUNT(e.id), COUNT(e.id) FILTER (WHERE e.status = 'published' AND e.event_date >= NOW())
      INTO v_events_count, v_active_events_count
      FROM events e;
    
      -- 4. Venues
      SELECT COUNT(v.id), COUNT(v.id) FILTER (WHERE v.verified = true)
      INTO v_venues_count, v_verified_venues_count
      FROM venues v;
    
      -- 5. Artists & Users
      SELECT COUNT(a.id) INTO v_artists_count FROM artists a;
      SELECT COUNT(u.id) INTO v_users_count FROM auth.users u;
    
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
    
    -- 3. RPC: Get all venues for moderation
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
    #variable_conflict use_column
    BEGIN
      IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Only super-administrators can access venue moderation.';
      END IF;
    
      RETURN QUERY
      SELECT
        v.id,
        v.name::TEXT,
        v.latitude::DOUBLE PRECISION,
        v.longitude::DOUBLE PRECISION,
        v.map_url::TEXT,
        COALESCE(v.verified, false),
        v.created_at,
        v.created_by,
        COALESCE(u.email, '')::TEXT AS creator_email,
        COUNT(DISTINCT vc.id)::BIGINT AS configurations_count,
        COALESCE(SUM(vc.capacity), 0)::BIGINT AS total_capacity,
        COUNT(DISTINCT e.id)::BIGINT AS events_count
      FROM venues v
      LEFT JOIN auth.users u ON u.id = v.created_by
      LEFT JOIN venue_configurations vc ON vc.venue_id = v.id
      LEFT JOIN events e ON e.venue_id = v.id
      GROUP BY v.id, v.name, v.latitude, v.longitude, v.map_url, v.verified, v.created_at, v.created_by, u.email
      ORDER BY v.created_at DESC;
    END;
    $$;
    
    -- 4. RPC: Get all users with assigned roles
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
    #variable_conflict use_column
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
        ARRAY_REMOVE(ARRAY_AGG(ur.role::TEXT), NULL)::TEXT[] AS roles,
        u.created_at,
        u.last_sign_in_at
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      LEFT JOIN public.user_roles ur ON ur.user_id = u.id
      GROUP BY u.id, u.email, p.display_name, p.avatar_url, u.raw_user_meta_data, u.created_at, u.last_sign_in_at
      ORDER BY u.created_at DESC;
    END;
    $$;
    
    -- 5. RPC: Get all artists financial overview
    CREATE OR REPLACE FUNCTION get_all_artists_financial_overview()
    RETURNS TABLE (
      artist_id UUID,
      artist_name TEXT,
      artist_email TEXT,
      photo_url TEXT,
      total_events BIGINT,
      total_gross NUMERIC,
      total_commission NUMERIC,
      total_refunded NUMERIC,
      net_earnings NUMERIC,
      total_paid NUMERIC,
      balance_due NUMERIC,
      bank_name TEXT,
      bank_account_number TEXT,
      tax_id TEXT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $$
    #variable_conflict use_column
    BEGIN
      IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Acceso denegado: solo Super-Admin.';
      END IF;
    
      RETURN QUERY
      SELECT
        a.id AS artist_id,
        a.name::TEXT AS artist_name,
        COALESCE(a.email, u.email, '')::TEXT AS artist_email,
        a.photo_url::TEXT,
        COALESCE(e_cnt.cnt, 0)::BIGINT AS total_events,
        COALESCE(o_stats.gross, 0)::NUMERIC AS total_gross,
        COALESCE(o_stats.commission, 0)::NUMERIC AS total_commission,
        COALESCE(o_stats.refunded, 0)::NUMERIC AS total_refunded,
        GREATEST(0::NUMERIC, (COALESCE(o_stats.gross, 0) - COALESCE(o_stats.commission, 0)))::NUMERIC AS net_earnings,
        COALESCE(p_stats.paid, 0)::NUMERIC AS total_paid,
        GREATEST(0::NUMERIC, ((COALESCE(o_stats.gross, 0) - COALESCE(o_stats.commission, 0)) - COALESCE(p_stats.paid, 0)))::NUMERIC AS balance_due,
        s.bank_name::TEXT,
        s.bank_account_number::TEXT,
        s.tax_id::TEXT
      FROM artists a
      LEFT JOIN auth.users u ON u.id = a.user_id
      LEFT JOIN artist_payout_settings s ON s.artist_id = a.id
      LEFT JOIN (
        SELECT ev.artist_id AS sub_artist_id, COUNT(*)::BIGINT AS cnt
        FROM events ev
        GROUP BY ev.artist_id
      ) e_cnt ON e_cnt.sub_artist_id = a.id
      LEFT JOIN (
        SELECT
          ev2.artist_id AS sub_artist_id,
          SUM(CASE WHEN o.status = 'confirmed' THEN o.total ELSE 0 END) AS gross,
          SUM(CASE WHEN o.status = 'confirmed' THEN o.commission_amount ELSE 0 END) AS commission,
          SUM(CASE WHEN o.status = 'refunded' THEN o.total ELSE 0 END) AS refunded
        FROM orders o
        JOIN events ev2 ON ev2.id = o.event_id
        GROUP BY ev2.artist_id
      ) o_stats ON o_stats.sub_artist_id = a.id
      LEFT JOIN (
        SELECT po.artist_id AS sub_artist_id, SUM(po.amount) AS paid
        FROM payouts po
        WHERE po.status = 'completed'
        GROUP BY po.artist_id
      ) p_stats ON p_stats.sub_artist_id = a.id
      ORDER BY 11 DESC, 6 DESC;
    END;
    $$;

    -- 6. Grant Permissions to authenticated, anon and service_role
    GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION get_global_platform_metrics() TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION get_all_venues_for_moderation() TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION admin_set_user_role(UUID, role_type, BOOLEAN) TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION admin_toggle_venue_verification(UUID, BOOLEAN) TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION get_all_artists_financial_overview() TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION get_artist_financial_summary(UUID) TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION create_payout_record(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION upsert_artist_payout_settings(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION process_refund_request(UUID, BOOLEAN, TEXT) TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION get_all_refund_requests() TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION request_order_refund(UUID, TEXT) TO authenticated, service_role, anon;
