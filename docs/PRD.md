# Product Requirements Document — TicketFlow

> **Versión:** 1.0  
> **Fecha:** Septiembre 2026  
> **Estado:** Post-MVP — En producción con mejoras activas

---

## 1. Visión del Producto

**TicketFlow** es una plataforma de venta de boletos en línea diseñada para conectar artistas independientes con sus audiencias en Latinoamérica. El producto elimina la fricción entre el artista que quiere vender boletos para sus eventos y el comprador que quiere asistir, ofreciendo una experiencia fluida, moderna y de bajo costo de adopción.

> _"La plataforma más sencilla para que un artista independiente venda boletos para su evento sin depender de intermediarios costosos."_

---

## 2. El Problema

Los artistas independientes en LATAM enfrentan barreras altas para vender boletos digitalmente:

- Las plataformas existentes cobran comisiones excesivas (30–40%).
- La configuración es compleja y requiere soporte técnico.
- Los compradores deben crear cuentas en múltiples plataformas.
- No hay herramientas de control de acceso integradas.
- Los pagos a artistas son lentos e impredecibles.

---

## 3. Para Quién Es

### Usuarios Primarios

| Segmento | Descripción | Necesidad Principal |
|----------|-------------|--------------------|
| **Artista / Organizador** | Músicos, comediantes, teatreros, conferencistas independientes | Crear y vender boletos para sus eventos con control total y baja comisión |
| **Comprador / Asistente** | Fans y público general | Descubrir eventos, comprar boletos de forma rápida y segura |
| **Portero (Doorman)** | Personal de control de acceso en el evento | Escanear QR y validar entradas en puerta |
| **Super Admin** | Administrador de la plataforma TicketFlow | Supervisar operaciones, moderar recintos, gestionar usuarios y dispersiones |

### Perfil del Artista (Usuario Principal)
- Artista o promotor independiente
- Realiza eventos de 50–5,000 asistentes
- Usa WhatsApp, Instagram y redes sociales para promover
- No tiene acceso a terminales bancarias o TPV
- Quiere recibir su dinero neto después del evento

### Perfil del Comprador
- Entre 18–45 años
- Compra con tarjeta de crédito/débito o PayPal
- Espera recibir su boleto por correo electrónico
- Usa el QR del boleto en la entrada del evento

---

## 4. Qué Hace el Producto

### 4.1 Aplicación Admin (Panel del Artista)

Portal de gestión exclusivo para artistas y administradores. URL: `ticketflow-admin.vercel.app`

| Módulo | Funcionalidad |
|--------|---------------|
| **Autenticación** | Registro e inicio de sesión con email/contraseña o Google OAuth |
| **Perfil de Artista** | Nombre artístico, foto, biografía, galería multi-fotos, tipo de artista, datos fiscales y de contacto, Meta Pixel ID |
| **Recintos (Venues)** | Crear recintos con coordenadas georreferenciadas (Google Maps), imagen del mapa, múltiples configuraciones de aforo |
| **Eventos** | Crear eventos con flyer, fecha, hora, recinto y configuración. Flujo de publicación: Borrador → Publicado |
| **Tipos de Boleto** | Definir localidades con SKU, nombre, precio y stock. Visualización de comisión y monto neto al artista |
| **Cupones** | Crear códigos de descuento (cortesía, porcentaje, monto fijo), limitados por SKU, fecha o usos máximos |
| **Control de Acceso** | Escanear QR con cámara del dispositivo para validar boletos en puerta, con validación de horario de apertura |
| **Dashboard** | Métricas en tiempo real: eventos, boletos vendidos, disponibles, ingresos netos. Gráfica SVG de ventas |
| **Gestión de Staff** | Invitar porteros (doormen) por email a eventos específicos |
| **Reembolsos** | Aprobar o rechazar solicitudes de reembolso con devolución atómica de stock |
| **Lista de Espera** | Ver y notificar cola FIFO de suscriptores a eventos agotados |
| **Finanzas (Payouts)** | Balance neto, historial de liquidaciones, datos bancarios y fiscales para dispersiones |
| **Super Admin** | Moderación de recintos, gestión de roles de usuario, métricas globales de la plataforma |

### 4.2 Aplicación Store (Tienda Pública)

Tienda pública para compradores. URL: Desplegada en Vercel.

| Módulo | Funcionalidad |
|--------|---------------|
| **Inicio** | Hero con búsqueda, eventos destacados, filtros por categoría |
| **Búsqueda** | Búsqueda full-text por nombre de evento, artista y descripción. Filtros por tipo, fecha. Resultados paginados con URL compartible |
| **Detalle de Evento** | Flyer, descripción, info del artista + galería, mapa del recinto, selección de boletos con stock en tiempo real, compartir en redes sociales |
| **Checkout** | Selector de cantidad → reserva de 15 min → cupón → resumen → pago PayPal → confirmación animada |
| **Guest Checkout** | Compra sin necesidad de crear cuenta (nombre + email de invitado) |
| **Mis Boletos** | Historial de compras del usuario con QR escaneable de alta densidad por orden |
| **Ticket Público** | URL pública con token para acceder al boleto sin autenticación (para invitados) |
| **Solicitud de Reembolso** | El comprador puede solicitar reembolso con motivo desde el detalle del boleto |
| **Lista de Espera** | Suscribirse a eventos agotados para recibir notificación cuando haya disponibilidad |

---

## 5. Qué No Hace (Fuera de Alcance — MVP)

- ❌ Selección de asiento individual en mapa interactivo
- ❌ Eventos recurrentes o series automáticas
- ❌ Múltiples artistas por evento (co-headlining)
- ❌ Transferencia de boletos entre usuarios
- ❌ Soporte multi-moneda (solo USD/MXN via PayPal)
- ❌ Notificaciones push móviles
- ❌ App nativa iOS / Android
- ❌ Modo offline para escáner de acceso
- ❌ Login con Apple ID o Facebook

---

## 6. Modelo de Negocio

### Comisión de Plataforma

- **Tasa predeterminada:** 20% sobre el valor neto de cada boleto vendido
- **Configurable:** Almacenada en `platform_settings` para modificación centralizada
- **Snapshotted:** La tasa en el momento de la compra se guarda en `order_items.commission_rate`
- **Quién paga:** El comprador paga exactamente el precio del artista; la comisión se retiene del saldo neto del artista

### Fórmula
```
subtotal       = Σ(precio_boleto × cantidad)
descuento      = cupón aplicado (si existe)
comisión       = (subtotal - descuento) × tasa_comisión
total_cobrado  = subtotal - descuento + comisión
pago_artista   = subtotal - descuento - comisión
```

### Flujo de Pago
1. Comprador paga vía PayPal
2. Plataforma retiene comisión del 20%
3. Artista recibe liquidación neta a través del módulo de Finanzas
4. Super Admin aprueba dispersiones manualmente (futuro: PayPal Payouts API)

---

## 7. Flujos Críticos del Producto

### Flujo de Compra con Reserva de Inventario

```
1. Comprador selecciona boletos en Detalle del Evento
2. "Agregar al carrito" → reserve_tickets() para cada tipo
   ├── Si hay stock → crea ticket_lock (15 min) + incrementa reserved
   └── Si no → error "No hay suficientes boletos"
3. Countdown de 15 min visible en checkout
4. Comprador aplica cupón (opcional) → apply-coupon Edge Function
5. Comprador paga con PayPal → create-paypal-order → onApprove
6. create-order Edge Function:
   ├── Captura pago en PayPal
   ├── Crea order + order_items en BD atómicamente
   ├── Incrementa sold, decrementa reserved, elimina lock
   └── Dispara webhook N8N para envío de email con boletos
7. Comprador ve confirmación animada + acceso a "Mis Boletos"
```

### Flujo de Publicación de Evento
```
1. Artista crea evento en borrador
2. Configura tipos de boleto con precios y stock
3. Crea cupones (opcional)
4. Publica el evento → visible en la tienda pública
5. Monitorea ventas desde Dashboard
```

### Flujo de Control de Acceso
```
1. Doorman (o artista) abre la app Admin → Control de Acceso
2. Selecciona evento (o es asignado automáticamente si es doorman)
3. Activa la cámara para escanear QR
4. validate_ticket_qr() verifica:
   ├── Apertura de puertas (doors_open)
   ├── Existencia y estado de la orden
   ├── Duplicado (ya_used)
   └── Autorización del doorman al evento
5. Resultado: ✅ Acceso Concedido / ⚠️ Ya usado / ❌ Inválido
```

---

## 8. Métricas de Éxito

| Métrica | Objetivo Inicial |
|---------|------------------|
| Conversión checkout | > 60% (reserva → pago completado) |
| Tiempo promedio de compra | < 3 minutos |
| Tasa de abandono de carrito | < 40% |
| Disponibilidad de la plataforma | > 99.5% uptime |
| Tiempo de validación QR en puerta | < 2 segundos |
| NPS de artistas | > 7/10 |

---

## 9. Restricciones y Supuestos

- El pago se realiza únicamente vía **PayPal** (Sandbox para pruebas, Live para producción)
- El envío de emails se realiza vía **N8N + Resend API** (requiere configuración de dominio propio)
- La plataforma opera inicialmente en **español (México)**
- Los precios se manejan en **USD** a través de PayPal
- El inventario usa un modelo de **reserva optimista** de 15 minutos
- Supabase es el único backend; no hay servidor propio

---

## 10. Documentos Relacionados

| Documento | Descripción |
|-----------|-------------|
| [`Architecture.md`](./Architecture.md) | Estructura técnica, sistemas y conexiones |
| [`Design-System.md`](./Design-System.md) | Paleta de colores, tipografía, componentes UI |
| [`Agents.md`](./Agents.md) | Contexto del proyecto para agentes de IA |
| [`06-CHECKPOINT.md`](./06-CHECKPOINT.md) | Estado actual del proyecto y funcionalidades completadas |
| [`08-BACKLOG.md`](./08-BACKLOG.md) | Tareas pendientes organizadas por prioridad |
