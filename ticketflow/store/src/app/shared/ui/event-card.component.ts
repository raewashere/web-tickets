import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { EventWithRelations, TicketType, Artist } from '@ticketflow/models';

export type StoreEventItem = EventWithRelations & {
  ticket_types?: TicketType[];
};

@Component({
  selector: 'store-event-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="group rounded-3xl border border-slate-200/80 bg-white hover:border-cyan-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm"
    >
      <div>
        <!-- Flyer Image Banner with Date Badge -->
        <div class="relative aspect-[4/3] bg-slate-100 overflow-hidden">
          <img
            *ngIf="event.flyer_url"
            [src]="event.flyer_url"
            [alt]="event.name"
            class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          <div *ngIf="!event.flyer_url" class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
            <span class="text-5xl">🎸</span>
            <span class="text-xs font-bold mt-1 text-slate-500">TicketFlow Live</span>
          </div>

          <!-- Date Overlay Box -->
          <div
            *ngIf="event.event_date"
            class="absolute top-3 left-3 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-md text-center border border-slate-200 flex flex-col items-center"
          >
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">
              {{ event.event_date | date:'MMM' }}
            </span>
            <span class="text-base font-black text-slate-900 leading-none">
              {{ event.event_date | date:'dd' }}
            </span>
          </div>

          <!-- Category Chip -->
          <div *ngIf="event.event_types" class="absolute top-3 right-3">
            <span class="px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider shadow">
              {{ event.event_types.name }}
            </span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-5 space-y-3">
          <!-- Artist / Co-artist -->
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
            <button
              *ngIf="event.artists"
              type="button"
              (click)="$event.stopPropagation(); artistClick.emit(event.artists)"
              class="flex items-center gap-1.5 hover:text-cyan-600 transition-colors text-left truncate group/artist"
              title="Ver perfil del artista"
            >
              <span class="w-2 h-2 rounded-full bg-cyan-500 inline-block shrink-0"></span>
              <span class="truncate font-bold text-slate-700 group-hover/artist:text-cyan-600">{{ event.artists?.name }}</span>
              <span class="text-[10px] text-cyan-600 shrink-0 font-medium opacity-80 group-hover/artist:opacity-100">· Ver perfil ↗</span>
            </button>
            <span *ngIf="!event.artists" class="text-slate-400">Artista Invitado</span>
          </div>

          <!-- Event Title -->
          <h3 class="font-extrabold text-lg text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-2 leading-snug">
            <a [routerLink]="['/events', event.id]">{{ event.name }}</a>
          </h3>

          <!-- Venue & Time -->
          <div class="space-y-1 text-xs text-slate-500">
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
      <div class="p-5 pt-0 border-t border-slate-100 flex items-center justify-between gap-3 mt-2">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Boletos desde</span>
          <span class="font-black text-base text-slate-900 font-mono">
            {{ minPriceText }}
          </span>
        </div>

        <a [routerLink]="['/events', event.id]">
          <button
            type="button"
            class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs transition-all shadow-sm"
          >
            Comprar Boletos
          </button>
        </a>
      </div>
    </div>
  `,
})
export class EventCardComponent {
  @Input({ required: true }) event!: StoreEventItem;
  @Output() artistClick = new EventEmitter<Pick<Artist, 'id' | 'name' | 'photo_url' | 'description' | 'gallery_urls'>>();

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
