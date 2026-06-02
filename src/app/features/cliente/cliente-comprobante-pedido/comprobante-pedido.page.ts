import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CheckoutStepperComponent } from '../../../shared/components/checkout-stepper/checkout-stepper.component';
import { ClienteCheckoutService, PedidoResponse } from '../cliente-checkout/cliente-checkout.service';

@Component({
  selector: 'app-comprobante-pedido-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent, CheckoutStepperComponent],
  templateUrl: './comprobante-pedido.page.html',
  styleUrl: './comprobante-pedido.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprobantePedidoPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkoutService = inject(ClienteCheckoutService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected error = '';
  protected pedido: PedidoResponse | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const idPedido = Number(params.get('idPedido') ?? 0);
      void this.cargarPedido(idPedido);
    });
  }

  protected formatMoney(value: number | null | undefined): string {
    return `S/ ${Number(value ?? 0).toFixed(2)}`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  private async cargarPedido(idPedido: number): Promise<void> {
    this.loading = true;
    this.error = '';
    this.pedido = null;
    if (!idPedido) {
      this.error = 'No se encontró el pedido.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    try {
      this.pedido = await firstValueFrom(this.checkoutService.obtenerPedido(idPedido).pipe(timeout(10000)));
    } catch {
      this.error = 'No se pudo cargar el comprobante del pedido.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
