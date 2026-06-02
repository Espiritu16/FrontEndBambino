import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { ClienteCheckoutService } from '../cliente-checkout/cliente-checkout.service';
import { PagoPedidoPageComponent } from './pago-pedido.page';

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}

describe('PagoPedidoPageComponent', () => {
  let fixture: ComponentFixture<PagoPedidoPageComponent>;
  let culqiOpenCalls = 0;
  let lastCulqiConfig: {
    settings?: {
      order?: string;
    };
    options?: {
      paymentMethods?: Record<string, boolean>;
      paymentMethodsSort?: string[];
    };
  } | null = null;

  const checkoutServiceMock = {
    obtenerConfiguracionCulqi: vi.fn(),
    crearOrdenCulqiCheckout: vi.fn(),
    confirmarPagoCheckout: vi.fn()
  };

  const culqiConfigResponse = {
    publicKey: 'pk_test_xxx',
    checkoutScriptUrl: 'https://js.culqi.com/checkout-js',
    currency: 'PEN',
    habilitado: true
  };

  const pagoConfirmadoResponse = {
      pedido: {
        idPedido: 99,
        codigoPedido: 'PED-000000099',
        estadoActual: 'PAGO_APROBADO',
        modalidad: 'RECOJO',
        tipoComprobante: 'BOLETA',
        subtotal: 50,
        descuentoTotal: 0,
        impuestoTotal: 9,
        total: 59,
        fechaCreacion: new Date().toISOString()
      },
      pago: {
        idPago: 12,
        idPedido: 99,
        metodo: 'YAPE',
        estado: 'APROBADO',
        monto: 59,
        proveedor: 'SIMULADO',
        proveedorTxnId: 'SIM-PED-000000099',
        idempotencyKey: 'checkout-123',
        urlPago: null,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      }
    };

  beforeEach(async () => {
    culqiOpenCalls = 0;
    lastCulqiConfig = null;
    document.querySelectorAll('script[data-bambino-culqi="true"]').forEach((script) => script.remove());
    checkoutServiceMock.obtenerConfiguracionCulqi.mockReturnValue(of(culqiConfigResponse));
    checkoutServiceMock.crearOrdenCulqiCheckout.mockReturnValue(of({
      orderId: 'ord_test_123',
      total: 59,
      currency: 'PEN'
    }));
    checkoutServiceMock.confirmarPagoCheckout.mockReturnValue(of(pagoConfirmadoResponse));
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete'
    });
    (window as unknown as { CulqiCheckout?: unknown }).CulqiCheckout = class {
      public culqi?: (result?: unknown) => void;
      public token?: { id?: string };
      public close = vi.fn();
      constructor(_publicKey: string, config: unknown) {
        lastCulqiConfig = config as typeof lastCulqiConfig;
      }
      open(): void {
        culqiOpenCalls += 1;
        this.token = { id: 'tkn_test_123' };
        this.culqi?.();
      }
    };
    sessionStorage.setItem('bambino_checkout_pago_payload', JSON.stringify({
      checkout: {
        modalidad: 'RECOJO',
        tipoComprobante: 'BOLETA',
        idDireccion: null,
        docNumero: '12345678',
        razonSocial: null,
        direccionFiscal: null
      },
      validacion: {
        valido: true,
        mensaje: 'ok',
        modalidad: 'RECOJO',
        tipoComprobante: 'BOLETA',
        subtotal: 50,
        descuentoTotal: 0,
        impuestoTotal: 9,
        costoDelivery: 0,
        total: 59
      },
      createdAt: new Date().toISOString()
    }));

    await TestBed.configureTestingModule({
      imports: [PagoPedidoPageComponent],
      providers: [
        provideRouter([
          { path: 'comprobante-pedido', component: DummyRouteComponent },
          { path: 'checkout', component: DummyRouteComponent },
          { path: 'carrito', component: DummyRouteComponent }
        ]),
        { provide: ClienteCheckoutService, useValue: checkoutServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PagoPedidoPageComponent);
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    document.querySelectorAll('script[data-bambino-culqi="true"]').forEach((script) => script.remove());
    delete (window as unknown as { CulqiCheckout?: unknown }).CulqiCheckout;
    delete (window as unknown as { Culqi?: unknown }).Culqi;
  });

  it('confirms checkout payment with Culqi token and navigates to receipt', async () => {
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
    await Promise.resolve();

    const component = fixture.componentInstance as unknown as {
      confirmarPago(): Promise<void>;
    };
    await component.confirmarPago();
    await fixture.whenStable();
    await Promise.resolve();

    expect(checkoutServiceMock.confirmarPagoCheckout).toHaveBeenCalledWith(expect.objectContaining({
      modalidad: 'RECOJO',
      tipoComprobante: 'BOLETA',
      metodo: 'TARJETA',
      proveedor: 'CULQI',
      culqiToken: 'tkn_test_123'
    }));
    expect(checkoutServiceMock.crearOrdenCulqiCheckout).toHaveBeenCalledWith(expect.objectContaining({
      modalidad: 'RECOJO',
      tipoComprobante: 'BOLETA'
    }));
    expect(lastCulqiConfig?.settings?.order).toBe('ord_test_123');
    expect(lastCulqiConfig?.options?.paymentMethods).toEqual(expect.objectContaining({
      tarjeta: true,
      yape: true,
      billetera: false,
      bancaMovil: false,
      agente: false,
      cuotealo: false
    }));
    expect(lastCulqiConfig?.options?.paymentMethodsSort).toEqual(['tarjeta', 'yape']);
    expect(navigateSpy).toHaveBeenCalledWith(['/comprobante-pedido'], { queryParams: { idPedido: 99 } });
    expect(sessionStorage.getItem('bambino_checkout_pago_payload')).toBeNull();
  });

  it('reenables the Culqi payment button when the modal closes without token', async () => {
    (window as unknown as { CulqiCheckout?: unknown }).CulqiCheckout = class {
      open(): void {
        culqiOpenCalls += 1;
      }
    };
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      confirmarPago(): Promise<void>;
      openingCheckout: boolean;
      submitting: boolean;
      draft: unknown;
      culqiReady: boolean;
      culqiConfig: { habilitado: boolean } | null;
    };

    component.culqiReady = true;
    component.culqiConfig = culqiConfigResponse;
    expect(component.draft).toBeTruthy();

    await component.confirmarPago();
    await fixture.whenStable();
    await Promise.resolve();
    expect(component.openingCheckout).toBeFalsy();
    expect(component.submitting).toBeFalsy();

    fixture.detectChanges();
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find((element: HTMLButtonElement) => element.textContent?.includes('Pagar con Culqi')) as HTMLButtonElement;

    expect(culqiOpenCalls).toBe(1);
    expect(button.disabled).toBeFalsy();
    expect(component.openingCheckout).toBeFalsy();
    expect(component.submitting).toBeFalsy();
    expect(checkoutServiceMock.confirmarPagoCheckout).not.toHaveBeenCalled();
  });

  it('accepts a direct Yape token returned by Culqi checkout callback', async () => {
    (window as unknown as { CulqiCheckout?: unknown }).CulqiCheckout = class {
      public culqi?: (result?: unknown) => void;
      constructor(_publicKey: string, config: unknown) {
        lastCulqiConfig = config as typeof lastCulqiConfig;
      }
      open(): void {
        culqiOpenCalls += 1;
        this.culqi?.({
          object: 'token',
          id: 'ype_test_ZnZZMdE1zPmw0zJD'
        });
      }
    };
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    const component = fixture.componentInstance as unknown as {
      confirmarPago(): Promise<void>;
    };
    await component.confirmarPago();
    await fixture.whenStable();
    await Promise.resolve();

    expect(checkoutServiceMock.confirmarPagoCheckout).toHaveBeenCalledWith(expect.objectContaining({
      metodo: 'YAPE',
      proveedor: 'CULQI',
      culqiToken: 'ype_test_ZnZZMdE1zPmw0zJD'
    }));
    expect(navigateSpy).toHaveBeenCalledWith(['/comprobante-pedido'], { queryParams: { idPedido: 99 } });
  });

  it('shows a confirmation state while the backend registers the paid order', async () => {
    const pendingConfirmation = new Subject<typeof pagoConfirmadoResponse>();
    checkoutServiceMock.confirmarPagoCheckout.mockReturnValue(pendingConfirmation.asObservable());
    (window as unknown as { CulqiCheckout?: unknown }).CulqiCheckout = class {
      public culqi?: (result?: unknown) => void;
      open(): void {
        this.culqi?.({
          object: 'token',
          id: 'ype_test_ZnZZMdE1zPmw0zJD'
        });
      }
    };
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    const component = fixture.componentInstance as unknown as {
      confirmarPago(): Promise<void>;
    };
    void component.confirmarPago();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Confirmando pago');
    expect(host.textContent).toContain('registrando tu pedido');

    pendingConfirmation.next(pagoConfirmadoResponse);
    pendingConfirmation.complete();
    await fixture.whenStable();
  });
});
