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
import { TicketTypeFormComponent } from '../ticket-type-form/ticket-type-form.component';
import type {
  TicketTypeWithAvailability,
  TicketType,
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
  selector: 'app-ticket-type-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    StatCardComponent,
    SpinnerComponent,
    TicketTypeFormComponent,
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
            <span class="text-dark font-semibold">Boletos</span>
          </nav>

          <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
            Tipos de Boletos
          </h1>
          <p class="text-sm text-dark/60 mt-1">
            Gestiona las localidades, precios, comisiones y disponibilidad para este espectáculo.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <a *ngIf="eventId" [routerLink]="['/events', eventId, 'coupons']">
            <tf-button variant="secondary" size="md">
              🏷️ Ver Cupones
            </tf-button>
          </a>

          <tf-button
            variant="primary"
            size="md"
            (click)="openCreateModal()"
          >
            + Nuevo Tipo de Boleto
          </tf-button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <tf-stat-card
          label="Tipos de Boleto"
          [value]="tickets().length"
          icon="🎟️"
        ></tf-stat-card>
        <tf-stat-card
          label="Stock Total"
          [value]="totalStock()"
          icon="📦"
        ></tf-stat-card>
        <tf-stat-card
          label="Vendidos"
          [value]="totalSold()"
          icon="💰"
        ></tf-stat-card>
        <tf-stat-card
          label="Disponibles"
          [value]="totalAvailable()"
          icon="✓"
        ></tf-stat-card>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando tipos de boleto...</p>
      </div>

      <!-- Error alert -->
      <div
        *ngIf="errorMessage()"
        class="p-4 rounded-xl bg-contrast/10 border border-contrast/30 text-contrast text-sm flex items-center gap-3"
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>{{ errorMessage() }}</span>
      </div>

      <!-- Ticket Types List -->
      <div *ngIf="!isLoading() && tickets().length > 0" class="space-y-4">
        <div
          *ngFor="let t of tickets()"
          class="p-5 rounded-2xl border border-dark/10 bg-surface hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
        >
          <!-- Left: Info -->
          <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2.5">
              <h3 class="font-extrabold text-base text-dark">{{ t.name }}</h3>
              <span class="font-mono text-xs px-2 py-0.5 rounded bg-dark/10 text-dark font-bold">
                {{ t.sku }}
              </span>
              <tf-badge [variant]="t.is_active ? 'success' : 'default'">
                {{ t.is_active ? 'Activo' : 'Pausado' }}
              </tf-badge>
            </div>
            <p *ngIf="t.description" class="text-xs text-dark/70 max-w-xl">
              {{ t.description }}
            </p>
          </div>

          <!-- Middle: Stock Counters -->
          <div class="grid grid-cols-3 gap-3 p-3 rounded-xl bg-dark/5 text-center min-w-[240px]">
            <div>
              <span class="text-[10px] uppercase font-bold text-dark/50 block">Stock</span>
              <span class="font-mono font-extrabold text-sm text-dark">{{ t.stock }}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-dark/50 block">Vendidos</span>
              <span class="font-mono font-extrabold text-sm text-primary">{{ t.sold }}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-dark/50 block">Disponibles</span>
              <span class="font-mono font-extrabold text-sm text-dark">{{ t.available }}</span>
            </div>
          </div>

          <!-- Right: Pricing & Actions -->
          <div class="flex items-center justify-between md:justify-end gap-5">
            <div class="text-right">
              <span class="text-xs text-dark/50 block">Precio / Neto:</span>
              <span class="font-mono font-extrabold text-lg text-dark block">
                \${{ t.price | number:'1.2-2' }}
              </span>
              <span class="text-[10px] font-mono text-dark/60 block">
                Neto: \${{ (t.price * 0.8) | number:'1.2-2' }} (80%)
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                (click)="editTicket(t)"
                class="p-2 rounded-xl text-dark/70 hover:text-dark hover:bg-dark/10 transition-colors"
                title="Editar Boleto"
              >
                ✏️
              </button>
              <button
                type="button"
                (click)="deleteTicket(t)"
                class="p-2 rounded-xl text-contrast/70 hover:text-contrast hover:bg-contrast/10 transition-colors"
                title="Eliminar Boleto"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <tf-card *ngIf="!isLoading() && tickets().length === 0">
        <div class="py-12 text-center text-dark/60">
          <div class="text-5xl mb-3">🎟️</div>
          <h3 class="text-lg font-bold text-dark">No hay tipos de boletos creados</h3>
          <p class="text-sm text-dark/60 max-w-md mx-auto mt-1 mb-5">
            Crea los diferentes niveles de acceso para este evento (ej. General, Preferente, VIP) indicando precio y cupo.
          </p>
          <tf-button variant="primary" size="md" (click)="openCreateModal()">
            + Crear Primer Boleto
          </tf-button>
        </div>
      </tf-card>

      <!-- Ticket Form Modal -->
      <app-ticket-type-form
        *ngIf="showModal()"
        [eventId]="eventId!"
        [ticket]="selectedTicket()"
        (saved)="onTicketSaved($event)"
        (cancelled)="closeModal()"
      ></app-ticket-type-form>
    </div>
  `,
})
export class TicketTypeListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketsService = inject(TicketsService);
  private readonly eventsService = inject(EventsService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly tickets = signal<TicketTypeWithAvailability[]>([]);
  readonly event = signal<EventWithRelations | null>(null);

  readonly showModal = signal(false);
  readonly selectedTicket = signal<TicketType | null>(null);

  eventId: string | null = null;

  readonly totalStock = computed(() =>
    this.tickets().reduce((acc, t) => acc + (t.stock || 0), 0)
  );
  readonly totalSold = computed(() =>
    this.tickets().reduce((acc, t) => acc + (t.sold || 0), 0)
  );
  readonly totalAvailable = computed(() =>
    this.tickets().reduce((acc, t) => acc + (t.available || 0), 0)
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
      const [eventData, ticketData] = await Promise.all([
        this.eventsService.getEvent(id),
        this.ticketsService.getTicketTypes(id),
      ]);

      this.event.set(eventData);
      this.tickets.set(ticketData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los boletos';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal(): void {
    this.selectedTicket.set(null);
    this.showModal.set(true);
  }

  editTicket(ticket: TicketType): void {
    this.selectedTicket.set(ticket);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedTicket.set(null);
  }

  async onTicketSaved(ticket: TicketType): Promise<void> {
    this.closeModal();
    if (this.eventId) {
      await this.loadData(this.eventId);
    }
  }

  async deleteTicket(ticket: TicketType): Promise<void> {
    if (ticket.sold > 0) {
      alert('No se puede eliminar un tipo de boleto que ya tiene ventas registradas. Puedes pausarlo desactivándolo en la edición.');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el boleto "${ticket.name}"?`)) {
      return;
    }

    try {
      await this.ticketsService.deleteTicketType(ticket.id);
      if (this.eventId) {
        await this.loadData(this.eventId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar tipo de boleto');
    }
  }
}
