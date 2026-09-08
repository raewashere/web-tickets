import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <!-- Super-Admin Tab Navigation Bar -->
      <div class="border-b border-dark/10 pb-2">
        <nav class="flex items-center gap-2 sm:gap-4 overflow-x-auto text-xs sm:text-sm">
          <a
            routerLink="/super-admin"
            [routerLinkActiveOptions]="{ exact: true }"
            routerLinkActive="bg-dark text-white font-black shadow-sm"
            class="px-4 py-2 rounded-xl text-dark/70 hover:text-dark hover:bg-dark/5 font-bold transition whitespace-nowrap flex items-center gap-2"
          >
            <span>📊</span>
            <span>Métricas Globales</span>
          </a>

          <a
            routerLink="/super-admin/venues"
            routerLinkActive="bg-dark text-white font-black shadow-sm"
            class="px-4 py-2 rounded-xl text-dark/70 hover:text-dark hover:bg-dark/5 font-bold transition whitespace-nowrap flex items-center gap-2"
          >
            <span>📍</span>
            <span>Moderar Recintos</span>
          </a>

          <a
            routerLink="/super-admin/users"
            routerLinkActive="bg-dark text-white font-black shadow-sm"
            class="px-4 py-2 rounded-xl text-dark/70 hover:text-dark hover:bg-dark/5 font-bold transition whitespace-nowrap flex items-center gap-2"
          >
            <span>👥</span>
            <span>Gestionar Usuarios & Roles</span>
          </a>
        </nav>
      </div>

      <!-- Tab Content Area -->
      <router-outlet></router-outlet>
    </div>
  `,
})
export class SuperAdminLayoutComponent {}
