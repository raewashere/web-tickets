# 07 — Plan de Mejoras Post-MVP

> **Fecha:** 08 de septiembre de 2026
> **Estado del proyecto:** Ciclo completo funcional (Venue → Artist → Event → Tickets → Compra → QR)
> **Objetivo:** Guía técnica detallada para implementar las mejoras acordadas, con rutas de archivo exactas, código real y migraciones SQL listas para ejecutar.

---

## Índice

| # | Área | Mejora | Complejidad | Migración SQL |
|---|------|--------|:-----------:|:-------------:|
| 1 | Admin | Limitar stock de boletos a la capacidad del Venue | Media | ❌ |
| 2 | Admin | Validar acceso solo desde la apertura de puertas | Baja | ✅ |
| 3 | Admin + Store | QR generados realmente escaneables por cámara | Baja | ❌ |
| 4 | Admin + Store | Foto de perfil de Gmail en la barra superior | Baja | ❌ |
| 5 | Store | Redirigir al login si intenta comprar sin sesión | Mínima | ❌ |
| 6 | Store | Mejorar buscador: buscar también por nombre del artista | Baja | ✅ |
| 7 | Admin + DB | Rol "Control de Admisión" (doorman) con invitaciones | Alta | ✅ |

---

## Contexto técnico

```
ticketflow/
├── apps/admin/src/app/          ← App Admin (Angular 22)
├── store/src/app/               ← App Store (Angular 22) — NO está en apps/
├── data-access/src/             ← @ticketflow/data-access (AuthService, SupabaseService)
├── models/src/lib/models.ts     ← @ticketflow/models (tipos TS)
└── supabase/migrations/         ← Migraciones (001–006 aplicadas)
```

**Enum `role_type` actual:** `'admin' | 'artist' | 'customer'`

---

## Mejora 1 — Admin: Limitar stock al capacity del Venue

### Problema
El formulario de Ticket Types no valida que el stock total no supere la capacidad del recinto. Cada evento tiene `venue_configuration_id` → `venue_configurations.capacity`.

### Archivos a modificar

**`apps/admin/src/app/features/tickets/tickets.service.ts`** — agregar método:

```typescript
async getStockUsedByEvent(eventId: string, excludeTicketTypeId?: string): Promise<number> {
  let query = this.supabase
    .from('ticket_types')
    .select('stock')
    .eq('event_id', eventId);

  if (excludeTicketTypeId) {
    query = query.neq('id', excludeTicketTypeId);
  }

  const { data, error } = await query;
  if (error) { console.error('Error summing event stock:', error); return 0; }
  return (data || []).reduce((sum, t) => sum + (t.stock || 0), 0);
}
```

**`apps/admin/src/app/features/tickets/ticket-type-form/ticket-type-form.component.ts`** — agregar:

```typescript
@Input() venueCapacity: number | null = null;
@Input() usedStock = 0;

get remainingCapacity(): number | null {
  if (this.venueCapacity === null) return null;
  const myCurrentStock = this.ticket ? (this.ticket.stock || 0) : 0;
  return this.venueCapacity - this.usedStock + myCurrentStock;
}

private updateStockValidator(): void {
  const maxStock = this.remainingCapacity;
  const validators = [Validators.required, Validators.min(1)];
  if (maxStock !== null && maxStock >= 0) validators.push(Validators.max(maxStock));
  const ctrl = this.ticketForm.get('stock');
  ctrl?.setValidators(validators);
  ctrl?.updateValueAndValidity();
}
```

**En el template**, bajo el input de stock:

```html
<div *ngIf="venueCapacity !== null" class="mt-1.5 text-xs space-y-0.5">
  <div class="flex justify-between text-dark/60">
    <span>Capacidad del recinto:</span>
    <span class="font-mono font-bold">{{ venueCapacity }}</span>
  </div>
  <div class="flex justify-between text-dark/60">
    <span>Asignados a otras localidades:</span>
    <span class="font-mono font-bold">{{ usedStock }}</span>
  </div>
  <div class="flex justify-between font-bold"
       [class.text-green-700]="remainingCapacity! > 0"
       [class.text-contrast]="remainingCapacity! <= 0">
    <span>Disponibles para esta localidad:</span>
    <span class="font-mono">{{ remainingCapacity }}</span>
  </div>
</div>
<p *ngIf="ticketForm.get('stock')?.errors?.['max']" class="text-xs text-contrast mt-1">
  El stock supera la capacidad disponible del recinto ({{ remainingCapacity }} boletos libres).
</p>
```

---

## Mejora 2 — Admin: Validar acceso desde apertura de puertas

### Archivos a crear/modificar

**Nueva migración:** `supabase/migrations/20250107000000_validate_doors_open.sql`

```sql
-- =============================================================================
-- TicketFlow — Migration 007: Enforce doors_open in validate_ticket_qr
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_ticket_qr(
  p_scanned_code TEXT,
  p_event_id     UUID,
  p_staff_id     UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_raw_id        TEXT;
  v_order_id      UUID;
  v_order         RECORD;
  v_event         RECORD;
  v_customer_name TEXT;
  v_items         JSONB;
  v_result        TEXT;
  v_message       TEXT;
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- 0. Check doors_open
  SELECT doors_open, name INTO v_event FROM events WHERE id = p_event_id;
  IF v_event.doors_open IS NOT NULL AND v_now < v_event.doors_open THEN
    RETURN jsonb_build_object(
      'success', false,
      'result',  'doors_not_open',
      'message', 'Las puertas aún no han abierto. Apertura: '
                 || to_char(v_event.doors_open AT TIME ZONE 'America/Mexico_City',
                            'DD/MM/YYYY "a las" HH24:MI') || ' hrs'
    );
  END IF;

  -- 1. Extract UUID from QR format
  v_raw_id := TRIM(p_scanned_code);
  IF v_raw_id ILIKE 'TICKETFLOW-AUTH-%' THEN v_raw_id := SUBSTRING(v_raw_id FROM 17);
  ELSIF v_raw_id ILIKE 'AUTH:%' THEN v_raw_id := TRIM(SUBSTRING(v_raw_id FROM 6));
  END IF;

  BEGIN
    v_order_id := v_raw_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    SELECT id INTO v_order_id FROM orders WHERE id::text ILIKE v_raw_id || '%' LIMIT 1;
    IF v_order_id IS NULL THEN
      INSERT INTO ticket_validations (event_id, staff_id, scanned_code, result, message)
      VALUES (p_event_id, p_staff_id, p_scanned_code, 'not_found', 'Código inválido.');
      RETURN jsonb_build_object('success', false, 'result', 'not_found', 'message', 'Código de boleto inválido.');
    END IF;
  END;

  SELECT * INTO v_order FROM orders WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, 'not_found', 'Orden no encontrada.');
    RETURN jsonb_build_object('success', false, 'result', 'not_found', 'message', 'Boleto no registrado.');
  END IF;

  IF v_order.status != 'confirmed' THEN
    v_result := 'unpaid'; v_message := 'Boleto no confirmado (estado: ' || v_order.status || ').';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    RETURN jsonb_build_object('success', false, 'result', v_result, 'message', v_message);
  END IF;

  IF v_order.event_id != p_event_id THEN
    v_result := 'invalid_event'; v_message := 'Boleto de otro evento.';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    RETURN jsonb_build_object('success', false, 'result', v_result, 'message', v_message);
  END IF;

  IF v_order.checked_in_at IS NOT NULL THEN
    v_result := 'already_used';
    v_message := 'Canjeado el ' || to_char(v_order.checked_in_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') || ' UTC.';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    SELECT display_name INTO v_customer_name FROM profiles WHERE id = v_order.customer_id;
    RETURN jsonb_build_object('success', false, 'result', v_result, 'message', v_message,
      'checked_in_at', v_order.checked_in_at, 'customer_name', COALESCE(v_customer_name, 'Cliente'), 'order_id', v_order.id);
  END IF;

  -- VALID
  UPDATE orders SET checked_in_at = v_now, checked_in_by = p_staff_id WHERE id = v_order_id;
  SELECT display_name INTO v_customer_name FROM profiles WHERE id = v_order.customer_id;
  SELECT jsonb_agg(jsonb_build_object('ticket_type_name', tt.name, 'quantity', oi.quantity, 'sku', tt.sku))
  INTO v_items FROM order_items oi JOIN ticket_types tt ON tt.id = oi.ticket_type_id WHERE oi.order_id = v_order_id;
  INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
  VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, 'valid', 'Acceso Concedido.');
  RETURN jsonb_build_object(
    'success', true, 'result', 'valid', 'message', '¡Acceso Concedido! Boleto Válido.',
    'order_id', v_order.id, 'customer_name', COALESCE(v_customer_name, 'Cliente Registrado'),
    'checked_in_at', v_now, 'items', COALESCE(v_items, '[]'::jsonb), 'total', v_order.total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_ticket_qr(TEXT, UUID, UUID) TO authenticated;
```

**`apps/admin/src/app/features/access-control/access-control.service.ts`** — línea 12, agregar al union:

```typescript
result: 'valid' | 'already_used' | 'invalid_event' | 'not_found' | 'unpaid' | 'doors_not_open';
```

**`apps/admin/src/app/features/access-control/access-control.component.ts`** — actualizar el `ngClass` del resultado:

```typescript
[ngClass]="{
  'bg-green-50 border-green-500 text-green-950': lastResult()!.result === 'valid',
  'bg-amber-50 border-amber-500 text-amber-950': lastResult()!.result === 'already_used',
  'bg-blue-50  border-blue-500  text-blue-950':  lastResult()!.result === 'doors_not_open',
  'bg-red-50   border-red-500   text-red-950':
    !['valid','already_used','doors_not_open'].includes(lastResult()!.result)
}"
```

---

## Mejora 3 — QR realmente escaneable

### Problema crítico
`store/src/app/shared/utils/qr.utils.ts` genera un pseudo-QR con canvas que **no es un QR real**. Dibuja los finder patterns pero los datos son un hash simple sin codificación QR estándar. Ningún lector de cámara puede decodificarlo.

### Paso 1: Instalar librería

```bash
cd ticketflow
npm install qrcode
npm install --save-dev @types/qrcode
```

### Paso 2: Reescribir `store/src/app/shared/utils/qr.utils.ts`

```typescript
// Reemplazar el contenido completo del archivo:
import QRCode from 'qrcode';

/**
 * Generates a real, camera-scannable QR code as a PNG data URL.
 * Uses error correction level H (30% damage resistance) for ticket use.
 */
export async function generateQrDataUrl(text: string, size = 400): Promise<string> {
  if (typeof document === 'undefined') return '';
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 3,                      // Quiet zone — required for camera readers
      errorCorrectionLevel: 'H',      // Best for printed/displayed tickets
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch (err) {
    console.error('QR generation error:', err);
    return '';
  }
}

/** Synchronous fallback using canvas DOM element */
export function generateQrDataUrlSync(text: string, size = 400): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  try {
    QRCode.toCanvas(canvas, text, { width: size, margin: 3, errorCorrectionLevel: 'H' });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('QR sync error:', err);
    return '';
  }
}
```

### Paso 3: Actualizar `store/src/app/features/my-tickets/ticket-detail.component.ts`

```typescript
// Línea 216 — cambiar el await y el tamaño:
// Antes:
const url = generateQrDataUrl(payload, 220);
this.qrDataUrl.set(url);

// Después:
const url = await generateQrDataUrl(payload, 400);
this.qrDataUrl.set(url);
```

En el template (línea 106), aumentar tamaño del `<img>`:
```html
<!-- Antes: class="w-52 h-52 rounded-lg" -->
<!-- Después: -->
class="w-56 h-56 sm:w-64 sm:h-64 rounded-lg"
```

---

## Mejora 4 — Foto de perfil de Gmail

### Análisis
El trigger `handle_new_user` (migración 004) **ya sincroniza** `avatar_url` al crear el perfil. El problema es que topbar y navbar no leen ese campo — solo muestran la inicial del email.

### `data-access/src/lib/data-access/auth.service.ts`

Agregar `computed` para el avatar:

```typescript
readonly avatarUrl = computed<string | null>(() =>
  this.profile()?.avatar_url ??
  (this.user()?.user_metadata?.['avatar_url'] as string | undefined) ??
  (this.user()?.user_metadata?.['picture']   as string | undefined) ??
  null
);
```

### Admin — `apps/admin/src/app/shared/layout/topbar.component.ts`

Reemplazar el div del avatar de usuario con lógica condicional:

```html
<img *ngIf="auth.avatarUrl()"
     [src]="auth.avatarUrl()!"
     [alt]="auth.user()?.email ?? ''"
     class="w-8 h-8 rounded-full object-cover ring-2 ring-primary/40 shadow-sm" />
<div *ngIf="!auth.avatarUrl()"
     class="w-8 h-8 rounded-full bg-primary/20 text-primary font-black flex items-center justify-center text-xs ring-2 ring-primary/30">
  {{ (auth.user()?.email ?? 'U')[0].toUpperCase() }}
</div>
```

### Store — `store/src/app/shared/layout/navbar.component.ts`

En el botón del menú de usuario (línea 64), reemplazar el div de inicial:

```html
<!-- Reemplazar: -->
<div class="w-6 h-6 rounded-full bg-cyan-400 ...">{{ userInitial }}</div>

<!-- Por: -->
<img *ngIf="auth.avatarUrl()"
     [src]="auth.avatarUrl()!"
     class="w-6 h-6 rounded-full object-cover ring-1 ring-cyan-400/50" />
<div *ngIf="!auth.avatarUrl()"
     class="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 font-black flex items-center justify-center text-xs">
  {{ userInitial }}
</div>
```

---

## Mejora 5 — Redirigir al login al intentar comprar

### Estado actual: ✅ Ya implementado

En `store/src/app/features/event-detail/event-detail.component.ts` líneas 259–263:
```typescript
if (!this.auth.isAuthenticated()) {
  this.router.navigate(['/login'], { queryParams: { returnUrl: `/event/${this.event()!.id}` } });
  return;
}
```

El `login.component.ts` ya lee el `returnUrl` (línea 188). Solo hay un **bug de ruta**:

```typescript
// Línea 261 — corregir /event por /events (con "s"):
// Antes:
{ queryParams: { returnUrl: `/event/${this.event()!.id}` } }

// Después:
{ queryParams: { returnUrl: `/events/${this.event()!.id}` } }
```

---

## Mejora 6 — Buscador busca por nombre del artista

### Problema
`store/src/app/features/search/search.service.ts` línea 44 solo hace `.ilike('name', ...)` en el nombre del evento. Supabase no soporta `OR` sobre columnas de tablas relacionadas directamente.

### Nueva migración: `supabase/migrations/20250108000000_search_events_function.sql`

```sql
-- =============================================================================
-- TicketFlow — Migration 008: Full-text event search including artist name
-- =============================================================================

CREATE OR REPLACE FUNCTION search_published_events(
  p_query      TEXT DEFAULT NULL,
  p_type_id    UUID DEFAULT NULL,
  p_date_from  TIMESTAMPTZ DEFAULT now(),
  p_date_to    TIMESTAMPTZ DEFAULT NULL,
  p_sort       TEXT DEFAULT 'date_asc',
  p_limit      INT DEFAULT 12,
  p_offset     INT DEFAULT 0
)
RETURNS TABLE (
  id                     UUID,
  artist_id              UUID,
  name                   TEXT,
  flyer_url              TEXT,
  description            TEXT,
  event_type_id          UUID,
  venue_id               UUID,
  venue_configuration_id UUID,
  event_date             TIMESTAMPTZ,
  doors_open             TIMESTAMPTZ,
  status                 event_status,
  artist_name            TEXT,
  artist_photo_url       TEXT,
  venue_name             TEXT,
  total_count            BIGINT
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    e.id, e.artist_id, e.name, e.flyer_url, e.description,
    e.event_type_id, e.venue_id, e.venue_configuration_id,
    e.event_date, e.doors_open, e.status,
    a.name        AS artist_name,
    a.photo_url   AS artist_photo_url,
    v.name        AS venue_name,
    COUNT(*) OVER() AS total_count
  FROM events e
  JOIN artists a ON a.id = e.artist_id
  LEFT JOIN venues v ON v.id = e.venue_id
  WHERE
    e.status = 'published'
    AND (p_date_from IS NULL OR e.event_date >= p_date_from)
    AND (p_date_to   IS NULL OR e.event_date <= p_date_to)
    AND (p_type_id   IS NULL OR e.event_type_id = p_type_id)
    AND (
      p_query IS NULL OR p_query = ''
      OR e.name        ILIKE '%' || p_query || '%'
      OR a.name        ILIKE '%' || p_query || '%'
      OR e.description ILIKE '%' || p_query || '%'
    )
  ORDER BY
    CASE WHEN p_sort = 'date_desc' THEN e.event_date END DESC NULLS LAST,
    CASE WHEN p_sort = 'name_asc'  THEN e.name       END ASC  NULLS LAST,
    e.event_date ASC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION search_published_events(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, INT)
  TO anon, authenticated;
```

### `store/src/app/features/search/search.service.ts`

Reemplazar el método `searchEvents`:

```typescript
async searchEvents(params: SearchFilterParams): Promise<SearchResult> {
  const page     = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 12);

  const { data, error } = await this.supabase.rpc('search_published_events', {
    p_query:     params.query?.trim()   || null,
    p_type_id:   params.eventTypeId     || null,
    p_date_from: params.dateFrom        || new Date().toISOString(),
    p_date_to:   params.dateTo          || null,
    p_sort:      params.sort            || 'date_asc',
    p_limit:     pageSize,
    p_offset:    (page - 1) * pageSize,
  });

  if (error) { console.error('Error searching events:', error); throw error; }

  const rows  = (data || []) as Array<Record<string, unknown>>;
  const total = rows.length > 0 ? Number(rows[0]['total_count']) : 0;

  // Map flat RPC result to StoreEventItem shape
  const events = rows.map((row) => ({
    ...row,
    artists: row['artist_name']
      ? { id: row['artist_id'], name: row['artist_name'], photo_url: row['artist_photo_url'] }
      : null,
    venues: row['venue_name']
      ? { id: row['venue_id'], name: row['venue_name'] }
      : null,
  })) as StoreEventItem[];

  return { events, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
```

---

## Mejora 7 — Rol "Control de Admisión" (doorman)

### Descripción del rol
- Solo puede acceder a Control de Acceso / escaneo QR
- Solo valida boletos del **evento al que fue asignado**
- Es invitado por email por el artista o admin
- No puede cambiar de evento en la UI
- Solo puede tener **una asignación activa** a la vez

### Migración 009: tablas y RLS

**`supabase/migrations/20250109000000_doorman_role.sql`**

```sql
-- =============================================================================
-- TicketFlow — Migration 009: Doorman Role & Event Staff
-- =============================================================================

ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'doorman';

CREATE TABLE IF NOT EXISTS event_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- One active assignment per doorman at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_staff_one_active_per_user
  ON event_staff (user_id) WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user_id  ON event_staff(user_id);

CREATE TABLE IF NOT EXISTS staff_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token    ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_event_id ON staff_invitations(event_id);

CREATE TRIGGER trg_event_staff_updated_at
  BEFORE UPDATE ON event_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS for event_staff
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doorman reads own assignment" ON event_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Artist reads own event staff" ON event_staff
  FOR SELECT USING (
    event_id IN (SELECT e.id FROM events e JOIN artists a ON a.id = e.artist_id WHERE a.user_id = auth.uid())
  );

CREATE POLICY "Artist manages own event staff" ON event_staff
  FOR ALL USING (
    event_id IN (SELECT e.id FROM events e JOIN artists a ON a.id = e.artist_id WHERE a.user_id = auth.uid())
  );

CREATE POLICY "Admin manages all event staff" ON event_staff
  FOR ALL USING (has_role('admin'));

-- RLS for staff_invitations
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads invitation by token" ON staff_invitations FOR SELECT USING (true);

CREATE POLICY "Artist manages own invitations" ON staff_invitations
  FOR ALL USING (
    event_id IN (SELECT e.id FROM events e JOIN artists a ON a.id = e.artist_id WHERE a.user_id = auth.uid())
  );

CREATE POLICY "Admin manages all invitations" ON staff_invitations
  FOR ALL USING (has_role('admin'));

-- Helper: get doorman's assigned event id
CREATE OR REPLACE FUNCTION get_doorman_event_id() RETURNS UUID AS $$
  SELECT event_id FROM event_staff
  WHERE user_id = auth.uid() AND status = 'accepted'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Migración 010: validate_ticket_qr con autorización de doorman

**`supabase/migrations/20250110000000_validate_with_doorman_auth.sql`**

Idéntica al contenido de la migración 007, pero con el siguiente bloque **al inicio** (después de declarar variables, antes del step 0):

```sql
  -- Authorization check
  IF NOT (
    has_role('admin') OR
    has_role('artist') OR
    (has_role('doorman') AND EXISTS (
      SELECT 1 FROM event_staff
      WHERE event_id = p_event_id AND user_id = p_staff_id AND status = 'accepted'
    ))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'result',  'unauthorized',
      'message', 'No tienes permiso para validar accesos a este evento.'
    );
  END IF;
```

### Nuevos archivos Angular (Admin)

**`apps/admin/src/app/core/guards/doorman.guard.ts`**
```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

export const doormanGuard: CanActivateFn = async () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  await auth.waitForAuthReady();
  if (!auth.isAuthenticated()) return router.parseUrl('/login');
  const roles = auth.roles?.() ?? [];
  if (roles.some((r: string) => ['admin', 'artist', 'doorman'].includes(r))) return true;
  return router.parseUrl('/dashboard');
};
```

**`apps/admin/src/app/app.routes.ts`** — cambios:
```typescript
// 1. Agregar ruta pública para aceptar invitaciones (FUERA del shell protegido):
{
  path: 'staff-invite',
  loadComponent: () => import('./features/auth/accept-invite/accept-invite.component')
    .then(m => m.AcceptInviteComponent),
},

// 2. En el shell, cambiar guard de access-control:
// Antes: canActivate: [authGuard, artistRoleGuard]
// Después para la ruta access-control:
{
  path: 'access-control',
  canActivate: [doormanGuard],
  loadComponent: () => import('./features/access-control/access-control.component')
    .then(m => m.AccessControlComponent),
},
```

**`apps/admin/src/app/features/access-control/access-control.service.ts`** — agregar método:
```typescript
async getDoormanEventId(): Promise<string | null> {
  const { data, error } = await this.supabase.rpc('get_doorman_event_id');
  if (error || !data) return null;
  return data as string;
}
```

**`apps/admin/src/app/features/access-control/access-control.component.ts`** — en `ngOnInit`:
```typescript
readonly isDoormanMode = signal(false);

async ngOnInit(): Promise<void> {
  const list = await this.accessControl.getEvents();
  this.events.set(list);

  // Doorman: auto-select their assigned event, hide dropdown
  const roles = this.auth.roles?.() ?? [];
  if (roles.includes('doorman') && !roles.includes('admin') && !roles.includes('artist')) {
    const doormanEventId = await this.accessControl.getDoormanEventId();
    if (doormanEventId) {
      this.isDoormanMode.set(true);
      this.onEventChanged(doormanEventId);
      return;
    }
  }

  // Admin / artist: normal behavior
  const routeId = this.route.snapshot.paramMap.get('id');
  if (routeId && list.some(e => e.id === routeId)) this.onEventChanged(routeId);
  else if (list.length > 0) this.onEventChanged(list[0].id);
}
```

En el template, condicionar el dropdown:
```html
<!-- Event selector — solo para admin/artist -->
<div *ngIf="!isDoormanMode()" class="w-full sm:w-72">
  <!-- dropdown actual -->
</div>
<!-- Doorman mode: solo nombre del evento -->
<div *ngIf="isDoormanMode()" class="flex items-center gap-2 text-sm font-bold text-dark bg-primary/10 px-3 py-2 rounded-xl">
  <span>🎯</span>
  <span>Evento: {{ events()[0]?.name }}</span>
</div>
```

### Nuevos componentes (a crear)

| Componente | Archivo | Descripción |
|-----------|---------|-------------|
| `EventStaffComponent` | `features/events/event-staff/event-staff.component.ts` | Lista de doormen asignados al evento + formulario de invitación por email. Se agrega en `event-detail.component.ts` |
| `EventStaffService` | `features/events/event-staff/event-staff.service.ts` | `getEventStaff`, `inviteStaff`, `revokeStaff`, `acceptInvitation`, `getInvitationByToken` |
| `AcceptInviteComponent` | `features/auth/accept-invite/accept-invite.component.ts` | Ruta pública `/staff-invite?token=XXX`. Lee token, verifica invitación, pide login si no hay sesión, acepta y redirige a `/access-control` |

### Edge Function

**`supabase/functions/send-staff-invite/index.ts`**

```typescript
// POST { eventId, email, invitedBy }
// 1. Inserta en staff_invitations y obtiene el token generado
// 2. Envía email con Resend:
//    Para: email invitado
//    Asunto: "Fuiste invitado como personal de acceso — [Nombre del Evento]"
//    Cuerpo: Link https://ticketflow-admin.vercel.app/staff-invite?token=XXX
//            + instrucciones de registro si no tiene cuenta
// 3. Retorna { success: true, token }
```

### Tipos en `@ticketflow/models`

Agregar a `models/src/lib/models.ts`:

```typescript
export interface EventStaffMember {
  id: string;
  event_id: string;
  user_id: string;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null };
}

export interface StaffInvitation {
  id: string;
  event_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
  events?: Pick<Event, 'id' | 'name' | 'event_date'>;
}
```

---

## Migraciones SQL a ejecutar en Supabase

| # | Archivo | Cuándo |
|---|---------|--------|
| 007 | `20250107000000_validate_doors_open.sql` | Semana 2 |
| 008 | `20250108000000_search_events_function.sql` | Semana 2 |
| 009 | `20250109000000_doorman_role.sql` | Semana 4 |
| 010 | `20250110000000_validate_with_doorman_auth.sql` | Semana 4 |

---

## Orden de implementación

```
Semana 1 — Sin migración, máximo impacto visual
  [3] QR escaneables        npm install qrcode + reescribir qr.utils.ts
  [4] Foto de Gmail          avatarUrl computed + topbar + navbar
  [5] Redirect login fix     corregir /event → /events en event-detail.component.ts

Semana 2 — Con migraciones de búsqueda y validación
  [6] Buscador por artista   migración 008 + search.service.ts
  [2] Apertura de puertas    migración 007 + access-control.service/component

Semana 3 — Validación de negocio sin DB
  [1] Stock vs Capacity      getStockUsedByEvent + inputs en ticket-type-form

Semana 4 — Rol doorman (feature completa)
  [7a] Migraciones 009 + 010
  [7b] EventStaffService + EventStaffComponent en event-detail
  [7c] AcceptInviteComponent + ruta /staff-invite
  [7d] doormanGuard + ajuste de app.routes.ts
  [7e] Modo doorman en access-control.component
  [7f] Edge Function send-staff-invite
  [7g] Tipos EventStaffMember + StaffInvitation en models.ts
```
