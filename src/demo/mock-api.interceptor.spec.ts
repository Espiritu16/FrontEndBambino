import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { firstValueFrom, Observable, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { almacenDemo } from './almacen-demo';
import { tokenBasico } from './demo.config';
import { mockApiInterceptor } from './mock-api.interceptor';

const BASE = 'http://localhost:8080';
const CABECERA_ADMIN = new HttpHeaders({ Authorization: `Basic ${tokenBasico('admin@bambino.demo', 'demo1234')}` });

/** `next` que falla el test si se le llama: nada debe salir a la red en la demo. */
function nextProhibido(): Observable<never> {
  return throwError(() => new Error('La petición salió a la red en lugar de ser interceptada'));
}

function ejecutar<T>(request: HttpRequest<unknown>): Promise<HttpResponse<T>> {
  return firstValueFrom(mockApiInterceptor(request, nextProhibido) as Observable<HttpResponse<T>>);
}

describe('mockApiInterceptor', () => {
  beforeEach(() => {
    almacenDemo.reiniciar();
  });

  it('devuelve la carta sin tocar la red', async () => {
    const respuesta = await ejecutar<unknown[]>(new HttpRequest('GET', `${BASE}/api/public/catalogo/productos`));

    expect(respuesta.status).toBe(200);
    expect((respuesta.body ?? []).length).toBeGreaterThan(0);
  });

  it('autentica con Basic y devuelve el rol', async () => {
    const respuesta = await ejecutar<{ rol: string }>(
      new HttpRequest('GET', `${BASE}/api/auth/yo`, { headers: CABECERA_ADMIN })
    );

    expect(respuesta.body?.rol).toBe('ADMIN');
  });

  it('devuelve 401 sin credenciales válidas', async () => {
    const peticion = ejecutar(new HttpRequest('GET', `${BASE}/api/auth/yo`));
    await expect(peticion).rejects.toMatchObject({ status: 401 });
  });

  it('resuelve un producto por slug', async () => {
    const respuesta = await ejecutar<{ idProducto: number }>(
      new HttpRequest('GET', `${BASE}/api/public/catalogo/productos/slug/medio-pollo-a-la-brasa`)
    );

    expect(respuesta.body?.idProducto).toBe(2);
  });

  it('agrega al carrito y lo refleja en el listado', async () => {
    await ejecutar(new HttpRequest('POST', `${BASE}/api/cliente/carrito/items`, { idProducto: 12, cantidad: 2 }));
    const respuesta = await ejecutar<unknown[]>(new HttpRequest('GET', `${BASE}/api/cliente/carrito`));

    expect(respuesta.body).toHaveLength(1);
  });

  it('lista los pedidos del panel administrativo', async () => {
    const respuesta = await ejecutar<unknown[]>(
      new HttpRequest('GET', `${BASE}/api/admin/pedidos`, { headers: CABECERA_ADMIN })
    );

    expect((respuesta.body ?? []).length).toBeGreaterThan(0);
  });

  it('entrega las exportaciones como archivo', async () => {
    const respuesta = await ejecutar<Blob>(
      new HttpRequest('GET', `${BASE}/api/admin/pedidos/exportar-excel`, { headers: CABECERA_ADMIN })
    );

    expect(respuesta.body).toBeInstanceOf(Blob);
  });

  it('propaga como error HTTP las reglas del almacén', async () => {
    const peticion = ejecutar(
      new HttpRequest('PATCH', `${BASE}/api/admin/pedidos/1/estado`, { estado: 'EN_CAMINO' }, { headers: CABECERA_ADMIN })
    );

    await expect(peticion).rejects.toMatchObject({ status: 409 });
  });

  it('devuelve 404 en una ruta no cubierta, sin salir a la red', async () => {
    const peticion = ejecutar(new HttpRequest('GET', `${BASE}/api/ruta/inexistente`));

    await expect(peticion).rejects.toBeInstanceOf(HttpErrorResponse);
    await expect(peticion).rejects.toMatchObject({ status: 404 });
  });
});
