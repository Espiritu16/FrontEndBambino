import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ClienteCarritoService } from '../cliente-carrito/cliente-carrito.service';
import { OfertasPageComponent } from './ofertas.page';

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}

describe('OfertasPageComponent', () => {
  let fixture: ComponentFixture<OfertasPageComponent>;

  const carritoServiceMock = {
    agregarItem: vi.fn(() => of({
      idCarrito: 1,
      estado: 'ABIERTO',
      subtotal: 16,
      descuentoTotal: 0,
      impuestoTotal: 2.88,
      costoDelivery: 0,
      total: 18.88,
      totalItems: 1,
      items: []
    }))
  };

  beforeEach(async () => {
    localStorage.setItem('bambino_basic_auth', 'token-test');

    await TestBed.configureTestingModule({
      imports: [OfertasPageComponent],
      providers: [
        provideRouter([
          { path: 'carrito', component: DummyRouteComponent },
          { path: 'login', component: DummyRouteComponent }
        ]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(new Map()) } },
        { provide: ClienteCarritoService, useValue: carritoServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OfertasPageComponent);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('adds the selected promotion product to the cart', async () => {
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const component = fixture.componentInstance as unknown as {
      onAgregarClick(event: Event, producto: { idProducto: number }): Promise<void> | void;
    };

    await component.onAgregarClick(new Event('click'), { idProducto: 4 });

    expect(carritoServiceMock.agregarItem).toHaveBeenCalledWith({
      idProducto: 4,
      cantidad: 1,
      observacion: null
    });
    expect(navigateSpy).not.toHaveBeenCalledWith(['/carrito']);
  });

  it('opens the login modal when adding without an active session', async () => {
    localStorage.clear();
    const component = fixture.componentInstance as unknown as {
      showLoginRequiredModal: boolean;
      onAgregarClick(event: Event, producto: { idProducto: number }): Promise<void> | void;
    };

    await component.onAgregarClick(new Event('click'), { idProducto: 4 });

    expect(carritoServiceMock.agregarItem).not.toHaveBeenCalled();
    expect(component.showLoginRequiredModal).toBe(true);
  });
});
