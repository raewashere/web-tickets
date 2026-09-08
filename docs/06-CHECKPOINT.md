# 📋 Checkpoint — Estado del Proyecto TicketFlow

> **Fecha:** 08 de septiembre de 2026  
> **Sesión:** Mejoras Post-MVP, Generador QR Real, Validaciones de Aforo/Apertura y Rol de Control de Admisión (Doorman)

---

## 🟢 Completado y Funcional

### Infraestructura & Monorepo

| Item | Estado | Notas |
|------|--------|-------|
| Monorepo Nx 23 + Angular 22 | ✅ | Apps: `admin`, `store`. Libs: `models`, `data-access`, `shared-ui` |
| TailwindCSS con design tokens | ✅ | Colores: `primary` cian, `accent` amarillo, `dark`, `contrast` magenta |
| TypeScript estricto + path aliases | ✅ | `@ticketflow/models`, `@ticketflow/data-access`, `@ticketflow/shared-ui` |
| Dependencias actualizadas | ✅ | Paquete `qrcode` y `@types/qrcode` añadidos para generación QR real |
| Build general verificado | ✅ | `nx run-many -t build` exitoso para los 5 proyectos del monorepo |

### Supabase & Migraciones SQL

| Migración / Recurso | Estado | Descripción |
|---------------------|:------:|-------------|
| `20250101000000_initial_schema.sql` | ✅ Aplicada | Schema base, 14 tablas, enum `role_type`, RLS y funciones |
| `20250102000000_create_order_atomic.sql` | ✅ Aplicada | Creación atómica de órdenes y reservas |
| `20250103000000_ticket_validations.sql` | ✅ Aplicada | `ticket_validations` table y `validate_ticket_qr` base |
| `20250104000000_oauth_google_trigger.sql` | ✅ Aplicada | Trigger de usuarios con sincronización de `avatar_url` |
| `20250105000000_fix_user_roles_rls.sql` | ✅ Aplicada | RLS para auto-asignación de roles |
| `20250106000000_storage_rls_policies.sql` | ✅ Lista | Creación de buckets y políticas de almacenamiento |
| `20250107000000_validate_doors_open.sql` | ✅ Lista | Validación de horario de apertura de puertas (`doors_open`) |
| `20250108000000_search_events_function.sql` | ✅ Lista | Búsqueda full-text de eventos por nombre y artista |
| `20250109000000_doorman_role.sql` | ✅ Lista | Enum `'doorman'`, tablas `event_staff` + `staff_invitations`, RLS |
| `20250110000000_validate_with_doorman_auth.sql` | ✅ Lista | `validate_ticket_qr` con control de autorización para Doormen |
| `20250111000000_coupon_ticket_sku.sql` | ✅ Aplicada | Cupones asociados por SKU (`ticket_sku`) y descuento proporcional atómico |
| `20250112000000_artist_gallery.sql` | ✅ Aplicada | Columna `gallery_urls TEXT[]` en `artists` para multi-fotos |
| `20250113000000_super_admin.sql` | ✅ Aplicada | RPCs de Super-Admin: usuarios, roles, métricas globales y moderación de recintos |
| `20250114000000_refund_requests.sql` | ✅ Aplicada | Sistema de solicitudes de reembolso, RLS y RPCs de aprobación/rechazo atómico |
| `20250115000000_waitlist.sql` | 🟡 Lista para ejecutar | Sistema de lista de espera (FIFO), RLS, suscripciones y RPCs de notificación por lote |

### Despliegue & Producción

| Aplicación / Servicio | Estado | Plataforma / URL |
|-----------------------|:------:|------------------|
| **Admin App** | ✅ Desplegado | Vercel (`ticketflow-admin.vercel.app`) |
| **Store App** | ✅ Desplegado | Vercel |
| **Google OAuth Redirects** | ✅ Configurado | Supabase Dashboard & Google Cloud Console |
| **pg_cron Locks** | ✅ Programado | Supabase (`release-expired-locks` cada minuto) |

### Edge Functions (Supabase Deno)

| Función | Estado | Descripción |
|---------|--------|-------------|
| `create-paypal-order` | ✅ Desplegada | Crea orden PayPal sandbox/live, verifica locks activos |
| `create-order` | ✅ Desplegada | Captura pago PayPal y llama `create_order_atomic` |
| `apply-coupon` | ✅ Actualizada | Valida y aplica cupones globales, por evento o por `ticket_sku` |
| `send-ticket-email` | ✅ Creada | Envío de confirmación de compra y resumen de acceso por correo |
| `send-staff-invite` | 🟡 Pendiente | Envío de invitación a Doormen (considerando Webhook en N8N) |

### Mejoras Implementadas

| # | Área | Mejora | Componentes Involucrados |
|---|------|--------|--------------------------|
| **M1** | Admin | Validación de aforo del Venue | `ticket-type-form.component.ts`, `ticket-type-list.component.ts` |
| **M2** | Admin | Validación de `doors_open` en escáner | `access-control.service.ts`, `access-control.component.ts` |
| **M3** | Store | Generador QR real de alta densidad (H) | `qr.utils.ts`, `ticket-detail.component.ts`, `my-tickets.component.ts` |
| **M4** | Ambas | Foto de Gmail en Topbar & Navbar | `auth.service.ts`, `topbar.component.ts`, `navbar.component.ts` |
| **M5** | Store | Fix retorno a compra post-login | `event-detail.component.ts` |
| **M6** | Store | Buscador por nombre de artista | `search.service.ts`, migración 008 |
| **M7** | Admin | Rol y flujo Doorman completo | `doorman.guard.ts`, `event-staff.*`, `accept-invite.*`, `sidebar.*` |
| **M8** | Admin + Store + DB | Cupones por SKU + Fix visibilidad eventos | `coupon-form.*`, `coupon-list.*`, `apply-coupon`, `search.service.ts` |
| **M9** | Admin + Store + DB | Perfil de artista con biografía y galería multi-fotos | `artist-form.*`, `artist-detail.*`, `event-detail.*`, `search-results.*`, migración 012 |
| **M10** | Store | SEO dinámico, 404, Sitemap XML, Gracias, Privacidad y Alt texts | `seo.service.ts`, `not-found.*`, `thank-you.*`, `privacy-policy.*`, `sitemap.xml` |
| **M11** | Admin + DB | Módulo de Super-Admin (Métricas globales, moderación de recintos, roles de usuario) | `super-admin.*`, `super-admin.guard.ts`, `venue-moderation.*`, `user-management.*`, migración 013 |
| **M12** | Admin + Store + DB | Gestión de Reembolsos (Solicitud post-venta, aprobación/rechazo atómico, devolución de stock y anulación de QR) | `refunds.*`, `my-tickets.*`, `ticket-detail.*`, migración 014 |
| **M13** | Admin + Store + DB | Waitlist / Lista de Espera (Suscripción a eventos agotados, cola FIFO, panel de organizador y notificaciones) | `waitlist.service.*`, `ticket-selector.*`, `my-tickets.*`, `event-waitlist.*`, migración 015 |
| **UI** | Store | Fix contenedor contador de boletos | `ticket-selector.component.ts` |

---

## 🏗️ Especificación de Próximos Módulos (En Backlog)

### 1. Módulo de Super-Admin Central
- **Moderación de Recintos:** Vista para revisar recintos registrados y activar el check de verificación `venues.verified`.
- **Gestión Global de Usuarios:** Listado central de usuarios con asignación y revocación manual de roles (`admin`, `artist`, `doorman`, `customer`) en `user_roles`.
- **Métricas Globales:** Tablero con GMV total, comisiones netas de plataforma, eventos publicados y total de entradas vendidas.

### 2. Gestión de Solicitudes de Reembolso
- **Flujo Comprador (Store):** Botón *"Solicitar Reembolso"* en *Mis Boletos* con captura de motivo.
- **Panel de Aprobación (Admin):** Revisión de solicitudes pendientes por organizador / super-admin.
- **Transición Atómica:** Al aprobarse, cambio de estado de orden a `refunded`, anulación de QR en `ticket_validations` y reintegración del stock de boletos.

### 3. Waitlist / Lista de Espera
- **Suscripción de Usuarios:** Formulario en página de evento cuando todas las localidades estén agotadas.
- **Tabla `waitlist`:** Registro de interesados (`event_id`, `ticket_type_id`, `user_id`/`email`, `created_at`).
- **Disparador Automático:** Notificación por correo/N8N en orden de registro cuando se liberen locks expirados o se procesen reembolsos.

### 4. Facturación y Control de Pagos a Artistas (Payouts)
- **Cálculo de Liquidación Neta:** Desglose automático por evento (`Total Bruto - Comisiones TicketFlow - Retenciones = Saldo a Liquidar`).
- **Portal Financiero de Artistas:** Balance acumulado, saldo disponible y desglose por evento.
- **Control de Dispersión (Admin):** Registro y seguimiento de transferencias con comprobante de pago o integración PayPal Payouts.

---

## 📁 Documentos Clave de Gestión

| Documento | Propósito |
|-----------|-----------|
| [`docs/07-MEJORAS-POST-MVP.md`](./07-MEJORAS-POST-MVP.md) | Especificación técnica detallada de mejoras |
| [`docs/08-BACKLOG.md`](./08-BACKLOG.md) | Backlog maestro con prioridades P0–P4 y métricas |
| [`docs/06-CHECKPOINT.md`](./06-CHECKPOINT.md) | Resumen ejecutivo del estado del proyecto y especificación de nuevos módulos |
