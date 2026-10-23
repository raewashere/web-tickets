import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventWaitlistService } from './event-waitlist.service';
import type { WaitlistEntryWithRelations } from '@ticketflow/models';
import { SpinnerComponent, ToastService } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-event-waitlist',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-4">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
              <i class="fa-solid fa-bell text-amber-500"></i> Lista de Espera
            </h3>
            <span class="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {{ pendingCount() }} pendientes
            </span>
          </div>
          <p class="text-xs text-on-surface-variant mt-0.5">
            Usuarios suscritos para recibir alerta por correo (Resend) cuando se liberen localidades agotadas.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="loadWaitlist()"
            class="px-2.5 py-1.5 rounded-lg bg-surface-variant/60 hover:bg-surface-variant text-on-surface font-bold text-xs transition"
            title="Refrescar lista"
          >
            <i class="fa-solid fa-rotate-right" [class.animate-spin]="isLoading()"></i>
          </button>

          <button
            *ngIf="pendingCount() > 0"
            type="button"
            (click)="openNotifyModal()"
            class="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <i class="fa-solid fa-bullhorn"></i>
            <span>Notificar Siguientes</span>
          </button>
        </div>
      </div>

      <!-- Toast Feedback Banner -->
      <div
        *ngIf="feedbackMessage()"
        class="p-3 rounded-xl flex items-center justify-between text-xs font-semibold"
        [ngClass]="feedbackType() === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-error-container text-on-error-container border border-error/30'"
      >
        <span>{{ feedbackMessage() }}</span>
        <button type="button" (click)="feedbackMessage.set(null)" class="text-xs px-1 hover:opacity-75">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-8 flex flex-col items-center gap-2">
        <tf-spinner size="sm" color="primary"></tf-spinner>
        <p class="text-xs text-on-surface-variant">Cargando lista de espera...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && entries().length === 0" class="py-8 text-center text-on-surface-variant space-y-1">
        <span class="text-3xl block opacity-40">
          <i class="fa-solid fa-clipboard-list"></i>
        </span>
        <p class="text-xs font-semibold">No hay usuarios registrados en la lista de espera.</p>
        <p class="text-[11px] opacity-75">Cuando las localidades se agoten, los compradores podrán anotarse aquí.</p>
      </div>

      <!-- Waitlist Queue Table -->
      <div *ngIf="!isLoading() && entries().length > 0" class="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-surface-variant/40 border-b border-outline-variant/20 text-[10px] font-bold text-on-surface-variant uppercase">
                <th class="p-2.5 pl-3 w-12 text-center">Fila</th>
                <th class="p-2.5">Usuario / Correo</th>
                <th class="p-2.5">Localidad</th>
                <th class="p-2.5">Teléfono</th>
                <th class="p-2.5">Fecha</th>
                <th class="p-2.5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/15 text-on-surface">
              <tr *ngFor="let entry of entries(); let i = index" class="hover:bg-surface-variant/30 transition">
                <td class="p-2.5 pl-3 text-center font-bold text-on-surface-variant">#{{ i + 1 }}</td>
                <td class="p-2.5">
                  <p class="font-bold">{{ entry.user_display_name || 'Usuario' }}</p>
                  <p class="text-[11px] text-on-surface-variant">{{ entry.email }}</p>
                </td>
                <td class="p-2.5">
                  <span class="font-medium px-2 py-0.5 rounded-md bg-surface-variant/60 text-on-surface text-[11px]">
                    {{ entry.ticket_type_name || 'Cualquier localidad' }}
                  </span>
                </td>
                <td class="p-2.5 text-on-surface-variant font-mono text-[11px]">
                  {{ entry.phone_number || '-' }}
                </td>
                <td class="p-2.5 text-on-surface-variant text-[11px]">
                  {{ entry.created_at | date:'short' }}
                </td>
                <td class="p-2.5 text-center">
                  <span
                    *ngIf="entry.status === 'pending'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  >
                    <i class="fa-regular fa-clock text-[9px]"></i> Pendiente
                  </span>
                  <span
                    *ngIf="entry.status === 'notified'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    [title]="'Notificado: ' + (entry.notified_at | date:'medium')"
                  >
                    <i class="fa-solid fa-envelope-circle-check text-[9px]"></i> Correo Enviado
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
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-md bg-surface-container-high text-on-surface rounded-3xl p-6 space-y-5 shadow-2xl border border-outline-variant/30">
          <button
            type="button"
            (click)="showNotifyModal.set(false)"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-variant text-on-surface-variant font-bold flex items-center justify-center transition"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <!-- Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full inline-block">
              Liberación de Lugares · Resend
            </span>
            <h3 class="text-xl font-bold text-on-surface">
              Notificar Lista de Espera
            </h3>
            <p class="text-xs text-on-surface-variant">
              Selecciona cuántos usuarios en la fila recibirán el correo prioritario con enlace directo para comprar boletos.
            </p>
          </div>

          <!-- Quantity selector -->
          <div class="space-y-3 text-xs">
            <div class="space-y-1.5">
              <label class="font-bold text-on-surface block">Cantidad de usuarios a notificar por correo:</label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  *ngFor="let n of [5, 10, 20, 50]"
                  (click)="notifyBatchSize = n"
                  [ngClass]="notifyBatchSize === n ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-variant'"
                  class="px-3 py-1.5 rounded-xl font-bold transition"
                >
                  {{ n }}
                </button>
                <input
                  type="number"
                  [(ngModel)]="notifyBatchSize"
                  min="1"
                  max="100"
                  class="w-20 px-2.5 py-1.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-on-surface text-[11px] leading-relaxed flex items-start gap-2">
              <i class="fa-solid fa-lightbulb text-amber-500 mt-0.5 flex-shrink-0"></i>
              <span><strong>Regla FIFO + Resend:</strong> Se enviará un correo automático en estricto orden cronológico a los primeros {{ notifyBatchSize }} usuarios pendientes con el enlace directo al evento.</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
            <button
              type="button"
              (click)="showNotifyModal.set(false)"
              [disabled]="isNotifying()"
              class="px-4 py-2 rounded-xl text-on-surface-variant font-bold text-xs hover:bg-surface-variant transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmNotifyWaitlist()"
              [disabled]="isNotifying()"
              class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition flex items-center gap-2"
            >
              <tf-spinner *ngIf="isNotifying()" size="sm" color="dark"></tf-spinner>
              <span>{{ isNotifying() ? 'Enviando correos...' : 'Confirmar y Enviar Correos' }}</span>
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
  private readonly toast = inject(ToastService);

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
    } catch (err: unknown) {
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
      const result = await this.waitlistService.notifyWaitlist(
        this.eventId,
        null,
        this.notifyBatchSize
      );

      this.showNotifyModal.set(false);
      const count = result.notified.length;
      const msg =
        result.emailStatus === 'sent'
          ? `Se enviaron ${result.emailsSent} correos de disponibilidad vía Resend.`
          : `Se notificaron ${count} usuarios en la lista de espera.`;

      this.feedbackType.set('success');
      this.feedbackMessage.set(msg);
      this.toast.success('Lista de Espera Notificada', msg);
      await this.loadWaitlist();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error al notificar a la lista de espera.';
      this.feedbackType.set('error');
      this.feedbackMessage.set(errMsg);
      this.toast.error('Error al notificar', errMsg);
    } finally {
      this.isNotifying.set(false);
    }
  }
}
