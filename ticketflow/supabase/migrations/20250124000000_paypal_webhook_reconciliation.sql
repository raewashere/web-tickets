-- =============================================================================
-- TicketFlow / BoletoCoqueto — Migration 024: PayPal Webhook & Reconciliation
-- 20250124000000_paypal_webhook_reconciliation.sql
-- =============================================================================
-- Implements asynchronous payment reconciliation for PayPal:
--
--   1. paypal_payment_intents: tracks every PayPal order created in
--      create-paypal-order with its session_id, event_id, coupon_id, buyer
--      identity (customer_id or guest_email/guest_name), and expected_total.
--      Allows the webhook to recover and emit tickets automatically if the
--      buyer's browser closes after paying, or auto-refund if locks expired.
--
--   2. paypal_webhook_events: idempotent audit log of all incoming PayPal
--      webhook notifications (PAYMENT.CAPTURE.COMPLETED, DENIED, REFUNDED,
--      REVERSED, CHECKOUT.ORDER.APPROVED).
--
--   3. get_paypal_reconciliation_report: Super-Admin RPC to inspect reconciled,
--      recovered, auto-refunded, or manual-refund-required transactions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table: paypal_payment_intents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paypal_payment_intents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_order_id   TEXT NOT NULL UNIQUE,
  paypal_capture_id TEXT,
  paypal_refund_id  TEXT,
  session_id        TEXT NOT NULL,
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  coupon_id         UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  customer_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email       TEXT,
  guest_name        TEXT,
  expected_total    NUMERIC(10, 2) NOT NULL CHECK (expected_total >= 0),
  captured_amount   NUMERIC(10, 2),
  currency          TEXT NOT NULL DEFAULT 'MXN',
  order_id          UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN (
      'created',
      'approved',
      'completed',
      'recovered_by_webhook',
      'auto_refunded',
      'needs_manual_refund',
      'refunded_externally',
      'denied',
      'failed'
    )
  ),
  error_message     TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paypal_payment_intents_session_id
  ON public.paypal_payment_intents(session_id);

CREATE INDEX IF NOT EXISTS idx_paypal_payment_intents_capture_id
  ON public.paypal_payment_intents(paypal_capture_id)
  WHERE paypal_capture_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paypal_payment_intents_status
  ON public.paypal_payment_intents(status);

CREATE INDEX IF NOT EXISTS idx_paypal_payment_intents_order_id
  ON public.paypal_payment_intents(order_id)
  WHERE order_id IS NOT NULL;

ALTER TABLE public.paypal_payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super-Admin can view paypal_payment_intents" ON public.paypal_payment_intents;
CREATE POLICY "Super-Admin can view paypal_payment_intents"
  ON public.paypal_payment_intents FOR SELECT
  USING (is_admin(auth.uid()));


-- ---------------------------------------------------------------------------
-- 2. Table: paypal_webhook_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_event_id    TEXT NOT NULL UNIQUE,
  event_type         TEXT NOT NULL,
  paypal_order_id    TEXT,
  paypal_capture_id  TEXT,
  resource_status    TEXT,
  amount             NUMERIC(10, 2),
  currency           TEXT,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processing_status  TEXT NOT NULL DEFAULT 'received' CHECK (
    processing_status IN (
      'received',
      'reconciled',
      'recovered_order_created',
      'auto_refunded',
      'needs_manual_refund',
      'ignored',
      'failed'
    )
  ),
  processing_notes   TEXT,
  order_id           UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  raw_payload        JSONB NOT NULL,
  processed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_order_id
  ON public.paypal_webhook_events(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_capture_id
  ON public.paypal_webhook_events(paypal_capture_id)
  WHERE paypal_capture_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_status
  ON public.paypal_webhook_events(processing_status);

ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super-Admin can view paypal_webhook_events" ON public.paypal_webhook_events;
CREATE POLICY "Super-Admin can view paypal_webhook_events"
  ON public.paypal_webhook_events FOR SELECT
  USING (is_admin(auth.uid()));


-- ---------------------------------------------------------------------------
-- 3. Super-Admin RPC: get_paypal_reconciliation_report
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_paypal_reconciliation_report(TEXT);

CREATE OR REPLACE FUNCTION public.get_paypal_reconciliation_report(
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                UUID,
  paypal_order_id   TEXT,
  paypal_capture_id TEXT,
  paypal_refund_id  TEXT,
  session_id        TEXT,
  event_id          UUID,
  event_name        TEXT,
  customer_id       UUID,
  buyer_email       TEXT,
  buyer_name        TEXT,
  expected_total    NUMERIC,
  captured_amount   NUMERIC,
  currency          TEXT,
  order_id          UUID,
  order_status      TEXT,
  status            TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren privilegios de Super-Admin.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    pi.id,
    pi.paypal_order_id,
    pi.paypal_capture_id,
    pi.paypal_refund_id,
    pi.session_id,
    pi.event_id,
    e.name AS event_name,
    pi.customer_id,
    COALESCE(pi.guest_email, u.email::TEXT) AS buyer_email,
    COALESCE(pi.guest_name, p.display_name, u.email::TEXT) AS buyer_name,
    pi.expected_total,
    pi.captured_amount,
    pi.currency,
    pi.order_id,
    o.status::TEXT AS order_status,
    pi.status,
    pi.error_message,
    pi.created_at,
    pi.updated_at
  FROM public.paypal_payment_intents pi
  LEFT JOIN public.events e   ON e.id = pi.event_id
  LEFT JOIN public.orders o   ON o.id = pi.order_id
  LEFT JOIN auth.users u      ON u.id = pi.customer_id
  LEFT JOIN public.profiles p ON p.id = pi.customer_id
  WHERE (p_status IS NULL OR pi.status = p_status)
  ORDER BY pi.created_at DESC
  LIMIT 250;
END;
$$;

REVOKE ALL ON FUNCTION public.get_paypal_reconciliation_report(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_paypal_reconciliation_report(TEXT) TO authenticated, service_role;
