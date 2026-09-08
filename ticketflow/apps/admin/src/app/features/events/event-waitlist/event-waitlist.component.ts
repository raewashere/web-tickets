import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventWaitlistService } from './event-waitlist.service';
import type { WaitlistEntryWithRelations } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-event-waitlist',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-4">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark/10">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-dark">
              🔔 Lista de Espera
            </h3>
            <span class="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {{ pendingCount() }} pendientes
            </span>
          </div>
          <p class="text-xs text-dark/60 mt-0.5">
            Usuarios suscritos para recibir alerta cuando se liberen localidades agotadas.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="loadWaitlist()"
            class="px-2.5 py-1.5 rounded-lg bg-dark/5 hover:bg-dark/10 text-dark font-bold text-xs transition"
            title="Refrescar lista"
          >
            🔄
          </button>

          <button
            *ngIf="pendingCount() > 0"
            type="button"
            (click)="openNotifyModal()"
            class="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <span>📢</span>
            <span>Notificar Siguientes</span>
          </button>
        </div>
      </div>

      <!-- Toast Feedback -->
      <div
        *ngIf="feedbackMessage()"
        class="p-3 rounded-xl flex items-center justify-between text-xs font-semibold"
        [ngClass]="feedbackType() === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'"
      >
        <span>{{ feedbackMessage() }}</span>
        <button type="button" (click)="feedbackMessage.set(null)" class="text-xs px-1 hover:opacity-75">✕</button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-8 flex flex-col items-center gap-2">
        <tf-spinner size="sm" color="primary"></tf-spinner>
        <p class="text-xs text-dark/50">Cargando lista de espera...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && entries().length === 0" class="py-8 text-center text-dark/50 space-y-1">
        <span class="text-3xl block">📋</span>
        <p class="text-xs font-semibold">No hay usuarios registrados en la lista de espera.</p>
        <p class="text-[11px] text-dark/40">Cuando las localidades se agoten, los compradores podrán anotarse aquí.</p>
      </div>

      <!-- Waitlist Queue Table -->
      <div *ngIf="!isLoading() && entries().length > 0" class="overflow-hidden rounded-xl border border-dark/10">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-dark/5 border-b border-dark/10 text-[10px] font-bold text-dark/70 uppercase">
                <th class="p-2.5 pl-3 w-12 text-center">Fila</th>
                <th class="p-2.5">Usuario / Correo</th>
                <th class="p-2.5">Localidad</th>
                <th class="p-2.5">Teléfono</th>
                <th class="p-2.5">Fecha</th>
                <th class="p-2.5 pr-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark/5">
              <tr *ngFor="let entry of entries(); let i = index" class="hover:bg-dark/[0.02]">
                <!-- Queue Position -->
                <td class="p-2.5 pl-3 text-center font-mono font-bold text-dark/60">
                  #{{ i + 1 }}
                </td>

                <!-- Customer Info -->
                <td class="p-2.5">
                  <div class="font-bold text-dark">{{ entry.user_display_name || 'Comprador' }}</div>
                  <div class="text-[10px] text-dark/50">{{ entry.email }}</div>
                </td>

                <!-- Ticket Tier -->
                <td class="p-2.5 font-semibold text-dark/80">
                  {{ entry.ticket_type_name }}
                </td>

                <!-- Phone -->
                <td class="p-2.5 text-dark/60 font-mono text-[11px]">
                  {{ entry.phone_number || '—' }}
                </td>

                <!-- Registered At -->
                <td class="p-2.5 text-dark/50 whitespace-nowrap text-[11px]">
                  {{ entry.created_at | date:'shortDate' }}
                </td>

                <!-- Status Badge -->
                <td class="p-2.5 pr-3 text-right">
                  <span
                    *ngIf="entry.status === 'pending'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800"
                  >
                    ⏳ Pendiente
                  </span>
                  <span
                    *ngIf="entry.status === 'notified'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800"
                    [title]="'Notificado: ' + (entry.notified_at | date:'medium')"
                  >
                    🔔 Notificado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Batch Notification Modal -->
      <div
        *ngIf="showNotifyModal()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-md bg-white rounded-3xl p-6 space-y-5 shadow-2xl border border-dark/10">
          <button
            type="button"
            (click)="showNotifyModal.set(false)"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-dark/5 text-dark/50 font-bold flex items-center justify-center transition"
          >
            ✕
          </button>

          <!-- Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">
              Liberación de Lugares
            </span>
            <h3 class="text-xl font-black text-dark">
              Notificar Lista de Espera
            </h3>
            <p class="text-xs text-dark/60">
              Selecciona cuántos usuarios en la fila recibirán el aviso de disponibilidad de boletos.
            </p>
          </div>

          <!-- Quantity selector -->
          <div class="space-y-3 text-xs">
            <div class="space-y-1">
              <label class="font-bold text-dark">Cantidad de usuarios a notificar:</label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  *ngFor="let n of [5, 10, 20, 50]"
                  (click)="notifyBatchSize = n"
                  [class.bg-dark]="notifyBatchSize === n"
                  [class.text-white]="notifyBatchSize === n"
                  [class.bg-dark/5]="notifyBatchSize !== n"
                  [class.text-dark]="notifyBatchSize !== n"
                  class="px-3 py-1.5 rounded-xl font-bold transition"
                >
                  {{ n }}
                </button>
                <input
                  type="number"
                  [(ngModel)]="notifyBatchSize"
                  min="1"
                  max="100"
                  class="w-20 px-2.5 py-1.5 rounded-xl border border-dark/20 text-center font-bold"
                />
              </div>
            </div>

            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              💡 <strong>Regla FIFO:</strong> Se notificará en estricto orden cronológico a los primeros {{ notifyBatchSize }} usuarios registrados pendientes.
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-dark/10">
            <button
              type="button"
              (click)="showNotifyModal.set(false)"
              [disabled]="isNotifying()"
              class="px-4 py-2 rounded-xl text-dark/70 font-bold text-xs hover:bg-dark/5 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmNotifyWaitlist()"
              [disabled]="isNotifying()"
              class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition flex items-center gap-2"
            >
              <tf-spinner *ngIf="isNotifying()" size="sm" color="white"></tf-spinner>
              <span>{{ isNotifying() ? 'Notificando...' : 'Confirmar y Notificar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EventWaitlistComponent implements OnInit {
  @Input({ required: true }) eventId!: string;

  private readonly waitlistService = inject(EventWaitlistService);

  readonly isLoading = signal(true);
  readonly entries = signal<WaitlistEntryWithRelations[]>([]);

  readonly showNotifyModal = signal(false);
  notifyBatchSize = 5;
  readonly isNotifying = signal(false);

  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<'success' | 'error'>('success');

  readonly pendingCount = computed(() => this.entries().filter((e) => e.status === 'pending').length);
  readonly notifiedCount = computed(() => this.entries().filter((e) => e.status === 'notified').length);

  async ngOnInit(): Promise<void> {
    if (this.eventId) {
      await this.loadWaitlist();
    }
  }

  async loadWaitlist(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.waitlistService.getEventWaitlist(this.eventId);
      this.entries.set(data);
    } catch (err: any) {
      console.error('Error loading waitlist:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  openNotifyModal(): void {
    this.notifyBatchSize = Math.min(5, this.pendingCount() || 5);
    this.showNotifyModal.set(true);
  }

  async confirmNotifyWaitlist(): Promise<void> {
    this.isNotifying.set(true);
    try {
      const notified = await this.waitlistService.notifyWaitlist(
        this.eventId,
        null,
        this.notifyBatchSize
      );

      this.showNotifyModal.set(false);
      this.feedbackType.set('success');
      this.feedbackMessage.set(`Se han notificado ${notified.length} usuarios de la lista de espera exitosamente.`);
      await this.loadWaitlist();
    } catch (err: any) {
      this.feedbackType.set('error');
      this.feedbackMessage.set(err.message || 'Error al notificar a la lista de espera.');
    } finally {
      this.isNotifying.set(false);
    }
  }
}
