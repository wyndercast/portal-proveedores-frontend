import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ProviderSessionService } from '../services/provider-session.service';

export const providerAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(ProviderSessionService);
  const token = session.getAccessToken();
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError(error => {
      return throwError(() => error);
    })
  );
};
