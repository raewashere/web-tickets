import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService, AuthService } from '@ticketflow/data-access';

@Component({
  selector: 'app-backoffice-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-[#161b22] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <!-- Logo and Header -->
        <div class="text-center space-y-2">
          <div class="w-14 h-14 rounded-2xl bg-accent text-dark font-black text-2xl flex items-center justify-center mx-auto shadow-lg">
            <i class="fa-solid fa-bolt"></i>
          </div>
          <h1 class="text-2xl font-black text-white tracking-tight">TicketFlow Backoffice</h1>
          <p class="text-xs text-white/60">Acceso exclusivo para Super Administradores</p>
        </div>

        <!-- Error message -->
        <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {{ errorMessage() }}
        </div>

        <!-- Google OAuth Button -->
        <button
          type="button"
          (click)="loginWithGoogle()"
          [disabled]="isLoading()"
          class="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-dark font-bold text-sm shadow-md transition flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Iniciar sesión con Google</span>
        </button>

        <div class="relative flex items-center justify-center my-4">
          <div class="border-t border-white/10 w-full"></div>
          <span class="bg-[#161b22] px-3 text-[10px] uppercase font-bold text-white/40 absolute">O con credenciales</span>
        </div>

        <!-- Form Email/Password -->
        <form (ngSubmit)="loginWithEmail()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-white/70 mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="admin@ticketflow.com"
              class="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-white/70 mb-1.5">Contraseña</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="••••••••"
              class="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <button
            type="submit"
            [disabled]="isLoading() || !email || !password"
            class="w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-dark font-black text-sm shadow-md transition disabled:opacity-50 mt-2"
          >
            <span *ngIf="isLoading()">Verificando permisos...</span>
            <span *ngIf="!isLoading()">Entrar al Backoffice →</span>
          </button>
        </form>
      </div>
    </div>
  `,
})
export class BackofficeLoginComponent {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async loginWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      this.errorMessage.set(error.message);
      this.isLoading.set(false);
    }
  }

  async loginWithEmail(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: this.email,
      password: this.password,
    });

    if (error) {
      this.errorMessage.set(error.message);
      this.isLoading.set(false);
      return;
    }

    if (data.user) {
      const authState = await this.auth.waitForAuthReady();
      if (this.auth.isAdmin()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set('Acceso denegado: este usuario no tiene rol de Super-Admin.');
        await this.auth.logout();
      }
    }
    this.isLoading.set(false);
  }
}
