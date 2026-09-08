import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeService } from '../../services/backoffice.service';
import type { AdminVenueModerationItem } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-venue-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-cyan-700 bg-cyan-100 border border-cyan-300 px-3 py-1 rounded-full inline-block mb-2">
            Moderación Central
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Verificación de Recintos y Sedes
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Audita las sedes registradas por los organizadores y activa el sello oficial de verificación.
          </p>
        </div>

        <button
          type="button"
          (click)="loadVenues()"
          class="px-4 py-2 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <span>🔄</span>
          <span>Actualizar Recintos</span>
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por recinto o correo de creador..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-dark/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span class="absolute left-3.5 top-2.5 text-dark/40 text-sm">🔍</span>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            (click)="selectedFilter.set('all')"
            [class.bg-dark]="selectedFilter() === 'all'"
            [class.text-white]="selectedFilter() === 'all'"
            [class.bg-dark/5]="selectedFilter() !== 'all'"
            [class.text-dark]="selectedFilter() !== 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Todos ({{ venues().length }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('pending')"
            [class.bg-amber-500]="selectedFilter() === 'pending'"
            [class.text-white]="selectedFilter() === 'pending'"
            [class.bg-amber-50]="selectedFilter() !== 'pending'"
            [class.text-amber-800]="selectedFilter() !== 'pending'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Pendientes ({{ pendingCount() }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('verified')"
            [class.bg-emerald-600]="selectedFilter() === 'verified'"
            [class.text-white]="selectedFilter() === 'verified'"
            [class.bg-emerald-50]="selectedFilter() !== 'verified'"
            [class.text-emerald-800]="selectedFilter() !== 'verified'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Verificados ({{ verifiedCount() }})
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50">Cargando catálogo de recintos...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
        {{ errorMessage() }}
      </div>

      <!-- Venues Table -->
      <div *ngIf="!isLoading() && filteredVenues().length > 0" class="bg-white rounded-2xl border border-dark/10 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-dark/5 border-b border-dark/10 text-dark/60 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3.5 px-4 sm:px-6">Recinto / Sede</th>
                <th class="py-3.5 px-4">Capacidad / Zonas</th>
                <th class="py-3.5 px-4">Eventos</th>
                <th class="py-3.5 px-4">Ubicación</th>
                <th class="py-3.5 px-4">Registrado por</th>
                <th class="py-3.5 px-4 text-center">Estado Verificación</th>
                <th class="py-3.5 px-4 sm:px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark/10">
              <tr *ngFor="let venue of filteredVenues()" class="hover:bg-dark/[0.02] transition">
                <td class="py-4 px-4 sm:px-6">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      📍
                    </div>
                    <div>
                      <div class="font-extrabold text-dark flex items-center gap-1.5">
                        <span>{{ venue.name }}</span>
                        <span *ngIf="venue.verified" class="text-emerald-600 text-xs" title="Recinto Verificado">✓</span>
                      </div>
                      <span class="text-[11px] text-dark/40 font-mono">ID: {{ venue.id.substring(0, 8) }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div class="space-y-0.5">
                    <p class="font-bold text-dark">
                      {{ venue.total_capacity > 0 ? (venue.total_capacity | number) + ' pers.' : 'Sin aforo' }}
                    </p>
                    <p class="text-[11px] text-dark/50">
                      {{ venue.configurations_count }} configuraciones
                    </p>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="inline-block px-2.5 py-1 rounded-full bg-dark/5 text-dark font-bold text-xs font-mono">
                    {{ venue.events_count }} shows
                  </span>
                </td>
                <td class="py-4 px-4">
                  <div *ngIf="venue.latitude && venue.longitude">
                    <a
                      [href]="'https://www.google.com/maps/dir/?api=1&destination=' + venue.latitude + ',' + venue.longitude"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary hover:underline font-bold text-xs flex items-center gap-1"
                    >
                      <span>🗺️</span>
                      <span>Google Maps ↗</span>
                    </a>
                  </div>
                  <span *ngIf="!venue.latitude && !venue.longitude" class="text-dark/40 text-xs">
                    Sin coordenadas
                  </span>
                </td>
                <td class="py-4 px-4">
                  <span class="text-xs text-dark/70 font-medium">
                    {{ venue.creator_email || '—' }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center">
                  <span
                    *ngIf="venue.verified"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold"
                  >
                    <span>✅</span> Verificado
                  </span>
                  <span
                    *ngIf="!venue.verified"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold"
                  >
                    <span>⏳</span> Pendiente
                  </span>
                </td>
                <td class="py-4 px-4 sm:px-6 text-right">
                  <button
                    type="button"
                    (click)="toggleVerification(venue)"
                    [disabled]="updatingVenueId() === venue.id"
                    [class.bg-emerald-600]="!venue.verified"
                    [class.hover:bg-emerald-700]="!venue.verified"
                    [class.bg-rose-600]="venue.verified"
                    [class.hover:bg-rose-700]="venue.verified"
                    class="px-3 py-1.5 rounded-lg text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                  >
                    <span *ngIf="updatingVenueId() === venue.id">Guardando...</span>
                    <span *ngIf="updatingVenueId() !== venue.id">
                      {{ venue.verified ? 'Desverificar' : 'Verificar Recinto' }}
                    </span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && filteredVenues().length === 0" class="p-12 text-center bg-white rounded-2xl border border-dashed border-dark/20 space-y-2">
        <span class="text-3xl">📍</span>
        <h3 class="font-bold text-dark text-base">No se encontraron recintos</h3>
        <p class="text-xs text-dark/50">Prueba cambiando los términos del buscador o el filtro.</p>
      </div>
    </div>
  `,
})
export class VenueModerationComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly venues = signal<AdminVenueModerationItem[]>([]);
  readonly updatingVenueId = signal<string | null>(null);

  searchQuery = '';
  readonly selectedFilter = signal<'all' | 'pending' | 'verified'>('all');

  readonly pendingCount = computed(
    () => this.venues().filter((v) => !v.verified).length
  );
  readonly verifiedCount = computed(
    () => this.venues().filter((v) => v.verified).length
  );

  readonly filteredVenues = computed(() => {
    let list = this.venues();
    const filter = this.selectedFilter();

    if (filter === 'pending') {
      list = list.filter((v) => !v.verified);
    } else if (filter === 'verified') {
      list = list.filter((v) => v.verified);
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.creator_email && v.creator_email.toLowerCase().includes(q))
      );
    }

    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.loadVenues();
  }

  async loadVenues(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.backofficeService.getVenuesForModeration();
      this.venues.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar recintos.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleVerification(venue: AdminVenueModerationItem): Promise<void> {
    const newStatus = !venue.verified;
    this.updatingVenueId.set(venue.id);

    try {
      await this.backofficeService.toggleVenueVerification(venue.id, newStatus);
      this.venues.update((items) =>
        items.map((item) =>
          item.id === venue.id ? { ...item, verified: newStatus } : item
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar verificación.';
      alert(msg);
    } finally {
      this.updatingVenueId.set(null);
    }
  }
}
