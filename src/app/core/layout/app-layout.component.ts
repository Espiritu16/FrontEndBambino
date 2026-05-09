import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

type RegisterFieldErrors = {
  email?: string;
  nombres?: string;
  apellidos?: string;
  docNumero?: string;
  telefono?: string;
  password?: string;
  confirmPassword?: string;
};

type ConfiguracionMediaPublicResponse = {
  clave: string;
  url: string;
  activa: boolean;
};

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, FormsModule, ConfirmModalComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss'
})
export class AppLayoutComponent implements OnInit {
  private readonly apiBaseUrl = 'http://localhost:8080';
  private readonly authStorageKey = 'bambino_basic_auth';
  private readonly userNameStorageKey = 'bambino_user_name';
  private readonly userRoleStorageKey = 'bambino_user_role';
  private readonly registerDraftStorageKey = 'bambino_register_draft';
  private readonly cartaPdfCacheKey = 'bambino_carta_pdf_url';
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly currentYear = new Date().getFullYear();
  protected isMobileMenuOpen = false;
  protected isLoginModalOpen = false;
  protected isLogoutConfirmOpen = false;
  protected isAuthenticated = false;
  protected isAdmin = false;
  protected displayName = '';
  protected modalView: 'login' | 'forgot' | 'register' = 'login';
  protected forgotStep: 'request' | 'code' | 'reset' | 'done' = 'request';

  protected loginEmail = '';
  protected loginPassword = '';
  protected showLoginPassword = false;
  protected loginError = '';
  protected loginLoading = false;

  protected forgotEmail = '';
  protected forgotCode = '';
  protected readonly recoveryCodeIndexes = [0, 1, 2, 3, 4, 5];
  protected recoveryCodeDigits = ['', '', '', '', '', ''];
  protected forgotNewPassword = '';
  protected forgotConfirmPassword = '';
  protected showForgotNewPassword = false;
  protected showForgotConfirmPassword = false;
  protected forgotError = '';
  protected forgotSuccess = '';
  protected forgotLoading = false;
  protected isRecoveryCodeValidated = false;

  protected registerEmailLocal = '';
  protected registerEmailDomain = 'gmail.com';
  protected registerPassword = '';
  protected registerConfirmPassword = '';
  protected registerNombres = '';
  protected registerApellidos = '';
  protected registerTelefono = '';
  protected registerDocTipo = 'DNI';
  protected registerDocNumero = '';
  protected showRegisterPassword = false;
  protected showRegisterConfirmPassword = false;
  protected registerError = '';
  protected registerSuccess = '';
  protected registerLoading = false;
  protected registerFieldErrors: RegisterFieldErrors = {};

  ngOnInit(): void { void this.restoreSessionState(); }

  protected openLoginModal(): void { this.isLoginModalOpen = true; this.modalView = 'login'; }
  protected closeLoginModal(): void { this.isLoginModalOpen = false; this.resetModalState(); }
  protected toggleMobileMenu(): void { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  protected closeMobileMenu(): void { this.isMobileMenuOpen = false; }
  protected openLogoutConfirm(): void { this.isLogoutConfirmOpen = true; }
  protected closeLogoutConfirm(): void { this.isLogoutConfirmOpen = false; }

  protected handleMyOrderClick(): void {
    const authToken = localStorage.getItem(this.authStorageKey);
    if (!authToken || !this.isAuthenticated) { this.openLoginModal(); return; }
  }

  protected logout(): void {
    localStorage.removeItem(this.authStorageKey);
    localStorage.removeItem(this.userNameStorageKey);
    localStorage.removeItem(this.userRoleStorageKey);
    this.isAuthenticated = false;
    this.isAdmin = false;
    this.displayName = '';
    this.isLogoutConfirmOpen = false;
    this.syncUi();
  }

  protected goToAdminPanel(): void {
    if (!this.isAuthenticated || !this.isAdmin) return;
    void this.router.navigate(['/admin']);
  }

  protected openForgotPassword(): void {
    this.modalView = 'forgot';
    this.forgotStep = 'request';
    this.forgotError = '';
    this.forgotSuccess = '';
    this.forgotCode = '';
    this.isRecoveryCodeValidated = false;
    this.recoveryCodeDigits = ['', '', '', '', '', ''];
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.forgotEmail = this.loginEmail || this.forgotEmail;
  }

  protected openRegister(): void {
    this.modalView = 'register';
    this.registerError = '';
    this.registerSuccess = '';
    this.loadRegisterDraft();
  }

  protected backToLogin(): void { this.modalView = 'login'; this.loginError = ''; this.isRecoveryCodeValidated = false; }

  protected async openCartaPdf(event?: Event): Promise<void> {
    event?.preventDefault();
    let targetUrl = '';
    try {
      const data = await firstValueFrom(
        this.http
          .get<ConfiguracionMediaPublicResponse>(`${this.apiBaseUrl}/api/public/configuracion/media/CARTA_PDF`)
          .pipe(timeout(10000))
      );
      targetUrl = data?.activa ? (data.url?.trim() || '') : '';
      if (targetUrl) {
        localStorage.setItem(this.cartaPdfCacheKey, targetUrl);
      }
    } catch {
      targetUrl = localStorage.getItem(this.cartaPdfCacheKey)?.trim() || '';
    }

    if (!targetUrl) {
      return;
    }

    const viewerUrl = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(targetUrl)}`;
    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
  }

  protected async submitLogin(): Promise<void> {
    if (this.loginLoading) return;
    this.loginError = '';
    if (!this.loginEmail || !this.loginPassword) { this.loginError = 'Completa correo y contraseña.'; return; }
    this.loginLoading = true;
    try {
      const authResult = await this.authenticateBasic(this.loginEmail, this.loginPassword);
      if (!authResult) { this.loginError = 'Correo o contraseña incorrectos.'; return; }
      this.applyAuthenticatedSession(authResult.token, authResult.usuario || this.loginEmail, authResult.nombres ?? null, authResult.apellidos ?? null, authResult.rol);
      this.closeLoginModal();
      await this.redirectAfterLogin(authResult.rol);
    } catch { this.loginError = 'No se pudo conectar con el servidor.'; }
    finally { this.loginLoading = false; this.syncUi(); }
  }

  protected async requestRecoveryCode(): Promise<void> {
    if (this.forgotLoading) return;
    this.forgotError = '';
    this.forgotSuccess = '';
    if (!this.forgotEmail) { this.forgotError = 'Ingresa tu correo.'; return; }
    this.forgotLoading = true;
    this.isRecoveryCodeValidated = false;
    try {
      const recoveryResponse = await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/api/auth/recuperar/solicitar`, { email: this.forgotEmail }, { responseType: 'text' }).pipe(timeout(10000))
      );
      const text = (recoveryResponse ?? '').toString().trim();
      if (text) {
        try {
          const maybeJson = JSON.parse(text) as { estado?: number; mensaje?: string; message?: string };
          if ((maybeJson.estado ?? 0) >= 400) {
            this.forgotError = maybeJson.mensaje || maybeJson.message || 'No se pudo enviar el código. Intenta nuevamente.';
            return;
          }
        } catch {
          if (/solo para clientes|no autorizado|unauthorized/i.test(text)) {
            this.forgotError = 'La recuperación de contraseña está disponible solo para clientes.';
            return;
          }
        }
      }
      this.forgotStep = 'code';
      this.forgotSuccess = 'Te enviamos un código al correo. Revisa también SPAM o no deseados.';
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      this.forgotError = httpError.error?.mensaje || 'No se pudo enviar el código. Intenta nuevamente.';
    } finally { this.forgotLoading = false; this.syncUi(); }
  }

  protected async goToResetStep(): Promise<void> {
    if (this.forgotLoading) return;
    this.forgotError = '';
    this.isRecoveryCodeValidated = false;
    this.forgotCode = this.recoveryCodeDigits.join('');
    if (!/^\d{6}$/.test(this.forgotCode)) { this.forgotError = 'Ingresa el código completo de 6 dígitos.'; return; }

    this.forgotLoading = true;
    try {
      const validationResponse = await firstValueFrom(this.http.post(`${this.apiBaseUrl}/api/auth/recuperar/validar-codigo`, { email: this.forgotEmail, codigo: this.forgotCode }, { responseType: 'text' }).pipe(timeout(10000)));
      const text = (validationResponse ?? '').toString().trim();
      if (text) {
        try {
          const maybeJson = JSON.parse(text) as { estado?: number; mensaje?: string };
          if ((maybeJson.estado ?? 0) >= 400) { this.forgotError = maybeJson.mensaje || 'Código inválido o expirado.'; return; }
        } catch { if (!/codigo valido/i.test(text)) { this.forgotError = 'Código inválido o expirado.'; return; } }
      }
      this.forgotStep = 'reset';
      this.isRecoveryCodeValidated = true;
      this.forgotSuccess = '';
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      this.forgotError = httpError.error?.mensaje || 'Código inválido o expirado.';
    } finally { this.forgotLoading = false; this.syncUi(); }
  }

  protected onRecoveryCodeInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement | null; if (!input) return;
    const raw = (input.value ?? '').replace(/[^0-9]/g, '');
    if (raw.length > 1) {
      const digits = raw.slice(0, 6).split('');
      this.recoveryCodeDigits = this.recoveryCodeIndexes.map((_, i) => digits[i] ?? '');
      const focusIndex = Math.min(digits.length, 5);
      const target = document.getElementById(`recovery-code-${focusIndex}`) as HTMLInputElement | null;
      target?.focus(); target?.select(); this.syncUi(); return;
    }
    const digit = raw.slice(-1);
    this.recoveryCodeDigits[index] = digit;
    input.value = digit;
    if (digit && index < this.recoveryCodeDigits.length - 1) {
      const next = document.getElementById(`recovery-code-${index + 1}`) as HTMLInputElement | null;
      next?.focus(); next?.select();
    }
  }

  protected onRecoveryCodeKeydown(index: number, event: KeyboardEvent): void {
    const key = event.key ?? '';
    if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'v') return;
    if (key === 'Backspace' && !this.recoveryCodeDigits[index] && index > 0) {
      const prev = document.getElementById(`recovery-code-${index - 1}`) as HTMLInputElement | null; prev?.focus(); prev?.select(); return;
    }
    if (key === 'ArrowLeft' && index > 0) { event.preventDefault(); (document.getElementById(`recovery-code-${index - 1}`) as HTMLInputElement | null)?.focus(); return; }
    if (key === 'ArrowRight' && index < this.recoveryCodeDigits.length - 1) { event.preventDefault(); (document.getElementById(`recovery-code-${index + 1}`) as HTMLInputElement | null)?.focus(); return; }
    if (key.length === 1 && !/^[0-9]$/.test(key)) event.preventDefault();
  }

  protected onRecoveryCodePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/[^0-9]/g, '').slice(0, 6).split('');
    this.recoveryCodeDigits = this.recoveryCodeIndexes.map((_, i) => digits[i] ?? '');
    this.syncUi();
    const focusIndex = Math.min(digits.length, 5);
    const target = document.getElementById(`recovery-code-${focusIndex}`) as HTMLInputElement | null;
    target?.focus(); target?.select();
  }

  protected async confirmPasswordReset(): Promise<void> {
    if (!this.isRecoveryCodeValidated) { this.forgotError = 'Primero valida tu código de verificación.'; this.forgotStep = 'code'; return; }
    if (this.forgotLoading) return;
    this.forgotError = ''; this.forgotSuccess = '';
    if (!this.forgotNewPassword || !this.forgotConfirmPassword) { this.forgotError = 'Completa ambas contraseñas.'; return; }
    if (this.forgotNewPassword.length < 8) { this.forgotError = 'La nueva contraseña debe tener al menos 8 caracteres.'; return; }
    if (this.forgotNewPassword !== this.forgotConfirmPassword) { this.forgotError = 'Las contraseñas no coinciden.'; return; }

    this.forgotLoading = true;
    try {
      await firstValueFrom(this.http.post(`${this.apiBaseUrl}/api/auth/recuperar/confirmar`, { email: this.forgotEmail, codigo: this.forgotCode, nuevaPassword: this.forgotNewPassword }, { responseType: 'text' }).pipe(timeout(10000)));
      this.forgotStep = 'done'; this.forgotSuccess = 'Contraseña actualizada. Ya puedes iniciar sesión.';
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      this.forgotError = httpError.error?.mensaje || 'Código inválido o vencido.';
    } finally { this.forgotLoading = false; this.syncUi(); }
  }

  protected async submitRegister(): Promise<void> {
    if (this.registerLoading) return;
    this.registerError = ''; this.registerSuccess = ''; this.registerFieldErrors = {};
    if (!this.validateRegisterForm()) return;
    this.registerLoading = true;
    try {
      const registerResponse = await firstValueFrom(this.http.post<{ estado?: number; mensaje?: string; detalles?: Array<{ campo?: string; mensaje?: string }> }>(`${this.apiBaseUrl}/api/auth/registro`, {
        email: this.buildRegisterEmail(), password: this.registerPassword, nombres: this.registerNombres, apellidos: this.registerApellidos,
        telefono: this.registerTelefono || null, docTipo: this.registerDocTipo, docNumero: this.registerDocNumero
      }));
      if (registerResponse?.estado && registerResponse.estado >= 400) { this.handleRegisterBusinessError(registerResponse); this.syncUi(); return; }
      const createdEmail = this.buildRegisterEmail();
      const createdPassword = this.registerPassword;
      const createdName = this.buildShortDisplayName(this.registerNombres, this.registerApellidos);
      localStorage.setItem(this.userNameStorageKey, createdName);
      this.clearRegisterDraft();
      this.registerSuccess = 'Registro exitoso. Iniciando sesión...';
      void this.autoLoginAfterRegister(createdEmail, createdPassword);
      this.syncUi();
    } catch (error) { this.handleRegisterHttpError(error as HttpErrorResponse); this.syncUi(); }
    finally { this.registerLoading = false; this.syncUi(); }
  }

  protected sanitizePersonName(value: string): string { return (value ?? '').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s'\-]/g, ''); }
  protected preventInvalidNameKey(event: KeyboardEvent): void { if (event.ctrlKey || event.metaKey || event.altKey) return; const key = event.key; if (key.length !== 1) return; if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s'\-]$/.test(key)) event.preventDefault(); }
  protected preventNonNumericKey(event: KeyboardEvent): void { if (!event) return; if (event.ctrlKey || event.metaKey || event.altKey) return; const key = event.key ?? ''; if (key.length !== 1) return; if (!/^[0-9]$/.test(key)) event.preventDefault(); }
  protected preventPhoneBeforeInput(event: InputEvent): void { const data = event.data ?? ''; if (data && /[^0-9]/.test(data)) event.preventDefault(); }
  protected handlePhonePaste(event: ClipboardEvent): void { event.preventDefault(); this.registerTelefono = (event.clipboardData?.getData('text') ?? '').replace(/[^0-9]/g, '').slice(0, 9); this.persistRegisterDraft(); }
  protected handleNamePaste(event: ClipboardEvent, field: 'nombres' | 'apellidos'): void { event.preventDefault(); const clean = this.sanitizePersonName(event.clipboardData?.getData('text') ?? ''); if (field === 'nombres') { this.registerNombres = clean; this.persistRegisterDraft(); return; } this.registerApellidos = clean; this.persistRegisterDraft(); }
  protected sanitizeEmailLocalInput(): void { this.registerEmailLocal = (this.registerEmailLocal ?? '').replace(/[^A-Za-z0-9._%+\-]/g, '').slice(0, 64); this.persistRegisterDraft(); }
  protected preventEmailLocalBeforeInput(event: InputEvent): void { const data = event.data ?? ''; if (data && !/^[A-Za-z0-9._%+\-]+$/.test(data)) event.preventDefault(); }
  protected preventInvalidEmailLocalKey(event: KeyboardEvent): void { if (!event) return; if (event.ctrlKey || event.metaKey || event.altKey) return; const key = event.key ?? ''; if (key.length !== 1) return; if (!/^[A-Za-z0-9._%+\-]$/.test(key)) event.preventDefault(); }
  protected handleEmailLocalPaste(event: ClipboardEvent): void { event.preventDefault(); this.registerEmailLocal = (event.clipboardData?.getData('text') ?? '').replace(/[^A-Za-z0-9._%+\-]/g, '').slice(0, 64); this.persistRegisterDraft(); }
  protected onDocTypeChange(): void { this.sanitizeDocInput(); this.persistRegisterDraft(); }
  protected getDocMaxLength(): number { if (this.registerDocTipo === 'DNI') return 8; if (this.registerDocTipo === 'CE') return 12; return 12; }
  protected sanitizeDocInput(): void { const value = this.registerDocNumero ?? ''; const clean = this.registerDocTipo === 'DNI' ? value.replace(/[^0-9]/g, '') : value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); this.registerDocNumero = clean.slice(0, this.getDocMaxLength()); this.persistRegisterDraft(); }
  protected preventDocBeforeInput(event: InputEvent): void { const data = event.data ?? ''; if (!data) return; const pattern = this.registerDocTipo === 'DNI' ? /^[0-9]+$/ : /^[A-Za-z0-9]+$/; if (!pattern.test(data)) event.preventDefault(); }
  protected preventInvalidDocKey(event: KeyboardEvent): void { if (!event) return; if (event.ctrlKey || event.metaKey || event.altKey) return; const key = event.key ?? ''; if (key.length !== 1) return; const pattern = this.registerDocTipo === 'DNI' ? /^[0-9]$/ : /^[A-Za-z0-9]$/; if (!pattern.test(key)) event.preventDefault(); }
  protected handleDocPaste(event: ClipboardEvent): void { event.preventDefault(); const pasted = event.clipboardData?.getData('text') ?? ''; const clean = this.registerDocTipo === 'DNI' ? pasted.replace(/[^0-9]/g, '') : pasted.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); this.registerDocNumero = clean.slice(0, this.getDocMaxLength()); this.persistRegisterDraft(); }
  protected persistRegisterDraft(): void { try { localStorage.setItem(this.registerDraftStorageKey, JSON.stringify({ registerEmailLocal: this.registerEmailLocal, registerEmailDomain: this.registerEmailDomain, registerNombres: this.registerNombres, registerApellidos: this.registerApellidos, registerTelefono: this.registerTelefono, registerDocTipo: this.registerDocTipo, registerDocNumero: this.registerDocNumero, registerPassword: this.registerPassword, registerConfirmPassword: this.registerConfirmPassword })); } catch {} }

  protected loadRegisterDraft(): void {
    try {
      const raw = localStorage.getItem(this.registerDraftStorageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<Record<string, string>>;
      this.registerEmailLocal = draft['registerEmailLocal'] ?? this.registerEmailLocal;
      this.registerEmailDomain = draft['registerEmailDomain'] ?? this.registerEmailDomain;
      this.registerNombres = this.sanitizePersonName(draft['registerNombres'] ?? this.registerNombres);
      this.registerApellidos = this.sanitizePersonName(draft['registerApellidos'] ?? this.registerApellidos);
      this.registerTelefono = (draft['registerTelefono'] ?? this.registerTelefono).replace(/[^0-9]/g, '').slice(0, 9);
      this.registerDocTipo = (draft['registerDocTipo'] as 'DNI' | 'CE' | 'PASAPORTE') ?? this.registerDocTipo;
      this.registerDocNumero = draft['registerDocNumero'] ?? this.registerDocNumero;
      this.registerPassword = draft['registerPassword'] ?? this.registerPassword;
      this.registerConfirmPassword = draft['registerConfirmPassword'] ?? this.registerConfirmPassword;
      this.sanitizeEmailLocalInput();
      this.sanitizeDocInput();
    } catch {}
  }

  private resetModalState(): void {
    this.modalView = 'login'; this.forgotStep = 'request'; this.loginPassword = ''; this.loginError = ''; this.showLoginPassword = false;
    this.forgotError = ''; this.forgotSuccess = ''; this.forgotCode = ''; this.forgotNewPassword = ''; this.forgotConfirmPassword = '';
    this.showForgotNewPassword = false; this.showForgotConfirmPassword = false; this.isRecoveryCodeValidated = false;
    this.registerError = ''; this.registerSuccess = ''; this.registerFieldErrors = {}; this.showRegisterPassword = false; this.showRegisterConfirmPassword = false;
  }

  private validateRegisterForm(): boolean {
    this.sanitizeEmailLocalInput();
    const emailLocal = this.registerEmailLocal.trim().toLowerCase(); this.registerEmailLocal = emailLocal;
    const nombres = this.registerNombres.trim(); const apellidos = this.registerApellidos.trim();
    this.sanitizeDocInput(); const docNumero = this.registerDocNumero.trim();
    const telefono = this.registerTelefono.trim().replace(/[^0-9]/g, '').slice(0, 9); this.registerTelefono = telefono;
    const nameRegex = /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s'-]+$/; const emailLocalRegex = /^[A-Za-z0-9._%+-]+$/;
    if (!emailLocal) this.registerFieldErrors.email = 'Ingresa tu correo.';
    else if (!emailLocalRegex.test(emailLocal)) this.registerFieldErrors.email = 'Solo letras, números, punto, guion, guion bajo y +.';
    else if (emailLocal.startsWith('.') || emailLocal.endsWith('.') || emailLocal.includes('..')) this.registerFieldErrors.email = 'Formato de correo inválido.';
    if (!nombres) this.registerFieldErrors.nombres = 'Los nombres son obligatorios.';
    else if (!nameRegex.test(nombres)) this.registerFieldErrors.nombres = 'Los nombres no deben contener números.';
    if (!apellidos) this.registerFieldErrors.apellidos = 'Los apellidos son obligatorios.';
    else if (!nameRegex.test(apellidos)) this.registerFieldErrors.apellidos = 'Los apellidos no deben contener números.';
    if (!docNumero) this.registerFieldErrors.docNumero = 'El número de documento es obligatorio.';
    else if (this.registerDocTipo === 'DNI' && !/^\d{8}$/.test(docNumero)) this.registerFieldErrors.docNumero = 'El DNI debe tener 8 dígitos.';
    else if (this.registerDocTipo === 'CE' && !/^[A-Za-z0-9]{9,12}$/.test(docNumero)) this.registerFieldErrors.docNumero = 'El CE debe tener entre 9 y 12 caracteres.';
    else if (this.registerDocTipo === 'PASAPORTE' && !/^[A-Za-z0-9]{6,12}$/.test(docNumero)) this.registerFieldErrors.docNumero = 'El pasaporte debe tener entre 6 y 12 caracteres.';
    if (telefono && !/^9\d{8}$/.test(telefono)) this.registerFieldErrors.telefono = 'Ingresa un celular válido (9 dígitos iniciando en 9).';
    if (!this.registerPassword) this.registerFieldErrors.password = 'La contraseña es obligatoria.';
    else if (this.registerPassword.length < 8) this.registerFieldErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (!this.registerConfirmPassword) this.registerFieldErrors.confirmPassword = 'Confirma tu contraseña.';
    else if (this.registerPassword !== this.registerConfirmPassword) this.registerFieldErrors.confirmPassword = 'Las contraseñas no coinciden.';
    return Object.keys(this.registerFieldErrors).length === 0;
  }

  protected buildRegisterEmail(): string { return `${this.registerEmailLocal.trim().toLowerCase()}@${this.registerEmailDomain}`; }
  private clearRegisterDraft(): void { try { localStorage.removeItem(this.registerDraftStorageKey); } catch {} }

  private async authenticateBasic(email: string, password: string): Promise<{ token: string; usuario: string | null; nombres: string | null; apellidos: string | null; rol: string | null } | null> {
    const token = btoa(`${email}:${password}`);
    try {
      const profile = await firstValueFrom(this.http.get(`${this.apiBaseUrl}/api/auth/yo`, { headers: new HttpHeaders({ Authorization: `Basic ${token}` }) }).pipe(timeout(8000)));
      const payload = profile as { usuario?: string; nombres?: string; apellidos?: string; rol?: string; role?: string; roles?: unknown } | null;
      return {
        token,
        usuario: payload?.usuario ?? null,
        nombres: payload?.nombres ?? null,
        apellidos: payload?.apellidos ?? null,
        rol: this.resolveRole(payload)
      };
    } catch { return null; }
  }

  private async autoLoginAfterRegister(email: string, password: string): Promise<void> {
    this.modalView = 'login'; this.loginEmail = email; this.loginPassword = password; this.loginError = ''; this.loginLoading = true;
    try {
      const authResult = await this.authenticateBasic(email, password);
      if (!authResult) { this.loginPassword = ''; this.loginError = 'Cuenta creada. Inicia sesión con tu nueva contraseña.'; return; }
      this.applyAuthenticatedSession(authResult.token, authResult.usuario || email, authResult.nombres ?? null, authResult.apellidos ?? null, authResult.rol);
      this.closeLoginModal();
      await this.redirectAfterLogin(authResult.rol);
    } catch { this.loginPassword = ''; this.loginError = 'Cuenta creada, pero no se pudo iniciar sesión automáticamente.'; }
    finally { this.loginLoading = false; this.syncUi(); }
  }

  private syncUi(): void { this.ngZone.run(() => this.cdr.detectChanges()); }

  private async restoreSessionState(): Promise<void> {
    const token = localStorage.getItem(this.authStorageKey); if (!token) return;
    try {
      const profile = await firstValueFrom(this.http.get<{ usuario?: string; nombres?: string; apellidos?: string }>(`${this.apiBaseUrl}/api/auth/yo`, { headers: new HttpHeaders({ Authorization: `Basic ${token}` }) }).pipe(timeout(5000)));
      const role = this.resolveRole(profile as { rol?: string; role?: string; roles?: unknown } | null);
      this.applyAuthenticatedSession(token, profile.usuario ?? '', profile.nombres ?? null, profile.apellidos ?? null, role);
    } catch { this.logout(); }
  }

  private applyAuthenticatedSession(token: string, usuario: string, nombres?: string | null, apellidos?: string | null, role?: string | null): void {
    localStorage.setItem(this.authStorageKey, token);
    this.isAuthenticated = true;
    const normalizedRole = (role ?? '').trim().toUpperCase();
    if (normalizedRole) localStorage.setItem(this.userRoleStorageKey, normalizedRole);
    const savedRole = localStorage.getItem(this.userRoleStorageKey)?.trim().toUpperCase();
    this.isAdmin = this.isAdminRole(normalizedRole || savedRole || null);
    const savedName = localStorage.getItem(this.userNameStorageKey)?.trim();
    if (nombres || apellidos) { this.displayName = this.buildShortDisplayName(nombres ?? '', apellidos ?? ''); localStorage.setItem(this.userNameStorageKey, this.displayName); }
    else if (savedName) this.displayName = this.normalizeDisplayName(savedName);
    else this.displayName = this.formatDisplayName(usuario);
    this.syncUi();
  }

  private formatDisplayName(usuario: string): string {
    const source = (usuario || '').trim();
    const emailLocal = source.includes('@') ? source.split('@')[0] : source;
    const normalized = emailLocal.replace(/[._-]+/g, ' ').trim();
    if (!normalized) return 'Cliente';
    return normalized.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }

  private buildShortDisplayName(nombres: string, apellidos: string): string {
    const firstName = (nombres ?? '').trim().split(/\s+/).filter(Boolean)[0] ?? '';
    const firstLastName = (apellidos ?? '').trim().split(/\s+/).filter(Boolean)[0] ?? '';
    return this.normalizeDisplayName(`${firstName} ${firstLastName}`.trim() || 'Cliente');
  }

  private normalizeDisplayName(value: string): string {
    return (value ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ') || 'Cliente';
  }

  private resolveRole(payload: { rol?: string; role?: string; roles?: unknown } | null): string | null {
    const direct = (payload?.rol ?? payload?.role ?? '').toString().trim().toUpperCase();
    if (direct) return direct;
    const roles = payload?.roles;
    if (!Array.isArray(roles)) return null;
    const first = roles[0] as { nombre?: string; role?: string } | string | undefined;
    if (!first) return null;
    if (typeof first === 'string') return first.trim().toUpperCase();
    return (first.nombre ?? first.role ?? '').toString().trim().toUpperCase() || null;
  }

  private async redirectAfterLogin(role: string | null): Promise<void> {
    if (this.isAdminRole(role)) {
      await this.router.navigate(['/admin']);
      return;
    }
    await this.router.navigate(['/inicio']);
  }

  private isAdminRole(role: string | null): boolean {
    const normalized = (role ?? '').trim().toUpperCase();
    if (!normalized) return false;
    return normalized === 'ADMIN'
      || normalized === 'ROLE_ADMIN'
      || normalized === 'ADMINISTRADOR'
      || normalized.includes('ADMIN');
  }

  private handleRegisterHttpError(error: HttpErrorResponse): void {
    const body = error.error as { mensaje?: string; detalles?: Array<{ campo?: string; mensaje?: string }> } | string | null;
    if (body && typeof body === 'object' && Array.isArray(body.detalles) && body.detalles.length) {
      for (const d of body.detalles) {
        if (!d?.campo || !d?.mensaje) continue;
        const field = d.campo;
        if (field === 'email') this.registerFieldErrors.email = d.mensaje;
        if (field === 'nombres') this.registerFieldErrors.nombres = d.mensaje;
        if (field === 'apellidos') this.registerFieldErrors.apellidos = d.mensaje;
        if (field === 'docNumero') this.registerFieldErrors.docNumero = d.mensaje;
        if (field === 'telefono') this.registerFieldErrors.telefono = d.mensaje;
        if (field === 'password') this.registerFieldErrors.password = d.mensaje;
      }
      return;
    }
    const backendMessage = typeof body === 'string' ? body : (body && typeof body === 'object' ? body.mensaje : '') || '';
    const msg = backendMessage.toLowerCase();
    if (msg.includes('email')) { this.registerFieldErrors.email = backendMessage || 'El correo ya existe.'; return; }
    if (msg.includes('doc')) { this.registerFieldErrors.docNumero = backendMessage || 'Documento inválido.'; return; }
    if (error.status === 422) { this.registerFieldErrors.email = backendMessage || 'El correo ya existe.'; return; }
    this.registerError = backendMessage || 'Error de conexión durante el registro.';
  }

  private handleRegisterBusinessError(body: { mensaje?: string; detalles?: Array<{ campo?: string; mensaje?: string }> }): void {
    if (Array.isArray(body.detalles) && body.detalles.length) {
      for (const d of body.detalles) {
        if (!d?.campo || !d?.mensaje) continue;
        const field = d.campo;
        if (field === 'email') this.registerFieldErrors.email = d.mensaje;
        if (field === 'nombres') this.registerFieldErrors.nombres = d.mensaje;
        if (field === 'apellidos') this.registerFieldErrors.apellidos = d.mensaje;
        if (field === 'docNumero') this.registerFieldErrors.docNumero = d.mensaje;
        if (field === 'telefono') this.registerFieldErrors.telefono = d.mensaje;
        if (field === 'password') this.registerFieldErrors.password = d.mensaje;
      }
      return;
    }
    const msg = (body.mensaje ?? '').toLowerCase();
    if (msg.includes('email')) { this.registerFieldErrors.email = body.mensaje || 'El correo ya existe.'; return; }
    if (msg.includes('doc')) { this.registerFieldErrors.docNumero = body.mensaje || 'Documento inválido.'; return; }
    this.registerError = body.mensaje || 'No se pudo registrar la cuenta.';
  }
}
