import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { VenuesService } from '../venues.service';
import { VenueConfigFormComponent } from '../venue-config-form/venue-config-form.component';
import type { VenueWithConfigurations, VenueConfiguration } from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SpinnerComponent,
    VenueConfigFormComponent,
  ],
  template: `
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Breadcrumbs & Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav class="flex items-center gap-2 text-xs text-dark/60 mb-2">
            <a routerLink="/venues" class="hover:text-primary transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Sedes
            </a>
            <span>/</span>
            <span class="text-dark font-semibold">{{ venue()?.name || 'Cargando...' }}</span>
          </nav>

          <div class="flex items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
              {{ venue()?.name }}
            </h1>
            <tf-badge *ngIf="venue()?.verified" variant="primary">
              <i class="fa-solid fa-check mr-1 text-[10px]"></i> Verificada
            </tf-badge>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3" *ngIf="venue()">
          <a [routerLink]="['/venues', venue()!.id, 'edit']">
            <tf-button variant="secondary" size="sm">
              <i class="fa-solid fa-pen mr-1.5"></i> Editar Sede
            </tf-button>
          </a>
          <tf-button variant="danger" size="sm" (click)="onDeleteVenue()" [disabled]="isDeletingVenue()">
            <i class="fa-solid fa-trash mr-1.5"></i> Eliminar
          </tf-button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando información del recinto...</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="errorMessage()"
        class="p-4 rounded-xl bg-contrast/10 border border-contrast/30 text-contrast text-sm flex items-center gap-3"
      >
        <i class="fa-solid fa-circle-exclamation text-contrast text-base shrink-0"></i>
        <span>{{ errorMessage() }}</span>
      </div>

      <!-- Main Content -->
      <div *ngIf="!isLoading() && venue()" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Venue Info & Floor Plan -->
        <div class="space-y-6 lg:col-span-1">
          <!-- Location Details Card -->
          <tf-card title="Ubicación y Datos">
            <div class="space-y-4 text-sm text-dark/80">
              <div *ngIf="venue()!.latitude && venue()!.longitude" class="space-y-2">
                <div class="flex items-center justify-between text-xs text-dark/60">
                  <span>Coordenadas GPS:</span>
                  <span class="font-mono">{{ venue()!.latitude }}, {{ venue()!.longitude }}</span>
                </div>
                <a
                  [href]="'https://www.google.com/maps?q=' + venue()!.latitude + ',' + venue()!.longitude"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-dark/5 hover:bg-dark/10 text-xs font-semibold text-dark transition-colors"
                >
                  <i class="fa-solid fa-location-dot text-primary"></i>
                  <span>Ver en Google Maps</span>
                  <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                </a>
              </div>

              <div *ngIf="!venue()!.latitude || !venue()!.longitude" class="text-xs text-dark/50 italic">
                Sin coordenadas registradas.
              </div>

              <div class="pt-3 border-t border-dark/10 text-xs text-dark/50 space-y-1">
                <div>Registrado: {{ venue()!.created_at | date:'mediumDate' }}</div>
                <div *ngIf="venue()!.updated_at">Actualizado: {{ venue()!.updated_at | date:'mediumDate' }}</div>
              </div>
            </div>
          </tf-card>

          <!-- Floor Plan / Map Card -->
          <tf-card title="Plano / Croquis">
            <div *ngIf="venue()!.map_url" class="space-y-3">
              <div class="rounded-xl overflow-hidden border border-dark/10 bg-dark/5 aspect-video relative group">
                <img
                  [src]="venue()!.map_url"
                  [alt]="'Plano de ' + venue()!.name"
                  class="w-full h-full object-contain p-2"
                />
              </div>
              <a
                [href]="venue()!.map_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 justify-center"
              >
                <span>Ver plano en tamaño completo</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            </div>

            <div *ngIf="!venue()!.map_url" class="py-8 text-center text-dark/40 text-xs">
              <div class="text-3xl mb-1 text-dark/30">
                <i class="fa-regular fa-map"></i>
              </div>
              <span>No se ha subido un plano o croquis para esta sede.</span>
            </div>
          </tf-card>
        </div>

        <!-- Right Column: Venue Configurations (Aforos) -->
        <div class="lg:col-span-2 space-y-6">
          <tf-card>
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-dark/10">
              <div>
                <h3 class="text-lg font-bold text-dark">Configuraciones de Aforo</h3>
                <p class="text-xs text-dark/60 mt-0.5">
                  Variantes de capacidad para diferentes tipos de montaje o espectáculos.
                </p>
              </div>

              <tf-button
                variant="primary"
                size="sm"
                (click)="openConfigModal()"
              >
                <i class="fa-solid fa-plus mr-1"></i> Agregar Aforo
              </tf-button>
            </div>

            <!-- Configurations List -->
            <div *ngIf="configurations().length > 0" class="divide-y divide-dark/10">
              <div
                *ngFor="let cfg of configurations()"
                class="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
              >
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <h4 class="font-bold text-sm text-dark">{{ cfg.name }}</h4>
                    <tf-badge *ngIf="cfg.is_default" variant="primary">Predeterminado</tf-badge>
                  </div>
                  <p *ngIf="cfg.description" class="text-xs text-dark/60">
                    {{ cfg.description }}
                  </p>
                </div>

                <div class="flex items-center gap-4">
                  <!-- Capacity Counter -->
                  <div class="text-right">
                    <span class="text-[10px] uppercase font-bold text-dark/50 block">Capacidad</span>
                    <span class="font-mono font-extrabold text-sm text-dark">
                      {{ (cfg.capacity || 0) | number }} personas
                    </span>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      (click)="editConfig(cfg)"
                      title="Editar configuración"
                      class="p-2 rounded-lg text-dark/60 hover:text-dark hover:bg-dark/10 transition-colors text-xs"
                    >
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      type="button"
                      (click)="deleteConfig(cfg)"
                      title="Eliminar configuración"
                      class="p-2 rounded-lg text-contrast/60 hover:text-contrast hover:bg-contrast/10 transition-colors text-xs"
                    >
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State for Configurations -->
            <div *ngIf="configurations().length === 0" class="py-12 text-center text-dark/60">
              <div class="text-4xl mb-2 text-dark/30">
                <i class="fa-solid fa-shapes"></i>
              </div>
              <h4 class="text-sm font-bold text-dark">No hay configuraciones de aforo</h4>
              <p class="text-xs text-dark/50 max-w-sm mx-auto mt-1 mb-4">
                Define al menos una capacidad (ej. "Aforo Completo") para poder asignar esta sede a tus eventos.
              </p>
              <tf-button variant="primary" size="sm" (click)="openConfigModal()">
                <i class="fa-solid fa-plus mr-1"></i> Crear Primera Configuración
              </tf-button>
            </div>
          </tf-card>
        </div>
      </div>

      <!-- Config Form Modal -->
      <app-venue-config-form
        *ngIf="showConfigModal()"
        [venueId]="venue()!.id"
        [config]="selectedConfig()"
        (saved)="onConfigSaved($event)"
        (cancelled)="closeConfigModal()"
      ></app-venue-config-form>
    </div>
  `,
})
export class VenueDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly venuesService = inject(VenuesService);

  readonly isLoading = signal(true);
  readonly isDeletingVenue = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly venue = signal<VenueWithConfigurations | null>(null);
  readonly configurations = signal<VenueConfiguration[]>([]);

  readonly showConfigModal = signal(false);
  readonly selectedConfig = signal<VenueConfiguration | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadVenue(id);
    }
  }

  async loadVenue(id: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.venuesService.getVenue(id);
      if (!data) {
        this.errorMessage.set('No se encontró el recinto solicitado.');
        return;
      }
      this.venue.set(data);
      this.configurations.set(data.venue_configurations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos de la sede';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  openConfigModal(): void {
    this.selectedConfig.set(null);
    this.showConfigModal.set(true);
  }

  editConfig(config: VenueConfiguration): void {
    this.selectedConfig.set(config);
    this.showConfigModal.set(true);
  }

  closeConfigModal(): void {
    this.showConfigModal.set(false);
    this.selectedConfig.set(null);
  }

  async onConfigSaved(config: VenueConfiguration): Promise<void> {
    this.closeConfigModal();
    if (this.venue()) {
      await this.loadVenue(this.venue()!.id);
    }
  }

  async deleteConfig(config: VenueConfiguration): Promise<void> {
    if (!confirm(`¿Estás seguro de eliminar la configuración "${config.name}"?`)) {
      return;
    }

    try {
      await this.venuesService.deleteConfiguration(config.id);
      if (this.venue()) {
        await this.loadVenue(this.venue()!.id);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar configuración');
    }
  }

  async onDeleteVenue(): Promise<void> {
    const v = this.venue();
    if (!v) return;

    if (!confirm(`¿Estás seguro de eliminar la sede "${v.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.isDeletingVenue.set(true);
    try {
      await this.venuesService.deleteVenue(v.id);
      this.router.navigate(['/venues']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la sede';
      alert(msg);
    } finally {
      this.isDeletingVenue.set(false);
    }
  }
}
