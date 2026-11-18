import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type UiMessageSeverity = 'success' | 'info' | 'warn' | 'error';
export interface UiMessage { id: number; severity: UiMessageSeverity; summary: string; detail: string; }

@Injectable({ providedIn: 'root' })
export class UiMessageService {
  private readonly stream = new Subject<UiMessage>();
  private nextId = 0;
  readonly messages$ = this.stream.asObservable();

  add(message: { severity: UiMessageSeverity; summary: string; detail: string; life?: number }): void {
    const item = { id: ++this.nextId, severity: message.severity, summary: message.summary, detail: message.detail };
    this.stream.next(item);
    window.setTimeout(() => this.dismiss(item.id), message.life ?? 5000);
  }

  dismiss(id: number): void { this.stream.next({ id, severity: 'info', summary: '', detail: '' }); }
}
