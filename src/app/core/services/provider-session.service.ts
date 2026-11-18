import { Injectable, inject } from '@angular/core';
import { EvidenceService } from './evidence.service';
import { SignatureService } from './signature.service';

interface ProviderSessionResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  workOrder: { id: string; number: string };
}

interface StoredProviderSession {
  accessToken: string;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ProviderSessionService {
  private static readonly storageKey = 'provider-session';
  private readonly evidence = inject(EvidenceService);
  private readonly signatures = inject(SignatureService);
  private token: string | null = null;
  private expiresAt = 0;

  setSession(response: ProviderSessionResponse): void {
    this.token = response.accessToken;
    this.expiresAt = Date.now() + response.expiresInSeconds * 1000;
    this.persist();
  }

  getAccessToken(): string | null {
    this.restore();
    if (!this.token) {
      return null;
    }
    if (Date.now() >= this.expiresAt) {
      this.clear();
      return null;
    }
    return this.token;
  }

  clear(): void {
    this.token = null;
    this.expiresAt = 0;
    if (this.storageAvailable()) {
      window.sessionStorage.removeItem(ProviderSessionService.storageKey);
    }
    this.evidence.clearAll();
    this.signatures.clearAll();
  }

  private persist(): void {
    if (!this.storageAvailable() || !this.token) return;
    const session: StoredProviderSession = { accessToken: this.token, expiresAt: this.expiresAt };
    window.sessionStorage.setItem(ProviderSessionService.storageKey, JSON.stringify(session));
  }

  private restore(): void {
    if (this.token || !this.storageAvailable()) return;
    const raw = window.sessionStorage.getItem(ProviderSessionService.storageKey);
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as Partial<StoredProviderSession>;
      if (typeof session.accessToken === 'string' && typeof session.expiresAt === 'number') {
        this.token = session.accessToken;
        this.expiresAt = session.expiresAt;
      }
    } catch {
      window.sessionStorage.removeItem(ProviderSessionService.storageKey);
    }
  }

  private storageAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  }
}
