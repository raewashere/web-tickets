# 08 — Backlog & TODO List

> **Última actualización:** 08 de septiembre de 2026
> **Estado MVP:** Ciclo completo funcional ✅ — En proceso de mejoras post-MVP
>
> Este documento es el **backlog maestro** del proyecto. Contiene todas las tareas pendientes organizadas por prioridad.
> El detalle técnico de implementación de las mejoras está en [`07-MEJORAS-POST-MVP.md`](./07-MEJORAS-POST-MVP.md).

---

## 🔥 P0 — Crítico / Blockers de Producción

> Deben completarse **antes** de abrir la plataforma al público. Sin estas configuraciones, la producción está rota o incompleta.

- [ ] **pg_cron: activar liberación de locks expirados**
  - Sin esto, cada vez que un usuario abandona el carrito sin pagar, los boletos quedan bloqueados 15 minutos pero nunca se liberan automáticamente si el cron no corre.
  - Ejecutar en SQL Editor de Supabase:
    ```sql
    SELECT cron.schedule('release-expired-locks', '* * * * *', 'SELECT release_expired_locks()');
    ```

- [ ] **Supabase Auth → URLs de redirección para producción**
  - Ir a Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
  - Agregar:
    - `https://ticketflow-admin.vercel.app/**`
    - `https://<store-url>.vercel.app/**`
  - Sin esto, el login con Google OAuth falla en producción.

- [ ] **Despliegue de la Store en Vercel**
  - Crear proyecto Vercel apuntando a `store/`
  - Build Command: `npm run build:store`
  - Output Directory: `dist/store/browser`
  - Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYPAL_CLIENT_ID`, `VITE_GOOGLE_MAPS_API_KEY`

- [ ] **PayPal: cambiar de Sandbox a producción**
  - En Supabase → Edge Functions → Secrets: cambiar `PAYPAL_MODE` a `live`
  - Reemplazar `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` con credenciales de producción

---

## 🟠 P1 — Alta Prioridad (Experiencia de usuario directa)

> Bugs o carencias que el usuario final percibe de inmediato.

- [x] **[M3] QR realmente escaneable por cámara**
  - **Completado:** Se integró la librería `qrcode` con nivel de corrección H y renderizado HD asíncrono en `ticket-detail` y `my-tickets`.

- [ ] **Email de confirmación al comprar (`send-ticket-email`)**
  - La Edge Function existe pero no tiene Resend configurado. El usuario no recibe confirmación de compra.
  - Requiere: cuenta en Resend, `RESEND_API_KEY` en secrets de Supabase, configurar `from` domain, activar el envío desde `create-order` Edge Function.

- [x] **[M5] Fix redirect a login al intentar comprar**
  - **Completado:** Se corrigió la URL en `event-detail.component.ts` a `/events/:id`.

- [x] **[M6] Buscador busca por nombre del artista**
  - **Completado:** Actualizado `search.service.ts` para buscar tanto por nombre de evento como por nombre de artista; creada migración SQL 008.

- [x] **[M4] Foto de perfil de Gmail en topbar (Admin y Store)**
  - **Completado:** Agregada señal `avatarUrl` en `AuthService` y actualizada la interfaz en `topbar.component.ts` y `navbar.component.ts`.

- [ ] **Google Maps API Key para el mapa del recinto**
  - `VenueMapComponent` requiere `VITE_GOOGLE_MAPS_API_KEY`. Sin la key, el mapa no carga.
  - Obtener key en Google Cloud Console → Maps JavaScript API → habilitar
  - Agregar en `.env` de Admin y Store, y en Vercel → Settings → Environment Variables

- [ ] **Probar upload de archivos (Storage) en producción**
  - Verificar que los 3 buckets funcionan correctamente:
    - [ ] `artist-photos` — foto de perfil del artista
    - [ ] `event-flyers` — flyer del evento
    - [ ] `venue-maps` — mapa del recinto

- [ ] **Prueba end-to-end de compra con PayPal Sandbox**
  - Seleccionar boletos → reservar → carrito → cupón → pagar → confirmación → ver QR en "Mis Boletos"

---

## 🟡 P2 — Media Prioridad (Mejoras de negocio importantes)

> No bloquean el uso, pero son necesarias para operación correcta del negocio.

- [x] **[M1] Limitar stock de boletos a la capacidad del Venue**
  - **Completado:** Formulario reactivo con validador dinámico de aforo máximo disponible y desglose visual en `ticket-type-form.component.ts`.

- [x] **[M2] Validar acceso solo desde apertura de puertas (`doors_open`)**
  - **Completado:** Creada migración SQL 007 (`validate_doors_open`) y adaptado `access-control.service` y `access-control.component` con estado `doors_not_open`.

- [ ] **Verificar `Failed to fetch` en Admin desplegado**
  - Revisar env vars `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel → Settings → Redeploy
  - Revisar en DevTools (F12 → Network) qué endpoint falla
  - Comprobar si extensiones del navegador interfieren (Brave Shields, adblockers)

- [ ] **Google OAuth en producción**
  - Agregar dominio de producción en Google Cloud Console → OAuth 2.0 → Authorized redirect URIs:
    - `https://kevgwhiosnyemaftbjqs.supabase.co/auth/v1/callback`

---

## 🔵 P3 — Mejoras Planificadas

> Features acordadas en la sesión de mejoras. Tienen diseño técnico completo en el doc `07`.

- [x] **[M7] Rol "Control de Admisión" (doorman)**
  - **Completado:** Implementadas migraciones SQL 009 y 010, guards de navegación (`doormanGuard`, `artistRoleGuard`), componentes `EventStaffComponent` y `AcceptInviteComponent`, servicio `EventStaffService`, filtrado de menú en `SidebarComponent`, modo doorman en `AccessControlComponent`, tipos en `@ticketflow/models` y Edge Function `send-staff-invite`.

- [ ] **Panel de super-admin**
  - Verificación de recintos (flag `venues.verified`)
  - Gestión de usuarios (cambio de roles, desactivar cuentas)
  - Estadísticas globales de la plataforma

- [ ] **Gestión de reembolsos**
  - Flujo de solicitud de reembolso → aprobación por admin/artista → devolución PayPal
  - Nuevo estado `refunded` en `orders.status` (ya existe en el enum)

- [ ] **Waitlist para eventos agotados**
  - Tabla `waitlist` (event_id, user_id, created_at, notified)
  - Notificación automática cuando se libera un boleto

---

## ⚪ P4 — Roadmap Futuro

> Ideas y mejoras para versiones posteriores. Sin diseño técnico detallado aún.

- [ ] Payouts a artistas vía PayPal Payouts API
- [ ] PWA / Capacitor para app móvil nativa
- [ ] Seat map con selección de asiento individual
- [ ] Series / eventos recurrentes (un template → múltiples fechas)
- [ ] Transferencia de boletos entre usuarios
- [ ] Login social: Facebook, Apple (via Supabase OAuth providers)
- [ ] Soporte multi-moneda (USD, EUR, etc.)
- [ ] Notificaciones push para recordatorios de eventos
- [ ] Múltiples artistas por evento (co-headlining)
- [ ] QR scan con lector físico (USB / Web HID API)
- [ ] Modo offline para el Control de Acceso (PWA con cache)

---

## 📋 Sprint actual sugerido — Semana del 08-Sep-2026

Tomando en cuenta las prioridades, el sprint de esta semana debería enfocarse en los items más impactantes y rápidos:

| Tarea | Prioridad | Esfuerzo | Impacto |
|-------|-----------|----------|---------|
| pg_cron locks | P0 | 2 min (1 SQL) | 🔴 Crítico |
| Auth redirect URLs Supabase | P0 | 5 min (config) | 🔴 Crítico |
| Fix URL redirect login (M5) | P1 | 2 min (1 línea) | 🟠 Alto |
| QR escaneable (M3) | P1 | 30 min | 🟠 Alto |
| Foto Gmail topbar (M4) | P1 | 45 min | 🟡 Medio |
| Buscador por artista (M6) | P1 | 1h (SQL + service) | 🟠 Alto |
| Email confirmación | P1 | 2-3h | 🟠 Alto |
| Google Maps API Key | P1 | 15 min (config) | 🟡 Medio |
| Stock vs Capacity (M1) | P2 | 2h | 🟡 Medio |
| Apertura de puertas (M2) | P2 | 1h (SQL) | 🟡 Medio |

---

## 📊 Métricas del proyecto

| Categoría | Total | Completado | Pendiente |
|-----------|-------|-----------|-----------|
| P0 — Blockers | 4 | 0 | 4 |
| P1 — Alta prioridad | 8 | 0 | 8 |
| P2 — Media prioridad | 4 | 0 | 4 |
| P3 — Planificadas | 4 | 0 | 4 |
| P4 — Roadmap | 10 | 0 | 10 |
| **Total** | **30** | **0** | **30** |

---

## ✅ Completado (historial)

- [x] Monorepo Nx 23 + Angular 22 + TailwindCSS configurado
- [x] Schema completo de base de datos (6 migraciones aplicadas)
- [x] Auth con Google OAuth (Admin + Store)
- [x] CRUD completo de Venues con mapa
- [x] CRUD completo de Artist Profile con foto
- [x] CRUD completo de Events con flyer y publicación
- [x] CRUD completo de Ticket Types con comisiones
- [x] CRUD completo de Cupones (cortesía, porcentaje, fijo)
- [x] Dashboard Admin con métricas en vivo
- [x] Sistema de reserva de boletos (locks de 15 min)
- [x] Checkout completo con PayPal SDK
- [x] Confirmación de orden y "Mis Boletos"
- [x] Control de Acceso con BarcodeDetector (cámara)
- [x] Storage buckets + RLS para fotos y flyers
- [x] 4 Edge Functions desplegadas (PayPal orders, capture, coupons, ticket email)
- [x] Admin App desplegada en Vercel (`ticketflow-admin.vercel.app`)
