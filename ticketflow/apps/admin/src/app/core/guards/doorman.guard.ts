// apps/admin/src/app/core/guards/doorman.guard.ts
// Allows admins, artists, AND doormen to access the access-control scanner.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

export const doormanGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authState = await auth.waitForAuthReady();

  if (!authState.user) {
    return router.createUrlTree(['/login']);
  }

  const roles = auth.roles();
  const isAllowed = roles.some((r) => ['admin', 'artist', 'doorman'].includes(r));

  if (isAllowed) {
    return true;
  }

  // Not authorized
  return router.createUrlTree(['/login']);
};
