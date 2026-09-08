# 08 — Backlog & TODO List

> **Última actualización:** 08 de septiembre de 2026
> **Estado MVP:** Ciclo completo funcional ✅ — En proceso de mejoras post-MVP
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

- [ ] **PayPal: cambiar de Sandbox a producción**
  - En Supabase → Edge Functions → Secrets: cambiar `PAYPAL_MODE` a `live`
  - Reemplazar `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` con credenciales de producción

---

## 🟠 P1 — Alta Prioridad (Experiencia de usuario directa)

> Bugs o carencias que el usuario final percibe de inmediato.

- [x] **[M3] QR realmente escaneable por cámara**
  - **Completado:** Se integró la librería `qrcode` con nivel de corrección H y renderizado HD asíncrono en `ticket-detail` y `my-tickets`.

- [ ] **Envío de invitaciones Doorman y correos de confirmación (Alternativa N8N Webhook)**
  - **Estado:** Pendiente de estabilización en producción.
  - **Alternativa propuesta:** Implementar un Webhook hacia N8N para procesar el envío de correos y automatizaciones de forma desacoplada y confiable.

- [x] **[M5] Fix redirect a login al intentar comprar**
  - **Completado:** Se corrigió la URL en `event-detail.component.ts` a `/events/:id`.

- [x] **[M6] Buscador busca por nombre del artista**
  - **Completado:** Actualizado `search.service.ts` para buscar tanto por nombre de evento como por nombre de artista; creada migración SQL 008.

- [x] **[M4] Foto de perfil de Gmail en topbar (Admin y Store)**
  - **Completado:** Agregada señal `avatarUrl` en `AuthService` y actualizada la interfaz en `topbar.component.ts` y `navbar.component.ts`.

- [x] **[M8] Cupones por SKU + Fix visibilidad de eventos en tienda**
  - **Completado:** Migración SQL 011, selector dinámico en admin, cálculo por SKU en Edge Function y atomic order, y fix de filtros de fechas en tienda.

- [x] **[M9] Perfil de artista con biografía y galería multi-fotos**
  - **Completado:** Migración SQL 012 (`gallery_urls`), carga y gestión de múltiples fotos en Admin (`artist-form` y `artist-detail`), y visualización interactiva con lightbox en la tienda (`event-detail` y `search-results`).

- [x] **[M10] SEO, Sitemap XML, 404 personalizado, Página de Gracias, Política de Privacidad y Textos Alt**
  - **Completado:** Servicio `SeoService` con títulos y meta descripciones dinámicas por ruta en español, página 404 personalizada (`not-found`), página de agradecimiento (`thank-you`), página legal de política de privacidad (`privacy-policy`), `sitemap.xml`, `robots.txt`, y textos `alt` descriptivos en todas las imágenes.

- [x] **Fix contador de boletos (stepper layout)**
  - **Completado:** Se rediseñó el componente `ticket-selector.component.ts` en layout vertical apilado para evitar desbordes visuales en columnas angostas.

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

## 🔵 P3 — Mejoras Planificadas & Módulos Avanzados

> Features estratégicas para la escalabilidad, administración central y operación financiera de la plataforma.

- [x] **[M7] Rol "Control de Admisión" (doorman)**
  - **Completado:** Implementadas migraciones SQL 009 y 010, guards de navegación (`doormanGuard`, `artistRoleGuard`), componentes `EventStaffComponent` y `AcceptInviteComponent`, servicio `EventStaffService`, filtrado de menú en `SidebarComponent`, modo doorman en `AccessControlComponent`, tipos en `@ticketflow/models` y Edge Function `send-staff-invite`.

- [x] **1. Módulo de Super-Admin Central**
  - **Completado:** Migración SQL 013 con RPCs `get_all_users_with_roles`, `admin_set_user_role`, `admin_toggle_venue_verification` y `get_global_platform_metrics`. Implementadas las vistas `VenueModerationComponent`, `UserManagementComponent`, `SuperAdminDashboardComponent`, servicio `SuperAdminService`, `superAdminGuard` y navegación dedicada en `SidebarComponent`.

- [x] **2. Gestión de Solicitudes de Reembolso (Post-Venta)**
  - **Completado:** Migración SQL 014 con tabla `refund_requests` y RPCs `request_order_refund`, `process_refund_request` y `get_all_refund_requests`. Flujo del cliente en la tienda (`my-tickets.component.ts` y `ticket-detail.component.ts`) con modal interactivo de motivos, banners de estado y anulación de QR si reembolsado. Panel completo de administración (`refund-list.component.ts`, `refunds.service.ts`, `refunds.routes.ts`) con filtros, tarjetas de métricas y aprobación/rechazo atómico que reincorpora stock y anula boletos.

- [x] **3. Waitlist / Lista de Espera para Eventos Agotados**
  - **Completado:** Migración SQL 015 con tabla `waitlist` (cola FIFO, RLS y RPCs `join_event_waitlist`, `get_event_waitlist`, `notify_event_waitlist` y `get_my_waitlist`). Formulario interactivo de suscripción en la tienda (`ticket-selector.component.ts`) ante localidades agotadas. Pestaña de gestión de suscripciones para el comprador en *Mis Boletos* (`my-tickets.component.ts`). Tarjeta de gestión de cola y disparador de notificaciones por lote para el organizador en el detalle del evento en Admin (`event-waitlist.component.ts`).

- [x] **4. Facturación y Control de Pagos a Artistas (Payouts & Liquidaciones)**
  - **Completado:** Migración SQL 016 con tablas `artist_payout_settings` y `payouts`, RLS y RPCs `upsert_artist_payout_settings`, `get_artist_financial_summary`, `get_all_artists_financial_overview` y `create_payout_record`. Portal financiero para artistas en `/finances` con desglose de saldo disponible, comisiones, reembolsos descontados e historial de transferencias. Panel central en Super-Admin `/super-admin/payouts` para liquidar saldos pendientes (SPEI, PayPal, Manual).

---

## ⚪ P4 — Roadmap Futuro

> Ideas y mejoras para versiones posteriores. Sin diseño técnico detallado aún.

- [ ] Integración automatizada con PayPal Payouts API para dispersión masiva de pagos
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
| P0 — Blockers & Producción | 4 | 3 | 1 (PayPal Live) |
| P1 — Alta prioridad | 9 | 8 | 1 (Webhook N8N Email) |
| P2 — Media prioridad | 4 | 2 | 2 |
| P3 — Super Admin & Módulos Avanzados | 5 | 5 | 0 |
| P4 — Roadmap | 10 | 0 | 10 |
| **Total** | **32** | **18** | **14** |

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
