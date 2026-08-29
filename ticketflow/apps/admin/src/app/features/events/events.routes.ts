import { Route } from '@angular/router';

export const eventRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./event-list/event-list.component').then(
        (m) => m.EventListComponent
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./event-form/event-form.component').then(
        (m) => m.EventFormComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./event-detail/event-detail.component').then(
        (m) => m.EventDetailComponent
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./event-form/event-form.component').then(
        (m) => m.EventFormComponent
      ),
  },
];
