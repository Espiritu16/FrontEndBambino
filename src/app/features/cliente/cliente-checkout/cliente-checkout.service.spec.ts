import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { SKIP_HTTP_CACHE } from '../../../core/http/cache-tokens';
import { ClienteCheckoutService } from './cliente-checkout.service';

describe('ClienteCheckoutService', () => {
  let service: ClienteCheckoutService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('bambino_basic_auth', 'token-test');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(ClienteCheckoutService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('validates and confirms checkout against carrito endpoints', () => {
    const payload = {
      modalidad: 'DELIVERY' as const,
      tipoComprobante: 'BOLETA' as const,
      idDireccion: 7,
      docNumero: '12345678',
      razonSocial: null,
      direccionFiscal: null
    };

    service.validarCheckout(payload).subscribe();
    const validarReq = http.expectOne(`${API_ENDPOINTS.cliente.carrito}/checkout/validar`);
    expect(validarReq.request.method).toBe('POST');
    expect(validarReq.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(validarReq.request.body).toEqual(payload);
    validarReq.flush({ valido: true, subtotal: 30, descuentoTotal: 0, impuestoTotal: 5.4, costoDelivery: 5, total: 40.4 });

    service.confirmarCheckout(payload).subscribe();
    const confirmarReq = http.expectOne(`${API_ENDPOINTS.cliente.carrito}/checkout/confirmar`);
    expect(confirmarReq.request.method).toBe('PATCH');
    expect(confirmarReq.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(confirmarReq.request.body).toEqual(payload);
    confirmarReq.flush({ valido: true, subtotal: 30, descuentoTotal: 0, impuestoTotal: 5.4, costoDelivery: 5, total: 40.4 });
  });

  it('creates and loads cliente pedidos', () => {
    service.listarPedidos().subscribe();
    const listarReq = http.expectOne(API_ENDPOINTS.cliente.pedidos);
    expect(listarReq.request.method).toBe('GET');
    expect(listarReq.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(listarReq.request.context.get(SKIP_HTTP_CACHE)).toBe(true);
    listarReq.flush([{ idPedido: 99, codigoPedido: 'PED-TEST', total: 23.6 }]);

    service.crearPedido({
      modalidad: 'RECOJO',
      tipoComprobante: 'BOLETA',
      idDireccionEntrega: null,
      docNumero: '12345678',
      razonSocial: null,
      direccionFiscal: null,
      subtotal: 20,
      descuentoTotal: 0,
      impuestoTotal: 3.6,
      total: 23.6
    }).subscribe();

    const crearReq = http.expectOne(API_ENDPOINTS.cliente.pedidos);
    expect(crearReq.request.method).toBe('POST');
    expect(crearReq.request.headers.get('Authorization')).toBe('Basic token-test');
    crearReq.flush({ idPedido: 99, codigoPedido: 'PED-TEST', total: 23.6 });

    service.obtenerPedido(99).subscribe();
    const obtenerReq = http.expectOne(`${API_ENDPOINTS.cliente.pedidos}/99`);
    expect(obtenerReq.request.method).toBe('GET');
    expect(obtenerReq.request.headers.get('Authorization')).toBe('Basic token-test');
    obtenerReq.flush({ idPedido: 99, codigoPedido: 'PED-TEST', total: 23.6 });
  });

  it('cancels cliente pedidos with a customer reason', () => {
    service.cancelarPedido(99, 'Cancelado por el cliente').subscribe();

    const cancelarReq = http.expectOne(`${API_ENDPOINTS.cliente.pedidos}/99/cancelar`);
    expect(cancelarReq.request.method).toBe('PATCH');
    expect(cancelarReq.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(cancelarReq.request.body).toEqual({
      estadoDestino: 'CANCELADO',
      motivo: 'Cancelado por el cliente'
    });
    cancelarReq.flush({ idPedido: 99, codigoPedido: 'PED-TEST', estadoActual: 'CANCELADO', total: 23.6 });
  });

  it('confirms Culqi checkout payment', () => {
    const payload = {
      modalidad: 'RECOJO' as const,
      tipoComprobante: 'BOLETA' as const,
      idDireccion: null,
      docNumero: '12345678',
      razonSocial: null,
      direccionFiscal: null,
      metodo: 'TARJETA' as const,
      proveedor: 'CULQI',
      idempotencyKey: 'checkout-123',
      culqiToken: 'tkn_test_123'
    };

    service.confirmarPagoCheckout(payload).subscribe();

    const req = http.expectOne(`${API_ENDPOINTS.cliente.pagos}/checkout/confirmar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(req.request.body).toEqual(payload);
    req.flush({
      pedido: { idPedido: 99, codigoPedido: 'PED-000000099', estadoActual: 'PAGO_APROBADO', total: 23.6 },
      pago: { idPago: 12, idPedido: 99, metodo: 'TARJETA', estado: 'APROBADO', monto: 23.6 }
    });
  });

  it('creates a Culqi checkout order before opening payment modal', () => {
    const payload = {
      modalidad: 'RECOJO' as const,
      tipoComprobante: 'BOLETA' as const,
      idDireccion: null,
      docNumero: '12345678',
      razonSocial: null,
      direccionFiscal: null
    };

    service.crearOrdenCulqiCheckout(payload).subscribe();

    const req = http.expectOne(`${API_ENDPOINTS.cliente.pagos}/checkout/culqi/orden`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(req.request.body).toEqual(payload);
    req.flush({ orderId: 'ord_test_123', total: 23.6, currency: 'PEN' });
  });

  it('loads public Culqi configuration without auth header', () => {
    service.obtenerConfiguracionCulqi().subscribe();

    const req = http.expectOne(`${API_ENDPOINTS.public.pagos}/culqi/configuracion`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBeFalsy();
    req.flush({
      publicKey: 'pk_test_xxx',
      checkoutScriptUrl: 'https://js.culqi.com/checkout-js',
      currency: 'PEN',
      habilitado: true
    });
  });

  it('loads profile documents and registers a new checkout document', () => {
    service.obtenerPerfil().subscribe();
    const perfilReq = http.expectOne(API_ENDPOINTS.cliente.perfil);
    expect(perfilReq.request.method).toBe('GET');
    expect(perfilReq.request.headers.get('Authorization')).toBe('Basic token-test');
    perfilReq.flush({ idCliente: 1, nombres: 'Fabrizio', apellidos: 'Test', docTipo: 'DNI', docNumero: '12345678' });

    service.obtenerDocumentos().subscribe();
    const documentosReq = http.expectOne(`${API_ENDPOINTS.cliente.perfil}/documentos`);
    expect(documentosReq.request.method).toBe('GET');
    expect(documentosReq.request.headers.get('Authorization')).toBe('Basic token-test');
    documentosReq.flush([{ idDocumento: 3, docTipo: 'DNI', docNumero: '12345678', esPrincipal: true, activo: true }]);

    service.registrarDocumento({ docTipo: 'RUC', docNumero: '20123456789' }).subscribe();
    const crearReq = http.expectOne(`${API_ENDPOINTS.cliente.perfil}/documentos`);
    expect(crearReq.request.method).toBe('POST');
    expect(crearReq.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(crearReq.request.body).toEqual({ docTipo: 'RUC', docNumero: '20123456789' });
    crearReq.flush({ idDocumento: 4, docTipo: 'RUC', docNumero: '20123456789', esPrincipal: false, activo: true });
  });

  it('registers a delivery address from checkout', () => {
    const payload = {
      direccionLinea1: 'Av. Nueva 456',
      referencia: 'Piso 2',
      distrito: 'Chorrillos',
      ciudad: 'Lima',
      latitud: null,
      longitud: null,
      googlePlaceId: null,
      googlePlusCode: null
    };

    service.registrarDireccion(payload).subscribe();

    const req = http.expectOne(API_ENDPOINTS.cliente.direcciones);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Basic token-test');
    expect(req.request.body).toEqual(payload);
    req.flush({
      idDireccion: 12,
      ...payload,
      esPrincipal: true,
      activo: true
    });
  });
});
