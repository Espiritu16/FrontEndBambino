import {
  HttpClient,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
  HttpBackend
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { CacheService } from './cache.service';
import { CacheTag } from './cache-tags';
import { CACHE_TAGS, CACHE_TTL_MS, SKIP_HTTP_CACHE } from './cache-tokens';

const DEFAULT_TTL_MS = 3 * 60 * 1000;
const AUTH_STORAGE_KEY = 'bambino_basic_auth';
const USER_NAME_STORAGE_KEY = 'bambino_user_name';
const USER_ROLE_STORAGE_KEY = 'bambino_user_role';

const URL_RULES: { pattern: RegExp; ttlMs: number; tags: CacheTag[] }[] = [
  { pattern: /\/api\/public\/catalogo\/productos/i, ttlMs: 3 * 60 * 1000, tags: ['menu', 'promotions'] },
  { pattern: /\/api\/public\/catalogo\/categorias/i, ttlMs: 5 * 60 * 1000, tags: ['menu'] },
  { pattern: /\/api\/public\/configuracion\/media\//i, ttlMs: 5 * 60 * 1000, tags: ['media'] },
  { pattern: /\/api\/cliente\/carrito/i, ttlMs: 30 * 1000, tags: ['cart', 'checkout'] },
  { pattern: /\/api\/cliente\/pedidos/i, ttlMs: 30 * 1000, tags: ['orders'] },
  { pattern: /\/api\/cliente\/perfil/i, ttlMs: 10 * 60 * 1000, tags: ['profile'] },
  { pattern: /\/api\/cliente\/direcciones/i, ttlMs: 10 * 60 * 1000, tags: ['addresses'] },
  { pattern: /\/api\/auth\/yo/i, ttlMs: 2 * 60 * 1000, tags: ['profile'] }
];

export const cacheInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const cacheService = inject(CacheService);
  const backend = inject(HttpBackend);
  const router = inject(Router);

  if (req.context.get(SKIP_HTTP_CACHE)) {
    return next(req);
  }

  if (req.method !== 'GET') {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          const mutationTags = getMutationInvalidationTags(req.url);
          cacheService.invalidateByTags(mutationTags);
        }
      })
    );
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const cacheKey = `${req.method}|${req.urlWithParams}|${authHeader}`;
  const ttlMs = req.context.get(CACHE_TTL_MS) ?? resolveTtl(req.url);
  const tags = mergeTags(resolveTags(req.url), req.context.get(CACHE_TAGS));

  const cachedEntry = cacheService.get(cacheKey);
  if (cachedEntry) {
    revalidateInBackground(req, backend, cacheService, cacheKey, ttlMs, tags, router);
    return of(cachedEntry.response.clone());
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cacheService.set(cacheKey, event.clone(), ttlMs, tags);
      }
    })
  );
};

function revalidateInBackground(
  req: HttpRequest<unknown>,
  backend: HttpBackend,
  cacheService: CacheService,
  cacheKey: string,
  ttlMs: number,
  tags: CacheTag[],
  router: Router
): void {
  const rawHttp = new HttpClient(backend);

  rawHttp.request(req.clone()).subscribe({
    next: (event) => {
      if (event instanceof HttpResponse) {
        cacheService.set(cacheKey, event.clone(), ttlMs, tags);
      }
    },
    error: (error) => {
      const status = Number((error as { status?: number })?.status ?? 0);
      if (shouldForceLogout(req, status)) {
        clearSession();
        void router.navigate(['/inicio']);
      }
      // Preserve stale cache when background revalidation fails.
    }
  });
}

function resolveTtl(url: string): number {
  for (const rule of URL_RULES) {
    if (rule.pattern.test(url)) {
      return rule.ttlMs;
    }
  }
  return DEFAULT_TTL_MS;
}

function resolveTags(url: string): CacheTag[] {
  for (const rule of URL_RULES) {
    if (rule.pattern.test(url)) {
      return rule.tags;
    }
  }
  return [];
}

function mergeTags(defaultTags: CacheTag[], explicitTags: CacheTag[]): CacheTag[] {
  return Array.from(new Set([...defaultTags, ...explicitTags]));
}

function getMutationInvalidationTags(url: string): CacheTag[] {
  if (/\/api\/admin\/catalogo/i.test(url)) {
    return ['menu', 'promotions', 'catalog_admin'];
  }

  if (/\/api\/admin\/configuracion\/media/i.test(url)) {
    return ['media', 'promotions', 'menu'];
  }

  if (/\/api\/admin\/configuracion\/empresas/i.test(url)) {
    return ['store_status', 'company_admin'];
  }

  if (/\/api\/cliente\/carrito/i.test(url)) {
    return ['cart', 'checkout'];
  }

  if (/\/api\/cliente\/pedidos/i.test(url)) {
    return ['orders', 'cart', 'checkout'];
  }

  if (/\/api\/cliente\/perfil/i.test(url)) {
    return ['profile'];
  }

  if (/\/api\/cliente\/direcciones/i.test(url)) {
    return ['addresses', 'checkout'];
  }

  return [];
}

function shouldForceLogout(req: HttpRequest<unknown>, status: number): boolean {
  if (status !== 401 && status !== 403) {
    return false;
  }

  const authHeader = req.headers.get('Authorization')?.trim();
  if (!authHeader) {
    return false;
  }

  const storedToken = localStorage.getItem(AUTH_STORAGE_KEY)?.trim();
  if (!storedToken) {
    return false;
  }

  const expectedBasic = `Basic ${storedToken}`;
  return authHeader === expectedBasic || authHeader === `Bearer ${storedToken}`;
}

function clearSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_NAME_STORAGE_KEY);
  localStorage.removeItem(USER_ROLE_STORAGE_KEY);
}
