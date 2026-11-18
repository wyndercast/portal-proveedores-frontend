import { Injectable } from '@angular/core';

export type SignatureRole = 'TECHNICIAN' | 'RECEIVER';

export interface ConfirmedSignature {
  workOrderId: string;
  role: SignatureRole;
  signerName: string;
  signedAt: string;
  image: Blob;
}

export interface ServiceSignatures {
  technician?: ConfirmedSignature;
  receiver?: ConfirmedSignature;
}

@Injectable({ providedIn: 'root' })
export class SignatureService {
  private readonly signatures = new Map<string, ServiceSignatures>();
  private activeWorkOrderId: string | null = null;

  setActiveWorkOrder(workOrderId: string): void {
    if (this.activeWorkOrderId && this.activeWorkOrderId !== workOrderId) this.clear(this.activeWorkOrderId);
    this.activeWorkOrderId = workOrderId;
    if (!this.signatures.has(workOrderId)) this.signatures.set(workOrderId, {});
  }

  get(workOrderId: string): ServiceSignatures { return this.signatures.get(workOrderId) ?? {}; }

  confirm(workOrderId: string, role: SignatureRole, signerName: string, image: Blob): ConfirmedSignature {
    this.setActiveWorkOrder(workOrderId);
    const signature: ConfirmedSignature = { workOrderId, role, signerName: signerName.trim(), signedAt: new Date().toISOString(), image };
    const current = this.signatures.get(workOrderId)!;
    if (role === 'TECHNICIAN') current.technician = signature;
    else current.receiver = signature;
    return signature;
  }

  clearRole(workOrderId: string, role: SignatureRole): void {
    const current = this.signatures.get(workOrderId);
    if (!current) return;
    if (role === 'TECHNICIAN') delete current.technician;
    else delete current.receiver;
  }

  clear(workOrderId: string): void {
    this.signatures.delete(workOrderId);
    if (this.activeWorkOrderId === workOrderId) this.activeWorkOrderId = null;
  }

  clearAll(): void { [...this.signatures.keys()].forEach(workOrderId => this.clear(workOrderId)); }
}
