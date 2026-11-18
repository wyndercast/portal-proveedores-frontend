import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiAlertsComponent } from './shared/components/ui-alerts/ui-alerts.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, UiAlertsComponent],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';
}
