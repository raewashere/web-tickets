import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';
import { ButtonComponent, CardComponent, InputComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    InputComponent,
  ],

  template: `
    <div class="min-h-screen bg-dark flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      <!-- Decorative background glow -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-contrast/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-md relative z-10">
        <!-- Logo & Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 text-primary border border-primary/30 font-black text-2xl mb-4 shadow-lg shadow-primary/10">
            TF
          </div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">TicketFlow</h1>
          <p class="text-surface/60 text-sm mt-1">Portal de Artistas y Organizadores</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white rounded-2xl shadow-xl p-8 border border-white/10">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-dark">Iniciar Sesión</h2>
            <p class="text-xs text-dark/60 mt-1">Ingresa tus credenciales para administrar tus eventos.</p>
          </div>

          <!-- Error Alert -->
          <div
            *ngIf="errorMessage"
            class="mb-4 p-3 rounded-lg bg-contrast/10 border border-contrast/30 text-contrast text-xs flex items-center gap-2"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Google Sign In Button -->
          <button
            type="button"
            (click)="onGoogleSignIn()"
            [disabled]="isGoogleLoading || isLoading"
            class="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-dark/20 bg-white hover:bg-surface/50 text-dark font-bold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-5"
          >
            <span *ngIf="!isGoogleLoading" class="flex items-center gap-3">
              <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continuar con Google</span>
            </span>
            <span *ngIf="isGoogleLoading" class="flex items-center justify-center gap-2">
              <span class="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              <span>Conectando con Google...</span>
            </span>
          </button>

          <!-- Divider -->
          <div class="relative flex py-2 items-center mb-5">
            <div class="flex-grow border-t border-dark/10"></div>
            <span class="flex-shrink mx-3 text-dark/40 text-xs uppercase font-medium tracking-wider">o con correo</span>
            <div class="flex-grow border-t border-dark/10"></div>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <tf-input
                label="Correo Electrónico"
                type="email"
                placeholder="tu@ejemplo.com"
                formControlName="email"
                [required]="true"
                [error]="getEmailError()"
              ></tf-input>
            </div>

            <div>
              <tf-input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                formControlName="password"
                [required]="true"
                [error]="getPasswordError()"
              ></tf-input>
            </div>

            <div class="pt-2">
              <tf-button
                type="submit"
                variant="primary"
                size="lg"
                [loading]="isLoading"
                [disabled]="loginForm.invalid || isLoading || isGoogleLoading"
                class="w-full"
              >
                Ingresar al Portal
              </tf-button>
            </div>
          </form>

          <div class="mt-6 pt-6 border-t border-dark/10 text-center text-xs text-dark/60">
            ¿Aún no tienes una cuenta de artista?
            <a routerLink="/register" class="font-semibold text-dark hover:text-primary transition-colors ml-1 underline">
              Regístrate aquí
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

  isLoading = false;
  isGoogleLoading = false;
  errorMessage: string | null = null;

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  getEmailError(): string | undefined {
    const control = this.loginForm.get('email');
    if (control?.touched && control.errors) {
      if (control.errors['required']) return 'El correo es obligatorio';
      if (control.errors['email']) return 'Formato de correo no válido';
    }
    return undefined;
  }

  getPasswordError(): string | undefined {
    const control = this.loginForm.get('password');
    if (control?.touched && control.errors) {
      if (control.errors['required']) return 'La contraseña es obligatoria';
      if (control.errors['minlength']) return 'Mínimo 6 caracteres';
    }
    return undefined;
  }

  async onGoogleSignIn(): Promise<void> {
    if (this.isGoogleLoading || this.isLoading) return;
    this.isGoogleLoading = true;
    this.errorMessage = null;

    try {
      const { error } = await this.auth.signInWithGoogle('artist', '/dashboard');
      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      this.errorMessage = err instanceof Error ? err.message : 'Error al conectar con Google';
      this.isGoogleLoading = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.isGoogleLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.value;
    const { error } = await this.auth.login(email, password);

    this.isLoading = false;

    if (error) {
      this.errorMessage =
        error.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
          : error.message;
      return;
    }

    await this.router.navigate(['/dashboard']);
  }
}
