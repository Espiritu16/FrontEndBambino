import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HttpBackend, provideHttpClient, withInterceptors } from '@angular/common/http';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { cacheInterceptor } from './core/http/cache.interceptor';
import { authSessionInterceptor } from './core/http/auth-session.interceptor';
import { mockApiInterceptor } from '../demo/mock-api.interceptor';
import { BackendDemo } from '../demo/backend-demo';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // `mockApiInterceptor` va primero: resuelve toda la API contra datos en memoria
    // y ninguna petición llega a salir a la red. Sólo existe en la rama `demo`.
    provideHttpClient(withInterceptors([mockApiInterceptor, authSessionInterceptor, cacheInterceptor])),
    // Algunas partes de la app crean su propio HttpClient(HttpBackend) y se saltan
    // los interceptores: sustituyendo el backend, nada puede salir a la red.
    { provide: HttpBackend, useClass: BackendDemo },
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      })
    )
  ]
};
