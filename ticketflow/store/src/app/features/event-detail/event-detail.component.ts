import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventDetailService, EventDetailPublic, CartTicketItem } from './event-detail.service';
import { TicketSelectorComponent } from './ticket-selector.component';
import { VenueMapComponent } from './venue-map.component';
import { AuthService } from '@ticketflow/data-access';
import {
  ButtonComponent,
  CardComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'store-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TicketSelectorComponent,
    VenueMapComponent,
    ButtonComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-xs text-dark/60">
        <a routerLink="/" class="hover:text-primary transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Inicio
        </a>
        <span>/</span>
        <a routerLink="/search" class="hover:text-primary transition-colors">Cartelera</a>
        <span>/</span>
        <span class="text-dark font-semibold truncate max-w-xs">{{ event()?.name || 'Cargando...' }}</span>
      </nav>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando información del concierto...</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="errorMessage()"
        class="p-6 rounded-3xl bg-contrast/10 border border-contrast/20 text-contrast text-center space-y-3"
      >
        <span class="text-4xl block">😕</span>
        <h3 class="text-lg font-bold">{{ errorMessage() }}</h3>
        <a routerLink="/search">
          <tf-button variant="secondary" size="sm">
            Ver Otros Conciertos
          </tf-button>
        </a>
      </div>

      <!-- Main Event View -->
      <div *ngIf="!isLoading() && event()" class="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <!-- Left 2 Columns: Event Info & Media -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Flyer & Title Hero Banner -->
          <div class="rounded-3xl border border-dark/10 bg-surface overflow-hidden shadow-sm">
            <div class="aspect-[16/9] sm:aspect-[21/9] bg-dark/10 relative overflow-hidden">
              <img
                *ngIf="event()!.flyer_url"
                [src]="event()!.flyer_url"
                [alt]="event()!.name"
                class="w-full h-full object-cover object-center"
              />
              <div *ngIf="!event()!.flyer_url" class="w-full h-full flex flex-col items-center justify-center text-dark/30">
                <span class="text-6xl">🎸</span>
                <span class="text-sm font-bold mt-2">TicketFlow Live Session</span>
              </div>

              <div *ngIf="event()!.event_types" class="absolute top-4 right-4">
                <span class="px-3 py-1.5 rounded-xl bg-dark/80 backdrop-blur-md text-surface text-xs font-extrabold uppercase tracking-wider shadow-lg">
                  {{ event()!.event_types!.name }}
                </span>
              </div>
            </div>

            <div class="p-6 sm:p-8 space-y-6">
              <!-- Artist and Show Name -->
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <span>🎤 Artista Principal</span>
                  <span class="text-dark/40">·</span>
                  <span class="text-dark/80">{{ event()!.artists?.name }}</span>
                </div>

                <h1 class="text-2xl sm:text-4xl font-black text-dark tracking-tight leading-tight">
                  {{ event()!.name }}
                </h1>
              </div>

              <!-- Date & Venue Highlights -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <!-- Date -->
                <div class="p-4 rounded-2xl bg-dark/5 border border-dark/10 space-y-1">
                  <span class="text-[10px] uppercase font-bold text-dark/50 tracking-wider block">Fecha & Horario</span>
                  <p class="font-extrabold text-dark text-base">
                    {{ event()!.event_date | date:'fullDate' }}
                  </p>
                  <p class="text-xs text-dark/70">
                    Show: {{ event()!.event_date | date:'shortTime' }} hrs
                    <span *ngIf="event()!.doors_open"> · Puertas: {{ event()!.doors_open | date:'shortTime' }} hrs</span>
                  </p>
                </div>

                <!-- Venue -->
                <div class="p-4 rounded-2xl bg-dark/5 border border-dark/10 space-y-1">
                  <span class="text-[10px] uppercase font-bold text-dark/50 tracking-wider block">Recinto & Aforo</span>
                  <p class="font-extrabold text-dark text-base flex items-center gap-1.5 truncate">
                    <span>📍</span>
                    <span class="truncate">{{ event()!.venues?.name || 'Recinto por confirmar' }}</span>
                  </p>
                  <p class="text-xs text-dark/70">
                    Aforo: {{ event()!.venue_configurations?.name || 'General' }}
                    <span *ngIf="event()!.venue_configurations?.capacity">
                      ({{ event()!.venue_configurations!.capacity | number }} pers.)
                    </span>
                  </p>
                </div>
              </div>

              <!-- Interactive Venue Map (Leaflet/OSM — no API key) -->
              <div *ngIf="event()!.venues?.latitude && event()!.venues?.longitude" class="pt-3">
                <store-venue-map
                  [lat]="event()!.venues!.latitude!"
                  [lng]="event()!.venues!.longitude!"
                  [venueName]="event()!.venues!.name"
                ></store-venue-map>
              </div>

              <!-- Fallback: simple link if no coordinates -->
              <div *ngIf="!event()!.venues?.latitude && !event()!.venues?.longitude && event()!.venues?.name" class="pt-1">
                <p class="text-xs text-dark/60 flex items-center gap-1">
                  <span>📍</span>
                  <span>{{ event()!.venues!.name }}</span>
                </p>
              </div>

              <!-- Description -->
              <div *ngIf="event()!.description" class="pt-4 border-t border-dark/10 space-y-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-dark/60">Información del Evento</h3>
                <p class="text-sm text-dark/80 whitespace-pre-line leading-relaxed">
                  {{ event()!.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Venue Croquis/Floor Plan Card if available -->
          <div *ngIf="event()!.venues?.map_url" class="p-6 rounded-3xl border border-dark/10 bg-surface space-y-4">
            <h3 class="font-extrabold text-base text-dark flex items-center gap-2">
              <span>🏟️</span> Croquis del Recinto
            </h3>
            <div class="rounded-2xl overflow-hidden border border-dark/10 bg-dark/5 aspect-[16/9] relative">
              <img
                [src]="event()!.venues!.map_url"
                [alt]="'Plano de ' + event()!.venues!.name"
                class="w-full h-full object-contain p-2"
              />
            </div>
          </div>
        </div>


        <!-- Right Column: Ticket Selector -->
        <div class="lg:col-span-1">
          <div class="sticky top-24 space-y-6">
            <div class="p-6 sm:p-8 rounded-3xl border border-dark/10 bg-surface shadow-lg">
              <!-- Reserve error feedback -->
              <div
                *ngIf="reserveError()"
                class="mb-4 p-3 rounded-2xl bg-contrast/10 border border-contrast/20 text-contrast text-xs flex items-start gap-2"
              >
                <span class="shrink-0 mt-0.5">⚠️</span>
                <span>{{ reserveError() }}</span>
              </div>

              <!-- Reserving spinner -->
              <div *ngIf="isReserving()" class="flex items-center justify-center py-8 gap-3">
                <tf-spinner size="sm" color="primary"></tf-spinner>
                <span class="text-xs font-bold text-dark/60">Reservando boletos...</span>
              </div>

              <store-ticket-selector
                *ngIf="!isReserving()"
                [ticketTypes]="event()!.ticket_types"
                (checkoutRequested)="onCheckoutRequested($event)"
              ></store-ticket-selector>
            </div>


            <!-- Guarantee Box -->
            <div class="p-5 rounded-2xl bg-dark/5 border border-dark/10 space-y-2 text-xs text-dark/70">
              <div class="font-bold text-dark flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Garantía TicketFlow</span>
              </div>
              <p>
                Tus boletos son emitidos al instante con código QR único. Cuentas con 100% de reembolso garantizado en caso de cancelación del espectáculo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventDetailService = inject(EventDetailService);
  private readonly auth = inject(AuthService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly event = signal<EventDetailPublic | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadEvent(id);
    }
  }

  private async loadEvent(id: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.eventDetailService.getEvent(id);
      if (!data) {
        this.errorMessage.set('El evento que buscas no existe o ya no está disponible.');
        return;
      }
      this.event.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el evento';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  readonly isReserving = signal(false);
  readonly reserveError = signal<string | null>(null);

  async onCheckoutRequested(items: CartTicketItem[]): Promise<void> {
    if (!this.event() || items.length === 0) return;

    // If user not authenticated, redirect to login first
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/event/${this.event()!.id}` } });
      return;
    }

    this.isReserving.set(true);
    this.reserveError.set(null);

    try {
      const sessionId = this.eventDetailService.getOrCreateSessionId();
      const cartItems = [];

      // Reserve each ticket type and collect lock IDs
      for (const item of items) {
        const result = await this.eventDetailService.reserveTickets(
          item.ticketType.id,
          item.quantity,
          sessionId,
        );

        if (!result.success) {
          const available = (result as unknown as { available?: number }).available;
          const availMsg = available !== undefined ? ` (disponibles: ${available})` : '';
          this.reserveError.set(
            `No hay suficiente stock para "${item.ticketType.name}"${availMsg}. Por favor ajusta la cantidad.`,
          );
          this.isReserving.set(false);
          return;
        }

        cartItems.push({
          ticketTypeId: item.ticketType.id,
          lockId:       (result as unknown as { lock_id?: string }).lock_id ?? '',
          name:         item.ticketType.name,
          sku:          item.ticketType.sku,
          price:        Number(item.ticketType.price),
          quantity:     item.quantity,
        });
      }

      // Save cart with sessionId and lockIds to sessionStorage
      const cartData = {
        eventId:   this.event()!.id,
        eventName: this.event()!.name,
        eventDate: this.event()!.event_date,
        venueName: this.event()!.venues?.name,
        sessionId,
        items:     cartItems,
        createdAt: Date.now(),
      };

      sessionStorage.setItem('tf_cart', JSON.stringify(cartData));
      this.router.navigate(['/checkout']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reservar boletos.';
      this.reserveError.set(msg);
    } finally {
      this.isReserving.set(false);
    }
  }
}
