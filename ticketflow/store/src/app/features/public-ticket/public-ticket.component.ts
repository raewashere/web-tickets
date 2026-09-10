import {
  Component,
  OnInit,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
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
}

@Component({
  selector: 'store-public-ticket',
  standalone: true,
  imports: [
    CommonModule,
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
          class="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-cyan-600 transition-colors"
        >
          <i class="fa-solid fa-house"></i> Inicio TicketFlow
        </a>

        <button
          *ngIf="order()?.status === 'confirmed'"
          type="button"
          (click)="printPass()"
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-colors"
        >
          <i class="fa-solid fa-print"></i>
          <span>Imprimir / Descargar PDF</span>
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3 print:hidden">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-slate-500">Cargando pase de acceso y código QR...</p>
      </div>

      <!-- Error / Invalid Token State -->
      <div
        *ngIf="!isLoading() && errorMessage()"
        class="py-16 text-center space-y-4 rounded-3xl border border-dashed border-slate-300 p-8 bg-white shadow-sm print:hidden"
      >
        <div class="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-900">Acceso no válido o boleto expirado</h2>
        <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
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
            <p class="text-xs text-slate-400 font-mono">
              Pase Digital · Orden #{{ order()!.id.substring(0, 8).toUpperCase() }}
            </p>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {{ order()!.event?.name || order()!.event?.title || 'Espectáculo en Vivo' }}
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              <i class="fa-solid fa-location-dot text-cyan-600 mr-1"></i> {{ order()!.event?.venue?.name || 'Recinto Confirmado' }}
              &nbsp;·&nbsp;
              <i class="fa-regular fa-calendar text-cyan-600 mr-1"></i> {{ order()!.event?.event_date | date:'mediumDate' }}
            </p>
          </div>

          <div>
            <tf-badge *ngIf="order()!.status === 'confirmed'" variant="success">
              Pase Válido
            </tf-badge>
            <span
              *ngIf="order()!.status === 'refunded'"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200"
            >
              Cancelado / Reembolsado
            </span>
          </div>
        </div>

        <!-- Boarding Pass QR Card -->
        <div
          class="rounded-3xl border bg-white shadow-xl overflow-hidden print:shadow-none print:border-2"
          [ngClass]="order()!.status === 'refunded' ? 'border-rose-300' : 'border-slate-200 print:border-black'"
        >
          <!-- Header Banner -->
          <div
            class="px-6 py-4 flex items-center justify-between text-white"
            [ngClass]="order()!.status === 'refunded' ? 'bg-rose-950' : 'bg-slate-900 print:bg-black'"
          >
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 block">
                {{ order()!.status === 'refunded' ? 'Boleto Invalidadas' : 'Pase Oficial de Entrada' }}
              </span>
              <span class="text-white font-black text-base leading-tight">
                {{ order()!.event?.name || order()!.event?.title }}
              </span>
            </div>
            <span class="text-2xl"><i class="fa-solid" [ngClass]="order()!.status === 'refunded' ? 'fa-ban text-rose-400' : 'fa-ticket text-cyan-400'"></i></span>
          </div>

          <!-- QR & Access Details -->
          <div class="p-8 flex flex-col items-center gap-6">
            <!-- Refunded Warning Banner -->
            <div
              *ngIf="order()!.status === 'refunded'"
              class="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-1"
            >
              <p class="font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-ban text-rose-600"></i> Pase Cancelado
              </p>
              <p class="text-[11px] text-rose-600">Esta orden fue reembolsada y el código QR se encuentra inhabilitado.</p>
            </div>

            <!-- QR Code -->
            <div
              *ngIf="order()!.status === 'confirmed'"
              class="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-inner print:border-black"
            >
              <img
                *ngIf="qrDataUrl()"
                [src]="qrDataUrl()"
                [alt]="'Código QR de acceso oficial TicketFlow orden ' + order()!.id.substring(0, 8)"
                class="w-56 h-56 sm:w-64 sm:h-64 rounded-lg object-contain"
              />
              <div *ngIf="!qrDataUrl()" class="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                <tf-spinner size="md" color="primary"></tf-spinner>
              </div>
            </div>

            <!-- Auth String -->
            <div class="text-center space-y-1">
              <p class="font-mono text-xs text-slate-400 tracking-widest font-bold">
                AUTH: {{ order()!.id.substring(0, 16).toUpperCase() }}
              </p>
              <p *ngIf="order()!.status === 'confirmed'" class="text-[10px] text-slate-500 print:text-black">
                Muestra este código QR desde tu pantalla o impreso en el control de acceso del recinto.
              </p>
            </div>

            <!-- Items Breakdown -->
            <div class="w-full divide-y divide-slate-100 border-t border-slate-100 pt-4 text-xs">
              <div
                *ngFor="let item of order()!.items"
                class="py-2.5 flex items-center justify-between text-slate-800"
              >
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 font-black text-xs flex items-center justify-center print:bg-slate-200 print:text-black">
                    {{ item.quantity }}
                  </span>
                  <span class="font-semibold">{{ item.ticket_type?.name || 'Localidad' }}</span>
                </div>
                <span class="font-mono font-bold">\${{ item.unit_price | number:'1.2-2' }} c/u</span>
              </div>
            </div>

            <!-- Financial Summary -->
            <div class="w-full space-y-1 border-t border-slate-100 pt-3 text-xs">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span class="font-mono">\${{ order()!.subtotal | number:'1.2-2' }}</span>
              </div>
              <div *ngIf="order()!.discount_amount > 0" class="flex justify-between text-amber-600 font-bold">
                <span>Descuento</span>
                <span class="font-mono">-\${{ order()!.discount_amount | number:'1.2-2' }}</span>
              </div>
              <div class="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-slate-100">
                <span>Total Pagado</span>
                <span class="font-mono text-cyan-600 print:text-black">\${{ order()!.total | number:'1.2-2' }} MXN</span>
              </div>
            </div>
          </div>

          <!-- Holder Footer Strip -->
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 print:bg-slate-100">
            <div>
              <span class="font-bold text-slate-900 block">Titular / Comprador</span>
              <span>{{ order()!.guest_name || order()!.guest_email || 'Invitado' }}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-slate-900 block">Fecha de Compra</span>
              <span>{{ order()!.created_at | date:'short' }}</span>
            </div>
          </div>
        </div>

        <!-- Account Conversion Banner for Guest -->
        <div *ngIf="!auth.user()" class="p-6 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-lg space-y-3 print:hidden">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-user-plus"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-sm text-white">¿Quieres guardar todos tus boletos en un solo lugar?</h3>
              <p class="text-xs text-white/90">Crea tu cuenta en TicketFlow para acceder a tus compras cuando quieras.</p>
            </div>
          </div>
          <div class="pt-1 flex justify-end">
            <a routerLink="/register">
              <button
                type="button"
                class="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-colors"
              >
                Crear Cuenta Gratis <i class="fa-solid fa-arrow-right ml-1"></i>
              </button>
            </a>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden pt-2">
          <button
            *ngIf="order()!.status === 'confirmed'"
            type="button"
            (click)="printPass()"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs transition-all shadow-md"
          >
            <i class="fa-solid fa-print"></i>
            <span>Imprimir / Descargar en PDF</span>
          </button>
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

  async ngOnInit(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    const token   = this.route.snapshot.queryParamMap.get('token');

    if (!orderId || !token) {
      this.errorMessage.set('El enlace de acceso al boleto es incompleto o no contiene el token de seguridad.');
      this.isLoading.set(false);
      return;
    }

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

  printPass(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }
}
