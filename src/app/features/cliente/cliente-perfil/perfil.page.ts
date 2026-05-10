import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
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

type PerfilInternoResponse = {
  idUsuario: number;
  email?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string | null;
  rol?: string;
  estado?: string;
};

type AuthYoResponse = {
  usuario?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string | null;
  rol?: string;
  role?: string;
  roles?: Array<{ nombre?: string; role?: string } | string>;
};

type DocumentoResponse = {
  idDocumento: number;
  docTipo: string;
  docNumero: string;
  esPrincipal: boolean;
  activo: boolean;
};

const DOC_TYPES = ['DNI', 'RUC', 'CE'] as const;
type DocType = (typeof DOC_TYPES)[number];

@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
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
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

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
  protected documentos: DocumentoResponse[] = [];
  protected newDocTipo = 'DNI';
  protected newDocNumero = '';
  protected docActionLoading = false;
  protected isAdminUser = false;
  private originalSnapshot = '';

  ngOnInit(): void {
    this.hidratarSidebarDesdeSesion();
    this.route.queryParamMap.subscribe((params) => {
      this.activeSection = params.get('tab') === 'seguridad' ? 'seguridad' : 'perfil';
    });
    void this.loadAll();
  }

  protected async loadAll(): Promise<void> {
    const loadingStartedAt = Date.now();
    this.loading = true;
    this.error = '';
    scheduleUiRefresh(this.ngZone, this.cdr);
    const headers = this.authHeaders();
    let authYo: AuthYoResponse | null = null;
    try {
      authYo = await firstValueFrom(this.http.get<AuthYoResponse>(`${this.apiBaseUrl}/api/auth/yo`, { headers }).pipe(timeout(10000)));
      this.isAdminUser = this.resolveIsAdmin(authYo);
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
      this.isAdminUser = this.resolveIsAdmin();
    }

    if (this.isAdminUser) {
      try {
        const perfilInterno = await firstValueFrom(
          this.http.get<PerfilInternoResponse>(`${this.apiBaseUrl}/api/seguridad/perfil`, { headers }).pipe(timeout(10000))
        );
        this.profileFirstName = (perfilInterno.nombres ?? this.profileFirstName ?? '').trim();
        this.profileLastName = (perfilInterno.apellidos ?? this.profileLastName ?? '').trim();
        this.profileEmail = (perfilInterno.email ?? this.profileEmail ?? '').trim();
        this.profilePhone = (perfilInterno.telefono ?? this.profilePhone ?? '').trim();
        const fullName = `${this.profileFirstName} ${this.profileLastName}`.trim();
        this.profileName = fullName || this.profileName;
        this.documentos = [];
        this.docTipo = 'DNI';
        this.docNumero = '';
        this.originalSnapshot = this.buildSnapshot();
        this.fieldErrors = {};
      } catch {
        this.error = 'No se pudo cargar la información del perfil.';
      } finally {
        this.loading = false;
        if (Date.now() - loadingStartedAt > 12000 && !this.error) {
          this.error = 'La carga demoró demasiado. Intenta nuevamente.';
        }
        scheduleUiRefresh(this.ngZone, this.cdr);
      }
      return;
    }

    try {
      const [perfil, docs] = await Promise.all([
        firstValueFrom(this.http.get<PerfilResponse>(`${this.apiBaseUrl}/api/cliente/perfil`, { headers }).pipe(timeout(10000))),
        this.fetchDocumentos()
      ]);
      this.profileFirstName = (perfil.nombres ?? this.profileFirstName ?? '').trim();
      this.profileLastName = (perfil.apellidos ?? this.profileLastName ?? '').trim();
      const fullName = `${this.profileFirstName} ${this.profileLastName}`.trim();
      this.profileName = fullName || this.profileName;
      this.profileEmail = (perfil.correo ?? this.profileEmail ?? '').trim();
      this.profilePhone = (perfil.telefono ?? this.profilePhone ?? '').trim();
      this.documentos = docs ?? [];
      this.syncNewDocumentoTipo();
      const principal = this.documentos.find((d) => d.esPrincipal);
      this.docTipo = (principal?.docTipo || perfil.docTipo || 'DNI').toUpperCase();
      this.docNumero = principal?.docNumero || perfil.docNumero || '';
      this.originalSnapshot = this.buildSnapshot();
      this.fieldErrors = {};
    } catch {
      this.error = 'No se pudo cargar la información del perfil.';
    } finally {
      this.loading = false;
      if (Date.now() - loadingStartedAt > 12000 && !this.error) {
        this.error = 'La carga demoró demasiado. Intenta nuevamente.';
      }
      scheduleUiRefresh(this.ngZone, this.cdr);
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
      if (this.isAdminUser) {
        await firstValueFrom(
          this.http.patch<PerfilInternoResponse>(
            `${this.apiBaseUrl}/api/seguridad/perfil/datos-personales`,
            {
              email: this.profileEmail,
              nombres: this.profileFirstName,
              apellidos: this.profileLastName,
              telefono: this.profilePhone
            },
            { headers: this.authHeaders() }
          ).pipe(timeout(10000))
        );
      } else {
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
      }
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
    if (this.isAdminUser) return;
    void this.router.navigate(['/direcciones']);
  }

  protected goToSecurity(): void {
    this.activeSection = 'seguridad';
    void this.router.navigate(['/perfil'], { queryParams: { tab: 'seguridad' } });
  }

  protected goToOrders(): void {
    if (this.isAdminUser) return;
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
      const endpoint = this.isAdminUser
        ? `${this.apiBaseUrl}/api/seguridad/perfil/password`
        : `${this.apiBaseUrl}/api/cliente/perfil/password`;
      const response = await firstValueFrom(
        this.http.patch(
          endpoint,
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

  protected async addDocumento(): Promise<void> {
    const docTipo = (this.newDocTipo || '').trim().toUpperCase();
    const docNumero = (this.newDocNumero || '').trim().toUpperCase();
    if (this.existsDocTipoActivo(docTipo)) {
      this.toast.warning(`Ya tienes un documento de tipo ${docTipo}.`);
      return;
    }
    const error = this.validateDocByType(docTipo, docNumero);
    if (error) {
      this.toast.warning(error);
      return;
    }
    this.docActionLoading = true;
    try {
      await firstValueFrom(
        this.http.post<DocumentoResponse>(
          `${this.apiBaseUrl}/api/cliente/perfil/documentos`,
          { docTipo, docNumero },
          { headers: this.authHeaders() }
        ).pipe(timeout(10000))
      );
      this.newDocNumero = '';
      await this.loadDocumentos();
      this.toast.success('Documento agregado.');
    } catch (errorResponse) {
      const msg = (errorResponse as HttpErrorResponse)?.error?.mensaje || 'No se pudo agregar el documento.';
      this.toast.error(msg);
    } finally {
      this.docActionLoading = false;
    }
  }

  protected async setDocumentoPrincipal(idDocumento: number): Promise<void> {
    this.docActionLoading = true;
    try {
      await firstValueFrom(
        this.http.patch<DocumentoResponse>(
          `${this.apiBaseUrl}/api/cliente/perfil/documentos/${idDocumento}/principal`,
          {},
          { headers: this.authHeaders() }
        ).pipe(timeout(10000))
      );
      await this.loadAll();
      this.toast.success('Documento principal actualizado.');
    } catch (errorResponse) {
      const msg = (errorResponse as HttpErrorResponse)?.error?.mensaje || 'No se pudo actualizar el documento principal.';
      this.toast.error(msg);
    } finally {
      this.docActionLoading = false;
    }
  }

  protected async removeDocumento(idDocumento: number): Promise<void> {
    this.docActionLoading = true;
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiBaseUrl}/api/cliente/perfil/documentos/${idDocumento}`,
          { headers: this.authHeaders() }
        ).pipe(timeout(10000))
      );
      await this.loadAll();
      this.toast.success('Documento eliminado.');
    } catch (errorResponse) {
      const msg = (errorResponse as HttpErrorResponse)?.error?.mensaje || 'No se pudo eliminar el documento.';
      this.toast.error(msg);
    } finally {
      this.docActionLoading = false;
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
    if (this.isAdminUser) {
      return JSON.stringify({
        email: (this.profileEmail || '').trim().toLowerCase(),
        nombres: (this.profileFirstName || '').trim(),
        apellidos: (this.profileLastName || '').trim(),
        telefono: (this.profilePhone || '').trim()
      });
    }
    return JSON.stringify({
      nombres: (this.profileFirstName || '').trim(),
      apellidos: (this.profileLastName || '').trim(),
      telefono: (this.profilePhone || '').trim(),
      docTipo: (this.docTipo || '').trim().toUpperCase(),
      docNumero: (this.docNumero || '').trim()
    });
  }

  private validateForm(): string | null {
    const email = (this.profileEmail || '').trim();
    const nombres = (this.profileFirstName || '').trim();
    const apellidos = (this.profileLastName || '').trim();
    const telefono = (this.profilePhone || '').trim();
    const docNumero = (this.docNumero || '').trim();
    const docTipo = (this.docTipo || '').trim().toUpperCase();

    if (this.isAdminUser) {
      if (!email) {
        this.fieldErrors['email'] = 'Correo es obligatorio.';
      } else if (email.length > 190) {
        this.fieldErrors['email'] = 'Correo excede longitud.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.fieldErrors['email'] = 'Correo inválido.';
      }
    }

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

    if (!this.isAdminUser) {
      if (!docNumero) {
        this.fieldErrors['docNumero'] = 'Número de documento es obligatorio.';
      } else {
        const docError = this.validateDocByType(docTipo, docNumero);
        if (docError) {
          this.fieldErrors['docNumero'] = docError;
        } else {
          const principalActual = this.documentos.find((d) => d.esPrincipal);
          const editandoMismoPrincipal =
            !!principalActual &&
            (principalActual.docTipo || '').toUpperCase() === docTipo &&
            (principalActual.docNumero || '').toUpperCase() === docNumero.toUpperCase();
          if (!editandoMismoPrincipal && this.existsDocTipoActivo(docTipo)) {
            this.fieldErrors['docTipo'] = `Ya existe un documento ${docTipo} para tu perfil.`;
          }
        }
      }
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

  private async loadDocumentos(): Promise<void> {
    try {
      const docs = await this.fetchDocumentos();
      this.documentos = docs ?? [];
      this.syncNewDocumentoTipo();
      const principal = this.documentos.find((d) => d.esPrincipal);
      if (principal && !this.isEditMode) {
        this.docTipo = (principal.docTipo || this.docTipo || 'DNI').toUpperCase();
        this.docNumero = principal.docNumero || '';
        this.originalSnapshot = this.buildSnapshot();
      }
    } catch {
      this.documentos = [];
      this.syncNewDocumentoTipo();
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  private async fetchDocumentos(): Promise<DocumentoResponse[]> {
    return await firstValueFrom(
      this.http.get<DocumentoResponse[]>(
        `${this.apiBaseUrl}/api/cliente/perfil/documentos`,
        { headers: this.authHeaders() }
      ).pipe(timeout(10000))
    );
  }

  private validateDocByType(docTipo: string, docNumero: string): string | null {
    if (docTipo === 'DNI' && !/^\d{8}$/.test(docNumero)) return 'DNI debe tener 8 dígitos.';
    if (docTipo === 'RUC' && !/^\d{11}$/.test(docNumero)) return 'RUC debe tener 11 dígitos.';
    if (docTipo === 'CE' && !/^[A-Za-z0-9]{9,12}$/.test(docNumero)) return 'CE debe tener entre 9 y 12 caracteres.';
    return null;
  }

  protected existsDocTipoActivo(docTipo: string): boolean {
    const normalized = (docTipo || '').trim().toUpperCase();
    return this.documentos.some((d) => (d.docTipo || '').trim().toUpperCase() === normalized && d.activo);
  }

  protected get canAddMoreDocumentos(): boolean {
    return this.availableDocTypes.length > 0;
  }

  protected get availableDocTypes(): DocType[] {
    return DOC_TYPES.filter((type) => !this.existsDocTipoActivo(type));
  }

  private syncNewDocumentoTipo(): void {
    const available = this.availableDocTypes;
    if (available.length === 0) return;
    if (!available.includes((this.newDocTipo || '').toUpperCase() as DocType)) {
      this.newDocTipo = available[0];
    }
  }

  private resolveIsAdmin(authYo?: AuthYoResponse | null): boolean {
    const fromStorage = localStorage.getItem(this.userRoleStorageKey);
    const directRole = (authYo?.rol ?? authYo?.role ?? '').toString().trim().toUpperCase();
    if (this.isAdminRole(directRole)) return true;

    const roles = authYo?.roles;
    if (Array.isArray(roles)) {
      for (const role of roles) {
        const value = (typeof role === 'string' ? role : role?.nombre ?? role?.role ?? '').toString().trim().toUpperCase();
        if (this.isAdminRole(value)) return true;
      }
    }
    return this.isAdminRole((fromStorage ?? '').trim().toUpperCase());
  }

  private isAdminRole(role: string): boolean {
    if (!role) return false;
    return role === 'ADMIN'
      || role === 'ROLE_COCINA'
      || role === 'COCINA'
      || role === 'ROLE_ADMIN'
      || role === 'ADMINISTRADOR'
      || role.includes('ADMIN')
      || role.includes('COCINA');
  }
}
