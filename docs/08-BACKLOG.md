# 08 — Backlog & TODO List

> **Última actualización:** 22 de octubre de 2026
> **Estado MVP:** Ciclo completo funcional y endurecido en Producción ✅ — En fase de validación final y mejoras post-MVP
>
> Este documento es el **backlog maestro** del proyecto. Contiene todas las tareas pendientes organizadas por prioridad.
> El detalle técnico de implementación de las mejoras está en [`07-MEJORAS-POST-MVP.md`](./07-MEJORAS-POST-MVP.md).

---

## 🔥 P0 — Crítico / Blockers de Producción

> Deben completarse **antes** de abrir la plataforma al público. Sin estas configuraciones, la producción está rota o incompleta.

- [x] **pg_cron: activar liberación de locks expirados**
  - **Completado:** Extensión `pg_cron` habilitada y job programado (`* * * * * SELECT release_expired_locks()`). Permite liberar automáticamente el stock reservado tras 15 minutos de inactividad en carritos abandonados.

- [x] **Supabase Auth → URLs de redirección para producción y Google OAuth**
  - **Completado:** URLs de redirección y OAuth configurados en Supabase Dashboard y Google Cloud Console.

- [x] **Despliegue de la Store y Admin en Vercel**
  - **Completado:** Tanto la aplicación de Tienda (`store`) como el panel de Administración (`admin`) se encuentran desplegados y operativos en Vercel.

- [x] **🔐 Seguridad del Checkout, RLS, Roles y Edge Functions (Migraciones 022 y 023) — desplegadas en Supabase**
  - **Migración 022 (`20250122000000_secure_checkout.sql`):** `calculate_checkout_quote` en servidor (con restricción SKU y validación de evento), `create_order_atomic` restringido a `service_role` con `p_expected_total`, verificación PayPal pre/post captura y auto-refund en `create-order`.
  - **Migración 023 (`20250123000000_security_rls_and_rpc_fixes.sql`):** bloqueo de auto-asignación de rol `admin` en `user_roles`, corrección del bypass anónimo `is_admin(NULL)` + revocación de `EXECUTE` a `anon` en RPCs administrativos, `SECURITY DEFINER` en `reserve_tickets` y `release_expired_locks` para invitados, RPC atómico `accept_staff_invitation` para porteros, endurecimiento de `validate_ticket_qr` (prefijo >= 8 chars + estado `refunded`), soporte de solicitud de reembolso para invitados (`p_access_token`) y aprobación de reembolsos exclusiva para Super-Admin (`process_refund_request`).
  - **Edge Functions desplegadas:** `create-paypal-order`, `create-order`, `apply-coupon`, `send-staff-invite`, `send-ticket-email` y `process-refund` (incluyendo notificación de aprobación/rechazo de reembolsos vía Resend).

- [x] **Unificar el canal de correo en Resend directo (N8N opcional)**
  - **Completado y desplegado:** `create-order` invoca `send-ticket-email` (Resend) como canal principal para **todas** las órdenes (registrados e invitados), incluyendo imagen QR (`TICKETFLOW-AUTH-<order_id>`) y botón directo a `/ticket/:id?token=...`. El webhook N8N queda como integración secundaria opcional si se define `N8N_TICKET_WEBHOOK_URL`.

- [x] **Reembolsos reales vía PayPal Refund API + Solicitud para Invitados + Notificación Resend**
  - **Completado y desplegado:** Edge Function `process-refund` desplegada; valida rol Super-Admin, ejecuta el reembolso monetario en PayPal (`POST /v2/payments/captures/{id}/refund`), actualiza el estado atómico vía `process_refund_request` y envía correo de resolución vía Resend. Conectada en `RefundsService` (Admin) y `BackofficeService` (Backoffice). Agregado modal y banner de solicitud de reembolso para invitados en `public-ticket.component.ts`.

- [x] **Desplegar Backoffice en Vercel**
  - **Completado:** Aplicación `apps/backoffice` compilada y desplegada en Vercel con soporte completo de Modo Oscuro/Claro M3 y `ToastService`.

- [x] **Dominio Oficial & Verificación DNS en Resend API**
  - **Completado:** Dominio verificado en Resend (`DKIM`, `SPF`, `MX`, `DMARC`) y secrets configurados en Supabase Edge Functions (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STORE_APP_URL` y `ADMIN_APP_URL`).

- [ ] **PayPal: cambiar de Sandbox a producción** *(después de correr la prueba E2E en Sandbox)*
  - En Supabase → Edge Functions → Secrets: cambiar `PAYPAL_MODE` a `live`.
  - Reemplazar `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` con credenciales Live de PayPal y actualizar el Client ID en el frontend.

- [x] **Webhook de PayPal (`PAYMENT.CAPTURE.*`) y tabla de reconciliación (Código listo)**
  - **Implementado en código:** Migración 024 (`20250124000000_paypal_webhook_reconciliation.sql`) con tablas `paypal_payment_intents` y `paypal_webhook_events` + RPC `get_paypal_reconciliation_report`, actualización de `create-paypal-order` y `create-order` (idempotente), y nueva Edge Function `paypal-webhook`.
  - **📌 Pasos por hacer (Despliegue en Supabase & PayPal):**
    - [ ] **Paso 1 (SQL):** Ejecutar el contenido de `ticketflow/supabase/migrations/20250124000000_paypal_webhook_reconciliation.sql` en el **SQL Editor** de Supabase (o mediante `npx supabase db push`).
    - [ ] **Paso 2 (Edge Functions):** Desplegar las funciones actualizadas en Supabase:
      `npx supabase functions deploy create-paypal-order create-order paypal-webhook --no-verify-jwt`
    - [ ] **Paso 3 (PayPal Dashboard):** En PayPal Developer Dashboard (`Apps & Credentials → Webhooks`), registrar el URL `https://kevgwhiosnyemaftbjqs.supabase.co/functions/v1/paypal-webhook` y suscribir los eventos:
      - `Checkout order approved` (`CHECKOUT.ORDER.APPROVED`)
      - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
      - `Payment capture denied` (`PAYMENT.CAPTURE.DENIED`)
      - `Payment capture refunded` (`PAYMENT.CAPTURE.REFUNDED`)
      - `Payment capture reversed` (`PAYMENT.CAPTURE.REVERSED`)
    - [ ] **Paso 4 (Secret Opcional):** Copiar el `Webhook ID` generado por PayPal y guardarlo en Supabase Secrets como `PAYPAL_WEBHOOK_ID`.

---

## 🟠 P1 — Alta Prioridad (Experiencia de usuario directa)

> Bugs o carencias que el usuario final percibe de inmediato.

- [x] **[M3] QR realmente escaneable por cámara + Descarga nativa `.png`**
  - **Completado:** Se integró la librería `qrcode` con nivel de corrección H y renderizado HD asíncrono en `ticket-detail`, `my-tickets` y `public-ticket`, más botón de descarga directa de imagen `.png` para móviles.

- [x] **Guest Checkout (Compra sin Cuenta) & Entrega de Boletos vía Resend / N8N**
  - **Estado:** ✅ Completado (Fases 1, 2, 3 y 4 completadas + desbloqueo de navegación a `/checkout` en `event-detail.component.ts`).

- [x] **[M5] Fix redirect a login al intentar comprar**
  - **Completado:** Se corrigió la URL en `event-detail.component.ts` y se permitió el paso directo a `/checkout` para invitados sin sesión.

- [x] **[M6] Buscador busca por nombre del artista**
  - **Completado:** Actualizado `search.service.ts` para buscar tanto por nombre de evento como por nombre de artista; creada migración SQL 008.

- [x] **[M4] Foto de perfil de Gmail en topbar (Admin, Store y Backoffice)**
  - **Completado:** Agregada señal `avatarUrl` en `AuthService` y actualizada la interfaz en `topbar.component.ts`, `navbar.component.ts` y `backoffice-topbar.component.ts`.

- [x] **[M8] Cupones por SKU + Fix visibilidad de eventos en tienda**
  - **Completado:** Migración SQL 011, selector dinámico en admin, cálculo por SKU en Edge Function y atomic order, y fix de filtros de fechas en tienda.

- [x] **[M9] Perfil de artista con biografía y galería multi-fotos**
  - **Completado:** Migración SQL 012 (`gallery_urls`), carga y gestión de múltiples fotos en Admin (`artist-form` y `artist-detail`), y visualización interactiva con lightbox en la tienda (`event-detail` y `search-results`).

- [x] **[M10] SEO Avanzado (`boletocoqueto.com`), JSON-LD `MusicEvent`, Sitemap XML, Copy de Conversión, 404 y Política de Privacidad / Garantía**
  - **Completado:** Servicio `SeoService` con canonicals dinámicos (`https://boletocoqueto.com`), directivas `noindex` en rutas transaccionales, limpieza de OpenGraph/Twitter Cards, inyección dinámica de `Schema.org/MusicEvent` JSON-LD en eventos, SEO dinámico en búsquedas/categorías, copy optimizado en Home/Footer, sección de Garantía del Comprador (`#garantia`), `sitemap.xml` y `robots.txt` actualizados a `boletocoqueto.com`.

- [x] **Fix contador de boletos (stepper layout)**
  - **Completado:** Se rediseñó el componente `ticket-selector.component.ts` en layout vertical apilado para evitar desbordes visuales en columnas angostas.

- [x] **Mapa interactivo del recinto sin API Key (`VenueMapComponent` con Leaflet / OpenStreetMap)**
  - **Completado:** `VenueMapComponent` utiliza Leaflet + OpenStreetMap cargado dinámicamente sin requerir `VITE_GOOGLE_MAPS_API_KEY`, incluyendo pin interactivo y enlace directo a "Cómo llegar" en Google Maps.

- [ ] **Prueba end-to-end de compra, correo QR y reembolso en PayPal Sandbox**
  - Seleccionar boletos → reservar → carrito → cupón → pagar → recibir correo Resend → ver/descargar QR → solicitar reembolso → aprobar en Backoffice.

- [ ] **Probar upload de archivos (Storage) en producción**
  - Verificar que los 3 buckets funcionan correctamente:
    - [ ] `artist-photos` — foto de perfil del artista
    - [ ] `event-flyers` — flyer del evento
    - [ ] `venue-maps` — mapa del recinto

---

## 🟡 P2 — Media Prioridad (Mejoras de negocio importantes)

> No bloquean el uso, pero son necesarias para operación correcta del negocio.

- [x] **[M1] Limitar stock de boletos a la capacidad del Venue**
  - **Completado:** Formulario reactivo con validador dinámico de aforo máximo disponible y desglose visual en `ticket-type-form.component.ts`.

- [x] **[M2] Validar acceso solo desde apertura de puertas (`doors_open`)**
  - **Completado:** Creada migración SQL 007 (`validate_doors_open`) y adaptado `access-control.service` y `access-control.component` con estado `doors_not_open`.

- [ ] **Verificar `Failed to fetch` en Admin desplegado**
  - Revisar env vars `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel → Settings → Redeploy.
  - Revisar en DevTools (F12 → Network) qué endpoint falla.
  - Comprobar si extensiones del navegador interfieren (Brave Shields, adblockers).

- [ ] **Google OAuth y Supabase Auth URL Configuration para `boletocoqueto.com`**
  - **1. Supabase Dashboard (`Authentication → URL Configuration`):**
    - Cambiar **Site URL** a `https://boletocoqueto.com`
    - Agregar en **Redirect URLs**:
      - `https://boletocoqueto.com/**`
      - `https://www.boletocoqueto.com/**`
      - *(Más subdominios de `admin` / `backoffice` si aplica, conservando las URLs `.vercel.app`)*
  - **2. Google Cloud Console (`APIs & Services → Credentials → OAuth 2.0 Client ID`):**
    - Agregar en **Authorized JavaScript origins**:
      - `https://boletocoqueto.com`
      - `https://www.boletocoqueto.com`
      - `https://kevgwhiosnyemaftbjqs.supabase.co`
    - Confirmar en **Authorized redirect URIs**:
      - `https://kevgwhiosnyemaftbjqs.supabase.co/auth/v1/callback`
    - En **OAuth Consent Screen (Branding / Audience)**:
      - Agregar `boletocoqueto.com` y `supabase.co` en **Authorized domains**.
      - Verificar que **Publishing status** esté en **"In production"** (para no restringir el login solo a correos de prueba).

---

## 🔵 P3 — Mejoras Planificadas & Módulos Avanzados

> Features estratégicas para la escalabilidad, administración central y operación financiera de la plataforma.

- [x] **[M7] Rol "Control de Admisión" (doorman)**
  - **Completado:** Implementadas migraciones SQL 009, 010 y 023 (`accept_staff_invitation`), guards de navegación (`doormanGuard`, `artistRoleGuard`), componentes `EventStaffComponent` y `AcceptInviteComponent`, servicio `EventStaffService`, filtrado de menú en `SidebarComponent`, modo doorman en `AccessControlComponent`, tipos en `@ticketflow/models` y Edge Function `send-staff-invite`.

- [x] **1. Módulo de Super-Admin Central y App Backoffice Independiente**
  - **Completado:** Migración SQL 013 y 017 con RPCs `get_all_users_with_roles`, `admin_set_user_role`, `admin_toggle_venue_verification` y `get_global_platform_metrics`. App dedicada `apps/backoffice` con `ToastContainerComponent`, selector de Modo Oscuro/Claro, modales M3 de confirmación para roles y reembolsos con `admin_notes`.

- [x] **2. Gestión de Solicitudes de Reembolso (Post-Venta)**
  - **Completado:** Migraciones SQL 014 y 023 + Edge Function `process-refund` con PayPal Refund API y notificación Resend. Flujo del cliente en tienda (`my-tickets`, `ticket-detail`, `public-ticket`) y aprobación exclusiva por Super-Admin en Backoffice/Admin.

- [x] **3. Waitlist / Lista de Espera para Eventos Agotados + Envío de Correos Resend (`notify-waitlist`)**
  - **Completado:** Migración SQL 015 con tabla `waitlist` (cola FIFO, RLS y RPCs `join_event_waitlist`, `get_event_waitlist`, `notify_event_waitlist` y `get_my_waitlist`) + Edge Function `notify-waitlist` que procesa el lote FIFO y envía correos prioritarios en batch vía Resend (`https://api.resend.com/emails/batch`) con flyer del evento y botón directo a `/events/:eventId`. Modal y tabla en `event-waitlist.component.ts` actualizados a Modo Oscuro/Claro M3 con `ToastService`.

- [x] **4. Facturación y Control de Pagos a Artistas (Payouts & Liquidaciones)**
  - **Completado:** Migraciones 016 y 020 con retención del 20% de comisión, configuración de CLABE/RFC y registro de liquidaciones.

- [x] **[M15] Meta Pixel por Artista**
  - **Completado:** Migración SQL 019 (`meta_pixel_id`), `MetaPixelService` dinámico en Store para disparar `ViewContent`, `InitiateCheckout` y `Purchase`, y sección "Marketing Digital" en el perfil de artista en Admin.

- [x] **[UX-1 a UX-12] Suite Completa de Mejoras de Experiencia de Usuario y M3 Dark/Light Mode**
  - **Completado:** Skeletons animadas (`tf-skeleton`), sistema global de notificaciones Toast (`tf-toast-container`) en las 3 apps, animación de confetti Canvas y enlace a boleto de invitado en Thank You page, timer con advertencias de expiración en checkout, barra de compartir en redes sociales, drawer slide-over de filtros en móvil, Modo Oscuro/Claro M3 homologado en `store`, `admin` (`finances`, `refund-list`, `access-control`, `event-waitlist`) y `backoffice`, aviso de compatibilidad `BarcodeDetector` en escáner QR, descarga nativa de QR en `.png`, gráfica SVG interactiva de ventas y transiciones de navegación fluidas (`withViewTransitions`).

---

## ⚪ P4 — Roadmap Futuro

> Ideas y mejoras para versiones posteriores. Sin diseño técnico detallado aún.

- [ ] Integración automatizada con PayPal Payouts API para dispersión masiva de pagos a artistas
- [ ] PWA / Capacitor para app móvil nativa para iOS y Android
- [ ] Seat map con selección de asiento individual y zonas interactivas
- [ ] Series / eventos recurrentes (un template → múltiples fechas)
- [ ] Transferencia segura de boletos entre usuarios
- [ ] Login social adicional: Apple, Facebook (via Supabase OAuth providers)
- [ ] Soporte multi-moneda (USD, EUR, etc.)
- [ ] Notificaciones push para recordatorios de eventos
- [ ] Múltiples artistas por evento (co-headlining y line-up por horarios)
- [ ] Modo offline para el Control de Acceso (PWA con cache local de hashes QR)

---

## 📊 Métricas del proyecto

| Categoría | Total | Completado | Pendiente |
|-----------|-------|-----------|-----------|
| P0 — Blockers & Producción | 8 | 6 | 2 (PayPal Live, Webhook PayPal) |
| P1 — Alta prioridad | 12 | 10 | 2 (Prueba E2E Sandbox, Prueba Storage) |
| P2 — Media prioridad | 4 | 2 | 2 (Verificar fetch Admin, Google OAuth Prod URI) |
| P3 — Super Admin, Backoffice & UX M3 | 7 | 7 | 0 |
| P4 — Roadmap | 11 | 0 | 11 |
| **Total** | **42** | **25** | **17** |

---

## ✅ Completado (historial)

- [x] Monorepo Nx 23 + Angular 22 + TailwindCSS configurado (3 apps: `store`, `admin`, `backoffice`)
- [x] Schema completo de base de datos (23 migraciones aplicadas en Supabase)
- [x] Auth con Google OAuth (Admin + Store)
- [x] CRUD completo de Venues con mapa
- [x] CRUD completo de Artist Profile con foto, galería multi-fotos y Meta Pixel
- [x] CRUD completo de Events con flyer y publicación
- [x] CRUD completo de Ticket Types con comisiones y límite de aforo por Venue
- [x] CRUD completo de Cupones (cortesía, porcentaje, fijo y por SKU)
- [x] Dashboard Admin con métricas en vivo y gráfica SVG
- [x] Sistema de reserva de boletos (locks de 15 min + `pg_cron`) para usuarios e invitados
- [x] Checkout endurecido con cotización en servidor (`calculate_checkout_quote`) y PayPal SDK
- [x] Confirmación de orden, "Mis Boletos", Pase Público para Invitados (`/ticket/:id?token=...`) y descarga `.png` de QR
- [x] Control de Acceso con `BarcodeDetector` (cámara) + Rol Doorman (`accept_staff_invitation`)
- [x] Reembolsos reales con PayPal Captures Refund API (`process-refund`) + notificación Resend
- [x] Homologación de Modo Oscuro/Claro M3 y `ToastService` en `store`, `admin` y `backoffice`
- [x] 6 Edge Functions desplegadas (`create-paypal-order`, `create-order`, `apply-coupon`, `send-ticket-email`, `send-staff-invite`, `process-refund`)
- [x] Dominio oficial verificado en Resend y Secrets configurados en Supabase
- [x] Las 3 aplicaciones (`store`, `admin`, `backoffice`) desplegadas en Vercel

