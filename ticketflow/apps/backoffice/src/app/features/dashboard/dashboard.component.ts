import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BackofficeService } from '../../services/backoffice.service';
import type { PlatformGlobalMetrics } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-backoffice-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full inline-block mb-2 border border-accent/20">
            Control Global Backoffice
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Métricas Globales de la Plataforma
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Visión panorámica de volumen de ventas, comisiones netas de TicketFlow, boletos y cuentas.
          </p>
        </div>

        <button
          type="button"
          (click)="loadMetrics()"
          class="px-4 py-2.5 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs sm:text-sm shadow-sm transition flex items-center gap-2 self-start sm:self-auto flex-shrink-0"
        >
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>Actualizar Datos</span>
        </button>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50 font-medium">Cargando métricas de la plataforma...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold shadow-sm">
        {{ errorMessage() }}
      </div>

      <!-- Metrics Content -->
      <div *ngIf="!isLoading() && metrics()" class="space-y-8">
        <!-- Main Financial KPI Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          <!-- GMV -->
          <div class="p-5 sm:p-6 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-dark/50 uppercase tracking-wider">Volumen Total (GMV)</span>
              <span class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-lg">
                <i class="fa-solid fa-sack-dollar"></i>
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-2xl sm:text-3xl font-black text-dark font-mono truncate">
                \${{ metrics()!.total_gmv | number:'1.2-2' }}
              </p>
              <p class="text-[11px] text-dark/50">
                En <strong class="text-dark font-semibold">{{ metrics()!.total_orders_count }}</strong> órdenes confirmadas
              </p>
            </div>
          </div>

          <!-- Platform Commissions -->
          <div class="p-5 sm:p-6 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-dark/50 uppercase tracking-wider">Comisiones TicketFlow</span>
              <span class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg">
                <i class="fa-solid fa-chart-line"></i>
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-2xl sm:text-3xl font-black text-emerald-600 font-mono truncate">
                \${{ metrics()!.total_platform_commission | number:'1.2-2' }}
              </p>
              <p class="text-[11px] text-emerald-700/80 font-medium">
                Retención neta por servicio
              </p>
            </div>
          </div>

          <!-- Tickets Sold -->
          <div class="p-5 sm:p-6 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-dark/50 uppercase tracking-wider">Boletos Emitidos</span>
              <span class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-lg">
                <i class="fa-solid fa-ticket"></i>
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-2xl sm:text-3xl font-black text-dark font-mono">
                {{ metrics()!.total_tickets_sold | number }}
              </p>
              <p class="text-[11px] text-dark/50">
                Códigos QR activos en eventos
              </p>
            </div>
          </div>

          <!-- Active Events -->
          <div class="p-5 sm:p-6 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-dark/50 uppercase tracking-wider">Eventos Activos</span>
              <span class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-lg">
                <i class="fa-solid fa-calendar-check"></i>
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-2xl sm:text-3xl font-black text-dark font-mono">
                {{ metrics()!.active_events_count }}
              </p>
              <p class="text-[11px] text-dark/50">
                De <strong class="text-dark font-semibold">{{ metrics()!.total_events_count }}</strong> eventos en catálogo
              </p>
            </div>
          </div>
        </div>

        <!-- Direct Navigation Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <!-- Payouts & Liquidations -->
          <div class="p-6 sm:p-7 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-credit-card"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-dark">Liquidaciones & Pagos</h2>
                  <p class="text-xs text-dark/50">Dispersión de fondos a creadores</p>
                </div>
              </div>
              <p class="text-xs text-dark/70 leading-relaxed">
                Controla las transferencias bancarias SPEI, PayPal o registros manuales con comprobante adjunto.
              </p>
            </div>
            <div class="pt-2">
              <a routerLink="/payouts" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Gestionar Liquidaciones</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Artists & Balances -->
          <div class="p-6 sm:p-7 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-dark">Directorio de Artistas</h2>
                  <p class="text-xs text-dark/50">Creadores y balances fiscales</p>
                </div>
              </div>
              <p class="text-xs text-dark/70 leading-relaxed">
                Consulta los {{ metrics()!.total_artists_count }} artistas registrados, sus datos fiscales RFC y sus balances pendientes.
              </p>
            </div>
            <div class="pt-2">
              <a routerLink="/artists" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Ver Directorio</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Refunds Management -->
          <div class="p-6 sm:p-7 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-rotate-left"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-dark">Reembolsos Globales</h2>
                  <p class="text-xs text-dark/50">Solicitudes post-venta</p>
                </div>
              </div>
              <p class="text-xs text-dark/70 leading-relaxed">
                Revisa solicitudes de devolución de compradores, con reintegro atómico de stock y anulación de QR.
              </p>
            </div>
            <div class="pt-2">
              <a routerLink="/refunds" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Auditar Reembolsos</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Venues Moderation -->
          <div class="p-6 sm:p-7 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-location-dot"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-dark">Recintos y Sedes</h2>
                  <p class="text-xs text-dark/50">Sedes registradas en la plataforma</p>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs font-bold text-dark/70 bg-dark/[0.03] p-3 rounded-xl border border-dark/5">
                <span>Registrados: {{ metrics()!.total_venues_count }}</span>
                <span class="text-emerald-600">Verificados: {{ metrics()!.verified_venues_count }}</span>
              </div>
            </div>
            <div class="pt-2">
              <a routerLink="/venues" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Auditar Sedes</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Users Management -->
          <div class="p-6 sm:p-7 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-users-gear"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-dark">Usuarios & Roles</h2>
                  <p class="text-xs text-dark/50">Control de permisos global</p>
                </div>
              </div>
              <div class="text-xs font-bold text-dark/70 bg-dark/[0.03] p-3 rounded-xl border border-dark/5 flex items-center justify-between">
                <span>Cuentas totales:</span>
                <span class="font-mono font-black text-dark">{{ metrics()!.total_users_count }}</span>
              </div>
            </div>
            <div class="pt-2">
              <a routerLink="/users" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Administrar Usuarios</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Events Global Overview -->
          <div class="p-6 sm:p-7 rounded-3xl bg-white border border-dark/10 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-calendar-days"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-dark">Catálogo de Eventos</h2>
                  <p class="text-xs text-dark/50">Shows publicados y recaudación</p>
                </div>
              </div>
              <div class="text-xs font-bold text-dark/70 bg-dark/[0.03] p-3 rounded-xl border border-dark/5 flex items-center justify-between">
                <span>Activos: {{ metrics()!.active_events_count }}</span>
                <span>Total: {{ metrics()!.total_events_count }}</span>
              </div>
            </div>
            <div class="pt-2">
              <a routerLink="/events" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Ver Todos los Eventos</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class BackofficeDashboardComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly metrics = signal<PlatformGlobalMetrics | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadMetrics();
  }

  async loadMetrics(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.backofficeService.getGlobalMetrics();
      this.metrics.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar las métricas globales.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}
