import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="min-h-screen bg-[#f8f9fa] text-dark flex">
      <!-- Sidebar -->
      <app-sidebar
        [isOpen]="isSidebarOpen"
        (closeSidebar)="isSidebarOpen = false"
      ></app-sidebar>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <!-- Topbar -->
        <app-topbar (toggleSidebar)="isSidebarOpen = !isSidebarOpen"></app-topbar>

        <!-- Page Content -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class AdminShellComponent {
  isSidebarOpen = false;
}
