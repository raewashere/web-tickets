-- =============================================================================
-- TicketFlow — Migration 016: Artist Payouts & Financial Settlements
-- 20250116000000_payouts_and_settlements.sql
-- =============================================================================

-- 1. Create table artist_payout_settings
CREATE TABLE IF NOT EXISTS artist_payout_settings (
  artist_id UUID PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  tax_id TEXT,
  tax_regime TEXT,
  payout_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table payouts
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  payout_method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'paypal', 'manual')),
  reference_code TEXT,
  receipt_url TEXT,
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payouts_artist_id ON payouts(artist_id);
CREATE INDEX IF NOT EXISTS idx_payouts_event_id ON payouts(event_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- 3. Row Level Security Policies
ALTER TABLE artist_payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view their own payout settings"
  ON artist_payout_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artist_payout_settings.artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can insert/update their payout settings"
  ON artist_payout_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artist_payout_settings.artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to payout settings"
  ON artist_payout_settings FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Artists can view their own payouts"
  ON payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = payouts.artist_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to payouts"
  ON payouts FOR ALL
  USING (is_admin(auth.uid()));

-- 4. RPC: Upsert Artist Payout Settings
CREATE OR REPLACE FUNCTION upsert_artist_payout_settings(
  p_artist_id UUID,
  p_bank_name TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_account_holder TEXT DEFAULT NULL,
  p_tax_id TEXT DEFAULT NULL,
  p_tax_regime TEXT DEFAULT NULL,
  p_payout_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Check permission: Admin or artist owner
  IF is_admin(auth.uid()) THEN
    v_is_authorized := TRUE;
  ELSE
    SELECT TRUE INTO v_is_authorized
    FROM artists
    WHERE id = p_artist_id AND user_id = auth.uid();
  END IF;

  IF NOT COALESCE(v_is_authorized, FALSE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para modificar estos datos de pago.');
  END IF;

  INSERT INTO artist_payout_settings (
    artist_id,
    bank_name,
    bank_account_number,
    bank_account_holder,
    tax_id,
    tax_regime,
    payout_email,
    updated_at
  )
  VALUES (
    p_artist_id,
    TRIM(p_bank_name),
    TRIM(p_account_number),
    TRIM(p_account_holder),
    TRIM(p_tax_id),
    TRIM(p_tax_regime),
    TRIM(p_payout_email),
    NOW()
  )
  ON CONFLICT (artist_id) DO UPDATE
  SET bank_name = EXCLUDED.bank_name,
      bank_account_number = EXCLUDED.bank_account_number,
      bank_account_holder = EXCLUDED.bank_account_holder,
      tax_id = EXCLUDED.tax_id,
      tax_regime = EXCLUDED.tax_regime,
      payout_email = EXCLUDED.payout_email,
      updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Datos bancarios y fiscales guardados correctamente.');
END;
$$;

-- 5. RPC: Get Artist Financial Summary
CREATE OR REPLACE FUNCTION get_artist_financial_summary(
  p_artist_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_artist_id UUID := p_artist_id;
  v_artist RECORD;
  v_total_gross NUMERIC := 0;
  v_total_commission NUMERIC := 0;
  v_total_refunded NUMERIC := 0;
  v_net_earnings NUMERIC := 0;
  v_total_paid NUMERIC := 0;
  v_balance_due NUMERIC := 0;
  v_events_json JSONB := '[]'::JSONB;
  v_payouts_json JSONB := '[]'::JSONB;
  v_settings_json JSONB := '{}'::JSONB;
BEGIN
  -- If not provided, detect from caller
  IF v_target_artist_id IS NULL THEN
    SELECT id INTO v_target_artist_id
    FROM artists
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_target_artist_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se encontró el perfil de artista asociado.');
  END IF;

  -- Ensure caller is admin or this artist
  IF NOT is_admin(auth.uid()) THEN
    SELECT * INTO v_artist FROM artists WHERE id = v_target_artist_id AND user_id = auth.uid();
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para ver estos datos financieros.');
    END IF;
  ELSE
    SELECT * INTO v_artist FROM artists WHERE id = v_target_artist_id;
  END IF;

  -- Calculate Gross & Platform Commission (confirmed orders)
  SELECT
    COALESCE(SUM(o.total), 0),
    COALESCE(SUM(o.commission_amount), 0)
  INTO v_total_gross, v_total_commission
  FROM orders o
  JOIN events e ON e.id = o.event_id
  WHERE e.artist_id = v_target_artist_id AND o.status = 'confirmed';

  -- Calculate Refunded Orders Total
  SELECT COALESCE(SUM(o.total), 0)
  INTO v_total_refunded
  FROM orders o
  JOIN events e ON e.id = o.event_id
  WHERE e.artist_id = v_target_artist_id AND o.status = 'refunded';

  -- Net Earnings
  v_net_earnings := GREATEST(0, v_total_gross - v_total_commission);

  -- Total Paid / Dispersed
  SELECT COALESCE(SUM(p.amount), 0)
  INTO v_total_paid
  FROM payouts p
  WHERE p.artist_id = v_target_artist_id AND p.status = 'completed';

  -- Balance Due
  v_balance_due := GREATEST(0, v_net_earnings - v_total_paid);

  -- Events Breakdown JSON
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'event_id', e.id,
        'event_name', e.name,
        'event_date', e.event_date,
        'status', e.status,
        'flyer_url', e.flyer_url,
        'venue_name', v.name,
        'tickets_sold', COALESCE(t_stats.sold_count, 0),
        'gross', COALESCE(o_stats.gross, 0),
        'commission', COALESCE(o_stats.commission, 0),
        'refunded', COALESCE(o_stats.refunded, 0),
        'net', GREATEST(0, COALESCE(o_stats.gross, 0) - COALESCE(o_stats.commission, 0)),
        'paid', COALESCE(p_stats.paid, 0),
        'balance', GREATEST(0, (COALESCE(o_stats.gross, 0) - COALESCE(o_stats.commission, 0)) - COALESCE(p_stats.paid, 0))
      )
      ORDER BY e.event_date DESC
    ),
    '[]'::JSONB
  )
  INTO v_events_json
  FROM events e
  LEFT JOIN venues v ON v.id = e.venue_id
  LEFT JOIN (
    SELECT event_id, SUM(sold) AS sold_count
    FROM ticket_types
    GROUP BY event_id
  ) t_stats ON t_stats.event_id = e.id
  LEFT JOIN (
    SELECT
      event_id,
      SUM(CASE WHEN status = 'confirmed' THEN total ELSE 0 END) AS gross,
      SUM(CASE WHEN status = 'confirmed' THEN commission_amount ELSE 0 END) AS commission,
      SUM(CASE WHEN status = 'refunded' THEN total ELSE 0 END) AS refunded
    FROM orders
    GROUP BY event_id
  ) o_stats ON o_stats.event_id = e.id
  LEFT JOIN (
    SELECT event_id, SUM(amount) AS paid
    FROM payouts
    WHERE status = 'completed' AND event_id IS NOT NULL
    GROUP BY event_id
  ) p_stats ON p_stats.event_id = e.id
  WHERE e.artist_id = v_target_artist_id;

  -- Payouts History JSON
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'event_id', p.event_id,
        'event_name', e.name,
        'amount', p.amount,
        'currency', p.currency,
        'status', p.status,
        'payout_method', p.payout_method,
        'reference_code', p.reference_code,
        'receipt_url', p.receipt_url,
        'notes', p.notes,
        'processed_at', p.processed_at,
        'created_at', p.created_at
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_payouts_json
  FROM payouts p
  LEFT JOIN events e ON e.id = p.event_id
  WHERE p.artist_id = v_target_artist_id;

  -- Payout Settings JSON
  SELECT to_jsonb(s.*)
  INTO v_settings_json
  FROM artist_payout_settings s
  WHERE s.artist_id = v_target_artist_id;

  RETURN jsonb_build_object(
    'success', true,
    'artist_id', v_target_artist_id,
    'artist_name', v_artist.name,
    'total_gross', v_total_gross,
    'total_commission', v_total_commission,
    'total_refunded', v_total_refunded,
    'net_earnings', v_net_earnings,
    'total_paid', v_total_paid,
    'balance_due', v_balance_due,
    'events', v_events_json,
    'payouts', v_payouts_json,
    'settings', COALESCE(v_settings_json, '{}'::JSONB)
  );
END;
$$;

-- 6. RPC: Get All Artists Financial Overview (Super-Admin)
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
    COALESCE(e_cnt.cnt, 0) AS total_events,
    COALESCE(o_stats.gross, 0) AS total_gross,
    COALESCE(o_stats.commission, 0) AS total_commission,
    COALESCE(o_stats.refunded, 0) AS total_refunded,
    GREATEST(0, COALESCE(o_stats.gross, 0) - COALESCE(o_stats.commission, 0)) AS net_earnings,
    COALESCE(p_stats.paid, 0) AS total_paid,
    GREATEST(0, (COALESCE(o_stats.gross, 0) - COALESCE(o_stats.commission, 0)) - COALESCE(p_stats.paid, 0)) AS balance_due,
    s.bank_name::TEXT,
    s.bank_account_number::TEXT,
    s.tax_id::TEXT
  FROM artists a
  LEFT JOIN auth.users u ON u.id = a.user_id
  LEFT JOIN artist_payout_settings s ON s.artist_id = a.id
  LEFT JOIN (
    SELECT artist_id, COUNT(*) AS cnt
    FROM events
    GROUP BY artist_id
  ) e_cnt ON e_cnt.artist_id = a.id
  LEFT JOIN (
    SELECT
      e.artist_id,
      SUM(CASE WHEN o.status = 'confirmed' THEN o.total ELSE 0 END) AS gross,
      SUM(CASE WHEN o.status = 'confirmed' THEN o.commission_amount ELSE 0 END) AS commission,
      SUM(CASE WHEN o.status = 'refunded' THEN o.total ELSE 0 END) AS refunded
    FROM orders o
    JOIN events e ON e.id = o.event_id
    GROUP BY e.artist_id
  ) o_stats ON o_stats.artist_id = a.id
  LEFT JOIN (
    SELECT artist_id, SUM(amount) AS paid
    FROM payouts
    WHERE status = 'completed'
    GROUP BY artist_id
  ) p_stats ON p_stats.artist_id = a.id
  ORDER BY balance_due DESC, total_gross DESC;
END;
$$;

-- 7. RPC: Create Payout Record (Admin)
CREATE OR REPLACE FUNCTION create_payout_record(
  p_artist_id UUID,
  p_event_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_method TEXT DEFAULT 'bank_transfer',
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_payout_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo administradores pueden dispersar o registrar pagos.');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El importe a liquidar debe ser mayor a cero.');
  END IF;

  INSERT INTO payouts (
    artist_id,
    event_id,
    amount,
    currency,
    status,
    payout_method,
    reference_code,
    receipt_url,
    notes,
    processed_by,
    processed_at
  )
  VALUES (
    p_artist_id,
    p_event_id,
    p_amount,
    'MXN',
    'completed',
    p_method,
    TRIM(p_reference),
    TRIM(p_receipt_url),
    TRIM(p_notes),
    auth.uid(),
    NOW()
  )
  RETURNING id INTO v_payout_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'message', 'Liquidación registrada y aplicada al balance del artista exitosamente.'
  );
END;
$$;
