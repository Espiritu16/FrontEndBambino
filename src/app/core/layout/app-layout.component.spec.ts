import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AppLayoutComponent } from './app-layout.component';

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;

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
  });

  afterEach(() => {
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
    };
    component.isAuthenticated = true;
    component.displayName = 'Fabrizio';

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .map((button) => button.textContent?.trim())
      .filter(Boolean);
    expect(buttons).toContain('Mis pedidos');
  });
});
