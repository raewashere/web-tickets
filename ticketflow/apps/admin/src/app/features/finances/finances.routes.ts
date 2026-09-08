import { Routes } from '@angular/router';

export const financeRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./finances.component').then((m) => m.FinancesComponent),
  },
];
