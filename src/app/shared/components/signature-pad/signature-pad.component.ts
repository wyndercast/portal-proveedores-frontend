import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-signature-pad', standalone: true, templateUrl: './signature-pad.component.html', styleUrl: './signature-pad.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignaturePadComponent implements AfterViewInit {
  @Input() label = 'Firma';
  @Output() drawingChanged = new EventEmitter<boolean>();
  @ViewChild('canvas', { static: true }) private readonly canvas!: ElementRef<HTMLCanvasElement>;
  private context!: CanvasRenderingContext2D;
  private drawing = false;
  private hasDrawing = false;

  ngAfterViewInit(): void { this.resizeCanvas(); }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    this.hasDrawing = false;
    this.drawingChanged.emit(false);
  }

  async toPng(): Promise<Blob | null> {
    if (!this.hasDrawing) return null;
    return new Promise(resolve => this.canvas.nativeElement.toBlob(blob => resolve(blob), 'image/png'));
  }

  private resizeCanvas(): void {
    const element = this.canvas.nativeElement;
    const bounds = element.getBoundingClientRect();
    const ratio = typeof window === 'undefined' ? 1 : Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    element.width = Math.max(1, Math.round(bounds.width * ratio));
    element.height = Math.max(1, Math.round(bounds.height * ratio));
    this.context = element.getContext('2d')!;
    this.context.scale(ratio, ratio);
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.context.lineWidth = 2.2;
    this.context.strokeStyle = '#172033';
  }

  pointerDown(event: PointerEvent): void {
    event.preventDefault();
    const point = this.point(event);
    this.canvas.nativeElement.setPointerCapture(event.pointerId);
    this.context.beginPath();
    this.context.moveTo(point.x, point.y);
    this.drawing = true;
    this.hasDrawing = true;
    this.drawingChanged.emit(true);
  }

  pointerMove(event: PointerEvent): void {
    if (!this.drawing) return;
    event.preventDefault();
    const point = this.point(event);
    this.context.lineTo(point.x, point.y);
    this.context.stroke();
  }

  pointerUp(event: PointerEvent): void {
    if (!this.drawing) return;
    event.preventDefault();
    this.drawing = false;
    if (this.canvas.nativeElement.hasPointerCapture(event.pointerId)) this.canvas.nativeElement.releasePointerCapture(event.pointerId);
  }

  private point(event: PointerEvent): { x: number; y: number } {
    const bounds = this.canvas.nativeElement.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }
}
