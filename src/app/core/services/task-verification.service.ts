import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TaskVerificationDraft { taskInstanceId: string; verificationTypeKey: string; remarks: string; }
export interface TaskVerificationBatchResult { taskInstanceId: string; status: 'SAVED' | 'FAILED' | 'UNCERTAIN'; verificationKey?: string; message?: string; }
export interface TaskVerificationBatchResponse { operationId: string; summary: { saved: number; failed: number; uncertain: number }; results: TaskVerificationBatchResult[]; }

@Injectable({ providedIn: 'root' })
export class TaskVerificationService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/api/v1/provider/work-order/task-verifications/batch`;
  saveBatch(operationId: string, responses: TaskVerificationDraft[]): Observable<TaskVerificationBatchResponse> {
    return this.http.post<TaskVerificationBatchResponse>(this.endpoint, { operationId, responses });
  }
}
