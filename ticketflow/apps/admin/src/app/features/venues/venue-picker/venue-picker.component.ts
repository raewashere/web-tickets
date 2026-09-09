import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VenuesService } from '../venues.service';
import type {
  VenueWithConfigurations,
  VenueConfiguration,
} from '@ticketflow/models';
import {
  ButtonComponent,
  BadgeComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-venue-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    BadgeComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="space-y-4">
      <!-- If NO venue selected: Search & Selection List -->
      <div *ngIf="!selectedVenue()" class="space-y-3">
        <div class="flex items-center gap-2">
          <!-- Search input -->
          <div class="relative flex-1">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark/40 text-sm">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              placeholder="Buscar recinto por nombre..."
              class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
            />
          </div>

          <tf-button
            type="button"
            variant="ghost"
            size="md"
            (click)="searchQuery = ''; onSearchChange()"
            *ngIf="searchQuery"
          >
            Limpiar
          </tf-button>
        </div>

        <!-- Loading indicator -->
        <div *ngIf="isLoading()" class="py-6 flex items-center justify-center gap-2 text-xs text-dark/60">
          <tf-spinner size="sm" color="primary"></tf-spinner>
          <span>Buscando sedes...</span>
        </div>

        <!-- Venue Results List -->
        <div *ngIf="!isLoading() && venues().length > 0" class="max-h-60 overflow-y-auto space-y-2 border border-dark/10 rounded-xl p-2 bg-dark/5">
          <div
            *ngFor="let venue of venues()"
            (click)="selectVenue(venue)"
            class="p-3 rounded-lg bg-surface border border-dark/10 hover:border-primary hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3"
          >
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-dark">{{ venue.name }}</span>
                <tf-badge *ngIf="venue.verified" variant="primary">
                  <i class="fa-solid fa-check mr-1 text-[10px]"></i> Verificada
                </tf-badge>
              </div>
              <p class="text-xs text-dark/50 flex items-center gap-1.5 flex-wrap">
                <span>{{ venue.venue_configurations.length }} configuraciones de aforo disponibles</span>
                <span *ngIf="venue.latitude && venue.longitude" class="flex items-center gap-1">
                  · <i class="fa-solid fa-location-dot text-primary text-[10px]"></i> GPS disponible
                </span>
              </p>
            </div>

            <tf-button type="button" variant="primary" size="sm">
              Seleccionar
            </tf-button>
          </div>
        </div>

        <!-- No results -->
        <div *ngIf="!isLoading() && venues().length === 0" class="p-6 text-center text-dark/50 text-xs border border-dashed border-dark/20 rounded-xl">
          <span>No se encontraron sedes coincidentes.</span>
        </div>
      </div>

      <!-- If Venue Selected: Summary & Configuration Picker -->
      <div *ngIf="selectedVenue()" class="space-y-3 p-4 rounded-xl border border-primary/40 bg-primary/5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider text-primary">Sede Seleccionada</span>
              <tf-badge *ngIf="selectedVenue()!.verified" variant="primary">
                <i class="fa-solid fa-check mr-1 text-[10px]"></i> Verificada
              </tf-badge>
            </div>
            <h4 class="text-base font-extrabold text-dark mt-0.5">{{ selectedVenue()!.name }}</h4>
            <p *ngIf="selectedVenue()!.latitude && selectedVenue()!.longitude" class="text-xs text-dark/60 flex items-center gap-1 mt-0.5">
              <i class="fa-solid fa-location-dot text-primary text-[11px]"></i>
              <span>{{ selectedVenue()!.latitude }}, {{ selectedVenue()!.longitude }}</span>
            </p>
          </div>

          <tf-button
            type="button"
            variant="secondary"
            size="sm"
            (click)="clearVenue()"
          >
            Cambiar Sede
          </tf-button>
        </div>

        <!-- Venue Configuration Selector -->
        <div class="pt-3 border-t border-dark/10 space-y-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-dark">
            Configuración de Aforo *
          </label>

          <select
            [(ngModel)]="currentConfigId"
            (ngModelChange)="onConfigChange($event)"
            class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
          >
            <option [ngValue]="null" disabled>Selecciona un aforo para el evento...</option>
            <option
              *ngFor="let cfg of selectedVenue()!.venue_configurations"
              [value]="cfg.id"
            >
              {{ cfg.name }} (Capacidad: {{ (cfg.capacity || 0) | number }} personas) {{ cfg.is_default ? '(Predeterminado)' : '' }}
            </option>
          </select>

          <div *ngIf="selectedVenue()!.venue_configurations.length === 0" class="text-xs text-contrast flex items-center justify-between">
            <span>Esta sede no tiene configuraciones de aforo registradas.</span>
            <a [routerLink]="['/venues', selectedVenue()!.id]" target="_blank" class="underline font-semibold">
              Agregar aforo en otra pestaña
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VenuePickerComponent implements OnInit, OnChanges {
  @Input() selectedVenueId?: string | null;
  @Input() selectedConfigId?: string | null;

  @Output() venueSelected = new EventEmitter<VenueWithConfigurations>();
  @Output() configSelected = new EventEmitter<VenueConfiguration>();
  @Output() venueCleared = new EventEmitter<void>();

  private readonly venuesService = inject(VenuesService);

  readonly isLoading = signal(false);
  readonly venues = signal<VenueWithConfigurations[]>([]);
  readonly selectedVenue = signal<VenueWithConfigurations | null>(null);

  searchQuery = '';
  currentConfigId: string | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await this.fetchVenues();
    if (this.selectedVenueId) {
      await this.resolveSelectedVenue(this.selectedVenueId);
    }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['selectedVenueId'] && !changes['selectedVenueId'].firstChange) {
      if (this.selectedVenueId) {
        await this.resolveSelectedVenue(this.selectedVenueId);
      } else {
        this.selectedVenue.set(null);
      }
    }

    if (changes['selectedConfigId']) {
      this.currentConfigId = this.selectedConfigId || null;
    }
  }

  async fetchVenues(query?: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.venuesService.getVenues(query);
      this.venues.set(data);
    } catch (err) {
      console.error('Error fetching venues in picker:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.fetchVenues(this.searchQuery);
    }, 300);
  }

  private async resolveSelectedVenue(id: string): Promise<void> {
    try {
      const v = await this.venuesService.getVenue(id);
      if (v) {
        this.selectedVenue.set(v);
        if (this.selectedConfigId) {
          this.currentConfigId = this.selectedConfigId;
        } else if (v.venue_configurations && v.venue_configurations.length > 0) {
          const defaultCfg = v.venue_configurations.find((c) => c.is_default) || v.venue_configurations[0];
          this.currentConfigId = defaultCfg.id;
          this.configSelected.emit(defaultCfg);
        }
      }
    } catch (err) {
      console.error('Error resolving venue by ID:', err);
    }
  }

  selectVenue(venue: VenueWithConfigurations): void {
    this.selectedVenue.set(venue);
    this.venueSelected.emit(venue);

    if (venue.venue_configurations && venue.venue_configurations.length > 0) {
      const defaultCfg = venue.venue_configurations.find((c) => c.is_default) || venue.venue_configurations[0];
      this.currentConfigId = defaultCfg.id;
      this.configSelected.emit(defaultCfg);
    } else {
      this.currentConfigId = null;
    }
  }

  onConfigChange(configId: string): void {
    const venue = this.selectedVenue();
    if (!venue || !venue.venue_configurations) return;

    const cfg = venue.venue_configurations.find((c) => c.id === configId);
    if (cfg) {
      this.configSelected.emit(cfg);
    }
  }

  clearVenue(): void {
    this.selectedVenue.set(null);
    this.currentConfigId = null;
    this.venueCleared.emit();
    this.fetchVenues();
  }
}
