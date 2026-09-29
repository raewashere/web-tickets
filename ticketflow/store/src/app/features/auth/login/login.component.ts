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
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SpinnerComponent,
  ],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-surface">
      <div class="max-w-md w-full space-y-6">
        <!-- Brand Header -->
        <div class="text-center space-y-2">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-primary to-accent items-center justify-center shadow-lg shadow-primary/20 mb-1">
            <i class="fa-solid fa-ticket text-surface font-bold text-xl"></i>
          </div>
          <h2 class="text-2xl sm:text-3xl font-bold text-dark tracking-tight">
            Inicia Sesión en TicketFlow
          </h2>
          <p class="text-xs sm:text-sm text-dark/50">
            Accede a tus entradas compradas, descargas de QR y checkouts rápidos.
          </p>
        </div>

        <div class="bg-white rounded-3xl border border-dark/10 shadow-md p-6 sm:p-8">
          <!-- Error alert -->
          <div
            *ngIf="errorMessage()"
            class="mb-5 p-3.5 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs flex items-center gap-2"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>

          <!-- Google Sign In Button -->
          <button
            type="button"
            (click)="onGoogleSignIn()"
            [disabled]="isGoogleLoading() || isLoading()"
            class="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-dark/20 bg-white hover:bg-surface text-dark font-bold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-5"
          >
            <span *ngIf="!isGoogleLoading()" class="flex items-center gap-3">
              <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continuar con Google</span>
            </span>
            <span *ngIf="isGoogleLoading()" class="flex items-center justify-center gap-2">
              <tf-spinner size="sm" color="primary"></tf-spinner>
              <span>Conectando con Google...</span>
            </span>
          </button>

          <!-- Divider -->
          <div class="relative flex py-2 items-center mb-5">
            <div class="flex-grow border-t border-dark/10"></div>
            <span class="flex-shrink mx-3 text-dark/40 text-xs uppercase font-medium tracking-wider">o con correo electrónico</span>
            <div class="flex-grow border-t border-dark/10"></div>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Email -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark/80 mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                formControlName="email"
                placeholder="tu@email.com"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-white text-dark placeholder-dark/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid"
                class="text-xs text-danger font-semibold mt-1"
              >
                Ingresa un correo electrónico válido.
              </p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark/80 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-white text-dark placeholder-dark/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid"
                class="text-xs text-danger font-semibold mt-1"
              >
                La contraseña es obligatoria.
              </p>
            </div>

            <button
              type="submit"
              class="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-surface font-bold text-sm transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              [disabled]="loginForm.invalid || isLoading() || isGoogleLoading()"
            >
              <span *ngIf="!isLoading()">Entrar a mi Cuenta</span>
              <span *ngIf="isLoading()" class="flex items-center justify-center gap-2">
                <tf-spinner size="sm" color="white"></tf-spinner>
                <span>Iniciando sesión...</span>
              </span>
            </button>
          </form>

          <div class="mt-6 pt-4 border-t border-dark/10 text-center text-xs text-dark/60">
            ¿Aún no tienes cuenta?
            <a routerLink="/register" class="font-bold text-primary hover:underline ml-1">
              Crear una cuenta gratis
            </a>
          </div>
        </div>
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
  readonly isGoogleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onGoogleSignIn(): Promise<void> {
    if (this.isGoogleLoading() || this.isLoading()) return;
    this.isGoogleLoading.set(true);
    this.errorMessage.set(null);

    try {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
      const { error } = await this.auth.signInWithGoogle('customer', returnUrl);
      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con Google';
      this.errorMessage.set(msg);
      this.isGoogleLoading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading() || this.isGoogleLoading()) return;

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
