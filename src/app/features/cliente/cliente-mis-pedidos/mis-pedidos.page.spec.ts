import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ClienteCheckoutService, PedidoResponse } from '../cliente-checkout/cliente-checkout.service';
import { MisPedidosPageComponent } from './mis-pedidos.page';

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}

describe('MisPedidosPageComponent', () => {
  let fixture: ComponentFixture<MisPedidosPageComponent>;

  const pedidoCreado: PedidoResponse = {
    idPedido: 10,
    codigoPedido: 'PED-001',
    estadoActual: 'CREADO',
    modalidad: 'RECOJO',
    tipoComprobante: 'BOLETA',
    subtotal: 20,
    descuentoTotal: 0,
    impuestoTotal: 3.6,
    total: 23.6,
    fechaCreacion: '2026-06-01T10:00:00'
  };

  const pedidoConfirmado: PedidoResponse = {
    ...pedidoCreado,
    idPedido: 11,
    codigoPedido: 'PED-002',
    estadoActual: 'CONFIRMADO'
  };

  const checkoutServiceMock = {
    listarPedidos: vi.fn(() => of([pedidoCreado, pedidoConfirmado])),
    cancelarPedido: vi.fn(() => of({ ...pedidoCreado, estadoActual: 'CANCELADO' })),
    obtenerComprobantePorPedido: vi.fn(() => of({
      idComprobante: 31,
      idPedido: 11,
      tipo: 'BOLETA',
      serie: 'B001',
      correlativo: 1,
      numeroCompleto: 'B001-000000001',
      estado: 'EMITIDO',
      docReceptorTipo: 'DNI',
      docReceptorNumero: '12345678',
      razonSocialReceptor: 'Cliente Test',
      direccionFiscalReceptor: null,
      subtotal: 20,
      impuestoTotal: 3.6,
      total: 23.6,
      fechaEmision: '2026-06-01T10:05:00',
      correoEnviado: false,
      correoDestino: null,
      fechaCorreoEnvio: null,
      correoError: null,
      pdfPath: null,
      pdfToken: null,
      fechaPdfGenerado: null,
      detalle: [
        {
          idComprobanteDetalle: 41,
          descripcionItem: '1/4 Pollo',
          cantidad: 1,
          precioUnitario: 20,
          descuentoUnitario: 0,
          subtotalLinea: 20
        }
      ]
    })),
    obtenerComprobantePdfPorPedido: vi.fn()
  };

  beforeEach(async () => {
    localStorage.setItem('bambino_user_name', 'Cliente Test');
    await TestBed.configureTestingModule({
      imports: [MisPedidosPageComponent],
      providers: [
        provideRouter([
          { path: 'perfil', component: DummyRouteComponent },
          { path: 'direcciones', component: DummyRouteComponent }
        ]),
        { provide: ClienteCheckoutService, useValue: checkoutServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MisPedidosPageComponent);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows cancel action only for customer-cancelable orders', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .map((button) => button.textContent?.trim())
      .filter(Boolean);

    expect(buttons).toContain('Cancelar pedido');
    expect(buttons.filter((text) => text === 'Cancelar pedido')).toHaveLength(1);
  });

  it('confirms cancellation and keeps the order visible as canceled', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      openCancelModal(order: PedidoResponse): void;
      confirmCancelOrder(): Promise<void>;
      cancelTarget: PedidoResponse | null;
      orders: PedidoResponse[];
    };
    component.openCancelModal(pedidoCreado);
    expect(component.cancelTarget?.idPedido).toBe(10);

    await component.confirmCancelOrder();

    expect(checkoutServiceMock.cancelarPedido).toHaveBeenCalledWith(10, 'Cancelado por el cliente');
    expect(component.orders.find((order) => order.idPedido === 10)?.estadoActual).toBe('CANCELADO');
    expect(component.orders.map((order) => order.idPedido)).toEqual([10, 11]);
  });

  it('opens the order comprobante modal from history', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      openOrderModal(order: PedidoResponse): Promise<void>;
      comprobanteDetalle: { numeroCompleto: string; total: number } | null;
    };

    await component.openOrderModal(pedidoConfirmado);
    fixture.detectChanges();

    expect(checkoutServiceMock.obtenerComprobantePorPedido).toHaveBeenCalledWith(11);
    expect(component.comprobanteDetalle?.numeroCompleto).toBe('B001-000000001');
    expect(fixture.nativeElement.textContent).toContain('B001-000000001');
    expect(fixture.nativeElement.textContent).toContain('Abrir PDF');
  });
});
