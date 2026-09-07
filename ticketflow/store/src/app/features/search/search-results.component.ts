import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchFilterParams, SearchResult } from './search.service';
import { FilterPanelComponent } from './filter-panel.component';
import { EventCardComponent, StoreEventItem } from '../../shared/ui/event-card.component';
import type { EventType } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-search-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FilterPanelComponent,
    EventCardComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <!-- Search Header & Search Input -->
      <div class="space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 class="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Explorar Cartelera
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Encuentra los mejores conciertos, festivales y shows en vivo.
            </p>
          </div>

          <!-- Quick search bar -->
          <div class="w-full md:max-w-md relative">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="onSearchSubmit()"
              placeholder="Buscar por artista, evento o recinto..."
              class="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent shadow-sm transition-all"
            />
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <button
              type="button"
              (click)="onSearchSubmit()"
              class="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      <!-- Main Layout: Sidebar Filters + Results Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <!-- Sidebar Filter Panel (Desktop & Mobile toggle) -->
        <div class="lg:col-span-1">
          <store-filter-panel
            [eventTypes]="eventTypes()"
            [initialParams]="currentParams"
            (filtersChange)="onFiltersChange($event)"
          ></store-filter-panel>
        </div>

        <!-- Results Column -->
        <div class="lg:col-span-3 space-y-6">
          <!-- Results Counter Bar -->
          <div class="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-200">
            <span>
              Mostrando <strong class="text-slate-800">{{ results()?.events?.length || 0 }}</strong> de <strong class="text-slate-800">{{ results()?.total || 0 }}</strong> espectáculos
            </span>

            <span *ngIf="currentParams.query" class="font-bold text-cyan-600">
              Resultados para: "{{ currentParams.query }}"
            </span>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
            <tf-spinner size="lg" color="primary"></tf-spinner>
            <p class="text-sm text-slate-500 font-medium">Buscando eventos en la cartelera...</p>
          </div>

          <!-- Error Alert -->
          <div
            *ngIf="errorMessage()"
            class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs"
          >
            {{ errorMessage() }}
          </div>

          <!-- Events Grid -->
          <div
            *ngIf="!isLoading() && results() && results()!.events.length > 0"
            class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <store-event-card
              *ngFor="let ev of results()!.events"
              [event]="ev"
            ></store-event-card>
          </div>

          <!-- Empty State -->
          <div
            *ngIf="!isLoading() && results() && results()!.events.length === 0"
            class="py-20 text-center rounded-3xl border border-dashed border-slate-300 p-8 bg-white shadow-sm"
          >
            <span class="text-5xl block mb-2">🔍</span>
            <h3 class="text-lg font-bold text-slate-900">No se encontraron eventos</h3>
            <p class="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Prueba modificando tus términos de búsqueda o eliminando los filtros de categoría y fecha.
            </p>
            <button
              type="button"
              (click)="resetSearch()"
              class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Ver Todos los Eventos
            </button>
          </div>

          <!-- Pagination -->
          <div
            *ngIf="!isLoading() && results() && results()!.totalPages > 1"
            class="pt-6 border-t border-slate-200 flex items-center justify-between"
          >
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
              [disabled]="results()!.page <= 1"
              (click)="changePage(results()!.page - 1)"
            >
              ← Anterior
            </button>

            <span class="text-xs font-bold text-slate-700">
              Página {{ results()!.page }} de {{ results()!.totalPages }}
            </span>

            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
              [disabled]="results()!.page >= results()!.totalPages"
              (click)="changePage(results()!.page + 1)"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SearchResultsComponent implements OnInit {
  private readonly searchService = inject(SearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly results = signal<SearchResult | null>(null);
  readonly eventTypes = signal<EventType[]>([]);

  searchQuery = '';
  currentParams: SearchFilterParams = {};

  async ngOnInit(): Promise<void> {
    // 1. Fetch categories
    try {
      const types = await this.searchService.getEventTypes();
      this.eventTypes.set(types);
    } catch (err) {
      console.error('Error fetching event types:', err);
    }

    // 2. React to query parameters in URL
    this.route.queryParams.subscribe(async (params) => {
      this.currentParams = {
        query: params['q'] || undefined,
        eventTypeId: params['type'] || undefined,
        dateFrom: params['dateFrom'] || undefined,
        dateTo: params['dateTo'] || undefined,
        sort: params['sort'] || 'date_asc',
        page: params['page'] ? Number(params['page']) : 1,
      };
      this.searchQuery = this.currentParams.query || '';
      await this.executeSearch();
    });
  }

  private async executeSearch(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.searchService.searchEvents(this.currentParams);
      this.results.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al buscar eventos';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchSubmit(): void {
    this.updateUrlParams({ query: this.searchQuery.trim() || undefined, page: 1 });
  }

  onFiltersChange(filters: Partial<SearchFilterParams>): void {
    this.updateUrlParams({ ...filters, page: 1 });
  }

  changePage(newPage: number): void {
    this.updateUrlParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetSearch(): void {
    this.searchQuery = '';
    this.router.navigate(['/search']);
  }

  private updateUrlParams(updates: Partial<SearchFilterParams>): void {
    const qParams: Record<string, string | number | undefined> = {
      q: updates.query !== undefined ? updates.query : this.currentParams.query,
      type: updates.eventTypeId !== undefined ? updates.eventTypeId : this.currentParams.eventTypeId,
      dateFrom: updates.dateFrom !== undefined ? updates.dateFrom : this.currentParams.dateFrom,
      dateTo: updates.dateTo !== undefined ? updates.dateTo : this.currentParams.dateTo,
      sort: updates.sort !== undefined ? updates.sort : this.currentParams.sort,
      page: updates.page !== undefined ? updates.page : this.currentParams.page,
    };

    // Clean undefined or empty values
    Object.keys(qParams).forEach((key) => {
      if (!qParams[key] || qParams[key] === '') {
        delete qParams[key];
      }
    });

    this.router.navigate(['/search'], { queryParams: qParams });
  }
}
