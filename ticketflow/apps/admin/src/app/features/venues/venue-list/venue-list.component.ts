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
import { VenuesService } from '../venues.service';
import type { VenueWithConfigurations } from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  StatCardComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-venue-list',
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
            Sedes & Lugares
          </h1>
          <p class="text-sm text-dark/60 mt-1">
            Explora recintos disponibles, registra nuevas sedes y define sus aforos y configuraciones.
          </p>
        </div>

        <a routerLink="/venues/new">
          <tf-button variant="primary" size="md">
            + Registrar Nueva Sede
          </tf-button>
        </a>
      </div>

      <!-- Stats Summary -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <tf-stat-card
          label="Total de Sedes"
          [value]="venues().length"
          icon="fa-solid fa-location-dot"
        ></tf-stat-card>
        <tf-stat-card
          label="Sedes Verificadas"
          [value]="verifiedCount()"
          icon="fa-solid fa-circle-check"
        ></tf-stat-card>
        <tf-stat-card
          label="Total Configuraciones"
          [value]="totalConfigsCount()"
          icon="fa-solid fa-shapes"
        ></tf-stat-card>
      </div>

      <!-- Search & Filter Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="relative w-full sm:max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark/40 text-sm">
            <i class="fa-solid fa-magnifying-glass"></i>
          </span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Buscar por nombre de sede..."
            class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all shadow-sm"
          />
        </div>

        <div class="text-xs text-dark/60 self-end sm:self-center">
          Mostrando <strong>{{ filteredVenues().length }}</strong> de {{ venues().length }} sedes
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando sedes...</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="errorMessage()"
        class="p-4 rounded-xl bg-contrast/10 border border-contrast/30 text-contrast text-sm flex items-center gap-3"
      >
        <i class="fa-solid fa-circle-exclamation text-contrast text-base shrink-0"></i>
        <span>{{ errorMessage() }}</span>
      </div>

      <!-- Venues Grid -->
      <div
        *ngIf="!isLoading() && filteredVenues().length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <div
          *ngFor="let venue of filteredVenues()"
          class="rounded-2xl border border-dark/10 bg-surface hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          <!-- Card Image / Header -->
          <div>
            <!-- Map Preview / Fallback Header -->
            <div class="h-36 bg-dark/5 relative overflow-hidden border-b border-dark/10 flex items-center justify-center">
              <img
                *ngIf="venue.map_url"
                [src]="venue.map_url"
                [alt]="venue.name"
                class="w-full h-full object-cover object-center"
              />
              <div *ngIf="!venue.map_url" class="text-center text-dark/30">
                <span class="text-4xl block"><i class="fa-solid fa-landmark"></i></span>
                <span class="text-xs font-medium mt-1 block">Sin plano subido</span>
              </div>

              <!-- Badge Top Right -->
              <div class="absolute top-3 right-3 flex items-center gap-1.5">
                <tf-badge *ngIf="venue.verified" variant="primary">
                  <i class="fa-solid fa-check mr-1 text-[10px]"></i> Verificada
                </tf-badge>
              </div>
            </div>

            <!-- Content -->
            <div class="p-5 space-y-3">
              <div>
                <h3 class="font-extrabold text-base text-dark hover:text-primary transition-colors line-clamp-1">
                  <a [routerLink]="['/venues', venue.id]">{{ venue.name }}</a>
                </h3>

                <div *ngIf="venue.latitude && venue.longitude" class="flex items-center gap-1.5 text-xs text-dark/60 mt-1">
                  <i class="fa-solid fa-location-dot text-primary"></i>
                  <span>GPS:</span>
                  <a
                    [href]="'https://www.google.com/maps?q=' + venue.latitude + ',' + venue.longitude"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:underline font-mono text-dark/80"
                  >
                    {{ venue.latitude | number:'1.2-4' }}, {{ venue.longitude | number:'1.2-4' }}
                  </a>
                </div>
              </div>

              <!-- Configurations snippet -->
              <div class="pt-3 border-t border-dark/10 flex items-center justify-between text-xs">
                <span class="text-dark/60">Aforos disponibles:</span>
                <span class="font-bold text-dark px-2 py-0.5 rounded-md bg-dark/5">
                  {{ venue.venue_configurations.length }} configuraciones
                </span>
              </div>

              <div *ngIf="getMaxCapacity(venue) > 0" class="flex items-center justify-between text-xs text-dark/60">
                <span>Capacidad máxima:</span>
                <span class="font-extrabold text-dark font-mono">
                  {{ getMaxCapacity(venue) | number }} personas
                </span>
              </div>
            </div>
          </div>

          <!-- Card Footer Actions -->
          <div class="p-4 pt-0 border-t border-dark/10 flex items-center justify-between gap-2 mt-2">
            <a [routerLink]="['/venues', venue.id]" class="flex-1">
              <tf-button variant="secondary" size="sm" class="w-full">
                Ver Detalles
              </tf-button>
            </a>

            <a [routerLink]="['/venues', venue.id, 'edit']">
              <tf-button variant="ghost" size="sm" title="Editar Sede">
                <i class="fa-solid fa-pen-to-square"></i>
              </tf-button>
            </a>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <tf-card *ngIf="!isLoading() && filteredVenues().length === 0">
        <div class="py-12 text-center text-dark/60">
          <div class="text-5xl mb-3 text-dark/30">
            <i class="fa-solid fa-location-dot"></i>
          </div>
          <h3 class="text-lg font-bold text-dark">
            {{ searchQuery ? 'No se encontraron sedes' : 'Aún no hay sedes registradas' }}
          </h3>
          <p class="text-sm text-dark/60 max-w-md mx-auto mt-1 mb-5">
            {{ searchQuery
              ? 'Prueba con otros términos de búsqueda o borra el filtro.'
              : 'Comienza registrando tu primera sede o recinto para poder asignarle conciertos y aforos.' }}
          </p>

          <a routerLink="/venues/new" *ngIf="!searchQuery">
            <tf-button variant="primary" size="md">
              <i class="fa-solid fa-plus mr-1.5"></i> Crear Primera Sede
            </tf-button>
          </a>

          <tf-button
            *ngIf="searchQuery"
            variant="secondary"
            size="sm"
            (click)="searchQuery = ''; onSearchChange()"
          >
            Limpiar Búsqueda
          </tf-button>
        </div>
      </tf-card>
    </div>
  `,
})
export class VenueListComponent implements OnInit {
  private readonly venuesService = inject(VenuesService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly venues = signal<VenueWithConfigurations[]>([]);

  searchQuery = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly verifiedCount = computed(() =>
    this.venues().filter((v) => v.verified).length
  );

  readonly totalConfigsCount = computed(() =>
    this.venues().reduce(
      (acc, v) => acc + (v.venue_configurations ? v.venue_configurations.length : 0),
      0
    )
  );

  readonly filteredVenues = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.venues();
    return this.venues().filter((v) => v.name.toLowerCase().includes(q));
  });

  async ngOnInit(): Promise<void> {
    await this.loadVenues();
  }

  async loadVenues(query?: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.venuesService.getVenues(query);
      this.venues.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar las sedes';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadVenues(this.searchQuery);
    }, 300);
  }

  getMaxCapacity(venue: VenueWithConfigurations): number {
    if (!venue.venue_configurations || venue.venue_configurations.length === 0) {
      return 0;
    }
    return Math.max(...venue.venue_configurations.map((c) => c.capacity || 0));
  }
}
