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
          class="px-4 py-2.5 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <span>🔄</span>
          <span>Actualizar Datos</span>
        </button>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50">Cargando métricas de la plataforma...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
        {{ errorMessage() }}
      </div>

      <!-- Metrics Content -->
      <div *ngIf="!isLoading() && metrics()" class="space-y-8">
        <!-- Main Financial KPI Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- GMV -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-dark/50 uppercase tracking-wider">Volumen Total (GMV)</span>
              <span class="text-xl">💰</span>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-dark font-mono">
              \${{ metrics()!.total_gmv | number:'1.2-2' }} <span class="text-xs font-normal text-dark/50">MXN</span>
            </p>
            <p class="text-[11px] text-dark/50">
              En <strong class="text-dark font-semibold">{{ metrics()!.total_orders_count }}</strong> órdenes confirmadas
            </p>
          </div>

          <!-- Platform Commissions -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-dark/50 uppercase tracking-wider">Comisiones TicketFlow</span>
              <span class="text-xl">📈</span>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
              \${{ metrics()!.total_platform_commission | number:'1.2-2' }} <span class="text-xs font-normal text-dark/50">MXN</span>
            </p>
            <p class="text-[11px] text-emerald-700/70 font-medium">
              Retención neta por servicio
            </p>
          </div>

          <!-- Tickets Sold -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-dark/50 uppercase tracking-wider">Boletos Emitidos</span>
              <span class="text-xl">🎟️</span>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-dark font-mono">
              {{ metrics()!.total_tickets_sold | number }}
            </p>
            <p class="text-[11px] text-dark/50">
              Códigos QR activos
            </p>
          </div>

          <!-- Active Events -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-dark/50 uppercase tracking-wider">Eventos Activos</span>
              <span class="text-xl">🎪</span>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-dark font-mono">
              {{ metrics()!.active_events_count }}
            </p>
            <p class="text-[11px] text-dark/50">
              De <strong class="text-dark font-semibold">{{ metrics()!.total_events_count }}</strong> eventos registrados
            </p>
          </div>
        </div>

        <!-- Direct Navigation Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Payouts & Liquidations -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl font-bold">
                💳
              </div>
              <div>
                <h2 class="font-black text-base text-dark">Liquidaciones & Pagos</h2>
                <p class="text-xs text-dark/50">Dispersión de fondos a creadores</p>
              </div>
            </div>
            <p class="text-xs text-dark/70">
              Controla las transferencias bancarias SPEI, PayPal o registros manuales con comprobante adjunto.
            </p>
            <a routerLink="/payouts">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Gestionar Liquidaciones</span>
                <span>→</span>
              </button>
            </a>
          </div>

          <!-- Venues Moderation -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-xl font-bold">
                📍
              </div>
              <div>
                <h2 class="font-black text-base text-dark">Recintos y Sedes</h2>
                <p class="text-xs text-dark/50">Sedes registradas en la plataforma</p>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs font-bold text-dark/70">
              <span>Registrados: {{ metrics()!.total_venues_count }}</span>
              <span class="text-emerald-600">Verificados: {{ metrics()!.verified_venues_count }}</span>
            </div>
            <a routerLink="/venues">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Auditar y Verificar Sedes</span>
                <span>→</span>
              </button>
            </a>
          </div>

          <!-- Users Management -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl font-bold">
                👥
              </div>
              <div>
                <h2 class="font-black text-base text-dark">Usuarios & Roles</h2>
                <p class="text-xs text-dark/50">Control de permisos global</p>
              </div>
            </div>
            <div class="text-xs font-bold text-dark/70">
              <span>Cuentas totales: {{ metrics()!.total_users_count }}</span>
            </div>
            <a routerLink="/users">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Administrar Usuarios</span>
                <span>→</span>
              </button>
            </a>
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
