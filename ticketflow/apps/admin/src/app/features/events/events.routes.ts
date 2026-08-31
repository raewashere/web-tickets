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
  {
    path: ':id/tickets',
    loadComponent: () =>
      import('../tickets/ticket-type-list/ticket-type-list.component').then(
        (m) => m.TicketTypeListComponent
      ),
  },
  {
    path: ':id/tickets/new',
    loadComponent: () =>
      import('../tickets/ticket-type-form/ticket-type-form.component').then(
        (m) => m.TicketTypeFormComponent
      ),
  },
  {
    path: ':id/tickets/:tid/edit',
    loadComponent: () =>
      import('../tickets/ticket-type-form/ticket-type-form.component').then(
        (m) => m.TicketTypeFormComponent
      ),
  },
  {
    path: ':id/coupons',
    loadComponent: () =>
      import('../tickets/coupon-list/coupon-list.component').then(
        (m) => m.CouponListComponent
      ),
  },
  {
    path: ':id/coupons/new',
    loadComponent: () =>
      import('../tickets/coupon-form/coupon-form.component').then(
        (m) => m.CouponFormComponent
      ),
  },
  {
    path: ':id/coupons/:cid/edit',
    loadComponent: () =>
      import('../tickets/coupon-form/coupon-form.component').then(
        (m) => m.CouponFormComponent
      ),
  },
];
