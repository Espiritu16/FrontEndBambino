import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

const AUTH_STORAGE_KEY = 'bambino_basic_auth';
const USER_NAME_STORAGE_KEY = 'bambino_user_name';
const USER_ROLE_STORAGE_KEY = 'bambino_user_role';

export const authSessionInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const httpError = error as HttpErrorResponse;

      if (shouldForceLogout(req, httpError)) {
        clearSession();
        void router.navigate(['/inicio']);
      }

      return throwError(() => error);
    })
  );
};

function shouldForceLogout(req: HttpRequest<unknown>, error: HttpErrorResponse): boolean {
  if (!error || (error.status !== 401 && error.status !== 403)) {
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
