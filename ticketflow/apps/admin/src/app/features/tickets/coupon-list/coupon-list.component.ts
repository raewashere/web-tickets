import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TicketsService } from '../tickets.service';
import { EventsService } from '../../events/events.service';
import { CouponFormComponent } from '../coupon-form/coupon-form.component';
import type {
  Coupon,
  EventWithRelations,
} from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  StatCardComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-coupon-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    StatCardComponent,
    SpinnerComponent,
    CouponFormComponent,
  ],
  template: `
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Breadcrumbs & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav class="flex items-center gap-2 text-xs text-dark/60 mb-2">
            <a routerLink="/events" class="hover:text-primary transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Eventos
            </a>
            <span>/</span>
            <a *ngIf="event()" [routerLink]="['/events', event()!.id]" class="hover:text-primary transition-colors">
              {{ event()!.name }}
            </a>
            <span>/</span>
            <span class="text-dark font-semibold">Cupones</span>
          </nav>

          <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
            Cupones & Cortesías
          </h1>
          <p class="text-sm text-dark/60 mt-1">
            Gestiona descuentos promocionales, pases de prensa y cortesías especiales.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <a *ngIf="eventId" [routerLink]="['/events', eventId, 'tickets']">
            <tf-button variant="secondary" size="md">
              <i class="fa-solid fa-ticket mr-1.5"></i> Ver Boletos
            </tf-button>
          </a>

          <tf-button
            variant="primary"
            size="md"
            (click)="openCreateModal()"
          >
            <i class="fa-solid fa-plus mr-1.5"></i> Crear Cupón
          </tf-button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <tf-stat-card
          label="Total de Cupones"
          [value]="coupons().length"
          icon="fa-solid fa-tags"
        ></tf-stat-card>
        <tf-stat-card
          label="Cupones Activos"
          [value]="activeCount()"
          icon="fa-solid fa-circle-check"
        ></tf-stat-card>
        <tf-stat-card
          label="Canjes Realizados"
          [value]="totalUsesCount()"
          icon="fa-solid fa-users"
        ></tf-stat-card>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando cupones...</p>
      </div>

      <!-- Error alert -->
      <div
        *ngIf="errorMessage()"
        class="p-4 rounded-xl bg-contrast/10 border border-contrast/30 text-contrast text-sm flex items-center gap-3"
      >
        <i class="fa-solid fa-circle-exclamation text-contrast text-base shrink-0"></i>
        <span>{{ errorMessage() }}</span>
      </div>

      <!-- Coupons List -->
      <div *ngIf="!isLoading() && coupons().length > 0" class="space-y-4">
        <div
          *ngFor="let c of coupons()"
          class="p-5 rounded-2xl border border-dark/10 bg-surface hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
        >
          <!-- Left: Code & Type -->
          <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2.5">
              <span class="font-mono font-extrabold text-base text-dark uppercase px-2.5 py-1 rounded-lg bg-accent/20 border border-accent/40">
                {{ c.code }}
              </span>

              <tf-badge [variant]="c.is_active ? 'success' : 'default'">
                {{ c.is_active ? 'Activo' : 'Inactivo' }}
              </tf-badge>

              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-dark/5 text-dark/80">
                {{ formatType(c.type) }}
              </span>

              <span
                *ngIf="c.ticket_sku"
                class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/20 text-dark border border-primary/30 flex items-center gap-1"
              >
                <i class="fa-solid fa-ticket text-[10px]"></i> SKU: {{ c.ticket_sku }}
              </span>
              <span
                *ngIf="!c.ticket_sku"
                class="text-xs px-2 py-0.5 rounded bg-dark/5 text-dark/50 font-medium"
              >
                Todos los boletos
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-xs text-dark/60">
              <span>Válido desde: <strong>{{ c.valid_from | date:'mediumDate' }}</strong></span>
              <span *ngIf="c.valid_until">Hasta: <strong>{{ c.valid_until | date:'mediumDate' }}</strong></span>
              <span *ngIf="!c.valid_until">Sin vencimiento</span>
            </div>
          </div>

          <!-- Middle: Discount Amount & Uses -->
          <div class="flex items-center gap-6">
            <div class="text-center">
              <span class="text-[10px] uppercase font-bold text-dark/50 block">Descuento</span>
              <span class="font-mono font-extrabold text-base text-contrast">
                {{ c.value ? (c.type === 'percentage' ? c.value + '%' : '$' + c.value + ' MXN') : '100% Cortesía' }}
              </span>
            </div>

            <div class="text-center min-w-[90px]">
              <span class="text-[10px] uppercase font-bold text-dark/50 block">Usos</span>
              <span class="font-mono font-bold text-sm text-dark">
                {{ c.uses_count }} / {{ c.max_uses || '∞' }}
              </span>
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              (click)="copyCode(c.code)"
              class="p-2 rounded-xl text-dark/70 hover:text-dark hover:bg-dark/10 transition-colors text-xs flex items-center gap-1 font-semibold"
              title="Copiar código"
            >
              <i class="fa-regular fa-copy"></i> Copiar
            </button>
            <button
              type="button"
              (click)="editCoupon(c)"
              class="p-2 rounded-xl text-dark/70 hover:text-dark hover:bg-dark/10 transition-colors text-xs"
              title="Editar Cupón"
            >
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button
              type="button"
              (click)="deleteCoupon(c)"
              class="p-2 rounded-xl text-contrast/70 hover:text-contrast hover:bg-contrast/10 transition-colors text-xs"
              title="Eliminar Cupón"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <tf-card *ngIf="!isLoading() && coupons().length === 0">
        <div class="py-12 text-center text-dark/60">
          <div class="text-5xl mb-3 text-dark/30">
            <i class="fa-solid fa-tags"></i>
          </div>
          <h3 class="text-lg font-bold text-dark">No hay cupones registrados</h3>
          <p class="text-sm text-dark/60 max-w-md mx-auto mt-1 mb-5">
            Crea códigos promocionales porcentuales (ej. 20% OFF) o cortesías directas para invitados especiales.
          </p>
          <tf-button variant="primary" size="md" (click)="openCreateModal()">
            <i class="fa-solid fa-plus mr-1.5"></i> Crear Primer Cupón
          </tf-button>
        </div>
      </tf-card>

      <!-- Coupon Form Modal -->
      <app-coupon-form
        *ngIf="showModal()"
        [eventId]="eventId!"
        [coupon]="selectedCoupon()"
        (saved)="onCouponSaved($event)"
        (cancelled)="closeModal()"
      ></app-coupon-form>
    </div>
  `,
})
export class CouponListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketsService = inject(TicketsService);
  private readonly eventsService = inject(EventsService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly coupons = signal<Coupon[]>([]);
  readonly event = signal<EventWithRelations | null>(null);

  readonly showModal = signal(false);
  readonly selectedCoupon = signal<Coupon | null>(null);

  eventId: string | null = null;

  readonly activeCount = computed(() =>
    this.coupons().filter((c) => c.is_active).length
  );
  readonly totalUsesCount = computed(() =>
    this.coupons().reduce((acc, c) => acc + (c.uses_count || 0), 0)
  );

  async ngOnInit(): Promise<void> {
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      await this.loadData(this.eventId);
    }
  }

  async loadData(id: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const [eventData, couponData] = await Promise.all([
        this.eventsService.getEvent(id),
        this.ticketsService.getCoupons(id),
      ]);

      this.event.set(eventData);
      this.coupons.set(couponData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los cupones';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatType(type: string): string {
    switch (type) {
      case 'percentage':
        return 'Porcentual';
      case 'fixed':
        return 'Monto Fijo';
      case 'courtesy':
        return 'Cortesía (100%)';
      default:
        return type;
    }
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code);
    alert(`Código "${code}" copiado al portapapeles.`);
  }

  openCreateModal(): void {
    this.selectedCoupon.set(null);
    this.showModal.set(true);
  }

  editCoupon(coupon: Coupon): void {
    this.selectedCoupon.set(coupon);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedCoupon.set(null);
  }

  async onCouponSaved(coupon: Coupon): Promise<void> {
    this.closeModal();
    if (this.eventId) {
      await this.loadData(this.eventId);
    }
  }

  async deleteCoupon(coupon: Coupon): Promise<void> {
    if (coupon.uses_count > 0) {
      if (!confirm(`Este cupón ya ha sido canjeado ${coupon.uses_count} veces. ¿Seguro que deseas eliminarlo?`)) {
        return;
      }
    } else if (!confirm(`¿Estás seguro de eliminar el cupón "${coupon.code}"?`)) {
      return;
    }

    try {
      await this.ticketsService.deleteCoupon(coupon.id);
      if (this.eventId) {
        await this.loadData(this.eventId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar cupón');
    }
  }
}
