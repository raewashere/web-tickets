import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const appRoutes: Route[] = [
  // Public Auth Routes
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },

  // Protected Admin Portal (AdminShell wrapper)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'artist/profile',
        loadComponent: () =>
          import('./features/artists/artist-detail/artist-detail.component').then(
            (m) => m.ArtistDetailComponent
          ),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/events/event-list/event-list.component').then(
            (m) => m.EventListComponent
          ),
      },
      {
        path: 'venues',
        loadChildren: () =>
          import('./features/venues/venues.routes').then(
            (m) => m.venueRoutes
          ),
      },
    ],
  },

  // Fallback wildcard
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
