import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@ticketflow/data-access';

@Component({
  selector: 'store-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        <!-- Brand Logo -->
        <a routerLink="/" class="flex items-center gap-3 group flex-shrink-0">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <span class="text-slate-950 font-black text-lg leading-none">🎫</span>
          </div>
          <span class="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center select-none">
            Ticket<span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300 ml-0.5">Flow</span>
          </span>
        </a>

        <!-- Desktop Search Bar -->
        <div class="hidden md:flex items-center flex-1 max-w-md mx-6">
          <form (ngSubmit)="onSearchSubmit()" class="w-full relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="searchQuery"
              placeholder="Buscar conciertos, artistas o recintos..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-xs sm:text-sm transition-all shadow-inner"
            />
          </form>
        </div>

        <!-- Right Actions / User Navigation -->
        <div class="hidden sm:flex items-center gap-4">
          <a routerLink="/search" class="text-xs sm:text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors">
            Explorar Eventos
          </a>

          <!-- Authenticated State -->
          <div *ngIf="auth.isAuthenticated()" class="flex items-center gap-3">
            <a routerLink="/my-tickets">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition-colors shadow-sm"
              >
                🎟️ Mis Boletos
              </button>
            </a>

            <!-- User Menu -->
            <div class="relative group">
              <button
                type="button"
                (click)="toggleUserMenu()"
                class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition-colors text-xs font-bold text-white shadow-sm"
              >
                <div class="relative w-6 h-6 flex-shrink-0">
                  <img
                    *ngIf="auth.avatarUrl()"
                    [src]="auth.avatarUrl()!"
                    [alt]="'Foto de perfil de ' + userName"
                    class="w-6 h-6 rounded-full object-cover ring-1 ring-cyan-400/50"
                  />
                  <div
                    *ngIf="!auth.avatarUrl()"
                    class="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 font-black flex items-center justify-center text-xs"
                  >
                    {{ userInitial }}
                  </div>
                </div>
                <span class="max-w-[110px] truncate text-slate-200">
                  {{ userName }}
                </span>
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown -->
              <div
                *ngIf="showMenu()"
                class="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 py-2 z-50 animate-fade-in"
              >
                <div class="px-4 py-2.5 border-b border-slate-800">
                  <p class="text-xs font-bold text-white truncate">
                    {{ userName }}
                  </p>
                  <p class="text-[11px] text-slate-400 truncate mt-0.5">{{ auth.user()?.email }}</p>
                </div>

                <a
                  routerLink="/my-tickets"
                  (click)="showMenu.set(false)"
                  class="block px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  🎟️ Mis Boletos Comprados
                </a>

                <button
                  type="button"
                  (click)="onLogout()"
                  class="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors border-t border-slate-800"
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          <!-- Guest State -->
          <div *ngIf="!auth.isAuthenticated()" class="flex items-center gap-3">
            <a routerLink="/login">
              <button
                type="button"
                class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Iniciar Sesión
              </button>
            </a>
            <a routerLink="/register">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20"
              >
                Crear Cuenta
              </button>
            </a>
          </div>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button
          type="button"
          (click)="toggleMobileMenu()"
          class="sm:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path *ngIf="!mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path *ngIf="mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile Dropdown -->
      <div *ngIf="mobileMenuOpen()" class="sm:hidden bg-slate-900 border-t border-slate-800 px-4 py-5 space-y-4">
        <form (ngSubmit)="onSearchSubmit()" class="relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            name="mobileSearch"
            placeholder="Buscar conciertos, artistas..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs"
          />
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
            🔍
          </span>
        </form>

        <div class="space-y-2 pt-2 border-t border-slate-800">
          <a
            routerLink="/search"
            (click)="mobileMenuOpen.set(false)"
            class="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Explorar Todos los Eventos
          </a>

          <ng-container *ngIf="auth.isAuthenticated()">
            <a
              routerLink="/my-tickets"
              (click)="mobileMenuOpen.set(false)"
              class="block px-3 py-2 rounded-xl text-sm font-semibold text-cyan-400 hover:bg-slate-800"
            >
              🎟️ Mis Boletos
            </a>
            <button
              type="button"
              (click)="onLogout()"
              class="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10"
            >
              🚪 Cerrar Sesión
            </button>
          </ng-container>

          <ng-container *ngIf="!auth.isAuthenticated()">
            <div class="grid grid-cols-2 gap-3 pt-2">
              <a routerLink="/login" (click)="mobileMenuOpen.set(false)">
                <button
                  type="button"
                  class="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 hover:bg-slate-700"
                >
                  Iniciar Sesión
                </button>
              </a>
              <a routerLink="/register" (click)="mobileMenuOpen.set(false)">
                <button
                  type="button"
                  class="w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-bold hover:bg-cyan-300"
                >
                  Registrarse
                </button>
              </a>
            </div>
          </ng-container>
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  searchQuery = '';
  readonly showMenu = signal(false);
  readonly mobileMenuOpen = signal(false);

  get userName(): string {
    const u = this.auth.user();
    if (!u) return 'Usuario';
    return (u.user_metadata?.['full_name'] as string) || (u.email ? u.email.split('@')[0] : 'Usuario');
  }

  get userInitial(): string {
    return (this.userName[0] || 'U').toUpperCase();
  }

  toggleUserMenu(): void {
    this.showMenu.update((v) => !v);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    this.mobileMenuOpen.set(false);
    if (q) {
      this.router.navigate(['/search'], { queryParams: { q } });
    } else {
      this.router.navigate(['/search']);
    }
  }

  async onLogout(): Promise<void> {
    this.showMenu.set(false);
    this.mobileMenuOpen.set(false);
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
