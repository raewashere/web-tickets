import { Routes } from '@angular/router';

export const superAdminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./super-admin-layout.component').then(
        (m) => m.SuperAdminLayoutComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./dashboard/super-admin-dashboard.component').then(
            (m) => m.SuperAdminDashboardComponent
          ),
      },
      {
        path: 'venues',
        loadComponent: () =>
          import('./venues/venue-moderation.component').then(
            (m) => m.VenueModerationComponent
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users/user-management.component').then(
            (m) => m.UserManagementComponent
          ),
      },
      {
        path: 'payouts',
        loadComponent: () =>
          import('./payouts/admin-payouts.component').then(
            (m) => m.AdminPayoutsComponent
          ),
      },
    ],
  },
];
