import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-endpoints';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ClienteCheckoutService, ComprobanteDetalleResponse, ComprobanteResponse, PedidoResponse } from '../cliente-checkout/cliente-checkout.service';

interface AuthYoResponse {
  usuario?: string;
  nombres?: string;
  apellidos?: string;
}

@Component({
  selector: 'app-mis-pedidos-page',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  templateUrl: './mis-pedidos.page.html',
  styleUrl: './mis-pedidos.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MisPedidosPageComponent implements OnInit {
  private readonly apiBaseUrl = API_BASE_URL;
  private readonly authStorageKey = 'bambino_basic_auth';
  private readonly userNameStorageKey = 'bambino_user_name';
  private readonly userRoleStorageKey = 'bambino_user_role';
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly pedidosService = inject(ClienteCheckoutService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected canceling = false;
  protected error = '';
  protected profileName = '';
  protected profileEmail = '';
  protected orders: PedidoResponse[] = [];
  protected cancelTarget: PedidoResponse | null = null;
  protected comprobanteTargetOrder: PedidoResponse | null = null;
  protected comprobanteDetalle: ComprobanteResponse | null = null;
  protected comprobanteLoading = false;
  protected comprobanteError = '';
  protected pdfLoading = false;

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
      const pedidos = await firstValueFrom(this.pedidosService.listarPedidos().pipe(timeout(10000)));
      this.orders = pedidos ?? [];
    } catch {
      this.error = 'No se pudo cargar tu historial de pedidos.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  protected goToProfile(): void { void this.router.navigate(['/perfil']); }
  protected goToAddresses(): void { void this.router.navigate(['/direcciones']); }
  protected goToSecurity(): void { void this.router.navigate(['/perfil'], { queryParams: { tab: 'seguridad' } }); }
  protected goToOrders(): void { void this.router.navigate(['/mis-pedidos']); }

  protected canCancel(order: PedidoResponse): boolean {
    return ['CREADO', 'PAGO_PENDIENTE'].includes((order.estadoActual || '').toUpperCase());
  }

  protected estadoLabel(estado: string): string {
    return (estado || '').replaceAll('_', ' ');
  }

  protected estadoClass(estado: string): string {
    return `order-status order-status--${(estado || 'desconocido').toLowerCase().replaceAll('_', '-')}`;
  }

  protected openCancelModal(order: PedidoResponse): void {
    if (!this.canCancel(order)) return;
    this.cancelTarget = order;
    this.cdr.markForCheck();
  }

  protected closeCancelModal(): void {
    if (this.canceling) return;
    this.cancelTarget = null;
    this.cdr.markForCheck();
  }

  protected async confirmCancelOrder(): Promise<void> {
    if (!this.cancelTarget || this.canceling) return;
    const idPedido = this.cancelTarget.idPedido;
    this.canceling = true;
    this.error = '';
    try {
      const actualizado = await firstValueFrom(
        this.pedidosService.cancelarPedido(idPedido, 'Cancelado por el cliente').pipe(timeout(10000))
      );
      this.orders = this.orders.map((order) => order.idPedido === idPedido ? actualizado : order);
      this.cancelTarget = null;
      this.toast.success('Pedido cancelado. Se mantiene en tu historial.');
    } catch {
      this.error = 'No se pudo cancelar el pedido. Puede que ya esté confirmado o en preparación.';
      this.toast.error(this.error);
    } finally {
      this.canceling = false;
      this.cdr.markForCheck();
    }
  }

  protected async openOrderModal(order: PedidoResponse): Promise<void> {
    this.comprobanteTargetOrder = order;
    this.comprobanteDetalle = null;
    this.comprobanteError = '';
    this.comprobanteLoading = true;
    this.cdr.markForCheck();

    try {
      this.comprobanteDetalle = await firstValueFrom(
        this.pedidosService.obtenerComprobantePorPedido(order.idPedido).pipe(timeout(10000))
      );
    } catch (error: unknown) {
      this.comprobanteError = this.errorMessage(error, 'No se pudo cargar el comprobante de este pedido.');
    } finally {
      this.comprobanteLoading = false;
      this.cdr.markForCheck();
    }
  }

  protected closeOrderModal(): void {
    if (this.pdfLoading) return;
    this.comprobanteTargetOrder = null;
    this.comprobanteDetalle = null;
    this.comprobanteError = '';
    this.comprobanteLoading = false;
    this.cdr.markForCheck();
  }

  protected async openComprobantePdf(): Promise<void> {
    if (!this.comprobanteTargetOrder || this.pdfLoading) return;

    const popup = window.open('', '_blank');
    if (!popup) {
      this.comprobanteError = 'El navegador bloqueo la ventana del PDF. Habilita ventanas emergentes para abrirlo.';
      this.cdr.markForCheck();
      return;
    }

    popup.document.write('<title>Generando PDF</title><p style="font-family:Arial,sans-serif">Generando comprobante...</p>');
    this.pdfLoading = true;
    this.comprobanteError = '';
    this.cdr.markForCheck();

    try {
      const pdf = await firstValueFrom(
        this.pedidosService.obtenerComprobantePdfPorPedido(this.comprobanteTargetOrder.idPedido).pipe(timeout(15000))
      );
      const pdfUrl = URL.createObjectURL(pdf);
      popup.location.href = pdfUrl;
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (error: unknown) {
      popup.close();
      this.comprobanteError = this.errorMessage(error, 'No se pudo abrir el PDF del comprobante.');
    } finally {
      this.pdfLoading = false;
      this.cdr.markForCheck();
    }
  }

  protected label(value: string | null | undefined): string {
    return (value || '').replaceAll('_', ' ');
  }

  protected money(value: number | string | null | undefined): string {
    const numberValue = Number(value ?? 0);
    return `S/ ${numberValue.toFixed(2)}`;
  }

  protected itemPrecioCobrado(item: ComprobanteDetalleResponse): string {
    return this.money(Number(item.precioUnitario ?? 0) - Number(item.descuentoUnitario ?? 0));
  }

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

  private errorMessage(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null) {
      return fallback;
    }
    const candidate = error as { error?: { mensaje?: unknown }; message?: unknown };
    if (typeof candidate.error?.mensaje === 'string' && candidate.error.mensaje.trim()) {
      return candidate.error.mensaje;
    }
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message;
    }
    return fallback;
  }
}
