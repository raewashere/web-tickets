import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SpinnerComponent,
  ],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div class="max-w-md w-full space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 items-center justify-center shadow-lg shadow-cyan-500/20 mb-1">
            <span class="text-slate-950 font-black text-2xl">🎫</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Crea tu Cuenta en TicketFlow
          </h2>
          <p class="text-xs sm:text-sm text-slate-500">
            Regístrate en segundos para comprar boletos oficiales de tus artistas favoritos.
          </p>
        </div>

        <div class="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8">
          <!-- Error alert -->
          <div
            *ngIf="errorMessage()"
            class="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Full Name -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Ej. Carlos Mendoza"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="registerForm.get('name')?.touched && registerForm.get('name')?.invalid"
                class="text-xs text-rose-600 font-semibold mt-1"
              >
                Ingresa tu nombre completo.
              </p>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Correo Electrónico *
              </label>
              <input
                type="email"
                formControlName="email"
                placeholder="tu@email.com"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.invalid"
                class="text-xs text-rose-600 font-semibold mt-1"
              >
                Ingresa un correo electrónico válido.
              </p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Contraseña (mínimo 6 caracteres) *
              </label>
              <input
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.invalid"
                class="text-xs text-rose-600 font-semibold mt-1"
              >
                La contraseña debe tener al menos 6 caracteres.
              </p>
            </div>

            <button
              type="submit"
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              [disabled]="registerForm.invalid || isLoading()"
            >
              <span *ngIf="!isLoading()">Crear Cuenta</span>
              <span *ngIf="isLoading()" class="flex items-center justify-center gap-2">
                <tf-spinner size="sm" color="dark"></tf-spinner>
                <span>Creando cuenta...</span>
              </span>
            </button>
          </form>

          <div class="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            ¿Ya tienes una cuenta?
            <a routerLink="/login" class="font-bold text-cyan-600 hover:underline ml-1">
              Iniciar Sesión
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { name, email, password } = this.registerForm.value;

    try {
      const { error } = await this.auth.register(email, password, name);
      if (error) {
        throw error;
      }
      this.router.navigate(['/']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}
