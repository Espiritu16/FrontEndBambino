import { HttpBackend, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { resolverPeticionDemo } from './mock-api.interceptor';

/**
 * Sustituye el transporte HTTP de Angular por el almacén de la demo.
 *
 * El interceptor cubre la cadena habitual, pero partes de la aplicación (por
 * ejemplo la revalidación en segundo plano de `cache.interceptor`) construyen su
 * propio `HttpClient(HttpBackend)` y se saltan los interceptores. Reemplazando
 * el backend, ninguna petición puede llegar a la red por ningún camino.
 */
@Injectable()
export class BackendDemo implements HttpBackend {
  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return resolverPeticionDemo(request);
  }
}
