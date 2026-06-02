import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { ClienteCarritoService } from './cliente-carrito.service';

describe('ClienteCarritoService', () => {
  let service: ClienteCarritoService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('bambino_basic_auth', 'token-test');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(ClienteCarritoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('loads the authenticated cart from the cliente carrito endpoint', () => {
    service.obtenerCarrito().subscribe();

    const req = http.expectOne(API_ENDPOINTS.cliente.carrito);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Basic token-test');

    req.flush({
      idCarrito: 1,
      estado: 'ABIERTO',
      subtotal: 20,
      descuentoTotal: 0,
      impuestoTotal: 3.6,
      costoDelivery: 0,
      total: 23.6,
      totalItems: 1,
      items: []
    });
  });

  it('adds an item with quantity and observation', () => {
    service.agregarItem({ idProducto: 15, cantidad: 2, observacion: 'Sin cremas' }).subscribe();

    const req = http.expectOne(`${API_ENDPOINTS.cliente.carrito}/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(req.request.body).toEqual({ idProducto: 15, cantidad: 2, observacion: 'Sin cremas' });

    req.flush({
      idCarrito: 1,
      estado: 'ABIERTO',
      subtotal: 40,
      descuentoTotal: 0,
      impuestoTotal: 7.2,
      costoDelivery: 0,
      total: 47.2,
      totalItems: 2,
      items: []
    });
  });
});
