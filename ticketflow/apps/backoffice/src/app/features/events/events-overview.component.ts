import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeService, BackofficeEventItem } from '../../services/backoffice.service';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-events-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full inline-block mb-2 border border-accent/20">
            Control de Catálogo Global
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Eventos Globales de la Plataforma
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Supervisa todos los shows creados por cualquier artista o recinto en TicketFlow.
          </p>
        </div>

        <button
          type="button"
          (click)="loadEvents()"
          class="px-4 py-2 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>Actualizar Lista</span>
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar evento, artista o recinto..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-dark/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-dark/40 text-xs"></i>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            (click)="statusFilter.set('all')"
            [class.bg-dark]="statusFilter() === 'all'"
            [class.text-white]="statusFilter() === 'all'"
            [class.bg-dark/5]="statusFilter() !== 'all'"
            [class.text-dark]="statusFilter() !== 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Todos ({{ events().length }})
          </button>
          <button
            type="button"
            (click)="statusFilter.set('published')"
            [class.bg-emerald-600]="statusFilter() === 'published'"
            [class.text-white]="statusFilter() === 'published'"
            [class.bg-emerald-50]="statusFilter() !== 'published'"
            [class.text-emerald-800]="statusFilter() !== 'published'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Publicados
          </button>
          <button
            type="button"
            (click)="statusFilter.set('draft')"
            [class.bg-amber-500]="statusFilter() === 'draft'"
            [class.text-white]="statusFilter() === 'draft'"
            [class.bg-amber-50]="statusFilter() !== 'draft'"
            [class.text-amber-800]="statusFilter() !== 'draft'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Borradores
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50">Cargando eventos globales...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
        {{ errorMessage() }}
      </div>

      <!-- Events Table -->
      <div *ngIf="!isLoading() && filteredEvents().length > 0" class="bg-white rounded-2xl border border-dark/10 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-dark/5 border-b border-dark/10 text-dark/60 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3.5 px-4 sm:px-6">Evento</th>
                <th class="py-3.5 px-4">Artista</th>
                <th class="py-3.5 px-4">Recinto / Sede</th>
                <th class="py-3.5 px-4">Fecha</th>
                <th class="py-3.5 px-4 text-center">Boletos Vendidos</th>
                <th class="py-3.5 px-4 text-right">Recaudación Bruta</th>
                <th class="py-3.5 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark/10">
              <tr *ngFor="let ev of filteredEvents()" class="hover:bg-dark/[0.02] transition">
                <td class="py-4 px-4 sm:px-6 font-bold text-dark flex items-center gap-3">
                  <img
                    *ngIf="ev.flyer_url"
                    [src]="ev.flyer_url"
                    [alt]="ev.name"
                    class="w-10 h-10 rounded-xl object-cover border border-dark/10 shadow-xs flex-shrink-0"
                  />
                  <div *ngIf="!ev.flyer_url" class="w-10 h-10 rounded-xl bg-dark/10 text-dark font-bold flex items-center justify-center text-xs flex-shrink-0">
                    <i class="fa-solid fa-calendar-days"></i>
                  </div>
                  <div>
                    <span class="block font-extrabold text-dark">{{ ev.name }}</span>
                    <span class="text-[10px] text-dark/40 font-mono">ID: {{ ev.id.substring(0,8) }}</span>
                  </div>
                </td>
                <td class="py-4 px-4 font-semibold text-dark/80">
                  <i class="fa-solid fa-microphone-lines text-dark/40 mr-1.5"></i>
                  <span>{{ ev.artist_name }}</span>
                </td>
                <td class="py-4 px-4 text-dark/70 font-medium">
                  <i class="fa-solid fa-location-dot text-dark/40 mr-1.5"></i>
                  <span>{{ ev.venue_name }}</span>
                </td>
                <td class="py-4 px-4 text-dark/70 font-mono text-xs">
                  {{ ev.event_date | date:'dd/MM/yyyy HH:mm' }}
                </td>
                <td class="py-4 px-4 text-center font-bold font-mono">
                  <span class="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                    {{ ev.tickets_sold | number }}
                  </span>
                </td>
                <td class="py-4 px-4 text-right font-black font-mono text-emerald-700">
                  \${{ ev.total_gross | number:'1.2-2' }} MXN
                </td>
                <td class="py-4 px-4 text-center">
                  <span
                    *ngIf="ev.status === 'published'"
                    class="inline-block px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[11px] border border-emerald-200"
                  >
                    Publicado
                  </span>
                  <span
                    *ngIf="ev.status !== 'published'"
                    class="inline-block px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200"
                  >
                    Borrador / {{ ev.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && filteredEvents().length === 0" class="p-12 text-center bg-white rounded-2xl border border-dashed border-dark/20 space-y-2">
        <span class="text-3xl block text-dark/30">
          <i class="fa-solid fa-calendar-days"></i>
        </span>
        <h3 class="font-bold text-dark text-base">No se encontraron eventos</h3>
        <p class="text-xs text-dark/50">Intenta con otros filtros de búsqueda.</p>
      </div>
    </div>
  `,
})
export class EventsOverviewComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly events = signal<BackofficeEventItem[]>([]);

  searchQuery = '';
  readonly statusFilter = signal<'all' | 'published' | 'draft'>('all');

  readonly filteredEvents = computed(() => {
    let list = this.events();
    const filter = this.statusFilter();

    if (filter === 'published') {
      list = list.filter((e) => e.status === 'published');
    } else if (filter === 'draft') {
      list = list.filter((e) => e.status !== 'published');
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.artist_name.toLowerCase().includes(q) ||
          e.venue_name.toLowerCase().includes(q)
      );
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
      const data = await this.backofficeService.getAllEvents();
      this.events.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar eventos globales.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}
