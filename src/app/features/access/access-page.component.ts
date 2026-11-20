import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProviderAccessService } from '../../core/services/provider-access.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { UiMessageService } from '../../core/services/ui-message.service';

@Component({
  selector: 'app-access-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './access-page.component.html',
  styleUrl: './access-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly accessService = inject(ProviderAccessService);
  private readonly router = inject(Router);
  private readonly messages = inject(UiMessageService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly form = this.formBuilder.group({
    workOrderNumber: ['', [Validators.required, Validators.maxLength(100)]],
    workerCode: ['', [Validators.required, Validators.maxLength(100)]],
  });

  loading = false;
  errorMessage = '';

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.messages.add({ severity: 'info', summary: 'Validando acceso', detail: 'Consultando la orden de trabajo…', life: 3000 });
    this.accessService.authorize(this.form.getRawValue()).pipe(finalize(() => { this.loading = false; this.changeDetector.markForCheck(); })).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Acceso autorizado', detail: 'La orden de trabajo está disponible.', life: 3500 });
        void this.router.navigateByUrl('/work-order');
      },
      error: error => {
        const code = error.error?.code;
        const stateDetail = code === 'WORK_ORDER_STATE_NOT_AVAILABLE' && typeof error.error?.detail === 'string'
          ? error.error.detail
          : 'La OT está asignada a este proveedor, pero actualmente se encuentra en un estado no habilitado para su consulta desde el portal.';
        this.errorMessage = error.name === 'TimeoutError'
          ? 'El servidor tardó demasiado en responder. Verifica que el backend y Valuekeep estén disponibles.'
          : error.status === 0
            ? 'No se pudo conectar con el backend. Verifica que esté ejecutándose en http://localhost:8080.'
            : error.status === 401
              ? 'El número de OT o el código del trabajador no coinciden con una autorización válida.'
              : error.status === 409
                ? stateDetail
                : error.status === 403
                  ? 'El backend rechazó el origen de ngrok. Reinicia Spring Boot con la configuración CORS actualizada.'
                  : 'No fue posible autorizar el acceso a la orden solicitada.';
        const detail = code === 'VALUEKEEP_AUTH'
          ? 'Valuekeep rechazó la autenticación. Revisa las credenciales OAuth2 del backend.'
          : code === 'VALUEKEEP_TIMEOUT'
            ? 'Valuekeep no respondió a tiempo. Revisa la conectividad del contenedor.'
            : error.status === 502
              ? 'El backend respondió, pero Valuekeep no pudo completar la consulta. Revisa credenciales, URL y conectividad del contenedor.'
              : error.status === 401
                ? this.errorMessage
                : error.status === 409
                  ? this.errorMessage
                  : error.status === 403
                    ? this.errorMessage
                    : this.errorMessage;
        const backendDetail = error.status === 401 || error.status === 409
          ? ''
          : typeof error.error?.detail === 'string' ? ` ${error.error.detail}` : '';
        this.messages.add({ severity: 'error', summary: code === 'WORK_ORDER_STATE_NOT_AVAILABLE' ? 'OT aún no habilitada' : code?.startsWith('VALUEKEEP_') ? `Valuekeep (${code})` : error.status === 502 ? 'Valuekeep no disponible' : 'No se pudo autorizar', detail: `${detail}${backendDetail}`, life: 7000 });
        this.changeDetector.markForCheck();
      },
    });
  }
}
