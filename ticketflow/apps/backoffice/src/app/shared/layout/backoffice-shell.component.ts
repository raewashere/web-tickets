import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BackofficeSidebarComponent } from './backoffice-sidebar.component';
import { BackofficeTopbarComponent } from './backoffice-topbar.component';

@Component({
  selector: 'app-backoffice-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BackofficeSidebarComponent,
    BackofficeTopbarComponent,
  ],
  template: `
    <div class="min-h-screen bg-[#f4f6f8] text-dark flex">
      <!-- Sidebar -->
      <app-backoffice-sidebar
        [isOpen]="isSidebarOpen"
        (closeSidebar)="isSidebarOpen = false"
      ></app-backoffice-sidebar>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <!-- Topbar -->
        <app-backoffice-topbar (toggleSidebar)="isSidebarOpen = !isSidebarOpen"></app-backoffice-topbar>

        <!-- Page Content -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class BackofficeShellComponent {
  isSidebarOpen = false;
}
