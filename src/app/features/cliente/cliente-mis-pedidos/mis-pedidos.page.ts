import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

type AuthYoResponse = {
  usuario?: string;
  nombres?: string;
  apellidos?: string;
};

type PedidoResponse = {
  idPedido: number;
  codigoPedido: string;
  estadoActual: string;
  total: number;
  fechaCreacion: string;
};

@Component({
  selector: 'app-mis-pedidos-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-pedidos.page.html',
  styleUrl: './mis-pedidos.page.scss'
})
export class MisPedidosPageComponent implements OnInit {
  private readonly apiBaseUrl = 'https://backendbambino.onrender.com';
  private readonly authStorageKey = 'bambino_basic_auth';
  private readonly userNameStorageKey = 'bambino_user_name';
  private readonly userRoleStorageKey = 'bambino_user_role';
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected loading = false;
  protected error = '';
  protected profileName = '';
  protected profileEmail = '';
  protected orders: PedidoResponse[] = [];

  ngOnInit(): void {
    this.hidratarSidebarDesdeSesion();
    void this.loadAll();
  }

  protected async loadAll(): Promise<void> {
    this.loading = true;
    this.error = '';
    const headers = this.authHeaders();
    try {
      const authYo = await firstValueFrom(this.http.get<AuthYoResponse>(`${this.apiBaseUrl}/api/auth/yo`, { headers }).pipe(timeout(10000)));
      const fullName = `${authYo.nombres ?? ''} ${authYo.apellidos ?? ''}`.trim();
      this.profileName = fullName || 'Cliente';
      this.profileEmail = authYo.usuario ?? '';
    } catch {
      // Mantener datos de sidebar desde sesión local.
    }

    try {
      const pedidos = await firstValueFrom(this.http.get<PedidoResponse[]>(`${this.apiBaseUrl}/api/cliente/pedidos`, { headers }).pipe(timeout(10000)));
      this.orders = pedidos ?? [];
    } catch {
      this.error = 'No se pudo cargar tu historial de pedidos.';
    } finally {
      this.loading = false;
    }
  }

  protected goToProfile(): void { void this.router.navigate(['/perfil']); }
  protected goToAddresses(): void { void this.router.navigate(['/direcciones']); }
  protected goToSecurity(): void { void this.router.navigate(['/perfil'], { queryParams: { tab: 'seguridad' } }); }
  protected goToOrders(): void { void this.router.navigate(['/mis-pedidos']); }

  protected logout(): void {
    localStorage.removeItem(this.authStorageKey);
    localStorage.removeItem('bambino_user_name');
    localStorage.removeItem(this.userRoleStorageKey);
    void this.router.navigate(['/inicio']);
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
}
