// apps/admin/src/app/core/guards/artist-role.guard.ts
// Protects Admin routes that require the user to have the 'artist' role.
// Redirects to /artist/profile (create profile page) if the user is
// authenticated but hasn't set up an artist profile/role yet.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

export const artistRoleGuard: CanActivateFn = async (_route, _state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialisation before checking roles
  const state = await auth.waitForAuthReady();

  if (!state.user) {
    return router.createUrlTree(['/login']);
  }

  // Admins have full access
  if (auth.isAdmin()) {
    return true;
  }

  // Artists can proceed
  if (auth.isArtist()) {
    return true;
  }

  // Authenticated but no artist role → guide them to create profile
  return router.createUrlTree(['/artist/profile']);
};
