import {
  Component,
  OnInit,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MyTicketsService } from './my-tickets.service';
import { AuthService } from '@ticketflow/data-access';
import type { OrderWithRelations, RefundRequest } from '@ticketflow/models';
import { generateQrDataUrl } from '../../shared/utils/qr.utils';
import { ButtonComponent, BadgeComponent, SpinnerComponent, BrandLogoComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonComponent, BadgeComponent, SpinnerComponent, BrandLogoComponent],
  template: `
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8 print:py-0 print:px-0 print:max-w-full">

      <!-- Back nav & Print Button (hidden when printing) -->
      <div class="flex items-center justify-between print:hidden">
        <a
          routerLink="/my-tickets"
          class="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
        >
          <i class="fa-solid fa-arrow-left"></i> Volver a Mis Boletos
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

      <!-- Toast Feedback Message -->
      <div
        *ngIf="feedbackMessage()"
        class="p-4 rounded-2xl flex items-center justify-between transition-all print:hidden"
        [ngClass]="feedbackType() === 'success' ? 'bg-tertiary-container border border-tertiary/30 text-on-tertiary-container' : 'bg-error-container border border-error/20 text-on-error-container'"
      >
        <div class="flex items-center gap-3 text-sm font-semibold">
          <i class="fa-solid" [ngClass]="feedbackType() === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation text-error'"></i>
          <span>{{ feedbackMessage() }}</span>
        </div>
        <button
          type="button"
          (click)="feedbackMessage.set(null)"
          class="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center gap-3 print:hidden">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-on-surface-variant">Cargando boleto...</p>
      </div>

      <!-- Not found -->
      <div *ngIf="!isLoading() && !order()" class="py-16 text-center space-y-3 print:hidden">
        <i class="fa-solid fa-ticket text-4xl text-on-surface-variant/40 block mb-2"></i>
        <p class="text-on-surface-variant text-sm">No se encontró la orden solicitada.</p>
        <a routerLink="/my-tickets">
          <tf-button variant="primary" size="sm">Ver Mis Boletos</tf-button>
        </a>
      </div>

      <!-- Content -->
      <div *ngIf="!isLoading() && order()" class="space-y-6">

        <!-- Order header -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-on-surface-variant font-mono">
              Orden #{{ order()!.id.substring(0, 8).toUpperCase() }}
            </p>
            <h1 class="text-2xl font-bold text-on-surface">{{ order()!.events?.name }}</h1>
            <p class="text-sm text-on-surface-variant mt-0.5">
              <i class="fa-solid fa-location-dot mr-1 text-primary"></i> {{ order()!.events?.venues?.name }}
              &nbsp;·&nbsp;
              <i class="fa-regular fa-calendar mr-1 text-primary"></i> {{ order()!.events?.event_date | date:'mediumDate' }}
            </p>
          </div>

          <!-- Status Badge -->
          <div>
            <span
              *ngIf="order()!.status === 'refunded'"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-error-container text-on-error-container border border-error/20"
            >
              <i class="fa-solid fa-money-bill-transfer mr-1"></i> Reembolsado
            </span>
            <span
              *ngIf="order()!.status === 'confirmed' && currentRefund?.status === 'pending'"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container border border-secondary/30"
            >
              <i class="fa-solid fa-clock mr-1"></i> En Revisión de Reembolso
            </span>
            <span
              *ngIf="order()!.status === 'confirmed' && currentRefund?.status === 'rejected'"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-surface-variant text-on-surface-variant border border-outline-variant/30"
            >
              <i class="fa-solid fa-circle-xmark mr-1"></i> Reembolso Rechazado
            </span>
            <tf-badge *ngIf="order()!.status === 'confirmed' && !currentRefund" variant="success">
              Confirmada
            </tf-badge>
          </div>
        </div>

        <!-- Refund Status Notice Banner -->
        <div
          *ngIf="currentRefund"
          class="p-4 rounded-3xl text-xs space-y-1.5 print:hidden"
          [ngClass]="{
            'bg-secondary-container/60 border border-secondary/30 text-on-surface': currentRefund.status === 'pending',
            'bg-tertiary-container border border-tertiary/30 text-on-tertiary-container': currentRefund.status === 'approved' || order()!.status === 'refunded',
            'bg-error-container border border-error/20 text-on-error-container': currentRefund.status === 'rejected'
          }"
        >
          <div class="flex items-center justify-between font-bold">
            <span>
              <ng-container *ngIf="currentRefund.status === 'pending'"><i class="fa-solid fa-clock mr-1"></i> Tu solicitud de reembolso está en revisión</ng-container>
              <ng-container *ngIf="currentRefund.status === 'approved' || order()!.status === 'refunded'"><i class="fa-solid fa-circle-check mr-1"></i> Reembolso completado con éxito</ng-container>
              <ng-container *ngIf="currentRefund.status === 'rejected'"><i class="fa-solid fa-circle-xmark mr-1"></i> Solicitud de reembolso rechazada</ng-container>
            </span>
            <span class="font-mono text-[11px] opacity-75">{{ currentRefund.created_at | date:'medium' }}</span>
          </div>
          <p class="opacity-85">
            <strong>Motivo registrado:</strong> {{ currentRefund.reason }}
          </p>
          <p *ngIf="currentRefund.admin_notes" class="italic opacity-90">
            <strong>Respuesta de administración:</strong> "{{ currentRefund.admin_notes }}"
          </p>
        </div>

        <!-- QR Pass Card (Boarding Pass Layout) -->
        <div
          class="rounded-3xl border bg-surface-container shadow-lg overflow-hidden print:bg-white print:shadow-none print:border-2"
          [ngClass]="order()!.status === 'refunded' ? 'border-error/30 opacity-90' : 'border-outline-variant/30 print:border-black'"
        >
          <!-- Dark header strip -->
          <div
            class="px-6 py-4 flex items-center justify-between gap-4 text-inverse-on-surface"
            [ngClass]="order()!.status === 'refunded' ? 'bg-error text-on-error' : 'bg-inverse-surface print:bg-black'"
          >
            <div>
              <span class="text-[10px] font-bold uppercase tracking-widest text-tertiary block">
                {{ order()!.status === 'refunded' ? 'Boleto Inválido / Cancelado' : 'Pase de Acceso Oficial' }}
              </span>
              <span class="font-bold text-base leading-tight">
                {{ order()!.events?.name }}
              </span>
            </div>
            <span *ngIf="order()!.status === 'refunded'" class="text-2xl"><i class="fa-solid fa-ban"></i></span>
            <tf-brand-logo
              *ngIf="order()!.status !== 'refunded'"
              size="xs"
              theme="dark"
              [verified]="true"
              [interactive]="false"
            ></tf-brand-logo>
          </div>

          <!-- QR area -->
          <div class="p-8 flex flex-col items-center gap-5 relative">
            <!-- If Refunded Banner Overlay -->
            <div
              *ngIf="order()!.status === 'refunded'"
              class="w-full p-4 rounded-2xl bg-error-container border border-error/20 text-on-error-container text-center space-y-1"
            >
              <p class="font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-1.5"><i class="fa-solid fa-ban"></i> Este pase ha sido reembolsado y cancelado</p>
              <p class="text-[11px] opacity-80">No es válido para el acceso al recinto.</p>
            </div>

            <!-- QR canvas image (kept bg-white for physical QR scanner contrast) -->
            <div
              *ngIf="order()!.status === 'confirmed'"
              class="p-4 bg-white rounded-2xl border-2 border-outline-variant/30 shadow-inner print:border-black"
            >
              <img
                *ngIf="qrDataUrl()"
                [src]="qrDataUrl()"
                [alt]="'Código QR de validación y acceso oficial para orden ' + (order()?.id?.substring(0, 8) || '')"
                class="w-56 h-56 sm:w-64 sm:h-64 rounded-lg object-contain"
              />
              <div *ngIf="!qrDataUrl()" class="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                <tf-spinner size="md" color="primary"></tf-spinner>
              </div>
            </div>

            <!-- Auth code -->
            <div class="text-center space-y-1">
              <p class="font-mono text-xs text-on-surface-variant tracking-widest font-bold">
                AUTH: {{ order()!.id.substring(0, 16).toUpperCase() }}
              </p>
              <p *ngIf="order()!.status === 'confirmed'" class="text-[10px] text-on-surface-variant/80 print:text-black">
                Presenta este QR en la entrada del recinto desde tu celular o impreso para validar tu acceso.
              </p>
            </div>

            <!-- Ticket breakdown -->
            <div class="w-full divide-y divide-outline-variant/20 border-t border-outline-variant/20 pt-4 text-xs">
              <div *ngFor="let item of order()!.order_items"
                class="py-2.5 flex items-center justify-between text-on-surface"
              >
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center print:bg-gray-200 print:text-black">
                    {{ item.quantity }}
                  </span>
                  <span class="font-semibold">{{ item.ticket_types?.name }}</span>
                  <span class="font-mono text-on-surface-variant text-[10px]">{{ item.ticket_types?.sku }}</span>
                </div>
                <span class="font-mono font-bold">\${{ item.unit_price | number:'1.2-2' }} c/u</span>
              </div>
            </div>

            <!-- Totals -->
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
                <span>Total {{ order()!.status === 'refunded' ? 'reembolsado' : 'pagado' }}</span>
                <span class="font-mono text-primary print:text-black">\${{ order()!.total | number:'1.2-2' }} MXN</span>
              </div>
            </div>
          </div>

          <!-- Holder strip -->
          <div class="px-6 py-4 bg-surface border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant print:bg-gray-100">
            <div>
              <span class="font-bold text-on-surface block">Titular del boleto</span>
              <span>{{ auth.user()?.user_metadata?.['full_name'] || auth.user()?.email }}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-on-surface block">Método de pago</span>
              <span class="capitalize">{{ order()!.payment_provider }}</span>
            </div>
          </div>
        </div>

        <!-- Action Bar & Buttons -->
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
            <span>Imprimir / Guardar en PDF</span>
          </button>

          <button
            *ngIf="canRequestRefund()"
            type="button"
            (click)="showRefundModal.set(true)"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-error-container hover:bg-error/20 text-on-error-container border border-error/20 font-bold text-xs transition-all shadow-sm"
          >
            <i class="fa-solid fa-money-bill-transfer"></i>
            <span>Solicitar Reembolso</span>
          </button>
        </div>

        <p *ngIf="order()!.status === 'confirmed'" class="text-center text-xs text-on-surface-variant print:hidden">
          <i class="fa-regular fa-lightbulb text-secondary mr-1"></i> Puedes descargar el código QR o tomar captura de pantalla para acceder sin internet.
        </p>
      </div>

      <!-- Refund Request Modal -->
      <div
        *ngIf="showRefundModal()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in print:hidden"
      >
        <div class="relative w-full max-w-lg bg-surface-container-high rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-outline-variant/30">
          <!-- Close Button -->
          <button
            type="button"
            (click)="closeRefundModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-variant text-on-surface-variant font-bold flex items-center justify-center transition-colors"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <!-- Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-widest text-error block">
              Garantía y Devolución
            </span>
            <h3 class="text-xl font-bold text-on-surface">
              Solicitar Reembolso
            </h3>
            <p class="text-xs text-on-surface-variant">
              Orden #{{ order()!.id.substring(0, 8).toUpperCase() }} · Total: <strong class="text-on-surface">\${{ order()!.total | number:'1.2-2' }} MXN</strong>
            </p>
          </div>

          <!-- Notice Alert -->
          <div class="p-3.5 rounded-2xl bg-secondary-container/50 border border-secondary/30 text-xs text-on-surface space-y-1">
            <p class="font-bold flex items-center gap-1.5 text-primary">
              <i class="fa-solid fa-triangle-exclamation text-primary"></i> Políticas de Devolución:
            </p>
            <p class="text-[11px] text-on-surface-variant leading-relaxed">
              Tu solicitud será evaluada por la administración. Una vez aprobado, el importe se reintegrará y los boletos quedarán inválidos de forma permanente.
            </p>
          </div>

          <!-- Form -->
          <div class="space-y-4 text-xs">
            <div class="space-y-1.5">
              <label class="font-bold text-on-surface">Categoría del Motivo:</label>
              <select
                [(ngModel)]="refundCategory"
                class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="Cancelación de planes personales">Cancelación de planes personales</option>
                <option value="Error en la compra o cantidad de boletos">Error en la compra o duplicidad</option>
                <option value="Imprevisto médico o de fuerza mayor">Imprevisto médico o de fuerza mayor</option>
                <option value="Inconformidad o cambio en el evento">Inconformidad o cambio en el evento</option>
                <option value="Otro motivo">Otro motivo</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="font-bold text-on-surface">Explica brevemente tu caso (mínimo 5 caracteres):</label>
              <textarea
                [(ngModel)]="refundDetails"
                rows="3"
                placeholder="Por favor describe detalladamente la razón de tu solicitud de reembolso..."
                class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface font-medium focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              ></textarea>
            </div>

            <!-- Error in modal -->
            <p *ngIf="refundError()" class="text-error font-bold text-xs">
              {{ refundError() }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
            <button
              type="button"
              (click)="closeRefundModal()"
              [disabled]="isSubmittingRefund()"
              class="px-4 py-2.5 rounded-xl text-on-surface-variant font-bold text-xs hover:bg-surface-variant transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="submitRefundRequest()"
              [disabled]="isSubmittingRefund()"
              class="px-5 py-2.5 rounded-xl bg-error hover:bg-error/90 text-on-error font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <tf-spinner *ngIf="isSubmittingRefund()" size="sm" color="white"></tf-spinner>
              <span>{{ isSubmittingRefund() ? 'Enviando...' : 'Confirmar Solicitud' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TicketDetailComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly myTicketsService = inject(MyTicketsService);
  readonly auth                    = inject(AuthService);
  private readonly platformId      = inject(PLATFORM_ID);

  readonly isLoading  = signal(true);
  readonly order      = signal<OrderWithRelations | null>(null);
  readonly qrDataUrl  = signal<string | null>(null);

  // Refund State
  readonly showRefundModal = signal(false);
  readonly isSubmittingRefund = signal(false);
  readonly refundError = signal<string | null>(null);
  refundCategory = 'Cancelación de planes personales';
  refundDetails = '';

  // Toast feedback
  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<'success' | 'error'>('success');

  get currentRefund(): RefundRequest | null {
    const o = this.order();
    if (!o?.refund_requests) return null;
    if (Array.isArray(o.refund_requests)) {
      return o.refund_requests[0] || null;
    }
    return o.refund_requests as RefundRequest;
  }

  canRequestRefund(): boolean {
    const o = this.order();
    if (!o || o.status !== 'confirmed') return false;
    if (this.currentRefund) return false;
    if (!o.events?.event_date) return false;
    return new Date(o.events.event_date).getTime() > Date.now();
  }

  async ngOnInit(): Promise<void> {
    await this.loadOrderDetail();
  }

  private async loadOrderDetail(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (!orderId) { this.isLoading.set(false); return; }

    try {
      const userId = this.auth.user()?.id;
      if (!userId) { this.isLoading.set(false); return; }

      const orders = await this.myTicketsService.getMyOrders(userId);
      const found  = orders.find((o) => o.id === orderId) ?? null;
      this.order.set(found);

      // Generate QR locally if in browser and order is confirmed
      if (found && found.status === 'confirmed' && isPlatformBrowser(this.platformId)) {
        const payload = `TICKETFLOW-AUTH-${found.id}`;
        const url = await generateQrDataUrl(payload, 400);
        this.qrDataUrl.set(url);
      }
    } catch (err) {
      console.error('TicketDetail error:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  printPass(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
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

  closeRefundModal(): void {
    this.showRefundModal.set(false);
    this.refundError.set(null);
  }

  async submitRefundRequest(): Promise<void> {
    const o = this.order();
    if (!o) return;

    const reason = this.refundDetails.trim()
      ? `[${this.refundCategory}] ${this.refundDetails.trim()}`
      : `[${this.refundCategory}] Solicitud de reembolso por parte del usuario.`;

    if (reason.length < 5) {
      this.refundError.set('Por favor describe tu motivo con al menos 5 caracteres.');
      return;
    }

    this.isSubmittingRefund.set(true);
    this.refundError.set(null);

    try {
      const res = await this.myTicketsService.requestRefund(o.id, reason);
      if (res.success) {
        this.closeRefundModal();
        this.feedbackType.set('success');
        this.feedbackMessage.set('Solicitud de reembolso enviada con éxito.');
        await this.loadOrderDetail();
      } else {
        this.refundError.set(res.error || 'No se pudo procesar la solicitud.');
      }
    } catch (err: any) {
      this.refundError.set(err.message || 'Ocurrió un error inesperado.');
    } finally {
      this.isSubmittingRefund.set(false);
    }
  }
}

