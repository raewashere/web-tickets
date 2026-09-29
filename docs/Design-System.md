# Design System — BoletoCoqueto

> **Versión:** 3.0  
> **Fecha:** Septiembre 2026  
> **Stack:** Angular 22 + TailwindCSS + CSS Custom Properties

Este documento define el sistema de diseño visual de **BoletoCoqueto**. Es la fuente de verdad para colores, tipografía, iconografía y componentes reutilizables usados en la **Admin App** y la **Store App**.

---

## 1. Paleta de Colores (Tokens Dinámicos en `:root`)

Todos los colores están definidos como variables CSS en `:root` dentro de `styles.css` y consumidos por TailwindCSS como `rgb(var(--color-*) / <alpha-value>)` para soportar modificadores de opacidad en tiempo real.

### Tokens Primarios Activos

| Token | Hex | RGB Variable | Uso principal |
|-------|-----|--------------|---------------|
| `primary` | `#750D37` | `117 13 55` | Color de marca — Burdeos intenso, botones principales, enlaces activos |
| `accent` | `#B3DEC1` | `179 222 193` | Menta suave / Celadón — precios, badges destacados, llamadas a la acción |
| `surface` | `#F7F9F7` | `247 249 247` | Blanco nieve / Perla claro — color de letras sobre oscuro, fondos de tarjeta y superficie |
| `dark` | `#210124` | `33 1 36` | Berenjena noche profundo — Navbar, Footer, Hero, Sidebar |
| `contrast` | `#FFD400` | `255 212 0` | Oro vibrante — acciones positivas, badges de éxito y seguridad |
| `danger` | `#c0392b` | `192 57 43` | Rojo carmesí — acciones destructivas, errores y cancelaciones |

### Configuración en `tailwind.config.js`

```js
theme: {
  extend: {
    colors: {
      primary:  'rgb(var(--color-primary) / <alpha-value>)',
      surface:  'rgb(var(--color-surface) / <alpha-value>)',
      accent:   'rgb(var(--color-accent) / <alpha-value>)',
      dark:     'rgb(var(--color-dark) / <alpha-value>)',
      contrast: 'rgb(var(--color-contrast) / <alpha-value>)',
      danger:   'rgb(var(--color-danger) / <alpha-value>)',
    },
    fontFamily: {
      sans: ['Quicksand', 'sans-serif'],
    },
  },
},
```

### Guía de Uso de Colores

| Contexto | Fondo | Texto | Acento |
|----------|-------|-------|--------|
| Sidebar / Hero oscuro | `dark` (`#14281d`) | `surface` (`#f2eee8`) | `accent` (`#e38792`) |
| Tarjetas / contenido claro | `white` / `surface` | `dark` (`#14281d`) | `primary` (`#4e0a0b`) |
| Botón de búsqueda / acción principal | `primary` (`#4e0a0b`) | `surface` (`#f2eee8`) | — |
| Botón CTA / destacado | `accent` (`#e38792`) | `dark` (`#14281d`) | — |
| Precios y cifras clave | — | `primary` (`#4e0a0b`) | — |
| Icono de categoría / artista | — | `accent` (`#e38792`) | — |
| Acciones de seguridad / éxito | — | `contrast` (`#355834`) | — |

### Reglas de Diseño

1. **Los precios y métricas clave** usan `font-mono` + color `primary` para lectura rápida.
2. **Botones de compra (Comprar Boletos)** usan `primary` (`#4e0a0b`) sobre texto `surface`.
3. **Links y estados activos** usan `primary` (`#4e0a0b`).
4. **CTAs secundarios** (Crear Cuenta, Comenzar a Vender) usan `accent` (`#e38792`) sobre `dark`.
5. **Fondos oscuros** (navbar, hero, sidebar) usan `dark` con texto `surface`.

---

## 2. Tipografía

### Fuente Principal

| Propiedad | Valor |
|-----------|-------|
| **Familia** | `Quicksand` |
| **Fallback** | `sans-serif` |
| **Fuente** | Google Fonts |
| **Clase Tailwind** | `font-sans` (configurado como Quicksand) |

```css
/* En styles.css o index.html */
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap');
```

### Escala Tipográfica

| Rol | Clase Tailwind | Peso | Uso |
|-----|----------------|------|-----|
| Display / Hero | `text-5xl font-black` | 900 | Títulos de sección hero |
| Título de página | `text-3xl font-bold` | 700 | Encabezados `h1` de vistas |
| Título de tarjeta | `text-xl font-semibold` | 600 | Nombres de eventos, artistas |
| Subtítulo / Label | `text-sm font-medium` | 500 | Labels de formularios, pills |
| Cuerpo de texto | `text-base font-normal` | 400 | Descripciones, párrafos |
| Auxiliar / Meta | `text-xs font-normal` | 400 | Fechas, hints, placeholders |
| Código / SKU | `font-mono text-sm` | — | SKUs, IDs de orden, códigos |

### Reglas Tipográficas

- Los precios y cifras monetarias siempre usan `font-mono` + color `accent`.
- Los IDs de boleto/orden usan `font-mono` para facilitar lectura.
- Títulos de secciones hero pueden usar `tracking-tight` para mayor impacto visual.

---

## 3. Iconografía

### Biblioteca Principal

TicketFlow usa **Heroicons** (MIT License) como sistema de iconos principal — son los iconos que incluye TailwindCSS por defecto.

| Estilo | Cuándo usar |
|--------|-------------|
| `outline` (trazo) | Navegación, acciones secundarias, items de lista |
| `solid` (relleno) | Estados activos, botones primarios, alerts |
| `mini` (16px) | Iconos en línea con texto, badges, pills |

### Iconos Clave del Sistema

| Ícono | Heroicon | Uso |
|-------|----------|-----|
| Dashboard | `chart-bar` | Menú Admin → Dashboard |
| Artista | `user-circle` | Menú Admin → Perfil |
| Eventos | `calendar` | Menú Admin → Eventos |
| Recintos | `map-pin` | Menú Admin → Recintos |
| Boletos | `ticket` | Tipos de boleto, mis boletos |
| Cupones | `tag` | Cupones y descuentos |
| Control de acceso | `qr-code` | Escáner QR |
| Búsqueda | `magnifying-glass` | Buscador de eventos |
| Carrito | `shopping-cart` | Checkout |
| Check / éxito | `check-circle` | Validación exitosa, orden confirmada |
| Alerta / error | `exclamation-triangle` | Errores, alertas |
| Eliminar | `trash` | Acciones de borrado |
| Editar | `pencil` | Acciones de edición |
| Cerrar | `x-mark` | Modales, alerts descartables |
| Compartir | `share` | Compartir evento en redes |
| Dinero | `banknotes` | Finanzas, payouts |
| Lista de espera | `clock` | Waitlist |
| Reembolso | `arrow-uturn-left` | Solicitudes de reembolso |

### Tamaños Estándar

```html
<!-- Pequeño (inline) -->
<svg class="w-4 h-4">...</svg>

<!-- Estándar (botones, menú) -->
<svg class="w-5 h-5">...</svg>

<!-- Grande (estados vacíos, hero) -->
<svg class="w-8 h-8">...</svg>

<!-- Extra grande (ilustraciones de estado) -->
<svg class="w-16 h-16">...</svg>
```

---

## 4. Espaciado y Layout

### Sistema de Espaciado

Usa el sistema de espaciado de Tailwind (múltiplos de 4px):

| Token | px | Uso típico |
|-------|----|------------|
| `space-1` | 4px | Gaps mínimos entre elementos inline |
| `space-2` | 8px | Padding de chips/pills, gaps entre iconos |
| `space-3` | 12px | Padding interno de botones pequeños |
| `space-4` | 16px | Padding estándar de tarjetas |
| `space-6` | 24px | Separación entre secciones |
| `space-8` | 32px | Margin entre bloques de contenido |
| `space-12` | 48px | Separación de secciones grandes |

### Grid del Sistema

- **Contenedor máximo:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Grid de tarjetas (home):** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
- **Grid de dashboard:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
- **Layout Admin:** Sidebar fijo 256px + área de contenido fluida

### Breakpoints

| Prefijo | px | Dispositivo |
|---------|----|-------------|
| (base) | 0px | Móvil portrait |
| `sm:` | 640px | Móvil landscape / tablet pequeña |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop pequeño |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Desktop grande |

---

## 5. Componentes UI del Sistema

### 5.1 Botones

```html
<!-- Botón primario (acción principal) -->
<button class="bg-primary text-dark font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
  Publicar Evento
</button>

<!-- Botón CTA / urgente -->
<button class="bg-contrast text-white font-semibold px-4 py-2 rounded-lg hover:bg-contrast/90 transition-colors">
  Comprar Boletos
</button>

<!-- Botón secundario (outline) -->
<button class="border border-primary text-primary font-semibold px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors">
  Ver Detalles
</button>

<!-- Botón peligroso -->
<button class="bg-contrast/10 text-contrast font-semibold px-4 py-2 rounded-lg hover:bg-contrast/20 transition-colors">
  Eliminar
</button>
```

### 5.2 Badges de Estado

```html
<!-- Draft -->
<span class="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Borrador</span>

<!-- Publicado -->
<span class="bg-accent text-dark text-xs font-medium px-2.5 py-0.5 rounded-full">Publicado</span>

<!-- Cancelado -->
<span class="bg-contrast/10 text-contrast text-xs font-medium px-2.5 py-0.5 rounded-full">Cancelado</span>

<!-- Completado -->
<span class="bg-primary/20 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full">Completado</span>

<!-- Agotado -->
<span class="bg-contrast text-white text-xs font-bold px-2.5 py-0.5 rounded-full">AGOTADO</span>
```

### 5.3 Tarjetas

```html
<!-- Tarjeta de contenido estándar -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  <!-- contenido -->
</div>

<!-- Tarjeta de estadística (dashboard) -->
<div class="bg-dark rounded-xl p-6">
  <p class="text-surface/60 text-sm">Boletos vendidos</p>
  <p class="text-accent font-black text-4xl mt-1">1,240</p>
</div>

<!-- Tarjeta de evento (store) -->
<div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
  <img class="w-full h-48 object-cover" />
  <div class="p-4">
    <h3 class="font-bold text-dark text-lg">Nombre del Evento</h3>
    <p class="text-gray-500 text-sm mt-1">Artista · Recinto</p>
    <p class="text-accent font-black text-xl mt-2">$350</p>
  </div>
</div>
```

### 5.4 Formularios

```html
<!-- Input estándar -->
<input
  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
/>

<!-- Input con error -->
<input
  class="w-full border border-contrast rounded-lg px-3 py-2 text-dark focus:outline-none focus:ring-2 focus:ring-contrast/30"
/>
<p class="text-xs text-contrast mt-1">Este campo es requerido.</p>

<!-- Label -->
<label class="block text-sm font-medium text-dark mb-1.5">Nombre del evento</label>
```

### 5.5 Sidebar Admin

```
Estructura visual:
┌─────────────────────┐
│  [Logo TF]          │  → dark (#150811) background
│  ─────────────────  │
│  ▪ Dashboard        │  → text-surface/60, hover: white
│  ▶ Artista          │  → active: border-l-4 border-primary, text-primary
│  ▪ Eventos          │
│  ▪ Recintos         │
│  ─────────────────  │
│  [Avatar] [Logout]  │
└─────────────────────┘
```

- **Fondo:** `bg-dark` (`#150811`)
- **Texto:** `text-surface` (`#fff3f0`)
- **Item activo:** `border-l-4 border-primary text-primary font-semibold`
- **Hover:** `hover:bg-white/10`
- **Ancho:** `w-64` (256px) fijo en desktop, colapsable en móvil

### 5.6 Navbar (Store)

- **Fondo:** `bg-dark` o `bg-white` (según sección)
- **Logo:** `text-primary font-black text-xl`
- **Links:** `text-surface/80 hover:text-white`
- **Botón de usuario:** Avatar circular con ring `primary`
- **Responsive:** Hamburger menu en móvil

### 5.7 Toast Notifications

| Tipo | Color | Ícono |
|------|-------|-------|
| Éxito | `bg-green-50 border-green-500 text-green-900` | `check-circle` |
| Error | `bg-red-50 border-red-500 text-red-900` | `exclamation-triangle` |
| Info | `bg-blue-50 border-blue-500 text-blue-900` | `information-circle` |
| Advertencia | `bg-amber-50 border-amber-500 text-amber-900` | `exclamation-circle` |

### 5.8 Estados Vacíos (`tf-empty-state`)

Componente ilustrado para listas vacías:

```html
<div class="flex flex-col items-center justify-center py-16 text-center">
  <svg class="w-16 h-16 text-gray-300 mb-4"><!-- ícono ilustrativo --></svg>
  <h3 class="text-lg font-semibold text-dark">No hay eventos aún</h3>
  <p class="text-gray-500 text-sm mt-1">Crea tu primer evento para empezar a vender.</p>
  <button class="mt-4 ...">Crear evento</button>
</div>
```

### 5.9 Skeleton Screens (`tf-skeleton`)

Animación de carga para contenido asíncrono:

```html
<!-- Skeleton de tarjeta -->
<div class="animate-pulse">
  <div class="bg-gray-200 rounded-xl h-48 w-full mb-3"></div>
  <div class="bg-gray-200 rounded h-5 w-3/4 mb-2"></div>
  <div class="bg-gray-200 rounded h-4 w-1/2"></div>
</div>
```

---

## 6. Modo Oscuro (Dark Mode)

TicketFlow soporta modo oscuro con toggle manual vía `ThemeService`.

- **Clase activadora:** `.dark` en el elemento `<html>`
- **Implementación:** `ThemeService` con Angular `effect()` que persiste preferencia en `localStorage`
- **Reglas CSS:** Definidas globalmente en `styles.css` bajo el selector `.dark`

```css
/* Ejemplo de regla dark mode */
.dark .bg-white { background-color: #1e1e2e; }
.dark .text-dark { color: #e5e7eb; }
.dark .border-gray-100 { border-color: #374151; }
```

---

## 7. Animaciones y Transiciones

| Tipo | Clase Tailwind | Uso |
|------|----------------|-----|
| Hover rápido | `transition-colors duration-150` | Botones, links |
| Hover con sombra | `transition-shadow duration-200` | Tarjetas |
| Transición de página | View Transitions API (Angular) | Navegación entre rutas |
| Confetti | Canvas API (customizado) | Página de confirmación de compra |
| Skeleton | `animate-pulse` | Estados de carga |

---

## 8. Design Tokens por Feature

| Feature | `primary` #0bdef5 | `accent` #f7e733 | `contrast` #e11392 | `dark` #150811 |
|---------|--------------------|------------------|--------------------|----------------|
| Sidebar Admin | Item activo, links | — | Notificaciones | Fondo |
| Dashboard | KPI activos | Números, cifras | Alertas, cancel | Fondo cards oscuras |
| Evento (admin) | Estado "completado" | Badge "publicado" | Estado "cancelado" | Texto body |
| Home (store) | Navbar, links | Precios, featured | Botón "Ver todos" | Hero background |
| Búsqueda | Filtro activo | Precio en tarjetas | — | Fondo página |
| Detalle evento | Encabezados | Precio boleto | Botón "Comprar" | Texto |
| Checkout | Estados de éxito | Totales, order ID | Timer urgencia, errores | Paneles resumen |
| Mis boletos | Badge confirmado | Badge ID orden | — | Fondo página |
| Control acceso | Resultado válido | — | Resultado inválido | Fondo escáner |

---

## 9. Accesibilidad

- Todos los `<img>` tienen atributo `alt` descriptivo.
- Contraste mínimo de 4.5:1 entre texto y fondo (verificar en herramientas de contraste para combinaciones de `dark`/`accent`).
- Los botones de acción tienen `aria-label` cuando solo contienen iconos.
- El countdown timer emite el evento `expired` para programmatic feedback.
- Los modales y drawers siguen el patrón de focus trap.
