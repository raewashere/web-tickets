import { Route } from '@angular/router';

export const venueRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./venue-list/venue-list.component').then(
        (m) => m.VenueListComponent
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./venue-form/venue-form.component').then(
        (m) => m.VenueFormComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./venue-detail/venue-detail.component').then(
        (m) => m.VenueDetailComponent
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./venue-form/venue-form.component').then(
        (m) => m.VenueFormComponent
      ),
  },
];
