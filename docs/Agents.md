# Agents Guide — TicketFlow

> Este documento está escrito para agentes de IA que trabajarán en el código de TicketFlow. Su propósito es darte todo el contexto necesario para entender el proyecto, sus convenciones y cómo navegar el código eficientemente.

---

## 1. Qué es TicketFlow

TicketFlow es una **plataforma de venta de boletos online** para artistas independientes en Latinoamérica. Es un **monorepo Nx** con:
- **2 apps Angular 22** (`apps/admin` y `apps/store`)
- **1 proyecto Supabase** (PostgreSQL + Auth + Storage + Edge Functions Deno)
- **3 librerías compartidas** (`@ticketflow/data-access`, `@ticketflow/models`, `@ticketflow/shared-ui`)

---

## 2. Cómo Navegar el Código

### Raíz del workspace

```
/home/rtorres/tickets/web-tickets/
└── ticketflow/              ← AQUI está el código
    ├── apps/admin/           ← Portal del artista
    ├── apps/store/           ← Tienda pública
    ├── libs/data-access/     ← SupabaseService, AuthService
    ├── libs/models/          ← Interfaces TypeScript
    ├── libs/shared-ui/       ← Componentes UI compartidos
    ├── supabase/             ← Migraciones SQL + Edge Functions
    └── docs/                 ← Esta documentación
```

### Aliases de Path (TypeScript)

| Alias | Ubicación real |
|-------|----------------|
| `@ticketflow/data-access` | `libs/data-access/src/index.ts` |
| `@ticketflow/models` | `libs/models/src/index.ts` |
| `@ticketflow/shared-ui` | `libs/shared-ui/src/index.ts` |

---

## 3. Patrones del Código

### Patrón de Feature (Vertical Slice)

Cada funcionalidad es un directorio autocontenido. Este es el patrón SIEMPRE seguido:

```
features/mi-feature/
├── mi-feature-list/
│   └── mi-feature-list.component.ts   ← standalone: true
├── mi-feature-form/
│   └── mi-feature-form.component.ts   ← standalone: true
├── mi-feature.service.ts            ← @Injectable({ providedIn: 'root' })
├── mi-feature.model.ts             ← interfaces TypeScript
└── mi-feature.routes.ts            ← loadComponent / loadChildren
```

**Regla clave:** NUNCA crear carpetas globales de componentes. Todo va en su feature.

### Patrón de Componente

```typescript
// Siempre standalone: true
// Siempre inject() en lugar de constructor DI
// Siempre Angular Signals para estado (NO Subject/BehaviorSubject)

@Component({
  selector: 'admin-event-list',
  standalone: true,
  imports: [CommonModule, RouterLink, /* componentes necesarios */],
  template: `...`,
})
export class EventListComponent {
  private eventsService = inject(EventsService);
  private router = inject(Router);

  events = signal<Event[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  async ngOnInit() {
    this.isLoading.set(true);
    try {
      const data = await this.eventsService.getMyEvents(artistId);
      this.events.set(data);
    } catch (e) {
      this.error.set('Error cargando eventos');
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

### Patrón de Servicio

```typescript
@Injectable({ providedIn: 'root' })
export class EventsService {
  private supabase = inject(SupabaseService).client;

  async getMyEvents(artistId: string): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, venues(*), ticket_types(*)')
      .eq('artist_id', artistId)
      .order('event_date', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}
```

### Patrón de Rutas

```typescript
// Siempre lazy-loaded
export const eventsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./event-list/event-list.component')
      .then(m => m.EventListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./event-detail/event-detail.component')
      .then(m => m.EventDetailComponent),
  },
];
```

---

## 4. Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|------------|--------|
| Componentes | `kebab-case` + sufijo `.component.ts` | `event-form.component.ts` |
| Servicios | `kebab-case` + sufijo `.service.ts` | `events.service.ts` |
| Guards | `kebab-case` + sufijo `.guard.ts` | `auth.guard.ts` |
| Modelos/Interfaces | `kebab-case` + sufijo `.model.ts` | `event.model.ts` |
| Rutas | `kebab-case` + sufijo `.routes.ts` | `events.routes.ts` |
| Selectores Admin | `admin-*` | `admin-event-list` |
| Selectores Store | `store-*` | `store-ticket-selector` |
| Selectores Shared | `tf-*` | `tf-button`, `tf-skeleton` |
| Signals (variables) | camelCase sin `$` | `events`, `isLoading`, `error` |
| Migraciones SQL | `YYYYMMDD000000_nombre.sql` | `20250121000000_guest_checkout.sql` |

---

## 5. Tecnologías Clave

| Capa | Tecnología | Versión |
|------|-----------|--------|
| Frontend | Angular | 22 |
| Monorepo | Nx | 23 |
| Styling | TailwindCSS | 3.x con custom tokens |
| Estado | Angular Signals | nativo |
| Backend / DB | Supabase (PostgreSQL) | Latest |
| Auth | Supabase Auth | Email + Google OAuth |
| Storage | Supabase Storage | 3 buckets |
| Edge Functions | Supabase Deno | TypeScript |
| Pagos | PayPal JS SDK | v2 |
| Mapas | Google Maps API (@angular/google-maps) | Latest |
| Email | N8N + Resend API | — |
| QR | `qrcode` npm package | Latest |
| Language | TypeScript | 5+ strict mode |

---

## 6. La Base de Datos

### Tablas que modificarás más frecuentemente

| Tabla | Cuándo tocarla |
|-------|----------------|
| `events` | Crear/editar eventos, cambiar status |
| `ticket_types` | Definir localidades, precios, stock |
| `orders` + `order_items` | Flujo de compra y confirmación |
| `ticket_locks` | Reserva de inventario durante checkout |
| `artists` | Perfil del artista |
| `venues` + `venue_configurations` | Recintos y sus configuraciones |

### Cómo acceder a Supabase desde un servicio

```typescript
import { inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';

class MiServicio {
  private supabase = inject(SupabaseService).client;

  // Query simple
  async getEventos() {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('status', 'published');
    if (error) throw error;
    return data;
  }

  // Con join
  async getEventoConArtista(id: string) {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, artists(*), venues(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // RPC (función SQL)
  async reservarBoletos(ticketTypeId: string, qty: number, sessionId: string) {
    const { data, error } = await this.supabase.rpc('reserve_tickets', {
      p_ticket_type_id: ticketTypeId,
      p_quantity: qty,
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data;
  }

  // Edge Function
  async crearOrden(body: object) {
    const { data, error } = await this.supabase.functions.invoke('create-order', { body });
    if (error) throw error;
    return data;
  }
}
```

### Storage Buckets disponibles

| Bucket | Para qué |
|--------|----------|
| `artist-photos` | Foto de perfil del artista |
| `event-flyers` | Flyer / imagen del evento |
| `venue-maps` | Mapa del recinto |

```typescript
// Subir archivo
const { data, error } = await this.supabase.storage
  .from('event-flyers')
  .upload(`${eventId}/flyer`, file, { upsert: true });

// Obtener URL pública
const { data: { publicUrl } } = this.supabase.storage
  .from('event-flyers')
  .getPublicUrl(`${eventId}/flyer`);
```

---

## 7. Flujos Críticos a Entender

### Flujo de Compra (el más complejo)

```
EventDetailComponent
  └→ TicketSelectorComponent (selección de cantidades)
       └→ "Add to Cart" button
            └→ EventDetailService.lockTickets()
                 └→ supabase.rpc('reserve_tickets') ← crea ticket_lock
                      └→ Router.navigate('/checkout')
                           └→ CartSummaryComponent
                                └→ CheckoutService.applyCoupon() [opcional]
                                     └→ supabase.functions.invoke('apply-coupon')
                                └→ Router.navigate('/checkout/payment')
                                     └→ PaymentComponent
                                          └→ CheckoutService.initiatePayPalOrder()
                                               └→ supabase.functions.invoke('create-paypal-order')
                                          └→ PayPal SDK onApprove
                                               └→ CheckoutService.finalizeOrder()
                                                    └→ supabase.functions.invoke('create-order')
                                                         └→ Router.navigate('/checkout/confirmation/:id')
```

### Flujo de Auth (Guard)

```
app.routes.ts define rutas con canActivate: [authGuard]
  authGuard: comprueba AuthService.currentUser() signal
    Si null → redirect a /login
    Si existe → permite acceso

  artistRoleGuard: además verifica AuthService.roles().includes('artist' | 'admin')
  doormanGuard: verifica roles incluyendo 'doorman'
  superAdminGuard: verifica role === 'admin'
```

---

## 8. Sistema de Diseño (Tokens de Color)

TailwindCSS está configurado con custom tokens. **Siempre** usar las clases de token, nunca hardcodear colores:

| Token | Hex | Clase | Uso |
|-------|-----|-------|-----|
| `primary` | `#0bdef5` | `bg-primary`, `text-primary` | Links, estados activos |
| `surface` | `#fff3f0` | `text-surface` | Texto sobre fondos oscuros |
| `accent` | `#f7e733` | `text-accent` | Precios, métricas, destacados |
| `dark` | `#150811` | `bg-dark`, `text-dark` | Sidebar, hero, texto principal |
| `contrast` | `#e11392` | `bg-contrast`, `text-contrast` | CTAs, peligro, urgencia |

---

## 9. Migraciones SQL

Las migraciones viven en `ticketflow/supabase/migrations/`. La numeración es secuencial:

```
20250101000000_initial_schema.sql          ← Schema base
20250102000000_create_order_atomic.sql     ← Órdenes atómicas
...
20250121000000_guest_checkout.sql          ← Última aplicada
```

**Cómo crear una nueva migración:**
```bash
# 1. Crear archivo con timestamp siguiente
touch supabase/migrations/20250122000000_mi_nueva_feature.sql

# 2. Escribir el SQL (siempre con IF NOT EXISTS, CREATE OR REPLACE)

# 3. Aplicar
supabase db push

# 4. Regenerar tipos TypeScript
supabase gen types typescript --project-id <ref> > libs/models/src/database.types.ts
```

**Regla:** Siempre usar `CREATE OR REPLACE` para funciones y `IF NOT EXISTS` para tablas/índices para hacer las migraciones idempotentes.

---

## 10. Edge Functions

Viven en `ticketflow/supabase/functions/<nombre>/index.ts`. Corren en Deno.

```typescript
// Patrón básico de Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,  // service role para bypassear RLS
    );

    const body = await req.json();
    // ... lógica de la función

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Deploy:**
```bash
supabase functions deploy nombre-de-la-funcion
```

---

## 11. Reglas de Calidad del Código

1. **TypeScript strict** — no usar `any`, no silenciar errores con `!` a menos que sea inevitable
2. **Sin NgModules** — todo es `standalone: true`
3. **Signals sobre Observables** — para estado local y derivado usar `signal`/`computed`
4. **inject() sobre constructor DI** — preferir `inject(MyService)` en el cuerpo de la clase
5. **async/await sobre `.then()`** — en servicios y handlers async
6. **Manejo de errores** — siempre capturar `error` de Supabase y hacer `throw error` para que el componente lo maneje
7. **Sin comentarios en el código** — el código debe ser autoexplicativo; solo comentar SQL complejo
8. **Lazy loading** — todas las rutas deben usar `loadComponent` o `loadChildren`
9. **No imports circulares** — admin no importa de store y viceversa; solo de `libs/`

---

## 12. Archivos Importantes de Referencia

| Archivo | Por qué es importante |
|---------|----------------------|
| `ticketflow/apps/admin/src/app/app.routes.ts` | Todas las rutas del admin con sus guards |
| `ticketflow/apps/store/src/app/app.routes.ts` | Todas las rutas de la tienda |
| `ticketflow/libs/data-access/src/lib/data-access/auth.service.ts` | AuthService con todos los signals |
| `ticketflow/libs/data-access/src/lib/data-access/supabase.service.ts` | Cliente Supabase singleton |
| `ticketflow/libs/models/src/lib/models.ts` | Interfaces TypeScript compartidas |
| `ticketflow/libs/models/src/database.types.ts` | Tipos generados por Supabase CLI |
| `ticketflow/supabase/migrations/` | Historial completo del schema de BD |
| `ticketflow/supabase/functions/` | Edge Functions Deno |
| `tailwind.config.js` | Tokens de diseño (colores, fuentes) |
| `tsconfig.base.json` | Path aliases de TypeScript |

---

## 13. Documentación Relacionada

| Documento | Descripción |
|-----------|-------------|
| [`PRD.md`](./PRD.md) | Qué se construye, para quién y qué hace |
| [`Architecture.md`](./Architecture.md) | Cómo está estructurado el sistema |
| [`Design-System.md`](./Design-System.md) | Colores, tipografía, componentes UI |
| [`00-PROJECT-OVERVIEW.md`](./00-PROJECT-OVERVIEW.md) | Overview del proyecto (inglés) |
| [`01-DATABASE-SCHEMA.md`](./01-DATABASE-SCHEMA.md) | Schema completo de BD con DDL y RLS |
| [`02-ADMIN-APP.md`](./02-ADMIN-APP.md) | Blueprint detallado del Admin App |
| [`03-STORE-APP.md`](./03-STORE-APP.md) | Blueprint detallado del Store App |
| [`06-CHECKPOINT.md`](./06-CHECKPOINT.md) | Estado actual del proyecto |
| [`08-BACKLOG.md`](./08-BACKLOG.md) | Tareas pendientes por prioridad |
