import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BackofficeService } from '../../services/backoffice.service';
import type { AdminArtistFinancialItem } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-artists-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SpinnerComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-on-primary-container bg-primary-container px-3 py-1 rounded-full inline-block mb-2 border border-primary/20">
            Directorio de Creadores
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Artistas & Balances Financieros
          </h1>
          <p class="text-xs sm:text-sm text-on-surface/60 mt-1">
            Consulta los artistas registrados, sus datos fiscales y su balance neto pendiente de pago.
          </p>
        </div>

        <button
          type="button"
          (click)="loadArtists()"
          class="px-4 py-2 rounded-xl bg-surface border border-outline-variant/30 hover:bg-surface-variant/40 text-on-surface font-bold text-xs shadow-xs transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>Actualizar Lista</span>
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por artista, email o RFC..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-on-surface/40 text-xs"></i>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            (click)="selectedFilter.set('all')"
            [class.bg-primary]="selectedFilter() === 'all'"
            [class.text-on-primary]="selectedFilter() === 'all'"
            [class.bg-surface-variant/50]="selectedFilter() !== 'all'"
            [class.text-on-surface/80]="selectedFilter() !== 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Todos ({{ artists().length }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('with_balance')"
            [class.bg-amber-500]="selectedFilter() === 'with_balance'"
            [class.text-white]="selectedFilter() === 'with_balance'"
            [class.bg-amber-500/10]="selectedFilter() !== 'with_balance'"
            [class.text-amber-800]="selectedFilter() !== 'with_balance'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Con Saldo por Pagar
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-on-surface/50">Cargando directorio de artistas...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-error-container text-on-error-container border border-error/20 text-xs font-bold">
        {{ errorMessage() }}
      </div>

      <!-- Artists Table -->
      <div *ngIf="!isLoading() && filteredArtists().length > 0" class="bg-surface rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-surface-variant/40 border-b border-outline-variant/20 text-on-surface/70 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3.5 px-4 sm:px-6">Artista</th>
                <th class="py-3.5 px-4">Eventos</th>
                <th class="py-3.5 px-4 text-right">Ventas Brutas</th>
                <th class="py-3.5 px-4 text-right">Comisión TF</th>
                <th class="py-3.5 px-4 text-right">Saldo por Pagar</th>
                <th class="py-3.5 px-4">Datos Bancarios / RFC</th>
                <th class="py-3.5 px-4 sm:px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/20">
              <tr *ngFor="let artist of filteredArtists()" class="hover:bg-primary/[0.03] transition">
                <td class="py-4 px-4 sm:px-6">
                  <div class="flex items-center gap-3">
                    <img
                      *ngIf="artist.photo_url"
                      [src]="artist.photo_url"
                      [alt]="artist.artist_name"
                      class="w-10 h-10 rounded-full object-cover border border-outline-variant/30 shadow-xs flex-shrink-0"
                    />
                    <div *ngIf="!artist.photo_url" class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-sm flex-shrink-0">
                      <i class="fa-solid fa-microphone-lines"></i>
                    </div>
                    <div>
                      <span class="font-extrabold text-on-surface block">{{ artist.artist_name }}</span>
                      <span class="text-xs text-on-surface/50">{{ artist.artist_email || 'Sin correo' }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4 font-bold font-mono text-on-surface">
                  {{ artist.total_events }} shows
                </td>
                <td class="py-4 px-4 text-right font-mono text-on-surface/70">
                  \${{ artist.total_gross | number:'1.2-2' }}
                </td>
                <td class="py-4 px-4 text-right font-mono text-secondary font-semibold">
                  \${{ artist.total_commission | number:'1.2-2' }}
                </td>
                <td class="py-4 px-4 text-right font-mono font-black">
                  <span
                    [class.text-amber-600]="artist.balance_due > 0"
                    [class.text-on-surface/40]="artist.balance_due === 0"
                  >
                    \${{ artist.balance_due | number:'1.2-2' }} MXN
                  </span>
                </td>
                <td class="py-4 px-4">
                  <div *ngIf="artist.bank_account_number" class="space-y-0.5 font-mono text-[11px]">
                    <p class="font-bold text-on-surface">{{ artist.bank_name || 'Banco' }} — {{ artist.bank_account_number }}</p>
                    <p class="text-on-surface/50">RFC: {{ artist.tax_id || 'Sin RFC' }}</p>
                  </div>
                  <span *ngIf="!artist.bank_account_number" class="text-on-surface/40 text-xs italic">
                    Sin CLABE registrada
                  </span>
                </td>
                <td class="py-4 px-4 sm:px-6 text-right">
                  <a routerLink="/payouts">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-xs transition"
                    >
                      Ver Liquidaciones
                    </button>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && filteredArtists().length === 0" class="p-12 text-center bg-surface rounded-2xl border border-dashed border-outline-variant/40 space-y-2">
        <span class="text-3xl block text-on-surface/30">
          <i class="fa-solid fa-microphone-lines"></i>
        </span>
        <h3 class="font-bold text-on-surface text-base">No se encontraron artistas</h3>
        <p class="text-xs text-on-surface/50">Ajusta los términos de búsqueda o filtros.</p>
      </div>
    </div>
  `,
})
export class ArtistsListComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly artists = signal<AdminArtistFinancialItem[]>([]);

  searchQuery = '';
  readonly selectedFilter = signal<'all' | 'with_balance'>('all');

  readonly filteredArtists = computed(() => {
    let list = this.artists();
    if (this.selectedFilter() === 'with_balance') {
      list = list.filter((a) => a.balance_due > 0);
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.artist_name.toLowerCase().includes(q) ||
          (a.artist_email && a.artist_email.toLowerCase().includes(q)) ||
          (a.tax_id && a.tax_id.toLowerCase().includes(q))
      );
    }
    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.loadArtists();
  }

  async loadArtists(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.backofficeService.getAllArtistsFinancialOverview();
      this.artists.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar artistas.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}
