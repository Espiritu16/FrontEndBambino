import { HttpRequest } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolverPeticionDemo } from './mock-api.interceptor';

/**
 * Desvía las llamadas hechas con `fetch` hacia los datos de la demo.
 *
 * Algunas páginas (cobertura de delivery, checkout y direcciones) no usan
 * `HttpClient` sino `fetch` directo, así que ni el interceptor ni el
 * `HttpBackend` sustituido las alcanzan: sin esto salían de verdad a la red.
 *
 * Se desvían dos destinos:
 *  - la API del sistema, que se resuelve contra el almacén en memoria;
 *  - el geocodificador público, que se responde con una dirección ficticia
 *    para no depender de un servicio externo.
 *
 * El resto (por ejemplo el GeoJSON del propio sitio o los mosaicos del mapa)
 * sigue su camino normal.
 */
export function instalarParcheFetch(): void {
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (entrada: RequestInfo | URL, opciones?: RequestInit): Promise<Response> => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const metodo = (opciones?.method ?? (entrada instanceof Request ? entrada.method : 'GET')).toUpperCase();

    if (url.includes('/api/')) {
      try {
        const cuerpo = opciones?.body ? JSON.parse(String(opciones.body)) : null;
        const respuesta: any = await firstValueFrom(
          resolverPeticionDemo(new HttpRequest(metodo as 'GET', url, cuerpo)) as never
        );
        return new Response(JSON.stringify(respuesta?.body ?? null), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        const status = Number(error?.status ?? 500);
        return new Response(JSON.stringify(error?.error ?? { mensaje: 'Error en la demo' }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.includes('nominatim.openstreetmap.org')) {
      return new Response(
        JSON.stringify({
          display_name: 'Av. Los Próceres 1450, Lima (dirección de demostración)',
          address: {
            road: 'Av. Los Próceres',
            house_number: '1450',
            suburb: 'Villa Esperanza',
            city: 'Lima',
            country: 'Perú',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return originalFetch(entrada as RequestInfo, opciones);
  };
}
