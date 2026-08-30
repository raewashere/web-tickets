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
import {
  ButtonComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'store-search-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FilterPanelComponent,
    EventCardComponent,
    ButtonComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <!-- Search Header & Search Input -->
      <div class="space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-4xl font-black text-dark tracking-tight">
              Explorar Cartelera
            </h1>
            <p class="text-xs sm:text-sm text-dark/60 mt-1">
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
              class="w-full pl-10 pr-20 py-2.5 rounded-2xl border border-dark/20 bg-surface text-dark placeholder-dark/40 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
            />
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark/40 text-sm">
              🔍
            </span>
            <button
              type="button"
              (click)="onSearchSubmit()"
              class="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-primary text-dark font-bold text-xs hover:bg-primary/90 transition-colors"
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
          <div class="flex items-center justify-between text-xs text-dark/60 pb-3 border-b border-dark/10">
            <span>
              Mostrando <strong>{{ results()?.events?.length || 0 }}</strong> de <strong>{{ results()?.total || 0 }}</strong> espectáculos encontrados
            </span>

            <span *ngIf="currentParams.query" class="font-semibold text-primary">
              Resultados para: "{{ currentParams.query }}"
            </span>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
            <tf-spinner size="lg" color="primary"></tf-spinner>
            <p class="text-sm text-dark/60">Buscando eventos en la cartelera...</p>
          </div>

          <!-- Error Alert -->
          <div
            *ngIf="errorMessage()"
            class="p-4 rounded-2xl bg-contrast/10 border border-contrast/20 text-contrast text-xs"
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
            class="py-20 text-center rounded-3xl border border-dashed border-dark/20 p-8 bg-dark/5"
          >
            <span class="text-5xl block mb-2">🔍</span>
            <h3 class="text-lg font-bold text-dark">No se encontraron eventos</h3>
            <p class="text-xs text-dark/60 max-w-sm mx-auto mt-1 mb-4">
              Prueba modificando tus términos de búsqueda o eliminando los filtros de categoría y fecha.
            </p>
            <tf-button variant="secondary" size="sm" (click)="resetSearch()">
              Ver Todos los Eventos
            </tf-button>
          </div>

          <!-- Pagination -->
          <div
            *ngIf="!isLoading() && results() && results()!.totalPages > 1"
            class="pt-6 border-t border-dark/10 flex items-center justify-between"
          >
            <tf-button
              variant="secondary"
              size="sm"
              [disabled]="results()!.page <= 1"
              (click)="changePage(results()!.page - 1)"
            >
              ← Anterior
            </tf-button>

            <span class="text-xs font-bold text-dark">
              Página {{ results()!.page }} de {{ results()!.totalPages }}
            </span>

            <tf-button
              variant="secondary"
              size="sm"
              [disabled]="results()!.page >= results()!.totalPages"
              (click)="changePage(results()!.page + 1)"
            >
              Siguiente →
            </tf-button>
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
