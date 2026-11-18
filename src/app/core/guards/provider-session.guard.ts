import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProviderSessionService } from '../services/provider-session.service';

export const providerSessionGuard: CanActivateFn = () => {
  const session = inject(ProviderSessionService);
  const router = inject(Router);
  return session.getAccessToken() ? true : router.createUrlTree(['/']);
};
