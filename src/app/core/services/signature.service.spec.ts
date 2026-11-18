import { TestBed } from '@angular/core/testing';
import { SignatureService } from './signature.service';

describe('SignatureService', () => {
  let service: SignatureService;

  beforeEach(() => {
    service = TestBed.inject(SignatureService);
  });

  it('keeps confirmed signatures isolated by work order and role', () => {
    const image = new Blob(['png'], { type: 'image/png' });
    service.confirm('ot-1', 'TECHNICIAN', ' Ana Técnico ', image);
    service.confirm('ot-1', 'RECEIVER', 'Luis Receptor', image);

    expect(service.get('ot-1').technician?.signerName).toBe('Ana Técnico');
    expect(service.get('ot-1').receiver?.role).toBe('RECEIVER');
    expect(service.get('ot-2')).toEqual({});
  });

  it('clears the active work order when another one is selected', () => {
    const image = new Blob(['png'], { type: 'image/png' });
    service.confirm('ot-1', 'TECHNICIAN', 'Ana', image);
    service.setActiveWorkOrder('ot-2');

    expect(service.get('ot-1')).toEqual({});
    expect(service.get('ot-2')).toEqual({});
  });
});
