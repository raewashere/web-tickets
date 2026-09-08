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

### Edge Functions (Supabase Deno)

| Función | Estado | Descripción |
|---------|--------|-------------|
| `create-paypal-order` | ✅ Desplegada | Crea orden PayPal sandbox/live, verifica locks activos |
| `create-order` | ✅ Desplegada | Captura pago PayPal y llama `create_order_atomic` |
| `apply-coupon` | ✅ Actualizada | Valida y aplica cupones globales, por evento o por `ticket_sku` |
| `send-ticket-email` | ✅ Creada | Envío de confirmación de compra y resumen de acceso por correo |
| `send-staff-invite` | ✅ Actualizada | Envío de invitación a Doormen vía Resend / fallback y enlace directo |

### Mejoras Post-MVP Implementadas

| # | Área | Mejora | Componentes Involucrados |
|---|------|--------|--------------------------|
| **M1** | Admin | Validación de aforo del Venue | `ticket-type-form.component.ts`, `ticket-type-list.component.ts` |
| **M2** | Admin | Validación de `doors_open` en escáner | `access-control.service.ts`, `access-control.component.ts` |
| **M3** | Store | Generador QR real de alta densidad (H) | `qr.utils.ts`, `ticket-detail.component.ts`, `my-tickets.component.ts` |
| **M4** | Ambas | Foto de Gmail en Topbar & Navbar | `auth.service.ts`, `topbar.component.ts`, `navbar.component.ts` |
| **M5** | Store | Fix retorno a compra post-login | `event-detail.component.ts` |
| **M6** | Store | Buscador por nombre de artista | `search.service.ts`, migración 008 |
| **M7** | Admin | Rol y flujo Doorman completo | `doorman.guard.ts`, `event-staff.*`, `accept-invite.*`, `sidebar.*` |
| **M8** | Admin + Store + DB | Cupones por SKU + Fix visibilidad eventos + Resend config | `coupon-form.*`, `coupon-list.*`, `apply-coupon`, `search.service.ts`, `send-staff-invite` |

---

## 🟡 Pendiente de Ejecución / QA

1. **Ejecutar migraciones en Supabase SQL Editor:**
   - `20250107000000_validate_doors_open.sql`
   - `20250108000000_search_events_function.sql`
   - `20250109000000_doorman_role.sql`
   - `20250110000000_validate_with_doorman_auth.sql`
2. **Programar pg_cron en Supabase:**
   ```sql
   SELECT cron.schedule('release-expired-locks', '* * * * *', 'SELECT release_expired_locks()');
   ```
3. **Despliegue de Store App en Vercel:**
   - Configurar variables de entorno y comando de build `npm run build:store`.

---

## 📁 Documentos Clave de Gestión

| Documento | Propósito |
|-----------|-----------|
| [`docs/07-MEJORAS-POST-MVP.md`](./07-MEJORAS-POST-MVP.md) | Especificación técnica detallada de mejoras |
| [`docs/08-BACKLOG.md`](./08-BACKLOG.md) | Backlog maestro con prioridades P0–P4 y estado de tareas |
| [`docs/06-CHECKPOINT.md`](./06-CHECKPOINT.md) | Resumen ejecutivo del estado del proyecto |
