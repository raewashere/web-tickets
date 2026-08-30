import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TicketTypeWithAvailability } from '@ticketflow/models';
import type { CartTicketItem } from './event-detail.service';
import { ButtonComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-ticket-selector',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-dark/10">
        <h3 class="text-lg font-black text-dark flex items-center gap-2">
          <span>🎟️</span> Selecciona tus Boletos
        </h3>
        <span class="text-xs text-dark/60">
          Máximo 10 boletos por orden
        </span>
      </div>

      <!-- Tickets List -->
      <div *ngIf="ticketTypes.length > 0" class="space-y-4">
        <div
          *ngFor="let t of ticketTypes"
          class="p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          [class.border-primary]="getQuantity(t.id) > 0"
          [class.bg-primary\/5]="getQuantity(t.id) > 0"
          [class.border-dark\/10]="getQuantity(t.id) === 0"
          [class.bg-surface]="getQuantity(t.id) === 0"
          [class.opacity-60]="t.available <= 0"
        >
          <!-- Left: Details -->
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-base text-dark">{{ t.name }}</h4>
              <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-dark/10 text-dark">
                {{ t.sku }}
              </span>
            </div>

            <p *ngIf="t.description" class="text-xs text-dark/70 max-w-md">
              {{ t.description }}
            </p>

            <div class="text-xs">
              <span *ngIf="t.available > 0" class="text-green-700 font-semibold">
                ● {{ t.available }} disponibles
              </span>
              <span *ngIf="t.available <= 0" class="text-contrast font-bold uppercase tracking-wider text-[10px]">
                Agotado
              </span>
            </div>
          </div>

          <!-- Right: Price & Stepper -->
          <div class="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-dark/10">
            <div class="text-right">
              <span class="text-xs text-dark/50 block">Precio por boleto</span>
              <span class="font-black text-lg text-dark font-mono">
                \${{ t.price | number:'1.2-2' }}
              </span>
            </div>

            <!-- Stepper -->
            <div *ngIf="t.available > 0" class="flex items-center gap-2 bg-dark/5 rounded-xl p-1 border border-dark/10">
              <button
                type="button"
                (click)="decrement(t)"
                [disabled]="getQuantity(t.id) <= 0"
                class="w-8 h-8 rounded-lg bg-surface text-dark font-black flex items-center justify-center hover:bg-dark/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
              >
                −
              </button>

              <span class="w-8 text-center font-bold text-sm text-dark font-mono">
                {{ getQuantity(t.id) }}
              </span>

              <button
                type="button"
                (click)="increment(t)"
                [disabled]="getQuantity(t.id) >= Math.min(10, t.available) || totalCount >= 10"
                class="w-8 h-8 rounded-lg bg-primary text-dark font-black flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
              >
                +
              </button>
            </div>

            <div *ngIf="t.available <= 0" class="text-xs text-dark/40 font-bold italic">
              No disponible
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="ticketTypes.length === 0" class="p-8 text-center text-dark/50 border border-dashed border-dark/20 rounded-2xl">
        <span class="text-3xl block mb-1">🎫</span>
        <span>Aún no hay localidades disponibles para la venta.</span>
      </div>

      <!-- Floating or Bottom Summary Box -->
      <div *ngIf="totalCount > 0" class="p-6 rounded-2xl bg-dark text-surface space-y-4 shadow-2xl border border-surface/10">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs text-surface/60 uppercase font-bold tracking-wider block">Resumen de Selección</span>
            <span class="text-sm font-semibold text-surface">
              {{ totalCount }} {{ totalCount === 1 ? 'boleto seleccionado' : 'boletos seleccionados' }}
            </span>
          </div>

          <div class="text-right">
            <span class="text-xs text-surface/60 block">Total a pagar:</span>
            <span class="text-2xl font-black text-accent font-mono">
              \${{ totalPrice | number:'1.2-2' }} MXN
            </span>
          </div>
        </div>

        <tf-button
          type="button"
          variant="primary"
          size="lg"
          class="w-full"
          (click)="onProceed()"
        >
          <span>Continuar con {{ totalCount }} {{ totalCount === 1 ? 'Boleto' : 'Boletos' }} →</span>
        </tf-button>
      </div>
    </div>
  `,
})
export class TicketSelectorComponent implements OnInit, OnChanges {
  @Input() ticketTypes: TicketTypeWithAvailability[] = [];
  @Output() checkoutRequested = new EventEmitter<CartTicketItem[]>();

  protected readonly Math = Math;

  quantities: Record<string, number> = {};

  ngOnInit(): void {
    this.initQuantities();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticketTypes']) {
      this.initQuantities();
    }
  }

  private initQuantities(): void {
    this.quantities = {};
    for (const t of this.ticketTypes) {
      this.quantities[t.id] = 0;
    }
  }

  getQuantity(ticketId: string): number {
    return this.quantities[ticketId] || 0;
  }

  get totalCount(): number {
    return Object.values(this.quantities).reduce((a, b) => a + b, 0);
  }

  get totalPrice(): number {
    return this.ticketTypes.reduce((acc, t) => {
      const q = this.getQuantity(t.id);
      return acc + q * Number(t.price);
    }, 0);
  }

  increment(t: TicketTypeWithAvailability): void {
    const current = this.getQuantity(t.id);
    const maxAllowed = Math.min(10, t.available);
    if (current < maxAllowed && this.totalCount < 10) {
      this.quantities[t.id] = current + 1;
    }
  }

  decrement(t: TicketTypeWithAvailability): void {
    const current = this.getQuantity(t.id);
    if (current > 0) {
      this.quantities[t.id] = current - 1;
    }
  }

  onProceed(): void {
    const selectedItems: CartTicketItem[] = [];
    for (const t of this.ticketTypes) {
      const q = this.getQuantity(t.id);
      if (q > 0) {
        selectedItems.push({
          ticketType: t,
          quantity: q,
        });
      }
    }
    this.checkoutRequested.emit(selectedItems);
  }
}
