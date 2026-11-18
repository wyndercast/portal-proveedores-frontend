import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FinalizationResponse { result: string; pdfStatus: string; closureStatus: string; remoteStateKey: string; message: string; }

@Injectable({ providedIn: 'root' })
export class FinalizationService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/api/v1/provider/work-order/finalize`;
  finalize(previewId: string, remarks: string): Observable<FinalizationResponse> { return this.http.post<FinalizationResponse>(this.endpoint, { previewId, confirmation: true, remarks }); }
}
