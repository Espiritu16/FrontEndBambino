import '@angular/compiler';

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { AdminOperacionesService } from './admin-operaciones.service';

describe('AdminOperacionesService', () => {
  let service: AdminOperacionesService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('bambino_basic_auth', 'admin-token');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(AdminOperacionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http?.verify();
    localStorage.clear();
  });

  it('lists error logs with admin filters and pagination', () => {
    service.listarLogsErrores({
      statusCode: 500,
      desde: '2026-07-09T00:00',
      hasta: '2026-07-09T23:59',
      ruta: '/api/admin',
      usuarioEmail: 'admin@test.com',
      exceptionClass: 'NullPointerException',
      page: 2,
      size: 10
    }).subscribe();

    const req = http.expectOne((request) => request.url === API_ENDPOINTS.admin.logsErrores);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Basic admin-token');
    expect(req.request.params.get('statusCode')).toBe('500');
    expect(req.request.params.get('desde')).toBe('2026-07-09T00:00');
    expect(req.request.params.get('hasta')).toBe('2026-07-09T23:59');
    expect(req.request.params.get('ruta')).toBe('/api/admin');
    expect(req.request.params.get('usuarioEmail')).toBe('admin@test.com');
    expect(req.request.params.get('exceptionClass')).toBe('NullPointerException');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');

    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 2, first: false, last: true });
  });

  it('loads one error log detail', () => {
    service.obtenerLogError(7).subscribe();

    const req = http.expectOne(`${API_ENDPOINTS.admin.logsErrores}/7`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Basic admin-token');

    req.flush({
      idError: 7,
      fecha: '2026-07-09T10:00:00',
      statusCode: 500,
      error: 'Internal Server Error',
      mensaje: 'error interno del servidor',
      ruta: '/api/admin/reportes',
      metodoHttp: 'GET',
      usuarioEmail: 'admin@test.com',
      actorTipo: 'ADMIN',
      requestId: 'req-7',
      exceptionClass: 'java.lang.NullPointerException',
      ip: '127.0.0.1',
      userAgent: 'Vitest',
      stacktraceResumen: 'stacktrace',
      detallesJson: '[]'
    });
  });
});
