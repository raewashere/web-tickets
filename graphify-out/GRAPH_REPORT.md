# Graphify Audit Report — TicketFlow (BoletoCoqueto)

- **Target Directory:** `/home/rtorres/tickets/web-tickets`
- **Workspace Root:** `/home/rtorres/tickets/web-tickets/ticketflow`
- **Total Nodes:** 148 (Apps, Libraries, Components, Services, Guards, Edge Functions, SQL Migrations, RPCs, Tables, Docs)
- **Total Edges:** 412 (Imports, DI `inject()`, HTTP/Edge Invocations, PostgREST RPCs, Table Foreign Keys & RLS Policies)
- **Communities Detected:** 8 (via structural & semantic clustering)
- **Generation Timestamp:** 2026-10-22T13:25:00-06:00

---

## 🏛️ God Nodes (Highest-Degree Hubs)
*The most heavily connected nodes in the graph acting as central coordinators, state hubs, or transactional bottlenecks.*

1. **`SupabaseService` & `AuthService`** (`ticketflow/data-access/src/lib/`) — **Degree: 64**
   - *Role:* Singleton Supabase client provider and reactive authentication state (`user`, `roles`, `avatarUrl`, `isAdmin`, `isArtist`, `isDoorman`).
   - *Connections:* Injected across nearly all services, guards (`authGuard`, `artistRoleGuard`, `doormanGuard`, `superAdminGuard`), and shell components in `store`, `admin`, and `backoffice`.
2. **`CheckoutService`** (`ticketflow/store/src/app/features/checkout/checkout.service.ts`) — **Degree: 38**
   - *Role:* Reactive cart state machine (`sessionStorage` persistence, 15-minute lock countdown, coupon application, guest info, order finalization).
   - *Connections:* Bridges `EventDetailComponent` / `TicketSelectorComponent`, `CartSummaryComponent`, `PaymentComponent`, and the 3 checkout Edge Functions (`apply-coupon`, `create-paypal-order`, `create-order`).
3. **`create_order_atomic` & `calculate_checkout_quote`** (`ticketflow/supabase/migrations/20250122000000_secure_checkout.sql`) — **Degree: 34**
   - *Role:* Atomic PostgreSQL transaction coordinator for order creation, server-side quote calculation, SKU coupon discount enforcement, stock/lock mutation, and `access_token` generation.
   - *Connections:* Touches `orders`, `order_items`, `ticket_locks`, `ticket_types`, `coupons`, `platform_settings`, and is invoked by `create-order` / `create-paypal-order`.
4. **`orders` Table** (`ticketflow/supabase/migrations/20250101000000_initial_schema.sql` + `021` + `022`) — **Degree: 46**
   - *Role:* Core transactional entity linking customers/guests, events, coupons, payments, QR validations, refunds, and artist financial settlements.
   - *Connections:* Referenced by `order_items`, `ticket_validations`, `refund_requests`, `validate_ticket_qr`, `get_order_by_access_token`, `get_artist_financial_summary`, `get_global_platform_metrics`, `send-ticket-email`, and N8N webhook payload.
5. **`SuperAdminService` & Migration 017 RPCs** (`ticketflow/supabase/migrations/20250117000000_fix_super_admin_rpc_and_functions.sql`) — **Degree: 31**
   - *Role:* Platform-wide aggregation, role management, venue verification, refund processing, and artist payout recording.
   - *Connections:* Connects `apps/admin` (super-admin views) and `apps/backoffice` with `is_admin()`, `user_roles`, `venues`, `artist_payouts`, `artist_payout_settings`, and `refund_requests`.

---

## 🧩 Community Structure
*Clusters grouped by dependency density and domain boundaries.*

### Community 0: Core Shared Libraries (`@ticketflow/*`)
- **Cohesion Score:** 0.78
- **Primary Files:**
  - `ticketflow/data-access/src/lib/supabase.service.ts`
  - `ticketflow/data-access/src/lib/auth.service.ts`
  - `ticketflow/models/src/lib/models.ts`
  - `ticketflow/models/src/database.types.ts`
  - `ticketflow/shared-ui/src/lib/` (`skeleton.ts`, `toast.ts`, `empty-state.ts`, `theme.service.ts`)
- **Summary:** Foundation layer consumed by all three Angular applications (`store`, `admin`, `backoffice`). Enforces strict TypeScript models and M3 dark/light theme tokens.

### Community 1: Storefront Discovery & Event Catalog (`store`)
- **Cohesion Score:** 0.66
- **Primary Files:**
  - `ticketflow/store/src/app/features/home/home.component.ts`
  - `ticketflow/store/src/app/features/search/search-results.component.ts`
  - `ticketflow/store/src/app/features/search/search.service.ts`
  - `ticketflow/store/src/app/features/events/event-detail.component.ts`
  - `ticketflow/store/src/app/features/events/ticket-selector.component.ts`
  - `ticketflow/store/src/app/core/services/seo.service.ts`
  - `ticketflow/store/src/app/core/services/meta-pixel.service.ts`
- **Summary:** Public-facing event discovery, full-text search RPC (`search_events`), artist multi-photo gallery lightbox, dynamic SEO tags, waitlist subscription (`join_event_waitlist`), and ticket lock reservation (`reserve_tickets`).

### Community 2: Checkout, Guest Access & Payment Pipeline (`store` + Edge Functions + SQL)
- **Cohesion Score:** 0.82
- **Primary Files:**
  - `ticketflow/store/src/app/features/checkout/checkout.service.ts`
  - `ticketflow/store/src/app/features/checkout/cart-summary.component.ts`
  - `ticketflow/store/src/app/features/checkout/payment.component.ts`
  - `ticketflow/store/src/app/features/thank-you/thank-you.component.ts`
  - `ticketflow/store/src/app/features/public-ticket/public-ticket.component.ts`
  - `ticketflow/supabase/functions/apply-coupon/index.ts`
  - `ticketflow/supabase/functions/create-paypal-order/index.ts`
  - `ticketflow/supabase/functions/create-order/index.ts`
  - `ticketflow/supabase/migrations/20250121000000_guest_checkout.sql`
  - `ticketflow/supabase/migrations/20250122000000_secure_checkout.sql`
- **Summary:** End-to-end purchase pipeline supporting both authenticated users and unauthenticated guests (`guestEmail`, `guestName`, `access_token`), PayPal v2 order creation/capture/auto-refund, server-side quote verification (`calculate_checkout_quote`), and transactional email dispatch (N8N webhook + `send-ticket-email`).

### Community 3: Post-Purchase Tickets, QR & Refunds (`store` + `admin` + `backoffice` + Edge + SQL)
- **Cohesion Score:** 0.78
- **Primary Files:**
  - `ticketflow/store/src/app/shared/utils/qr.utils.ts`
  - `ticketflow/store/src/app/features/my-tickets/my-tickets.component.ts`
  - `ticketflow/store/src/app/features/my-tickets/ticket-detail.component.ts`
  - `ticketflow/store/src/app/features/public-ticket/public-ticket.component.ts`
  - `ticketflow/apps/admin/src/app/features/refunds/refund-list.component.ts`
  - `ticketflow/apps/admin/src/app/features/refunds/refunds.service.ts`
  - `ticketflow/apps/backoffice/src/app/services/backoffice.service.ts`
  - `ticketflow/supabase/functions/process-refund/index.ts`
  - `ticketflow/supabase/migrations/20250114000000_refund_requests.sql`
  - `ticketflow/supabase/migrations/20250123000000_security_rls_and_rpc_fixes.sql`
- **Summary:** Renders high-density QR codes (`TICKETFLOW-AUTH-<order_id>`), manages customer waitlist entries, handles post-sale refund requests (`request_order_refund` for both authenticated users and guests with `p_access_token`), and executes PayPal v2 capture refunds + atomic stock restoration (`process-refund` Edge Function + `process_refund_request` RPC restricted to Super-Admin).

### Community 4: Artist Portal — Events, Venues, Coupons & Waitlist (`apps/admin`)
- **Cohesion Score:** 0.69
- **Primary Files:**
  - `ticketflow/apps/admin/src/app/features/dashboard/dashboard.component.ts`
  - `ticketflow/apps/admin/src/app/features/artist/artist-form.component.ts`
  - `ticketflow/apps/admin/src/app/features/venues/venue-form.component.ts`
  - `ticketflow/apps/admin/src/app/features/events/event-form.component.ts`
  - `ticketflow/apps/admin/src/app/features/events/ticket-types/ticket-type-form.component.ts`
  - `ticketflow/apps/admin/src/app/features/events/event-waitlist/event-waitlist.component.ts`
  - `ticketflow/apps/admin/src/app/features/coupons/coupon-form.component.ts`
- **Summary:** CRUD operations for artist profiles (with `gallery_urls` and `meta_pixel_id`), venues (with Google Maps), events, ticket types (enforcing venue capacity limits), and SKU/event coupons.

### Community 5: Admission Control & Doorman Staff (`apps/admin` + Edge + SQL)
- **Cohesion Score:** 0.75
- **Primary Files:**
  - `ticketflow/apps/admin/src/app/features/access-control/access-control.component.ts`
  - `ticketflow/apps/admin/src/app/features/access-control/access-control.service.ts`
  - `ticketflow/apps/admin/src/app/features/events/event-staff/event-staff.component.ts`
  - `ticketflow/apps/admin/src/app/features/events/event-staff/accept-invite.component.ts`
  - `ticketflow/supabase/functions/send-staff-invite/index.ts`
  - `ticketflow/supabase/migrations/20250109000000_doorman_role.sql`
  - `ticketflow/supabase/migrations/20250110000000_validate_with_doorman_auth.sql`
- **Summary:** Camera QR scanner (`BarcodeDetector`), doorman staff invitations, role guards (`doormanGuard`), `doors_open` schedule enforcement, and `validate_ticket_qr` RPC.

### Community 6: Super-Admin, Backoffice & Artist Finances (`apps/admin` + `apps/backoffice` + SQL)
- **Cohesion Score:** 0.74
- **Primary Files:**
  - `ticketflow/apps/admin/src/app/features/finances/`
  - `ticketflow/apps/admin/src/app/features/super-admin/`
  - `ticketflow/apps/backoffice/src/app/`
  - `ticketflow/supabase/migrations/20250113000000_super_admin.sql`
  - `ticketflow/supabase/migrations/20250116000000_payouts_and_settlements.sql`
  - `ticketflow/supabase/migrations/20250117000000_fix_super_admin_rpc_and_functions.sql`
  - `ticketflow/supabase/migrations/20250120000000_fix_commission_pricing_model.sql`
- **Summary:** 20% retained commission accounting, artist CLABE/tax payout settings, settlement ledgers (`create_payout_record`), global platform metrics, user role administration, and venue moderation.

### Community 7: Architecture, Product Docs & Automation Templates (`docs/`)
- **Cohesion Score:** 0.62
- **Primary Files:**
  - `docs/Agents.md`, `docs/Architecture.md`, `docs/PRD.md`, `docs/Design-System.md`
  - `docs/01-DATABASE-SCHEMA.md` .. `docs/08-BACKLOG.md`
  - `docs/n8n/ticket-email-template.html`, `docs/n8n/ticketflow-n8n-workflow.json`
- **Summary:** Living specifications, database documentation, N8N workflow definitions, and master backlog.

---

## ⚡ Surprising & Critical Cross-Boundary Connections
*High-impact edges discovered across frontend, Edge Functions, and PostgreSQL RLS/RPC boundaries:*

1. **`is_admin(NULL)` $\rightarrow$ `SECURITY DEFINER` Privilege Bypass (`20250117000000_fix_super_admin_rpc_and_functions.sql#L15`)**:
   - Because `is_admin` runs as `SECURITY DEFINER`, `current_user` inside the function is `'postgres'`. Combined with `GRANT EXECUTE ... TO anon` (lines 349–361), any anonymous call where `auth.uid()` is `NULL` satisfies `current_user IN ('postgres', ...) AND p_user_id IS NULL` and returns `TRUE`, exposing Super-Admin RPCs to unauthenticated callers.
2. **`user_roles` INSERT Policy $\rightarrow$ Self-Promotion to `admin` (`20250105000000_fix_user_roles_rls.sql#L7-L10`)**:
   - The RLS policy `"Users can insert own roles"` checks `user_id = auth.uid()` without restricting `role`, allowing any logged-in user to insert `('admin')` for themselves.
3. **Guest Storefront (`anon`) $\rightarrow$ `reserve_tickets` RLS Block (`20250101000000_initial_schema.sql#L413`)**:
   - `reserve_tickets` is `SECURITY INVOKER` (missing `SECURITY DEFINER`), while `ticket_locks` INSERT policy requires `auth.uid() IS NOT NULL` and `ticket_types` UPDATE policy requires artist/admin ownership. Unauthenticated guests cannot reserve tickets unless `reserve_tickets` runs as `SECURITY DEFINER`.
4. **`accept-invite.component.ts` $\rightarrow$ `staff_invitations` UPDATE RLS Block (`20250109000000_doorman_role.sql#L96`)**:
   - Invited doormen updating `staff_invitations.status = 'accepted'` are blocked by RLS because only the event's artist or admin has `UPDATE` permissions on `staff_invitations`.
5. **`create-order` Dual Email Dispatch (`create-order/index.ts#L397-L430`)**:
   - Authenticated buyers trigger both the N8N webhook (`dispatchN8NTicketWebhook`) and the `send-ticket-email` Edge Function, whereas `send-ticket-email` lacks the QR image and public token URL.

---

## ❓ Suggested Agent Questions
*Consult this report first before grepping the repository. For targeted exploration, trace edges starting from the community files listed above:*
- *"Which Edge Functions and SQL RPCs participate in the Guest Checkout flow?"* → See **Community 2**.
- *"Where is the 20% platform commission calculated and settled?"* → See `calculate_checkout_quote` (**Community 2**) and `get_artist_financial_summary` (**Community 6**).
- *"How are QR codes formatted, emailed, and validated at the venue door?"* → See **Community 3** (`qr.utils.ts`) and **Community 5** (`validate_ticket_qr`).
