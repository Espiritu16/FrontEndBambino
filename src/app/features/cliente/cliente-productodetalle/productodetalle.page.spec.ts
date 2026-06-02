import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { ClienteCarritoService } from '../cliente-carrito/cliente-carrito.service';
import { ProductoDetallePageComponent } from './productodetalle.page';

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}

describe('ProductoDetallePageComponent', () => {
  let fixture: ComponentFixture<ProductoDetallePageComponent>;

  const carritoServiceMock = {
    agregarItem: vi.fn(() => of({
      idCarrito: 1,
      estado: 'ABIERTO',
      subtotal: 30,
      descuentoTotal: 0,
      impuestoTotal: 5.4,
      costoDelivery: 0,
      total: 35.4,
      totalItems: 1,
      items: []
    }))
  };

  beforeEach(async () => {
    localStorage.setItem('bambino_basic_auth', 'token-test');

    await TestBed.configureTestingModule({
      imports: [ProductoDetallePageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'carrito', component: DummyRouteComponent },
          { path: 'login', component: DummyRouteComponent }
        ]),
        { provide: ActivatedRoute, useValue: { paramMap: EMPTY } },
        { provide: ClienteCarritoService, useValue: carritoServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductoDetallePageComponent);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('adds the current product to the cart with quantity and observation', async () => {
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const component = fixture.componentInstance as unknown as {
      producto: { idProducto: number };
      cantidad: number;
      observacion: string;
      onAgregarPedidoClick(event: Event): Promise<void> | void;
    };

    component.producto = { idProducto: 15 };
    component.cantidad = 2;
    component.observacion = 'Sin cremas';

    await component.onAgregarPedidoClick(new Event('click'));

    expect(carritoServiceMock.agregarItem).toHaveBeenCalledWith({
      idProducto: 15,
      cantidad: 2,
      observacion: 'Sin cremas'
    });
    expect(navigateSpy).not.toHaveBeenCalledWith(['/carrito']);
  });

  it('opens the login modal when adding without an active session', async () => {
    localStorage.clear();
    const component = fixture.componentInstance as unknown as {
      producto: { idProducto: number };
      showLoginRequiredModal: boolean;
      onAgregarPedidoClick(event: Event): Promise<void> | void;
    };

    component.producto = { idProducto: 15 };

    await component.onAgregarPedidoClick(new Event('click'));

    expect(carritoServiceMock.agregarItem).not.toHaveBeenCalled();
    expect(component.showLoginRequiredModal).toBe(true);
  });
});
