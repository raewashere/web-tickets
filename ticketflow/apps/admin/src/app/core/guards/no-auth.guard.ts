import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

export const noAuthGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitForAuthReady();

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/dashboard');
};
