import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SupabaseService, AuthService } from '@ticketflow/data-access';
import { generateQrDataUrl } from '../../shared/utils/qr.utils';
import { ButtonComponent, BadgeComponent, SpinnerComponent } from '@ticketflow/shared-ui';

export interface PublicOrderData {
  id: string;
  status: string;
  guest_name?: string | null;
  guest_email?: string | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  created_at: string;
  event: {
    id: string;
    name?: string;
    title?: string;
    event_date: string | null;
    flyer_url?: string | null;
    cover_image?: string | null;
    venue?: {
      name: string;
    } | null;
  } | null;
  artist?: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total: number;
    ticket_type: {
      id: string;
      name: string;
    } | null;
  }>;
  refund_request?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    admin_notes?: string | null;
    created_at: string;
    reviewed_at?: string | null;
  } | null;
}

@Component({
  selector: 'store-public-ticket',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    BadgeComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8 print:py-0 print:px-0 print:max-w-full">
      <!-- Nav & Print Action Header (hidden when printing) -->
      <div class="flex items-center justify-between print:hidden">
        <a
          routerLink="/"
          class="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
        >
          <i class="fa-solid fa-house"></i> Inicio BoletoCoqueto
        </a>

        <div *ngIf="order()?.status === 'confirmed'" class="flex items-center gap-2">
          <button
            *ngIf="qrDataUrl()"
            type="button"
            (click)="downloadQrCode()"
            class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors border border-primary/20"
          >
            <i class="fa-solid fa-download"></i>
            <span>Descargar QR (.png)</span>
          </button>
          <button
            type="button"
            (click)="printPass()"
            class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-bold transition-colors border border-outline-variant/30"
          >
            <i class="fa-solid fa-print"></i>
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3 print:hidden">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-on-surface-variant">Cargando pase de acceso y código QR...</p>
      </div>

      <!-- Error / Invalid Token State -->
      <div
        *ngIf="!isLoading() && errorMessage()"
        class="py-16 text-center space-y-4 rounded-3xl border border-dashed border-error/30 p-8 bg-surface-container shadow-sm print:hidden"
      >
        <div class="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto text-2xl">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 class="text-xl font-bold text-on-surface">Acceso no válido o boleto expirado</h2>
        <p class="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
          {{ errorMessage() }}
        </p>
        <a routerLink="/search">
          <tf-button variant="primary" size="sm">Explorar Eventos</tf-button>
        </a>
      </div>

      <!-- Main Public Ticket View -->
      <div *ngIf="!isLoading() && order()" class="space-y-6 animate-fade-in">
        <!-- Event Header -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-on-surface-variant font-mono">
              Pase Digital · Orden #{{ order()!.id.substring(0, 8).toUpperCase() }}
            </p>
            <h1 class="text-2xl sm:text-3xl font-bold text-on-surface leading-tight">
              {{ order()!.event?.name || order()!.event?.title || 'Espectáculo en Vivo' }}
            </h1>
            <p class="text-xs sm:text-sm text-on-surface-variant mt-1">
              <i class="fa-solid fa-location-dot text-primary mr-1"></i> {{ order()!.event?.venue?.name || 'Recinto Confirmado' }}
              &nbsp;·&nbsp;
              <i class="fa-regular fa-calendar text-primary mr-1"></i> {{ order()!.event?.event_date | date:'mediumDate' }}
            </p>
          </div>

          <div>
            <tf-badge *ngIf="order()!.status === 'confirmed'" variant="success">
              Pase Válido
            </tf-badge>
            <span
              *ngIf="order()!.status === 'refunded'"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-error-container text-on-error-container border border-error/20"
            >
              Cancelado / Reembolsado
            </span>
          </div>
        </div>

        <!-- Refund Request Status Banner (if exists) -->
        <div
          *ngIf="order()!.refund_request"
          class="p-4 rounded-2xl border text-xs space-y-1 print:hidden"
          [ngClass]="{
            'bg-secondary-container/60 border-secondary/30 text-on-surface': order()!.refund_request!.status === 'pending',
            'bg-tertiary-container border-tertiary/30 text-on-tertiary-container': order()!.refund_request!.status === 'approved',
            'bg-error-container border-error/30 text-on-error-container': order()!.refund_request!.status === 'rejected'
          }"
        >
          <p class="font-bold flex items-center gap-1.5">
            <i
              class="fa-solid"
              [ngClass]="{
                'fa-clock': order()!.refund_request!.status === 'pending',
                'fa-circle-check': order()!.refund_request!.status === 'approved',
                'fa-circle-xmark': order()!.refund_request!.status === 'rejected'
              }"
            ></i>
            <span *ngIf="order()!.refund_request!.status === 'pending'">Solicitud de reembolso en revisión por el equipo de BoletoCoqueto</span>
            <span *ngIf="order()!.refund_request!.status === 'approved'">Reembolso aprobado y procesado</span>
            <span *ngIf="order()!.refund_request!.status === 'rejected'">Solicitud de reembolso rechazada</span>
          </p>
          <p class="opacity-85">Motivo registrado: "{{ order()!.refund_request!.reason }}"</p>
          <p *ngIf="order()!.refund_request!.admin_notes" class="font-semibold pt-1">
            Respuesta de administración: {{ order()!.refund_request!.admin_notes }}
          </p>
        </div>

        <!-- Boarding Pass QR Card -->
        <div
          class="rounded-3xl border bg-surface-container shadow-xl overflow-hidden print:bg-white print:shadow-none print:border-2"
          [ngClass]="order()!.status === 'refunded' ? 'border-error/30' : 'border-outline-variant/30 print:border-black'"
        >
          <!-- Header Banner -->
          <div
            class="px-6 py-4 flex items-center justify-between text-inverse-on-surface"
            [ngClass]="order()!.status === 'refunded' ? 'bg-error text-on-error' : 'bg-inverse-surface print:bg-black'"
          >
            <div>
              <span class="text-[10px] font-bold uppercase tracking-widest text-tertiary block">
                {{ order()!.status === 'refunded' ? 'Boleto Invalidado' : 'Pase Oficial de Entrada' }}
              </span>
              <span class="font-bold text-base leading-tight">
                {{ order()!.event?.name || order()!.event?.title }}
              </span>
            </div>
            <span class="text-2xl"><i class="fa-solid" [ngClass]="order()!.status === 'refunded' ? 'fa-ban' : 'fa-ticket text-tertiary'"></i></span>
          </div>

          <!-- QR & Access Details -->
          <div class="p-8 flex flex-col items-center gap-6">
            <!-- Refunded Warning Banner -->
            <div
              *ngIf="order()!.status === 'refunded'"
              class="w-full p-4 rounded-2xl bg-error-container border border-error/20 text-on-error-container text-center space-y-1"
            >
              <p class="font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-ban"></i> Pase Cancelado
              </p>
              <p class="text-[11px] opacity-85">Esta orden fue reembolsada y el código QR se encuentra inhabilitado.</p>
            </div>

            <!-- QR Code (kept bg-white for physical QR scanner contrast) -->
            <div
              *ngIf="order()!.status === 'confirmed'"
              class="p-4 bg-white rounded-2xl border-2 border-outline-variant/30 shadow-inner print:border-black"
            >
              <img
                *ngIf="qrDataUrl()"
                [src]="qrDataUrl()"
                [alt]="'Código QR de acceso oficial BoletoCoqueto orden ' + order()!.id.substring(0, 8)"
                class="w-56 h-56 sm:w-64 sm:h-64 rounded-lg object-contain"
              />
              <div *ngIf="!qrDataUrl()" class="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                <tf-spinner size="md" color="primary"></tf-spinner>
              </div>
            </div>

            <!-- Auth String -->
            <div class="text-center space-y-1">
              <p class="font-mono text-xs text-on-surface-variant tracking-widest font-bold">
                AUTH: {{ order()!.id.substring(0, 16).toUpperCase() }}
              </p>
              <p *ngIf="order()!.status === 'confirmed'" class="text-[10px] text-on-surface-variant/80 print:text-black">
                Muestra este código QR desde tu pantalla o impreso en el control de acceso del recinto.
              </p>
            </div>

            <!-- Items Breakdown -->
            <div class="w-full divide-y divide-outline-variant/20 border-t border-outline-variant/20 pt-4 text-xs">
              <div
                *ngFor="let item of order()!.items"
                class="py-2.5 flex items-center justify-between text-on-surface"
              >
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center print:bg-slate-200 print:text-black">
                    {{ item.quantity }}
                  </span>
                  <span class="font-semibold">{{ item.ticket_type?.name || 'Localidad' }}</span>
                </div>
                <span class="font-mono font-bold">\${{ item.unit_price | number:'1.2-2' }} c/u</span>
              </div>
            </div>

            <!-- Financial Summary -->
            <div class="w-full space-y-1 border-t border-outline-variant/20 pt-3 text-xs">
              <div class="flex justify-between text-on-surface-variant">
                <span>Subtotal</span>
                <span class="font-mono">\${{ order()!.subtotal | number:'1.2-2' }}</span>
              </div>
              <div *ngIf="order()!.discount_amount > 0" class="flex justify-between text-primary font-bold">
                <span>Descuento</span>
                <span class="font-mono">-\${{ order()!.discount_amount | number:'1.2-2' }}</span>
              </div>
              <div class="flex justify-between font-bold text-on-surface text-sm pt-1 border-t border-outline-variant/20">
                <span>Total Pagado</span>
                <span class="font-mono text-primary print:text-black">\${{ order()!.total | number:'1.2-2' }} MXN</span>
              </div>
            </div>
          </div>

          <!-- Holder Footer Strip -->
          <div class="px-6 py-4 bg-surface border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant print:bg-slate-100">
            <div>
              <span class="font-bold text-on-surface block">Titular / Comprador</span>
              <span>{{ order()!.guest_name || order()!.guest_email || 'Invitado' }}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-on-surface block">Fecha de Compra</span>
              <span>{{ order()!.created_at | date:'short' }}</span>
            </div>
          </div>
        </div>

        <!-- Account Conversion Banner for Guest -->
        <div *ngIf="!auth.user()" class="p-6 rounded-3xl bg-gradient-to-r from-primary via-primary to-secondary text-on-primary shadow-lg space-y-3 print:hidden">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-user-plus text-on-primary"></i>
            </div>
            <div>
              <h3 class="font-bold text-sm text-on-primary">¿Quieres guardar todos tus boletos en un solo lugar?</h3>
              <p class="text-xs text-on-primary/80">Crea tu cuenta en BoletoCoqueto para acceder a tus compras cuando quieras.</p>
            </div>
          </div>
          <div class="pt-1 flex justify-end">
            <a routerLink="/register">
              <button
                type="button"
                class="px-4 py-2 rounded-xl bg-inverse-surface hover:opacity-90 text-inverse-on-surface font-bold text-xs shadow-md transition-colors"
              >
                Crear Cuenta Gratis <i class="fa-solid fa-arrow-right ml-1"></i>
              </button>
            </a>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden pt-2">
          <button
            *ngIf="order()!.status === 'confirmed' && qrDataUrl()"
            type="button"
            (click)="downloadQrCode()"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs transition-all shadow-md"
          >
            <i class="fa-solid fa-download"></i>
            <span>Descargar Imagen QR (.png)</span>
          </button>

          <button
            *ngIf="order()!.status === 'confirmed'"
            type="button"
            (click)="printPass()"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-surface-container text-on-surface hover:bg-surface-variant border border-outline-variant/30 font-bold text-xs transition-all shadow-sm"
          >
            <i class="fa-solid fa-print"></i>
            <span>Imprimir / Descargar en PDF</span>
          </button>

          <button
            *ngIf="canRequestRefund()"
            type="button"
            (click)="openRefundModal()"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-error-container text-on-error-container hover:bg-error/20 border border-error/30 font-bold text-xs transition-all"
          >
            <i class="fa-solid fa-rotate-left"></i>
            <span>Solicitar Reembolso</span>
          </button>
        </div>
      </div>

      <!-- Refund Request Modal for Guest -->
      <div
        *ngIf="showRefundModal()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden"
      >
        <div class="relative w-full max-w-md bg-surface-container-high rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-outline-variant/30">
          <button
            type="button"
            (click)="closeRefundModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-variant text-on-surface-variant font-bold flex items-center justify-center transition"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block bg-error-container text-on-error-container border border-error/30">
              Solicitud Post-Venta
            </span>
            <h3 class="text-xl font-bold text-on-surface">Solicitar Reembolso</h3>
            <p class="text-xs text-on-surface-variant">
              Orden #{{ order()!.id.substring(0, 8).toUpperCase() }} · Importe: <strong class="text-on-surface">\${{ order()!.total | number:'1.2-2' }} MXN</strong>
            </p>
          </div>

          <div class="space-y-1.5 text-xs">
            <label class="font-bold text-on-surface">Describe el motivo de tu solicitud:</label>
            <textarea
              [(ngModel)]="refundReason"
              rows="3"
              placeholder="Ej. Cambio de fecha, imprevisto médico, error en la compra..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
            ></textarea>
          </div>

          <p *ngIf="refundError()" class="text-error font-bold text-xs">
            {{ refundError() }}
          </p>

          <div class="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
            <button
              type="button"
              (click)="closeRefundModal()"
              [disabled]="isSubmittingRefund()"
              class="px-4 py-2 rounded-xl text-on-surface-variant font-bold text-xs hover:bg-surface-variant transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="submitRefundRequest()"
              [disabled]="isSubmittingRefund()"
              class="px-5 py-2 rounded-xl bg-error hover:opacity-90 text-on-error font-bold text-xs shadow-md transition flex items-center gap-2"
            >
              <tf-spinner *ngIf="isSubmittingRefund()" size="sm" color="white"></tf-spinner>
              <span>{{ isSubmittingRefund() ? 'Enviando...' : 'Enviar Solicitud' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PublicTicketComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly supabase    = inject(SupabaseService).client;
  readonly auth                = inject(AuthService);
  private readonly platformId  = inject(PLATFORM_ID);

  readonly isLoading    = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly order        = signal<PublicOrderData | null>(null);
  readonly qrDataUrl    = signal<string | null>(null);

  // Guest Refund Modal state
  private accessToken = '';
  readonly showRefundModal    = signal(false);
  readonly isSubmittingRefund = signal(false);
  readonly refundError        = signal<string | null>(null);
  refundReason = '';

  readonly canRequestRefund = computed(() => {
    const o = this.order();
    if (!o || o.status !== 'confirmed' || o.refund_request) return false;
    const evDate = o.event?.event_date ? new Date(o.event.event_date) : null;
    return !evDate || evDate.getTime() > Date.now();
  });

  async ngOnInit(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    const token   = this.route.snapshot.queryParamMap.get('token');

    if (!orderId || !token) {
      this.errorMessage.set('El enlace de acceso al boleto es incompleto o no contiene el token de seguridad.');
      this.isLoading.set(false);
      return;
    }

    this.accessToken = token;
    await this.loadPublicOrder(orderId, token);
  }

  private async loadPublicOrder(orderId: string, token: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { data, error } = await this.supabase.rpc('get_order_by_access_token', {
        p_order_id: orderId,
        p_token:    token,
      });

      if (error || !data) {
        console.error('get_order_by_access_token error:', error);
        this.errorMessage.set('No fue posible validar el token de acceso o el boleto ya no existe.');
      } else {
        const orderData = data as PublicOrderData;
        this.order.set(orderData);

        if (orderData.status === 'confirmed' && isPlatformBrowser(this.platformId)) {
          const payload = `TICKETFLOW-AUTH-${orderData.id}`;
          const url = await generateQrDataUrl(payload, 400);
          this.qrDataUrl.set(url);
        }
      }
    } catch (err: unknown) {
      console.error('loadPublicOrder error:', err);
      this.errorMessage.set('Ocurrió un error inesperado al consultar la información del boleto.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openRefundModal(): void {
    this.refundReason = '';
    this.refundError.set(null);
    this.showRefundModal.set(true);
  }

  closeRefundModal(): void {
    this.showRefundModal.set(false);
    this.refundError.set(null);
  }

  async submitRefundRequest(): Promise<void> {
    const o = this.order();
    if (!o) return;

    const reason = this.refundReason.trim();
    if (reason.length < 5) {
      this.refundError.set('Por favor describe el motivo con al menos 5 caracteres.');
      return;
    }

    this.isSubmittingRefund.set(true);
    this.refundError.set(null);

    try {
      const { data, error } = await this.supabase.rpc('request_order_refund', {
        p_order_id:     o.id,
        p_reason:       reason,
        p_access_token: this.accessToken,
      });

      if (error) {
        this.refundError.set(error.message || 'Error al enviar la solicitud de reembolso.');
        return;
      }

      const res = data as { success: boolean; error?: string };
      if (!res?.success) {
        this.refundError.set(res?.error || 'No fue posible registrar la solicitud.');
        return;
      }

      this.closeRefundModal();
      await this.loadPublicOrder(o.id, this.accessToken);
    } catch (err: unknown) {
      this.refundError.set(err instanceof Error ? err.message : 'Error inesperado al solicitar reembolso.');
    } finally {
      this.isSubmittingRefund.set(false);
    }
  }

  downloadQrCode(): void {
    const dataUrl = this.qrDataUrl();
    const o = this.order();
    if (!dataUrl || !o || !isPlatformBrowser(this.platformId)) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `boleto-qr-${o.id.substring(0, 8).toUpperCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printPass(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }
}

