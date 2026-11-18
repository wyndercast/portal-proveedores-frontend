import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { UiMessage, UiMessageService } from '../../../core/services/ui-message.service';

@Component({
  selector: 'app-ui-alerts',
  standalone: true,
  template: `<div class="ui-alerts" aria-live="polite" aria-atomic="true">
    @for (message of messages; track message.id) {
      @if (message.summary) {
        <div class="ui-alert" [class]="'ui-alert-' + message.severity" role="alert">
          <span class="ui-alert-icon" aria-hidden="true">{{ message.severity === 'success' ? '✓' : message.severity === 'error' ? '!' : message.severity === 'warn' ? '!' : 'i' }}</span>
          <strong>{{ message.summary }}</strong><span>{{ message.detail }}</span>
          <button type="button" (click)="dismiss(message.id)" aria-label="Cerrar">×</button>
        </div>
      }
    }
  </div>`,
  styleUrl: './ui-alerts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiAlertsComponent implements OnDestroy {
  private readonly service = inject(UiMessageService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly subscription: Subscription;
  messages: UiMessage[] = [];

  constructor() {
    this.subscription = this.service.messages$.subscribe(message => {
      if (!message.summary) this.messages = this.messages.filter(item => item.id !== message.id);
      else this.messages = [...this.messages, message].slice(-4);
      this.changeDetector.markForCheck();
    });
  }

  dismiss(id: number): void { this.service.dismiss(id); }
  ngOnDestroy(): void { this.subscription.unsubscribe(); }
}
