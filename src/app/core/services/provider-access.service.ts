import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProviderSessionService } from './provider-session.service';

export interface ProviderAccessRequest {
  workOrderNumber: string;
  workerCode: string;
}

export interface ProviderAccessResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  workOrder: { id: string; number: string };
}

@Injectable({ providedIn: 'root' })
export class ProviderAccessService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(ProviderSessionService);
  private readonly endpoint = `${environment.apiBaseUrl}/api/v1/provider-access`;

  authorize(request: ProviderAccessRequest): Observable<ProviderAccessResponse> {
    return this.http.post<ProviderAccessResponse>(this.endpoint, request).pipe(
      // Keep this above the backend's Valuekeep read timeout (30s), allowing
      // the backend to return a controlled error instead of Angular aborting first.
      timeout({ each: 40000 }),
      tap(response => this.session.setSession(response))
    );
  }

  revoke(): Observable<void> {
    return this.http.delete<void>(this.endpoint).pipe(
      tap(() => this.session.clear())
    );
  }
}
