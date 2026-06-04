import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CarritoResumen, ClienteCarritoService } from '../cliente-carrito/cliente-carrito.service';
import { CheckoutValidarResponse, ClienteCheckoutService, DireccionCliente, DocumentoCliente } from './cliente-checkout.service';
import { CheckoutPageComponent } from './checkout.page';

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}

describe('CheckoutPageComponent', () => {
  let fixture: ComponentFixture<CheckoutPageComponent>;

  const carrito: CarritoResumen = {
    idCarrito: 10,
    estado: 'ABIERTO',
    subtotal: 50,
    descuentoTotal: 0,
    impuestoTotal: 9,
    costoDelivery: 0,
    total: 59,
    totalItems: 2,
    items: [
      {
        idCarritoItem: 1,
        idProducto: 4,
        nombreProducto: '1/4 de Pollo',
        cantidad: 2,
        precioUnitario: 25,
        descuentoUnitario: 0,
        subtotal: 50,
        observacion: null,
        imagenUrl: null
      }
    ]
  };

  const direccion: DireccionCliente = {
    idDireccion: 7,
    direccionLinea1: 'Av. Principal 123',
    referencia: 'Frente al parque',
    distrito: 'Chorrillos',
    ciudad: 'Lima',
    esPrincipal: true,
    activo: true
  };

  const validacion: CheckoutValidarResponse = {
    valido: true,
    mensaje: 'ok',
    modalidad: 'DELIVERY',
    tipoComprobante: 'BOLETA',
    subtotal: 50,
    descuentoTotal: 0,
    impuestoTotal: 9,
    costoDelivery: 5,
    total: 64
  };

  const carritoServiceMock = {
    obtenerCarrito: vi.fn(() => of(carrito))
  };

  const checkoutServiceMock = {
    obtenerDirecciones: vi.fn(() => of([direccion])),
    obtenerPerfil: vi.fn(() => of({ idCliente: 1, nombres: 'Fabrizio', apellidos: 'Test', docTipo: 'DNI', docNumero: '12345678' })),
    obtenerDocumentos: vi.fn(() => of<DocumentoCliente[]>([
      { idDocumento: 3, docTipo: 'DNI', docNumero: '12345678', esPrincipal: true, activo: true }
    ])),
    registrarDocumento: vi.fn((request: { docTipo: string; docNumero: string }) => of({
      idDocumento: 4,
      docTipo: request.docTipo,
      docNumero: request.docNumero,
      esPrincipal: false,
      activo: true
    })),
    registrarDireccion: vi.fn((request: {
      direccionLinea1: string;
      referencia: string | null;
      distrito: string | null;
      ciudad: string;
    }) => of({
      idDireccion: 12,
      direccionLinea1: request.direccionLinea1,
      referencia: request.referencia,
      distrito: request.distrito,
      ciudad: request.ciudad,
      esPrincipal: true,
      activo: true
    })),
    validarCheckout: vi.fn(() => of(validacion)),
    confirmarCheckout: vi.fn(() => of(validacion)),
    crearPedido: vi.fn(() => of({ idPedido: 99, codigoPedido: 'PED-TEST', total: 64 }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutPageComponent],
      providers: [
        provideRouter([
          { path: 'comprobante-pedido', component: DummyRouteComponent },
          { path: 'pago-pedido', component: DummyRouteComponent },
          { path: 'promociones', component: DummyRouteComponent }
        ]),
        { provide: ClienteCarritoService, useValue: carritoServiceMock },
        { provide: ClienteCheckoutService, useValue: checkoutServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutPageComponent);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires a delivery address before confirming checkout', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { modalidad: 'RECOJO' | 'DELIVERY'; idDireccion: number | null; docNumero: string };
      confirmarPedido(): Promise<void>;
      formError: string;
    };
    component.form.modalidad = 'DELIVERY';
    component.form.idDireccion = null;
    component.form.docNumero = '12345678';

    await component.confirmarPedido();

    expect(component.formError).toContain('Selecciona una dirección');
    expect(checkoutServiceMock.confirmarCheckout).not.toHaveBeenCalled();
    expect(checkoutServiceMock.crearPedido).not.toHaveBeenCalled();
  });

  it('registers and selects a delivery address without leaving checkout', async () => {
    checkoutServiceMock.obtenerDirecciones.mockReturnValueOnce(of<DireccionCliente[]>([]));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { modalidad: 'RECOJO' | 'DELIVERY'; idDireccion: number | null };
      addressForm: {
        direccionLinea1: string;
        referencia: string;
        distrito: string;
        ciudad: string;
        latitud: string;
        longitud: string;
        googlePlaceId: string;
        googlePlusCode: string;
      };
      onCheckoutOptionChange(): Promise<void>;
      registrarDireccionCheckout(): Promise<void>;
    };
    component.form.modalidad = 'DELIVERY';
    await component.onCheckoutOptionChange();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Ciudad');
    expect(text).not.toContain('Latitud');
    expect(text).not.toContain('Longitud');
    expect(text).not.toContain('Google Place ID');
    expect(text).not.toContain('Google Plus Code');

    component.addressForm = {
      direccionLinea1: 'Av. Nueva 456',
      referencia: 'Piso 2',
      distrito: 'Chorrillos',
      ciudad: 'Lima',
      latitud: '-12.1700000',
      longitud: '-77.0100000',
      googlePlaceId: 'COORD:-12.1700000,-77.0100000',
      googlePlusCode: ''
    };

    await component.registrarDireccionCheckout();

    expect(checkoutServiceMock.registrarDireccion).toHaveBeenCalledWith({
      direccionLinea1: 'Av. Nueva 456',
      referencia: 'Piso 2',
      distrito: 'Chorrillos',
      ciudad: 'Lima',
      latitud: -12.17,
      longitud: -77.01,
      googlePlaceId: 'COORD:-12.1700000,-77.0100000',
      googlePlusCode: null
    });
    expect(component.form.idDireccion).toBe(12);
  });

  it('uses the client profile DNI for boleta by default', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { tipoComprobante: 'BOLETA'; docNumero: string };
    };

    expect(checkoutServiceMock.obtenerPerfil).toHaveBeenCalled();
    expect(checkoutServiceMock.obtenerDocumentos).toHaveBeenCalled();
    expect(component.form.tipoComprobante).toBe('BOLETA');
    await vi.waitFor(() => {
      expect(component.form.docNumero).toBe('12345678');
    });
  });

  it('registers a missing RUC and uses it for factura', async () => {
    checkoutServiceMock.obtenerDocumentos.mockReturnValueOnce(of<DocumentoCliente[]>([
      { idDocumento: 3, docTipo: 'DNI', docNumero: '12345678', esPrincipal: true, activo: true }
    ]));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { tipoComprobante: 'FACTURA'; docNumero: string };
      rucRegistroNumero: string;
      onCheckoutOptionChange(): Promise<void>;
      registrarRucFactura(): Promise<void>;
    };
    component.form.tipoComprobante = 'FACTURA';
    await component.onCheckoutOptionChange();
    expect(component.form.docNumero).toBe('');

    component.rucRegistroNumero = '20123456789';
    await component.registrarRucFactura();

    expect(checkoutServiceMock.registrarDocumento).toHaveBeenCalledWith({ docTipo: 'RUC', docNumero: '20123456789' });
    expect(component.form.docNumero).toBe('20123456789');
  });

  it('does not show fiscal text fields when invoice only requires RUC', async () => {
    checkoutServiceMock.obtenerDocumentos.mockReturnValueOnce(of<DocumentoCliente[]>([
      { idDocumento: 4, docTipo: 'RUC', docNumero: '20123456789', esPrincipal: false, activo: true }
    ]));
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      form: { tipoComprobante: 'FACTURA'; docNumero: string };
      onCheckoutOptionChange(): Promise<void>;
      validarPedido(): Promise<void>;
    };
    component.form.tipoComprobante = 'FACTURA';
    await component.onCheckoutOptionChange();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Razón social');
    expect(text).not.toContain('Dirección fiscal');

    await component.validarPedido();

    expect(checkoutServiceMock.validarCheckout).toHaveBeenCalledWith(expect.objectContaining({
      tipoComprobante: 'FACTURA',
      docNumero: '20123456789',
      razonSocial: null,
      direccionFiscal: null
    }));
  });

  it('does not create the order until checkout has been validated', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { modalidad: 'RECOJO' | 'DELIVERY'; idDireccion: number | null; docNumero: string };
      confirmarPedido(): Promise<void>;
      formError: string;
    };
    component.form.modalidad = 'DELIVERY';
    component.form.idDireccion = 7;
    component.form.docNumero = '12345678';

    await component.confirmarPedido();

    expect(component.formError).toContain('Valida el checkout');
    expect(checkoutServiceMock.confirmarCheckout).not.toHaveBeenCalled();
    expect(checkoutServiceMock.crearPedido).not.toHaveBeenCalled();
  });

  it('invalidates a successful validation when checkout options change', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { modalidad: 'RECOJO' | 'DELIVERY'; idDireccion: number | null; docNumero: string };
      validacion: CheckoutValidarResponse | null;
      validarPedido(): Promise<void>;
      onCheckoutOptionChange(): Promise<void>;
      canCreatePedido: boolean;
    };
    component.form.modalidad = 'DELIVERY';
    component.form.idDireccion = 7;
    component.form.docNumero = '12345678';

    await component.validarPedido();
    expect(component.validacion).not.toBeNull();
    expect(component.canCreatePedido).toBe(true);

    component.form.modalidad = 'RECOJO';
    await component.onCheckoutOptionChange();

    expect(component.validacion).toBeNull();
    expect(component.canCreatePedido).toBe(false);
  });

  it('enables the continue payment button only after successful validation', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { modalidad: 'DELIVERY'; idDireccion: number | null; docNumero: string };
      validarPedido(): Promise<void>;
    };
    component.form.modalidad = 'DELIVERY';
    component.form.idDireccion = 7;
    component.form.docNumero = '12345678';
    fixture.detectChanges();

    const getCreateButton = (): HTMLButtonElement => Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.includes('Continuar al pago')) as HTMLButtonElement;

    await vi.waitFor(() => {
      expect(getCreateButton()).toBeTruthy();
    });
    expect(getCreateButton().disabled).toBe(true);

    await component.validarPedido();
    fixture.detectChanges();

    expect(getCreateButton().disabled).toBe(false);
  });

  it('confirms checkout after validation and navigates to payment without creating order', async () => {
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { modalidad: 'DELIVERY'; idDireccion: number | null; docNumero: string };
      validarPedido(): Promise<void>;
      confirmarPedido(): Promise<void>;
    };
    component.form.modalidad = 'DELIVERY';
    component.form.idDireccion = 7;
    component.form.docNumero = '12345678';

    await component.validarPedido();
    await component.confirmarPedido();

    expect(checkoutServiceMock.validarCheckout).toHaveBeenCalledWith(expect.objectContaining({
      modalidad: 'DELIVERY',
      tipoComprobante: 'BOLETA',
      idDireccion: 7,
      docNumero: '12345678'
    }));
    expect(checkoutServiceMock.confirmarCheckout).toHaveBeenCalledWith(expect.objectContaining({
      modalidad: 'DELIVERY',
      tipoComprobante: 'BOLETA',
      idDireccion: 7,
      docNumero: '12345678'
    }));
    expect(checkoutServiceMock.crearPedido).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/pago-pedido']);
  });

  it('shows backend error when payment preparation fails', async () => {
    checkoutServiceMock.confirmarCheckout.mockReturnValueOnce(throwError(() => ({
      error: { mensaje: 'checkout no disponible' }
    })));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { modalidad: 'DELIVERY'; idDireccion: number | null; docNumero: string };
      validarPedido(): Promise<void>;
      confirmarPedido(): Promise<void>;
      error: string;
    };
    component.form.modalidad = 'DELIVERY';
    component.form.idDireccion = 7;
    component.form.docNumero = '12345678';

    await component.validarPedido();
    await component.confirmarPedido();

    expect(checkoutServiceMock.crearPedido).not.toHaveBeenCalled();
    expect(component.error).toContain('checkout no disponible');
  });
});
