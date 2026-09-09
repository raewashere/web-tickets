import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
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
      <div class="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-xl text-center space-y-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-cyan-400 via-sky-500 to-emerald-400 animate-pulse"></div>

        <!-- Animated Check Badge with Glow -->
        <div class="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping"></div>
          <div class="relative w-full h-full rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center text-5xl sm:text-6xl shadow-lg shadow-emerald-500/30 transform hover:scale-105 transition-transform duration-300">
            <i class="fa-solid fa-circle-check"></i>
          </div>
        </div>

        <div class="space-y-3">
          <span class="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/90 px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-sparkles"></i>
            ¡Compra Confirmada Exitosamente!
          </span>
          <h1 class="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            ¡Gracias por tu compra!
          </h1>
          <p class="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Tus entradas oficiales han sido emitidas con código QR antifraude y asignadas directamente a tu cuenta.
          </p>
        </div>

        <!-- Order Summary Box -->
        <div *ngIf="orderTotal > 0" class="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-left">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monto Total Pagado</span>
            <div class="text-xl font-black text-slate-900">\${{ orderTotal.toFixed(2) }} {{ orderCurrency }}</div>
          </div>
          <div class="text-right">
            <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-end gap-1">
              <i class="fa-solid fa-shield-check"></i> Pago Verificado
            </span>
            <div class="text-xs text-slate-500 font-medium">PayPal Instantaneous</div>
          </div>
        </div>

        <!-- Quick actions buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a routerLink="/my-tickets" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-xl shadow-slate-950/10 hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5"
            >
              <i class="fa-solid fa-qrcode text-cyan-400 text-lg"></i>
              <span>Ver Mis Boletos y Código QR</span>
            </button>
          </a>

          <a routerLink="/search" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              <i class="fa-solid fa-compass"></i>
              <span>Explorar Más Conciertos</span>
            </button>
          </a>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-3xl border border-slate-200 bg-white space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-xl shadow-inner">
            <i class="fa-solid fa-mobile-screen-button"></i>
          </div>
          <h3 class="font-extrabold text-base text-slate-900">Acceso 100% Digital</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Muestra el código QR desde la app en la entrada del evento. No requiere impresión en papel.
          </p>
        </div>

        <div class="p-6 rounded-3xl border border-slate-200 bg-white space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl shadow-inner">
            <i class="fa-solid fa-envelope-circle-check"></i>
          </div>
          <h3 class="font-extrabold text-base text-slate-900">Respaldo por Correo</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Hemos enviado un desglose completo de tu pedido a tu dirección de correo electrónico registrada.
          </p>
        </div>

        <div class="p-6 rounded-3xl border border-slate-200 bg-white space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shadow-inner">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <h3 class="font-extrabold text-base text-slate-900">Protección Garantizada</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Garantía antifraude con firma criptográfica de acceso y derecho a reembolso en caso de cancelación.
          </p>
        </div>
      </div>
    </main>
  `,
})
export class ThankYouComponent implements OnInit, OnDestroy {
  private readonly metaPixel = inject(MetaPixelService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  @ViewChild('confettiCanvas') confettiCanvas?: ElementRef<HTMLCanvasElement>;

  orderTotal = 0;
  orderCurrency = 'MXN';
  private animationFrameId?: number;

  ngOnInit(): void {
    this.orderTotal = parseFloat(this.route.snapshot.queryParamMap.get('total') ?? '0');
    this.orderCurrency = this.route.snapshot.queryParamMap.get('currency') ?? 'MXN';

    // Meta Pixel Purchase Event
    this.metaPixel.track('Purchase', {
      value: this.orderTotal || 0,
      currency: this.orderCurrency,
      content_type: 'product',
    });

    this.toast.success('¡Compra completada con éxito!', 'Tus entradas están listas en la sección Mis Boletos');

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

    const colors = ['#0bdef5', '#f7e733', '#e11392', '#10b981', '#3b82f6'];
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
