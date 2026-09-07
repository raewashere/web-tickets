# 📋 Checkpoint — Estado del Proyecto TicketFlow

> **Fecha:** 07 de septiembre de 2026  
> **Sesión:** Setup de entorno, Supabase, Despliegue en Vercel y corrección de errores iniciales

---

## 🟢 Completado y Funcional

### Infraestructura & Monorepo

| Item | Estado | Notas |
|------|--------|-------|
| Monorepo Nx 23 + Angular 22 | ✅ | Apps: `admin`, `store`. Libs: `models`, `data-access`, `shared-ui` |
| TailwindCSS con design tokens | ✅ | Colores: `primary` cian, `accent` amarillo, `dark`, `contrast` magenta |
| TypeScript estricto + path aliases | ✅ | `@ticketflow/models`, `@ticketflow/data-access`, `@ticketflow/shared-ui` |
| `node_modules` instalados | ✅ | `npm install` ejecutado en `ticketflow/` |
| Variables de entorno configuradas | ✅ | `.env` creados para `apps/admin`, `store/`, y raíz del monorepo |

### Supabase

| Item | Estado | Notas |
|------|--------|-------|
| Proyecto Supabase creado y vinculado | ✅ | `kevgwhiosnyemaftbjqs.supabase.co` |
| Migraciones aplicadas | ✅ | 4 migraciones: schema inicial, `create_order_atomic`, validaciones, trigger OAuth |
| Seed de datos de catálogo | ✅ | `artist_types`, `event_types`, `platform_settings` (commission_rate=0.20) |
| Storage buckets creados | ✅ | `artist-photos` (5MB), `event-flyers` (10MB), `venue-maps` (20MB) |
| Políticas RLS de Storage | ✅ | Configuradas en Dashboard para `artist-photos`, `event-flyers`, `venue-maps` |
| Migración Storage RLS | ✅ | `20250106000000_storage_rls_policies.sql` generada |
| Fix `contentType` en subidas TS | ✅ | `artists.service.ts` y `events.service.ts` envían MIME type explícito |
| `platform_settings.paypal_client_id` | ✅ | Insertado como JSONB en la tabla |
| RLS habilitado en todas las tablas | ✅ | Incluye políticas de `INSERT` para `user_roles` y `profiles` |
| Trigger `handle_new_user` (OAuth fix) | ✅ | Corregido con `SET search_path = public, auth, pg_temp` + manejo de excepciones |
| Política RLS para auto-asignación de roles | ✅ | `Users can insert own roles` + `Users can update own roles` |
| Función `create_order_atomic` | ✅ | Crea orden, actualiza stock, libera locks, aplica cupones — en una sola transacción |
| Función `reserve_tickets` | ✅ | Reserva atómica de boletos con ventana de 15 minutos |
| Función `release_expired_locks` | ✅ | Lista para pg_cron (programar manualmente) |
| Secrets en Supabase Edge Functions | ✅ | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` configurados |

### Edge Functions (Supabase Deno)

| Función | Estado | Descripción |
|---------|--------|-------------|
| `create-paypal-order` | ✅ Desplegada | Crea orden PayPal sandbox/live, verifica locks activos |
| `create-order` | ✅ Desplegada | Captura pago PayPal y llama `create_order_atomic` |
| `apply-coupon` | ✅ Desplegada | Valida y aplica cupones al checkout |
| `send-ticket-email` | ✅ Existe | Edge function para envío de email (pendiente configurar Resend) |

### Admin App (`apps/admin` → `ticketflow-admin.vercel.app`)

| Módulo | Estado | Componentes |
|--------|--------|-------------|
| Autenticación | ✅ | Login, Register, Google OAuth, guards (`authGuard`, `noAuthGuard`, `artistRoleGuard`) |
| Layout principal | ✅ | `AdminShellComponent`, `SidebarComponent`, `TopbarComponent` |
| Perfil de Artista | ✅ | `ArtistDetailComponent`, `ArtistFormComponent`, upload a `artist-photos` |
| Dashboard | ✅ | `DashboardComponent`, `DashboardService` con queries agregadas |
| Recintos (Venues) | ✅ | CRUD completo: lista, form, detalle, map picker, configuraciones |
| Eventos | ✅ | CRUD completo: lista, form, detalle, flyer upload, picker de venue, workflow Draft→Published |
| Tipos de Ticket | ✅ | CRUD por evento, validación de SKU, visualización de comisión |
| Cupones | ✅ | CRUD por evento, tipos: cortesía/porcentaje/fijo, generador de códigos |
| Control de Acceso | ✅ | `AccessControlComponent`, escaneo de QR, validación de boletos en la entrada |
| Despliegue en Vercel | ✅ | Configurado: Build Command `npm run build:admin`, Output: `dist/apps/admin/browser` |

### Store App (`store/` → URL pendiente)

| Módulo | Estado | Componentes |
|--------|--------|-------------|
| Autenticación | ✅ | Login, Register, Google OAuth, `authGuard` |
| Navbar + Footer | ✅ | Búsqueda integrada, menú de usuario, enlaces a admin |
| Landing Page / Home | ✅ | Hero, búsqueda central, chips de categorías, cartelera de eventos, propuestas de valor, CTA artista |
| Búsqueda y Filtros | ✅ | `SearchResultsComponent`, `FilterPanelComponent`, búsqueda por texto/tipo/fecha |
| Detalle de Evento | ✅ | Flyer, descripción, info de artista, `TicketSelectorComponent`, mapa Google Maps |
| Checkout — Carrito | ✅ | `CartSummaryComponent`, resumen de locks, cupón, countdown timer, subtotales |
| Checkout — Pago | ✅ | `PaymentComponent`, botones PayPal SDK, flujo de cortesía (total $0), manejo de errores |
| Checkout — Confirmación | ✅ | `OrderConfirmationComponent` con detalles de la orden |
| Mis Boletos | ✅ | `MyTicketsComponent`, `TicketDetailComponent` con código QR único por boleto |
| Utilidades QR | ✅ | `qr.utils.ts` para generación de códigos QR |

### Shared Libraries

| Librería | Componentes | Estado |
|----------|-------------|--------|
| `@ticketflow/models` | Tipos TS del DB, interfaces de dominio, constantes de buckets | ✅ |
| `@ticketflow/data-access` | `SupabaseService`, `AuthService` (Signals, OAuth, roles) | ✅ |
| `@ticketflow/shared-ui` | `Button`, `Card`, `Badge`, `Input`, `FileUpload`, `Spinner`, `StatCard` | ✅ |

---

## 🟡 Pendiente de Validar / QA

### Admin App — Flujo End-to-End

- [ ] **Error `Failed to fetch` en Admin desplegado**
  - Verificar variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel → Settings → Environment Variables → Redeploy.
  - Revisar en DevTools (F12 → Network) qué endpoint HTTP específico falla.
  - Comprobar si extensiones del navegador (adblocker / Brave Shields) interfieren con peticiones a `supabase.co`.
- [ ] **Subida de archivos (Storage)**
  - Probar upload de foto de artista (`artist-photos` bucket).
  - Probar upload de flyer de evento (`event-flyers` bucket).
  - Probar upload de mapa de recinto (`venue-maps` bucket).
- [ ] **Flujo completo Venue → Event → Ticket Types**
  - Crear recinto con coordenadas de mapa (Google Maps picker — requiere `VITE_GOOGLE_MAPS_API_KEY`).
  - Crear evento asociado al recinto, con flyer, fechas y tipo de evento.
  - Agregar tipos de ticket (VIP, General) con precio, SKU y stock.
  - Transicionar el evento de Draft → Published.
- [ ] **Validación del Control de Acceso (QR Scanner)**
  - Escanear QR de un boleto comprado desde la tienda y verificar validación correcta.

### Store App — Flujo End-to-End

- [ ] **Despliegue en Vercel de la tienda** (Store)
  - Crear proyecto en Vercel apuntando a `store/`.
  - Build Command: `npm run build:store` / Output: `dist/store/browser`.
  - Configurar variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYPAL_CLIENT_ID`, `VITE_GOOGLE_MAPS_API_KEY`.
- [ ] **Verificar Google Maps en el detalle de evento** (`VenueMapComponent`)
  - Requiere `VITE_GOOGLE_MAPS_API_KEY` válida con Maps JavaScript API habilitada.
- [ ] **Prueba de compra completa con PayPal Sandbox**
  - Seleccionar boletos → reservar (lock 15 min) → carrito → aplicar cupón → pagar con PayPal → confirmación.
  - Verificar que los boletos aparecen en "Mis Boletos" con QR funcional.

### Supabase — Configuraciones Pendientes

- [ ] **pg_cron para liberar locks expirados**
  - Ejecutar en SQL Editor:
    ```sql
    SELECT cron.schedule('release-expired-locks', '* * * * *', 'SELECT release_expired_locks()');
    ```
- [ ] **Email de confirmación (`send-ticket-email` Edge Function)**
  - Configurar Resend (o SMTP de Supabase) para enviar email con QR al finalizar la compra.
- [ ] **URLs de Auth en Supabase** para producción
  - Ir a Authentication → URL Configuration → Redirect URLs y agregar:
    - `https://ticketflow-admin.vercel.app/**`
    - `https://<store-url>.vercel.app/**`

---

## 🔴 Futuras Mejoras (Post-MVP)

- [ ] Google Maps API Key para mapa de recintos (actualmente `VITE_GOOGLE_MAPS_API_KEY` vacío)
- [ ] Email de confirmación con QR por boleto (Edge Function `send-ticket-email` + Resend)
- [ ] Cambiar PayPal de Sandbox a producción (`PAYPAL_MODE=live` en secrets)
- [ ] Google OAuth de Supabase en producción (agregar dominio en Google Cloud Console)
- [ ] PWA / Capacitor para app móvil
- [ ] QR scan en acceso con lector físico (Web USB / camera API)
- [ ] Payouts a artistas vía PayPal Payouts API
- [ ] Waitlist para eventos agotados
- [ ] Gestión de reembolsos
- [ ] Panel de super-admin (verificación de recintos, gestión de usuarios)
- [ ] Soporte multi-moneda
- [ ] Login social: Facebook, Apple (vía Supabase OAuth providers)
- [ ] Series / eventos recurrentes
- [ ] Transfer de boletos entre usuarios
- [ ] Notificaciones push para recordatorios de eventos

---

## 📁 Archivos Clave del Proyecto

| Archivo | Propósito |
|---------|-----------|
| [`ticketflow/vercel.json`](../ticketflow/vercel.json) | Rewrites SPA para Vercel (sin `outputDirectory` hardcoded) |
| [`apps/admin/.env`](../ticketflow/apps/admin/.env) | Variables de entorno Admin (no commitear) |
| [`store/.env`](../ticketflow/store/.env) | Variables de entorno Store (no commitear) |
| [`supabase/migrations/20250104000000_oauth_google_trigger.sql`](../ticketflow/supabase/migrations/20250104000000_oauth_google_trigger.sql) | Trigger corregido para Google OAuth |
| [`supabase/migrations/20250105000000_fix_user_roles_rls.sql`](../ticketflow/supabase/migrations/20250105000000_fix_user_roles_rls.sql) | Fix RLS: permite auto-asignación de roles |
| [`supabase/migrations/20250102000000_create_order_atomic.sql`](../ticketflow/supabase/migrations/20250102000000_create_order_atomic.sql) | Función atómica de creación de órdenes |
| [`store/src/app/features/home/home.component.ts`](../ticketflow/store/src/app/features/home/home.component.ts) | Landing page — CTA apunta a `ticketflow-admin.vercel.app` |

---

## 🚀 Pasos para Retomar el Desarrollo

```bash
# 1. Asegurarse de estar en el branch correcto
git checkout main && git pull origin main

# 2. Levantar Admin App
cd /home/rtorres/tickets/web-tickets/ticketflow
npx nx serve admin   # http://localhost:4200

# 3. Levantar Store App (en otra terminal)
npx nx serve store   # http://localhost:4201

# 4. Para emular Edge Functions localmente
supabase functions serve

# 5. Desplegar cambios en Vercel (después de git push)
git add .
git commit -m "feat: ..."
git push origin main
# Vercel auto-despliega desde GitHub
```
