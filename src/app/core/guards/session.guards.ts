import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

const AUTH_STORAGE_KEY = 'bambino_basic_auth';
const USER_ROLE_STORAGE_KEY = 'bambino_user_role';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem(AUTH_STORAGE_KEY)?.trim();
  if (token) return true;
  return router.createUrlTree(['/inicio']);
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem(AUTH_STORAGE_KEY)?.trim();
  if (!token) return router.createUrlTree(['/inicio']);

  const role = (localStorage.getItem(USER_ROLE_STORAGE_KEY) ?? '').trim().toUpperCase();
  if (isAdminRole(role)) return true;
  return router.createUrlTree(['/inicio']);
};

function isAdminRole(role: string): boolean {
  if (!role) return false;
  return role === 'ADMIN'
    || role === 'ROLE_ADMIN'
    || role === 'ADMINISTRADOR'
    || role.includes('ADMIN');
}
