import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvidenceImage } from './evidence.service';
import { ServiceSignatures } from './signature.service';

export interface ReportPreview { pdf: Blob; previewId: string; fileName: string; }
export interface ReportUploadResponse { status: string; fileName: string; }

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/api/v1/provider/work-order/report`;

  preview(technicianName: string, receiverName: string, remarks: string, signatures: ServiceSignatures, photos: EvidenceImage[]): Observable<ReportPreview> {
    const form = new FormData();
    form.append('technicianName', technicianName);
    form.append('receiverName', receiverName);
    form.append('remarks', remarks);
    form.append('technicianSignature', signatures.technician!.image, 'technician-signature.png');
    form.append('receiverSignature', signatures.receiver!.image, 'receiver-signature.png');
    photos.forEach((photo, index) => form.append('photos', photo.blob, `evidence-${index + 1}.jpg`));
    return this.http.post(`${this.endpoint}/preview`, form, { observe: 'response', responseType: 'blob' }).pipe(map(response => this.mapPreview(response)));
  }

  upload(previewId: string): Observable<ReportUploadResponse> { return this.http.post<ReportUploadResponse>(`${this.endpoint}/upload`, null, { params: { previewId } }); }

  private mapPreview(response: HttpResponse<Blob>): ReportPreview {
    const previewId = response.headers.get('X-Report-Preview-Id');
    if (!previewId || !response.body) throw new Error('PREVIEW_INVALIDA');
    return { pdf: response.body, previewId, fileName: response.headers.get('X-Report-File-Name') ?? 'informe.pdf' };
  }
}
