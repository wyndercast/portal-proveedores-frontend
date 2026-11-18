import { Injectable } from '@angular/core';

export interface EvidenceImage {
  id: string;
  workOrderId: string;
  name: string;
  mimeType: 'image/jpeg';
  size: number;
  order: number;
  blob: Blob;
  previewUrl: string;
}

@Injectable({ providedIn: 'root' })
export class EvidenceService {
  readonly maxPhotos = 6;
  readonly maxBytesPerPhoto = 10 * 1024 * 1024;
  readonly maxBytesTotal = 30 * 1024 * 1024;
  readonly maxDimension = 2000;
  private readonly collections = new Map<string, EvidenceImage[]>();
  private activeWorkOrderId: string | null = null;

  setActiveWorkOrder(workOrderId: string): void {
    if (this.activeWorkOrderId && this.activeWorkOrderId !== workOrderId) this.clear(this.activeWorkOrderId);
    this.activeWorkOrderId = workOrderId;
    if (!this.collections.has(workOrderId)) this.collections.set(workOrderId, []);
  }

  get(workOrderId: string): EvidenceImage[] { return [...(this.collections.get(workOrderId) ?? [])]; }

  async add(workOrderId: string, file: File): Promise<EvidenceImage> {
    this.setActiveWorkOrder(workOrderId);
    const current = this.collections.get(workOrderId)!;
    if (current.length >= this.maxPhotos) throw new Error('LÍMITE_FOTOS');
    const image = await this.prepare(workOrderId, file, current.length);
    if (current.reduce((total, item) => total + item.size, 0) + image.size > this.maxBytesTotal) {
      URL.revokeObjectURL(image.previewUrl);
      throw new Error('LÍMITE_TAMAÑO_TOTAL');
    }
    current.push(image);
    return image;
  }

  async replace(workOrderId: string, imageId: string, file: File): Promise<void> {
    const current = this.collections.get(workOrderId) ?? [];
    const index = current.findIndex(item => item.id === imageId);
    if (index < 0) throw new Error('FOTO_NO_ENCONTRADA');
    const previous = current[index];
    const image = await this.prepare(workOrderId, file, previous.order);
    const totalWithoutPrevious = current.reduce((total, item) => total + item.size, 0) - previous.size;
    if (totalWithoutPrevious + image.size > this.maxBytesTotal) {
      URL.revokeObjectURL(image.previewUrl);
      throw new Error('LÍMITE_TAMAÑO_TOTAL');
    }
    URL.revokeObjectURL(previous.previewUrl);
    current[index] = image;
  }

  remove(workOrderId: string, imageId: string): void {
    const current = this.collections.get(workOrderId) ?? [];
    const index = current.findIndex(item => item.id === imageId);
    if (index < 0) return;
    URL.revokeObjectURL(current[index].previewUrl);
    current.splice(index, 1);
    current.forEach((item, itemIndex) => item.order = itemIndex);
  }

  clear(workOrderId: string): void {
    const current = this.collections.get(workOrderId);
    current?.forEach(item => URL.revokeObjectURL(item.previewUrl));
    this.collections.delete(workOrderId);
    if (this.activeWorkOrderId === workOrderId) this.activeWorkOrderId = null;
  }

  clearAll(): void { [...this.collections.keys()].forEach(workOrderId => this.clear(workOrderId)); }

  private async prepare(workOrderId: string, file: File, order: number): Promise<EvidenceImage> {
    if (file.size > this.maxBytesPerPhoto) throw new Error('FOTO_DEMASIADO_GRANDE');
    if (!(await this.isSupportedImage(file))) throw new Error('FORMATO_NO_VALIDO');
    const bitmap = await this.decode(file);
    const scale = Math.min(1, this.maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PROCESAMIENTO_NO_DISPONIBLE');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PROCESAMIENTO_NO_DISPONIBLE')), 'image/jpeg', .86));
    const previewUrl = URL.createObjectURL(blob);
    return { id: this.createId(), workOrderId, name: file.name, mimeType: 'image/jpeg', size: blob.size, order, blob, previewUrl };
  }

  private createId(): string {
    const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
    return cryptoApi?.randomUUID?.() ?? `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private async isSupportedImage(file: File): Promise<boolean> {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    return (file.type === 'image/jpeg' && jpeg) || (file.type === 'image/png' && png);
  }

  private decode(file: File): Promise<ImageBitmap> {
    return createImageBitmap(file);
  }
}
