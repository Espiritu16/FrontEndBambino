import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CheckoutStepperComponent } from '../../../shared/components/checkout-stepper/checkout-stepper.component';
import { ToastService } from '../../../shared/services/toast.service';
import { resolveBackendAssetUrl } from '../../../shared/utils/media-url.util';
import { CarritoItem, CarritoResumen, ClienteCarritoService } from './cliente-carrito.service';

@Component({
  selector: 'app-carrito-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent, CheckoutStepperComponent],
  templateUrl: './carrito.page.html',
  styleUrl: './carrito.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarritoPageComponent implements OnInit {
  private readonly carritoService = inject(ClienteCarritoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected carrito: CarritoResumen | null = null;
  protected loading = true;
  protected error = '';
  protected updatingItemId: number | null = null;
  protected clearing = false;

  ngOnInit(): void {
    this.cargarCarrito();
  }

  protected get items(): CarritoItem[] {
    return this.carrito?.items ?? [];
  }

  protected get hasItems(): boolean {
    return this.items.length > 0;
  }

  protected cargarCarrito(): void {
    this.loading = true;
    this.error = '';

    this.carritoService.obtenerCarrito()
      .pipe(timeout(10000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (carrito) => {
          this.carrito = carrito;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar tu carrito.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  protected async cambiarCantidad(item: CarritoItem, delta: number): Promise<void> {
    const nextCantidad = Math.round((Number(item.cantidad) + delta) * 1000) / 1000;
    if (nextCantidad < 1) {
      await this.quitarItem(item);
      return;
    }

    this.updatingItemId = item.idCarritoItem;
    this.error = '';

    try {
      this.carrito = await firstValueFrom(
        this.carritoService.actualizarItem(item.idCarritoItem, {
          cantidad: nextCantidad,
          observacion: item.observacion
        }).pipe(timeout(10000))
      );
    } catch {
      this.error = 'No se pudo actualizar la cantidad.';
      this.toast.error(this.error);
    } finally {
      this.updatingItemId = null;
      this.cdr.markForCheck();
    }
  }

  protected async quitarItem(item: CarritoItem): Promise<void> {
    this.updatingItemId = item.idCarritoItem;
    this.error = '';

    try {
      this.carrito = await firstValueFrom(this.carritoService.quitarItem(item.idCarritoItem).pipe(timeout(10000)));
      this.toast.success('Producto retirado del carrito.');
    } catch {
      this.error = 'No se pudo retirar el producto.';
      this.toast.error(this.error);
    } finally {
      this.updatingItemId = null;
      this.cdr.markForCheck();
    }
  }

  protected async vaciarCarrito(): Promise<void> {
    if (!this.hasItems || this.clearing) return;

    this.clearing = true;
    this.error = '';

    try {
      this.carrito = await firstValueFrom(this.carritoService.vaciarCarrito().pipe(timeout(10000)));
      this.toast.success('Carrito vaciado.');
    } catch {
      this.error = 'No se pudo vaciar el carrito.';
      this.toast.error(this.error);
    } finally {
      this.clearing = false;
      this.cdr.markForCheck();
    }
  }

  protected continueToCheckout(): void {
    if (!this.hasItems) return;
    void this.router.navigate(['/checkout']);
  }

  protected formatMoney(value: number | null | undefined): string {
    return `S/ ${Number(value ?? 0).toFixed(2)}`;
  }

  protected resolveItemImageUrl(item: CarritoItem): string {
    return resolveBackendAssetUrl(item.imagenUrl);
  }
}
