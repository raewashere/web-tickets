import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventStaffService } from '../../events/event-staff/event-staff.service';
import { AuthService } from '@ticketflow/data-access';
import type { StaffInvitationWithRelations } from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="min-h-screen bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <i class="fa-solid fa-ticket text-4xl text-primary block mb-2"></i>
        <h1 class="text-2xl font-black text-dark tracking-tight">TicketFlow</h1>
        <p class="text-xs text-dark/60 font-medium">Invitación al Control de Admisión</p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <!-- Loading State -->
        <tf-card *ngIf="isLoading()" class="py-12 flex flex-col items-center justify-center gap-3 text-center">
          <tf-spinner size="lg" color="primary"></tf-spinner>
          <span class="text-xs text-dark/60">Verificando invitación...</span>
        </tf-card>

        <!-- Error State -->
        <tf-card *ngIf="!isLoading() && errorMessage()" class="space-y-4 text-center">
          <i class="fa-solid fa-triangle-exclamation text-4xl text-rose-500 block mb-2"></i>
          <h3 class="text-base font-bold text-dark">{{ errorMessage() }}</h3>
          <p class="text-xs text-dark/60">
            Comunícate con el organizador del evento para solicitar una nueva invitación.
          </p>
          <a routerLink="/login" class="inline-block mt-2">
            <tf-button variant="secondary" size="md">Ir al Inicio de Sesión</tf-button>
          </a>
        </tf-card>

        <!-- Invitation Details & Action Card -->
        <tf-card *ngIf="!isLoading() && invitation() && !errorMessage()" class="space-y-6">
          <!-- Event Header Strip -->
          <div class="space-y-2 text-center pb-4 border-b border-dark/10">
            <tf-badge variant="primary">Invitación de Personal</tf-badge>
            <h2 class="text-xl font-black text-dark leading-tight">
              {{ invitation()!.events?.name || 'Evento Oficial' }}
            </h2>
            <p class="text-xs text-dark/60" *ngIf="invitation()!.events?.event_date">
              <i class="fa-regular fa-calendar mr-1"></i> {{ invitation()!.events?.event_date | date:'EEEE d MMMM y, HH:mm' }} hrs
            </p>
          </div>

          <!-- Description -->
          <div class="bg-dark/5 p-4 rounded-2xl text-xs text-dark/80 space-y-2 leading-relaxed">
            <p class="font-bold text-dark">Rol: Control de Admisión (Doorman)</p>
            <p>
              Has sido invitado para validar boletos oficiales y registrar accesos mediante el escáner QR durante este evento.
            </p>
          </div>

          <!-- Logged in as -->
          <div *ngIf="auth.isAuthenticated()" class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
            <div>
              <span class="font-bold block">Sesión Activa</span>
              <span>{{ auth.user()?.email }}</span>
            </div>
            <i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
          </div>

          <!-- Action Button -->
          <div class="space-y-3">
            <!-- If logged in: Accept button -->
            <tf-button
              *ngIf="auth.isAuthenticated()"
              variant="primary"
              size="lg"
              class="w-full"
              [disabled]="isProcessing()"
              (click)="onAcceptInvite()"
            >
              <span *ngIf="!isProcessing()" class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-check"></i> Aceptar Invitación y Entrar</span>
              <tf-spinner *ngIf="isProcessing()" size="sm" color="dark"></tf-spinner>
            </tf-button>

            <!-- If NOT logged in: Google Sign In -->
            <div *ngIf="!auth.isAuthenticated()" class="space-y-2">
              <tf-button
                variant="primary"
                size="lg"
                class="w-full"
                (click)="onSignInWithGoogle()"
              >
                <span class="flex items-center justify-center gap-2"><i class="fa-brands fa-google"></i> Iniciar Sesión con Google</span>
              </tf-button>

              <a [routerLink]="['/login']" [queryParams]="{ returnUrl: currentUrl }">
                <tf-button variant="secondary" size="md" class="w-full">
                  Iniciar con Correo Electrónico
                </tf-button>
              </a>
            </div>
          </div>
        </tf-card>
      </div>
    </div>
  `,
})
export class AcceptInviteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffService = inject(EventStaffService);
  readonly auth = inject(AuthService);

  readonly isLoading = signal(true);
  readonly isProcessing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly invitation = signal<StaffInvitationWithRelations | null>(null);

  token = '';
  currentUrl = '';

  async ngOnInit(): Promise<void> {
    await this.auth.waitForAuthReady();

    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.currentUrl = `/staff-invite?token=${this.token}`;

    if (!this.token) {
      this.errorMessage.set('Token de invitación ausente o enlace incompleto.');
      this.isLoading.set(false);
      return;
    }

    try {
      const invite = await this.staffService.getInvitationByToken(this.token);

      if (!invite) {
        this.errorMessage.set('Esta invitación no existe o el enlace es incorrecto.');
        return;
      }

      if (invite.status === 'revoked') {
        this.errorMessage.set('Esta invitación fue cancelada o revocada por el organizador.');
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        this.errorMessage.set('Esta invitación ha expirado.');
        return;
      }

      this.invitation.set(invite);
    } catch (err: unknown) {
      this.errorMessage.set('Error al verificar la invitación.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onAcceptInvite(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    this.isProcessing.set(true);

    try {
      const res = await this.staffService.acceptInvitation(this.token, user.id);

      if (!res.success) {
        this.errorMessage.set(res.error || 'Error al aceptar invitación.');
        this.isProcessing.set(false);
        return;
      }

      // Navigate directly to access control for their assigned event
      this.router.navigate(['/access-control']);
    } catch (err: unknown) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al procesar aceptación.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  onSignInWithGoogle(): void {
    this.auth.signInWithGoogle('doorman', this.currentUrl);
  }
}
