import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventsService } from '../events.service';
import { ArtistsService } from '../../artists/artists.service';
import { AuthService } from '@ticketflow/data-access';
import type { EventWithRelations, EventStatus } from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  StatCardComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    StatCardComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
            Mis Eventos & Conciertos
          </h1>
          <p class="text-sm text-dark/60 mt-1">
            Administra tus fechas, configuraciones de aforo, boletaje y estados de publicación.
          </p>
        </div>

        <a routerLink="/events/new">
          <tf-button variant="primary" size="md">
            + Crear Nuevo Evento
          </tf-button>
        </a>
      </div>

      <!-- Stats Summary -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <tf-stat-card
          label="Total Eventos"
          [value]="events().length"
          icon="🎪"
        ></tf-stat-card>
        <tf-stat-card
          label="Publicados"
          [value]="publishedCount()"
          icon="🚀"
        ></tf-stat-card>
        <tf-stat-card
          label="Borradores"
          [value]="draftCount()"
          icon="📝"
        ></tf-stat-card>
        <tf-stat-card
          label="Completados"
          [value]="completedCount()"
          icon="✓"
        ></tf-stat-card>
      </div>

      <!-- Search & Status Tabs Filter -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Status Tabs -->
        <div class="flex items-center gap-1.5 p-1 bg-dark/5 rounded-xl self-start overflow-x-auto max-w-full">
          <button
            type="button"
            *ngFor="let tab of statusTabs"
            (click)="selectTab(tab.key)"
            [class.bg-surface]="activeTab === tab.key"
            [class.shadow-sm]="activeTab === tab.key"
            [class.font-bold]="activeTab === tab.key"
            [class.text-dark]="activeTab === tab.key"
            [class.text-dark\/60]="activeTab !== tab.key"
            class="px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full md:max-w-xs">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark/40 text-sm">
            🔍
          </span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por nombre..."
            class="w-full pl-9 pr-4 py-2 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xs transition-all shadow-sm"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando tus eventos...</p>
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

      <!-- Events Grid -->
      <div
        *ngIf="!isLoading() && filteredEvents().length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <div
          *ngFor="let ev of filteredEvents()"
          class="rounded-2xl border border-dark/10 bg-surface hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          <div>
            <!-- Flyer Preview Header -->
            <div class="h-44 bg-dark/10 relative overflow-hidden flex items-center justify-center">
              <img
                *ngIf="ev.flyer_url"
                [src]="ev.flyer_url"
                [alt]="ev.name"
                class="w-full h-full object-cover object-center"
              />
              <div *ngIf="!ev.flyer_url" class="text-center text-dark/30">
                <span class="text-5xl block">🎨</span>
                <span class="text-xs font-semibold mt-1 block">Sin afiche promocional</span>
              </div>

              <!-- Status Badge on Flyer -->
              <div class="absolute top-3 right-3">
                <tf-badge [variant]="getStatusBadgeVariant(ev.status)">
                  {{ getStatusLabel(ev.status) }}
                </tf-badge>
              </div>

              <!-- Category Pill -->
              <div *ngIf="ev.event_types" class="absolute bottom-3 left-3">
                <span class="px-2.5 py-1 rounded-md bg-dark/80 backdrop-blur-sm text-surface text-[10px] font-bold uppercase tracking-wider">
                  {{ ev.event_types.name }}
                </span>
              </div>
            </div>

            <!-- Event Information -->
            <div class="p-5 space-y-3">
              <div>
                <h3 class="font-extrabold text-base text-dark hover:text-primary transition-colors line-clamp-1">
                  <a [routerLink]="['/events', ev.id]">{{ ev.name }}</a>
                </h3>

                <!-- Date & Time -->
                <p class="text-xs font-semibold text-dark/80 mt-1 flex items-center gap-1.5">
                  <span>📅</span>
                  <span>{{ ev.event_date | date:'mediumDate' }} · {{ ev.event_date | date:'shortTime' }} hrs</span>
                </p>
              </div>

              <!-- Venue and config -->
              <div class="p-2.5 rounded-xl bg-dark/5 border border-dark/10 space-y-1 text-xs">
                <div class="flex items-center justify-between text-dark">
                  <span class="font-bold flex items-center gap-1">
                    📍 {{ ev.venues?.name || 'Recinto no definido' }}
                  </span>
                  <tf-badge *ngIf="ev.venues?.verified" variant="primary">✓</tf-badge>
                </div>
                <div class="text-[11px] text-dark/60 flex items-center justify-between">
                  <span>Aforo: {{ ev.venue_configurations?.name || 'Estándar' }}</span>
                  <span *ngIf="ev.venue_configurations?.capacity">
                    {{ ev.venue_configurations!.capacity | number }} pers.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Footer Actions -->
          <div class="p-4 pt-0 border-t border-dark/10 flex items-center justify-between gap-2 mt-2">
            <a [routerLink]="['/events', ev.id]" class="flex-1">
              <tf-button variant="secondary" size="sm" class="w-full">
                Ver Detalle
              </tf-button>
            </a>

            <a [routerLink]="['/events', ev.id, 'edit']">
              <tf-button variant="ghost" size="sm" title="Editar Evento">
                ✏️
              </tf-button>
            </a>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <tf-card *ngIf="!isLoading() && filteredEvents().length === 0">
        <div class="py-12 text-center text-dark/60">
          <div class="text-5xl mb-3">🎪</div>
          <h3 class="text-lg font-bold text-dark">
            {{ searchQuery || activeTab !== 'all' ? 'No se encontraron eventos' : 'Aún no tienes eventos registrados' }}
          </h3>
          <p class="text-sm text-dark/60 max-w-md mx-auto mt-1 mb-5">
            {{ searchQuery || activeTab !== 'all'
              ? 'Prueba cambiando los filtros de estado o el término de búsqueda.'
              : 'Empieza programando tu primer concierto o espectáculo seleccionando fecha y recinto.' }}
          </p>

          <a routerLink="/events/new" *ngIf="!searchQuery && activeTab === 'all'">
            <tf-button variant="primary" size="md">
              + Crear Primer Evento
            </tf-button>
          </a>

          <tf-button
            *ngIf="searchQuery || activeTab !== 'all'"
            variant="secondary"
            size="sm"
            (click)="resetFilters()"
          >
            Limpiar Filtros
          </tf-button>
        </div>
      </tf-card>
    </div>
  `,
})
export class EventListComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly artistsService = inject(ArtistsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly events = signal<EventWithRelations[]>([]);

  searchQuery = '';
  activeTab = 'all';

  readonly statusTabs = [
    { key: 'all', label: 'Todos' },
    { key: 'published', label: 'Publicados' },
    { key: 'draft', label: 'Borradores' },
    { key: 'completed', label: 'Finalizados' },
    { key: 'cancelled', label: 'Cancelados' },
  ];

  readonly publishedCount = computed(() =>
    this.events().filter((e) => e.status === 'published').length
  );
  readonly draftCount = computed(() =>
    this.events().filter((e) => e.status === 'draft').length
  );
  readonly completedCount = computed(() =>
    this.events().filter((e) => e.status === 'completed').length
  );

  readonly filteredEvents = computed(() => {
    let list = this.events();
    if (this.activeTab !== 'all') {
      list = list.filter((e) => e.status === this.activeTab);
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const user = this.authService.user();
      let artistId: string | undefined;

      if (user && !this.authService.isAdmin()) {
        const profile = await this.artistsService.getMyArtistProfile(user.id);
        if (profile) {
          artistId = profile.id;
        }
      }

      const data = await this.eventsService.getMyEvents(artistId);
      this.events.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los eventos';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectTab(key: string): void {
    this.activeTab = key;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.activeTab = 'all';
  }

  getStatusLabel(status: EventStatus): string {
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
        return status;
    }
  }

  getStatusBadgeVariant(status: EventStatus): 'default' | 'primary' | 'accent' | 'danger' {
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
}
