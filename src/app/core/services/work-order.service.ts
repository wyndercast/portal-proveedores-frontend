import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProviderSessionService } from './provider-session.service';

export interface VerificationOption { key: string; description: string; }
export interface WorkOrderTask {
  id: string; taskId: string; code: string | null; description: string | null;
  remarks: string | null; index: number | null; verification: string | null;
  verificationOptions: VerificationOption[];
}
export interface MaintenancePlan {
  id: string; code: string | null; description: string | null; tasks: WorkOrderTask[];
}
export interface WorkOrder {
  id: string; number: string; description: string | null; state: string | null;
  stateDescription: string | null;
  asset: number | null; assetTypeLabel: string; assetCode: string | null; assetDescription: string | null; workshop: string | null; workshopDescription: string | null;
  operatingState: string | null; operatingStateDescription: string | null;
  expectedDate: string | null; expectedEndDate: string | null; closed: boolean;
  maintenancePlans: MaintenancePlan[];
  summary: { maintenancePlanCount: number; planTaskCount: number };
}
export interface WorkOrderStartResponse { state: string; changed: boolean; }

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(ProviderSessionService);
  private readonly endpoint = `${environment.apiBaseUrl}/api/v1/provider/work-order`;

  getAuthorizedWorkOrder(): Observable<WorkOrder> {
    const token = this.session.getAccessToken();
    if (!token) {
      return throwError(() => new Error('PROVIDER_SESSION_MISSING'));
    }
    return this.http.get<WorkOrder>(this.endpoint, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    });
  }

  startWorkOrder(): Observable<WorkOrderStartResponse> {
    return this.http.post<WorkOrderStartResponse>(`${this.endpoint}/start`, {}, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.session.getAccessToken() ?? ''}` }),
    });
  }
}
