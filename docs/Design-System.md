# Design System — BoletoCoqueto

> **Versión:** 4.0 (Material Design 3)
> **Fecha:** Septiembre 2026  
> **Stack:** Angular 22 + TailwindCSS + CSS Custom Properties (M3)

Este documento define el sistema de diseño visual de **BoletoCoqueto**. Es la fuente de verdad para colores, tipografía, iconografía y componentes reutilizables usados en la **Admin App** y la **Store App**.

---

## 1. Sistema de Colores — Material Design 3

El sistema de colores sigue la especificación **Material Design 3 (M3)**, con tres familias de color (Primary, Secondary, Tertiary) y sus roles semánticos completos. Todas las variables están definidas como CSS custom properties en `:root` (esquema claro) y `html.dark` (esquema oscuro) en cada `styles.css`.

### Paleta Seed

| Rol Semántico | Color Base | Hex |
|---------------|-----------|-----|
| Primary seed  | Violeta profundo | `#540D6E` |
| Secondary seed | Rosa coral vibrante | `#EE4266` |
| Tertiary seed | Amarillo dorado vibrante | `#FFD23F` |

### Tokens M3 — Esquema Claro (`:root`)

| CSS Variable | RGB | Hex | Tailwind Class | Uso |
|---|---|---|---|---|
| `--md-primary` | `84 13 110` | `#540D6E` | `primary` | Botones primarios, enlaces activos, elementos de marca |
| `--md-on-primary` | `255 255 255` | `#FFFFFF` | `on-primary` | Texto/iconos sobre fondo `primary` |
| `--md-primary-container` | `240 210 255` | `#F0D2FF` | `primary-container` | Fondos de chips/badges con tono primario |
| `--md-on-primary-container` | `45 0 65` | `#2D0041` | `on-primary-container` | Texto sobre `primary-container` |
| `--md-secondary` | `238 66 102` | `#EE4266` | `secondary` | Rosa coral, acciones secundarias, acentos vivos |
| `--md-on-secondary` | `255 255 255` | `#FFFFFF` | `on-secondary` | Texto sobre `secondary` |
| `--md-secondary-container` | `255 220 228` | `#FFDCE4` | `secondary-container` | Fondos de elementos secundarios suaves |
| `--md-on-secondary-container` | `74 0 25` | `#4A0019` | `on-secondary-container` | Texto sobre `secondary-container` |
| `--md-tertiary` | `255 210 63` | `#FFD23F` | `tertiary` | Amarillo dorado, CTA destacados, badges de alerta/oro |
| `--md-on-tertiary` | `33 0 52` | `#210034` | `on-tertiary` | Texto de alto contraste sobre fondo `tertiary` |
| `--md-tertiary-container` | `255 238 179` | `#FFEEB3` | `tertiary-container` | Fondos de elementos positivos/dorados |
| `--md-on-tertiary-container` | `56 42 0` | `#382A00` | `on-tertiary-container` | Texto sobre `tertiary-container` |
| `--md-surface` | `254 250 255` | `#FEFAFF` | `surface` | Fondo de página, fondos de tarjeta |
| `--md-on-surface` | `31 22 36` | `#1F1624` | `on-surface` | Texto principal sobre superficie clara |
| `--md-surface-variant` | `238 228 244` | `#EEE4F4` | `surface-variant` | Fondo de inputs, áreas secundarias |
| `--md-on-surface-variant` | `77 65 84` | `#4D4154` | `on-surface-variant` | Texto secundario sobre superficie variante |
| `--md-surface-container` | `245 237 250` | `#F5EDFA` | `surface-container` | Fondos de tarjetas y contenedores |
| `--md-surface-container-high` | `239 230 245` | `#EFE6F5` | `surface-container-high` | Fondos elevados, drawer, modal |
| `--md-surface-container-low` | `250 244 253` | `#FAF4FD` | `surface-container-low` | Fondos suaves |
| `--md-inverse-surface` | `33 1 36` | `#210124` | `inverse-surface` | Navbar, Footer, Hero, Sidebar (fondos oscuros) |
| `--md-inverse-on-surface` | `254 250 255` | `#FEFAFF` | `inverse-on-surface` | Texto sobre `inverse-surface` |
| `--md-error` | `179 38 30` | `#B3261E` | `error` | Errores, acciones destructivas |
| `--md-on-error` | `255 255 255` | `#FFFFFF` | `on-error` | Texto sobre `error` |
| `--md-error-container` | `249 222 220` | `#F9DEDC` | `error-container` | Fondos de mensajes de error |
| `--md-on-error-container` | `65 14 11` | `#410E0B` | `on-error-container` | Texto sobre `error-container` |
| `--md-outline` | `126 113 133` | `#7E7185` | `outline` | Bordes, divisores |
| `--md-outline-variant` | `209 198 217` | `#D1C6D9` | `outline-variant` | Bordes sutiles |

### Tokens M3 — Esquema Oscuro (`html.dark`)

Los mismos nombres de CSS variable, pero con valores del esquema oscuro M3 (tono 80 para colores de primer plano, tono 20/30 para containers).

### Alias de Compatibilidad (Legacy)

Los siguientes aliases mantienen compatibilidad con código existente:

| Alias Tailwind | Apunta a | Razón |
|---|---|---|
| `accent` | `secondary` (`#EE4266`) | El "acento" anterior mapea al rosa coral secundario |
| `dark` | `inverse-surface` (`#210124`) | El fondo oscuro = inverse-surface |
| `contrast` | `tertiary` (`#FFD23F`) | El contraste brillante = amarillo dorado terciario |
| `danger` | `error` (`#B3261E`) | Renombrado al estándar M3 |

### Configuración en `tailwind.config.js`

```js
theme: {
  extend: {
    colors: {
      primary:              'rgb(var(--md-primary) / <alpha-value>)',
      'on-primary':         'rgb(var(--md-on-primary) / <alpha-value>)',
      'primary-container':  'rgb(var(--md-primary-container) / <alpha-value>)',
      'on-primary-container':'rgb(var(--md-on-primary-container) / <alpha-value>)',
      // ... (Secondary, Tertiary, Surface, Error, Outline)
    },
  },
},
```

### Guía de Uso de Colores (M3)

| Contexto | Fondo | Texto | Acento/Acción |
|----------|-------|-------|---------------|
| Navbar / Footer / Hero oscuro | `inverse-surface` | `inverse-on-surface` | `tertiary` |
| Tarjetas / contenido claro | `surface` / `surface-container` | `on-surface` | `primary` |
| Botón de acción principal | `primary` | `on-primary` | — |
| Botón CTA / destacado | `tertiary` | `on-tertiary` | — |
| Precios y cifras clave | — | `primary` | — |
| Badges positivos / éxito | `tertiary-container` | `on-tertiary-container` | — |
| Errores / acciones destructivas | `error-container` | `on-error-container` | `error` |
| Inputs y formularios | `surface-variant` | `on-surface-variant` | `outline` |

### Reglas de Diseño

1. **Los precios y métricas clave** usan `font-mono` + color `primary`.
2. **Botones de compra (Comprar Boletos)** usan `bg-primary text-on-primary`.
3. **Links y estados activos** usan `text-primary`.
4. **CTAs secundarios** (Crear Cuenta, Comenzar a Vender) usan `bg-tertiary text-on-tertiary`.
5. **Fondos oscuros** (navbar, hero, sidebar) usan `bg-inverse-surface` con texto `text-inverse-on-surface`.
6. **Para cambiar la paleta**: solo editar los valores RGB en `:root` y `html.dark` de los dos `styles.css`.

---

## 2. Tipografía

### Fuente Principal

| Propiedad | Valor |
|-----------|-------|
| **Familia** | `Quicksand` |
| **Fallback** | `sans-serif` |
| **Fuente** | Google Fonts |
| **Clase Tailwind** | `font-sans` (configurado como Quicksand) |
| **Pesos disponibles** | 300, 400, 500, 600, 700 |

> **Nota:** Quicksand soporta hasta `font-bold` (700). No usar `font-black` (900).

```css
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap');
```

### Escala Tipográfica

| Rol | Clase Tailwind | Peso | Uso |
|-----|----------------|------|-----|
| Display / Hero | `text-5xl font-bold` | 700 | Títulos de sección hero |
| Título de página | `text-3xl font-bold` | 700 | Encabezados `h1` de vistas |
| Título de tarjeta | `text-xl font-semibold` | 600 | Nombres de eventos, artistas |
| Subtítulo / Label | `text-sm font-medium` | 500 | Labels de formularios, pills |
| Cuerpo de texto | `text-base font-normal` | 400 | Descripciones, párrafos |
| Auxiliar / Meta | `text-xs font-normal` | 400 | Fechas, hints, placeholders |
| Código / SKU | `font-mono text-sm` | — | SKUs, IDs de orden, códigos |

---

## 3. Iconografía

### Biblioteca Principal

BoletoCoqueto usa **Font Awesome 6 Solid/Regular** como sistema de iconos principal.

| Estilo | Cuándo usar |
|--------|-------------|
| `fa-solid` | Navegación activa, botones primarios, estados |
| `fa-regular` | Iconos de acción secundaria |

### Iconos Clave

| Ícono | Clase FA | Uso |
|-------|----------|-----|
| Dashboard | `fa-chart-pie` | Menú Admin → Dashboard |
| Artista | `fa-microphone-lines` | Menú Admin → Perfil |
| Eventos | `fa-calendar-days` | Menú Admin → Eventos |
| Recintos | `fa-location-dot` | Menú Admin → Sedes |
| Boletos | `fa-ticket` | Tipos de boleto, mis boletos |
| Búsqueda | `fa-magnifying-glass` | Buscador de eventos |
| Check / éxito | `fa-circle-check` | Validación exitosa |
| Alerta / error | `fa-triangle-exclamation` | Errores, alertas |
| Logout | `fa-right-from-bracket` | Cerrar sesión |

---

## 4. Espaciado y Layout

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

---

## 5. Componentes UI del Sistema (M3)

### 5.1 Botones

```html
<!-- Botón primario (acción principal) -->
<button class="bg-primary text-on-primary font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
  Publicar Evento
</button>

<!-- Botón CTA / destacado (tertiary) -->
<button class="bg-tertiary text-on-tertiary font-bold px-4 py-2 rounded-xl hover:bg-tertiary/90 transition-colors">
  Comprar Boletos
</button>

<!-- Botón secundario (outline) -->
<button class="border border-primary text-primary font-bold px-4 py-2 rounded-xl hover:bg-primary/10 transition-colors">
  Ver Detalles
</button>

<!-- Botón peligroso -->
<button class="bg-error-container text-on-error-container font-bold px-4 py-2 rounded-xl hover:bg-error/20 transition-colors">
  Eliminar
</button>
```

### 5.2 Badges de Estado

```html
<!-- Draft -->
<span class="bg-surface-variant text-on-surface-variant text-xs font-medium px-2.5 py-0.5 rounded-full">Borrador</span>

<!-- Publicado -->
<span class="bg-tertiary-container text-on-tertiary-container text-xs font-medium px-2.5 py-0.5 rounded-full">Publicado</span>

<!-- Cancelado -->
<span class="bg-error-container text-on-error-container text-xs font-medium px-2.5 py-0.5 rounded-full">Cancelado</span>

<!-- Agotado -->
<span class="bg-error text-on-error text-xs font-bold px-2.5 py-0.5 rounded-full">AGOTADO</span>
```

### 5.3 Sidebar Admin

- **Fondo:** `bg-inverse-surface`
- **Texto:** `text-inverse-on-surface/70`
- **Item activo:** `border-r-4 border-primary bg-primary/15 text-primary font-semibold`
- **Hover:** `hover:bg-inverse-on-surface/5 hover:text-inverse-on-surface`
- **Ancho:** `w-64` (256px) fijo en desktop, colapsable en móvil

### 5.4 Navbar (Store)

- **Fondo:** `bg-inverse-surface/95 backdrop-blur-md`
- **Logo:** `text-inverse-on-surface font-bold` con acento en `text-tertiary`
- **Links:** `text-inverse-on-surface/80 hover:text-tertiary`
- **Botones de acción:** `bg-inverse-surface/60 border-outline-variant/20`
- **Responsive:** Hamburger menu en móvil

### 5.5 Toast Notifications

| Tipo | Color Bg | Color Texto |
|------|----------|-------------|
| Éxito | `tertiary-container` | `on-tertiary-container` |
| Error | `error-container` | `on-error-container` |
| Info | `primary-container` | `on-primary-container` |
| Neutral | `surface-variant` | `on-surface-variant` |

---

## 6. Modo Oscuro (Dark Mode)

BoletoCoqueto soporta modo oscuro con toggle manual vía `ThemeService`.

- **Clase activadora:** `.dark` en el elemento `<html>`
- **Implementación:** `ThemeService` con Angular `effect()` que persiste preferencia en `localStorage`
- **Mecanismo M3:** El esquema de colores oscuro se activa automáticamente al cambiar las CSS variables dentro de `html.dark { ... }` en `styles.css`. No se requieren clases especiales en los componentes.

```css
/* El dark mode solo cambia los valores de las variables */
html.dark {
  --md-primary: 255 180 171;     /* tone-80 */
  --md-on-primary: 105 0 9;      /* tone-20 */
  --md-surface: 26 18 18;        /* tone-6 */
  /* ... */
}
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

## 8. Cómo Cambiar la Paleta

Para cambiar toda la paleta de colores, solo editar los valores RGB en dos archivos:

1. `ticketflow/store/src/styles.css` — bloque `:root { ... }`
2. `ticketflow/apps/admin/src/styles.css` — bloque `:root { ... }`

Y actualizar `EMAIL_THEME` en:
3. `ticketflow/supabase/functions/send-ticket-email/index.ts`

Los valores deben estar en formato `R G B` (sin comas), por ejemplo:
```css
--md-primary: 78 10 11;  /* #4e0a0b */
```

---

## 9. Accesibilidad

- Todos los `<img>` tienen atributo `alt` descriptivo.
- Contraste mínimo de 4.5:1 entre texto y fondo (los pares M3 `primary`/`on-primary` están diseñados para cumplir WCAG AA).
- Los botones de acción tienen `aria-label` cuando solo contienen iconos.
- El countdown timer emite el evento `expired` para programmatic feedback.
- Los modales y drawers siguen el patrón de focus trap.
