import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { WorkOrder, WorkOrderService, WorkOrderTask, VerificationOption } from '../../core/services/work-order.service';
import { TaskVerificationService } from '../../core/services/task-verification.service';
import { UiMessageService } from '../../core/services/ui-message.service';

type TaskStatus = 'PENDING' | 'DRAFT' | 'SAVED' | 'ERROR';
type TaskForm = FormGroup<{ option: FormControl<string | null>; remarks: FormControl<string> }>;
interface TaskRow { key: string; planCode: string | null; planDescription: string | null; task: WorkOrderTask; }
interface BulkOption extends VerificationOption { verification: string; label: string; }

@Component({
  selector: 'app-planned-work-page', standalone: true, imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './planned-work-page.component.html', styleUrl: './planned-work-page.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannedWorkPageComponent implements OnInit {
  private readonly workOrderService = inject(WorkOrderService);
  private readonly verificationService = inject(TaskVerificationService);
  readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly messages = inject(UiMessageService);
  private readonly platformId = inject(PLATFORM_ID);
  workOrder: WorkOrder | null = null; rows: TaskRow[] = []; forms = new Map<string, TaskForm>(); statuses = new Map<string, TaskStatus>();
  loading = true; saving = false; applying = false; errorMessage = ''; saveMessage = ''; search = ''; statusFilter: TaskStatus | 'ALL' = 'ALL';
  bulkOption: BulkOption | null = null; bulkCandidates: TaskRow[] = []; bulkExcluded = 0;
  selectedRow: TaskRow | null = null;
  optionMenu: 'task' | 'bulk' | null = null;
  private taskOriginalOption: string | null = null;
  private taskOriginalRemarks = '';
  taskDraftOption: string | null = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.load();
    }
  }
  load(): void {
    this.loading = true; this.errorMessage = '';
    this.workOrderService.getAuthorizedWorkOrder().subscribe({ next: value => {
      this.workOrder = value;
      this.rows = value.maintenancePlans.flatMap(plan => plan.tasks.map(task => ({ key: `${plan.id}:${task.id}`, planCode: plan.code, planDescription: plan.description, task })));
      this.rows.forEach(row => { if (!this.forms.has(row.key)) this.forms.set(row.key, this.createForm(row.task)); if (!this.statuses.has(row.key)) this.statuses.set(row.key, 'PENDING'); });
      this.loading = false;
      this.changeDetector.markForCheck();
    }, error: error => { this.loading = false; this.errorMessage = error.status === 401 ? 'La sesión venció. Ingresa nuevamente para continuar.' : 'No fue posible consultar el trabajo planificado.'; this.messages.add({ severity: 'error', summary: 'No se pudieron cargar las tareas', detail: this.errorMessage, life: 6000 }); this.changeDetector.markForCheck(); } });
  }
  private createForm(task: WorkOrderTask): TaskForm {
    const form = new FormGroup({ option: new FormControl<string | null>(null), remarks: new FormControl('', { nonNullable: true }) });
    form.controls.option.valueChanges.subscribe(value => { const key = this.rows.find(row => row.task === task)?.key; if (key && value && this.statuses.get(key) !== 'SAVED') { this.statuses.set(key, 'DRAFT'); this.changeDetector.markForCheck(); } });
    return form;
  }
  formFor(row: TaskRow): TaskForm { return this.forms.get(row.key)!; }
  statusFor(row: TaskRow): TaskStatus { return this.statuses.get(row.key) ?? 'PENDING'; }
  optionFor(row: TaskRow): VerificationOption | undefined { return row.task.verificationOptions.find(option => option.key === this.formFor(row).controls.option.value); }
  draftOptionFor(row: TaskRow): VerificationOption | undefined { return row.task.verificationOptions.find(option => option.key === this.taskDraftOption); }
  optionsFor(row: TaskRow): VerificationOption[] { return row.task.verificationOptions; }
  openTask(row: TaskRow): void {
    if (row.task.verificationOptions.length) {
      const form = this.formFor(row);
      this.selectedRow = row;
      this.taskOriginalOption = form.controls.option.value;
      this.taskOriginalRemarks = form.controls.remarks.value;
      this.taskDraftOption = this.taskOriginalOption;
      this.changeDetector.markForCheck();
    }
  }
  closeTask(): void {
    if (this.selectedRow) {
      const form = this.formFor(this.selectedRow);
      form.controls.option.setValue(this.taskOriginalOption, { emitEvent: false });
      form.controls.remarks.setValue(this.taskOriginalRemarks, { emitEvent: false });
    }
    this.selectedRow = null;
    this.optionMenu = null;
    this.taskDraftOption = null;
    this.changeDetector.markForCheck();
  }
  toggleOptionMenu(menu: 'task' | 'bulk'): void { this.optionMenu = this.optionMenu === menu ? null : menu; this.changeDetector.markForCheck(); }
  closeOptionMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select') && this.optionMenu) {
      this.optionMenu = null;
      this.changeDetector.markForCheck();
    }
  }
  selectTaskOption(key: string): void { if (!this.selectedRow) return; this.taskDraftOption = key; this.optionMenu = null; this.changeDetector.markForCheck(); }
  selectBulkOption(option: BulkOption): void { this.bulkOption = option; this.optionMenu = null; this.previewBulk(); this.changeDetector.markForCheck(); }
  saveTask(): void {
    if (!this.selectedRow) return;
    const form = this.formFor(this.selectedRow);
    if (!this.taskDraftOption) {
      this.messages.add({ severity: 'warn', summary: 'Selecciona una respuesta', detail: 'Elige una opción antes de guardar la tarea.', life: 5000 });
      return;
    }
    form.controls.option.setValue(this.taskDraftOption);
    this.taskOriginalOption = this.taskDraftOption;
    this.taskOriginalRemarks = form.controls.remarks.value;
    this.statuses.set(this.selectedRow.key, 'DRAFT');
    this.messages.add({ severity: 'success', summary: 'Tarea preparada', detail: 'La respuesta quedó lista para guardarse en la OT.', life: 3500 });
    this.closeTask();
  }
  get filteredRows(): TaskRow[] { const query = this.search.trim().toLocaleLowerCase(); return this.rows.filter(row => (!query || [row.task.code, row.task.description, row.planDescription].some(value => value?.toLocaleLowerCase().includes(query))) && (this.statusFilter === 'ALL' || this.statusFor(row) === this.statusFilter)); }
  count(status: TaskStatus): number { return this.rows.filter(row => this.statusFor(row) === status).length; }
  get hasDrafts(): boolean { return this.count('DRAFT') > 0; }
  get canSave(): boolean { return !this.saving && this.hasDrafts; }
  get canContinueToClosure(): boolean { return !this.saving && this.rows.length > 0 && !this.hasDrafts && this.count('ERROR') === 0 && this.count('SAVED') > 0; }
  openBulk(): void { this.applying = true; this.bulkOption = null; this.bulkCandidates = []; this.bulkExcluded = 0; }
  closeBulk(): void { this.applying = false; this.optionMenu = null; }
  bulkOptions(): BulkOption[] { const unique = new Map<string, BulkOption>(); this.rows.forEach(row => row.task.verificationOptions.forEach(option => { const verification = row.task.verification ?? ''; const key = `${verification}:${option.key}`; unique.set(key, { ...option, verification, label: `${option.description} (${verification})` }); })); return [...unique.values()]; }
  previewBulk(): void { if (!this.bulkOption) { this.bulkCandidates = []; return; } this.bulkCandidates = this.rows.filter(row => this.statusFor(row) === 'PENDING' && !this.formFor(row).controls.option.value && row.task.verification === this.bulkOption!.verification && row.task.verificationOptions.some(option => option.key === this.bulkOption!.key)); this.bulkExcluded = this.rows.length - this.bulkCandidates.length; }
  applyBulk(): void { if (!this.bulkOption) return; this.bulkCandidates.forEach(row => this.formFor(row).controls.option.setValue(this.bulkOption!.key)); this.applying = false; this.saveMessage = `${this.bulkCandidates.length} tarea(s) preparada(s) para guardar.`; this.changeDetector.markForCheck(); }
  continueToClosure(): void {
    if (this.hasDrafts) {
      this.saveMessage = 'Guarda las respuestas pendientes antes de continuar al cierre.';
      this.messages.add({ severity: 'warn', summary: 'Respuestas pendientes', detail: this.saveMessage, life: 5000 });
      this.changeDetector.markForCheck();
      return;
    }
    if (!this.canContinueToClosure) {
      this.saveMessage = 'Guarda al menos una respuesta y corrige cualquier tarea con error antes de continuar.';
      this.messages.add({ severity: 'warn', summary: 'Aún no puedes continuar', detail: this.saveMessage, life: 5000 });
      this.changeDetector.markForCheck();
      return;
    }
    void this.router.navigateByUrl('/work-order/closure');
  }
  save(): void {
    const drafts = this.rows.filter(row => this.statusFor(row) === 'DRAFT').map(row => ({ taskInstanceId: row.task.id, verificationTypeKey: this.formFor(row).controls.option.value!, remarks: this.formFor(row).controls.remarks.value.trim() }));
    if (!drafts.length) { this.saveMessage = 'Selecciona al menos una respuesta nueva antes de guardar.'; return; }
    this.saving = true; this.saveMessage = '';
    this.messages.add({ severity: 'info', summary: 'Guardando respuestas', detail: 'Registrando las verificaciones seleccionadas…', life: 3000 });
    this.verificationService.saveBatch(this.createOperationId(), drafts).pipe(finalize(() => { this.saving = false; this.changeDetector.markForCheck(); })).subscribe({ next: response => { response.results.forEach(result => { const row = this.rows.find(candidate => candidate.task.id === result.taskInstanceId); if (row) this.statuses.set(row.key, result.status === 'SAVED' ? 'SAVED' : 'ERROR'); }); this.saveMessage = `${response.summary.saved} verificada(s) y ${response.summary.failed + response.summary.uncertain} pendiente(s) de revisión.`; this.messages.add({ severity: response.summary.failed || response.summary.uncertain ? 'warn' : 'success', summary: response.summary.failed || response.summary.uncertain ? 'Guardado parcial' : 'Respuestas guardadas', detail: this.saveMessage, life: 7000 }); this.changeDetector.markForCheck(); }, error: error => { this.saveMessage = error.status === 401 ? 'La sesión venció. Ingresa nuevamente para continuar.' : 'No fue posible guardar las respuestas. Revisa las tareas con error.'; this.messages.add({ severity: 'error', summary: 'No se pudieron guardar las respuestas', detail: this.saveMessage, life: 7000 }); this.changeDetector.markForCheck(); } });
  }
  private createOperationId(): string {
    const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
    return cryptoApi?.randomUUID?.() ?? `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  statusLabel(status: TaskStatus): string { return ({ PENDING: 'Pendiente', DRAFT: 'Por guardar', SAVED: 'Verificada', ERROR: 'Error al guardar' })[status]; }
  statusIcon(status: TaskStatus): string { return ({ PENDING: 'pi pi-minus-circle', DRAFT: 'pi pi-pencil', SAVED: 'pi pi-check-circle', ERROR: 'pi pi-exclamation-circle' })[status]; }
  trackRow(_: number, row: TaskRow): string { return row.key; }
}
