import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EvidenceImage, EvidenceService } from '../../core/services/evidence.service';
import { SignaturePadComponent } from '../../shared/components/signature-pad/signature-pad.component';
import { SignatureRole, SignatureService } from '../../core/services/signature.service';
import { ReportService } from '../../core/services/report.service';
import { FinalizationResponse, FinalizationService } from '../../core/services/finalization.service';
import { WorkOrder, WorkOrderService } from '../../core/services/work-order.service';
import { UiMessageService } from '../../core/services/ui-message.service';
import { WorkOrderDraftService } from '../../core/services/work-order-draft.service';

@Component({ selector: 'app-work-order-page', standalone: true, imports: [ReactiveFormsModule, SignaturePadComponent], templateUrl: './work-order-page.component.html', styleUrl: './work-order-page.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class WorkOrderPageComponent {
  private readonly workOrderService = inject(WorkOrderService);
  private readonly evidenceService = inject(EvidenceService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly signatureService = inject(SignatureService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly reportService = inject(ReportService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly finalizationService = inject(FinalizationService);
  private readonly messages = inject(UiMessageService);
  private readonly workOrderDraft = inject(WorkOrderDraftService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly router = inject(Router);
  readonly isClosureScreen = this.router.url.includes('/closure');
  workOrder: WorkOrder | null = null; loading = true; errorMessage = '';
  evidenceError = ''; preview: EvidenceImage | null = null; replacingId: string | null = null;
  readonly signatureConfig = {
    requireTechnicianSignature: true, requireReceiverSignature: true,
    showTechnicianName: true, showReceiverName: true,
    requireTechnicianName: true, requireReceiverName: true,
  };
  readonly signatureNames = this.formBuilder.group({ technician: '', receiver: '' });
  readonly workOrderRemarks = this.formBuilder.control('');
  signatureErrors: Partial<Record<SignatureRole, string>> = {};
  confirmedRoles = new Set<SignatureRole>();
  signatureOverlayRole: SignatureRole | null = null;
  reportLoading = false; reportError = ''; reportPreviewUrl: SafeResourceUrl | null = null; reportPreviewId = ''; reportFileName = '';
  private reportObjectUrl: string | null = null;
  finalizationLoading = false; finalizationError = ''; finalizationResult: FinalizationResponse | null = null;
  finalizationConfirmationOpen = false;
  startingWork = false;
  @ViewChild('cameraInput') cameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.load();
    }
  }
  load(): void {
    this.loading = true; this.errorMessage = '';
    this.workOrderService.getAuthorizedWorkOrder().subscribe({
      next: value => { this.workOrder = value; this.evidenceService.setActiveWorkOrder(value.id); this.signatureService.setActiveWorkOrder(value.id); this.workOrderRemarks.setValue(this.workOrderDraft.getRemarks(value.id), { emitEvent: false }); this.syncConfirmedSignatures(); this.loading = false; this.changeDetector.markForCheck(); },
      error: error => { this.loading = false; this.errorMessage = error.status === 401 ? 'La sesión venció. Ingresa nuevamente para continuar.' : 'No fue posible consultar la orden de trabajo.'; this.messages.add({ severity: 'error', summary: 'No se pudo consultar la OT', detail: this.errorMessage, life: 6000 }); this.changeDetector.markForCheck(); },
    });
  }
  startPlannedWork(): void {
    if (this.startingWork) return;
    this.startingWork = true;
    this.messages.add({ severity: 'info', summary: 'Iniciando OT', detail: 'Actualizando el estado antes de cargar el trabajo planificado…', life: 4000 });
    this.workOrderService.startWorkOrder().subscribe({
      next: () => { this.startingWork = false; void this.router.navigateByUrl('/work-order/planned-work'); this.changeDetector.markForCheck(); },
      error: error => { this.startingWork = false; this.messages.add({ severity: 'error', summary: 'No se pudo iniciar la OT', detail: error.status === 401 ? 'La sesión venció. Ingresa nuevamente.' : 'La OT no pudo pasar a estado En curso. No se cargó el trabajo planificado.', life: 7000 }); this.changeDetector.markForCheck(); },
    });
  }
  saveWorkOrderRemarks(): void { if (this.workOrder) { this.workOrderDraft.setRemarks(this.workOrder.id, this.workOrderRemarks.value); this.invalidateReportPreview(); } }
  get evidence(): EvidenceImage[] { return this.workOrder ? this.evidenceService.get(this.workOrder.id) : []; }
  get evidenceBytes(): string { const bytes = this.evidence.reduce((total, image) => total + image.size, 0); return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
  openCamera(): void { this.replacingId = null; this.cameraInput?.nativeElement.click(); }
  openFilePicker(): void { this.replacingId = null; this.fileInput?.nativeElement.click(); }
  replace(image: EvidenceImage): void { this.replacingId = image.id; this.fileInput?.nativeElement.click(); }
  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file || !this.workOrder) return;
    this.evidenceError = '';
    try {
      if (this.replacingId) await this.evidenceService.replace(this.workOrder.id, this.replacingId, file);
      else await this.evidenceService.add(this.workOrder.id, file);
    } catch (error) { this.evidenceError = this.evidenceMessage(error); }
    this.invalidateReportPreview();
    this.replacingId = null; this.changeDetector.markForCheck();
  }
  remove(image: EvidenceImage): void { if (this.workOrder) this.evidenceService.remove(this.workOrder.id, image.id); this.invalidateReportPreview(); }
  showPreview(image: EvidenceImage): void { this.preview = image; }
  closePreview(): void { this.preview = null; }
  private evidenceMessage(error: unknown): string {
    const code = error instanceof Error ? error.message : '';
    return ({ LÍMITE_FOTOS: 'Solo puedes agregar hasta 6 fotografías.', FOTO_DEMASIADO_GRANDE: 'Cada fotografía debe pesar máximo 10 MB.', LÍMITE_TAMAÑO_TOTAL: 'El conjunto de fotografías no puede superar 30 MB.', FORMATO_NO_VALIDO: 'Formato no válido. Usa una fotografía JPEG o PNG.', PROCESAMIENTO_NO_DISPONIBLE: 'No fue posible procesar la fotografía. Intenta con otra.' } as Record<string, string>)[code] ?? 'No fue posible agregar la fotografía.';
  }
  get confirmedSignatureCount(): number { return this.confirmedRoles.size; }
  get readyForReport(): boolean { return (!this.signatureConfig.requireTechnicianSignature || this.confirmedRoles.has('TECHNICIAN')) && (!this.signatureConfig.requireReceiverSignature || this.confirmedRoles.has('RECEIVER')); }
  signatureState(role: SignatureRole): 'PENDING' | 'EDITING' | 'CONFIRMED' { return this.confirmedRoles.has(role) ? 'CONFIRMED' : (this.signatureErrors[role] ? 'EDITING' : 'PENDING'); }
  signatureLabel(role: SignatureRole): string { return this.signatureState(role) === 'CONFIRMED' ? 'Confirmada' : this.signatureState(role) === 'EDITING' ? 'Firma en edición' : 'Pendiente'; }
  signatureIcon(role: SignatureRole): string { return this.signatureState(role) === 'CONFIRMED' ? 'pi pi-check-circle' : this.signatureState(role) === 'EDITING' ? 'pi pi-pencil' : 'pi pi-minus-circle'; }
  signerName(role: SignatureRole): string {
    const signatures = this.workOrder ? this.signatureService.get(this.workOrder.id) : null;
    return role === 'TECHNICIAN' ? signatures?.technician?.signerName ?? '' : signatures?.receiver?.signerName ?? '';
  }
  openSignatureOverlay(role: SignatureRole): void { this.signatureOverlayRole = role; this.changeDetector.markForCheck(); }
  closeSignatureOverlay(): void { this.signatureOverlayRole = null; this.changeDetector.markForCheck(); }
  signatureChanged(role: SignatureRole): void { if (this.confirmedRoles.delete(role)) { if (this.workOrder) this.signatureService.clearRole(this.workOrder.id, role); this.signatureErrors[role] = 'Debes confirmar nuevamente la firma.'; } this.invalidateReportPreview(); }
  async confirmSignature(role: SignatureRole, pad: SignaturePadComponent): Promise<void> {
    const name = this.signatureNames.controls[role === 'TECHNICIAN' ? 'technician' : 'receiver'].value.trim();
    const requiredName = role === 'TECHNICIAN' ? this.signatureConfig.requireTechnicianName : this.signatureConfig.requireReceiverName;
    if (requiredName && !name) { this.signatureErrors[role] = 'Ingresa el nombre completo antes de confirmar.'; return; }
    const image = await pad.toPng();
    if (!image || !this.workOrder) { this.signatureErrors[role] = 'Dibuja una firma antes de confirmar.'; return; }
    this.signatureService.confirm(this.workOrder.id, role, name, image);
    this.confirmedRoles.add(role); delete this.signatureErrors[role]; this.signatureOverlayRole = null; this.changeDetector.markForCheck();
  }
  clearSignature(role: SignatureRole, pad: SignaturePadComponent): void { if (this.workOrder) this.signatureService.clearRole(this.workOrder.id, role); this.confirmedRoles.delete(role); delete this.signatureErrors[role]; pad.clear(); this.invalidateReportPreview(); this.changeDetector.markForCheck(); }
  private syncConfirmedSignatures(): void { if (!this.workOrder) return; const signatures = this.signatureService.get(this.workOrder.id); this.confirmedRoles = new Set<SignatureRole>([...(signatures.technician ? ['TECHNICIAN' as const] : []), ...(signatures.receiver ? ['RECEIVER' as const] : [])]); }
  generateReport(): void {
    if (!this.workOrder || this.reportLoading) return;
    if (!this.readyForReport) {
      this.reportError = 'Confirma ambas firmas antes de generar la vista previa.';
      this.messages.add({ severity: 'warn', summary: 'Faltan firmas', detail: 'Confirma la firma del técnico y la de quien recibe el servicio.', life: 6000 });
      this.changeDetector.markForCheck();
      return;
    }
    const signatures = this.signatureService.get(this.workOrder.id);
    if (!signatures.technician || !signatures.receiver) { this.reportError = 'Confirma ambas firmas antes de generar la vista previa.'; return; }
    this.reportLoading = true; this.reportError = '';
    this.messages.add({ severity: 'info', summary: 'Generando informe', detail: 'Preparando la vista previa del PDF…', life: 3000 });
    this.reportService.preview(this.signatureNames.controls.technician.value, this.signatureNames.controls.receiver.value, this.workOrderRemarks.value, signatures, this.evidence).subscribe({
      next: result => { if (this.reportObjectUrl) URL.revokeObjectURL(this.reportObjectUrl); this.reportObjectUrl = URL.createObjectURL(result.pdf); this.reportPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.reportObjectUrl); this.reportPreviewId = result.previewId; this.reportFileName = result.fileName; this.reportLoading = false; this.messages.add({ severity: 'success', summary: 'Vista previa lista', detail: 'Revisa el informe antes de adjuntarlo.', life: 5000 }); this.changeDetector.markForCheck(); },
      error: error => { this.reportLoading = false; this.reportError = error.status === 400 ? 'No se puede generar el informe. Verifica que existan respuestas guardadas y que los datos estén completos.' : 'No fue posible generar la vista previa del informe.'; this.messages.add({ severity: 'error', summary: 'No se pudo generar el informe', detail: this.reportError, life: 7000 }); this.changeDetector.markForCheck(); },
    });
  }
  private invalidateReportPreview(): void { if (this.reportPreviewUrl || this.reportPreviewId) { if (this.reportObjectUrl) URL.revokeObjectURL(this.reportObjectUrl); this.reportObjectUrl = null; this.reportPreviewUrl = null; this.reportPreviewId = ''; this.reportFileName = ''; } }
  openFinalizeConfirmation(): void {
    if (!this.reportPreviewId || this.finalizationLoading) return;
    this.finalizationConfirmationOpen = true;
    this.changeDetector.markForCheck();
  }
  cancelFinalize(): void {
    this.finalizationConfirmationOpen = false;
    this.changeDetector.markForCheck();
  }
  confirmFinalize(): void {
    if (!this.reportPreviewId || this.finalizationLoading) return;
    this.finalizationConfirmationOpen = false;
    this.finalizationLoading = true; this.finalizationError = '';
    this.messages.add({ severity: 'info', summary: 'Finalizando OT', detail: 'Validando evidencias, adjunto y estado remoto…', life: 4000 });
    this.finalizationService.finalize(this.reportPreviewId, this.workOrderRemarks.value).subscribe({ next: result => { this.finalizationLoading = false; this.finalizationResult = result; this.reportPreviewId = ''; if (this.reportObjectUrl) URL.revokeObjectURL(this.reportObjectUrl); this.reportObjectUrl = null; this.reportPreviewUrl = null; this.messages.add({ severity: 'success', summary: 'OT finalizada', detail: 'La orden fue cerrada y el informe quedó adjuntado.', life: 7000 }); this.changeDetector.markForCheck(); }, error: error => { this.finalizationLoading = false; this.finalizationError = error.status === 409 ? 'La OT no está disponible para finalizar o el cierre todavía no está habilitado.' : error.status === 401 ? 'La sesión venció. Vuelve a ingresar.' : 'No fue posible confirmar el cierre de la OT.'; this.messages.add({ severity: 'error', summary: 'No se pudo finalizar la OT', detail: this.finalizationError, life: 7000 }); this.changeDetector.markForCheck(); } });
  }
  signInAgain(): void { void this.router.navigateByUrl('/'); }
  formatDate(value: string | null): string {
    if (!value) return 'Sin información';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
}
