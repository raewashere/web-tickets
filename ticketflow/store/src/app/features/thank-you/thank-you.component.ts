import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';
import { MetaPixelService } from '../../core/services/meta-pixel.service';
import { ToastService } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-thank-you',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8 relative">
      <!-- Canvas Confetti Overlay -->
      <canvas
        #confettiCanvas
        class="fixed inset-0 pointer-events-none z-50 w-full h-full"
      ></canvas>

      <!-- Success Header Card -->
      <div class="rounded-3xl border border-outline-variant/30 bg-surface-container p-8 sm:p-12 shadow-xl text-center space-y-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-primary via-secondary to-tertiary animate-pulse"></div>

        <!-- Animated Check Badge with Glow -->
        <div class="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-tertiary/20 animate-ping"></div>
          <div class="relative w-full h-full rounded-3xl bg-tertiary text-on-tertiary flex items-center justify-center text-5xl sm:text-6xl shadow-lg shadow-tertiary/30 transform hover:scale-105 transition-transform duration-300">
            <i class="fa-solid fa-circle-check"></i>
          </div>
        </div>

        <div class="space-y-3">
          <span class="text-xs font-bold uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-sparkles"></i>
            ¡Compra Confirmada Exitosamente!
          </span>
          <h1 class="text-3xl sm:text-5xl font-bold text-on-surface tracking-tight">
            ¡Gracias por tu compra!
          </h1>
          <p class="text-sm sm:text-base text-on-surface-variant max-w-xl mx-auto leading-relaxed">
            Tus entradas oficiales han sido emitidas con código QR antifraude y enviadas a tu correo electrónico.
          </p>
        </div>

        <!-- Order Summary Box -->
        <div *ngIf="orderTotal > 0" class="max-w-md mx-auto p-4 rounded-2xl bg-surface border border-outline-variant/30 flex items-center justify-between text-left">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Monto Total Pagado</span>
            <div class="text-xl font-bold font-mono text-primary">\${{ orderTotal.toFixed(2) }} {{ orderCurrency }}</div>
          </div>
          <div class="text-right">
            <span class="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center justify-end gap-1">
              <i class="fa-solid fa-shield-check"></i> Pago Verificado
            </span>
            <div class="text-xs text-on-surface-variant font-medium">PayPal Instantaneous</div>
          </div>
        </div>

        <!-- Quick actions buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            *ngIf="guestOrderId && guestToken; else authTicketsBtn"
            [routerLink]="['/ticket', guestOrderId]"
            [queryParams]="{ token: guestToken }"
            class="w-full sm:w-auto"
          >
            <button
              type="button"
              class="w-full sm:w-auto px-7 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5"
            >
              <i class="fa-solid fa-qrcode text-tertiary text-lg"></i>
              <span>Ver Mi Pase Digital y Código QR</span>
            </button>
          </a>
          <ng-template #authTicketsBtn>
            <a *ngIf="auth.isAuthenticated()" routerLink="/my-tickets" class="w-full sm:w-auto">
              <button
                type="button"
                class="w-full sm:w-auto px-7 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5"
              >
                <i class="fa-solid fa-qrcode text-tertiary text-lg"></i>
                <span>Ver Mis Boletos y Código QR</span>
              </button>
            </a>
          </ng-template>

          <a routerLink="/search" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-7 py-4 rounded-2xl bg-surface hover:bg-surface-variant text-on-surface border border-outline-variant/40 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              <i class="fa-solid fa-compass text-primary"></i>
              <span>Explorar Más Conciertos</span>
            </button>
          </a>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-3xl border border-outline-variant/30 bg-surface-container space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-inner">
            <i class="fa-solid fa-mobile-screen-button"></i>
          </div>
          <h3 class="font-bold text-base text-on-surface">Acceso 100% Digital</h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            Muestra el código QR desde tu celular en la entrada del evento. No requiere impresión en papel.
          </p>
        </div>

        <div class="p-6 rounded-3xl border border-outline-variant/30 bg-surface-container space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-xl shadow-inner">
            <i class="fa-solid fa-envelope-circle-check"></i>
          </div>
          <h3 class="font-bold text-base text-on-surface">Respaldo por Correo</h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            Hemos enviado tu boleto digital con código QR y enlace directo a tu correo electrónico.
          </p>
        </div>

        <div class="p-6 rounded-3xl border border-outline-variant/30 bg-surface-container space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center text-xl shadow-inner">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <h3 class="font-bold text-base text-on-surface">Protección Garantizada</h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            Garantía antifraude con firma criptográfica de acceso y derecho a reembolso en caso de cancelación.
          </p>
        </div>
      </div>
    </main>
  `,
})
export class ThankYouComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly metaPixel = inject(MetaPixelService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  @ViewChild('confettiCanvas') confettiCanvas?: ElementRef<HTMLCanvasElement>;

  orderTotal = 0;
  orderCurrency = 'MXN';
  guestOrderId: string | null = null;
  guestToken: string | null = null;
  private animationFrameId?: number;

  ngOnInit(): void {
    this.orderTotal = parseFloat(this.route.snapshot.queryParamMap.get('total') ?? '0');
    this.orderCurrency = this.route.snapshot.queryParamMap.get('currency') ?? 'MXN';
    this.guestOrderId = this.route.snapshot.queryParamMap.get('orderId');
    this.guestToken = this.route.snapshot.queryParamMap.get('token');

    // Meta Pixel Purchase Event
    this.metaPixel.track('Purchase', {
      value: this.orderTotal || 0,
      currency: this.orderCurrency,
      content_type: 'product',
    });

    this.toast.success('¡Compra completada con éxito!', 'Tus entradas han sido emitidas y enviadas a tu correo.');

    // Launch Confetti Cannon
    setTimeout(() => this.launchConfetti(), 100);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private launchConfetti(): void {
    const canvas = this.confettiCanvas?.nativeElement;
    if (!canvas || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#4e0a0b', '#e38792', '#14281d', '#355834', '#f2eee8'];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      vx: number;
      vy: number;
      rotation: number;
      vRot: number;
      opacity: number;
    }> = [];

    // Create 90 confetti pieces
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 1) * 14 - 3,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98;
        p.rotation += p.vRot;
        if (p.y > canvas.height * 0.6) {
          p.opacity -= 0.02;
        }

        if (p.opacity > 0 && p.y < canvas.height) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();
  }
}
