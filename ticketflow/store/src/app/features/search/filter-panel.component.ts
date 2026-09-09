import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { EventType } from '@ticketflow/models';
import type { SearchFilterParams } from './search.service';

@Component({
  selector: 'store-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 p-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <h3 class="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-sliders text-cyan-600"></i> Filtros
        </h3>

        <button
          type="button"
          (click)="clearFilters()"
          class="text-xs text-rose-500 hover:underline font-semibold"
        >
          Limpiar Todo
        </button>
      </div>

      <!-- Categories / Event Types -->
      <div class="space-y-3">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Categoría / Género
        </label>
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <label
            class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-xs select-none"
            [class.font-bold]="!selectedTypeId"
            [class.text-cyan-600]="!selectedTypeId"
          >
            <input
              type="radio"
              name="eventCategory"
              [value]="null"
              [(ngModel)]="selectedTypeId"
              (ngModelChange)="onFilterChange()"
              class="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-slate-300"
            />
            <span>Todas las categorías</span>
          </label>

          <label
            *ngFor="let cat of eventTypes"
            class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-xs select-none"
            [class.font-bold]="selectedTypeId === cat.id"
            [class.text-cyan-600]="selectedTypeId === cat.id"
          >
            <input
              type="radio"
              name="eventCategory"
              [value]="cat.id"
              [(ngModel)]="selectedTypeId"
              (ngModelChange)="onFilterChange()"
              class="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-slate-300"
            />
            <span>{{ cat.name }}</span>
          </label>
        </div>
      </div>

      <!-- Date Range Filter -->
      <div class="space-y-3 pt-4 border-t border-slate-200">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Rango de Fechas
        </label>

        <div class="space-y-2">
          <div>
            <span class="text-[10px] text-slate-500 font-bold block mb-1">A partir de:</span>
            <input
              type="date"
              [(ngModel)]="dateFrom"
              (ngModelChange)="onFilterChange()"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <span class="text-[10px] text-slate-500 font-bold block mb-1">Hasta:</span>
            <input
              type="date"
              [(ngModel)]="dateTo"
              (ngModelChange)="onFilterChange()"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      <!-- Sort Options -->
      <div class="space-y-3 pt-4 border-t border-slate-200">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Ordenar Por
        </label>

        <select
          [(ngModel)]="sort"
          (ngModelChange)="onFilterChange()"
          class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="date_asc">Próxima Fecha (Más cercana)</option>
          <option value="date_desc">Fecha más lejana</option>
          <option value="name_asc">Nombre del Show (A-Z)</option>
        </select>
      </div>
    </div>
  `,
})
export class FilterPanelComponent implements OnInit, OnChanges {
  @Input() eventTypes: EventType[] = [];
  @Input() initialParams?: SearchFilterParams;

  @Output() filtersChange = new EventEmitter<Partial<SearchFilterParams>>();

  selectedTypeId: string | null = null;
  dateFrom = '';
  dateTo = '';
  sort: 'date_asc' | 'date_desc' | 'name_asc' = 'date_asc';

  ngOnInit(): void {
    this.syncInitialParams();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialParams']) {
      this.syncInitialParams();
    }
  }

  private syncInitialParams(): void {
    if (!this.initialParams) return;
    this.selectedTypeId = this.initialParams.eventTypeId || null;
    this.dateFrom = this.initialParams.dateFrom || '';
    this.dateTo = this.initialParams.dateTo || '';
    this.sort = this.initialParams.sort || 'date_asc';
  }

  onFilterChange(): void {
    this.filtersChange.emit({
      eventTypeId: this.selectedTypeId || undefined,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      sort: this.sort,
    });
  }

  clearFilters(): void {
    this.selectedTypeId = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.sort = 'date_asc';
    this.onFilterChange();
  }
}
