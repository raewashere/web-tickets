import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BrandLogoVariant = 'horizontal' | 'stacked' | 'mark-only';
export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type BrandLogoTheme = 'auto' | 'dark' | 'light' | 'mono';

/**
 * <tf-brand-logo> — Identidad visual oficial de BoletoCoqueto
 *
 * Conceptos de diseño integrados:
 * 1. Lúdico y Coqueto (Divertido, audaz, irreverente, memorable):
 *    Isotipo vectorial "El Ticket Coqueto" con boleto inclinado, muescas clásicas,
 *    guiño cómplice (estrella dorada + ojo guiñando + sonrisa cálida) y destello festivo.
 * 2. Cercano y Aliado Creativo (Empático, humano):
 *    Tipografía redondeada Quicksand, curvas amables y subtítulos empáticos por portal.
 * 3. Respaldo Emocional (Confiable, seguro, transparente, sólido):
 *    Contenedor geométrico firme (squircle con borde de seguridad), alto contraste
 *    y sello opcional de verificación (`verified`).
 */
@Component({
  selector: 'tf-brand-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="inline-flex select-none group/logo"
      [ngClass]="[
        variant === 'stacked' ? 'flex-col items-center text-center' : 'items-center',
        gapClass
      ]"
    >
      <!-- Isotipo Vectorial: "El Ticket Coqueto" -->
      <div
        class="relative flex-shrink-0 flex items-center justify-center overflow-visible transition-transform duration-300 ease-out"
        [ngClass]="[
          markContainerSizeClass,
          interactive ? 'group-hover/logo:scale-105 group-hover/logo:-rotate-3' : ''
        ]"
        aria-hidden="true"
      >
        <!-- Resplandor ambiental cálido (Lúdico / Audaz) -->
        <div
          *ngIf="theme !== 'mono'"
          class="absolute -inset-0.5 rounded-[28%] bg-gradient-to-tr from-[#540D6E] via-[#EE4266] to-[#FFD23F] opacity-40 blur-xs transition-opacity duration-300"
          [ngClass]="interactive ? 'group-hover/logo:opacity-75' : ''"
        ></div>

        <!-- SVG Principal del Isotipo -->
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="relative w-full h-full drop-shadow-sm"
          role="img"
          aria-label="Isotipo BoletoCoqueto"
        >
          <defs>
            <!-- Gradiente Base Sólido: Violeta Profundo (#540D6E) a Coral Vibrante (#EE4266) -->
            <linearGradient [attr.id]="gradId + '-bg'" x1="4" y1="60" x2="60" y2="4" gradientUnits="userSpaceOnUse">
              <stop offset="0%" [attr.stop-color]="theme === 'mono' ? 'currentColor' : '#3C0650'" />
              <stop offset="52%" [attr.stop-color]="theme === 'mono' ? 'currentColor' : '#540D6E'" />
              <stop offset="100%" [attr.stop-color]="theme === 'mono' ? 'currentColor' : '#EE4266'" />
            </linearGradient>

            <!-- Gradiente del Boleto Interior: Blanco Cálido a Crema Dorado -->
            <linearGradient [attr.id]="gradId + '-ticket'" x1="12" y1="14" x2="52" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#FFF5FA" />
            </linearGradient>

            <!-- Borde Protector Dorado/Coral (Seguridad & Solidez) -->
            <linearGradient [attr.id]="gradId + '-stroke'" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FFD23F" stop-opacity="0.85" />
              <stop offset="50%" stop-color="#EE4266" stop-opacity="0.5" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.25" />
            </linearGradient>
          </defs>

          <!-- Base Squircle Sólida (Respaldo y Confianza) -->
          <rect
            x="3"
            y="3"
            width="58"
            height="58"
            rx="16"
            [attr.fill]="theme === 'mono' ? 'none' : 'url(#' + gradId + '-bg)'"
            [attr.stroke]="theme === 'mono' ? 'currentColor' : 'url(#' + gradId + '-stroke)'"
            stroke-width="2.5"
          />

          <!-- Destello Coqueto Superior Derecho (Estrella de 4 puntas dorada #FFD23F) -->
          <path
            d="M50 10.5C50 13.2 51.3 14.5 54 14.5C51.3 14.5 50 15.8 50 18.5C50 15.8 48.7 14.5 46 14.5C48.7 14.5 50 13.2 50 10.5Z"
            [attr.fill]="theme === 'mono' ? 'currentColor' : '#FFD23F'"
            class="origin-center transition-transform duration-300"
            [ngClass]="interactive ? 'group-hover/logo:scale-125 group-hover/logo:rotate-12' : ''"
          />

          <!-- Silueta del Boleto Inclinado (-10 deg) con Muescas Laterales -->
          <g transform="rotate(-10 32 33)">
            <!-- Sombra sólida detrás del boleto para dar profundidad y solidez -->
            <path
              *ngIf="theme !== 'mono'"
              d="M14 22C14 19.7909 15.7909 18 18 18H46C48.2091 18 50 19.7909 50 22V28.5C47.5147 28.5 45.5 30.5147 45.5 33C45.5 35.4853 47.5147 37.5 50 37.5V44C50 46.2091 48.2091 48 46 48H18C15.7909 48 14 46.2091 14 44V37.5C16.4853 37.5 18.5 35.4853 18.5 33C18.5 30.5147 16.4853 28.5 14 28.5V22Z"
              transform="translate(1.5, 2.5)"
              fill="#2A0238"
              fill-opacity="0.45"
            />

            <!-- Cuerpo del Boleto -->
            <path
              d="M14 22C14 19.7909 15.7909 18 18 18H46C48.2091 18 50 19.7909 50 22V28.5C47.5147 28.5 45.5 30.5147 45.5 33C45.5 35.4853 47.5147 37.5 50 37.5V44C50 46.2091 48.2091 48 46 48H18C15.7909 48 14 46.2091 14 44V37.5C16.4853 37.5 18.5 35.4853 18.5 33C18.5 30.5147 16.4853 28.5 14 28.5V22Z"
              [attr.fill]="theme === 'mono' ? 'none' : 'url(#' + gradId + '-ticket)'"
              [attr.stroke]="theme === 'mono' ? 'currentColor' : '#FFD23F'"
              [attr.stroke-width]="theme === 'mono' ? '2.5' : '1.5'"
            />

            <!-- Línea punteada de corte (Talón del boleto) -->
            <line
              x1="39.5"
              y1="20.5"
              x2="39.5"
              y2="45.5"
              [attr.stroke]="theme === 'mono' ? 'currentColor' : '#EE4266'"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-dasharray="2.5 3.5"
              stroke-opacity="0.65"
            />

            <!-- Expresión "Coqueta & Cercana": Ojo Estrella + Ojo Guiñando + Sonrisa Audaz -->
            <!-- Ojo izquierdo: Estrella chispeante en Coral (#EE4266) -->
            <path
              d="M23.5 26C23.5 28 24.4 28.9 26.4 28.9C24.4 28.9 23.5 29.8 23.5 31.8C23.5 29.8 22.6 28.9 20.6 28.9C22.6 28.9 23.5 28 23.5 26Z"
              [attr.fill]="theme === 'mono' ? 'currentColor' : '#EE4266'"
            />

            <!-- Ojo derecho: Guiño cómplice (arco audaz en Violeta #540D6E) -->
            <path
              d="M29.8 29.5C30.8 27.6 33.2 27.6 34.2 29.5"
              [attr.stroke]="theme === 'mono' ? 'currentColor' : '#540D6E'"
              stroke-width="2.4"
              stroke-linecap="round"
            />
            <!-- Pestaña coqueta lateral en el guiño -->
            <path
              d="M34.2 29.2L35.6 28.1"
              [attr.stroke]="theme === 'mono' ? 'currentColor' : '#540D6E'"
              stroke-width="2"
              stroke-linecap="round"
            />

            <!-- Mejilla sonrojada coqueta -->
            <circle
              *ngIf="theme !== 'mono'"
              cx="35"
              cy="33"
              r="2"
              fill="#EE4266"
              fill-opacity="0.45"
            />
            <circle
              *ngIf="theme !== 'mono'"
              cx="20.5"
              cy="33"
              r="2"
              fill="#EE4266"
              fill-opacity="0.45"
            />

            <!-- Sonrisa cálida y confiada -->
            <path
              d="M23 35.2C25.2 38.8 30.5 38.8 32.8 35.2"
              [attr.stroke]="theme === 'mono' ? 'currentColor' : '#540D6E'"
              stroke-width="2.5"
              stroke-linecap="round"
            />

            <!-- Micro-código de barras en el talón derecho (Símbolo de autenticidad QR/Ticket) -->
            <line
              x1="43.5"
              y1="25"
              x2="43.5"
              y2="41"
              [attr.stroke]="theme === 'mono' ? 'currentColor' : '#540D6E'"
              stroke-width="2"
              stroke-linecap="round"
              stroke-opacity="0.45"
            />
          </g>

          <!-- Sello de Respaldo / Seguridad opcional en la esquina inferior derecha -->
          <g *ngIf="verified && theme !== 'mono'">
            <circle cx="51" cy="51" r="8" fill="#10B981" stroke="#210124" stroke-width="2" />
            <path
              d="M47.8 51.2L50 53.4L54.5 48.9"
              stroke="#FFFFFF"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>
        </svg>
      </div>

      <!-- Logotipo Tipográfico (Wordmark) + Subtítulo / Badge de Portal -->
      <div
        *ngIf="variant !== 'mark-only'"
        class="flex flex-col justify-center leading-none"
        [ngClass]="variant === 'stacked' ? 'items-center' : 'items-start'"
      >
        <div class="inline-flex items-baseline tracking-tight font-extrabold" [ngClass]="wordmarkSizeClass">
          <span [ngClass]="primaryTextClass">Boleto</span>
          <span
            [ngClass]="
              theme === 'mono'
                ? 'font-black ml-0.5'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-[#EE4266] via-[#FF758F] to-[#FFD23F] font-black ml-0.5'
            "
          >Coqueto</span>
          <!-- Punto chispeante final que refuerza el guiño de marca -->
          <span
            *ngIf="theme !== 'mono'"
            class="inline-block w-1.5 h-1.5 rounded-full bg-[#FFD23F] ml-0.5 self-start mt-1 shadow-xs"
            aria-hidden="true"
          ></span>
        </div>

        <!-- Badge de Portal o Subtítulo Empático -->
        <div
          *ngIf="badge || subtitle"
          class="flex items-center gap-1.5 mt-1"
          [ngClass]="variant === 'stacked' ? 'justify-center' : 'justify-start'"
        >
          <span
            *ngIf="badge"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border"
            [ngClass]="badgeColorClass"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
            {{ badge }}
          </span>

          <span
            *ngIf="subtitle"
            class="text-[11px] font-medium tracking-normal"
            [ngClass]="subtitleTextClass"
          >
            {{ subtitle }}
          </span>
        </div>
      </div>
    </div>
  `,
})
export class BrandLogoComponent {
  private static nextId = 0;
  readonly gradId = `tf-brand-logo-${++BrandLogoComponent.nextId}`;

  /** Layout del logo: horizontal (default), stacked (centrado vertical para logins) o mark-only (solo isotipo) */
  @Input() variant: BrandLogoVariant = 'horizontal';

  /** Escala del componente */
  @Input() size: BrandLogoSize = 'md';

  /**
   * Esquema de contraste:
   * - 'auto': se adapta a `text-on-surface` (ideal para fondos `bg-surface`)
   * - 'dark': texto claro `text-inverse-on-surface` (ideal para barras `bg-inverse-surface`)
   * - 'light': fuerza texto oscuro `#1F1624`
   * - 'mono': alto contraste monocromático (ideal para impresión PDF / tickets térmicos)
   */
  @Input() theme: BrandLogoTheme = 'auto';

  /** Etiqueta de contexto (ej. 'Aliado Creativo', 'Pase Oficial', 'Global Backoffice') */
  @Input() badge?: string;

  /** Frase corta empática debajo del nombre */
  @Input() subtitle?: string;

  /** Muestra el micro-escudo verde de autenticidad sobre el isotipo */
  @Input() verified = false;

  /** Activa micro-interacciones lúdicas al pasar el cursor */
  @Input() interactive = true;

  get gapClass(): string {
    if (this.variant === 'stacked') {
      return this.size === 'lg' || this.size === 'xl' ? 'gap-3' : 'gap-2';
    }
    switch (this.size) {
      case 'xs':
        return 'gap-2';
      case 'sm':
        return 'gap-2.5';
      case 'lg':
      case 'xl':
        return 'gap-3.5';
      default:
        return 'gap-3';
    }
  }

  get markContainerSizeClass(): string {
    switch (this.size) {
      case 'xs':
        return 'w-7 h-7';
      case 'sm':
        return 'w-9 h-9';
      case 'md':
        return 'w-10 h-10 sm:w-11 sm:h-11';
      case 'lg':
        return 'w-14 h-14 sm:w-16 sm:h-16';
      case 'xl':
        return 'w-20 h-20';
    }
  }

  get wordmarkSizeClass(): string {
    switch (this.size) {
      case 'xs':
        return 'text-base';
      case 'sm':
        return 'text-lg';
      case 'md':
        return 'text-xl sm:text-2xl';
      case 'lg':
        return 'text-2xl sm:text-3xl';
      case 'xl':
        return 'text-3xl sm:text-4xl';
    }
  }

  get primaryTextClass(): string {
    switch (this.theme) {
      case 'dark':
        return 'text-inverse-on-surface';
      case 'light':
        return 'text-[#1F1624]';
      case 'mono':
        return 'text-current';
      default:
        return 'text-on-surface';
    }
  }

  get subtitleTextClass(): string {
    switch (this.theme) {
      case 'dark':
        return 'text-inverse-on-surface/65';
      case 'light':
        return 'text-[#4D4154]';
      case 'mono':
        return 'text-current opacity-80';
      default:
        return 'text-on-surface-variant';
    }
  }

  get badgeColorClass(): string {
    if (this.theme === 'mono') {
      return 'border-current text-current';
    }
    if (this.theme === 'dark') {
      return 'bg-secondary/20 text-[#FFD23F] border-secondary/40';
    }
    return 'bg-primary/10 text-primary border-primary/25 dark:bg-secondary/20 dark:text-[#FFD23F] dark:border-secondary/40';
  }
}
