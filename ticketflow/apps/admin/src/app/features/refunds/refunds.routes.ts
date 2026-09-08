import { Routes } from '@angular/router';

export const refundRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./refund-list.component').then((m) => m.RefundListComponent),
  },
];
