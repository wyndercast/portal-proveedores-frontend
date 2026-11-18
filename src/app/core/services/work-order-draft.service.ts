import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WorkOrderDraftService {
  private readonly remarks = new Map<string, string>();

  getRemarks(workOrderId: string): string { return this.remarks.get(workOrderId) ?? ''; }
  setRemarks(workOrderId: string, value: string): void { this.remarks.set(workOrderId, value); }
  clear(workOrderId: string): void { this.remarks.delete(workOrderId); }
}
