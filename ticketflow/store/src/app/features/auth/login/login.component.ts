import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';
import {
  ButtonComponent,
  CardComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'store-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-dark/5">
      <div class="max-w-md w-full space-y-6">
        <!-- Brand Header -->
        <div class="text-center space-y-2">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-accent to-contrast items-center justify-center shadow-lg mb-1">
            <span class="text-dark font-black text-2xl">🎫</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Inicia Sesión en TicketFlow
          </h2>
          <p class="text-xs text-dark/60">
            Accede a tus entradas compradas, descargas de QR y checkouts rápidos.
          </p>
        </div>

        <tf-card>
          <!-- Error alert -->
          <div
            *ngIf="errorMessage()"
            class="mb-5 p-3.5 rounded-xl bg-contrast/10 border border-contrast/20 text-contrast text-xs flex items-center gap-2"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Email -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                formControlName="email"
                placeholder="tu@email.com"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid"
                class="text-xs text-contrast mt-1"
              >
                Ingresa un correo electrónico válido.
              </p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid"
                class="text-xs text-contrast mt-1"
              >
                La contraseña es obligatoria.
              </p>
            </div>

            <tf-button
              type="submit"
              variant="primary"
              size="md"
              class="w-full mt-2"
              [disabled]="loginForm.invalid || isLoading()"
            >
              <span *ngIf="!isLoading()">Entrar a mi Cuenta</span>
              <span *ngIf="isLoading()" class="flex items-center gap-2">
                <tf-spinner size="sm" color="dark"></tf-spinner>
                <span>Iniciando sesión...</span>
              </span>
            </tf-button>
          </form>

          <div class="mt-6 pt-4 border-t border-dark/10 text-center text-xs text-dark/60">
            ¿Aún no tienes cuenta?
            <a routerLink="/register" class="font-bold text-primary hover:underline ml-1">
              Crear una cuenta gratis
            </a>
          </div>
        </tf-card>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    try {
      const { error } = await this.auth.login(email, password);
      if (error) {
        throw error;
      }
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
      this.router.navigateByUrl(returnUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}
