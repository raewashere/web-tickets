import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

@Component({
  selector: 'app-backoffice-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-dark text-white border-b border-white/10 shadow-md">
      <div class="flex items-center gap-3">
        <!-- Hamburger button (mobile) -->
        <button
          type="button"
          class="p-2 -ml-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
          (click)="toggleSidebar.emit()"
          aria-label="Abrir menú"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="flex items-center gap-2">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-accent animate-pulse"></span>
          <h2 class="text-sm sm:text-base font-black tracking-tight text-white uppercase">
            Plataforma Global Backoffice
          </h2>
        </div>
      </div>

      <!-- Right controls -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <div class="w-7 h-7 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center border border-accent/30 overflow-hidden">
            <img
              *ngIf="auth.avatarUrl()"
              [src]="auth.avatarUrl()!"
              [alt]="auth.user()?.email || 'Avatar'"
              class="w-7 h-7 object-cover"
            />
            <span *ngIf="!auth.avatarUrl()">{{ userInitial }}</span>
          </div>
          <span class="text-xs font-semibold text-white hidden sm:inline truncate max-w-[160px]">
            {{ auth.user()?.email }}
          </span>
        </div>
      </div>
    </header>
  `,
})
export class BackofficeTopbarComponent {
  readonly auth = inject(AuthService);

  @Output() toggleSidebar = new EventEmitter<void>();

  get userInitial(): string {
    const email = this.auth.user()?.email || 'A';
    return email.charAt(0).toUpperCase();
  }
}
