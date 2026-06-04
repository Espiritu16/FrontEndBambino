import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AppLayoutComponent } from './app-layout.component';
import { API_BASE_URL } from '../http/api-endpoints';

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'carrito', component: DummyRouteComponent },
          { path: 'mis-pedidos', component: DummyRouteComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppLayoutComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.match(() => true).forEach((req) => req.flush([]));
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows the cart action for administrator users', () => {
    const component = fixture.componentInstance as unknown as {
      currentRole: string;
      canShowMyOrder(): boolean;
    };

    component.currentRole = 'ADMINISTRADOR';

    expect(component.canShowMyOrder()).toBe(true);
  });

  it('navigates to the cart when the cart action is clicked', () => {
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const component = fixture.componentInstance as unknown as {
      currentRole: string;
      handleMyOrderClick(): void;
    };

    component.currentRole = 'ADMINISTRADOR';

    component.handleMyOrderClick();

    expect(navigateSpy).toHaveBeenCalledWith(['/carrito']);
  });

  it('navigates to my orders from the header action', () => {
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const component = fixture.componentInstance as unknown as {
      goToMisPedidos(): void;
    };

    component.goToMisPedidos();

    expect(navigateSpy).toHaveBeenCalledWith(['/mis-pedidos']);
  });

  it('renders my orders action for authenticated users', () => {
    const component = fixture.componentInstance as unknown as {
      isAuthenticated: boolean;
      displayName: string;
      currentRole: string;
    };
    component.isAuthenticated = true;
    component.displayName = 'Fabrizio';
    component.currentRole = 'CLIENTE';

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .map((button) => button.textContent?.trim())
      .filter(Boolean);
    expect(buttons).toContain('Mis pedidos');
  });

  it('hides my orders action for administrator users', () => {
    const component = fixture.componentInstance as unknown as {
      isAuthenticated: boolean;
      displayName: string;
      currentRole: string;
    };
    component.isAuthenticated = true;
    component.displayName = 'Admin';
    component.currentRole = 'ADMINISTRADOR';

    fixture.detectChanges();

    const hostText = fixture.nativeElement.textContent as string;
    expect(hostText).not.toContain('Mis pedidos');
  });

  it('shows live password requirement states while registering', async () => {
    const component = fixture.componentInstance as unknown as {
      isLoginModalOpen: boolean;
      modalView: 'register';
      registerPassword: string;
      registerConfirmPassword: string;
    };
    component.isLoginModalOpen = true;
    component.modalView = 'register';
    component.registerPassword = 'abc12345';
    component.registerConfirmPassword = 'abc12345';

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.password-requirements')).toBeNull();

    const passwordInput = fixture.nativeElement.querySelector('input[name="register_password"]') as HTMLInputElement;
    passwordInput.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const requirementItems = Array.from(
      fixture.nativeElement.querySelectorAll('.password-requirements__item') as NodeListOf<HTMLElement>
    );
    const passwordRequirementsPopup = fixture.nativeElement.querySelector('.password-requirements') as HTMLElement;
    expect(passwordRequirementsPopup.getAttribute('style')).toContain('bottom: calc(100% + 0.35rem)');
    expect(passwordRequirementsPopup.getAttribute('style')).toContain('right: -0.9rem');
    expect(requirementItems).toHaveLength(5);
    expect(requirementItems.map((item) => item.textContent?.trim())).toEqual([
      'check_circleAl menos una letra',
      'cancelAl menos una letra en mayúsculas',
      'check_circleAl menos un número',
      'check_circleMínimo 8 caracteres',
      'check_circleLas contraseñas coinciden'
    ]);
    expect(requirementItems[1].classList.contains('password-requirements__item--invalid')).toBe(true);

    fixture.destroy();
    const validFixture = TestBed.createComponent(AppLayoutComponent);
    const validComponent = validFixture.componentInstance as unknown as {
      isLoginModalOpen: boolean;
      modalView: 'register';
      registerPassword: string;
      registerConfirmPassword: string;
    };
    validComponent.isLoginModalOpen = true;
    validComponent.modalView = 'register';
    validComponent.registerPassword = 'Abc12345';
    validComponent.registerConfirmPassword = 'Abc12345';
    validFixture.detectChanges();
    const validPasswordInput = validFixture.nativeElement.querySelector('input[name="register_password"]') as HTMLInputElement;
    validPasswordInput.dispatchEvent(new Event('focus'));
    validFixture.detectChanges();

    const updatedItems = Array.from(
      validFixture.nativeElement.querySelectorAll('.password-requirements__item') as NodeListOf<HTMLElement>
    );
    expect(updatedItems.every((item) => item.classList.contains('password-requirements__item--valid'))).toBe(true);

    validFixture.nativeElement.querySelector('input[name="register_confirm_password"]').dispatchEvent(new Event('focus'));
    validFixture.detectChanges();
    expect(validFixture.nativeElement.querySelectorAll('.password-requirements')).toHaveLength(1);
    const confirmRequirementsPopup = Array.from(
      validFixture.nativeElement.querySelectorAll('.password-requirements') as NodeListOf<HTMLElement>
    ).at(-1) as HTMLElement;
    expect(confirmRequirementsPopup.getAttribute('style')).toContain('bottom: calc(100% + 0.35rem)');
    expect(confirmRequirementsPopup.getAttribute('style')).toContain('right: -0.9rem');
    const confirmPopupItems = Array.from(
      validFixture.nativeElement.querySelectorAll('.password-requirements__item') as NodeListOf<HTMLElement>
    );
    expect(confirmPopupItems.map((item) => item.textContent?.trim())).toContain('check_circleLas contraseñas coinciden');
    validFixture.destroy();
  });

  it('blocks registration when Factiliza does not find the DNI', async () => {
    const component = fixture.componentInstance as unknown as {
      registerEmailLocal: string;
      registerEmailDomain: string;
      registerNombres: string;
      registerApellidos: string;
      registerPassword: string;
      registerConfirmPassword: string;
      registerDocumentos: Array<{ docTipo: 'DNI'; docNumero: string }>;
      registerFieldErrors: { docNumero?: string };
      submitRegister(): Promise<void>;
    };
    component.registerEmailLocal = 'cliente';
    component.registerEmailDomain = 'gmail.com';
    component.registerNombres = 'Juan';
    component.registerApellidos = 'Perez';
    component.registerPassword = 'Password123';
    component.registerConfirmPassword = 'Password123';
    component.registerDocumentos = [{ docTipo: 'DNI', docNumero: '12345678' }];

    const submitPromise = component.submitRegister();
    const factilizaReq = http.expectOne((req) =>
      req.method === 'GET'
      && req.url === `${API_BASE_URL}/api/public/documentos/consultar`
      && req.params.get('documento') === '12345678'
    );
    factilizaReq.flush({ mensaje: 'No se encontraron datos para el documento ingresado.' }, { status: 404, statusText: 'Not Found' });
    await submitPromise;

    expect(component.registerFieldErrors.docNumero).toBe('DNI no encontrado. Verifica el número ingresado.');
    http.expectNone((req) => req.method === 'POST' && req.url === `${API_BASE_URL}/api/auth/registro`);
  });

  it('validates DNI with Factiliza before sending registration', async () => {
    const component = fixture.componentInstance as unknown as {
      registerEmailLocal: string;
      registerEmailDomain: string;
      registerNombres: string;
      registerApellidos: string;
      registerPassword: string;
      registerConfirmPassword: string;
      registerDocumentos: Array<{ docTipo: 'DNI'; docNumero: string }>;
      submitRegister(): Promise<void>;
    };
    component.registerEmailLocal = 'cliente';
    component.registerEmailDomain = 'gmail.com';
    component.registerNombres = 'Juan';
    component.registerApellidos = 'Perez';
    component.registerPassword = 'Password123';
    component.registerConfirmPassword = 'Password123';
    component.registerDocumentos = [{ docTipo: 'DNI', docNumero: '12345678' }];

    const submitPromise = component.submitRegister();
    const factilizaReq = http.expectOne((req) =>
      req.method === 'GET'
      && req.url === `${API_BASE_URL}/api/public/documentos/consultar`
      && req.params.get('documento') === '12345678'
    );
    factilizaReq.flush({ tipoDocumento: 'DNI', numeroDocumento: '12345678', nombreORazonSocial: 'JUAN PEREZ' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const registerReq = http.expectOne((req) => req.method === 'POST' && req.url === `${API_BASE_URL}/api/auth/registro`);
    expect(registerReq.request.body).toEqual(expect.objectContaining({
      email: 'cliente@gmail.com',
      docTipo: 'DNI',
      docNumero: '12345678'
    }));
    registerReq.flush({ mensaje: 'registro exitoso' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const profileReq = http.expectOne((req) => req.method === 'GET' && req.url === `${API_BASE_URL}/api/auth/yo`);
    profileReq.flush({ usuario: 'cliente@gmail.com', nombres: 'Juan', apellidos: 'Perez', rol: 'CLIENTE' });
    await submitPromise;
  });
});
