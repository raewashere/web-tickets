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

@Component({
  selector: 'store-ticket-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
          <span>🎟️</span> Selecciona tus Boletos
        </h3>
        <span class="text-xs text-slate-500 font-medium">
          Máx. 10 boletos
        </span>
      </div>

      <!-- Tickets List -->
      <div *ngIf="ticketTypes.length > 0" class="space-y-3.5">
        <div
          *ngFor="let t of ticketTypes"
          class="p-4 rounded-2xl border transition-all duration-200 space-y-3"
          [class.border-cyan-500]="getQuantity(t.id) > 0"
          [class.bg-cyan-50\/40]="getQuantity(t.id) > 0"
          [class.border-slate-200]="getQuantity(t.id) === 0"
          [class.bg-white]="getQuantity(t.id) === 0"
          [class.opacity-60]="t.available <= 0"
        >
          <!-- Top: Name, SKU, Availability & Description -->
          <div class="space-y-1">
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-bold text-sm text-slate-900 leading-snug">{{ t.name }}</h4>
              <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                {{ t.sku }}
              </span>
            </div>

            <p *ngIf="t.description" class="text-xs text-slate-500 line-clamp-2">
              {{ t.description }}
            </p>

            <div class="text-xs pt-0.5">
              <span *ngIf="t.available > 0" class="text-emerald-700 font-semibold text-[11px]">
                ● {{ t.available }} disponibles
              </span>
              <span *ngIf="t.available <= 0" class="text-rose-600 font-bold uppercase tracking-wider text-[10px]">
                Agotado
              </span>
            </div>
          </div>

          <!-- Bottom: Price & Stepper -->
          <div class="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block leading-none">Precio</span>
              <span class="font-black text-base text-slate-900 font-mono mt-0.5 block">
                \${{ t.price | number:'1.2-2' }} <span class="text-[10px] font-normal text-slate-400">MXN</span>
              </span>
            </div>

            <!-- Stepper -->
            <div *ngIf="t.available > 0" class="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200 shrink-0">
              <button
                type="button"
                (click)="decrement(t)"
                [disabled]="getQuantity(t.id) <= 0"
                class="w-7 h-7 rounded-lg bg-white text-slate-800 font-black flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm text-sm select-none"
              >
                −
              </button>

              <span class="w-7 text-center font-bold text-sm text-slate-900 font-mono select-none">
                {{ getQuantity(t.id) }}
              </span>

              <button
                type="button"
                (click)="increment(t)"
                [disabled]="getQuantity(t.id) >= Math.min(10, t.available) || totalCount >= 10"
                class="w-7 h-7 rounded-lg bg-cyan-400 text-slate-950 font-black flex items-center justify-center hover:bg-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm text-sm select-none"
              >
                +
              </button>
            </div>

            <div *ngIf="t.available <= 0" class="text-xs text-slate-400 font-bold italic shrink-0">
              No disponible
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="ticketTypes.length === 0" class="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-2xl">
        <span class="text-3xl block mb-1">🎫</span>
        <span>Aún no hay localidades disponibles para la venta.</span>
      </div>

      <!-- Floating or Bottom Summary Box -->
      <div *ngIf="totalCount > 0" class="p-5 sm:p-6 rounded-2xl bg-slate-900 text-white space-y-4 shadow-xl border border-slate-800">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs text-slate-400 uppercase font-bold tracking-wider block">Resumen</span>
            <span class="text-sm font-semibold text-slate-200">
              {{ totalCount }} {{ totalCount === 1 ? 'boleto seleccionado' : 'boletos seleccionados' }}
            </span>
          </div>

          <div class="text-right">
            <span class="text-xs text-slate-400 block">Total a pagar:</span>
            <span class="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              \${{ totalPrice | number:'1.2-2' }} MXN
            </span>
          </div>
        </div>

        <button
          type="button"
          class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20"
          (click)="onProceed()"
        >
          <span>Continuar con {{ totalCount }} {{ totalCount === 1 ? 'Boleto' : 'Boletos' }} →</span>
        </button>
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
