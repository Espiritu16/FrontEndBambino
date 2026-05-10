import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';

type PerfilResponse = {
  idCliente: number;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string | null;
  docTipo: string;
  docNumero: string;
};

type AuthYoResponse = {
  usuario?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string | null;
};

@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.page.html',
  styleUrl: './perfil.page.scss'
})
export class PerfilPageComponent implements OnInit {
  private readonly apiBaseUrl = 'https://backendbambino.onrender.com';
  private readonly authStorageKey = 'bambino_basic_auth';
  private readonly userNameStorageKey = 'bambino_user_name';
  private readonly userRoleStorageKey = 'bambino_user_role';
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected loading = false;
  protected error = '';
  protected activeSection: 'perfil' | 'seguridad' = 'perfil';

  protected profileName = '';
  protected profileFirstName = '';
  protected profileLastName = '';
  protected profileEmail = '';
  protected profilePhone = '';
  protected docTipo = 'DNI';
  protected docNumero = '';
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  protected showCurrentPassword = false;
  protected showNewPassword = false;
  protected showConfirmPassword = false;
  protected changingPassword = false;
  protected securityErrors: Record<string, string> = {};
  protected isEditMode = false;
  protected fieldErrors: Record<string, string> = {};
  private originalSnapshot = '';

  ngOnInit(): void {
    this.hidratarSidebarDesdeSesion();
    this.route.queryParamMap.subscribe((params) => {
      this.activeSection = params.get('tab') === 'seguridad' ? 'seguridad' : 'perfil';
    });
    void this.loadAll();
  }

  protected async loadAll(): Promise<void> {
    this.loading = true;
    this.error = '';
    const headers = this.authHeaders();
    let authYo: AuthYoResponse | null = null;
    try {
      authYo = await firstValueFrom(this.http.get<AuthYoResponse>(`${this.apiBaseUrl}/api/auth/yo`, { headers }).pipe(timeout(10000)));
      const nombres = (authYo.nombres ?? '').trim();
      const apellidos = (authYo.apellidos ?? '').trim();
      const fullName = `${nombres} ${apellidos}`.trim();
      this.profileName = fullName || 'Cliente';
      this.profileFirstName = nombres;
      this.profileLastName = apellidos;
      this.profileEmail = authYo.usuario ?? '';
      this.profilePhone = authYo.telefono?.trim() || '';
    } catch {
      // Mantener datos desde sesión local si auth/yo falla.
    }

    try {
      const perfil = await firstValueFrom(this.http.get<PerfilResponse>(`${this.apiBaseUrl}/api/cliente/perfil`, { headers }).pipe(timeout(10000)));
      this.profileFirstName = (perfil.nombres ?? this.profileFirstName ?? '').trim();
      this.profileLastName = (perfil.apellidos ?? this.profileLastName ?? '').trim();
      const fullName = `${this.profileFirstName} ${this.profileLastName}`.trim();
      this.profileName = fullName || this.profileName;
      this.profileEmail = (perfil.correo ?? this.profileEmail ?? '').trim();
      this.profilePhone = (perfil.telefono ?? this.profilePhone ?? '').trim();
      this.docTipo = (perfil.docTipo || 'DNI').toUpperCase();
      this.docNumero = perfil.docNumero || '';
      this.originalSnapshot = this.buildSnapshot();
      this.fieldErrors = {};
    } catch {
      this.error = 'No se pudo cargar la información del perfil.';
    } finally {
      this.loading = false;
    }
  }

  protected async saveProfile(): Promise<void> {
    if (!this.isEditMode) {
      this.toast.info('Primero debes presionar "Editar".');
      return;
    }
    this.error = '';
    this.fieldErrors = {};
    const frontendError = this.validateForm();
    if (frontendError) {
      this.toast.warning(frontendError);
      return;
    }
    if (this.buildSnapshot() === this.originalSnapshot) {
      this.toast.info('No se detectaron cambios para guardar.');
      return;
    }
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiBaseUrl}/api/cliente/perfil/datos-personales`,
          { nombres: this.profileFirstName, apellidos: this.profileLastName, telefono: this.profilePhone },
          { headers: this.authHeaders() }
        ).pipe(timeout(10000))
      );
      await firstValueFrom(
        this.http.patch<PerfilResponse>(
          `${this.apiBaseUrl}/api/cliente/perfil/documento`,
          { docTipo: this.docTipo, docNumero: this.docNumero },
          { headers: this.authHeaders() }
        ).pipe(timeout(10000))
      );
      const fullName = `${this.profileFirstName ?? ''} ${this.profileLastName ?? ''}`.trim();
      this.profileName = fullName || this.profileName;
      localStorage.setItem('bambino_user_name', this.profileName);
      this.originalSnapshot = this.buildSnapshot();
      this.isEditMode = false;
      this.toast.success('Información actualizada correctamente.');
    } catch (error) {
      this.applyBackendErrors(error as HttpErrorResponse);
      this.error = 'No se pudo guardar la información del perfil.';
    }
  }

  protected enableEditMode(): void {
    this.isEditMode = true;
    this.fieldErrors = {};
  }

  protected cancelEditMode(): void {
    this.isEditMode = false;
    this.fieldErrors = {};
    void this.loadAll();
  }

  protected goToProfile(): void {
    this.activeSection = 'perfil';
    void this.router.navigate(['/perfil'], { queryParams: { tab: 'perfil' } });
  }

  protected goToAddresses(): void {
    void this.router.navigate(['/direcciones']);
  }

  protected goToSecurity(): void {
    this.activeSection = 'seguridad';
    void this.router.navigate(['/perfil'], { queryParams: { tab: 'seguridad' } });
  }

  protected goToOrders(): void {
    void this.router.navigate(['/mis-pedidos']);
  }

  protected logout(): void {
    localStorage.removeItem(this.authStorageKey);
    localStorage.removeItem('bambino_user_name');
    localStorage.removeItem(this.userRoleStorageKey);
    void this.router.navigate(['/inicio']);
  }

  protected async updatePassword(): Promise<void> {
    this.error = '';
    this.securityErrors = {};

    const frontendError = this.validateSecurityForm();
    if (frontendError) {
      this.toast.warning(frontendError);
      return;
    }

    this.changingPassword = true;
    try {
      const response = await firstValueFrom(
        this.http.patch(
          `${this.apiBaseUrl}/api/cliente/perfil/password`,
          {
            passwordActual: this.currentPassword,
            passwordNueva: this.newPassword,
            passwordConfirmacion: this.confirmPassword
          },
          { headers: this.authHeaders(), responseType: 'text' }
        ).pipe(timeout(10000))
      );
      if ((response || '').toLowerCase().includes('actualizada')) {
        this.toast.success('Contraseña actualizada correctamente.');
      } else {
        this.toast.success('Contraseña actualizada.');
      }
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.securityErrors = {};
      localStorage.removeItem(this.authStorageKey);
      localStorage.removeItem(this.userNameStorageKey);
      localStorage.removeItem(this.userRoleStorageKey);
      this.toast.info('Por seguridad, vuelve a iniciar sesión con tu nueva contraseña.');
      void this.router.navigate(['/inicio']);
    } catch (error) {
      this.applySecurityBackendErrors(error as HttpErrorResponse);
      this.toast.error(this.securityErrors['general'] || 'No se pudo actualizar la contraseña.');
    } finally {
      this.changingPassword = false;
    }
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey)?.trim() ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  private hidratarSidebarDesdeSesion(): void {
    const nombre = localStorage.getItem(this.userNameStorageKey)?.trim();
    if (nombre) {
      this.profileName = nombre;
    }
  }

  private buildSnapshot(): string {
    return JSON.stringify({
      nombres: (this.profileFirstName || '').trim(),
      apellidos: (this.profileLastName || '').trim(),
      telefono: (this.profilePhone || '').trim(),
      docTipo: (this.docTipo || '').trim().toUpperCase(),
      docNumero: (this.docNumero || '').trim()
    });
  }

  private validateForm(): string | null {
    const nombres = (this.profileFirstName || '').trim();
    const apellidos = (this.profileLastName || '').trim();
    const telefono = (this.profilePhone || '').trim();
    const docNumero = (this.docNumero || '').trim();
    const docTipo = (this.docTipo || '').trim().toUpperCase();

    if (!nombres) {
      this.fieldErrors['nombres'] = 'Nombres es obligatorio.';
    } else if (nombres.length > 120) {
      this.fieldErrors['nombres'] = 'Nombres excede longitud.';
    }

    if (!apellidos) {
      this.fieldErrors['apellidos'] = 'Apellidos es obligatorio.';
    } else if (apellidos.length > 120) {
      this.fieldErrors['apellidos'] = 'Apellidos excede longitud.';
    }

    if (telefono && !/^[0-9+\-\s]{7,20}$/.test(telefono)) {
      this.fieldErrors['telefono'] = 'Teléfono inválido.';
    }

    if (!docNumero) {
      this.fieldErrors['docNumero'] = 'Número de documento es obligatorio.';
    } else if (docTipo === 'DNI' && !/^\d{8}$/.test(docNumero)) {
      this.fieldErrors['docNumero'] = 'DNI debe tener 8 dígitos.';
    } else if (docTipo === 'RUC' && !/^\d{11}$/.test(docNumero)) {
      this.fieldErrors['docNumero'] = 'RUC debe tener 11 dígitos.';
    } else if (docTipo === 'CE' && docNumero.length < 6) {
      this.fieldErrors['docNumero'] = 'CE debe tener al menos 6 caracteres.';
    }

    return Object.values(this.fieldErrors)[0] ?? null;
  }

  private validateSecurityForm(): string | null {
    const currentPassword = (this.currentPassword || '').trim();
    const newPassword = (this.newPassword || '').trim();
    const confirmPassword = (this.confirmPassword || '').trim();

    if (!currentPassword) this.securityErrors['passwordActual'] = 'La contraseña actual es obligatoria.';
    else if (currentPassword.length < 8) this.securityErrors['passwordActual'] = 'La contraseña actual debe tener al menos 8 caracteres.';

    if (!newPassword) this.securityErrors['passwordNueva'] = 'La nueva contraseña es obligatoria.';
    else if (newPassword.length < 8) this.securityErrors['passwordNueva'] = 'La nueva contraseña debe tener al menos 8 caracteres.';

    if (!confirmPassword) this.securityErrors['passwordConfirmacion'] = 'Debes confirmar la nueva contraseña.';
    else if (confirmPassword.length < 8) this.securityErrors['passwordConfirmacion'] = 'La confirmación debe tener al menos 8 caracteres.';

    if (currentPassword && newPassword && currentPassword === newPassword) {
      this.securityErrors['passwordNueva'] = 'La nueva contraseña debe ser diferente a la actual.';
    }
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      this.securityErrors['passwordConfirmacion'] = 'La confirmación no coincide con la nueva contraseña.';
    }

    return Object.values(this.securityErrors)[0] ?? null;
  }

  private applyBackendErrors(error: HttpErrorResponse): void {
    const detalles = error.error?.detalles as Array<{ campo?: string; mensaje?: string }> | undefined;
    if (!detalles || !Array.isArray(detalles)) return;
    for (const d of detalles) {
      if (!d?.campo || !d?.mensaje) continue;
      this.fieldErrors[d.campo] = d.mensaje;
    }
  }

  private applySecurityBackendErrors(error: HttpErrorResponse): void {
    const detalle = (error.error?.mensaje as string | undefined)?.trim();
    const detalles = error.error?.detalles as Array<{ campo?: string; mensaje?: string }> | undefined;

    if (Array.isArray(detalles) && detalles.length > 0) {
      for (const d of detalles) {
        if (!d?.campo || !d?.mensaje) continue;
        this.securityErrors[d.campo] = d.mensaje;
      }
      if (!this.securityErrors['general']) {
        this.securityErrors['general'] = Object.values(this.securityErrors)[0] ?? 'No se pudo actualizar la contraseña.';
      }
      return;
    }

    if (detalle) {
      if (detalle.includes("passwordActual")) {
        this.securityErrors['passwordActual'] = 'La contraseña actual es incorrecta.';
      } else if (detalle.includes("passwordConfirmacion")) {
        this.securityErrors['passwordConfirmacion'] = 'La confirmación no coincide con la nueva contraseña.';
      } else if (detalle.includes("passwordNueva")) {
        this.securityErrors['passwordNueva'] = 'La nueva contraseña no es válida.';
      }
      this.securityErrors['general'] = detalle;
      return;
    }

    this.securityErrors['general'] = 'No se pudo actualizar la contraseña.';
  }
}
