import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ClienteCheckoutService } from '../cliente-checkout/cliente-checkout.service';
import { ComprobantePedidoPageComponent } from './comprobante-pedido.page';

describe('ComprobantePedidoPageComponent', () => {
  let fixture: ComponentFixture<ComprobantePedidoPageComponent>;

  const checkoutServiceMock = {
    obtenerPedido: vi.fn(() => of({
      idPedido: 99,
      codigoPedido: 'PED-TEST',
      estadoActual: 'CREADO',
      modalidad: 'DELIVERY',
      tipoComprobante: 'BOLETA',
      subtotal: 50,
      descuentoTotal: 0,
      impuestoTotal: 9,
      total: 64,
      fechaCreacion: '2026-06-02T10:00:00'
    }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComprobantePedidoPageComponent],
      providers: [
        { provide: ClienteCheckoutService, useValue: checkoutServiceMock },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(new Map([['idPedido', '99']])) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComprobantePedidoPageComponent);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders the created order receipt', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(checkoutServiceMock.obtenerPedido).toHaveBeenCalledWith(99);
    expect(compiled.textContent).toContain('PED-TEST');
    expect(compiled.textContent).toContain('S/ 64.00');
  });
});
