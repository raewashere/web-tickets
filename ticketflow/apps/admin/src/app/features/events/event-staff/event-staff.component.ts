import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventStaffService } from './event-staff.service';
import { AuthService } from '@ticketflow/data-access';
import type { EventStaffMember, StaffInvitationWithRelations } from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-event-staff',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-dark flex items-center gap-2">
            <span>🛡️</span>
            <span>Personal de Control de Admisión</span>
          </h3>
          <p class="text-xs text-dark/60 mt-0.5">
            Invita a validadores de boletos por correo. Solo tendrán acceso al escáner para este evento específico.
          </p>
        </div>

        <button
          type="button"
          (click)="showInviteForm.set(!showInviteForm())"
          class="px-3.5 py-2 rounded-xl bg-primary text-dark font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs"
        >
          <span>{{ showInviteForm() ? '✕ Cancelar' : '+ Invitar Validador' }}</span>
        </button>
      </div>

      <!-- Invite Form Drawer / Card -->
      <tf-card *ngIf="showInviteForm()">
        <form [formGroup]="inviteForm" (ngSubmit)="onSendInvite()" class="space-y-4">
          <div class="flex items-center justify-between border-b border-dark/10 pb-3">
            <h4 class="text-sm font-bold text-dark">Nueva Invitación para Validación de Accesos</h4>
            <span class="text-[11px] text-dark/50 font-mono">Rol: Doorman</span>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
              Correo Electrónico del Validador *
            </label>
            <div class="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                formControlName="email"
                placeholder="validador@ejemplo.com"
                class="flex-1 px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary text-xs transition-all"
              />
              <tf-button
                type="submit"
                variant="primary"
                size="md"
                [disabled]="inviteForm.invalid || isInviting()"
              >
                <span *ngIf="!isInviting()">✉️ Enviar Invitación</span>
                <tf-spinner *ngIf="isInviting()" size="sm" color="dark"></tf-spinner>
              </tf-button>
            </div>
            <p
              *ngIf="inviteForm.get('email')?.touched && inviteForm.get('email')?.invalid"
              class="text-xs text-contrast mt-1"
            >
              Ingresa un correo electrónico válido.
            </p>
          </div>

          <p class="text-[11px] text-dark/60 bg-dark/5 p-3 rounded-xl leading-relaxed">
            ℹ️ Al invitar al validador, se generará un enlace único. La persona podrá registrarse o iniciar sesión con Google/Correo para aceptar y acceder inmediatamente a la pantalla de escaneo de este evento.
          </p>
        </form>
      </tf-card>

      <!-- Alert Message -->
      <div
        *ngIf="feedbackMessage()"
        class="p-4 rounded-2xl text-xs font-semibold flex items-center justify-between"
        [ngClass]="{
          'bg-emerald-50 text-emerald-900 border border-emerald-200': feedbackType() === 'success',
          'bg-rose-50 text-rose-900 border border-rose-200': feedbackType() === 'error'
        }"
      >
        <span>{{ feedbackMessage() }}</span>
        <button type="button" (click)="feedbackMessage.set(null)" class="text-xs font-bold opacity-60 hover:opacity-100">✕</button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-12 flex flex-col items-center justify-center gap-2">
        <tf-spinner size="md" color="primary"></tf-spinner>
        <span class="text-xs text-dark/50">Cargando personal asignado...</span>
      </div>

      <!-- Staff Lists -->
      <div *ngIf="!isLoading()" class="space-y-6">
        <!-- 1. Active / Accepted Staff -->
        <tf-card>
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-dark/10 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-dark">Personal Asignado</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {{ activeStaff().length }}
                </span>
              </div>
            </div>

            <div *ngIf="activeStaff().length === 0" class="py-6 text-center text-xs text-dark/50">
              No hay validadores activos para este espectáculo todavía.
            </div>

            <div *ngIf="activeStaff().length > 0" class="divide-y divide-dark/10">
              <div
                *ngFor="let member of activeStaff()"
                class="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary/20 text-primary font-black flex items-center justify-center text-xs ring-1 ring-primary/30">
                    <img
                      *ngIf="member.profiles?.avatar_url"
                      [src]="member.profiles!.avatar_url!"
                      class="w-full h-full rounded-full object-cover"
                      alt="Avatar"
                    />
                    <span *ngIf="!member.profiles?.avatar_url">
                      {{ (member.profiles?.display_name || 'V')[0].toUpperCase() }}
                    </span>
                  </div>
                  <div>
                    <span class="font-bold text-dark block">
                      {{ member.profiles?.display_name || 'Validador Oficial' }}
                    </span>
                    <span class="text-[10px] text-dark/50">
                      Asignado: {{ member.created_at | date:'dd/MM/yyyy HH:mm' }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <tf-badge variant="success">Activo</tf-badge>
                  <button
                    type="button"
                    (click)="onRevokeStaff(member.id)"
                    class="text-xs text-contrast hover:underline font-bold"
                  >
                    Revocar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </tf-card>

        <!-- 2. Pending Invitations -->
        <tf-card *ngIf="invitations().length > 0">
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-dark/10 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-dark">Invitaciones Pendientes</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {{ pendingInvitations().length }}
                </span>
              </div>
            </div>

            <div class="divide-y divide-dark/10">
              <div
                *ngFor="let inv of pendingInvitations()"
                class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span class="font-bold text-dark block font-mono">{{ inv.email }}</span>
                  <span class="text-[10px] text-dark/50">
                    Expira: {{ inv.expires_at | date:'dd/MM/yyyy' }}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="copyInviteLink(inv.token)"
                    class="px-2.5 py-1 rounded-lg bg-dark/5 hover:bg-dark/10 text-dark font-bold text-[11px] transition-colors"
                  >
                    📋 Copiar Enlace
                  </button>
                  <button
                    type="button"
                    (click)="onRevokeInvite(inv.id)"
                    class="px-2.5 py-1 rounded-lg hover:bg-rose-50 text-contrast font-bold text-[11px] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </tf-card>
      </div>
    </div>
  `,
})
export class EventStaffComponent implements OnInit {
  @Input({ required: true }) eventId!: string;

  private readonly fb = inject(FormBuilder);
  private readonly staffService = inject(EventStaffService);
  private readonly auth = inject(AuthService);

  readonly isLoading = signal(true);
  readonly isInviting = signal(false);
  readonly showInviteForm = signal(false);

  readonly staffList = signal<EventStaffMember[]>([]);
  readonly invitations = signal<StaffInvitationWithRelations[]>([]);

  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<'success' | 'error'>('success');

  readonly activeStaff = () => this.staffList().filter((s) => s.status === 'accepted');
  readonly pendingInvitations = () => this.invitations().filter((i) => i.status === 'pending');

  readonly inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async ngOnInit(): Promise<void> {
    if (this.eventId) {
      await this.loadData();
    }
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [staff, invites] = await Promise.all([
        this.staffService.getEventStaff(this.eventId),
        this.staffService.getEventInvitations(this.eventId),
      ]);
      this.staffList.set(staff);
      this.invitations.set(invites);
    } catch (err: unknown) {
      console.error('Error loading event staff:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSendInvite(): Promise<void> {
    if (this.inviteForm.invalid) return;

    const email = this.inviteForm.get('email')?.value?.trim();
    if (!email) return;

    this.isInviting.set(true);
    this.feedbackMessage.set(null);

    try {
      const userId = this.auth.user()?.id;
      const invite = await this.staffService.inviteStaff(this.eventId, email, userId);
      this.inviteForm.reset();
      this.showInviteForm.set(false);
      this.feedbackType.set('success');
      this.feedbackMessage.set(`Invitación enviada a ${email}. Se ha generado el enlace de acceso.`);
      await this.loadData();
    } catch (err: unknown) {
      this.feedbackType.set('error');
      this.feedbackMessage.set(err instanceof Error ? err.message : 'Error al enviar invitación.');
    } finally {
      this.isInviting.set(false);
    }
  }

  async onRevokeStaff(staffId: string): Promise<void> {
    if (!confirm('¿Deseas revocar el acceso de este validador? Ya no podrá escanear boletos de este evento.')) {
      return;
    }

    try {
      await this.staffService.revokeStaff(staffId);
      this.feedbackType.set('success');
      this.feedbackMessage.set('Acceso revocado correctamente.');
      await this.loadData();
    } catch (err: unknown) {
      this.feedbackType.set('error');
      this.feedbackMessage.set('Error al revocar acceso.');
    }
  }

  async onRevokeInvite(inviteId: string): Promise<void> {
    try {
      await this.staffService.revokeInvitation(inviteId);
      await this.loadData();
    } catch (err: unknown) {
      this.feedbackType.set('error');
      this.feedbackMessage.set('Error al cancelar invitación.');
    }
  }

  copyInviteLink(token: string): void {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/staff-invite?token=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      this.feedbackType.set('success');
      this.feedbackMessage.set('¡Enlace de invitación copiado al portapapeles!');
    });
  }
}
