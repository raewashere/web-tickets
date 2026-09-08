import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventsService, EventDetailWithAll } from '../events.service';
import { AuthService } from '@ticketflow/data-access';
import type { EventStatus } from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';
import { EventStaffComponent } from '../event-staff/event-staff.component';
import { EventWaitlistComponent } from '../event-waitlist/event-waitlist.component';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SpinnerComponent,
    EventStaffComponent,
    EventWaitlistComponent,
  ],
  template: `
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Breadcrumbs & Status Bar -->
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
            <span class="text-dark font-semibold">{{ event()?.name || 'Cargando...' }}</span>
          </nav>

          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
              {{ event()?.name }}
            </h1>

            <tf-badge [variant]="getStatusBadgeVariant(event()?.status)">
              {{ getStatusLabel(event()?.status) }}
            </tf-badge>

            <span
              *ngIf="event()?.event_types"
              class="text-xs px-2.5 py-1 rounded-md bg-dark/5 text-dark/80 font-medium"
            >
              {{ event()!.event_types!.name }}
            </span>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex flex-wrap items-center gap-3" *ngIf="event()">
          <!-- Publish Action -->
          <tf-button
            *ngIf="event()!.status === 'draft'"
            variant="accent"
            size="sm"
            (click)="onPublish()"
            [disabled]="isActionLoading()"
          >
            🚀 Publicar Evento
          </tf-button>

          <!-- Cancel Action -->
          <tf-button
            *ngIf="event()!.status === 'published'"
            variant="danger"
            size="sm"
            (click)="onCancelEvent()"
            [disabled]="isActionLoading()"
          >
            ⚠️ Cancelar Evento
          </tf-button>

          <!-- Edit Action -->
          <a [routerLink]="['/events', event()!.id, 'edit']">
            <tf-button variant="secondary" size="sm">
              ✏️ Editar
            </tf-button>
          </a>

          <!-- Delete Action (Only for drafts) -->
          <tf-button
            *ngIf="event()!.status === 'draft'"
            variant="ghost"
            size="sm"
            (click)="onDelete()"
            [disabled]="isActionLoading()"
          >
            🗑️ Eliminar
          </tf-button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando detalles del espectáculo...</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="errorMessage()"
        class="p-4 rounded-xl bg-contrast/10 border border-contrast/30 text-contrast text-sm flex items-center gap-3"
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>{{ errorMessage() }}</span>
      </div>

      <!-- Main Event Content -->
      <div *ngIf="!isLoading() && event()" class="space-y-6">
        <!-- Banner & Quick Info Hero -->
        <div class="rounded-3xl border border-dark/10 bg-surface overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-3">
          <!-- Flyer Image -->
          <div class="md:col-span-1 bg-dark/10 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden">
            <img
              *ngIf="event()!.flyer_url"
              [src]="event()!.flyer_url"
              [alt]="event()!.name"
              class="w-full h-full object-cover object-center"
            />
            <div *ngIf="!event()!.flyer_url" class="p-8 text-center text-dark/40">
              <span class="text-5xl block mb-2">🎨</span>
              <span class="text-xs font-semibold">Sin afiche promocional</span>
            </div>
          </div>

          <!-- Quick Specs Info -->
          <div class="md:col-span-2 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div class="space-y-4">
              <!-- Dates & Time -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 rounded-2xl bg-dark/5 border border-dark/10">
                  <span class="text-xs text-dark/50 font-bold uppercase tracking-wider block">Fecha del Evento</span>
                  <span class="text-base sm:text-lg font-extrabold text-dark mt-0.5 block">
                    {{ event()!.event_date | date:'fullDate' }}
                  </span>
                  <span class="text-xs text-dark/70 font-semibold">
                    Hora: {{ event()!.event_date | date:'shortTime' }} hrs
                  </span>
                </div>

                <div class="p-4 rounded-2xl bg-dark/5 border border-dark/10">
                  <span class="text-xs text-dark/50 font-bold uppercase tracking-wider block">Apertura de Puertas</span>
                  <span class="text-base sm:text-lg font-extrabold text-dark mt-0.5 block">
                    {{ event()!.doors_open ? (event()!.doors_open | date:'shortTime') + ' hrs' : 'Por confirmar' }}
                  </span>
                  <span class="text-xs text-dark/70">
                    {{ event()!.doors_open ? (event()!.doors_open | date:'mediumDate') : 'Mismo día' }}
                  </span>
                </div>
              </div>

              <!-- Venue Details -->
              <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="space-y-0.5">
                  <span class="text-xs text-primary font-bold uppercase tracking-wider">Recinto & Aforo</span>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-dark text-base">{{ event()!.venues?.name || 'Recinto no asignado' }}</span>
                    <tf-badge *ngIf="event()!.venues?.verified" variant="primary">✓ Verificada</tf-badge>
                  </div>
                  <p class="text-xs text-dark/70">
                    Configuración: <strong>{{ event()!.venue_configurations?.name || 'Estándar' }}</strong>
                    <span *ngIf="event()!.venue_configurations?.capacity">
                      · Aforo: {{ event()!.venue_configurations!.capacity | number }} personas
                    </span>
                  </p>
                </div>

                <div *ngIf="event()!.venues?.latitude && event()!.venues?.longitude">
                  <a
                    [href]="'https://www.google.com/maps?q=' + event()!.venues!.latitude + ',' + event()!.venues!.longitude"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-dark/10 text-xs font-bold text-dark hover:bg-dark/5 transition-colors"
                  >
                    <span>📍 Google Maps</span>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              <!-- Description -->
              <div *ngIf="event()!.description" class="pt-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-dark/60 mb-1">Sinopsis / Descripción:</h4>
                <p class="text-sm text-dark/80 whitespace-pre-line leading-relaxed">
                  {{ event()!.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Two Columns: Ticket Types & Coupons (Fase 5) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Ticket Types Section -->
          <tf-card>
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-dark/10">
              <div>
                <h3 class="text-lg font-bold text-dark">Tipos de Boletos</h3>
                <p class="text-xs text-dark/60 mt-0.5">Precios, stock y distribución de localidades.</p>
              </div>
              <a [routerLink]="['/events', event()!.id, 'tickets']">
                <tf-button variant="primary" size="sm">
                  ⚙️ Gestionar Boletos
                </tf-button>
              </a>
            </div>

            <!-- List of tickets -->
            <div *ngIf="event()!.ticket_types && event()!.ticket_types!.length > 0" class="space-y-3">
              <div
                *ngFor="let t of event()!.ticket_types"
                class="p-3.5 rounded-xl bg-dark/5 border border-dark/10 flex items-center justify-between"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-dark">{{ t.name }}</span>
                    <span class="font-mono text-xs text-dark/50">#{{ t.sku }}</span>
                  </div>
                  <span class="text-xs text-dark/60">
                    Stock: {{ t.stock }} · Vendidos: {{ t.sold }}
                  </span>
                </div>
                <div class="text-right font-mono font-extrabold text-dark text-base">
                  \${{ t.price | number:'1.2-2' }}
                </div>
              </div>
            </div>

            <!-- Empty tickets preview -->
            <div *ngIf="!event()!.ticket_types || event()!.ticket_types!.length === 0" class="py-8 text-center text-dark/50">
              <span class="text-3xl block mb-2">🎫</span>
              <p class="text-xs">Aún no se han configurado tipos de boletos para este show.</p>
              <a [routerLink]="['/events', event()!.id, 'tickets']" class="inline-block mt-3">
                <tf-button variant="primary" size="sm">
                  + Crear Primer Boleto
                </tf-button>
              </a>
            </div>
          </tf-card>

          <!-- Coupons & Courtesy Section -->
          <tf-card>
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-dark/10">
              <div>
                <h3 class="text-lg font-bold text-dark">Cupones & Cortesías</h3>
                <p class="text-xs text-dark/60 mt-0.5">Descuentos promocionales y pases de prensa.</p>
              </div>
              <a [routerLink]="['/events', event()!.id, 'coupons']">
                <tf-button variant="secondary" size="sm">
                  ⚙️ Gestionar Cupones
                </tf-button>
              </a>
            </div>

            <!-- List of coupons -->
            <div *ngIf="event()!.coupons && event()!.coupons!.length > 0" class="space-y-3">
              <div
                *ngFor="let c of event()!.coupons"
                class="p-3.5 rounded-xl bg-dark/5 border border-dark/10 flex items-center justify-between"
              >
                <div>
                  <span class="font-mono font-bold text-sm text-dark uppercase tracking-wider bg-accent/20 px-2 py-0.5 rounded">
                    {{ c.code }}
                  </span>
                  <p class="text-xs text-dark/60 mt-1">
                    Tipo: {{ c.type }} · Usos: {{ c.uses_count }}/{{ c.max_uses || '∞' }}
                  </p>
                </div>
                <div class="text-right text-xs font-bold text-dark">
                  {{ c.value ? c.value + (c.type === 'percentage' ? '%' : ' MXN') : 'Cortesía' }}
                </div>
              </div>
            </div>

            <!-- Empty coupons preview -->
            <div *ngIf="!event()!.coupons || event()!.coupons!.length === 0" class="py-8 text-center text-dark/50">
              <span class="text-3xl block mb-2">🏷️</span>
              <p class="text-xs">No hay cupones de descuento activos para este show.</p>
              <a [routerLink]="['/events', event()!.id, 'coupons']" class="inline-block mt-3">
                <tf-button variant="secondary" size="sm">
                  + Crear Primer Cupón
                </tf-button>
              </a>
            </div>
          </tf-card>

          <!-- Event Staff & Doorman Admission Control Section -->
          <tf-card>
            <app-event-staff [eventId]="event()!.id"></app-event-staff>
          </tf-card>

          <!-- Event Waitlist Section -->
          <tf-card>
            <app-event-waitlist [eventId]="event()!.id"></app-event-waitlist>
          </tf-card>
        </div>
      </div>
    </div>
  `,
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly isActionLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly event = signal<EventDetailWithAll | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadEvent(id);
    }
  }

  async loadEvent(id: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.eventsService.getEvent(id);
      if (!data) {
        this.errorMessage.set('No se encontró el evento solicitado.');
        return;
      }
      this.event.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos del evento';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusLabel(status?: EventStatus): string {
    switch (status) {
      case 'draft':
        return 'Borrador';
      case 'published':
        return 'Publicado';
      case 'cancelled':
        return 'Cancelado';
      case 'completed':
        return 'Finalizado';
      default:
        return 'Desconocido';
    }
  }

  getStatusBadgeVariant(status?: EventStatus): 'default' | 'primary' | 'accent' | 'danger' {
    switch (status) {
      case 'published':
        return 'accent';
      case 'completed':
        return 'primary';
      case 'cancelled':
        return 'danger';
      case 'draft':
      default:
        return 'default';
    }
  }

  async onPublish(): Promise<void> {
    const ev = this.event();
    if (!ev) return;

    if (!confirm(`¿Deseas publicar el evento "${ev.name}" para que esté disponible en venta?`)) {
      return;
    }

    this.isActionLoading.set(true);
    try {
      const userId = this.authService.user()?.id;
      await this.eventsService.publishEvent(ev.id, userId);
      await this.loadEvent(ev.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al publicar evento');
    } finally {
      this.isActionLoading.set(false);
    }
  }

  async onCancelEvent(): Promise<void> {
    const ev = this.event();
    if (!ev) return;

    if (!confirm(`¿Estás seguro de cancelar el evento "${ev.name}"? Esta acción notificará a los compradores.`)) {
      return;
    }

    this.isActionLoading.set(true);
    try {
      const userId = this.authService.user()?.id;
      await this.eventsService.cancelEvent(ev.id, userId);
      await this.loadEvent(ev.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al cancelar evento');
    } finally {
      this.isActionLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    const ev = this.event();
    if (!ev) return;

    if (!confirm(`¿Estás seguro de eliminar el borrador "${ev.name}"?`)) {
      return;
    }

    this.isActionLoading.set(true);
    try {
      await this.eventsService.deleteEvent(ev.id);
      this.router.navigate(['/events']);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el borrador');
    } finally {
      this.isActionLoading.set(false);
    }
  }
}
