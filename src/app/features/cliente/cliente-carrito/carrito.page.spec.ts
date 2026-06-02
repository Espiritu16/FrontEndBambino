import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { CarritoPageComponent } from './carrito.page';
import { CarritoResumen, ClienteCarritoService } from './cliente-carrito.service';

describe('CarritoPageComponent', () => {
  let fixture: ComponentFixture<CarritoPageComponent>;

  const carrito: CarritoResumen = {
    idCarrito: 10,
    estado: 'ABIERTO',
    subtotal: 50,
    descuentoTotal: 5,
    impuestoTotal: 8.1,
    costoDelivery: 0,
    total: 53.1,
    totalItems: 2,
    items: [
      {
        idCarritoItem: 20,
        idProducto: 7,
        nombreProducto: 'Pollo a la brasa',
        cantidad: 2,
        precioUnitario: 25,
        descuentoUnitario: 2.5,
        subtotal: 45,
        observacion: 'Sin ají',
        imagenUrl: 'https://cdn.example.com/pollo.webp'
      }
    ]
  };

  let carritoSubject: Subject<CarritoResumen>;

  const carritoServiceMock = {
    obtenerCarrito: vi.fn(() => carritoSubject.asObservable()),
    actualizarItem: vi.fn(() => of(carrito)),
    quitarItem: vi.fn(() => of({ ...carrito, items: [], totalItems: 0, subtotal: 0, total: 0 })),
    vaciarCarrito: vi.fn(() => of({ ...carrito, items: [], totalItems: 0, subtotal: 0, total: 0 }))
  };

  beforeEach(async () => {
    carritoSubject = new Subject<CarritoResumen>();

    await TestBed.configureTestingModule({
      imports: [CarritoPageComponent],
      providers: [
        provideRouter([]),
        { provide: ClienteCarritoService, useValue: carritoServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CarritoPageComponent);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders cart items and totals after loading the cart', async () => {
    fixture.detectChanges();
    carritoSubject.next(carrito);
    carritoSubject.complete();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(carritoServiceMock.obtenerCarrito).toHaveBeenCalled();
    expect(compiled.textContent).toContain('Pollo a la brasa');
    expect(compiled.textContent).toContain('Sin ají');
    expect(compiled.textContent).toContain('S/ 53.10');
    expect(compiled.querySelector('img[alt="Pollo a la brasa"]')?.getAttribute('src')).toBe('https://cdn.example.com/pollo.webp');
  });
});
