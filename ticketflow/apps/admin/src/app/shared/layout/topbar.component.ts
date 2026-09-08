import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-white border-b border-dark/10 shadow-xs">
      <div class="flex items-center gap-3">
        <!-- Hamburger button (mobile) -->
        <button
          type="button"
          class="p-2 -ml-2 rounded-lg text-dark/70 hover:text-dark hover:bg-dark/5 lg:hidden"
          (click)="toggleSidebar.emit()"
          aria-label="Abrir menú"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <div class="flex items-center gap-2">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 class="text-base font-semibold text-dark tracking-tight">Portal de Artista</h2>
          </div>
        </div>
      </div>

      <!-- Right controls -->
      <div class="flex items-center gap-4">
        <a
          routerLink="/artist/profile"
          class="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-dark/5 transition-colors border border-dark/10"
        >
          <div class="relative w-7 h-7 flex-shrink-0">
            <img
              *ngIf="auth.avatarUrl()"
              [src]="auth.avatarUrl()!"
              [alt]="auth.user()?.email || 'Avatar'"
              class="w-7 h-7 rounded-full object-cover ring-1 ring-primary/40 shadow-xs"
            />
            <div
              *ngIf="!auth.avatarUrl()"
              class="w-7 h-7 rounded-full bg-primary text-dark font-bold text-xs flex items-center justify-center"
            >
              {{ userInitial }}
            </div>
          </div>
          <span class="text-xs font-medium text-dark hidden sm:inline truncate max-w-[140px]">
            {{ auth.user()?.user_metadata?.['full_name'] || auth.user()?.email || 'Mi Perfil' }}
          </span>
        </a>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  readonly auth = inject(AuthService);

  @Output() toggleSidebar = new EventEmitter<void>();

  get userInitial(): string {
    const name =
      this.auth.user()?.user_metadata?.['full_name'] ||
      this.auth.user()?.email ||
      'A';
    return name.charAt(0).toUpperCase();
  }
}
