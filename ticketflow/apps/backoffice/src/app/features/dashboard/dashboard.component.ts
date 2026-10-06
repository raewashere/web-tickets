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
          <span class="text-[10px] font-black uppercase tracking-widest text-on-primary-container bg-primary-container px-3 py-1 rounded-full inline-block mb-2 border border-primary/20">
            Control Global Backoffice
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Métricas Globales de la Plataforma
          </h1>
          <p class="text-xs sm:text-sm text-on-surface-variant mt-1">
            Visión panorámica de volumen de ventas, comisiones netas de BoletoCoqueto, boletos y cuentas.
          </p>
        </div>

        <button
          type="button"
          (click)="loadMetrics()"
          class="px-4 py-2.5 rounded-xl bg-surface border border-outline-variant/30 hover:bg-surface-container text-on-surface font-bold text-xs sm:text-sm shadow-sm transition flex items-center gap-2 self-start sm:self-auto flex-shrink-0"
        >
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>Actualizar Datos</span>
        </button>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-xs text-on-surface-variant font-medium">Cargando métricas de la plataforma...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-5 rounded-2xl bg-error-container border border-error/20 text-on-error-container text-xs sm:text-sm font-bold shadow-sm">
        {{ errorMessage() }}
      </div>

      <!-- Metrics Content -->
      <div *ngIf="!isLoading() && metrics()" class="space-y-8">
        <!-- Main Financial KPI Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          <!-- GMV -->
          <div class="p-5 sm:p-6 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Volumen Total (GMV)</span>
              <span class="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-lg">
                <i class="fa-solid fa-sack-dollar"></i>
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-2xl sm:text-3xl font-black text-on-surface font-mono truncate">
                \${{ metrics()!.total_gmv | number:'1.2-2' }}
              </p>
              <p class="text-[11px] text-on-surface-variant">
                En <strong class="text-on-surface font-semibold">{{ metrics()!.total_orders_count }}</strong> órdenes confirmadas
              </p>
            </div>
          </div>

          <!-- Platform Commissions -->
          <div class="p-5 sm:p-6 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Comisiones BoletoCoqueto</span>
              <span class="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-lg">
                <i class="fa-solid fa-chart-line"></i>
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-2xl sm:text-3xl font-black text-secondary font-mono truncate">
                \${{ metrics()!.total_platform_commission | number:'1.2-2' }}
              </p>
              <p class="text-[11px] text-on-surface-variant font-medium">
                Retención neta por servicio
              </p>
            </div>
          </div>

          <!-- Tickets Sold -->
          <div class="p-5 sm:p-6 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Boletos Emitidos</span>
              <span class="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center text-lg">
                <i class="fa-solid fa-ticket"></i>
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-2xl sm:text-3xl font-black text-primary font-mono">
                {{ metrics()!.total_tickets_sold | number }}
              </p>
              <p class="text-[11px] text-on-surface-variant">
                Códigos QR activos en eventos
              </p>
            </div>
          </div>

          <!-- Active Events -->
          <div class="p-5 sm:p-6 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Eventos Activos</span>
              <span class="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center text-lg">
                <i class="fa-solid fa-calendar-check"></i>
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-2xl sm:text-3xl font-black text-on-surface font-mono">
                {{ metrics()!.active_events_count }}
              </p>
              <p class="text-[11px] text-on-surface-variant">
                De <strong class="text-on-surface font-semibold">{{ metrics()!.total_events_count }}</strong> eventos en catálogo
              </p>
            </div>
          </div>
        </div>

        <!-- Direct Navigation Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <!-- Payouts & Liquidations -->
          <div class="p-6 sm:p-7 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-credit-card"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-on-surface">Liquidaciones & Pagos</h2>
                  <p class="text-xs text-on-surface-variant">Dispersión de fondos a creadores</p>
                </div>
              </div>
              <p class="text-xs text-on-surface-variant leading-relaxed">
                Controla las transferencias bancarias SPEI, PayPal o registros manuales con comprobante adjunto.
              </p>
            </div>
            <div class="pt-2">
              <a routerLink="/payouts" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Gestionar Liquidaciones</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Artists & Balances -->
          <div class="p-6 sm:p-7 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-on-surface">Directorio de Artistas</h2>
                  <p class="text-xs text-on-surface-variant">Creadores y balances fiscales</p>
                </div>
              </div>
              <p class="text-xs text-on-surface-variant leading-relaxed">
                Consulta los {{ metrics()!.total_artists_count }} artistas registrados, sus datos fiscales RFC y sus balances pendientes.
              </p>
            </div>
            <div class="pt-2">
              <a routerLink="/artists" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Ver Directorio</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Refunds Management -->
          <div class="p-6 sm:p-7 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-rotate-left"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-on-surface">Reembolsos Globales</h2>
                  <p class="text-xs text-on-surface-variant">Solicitudes post-venta</p>
                </div>
              </div>
              <p class="text-xs text-on-surface-variant leading-relaxed">
                Revisa solicitudes de devolución de compradores, con reintegro atómico de stock y anulación de QR.
              </p>
            </div>
            <div class="pt-2">
              <a routerLink="/refunds" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Auditar Reembolsos</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Venues Moderation -->
          <div class="p-6 sm:p-7 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-location-dot"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-on-surface">Recintos y Sedes</h2>
                  <p class="text-xs text-on-surface-variant">Sedes registradas en la plataforma</p>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs font-bold text-on-surface-variant bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
                <span>Registrados: {{ metrics()!.total_venues_count }}</span>
                <span class="text-secondary font-bold">Verificados: {{ metrics()!.verified_venues_count }}</span>
              </div>
            </div>
            <div class="pt-2">
              <a routerLink="/venues" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Auditar Sedes</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Users Management -->
          <div class="p-6 sm:p-7 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-users-gear"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-on-surface">Usuarios & Roles</h2>
                  <p class="text-xs text-on-surface-variant">Control de permisos global</p>
                </div>
              </div>
              <div class="text-xs font-bold text-on-surface-variant bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 flex items-center justify-between">
                <span>Cuentas totales:</span>
                <span class="font-mono font-black text-on-surface">{{ metrics()!.total_users_count }}</span>
              </div>
            </div>
            <div class="pt-2">
              <a routerLink="/users" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Administrar Usuarios</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </a>
            </div>
          </div>

          <!-- Events Global Overview -->
          <div class="p-6 sm:p-7 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-xl font-bold flex-shrink-0">
                  <i class="fa-solid fa-calendar-days"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-on-surface">Catálogo de Eventos</h2>
                  <p class="text-xs text-on-surface-variant">Shows publicados y recaudación</p>
                </div>
              </div>
              <div class="text-xs font-bold text-on-surface-variant bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 flex items-center justify-between">
                <span>Activos: {{ metrics()!.active_events_count }}</span>
                <span>Total: {{ metrics()!.total_events_count }}</span>
              </div>
            </div>
            <div class="pt-2">
              <a routerLink="/events" class="block w-full">
                <button
                  type="button"
                  class="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
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
