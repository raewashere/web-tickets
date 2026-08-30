import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { EventWithRelations, TicketType } from '@ticketflow/models';
import { ButtonComponent } from '@ticketflow/shared-ui';

export type StoreEventItem = EventWithRelations & {
  ticket_types?: TicketType[];
};

@Component({
  selector: 'store-event-card',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <div
      class="group rounded-3xl border border-dark/10 bg-surface hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between"
    >
      <div>
        <!-- Flyer Image Banner with Date Badge -->
        <div class="relative aspect-[4/3] bg-dark/10 overflow-hidden">
          <img
            *ngIf="event.flyer_url"
            [src]="event.flyer_url"
            [alt]="event.name"
            class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          <div *ngIf="!event.flyer_url" class="w-full h-full flex flex-col items-center justify-center text-dark/30">
            <span class="text-5xl">🎸</span>
            <span class="text-xs font-bold mt-1">TicketFlow Live</span>
          </div>

          <!-- Date Overlay Box -->
          <div
            *ngIf="event.event_date"
            class="absolute top-3 left-3 px-3 py-1.5 rounded-2xl bg-surface/95 backdrop-blur-md shadow-md text-center border border-dark/10 flex flex-col items-center"
          >
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-contrast">
              {{ event.event_date | date:'MMM' }}
            </span>
            <span class="text-base font-black text-dark leading-none">
              {{ event.event_date | date:'dd' }}
            </span>
          </div>

          <!-- Category Chip -->
          <div *ngIf="event.event_types" class="absolute top-3 right-3">
            <span class="px-2.5 py-1 rounded-xl bg-dark/80 backdrop-blur-md text-surface text-[10px] font-bold uppercase tracking-wider shadow">
              {{ event.event_types.name }}
            </span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-5 space-y-3">
          <!-- Artist / Co-artist -->
          <div class="flex items-center gap-2 text-xs font-semibold text-dark/70">
            <span class="w-2 h-2 rounded-full bg-primary inline-block"></span>
            <span class="truncate">{{ event.artists?.name || 'Artista Invitado' }}</span>
          </div>

          <!-- Event Title -->
          <h3 class="font-extrabold text-lg text-dark group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            <a [routerLink]="['/events', event.id]">{{ event.name }}</a>
          </h3>

          <!-- Venue & Time -->
          <div class="space-y-1 text-xs text-dark/60">
            <p class="flex items-center gap-1.5 truncate">
              <span>📍</span>
              <span class="font-medium truncate">{{ event.venues?.name || 'Recinto por confirmar' }}</span>
            </p>
            <p class="flex items-center gap-1.5">
              <span>🕒</span>
              <span>{{ event.event_date | date:'shortTime' }} hrs</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Card Footer -->
      <div class="p-5 pt-0 border-t border-dark/5 flex items-center justify-between gap-3 mt-2">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-dark/40 block">Boletos desde</span>
          <span class="font-black text-base text-dark font-mono">
            {{ minPriceText }}
          </span>
        </div>

        <a [routerLink]="['/events', event.id]">
          <tf-button variant="primary" size="sm">
            Comprar Boletos
          </tf-button>
        </a>
      </div>
    </div>
  `,
})
export class EventCardComponent {
  @Input({ required: true }) event!: StoreEventItem;

  get minPriceText(): string {
    if (!this.event.ticket_types || this.event.ticket_types.length === 0) {
      return 'Próximamente';
    }
    const prices = this.event.ticket_types
      .filter((t) => t.is_active)
      .map((t) => Number(t.price));

    if (prices.length === 0) return 'Próximamente';
    const min = Math.min(...prices);
    return min === 0 ? 'Entrada Libre' : `$${min.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
  }
}
