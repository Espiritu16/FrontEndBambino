import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, of, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { PlannedFeatureModalComponent } from '../../../shared/components/planned-feature-modal/planned-feature-modal.component';
import { withoutCache } from '../../../core/http/cache-context.helpers';

type ProductoResponse = {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number | null;
  categoriaNombre: string | null;
  precioBase: number;
  visibleWeb: boolean;
  disponible: boolean;
  estado: string;
  imagenUrl: string | null;
  ordenVisual: number;
};

type Extra = {
  idProducto: number;
  nombre: string;
  precio: number;
  cantidad: number;
};

@Component({
  selector: 'app-productodetalle-page',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, ConfirmModalComponent, PlannedFeatureModalComponent],
  templateUrl: './productodetalle.page.html',
  styleUrl: './productodetalle.page.scss'
})
export class ProductoDetallePageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = 'https://backendbambino.onrender.com/api/public/catalogo';

  protected loading = true;
  protected error = '';
  protected cantidad = 1;
  protected producto: ProductoResponse | null = null;
  protected slugActual = '';
  protected extras: Extra[] = [];
  protected esMasPedido = false;
  protected isClearExtrasConfirmOpen = false;
  protected showPlannedFeatureModal = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (params) => {
        const slugParam = (params.get('slug') || '').trim();
        const idParam = (params.get('idProducto') || '').trim();
        const idProducto = idParam ? Number(idParam) : NaN;

        if (!slugParam && (Number.isNaN(idProducto) || idProducto <= 0)) {
          this.error = 'Producto inválido.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.slugActual = slugParam;
        await this.loadDetalle(slugParam, idProducto);
      });
  }

  protected onCantidadDelta(delta: number): void {
    const next = this.cantidad + delta;
    this.cantidad = next < 1 ? 1 : next;
  }

  protected onExtraDelta(index: number, delta: number): void {
    const item = this.extras[index];
    if (!item) return;
    const next = item.cantidad + delta;
    item.cantidad = next < 0 ? 0 : next;
  }

  protected addExtraOnce(index: number): void {
    this.onExtraDelta(index, 1);
  }

  protected onExtraDeltaById(idProducto: number, delta: number): void {
    const index = this.extras.findIndex((e) => e.idProducto === idProducto);
    if (index < 0) return;
    this.onExtraDelta(index, delta);
  }

  protected clearExtrasSelection(): void {
    for (const item of this.extras) {
      item.cantidad = 0;
    }
  }

  protected removeSelectedExtra(idProducto: number): void {
    const item = this.extras.find((e) => e.idProducto === idProducto);
    if (!item) return;
    item.cantidad = 0;
  }

  protected openClearExtrasConfirm(): void {
    if (!this.hasExtrasSelection) return;
    this.isClearExtrasConfirmOpen = true;
  }

  protected closeClearExtrasConfirm(): void {
    this.isClearExtrasConfirmOpen = false;
  }

  protected confirmClearExtras(): void {
    this.clearExtrasSelection();
    this.isClearExtrasConfirmOpen = false;
  }

  protected get hasExtrasSelection(): boolean {
    return this.extras.some((e) => e.cantidad > 0);
  }

  protected get selectedExtras(): Extra[] {
    return this.extras.filter((e) => e.cantidad > 0);
  }

  protected get extrasItemsCount(): number {
    return this.extras.reduce((acc, e) => acc + e.cantidad, 0);
  }

  protected get extrasSubtotal(): number {
    return this.extras.reduce((acc, e) => acc + (e.precio * e.cantidad), 0);
  }

  protected get totalEstimado(): number {
    const baseTotal = (this.producto?.precioBase ?? 0) * this.cantidad;
    return baseTotal + this.extrasSubtotal;
  }

  protected resolveCardImageUrl(rawUrl: string | null): string {
    const source = (rawUrl ?? '').trim();
    if (!source) return '';
    try {
      const parsed = new URL(source);
      const marker = '/image/upload/';
      if (!parsed.hostname.includes('res.cloudinary.com') || !parsed.pathname.includes(marker)) {
        return source;
      }

      const [prefix, suffix] = parsed.pathname.split(marker);
      const transform = 'f_auto,q_auto:good,dpr_auto,c_fit,w_1400,h_840';
      parsed.pathname = `${prefix}${marker}${transform}/${suffix}`;
      return parsed.toString();
    } catch {
      return source;
    }
  }

  protected onAgregarPedidoClick(event: Event): void {
    event.preventDefault();
    this.showPlannedFeatureModal = true;
  }

  protected closePlannedFeatureModal(): void {
    this.showPlannedFeatureModal = false;
  }

  private async loadDetalle(slug: string, idProducto: number): Promise<void> {
    this.loading = true;
    this.error = '';
    this.producto = null;
    this.extras = [];
    this.esMasPedido = false;

    try {
      const productoRequest = Number.isFinite(idProducto) && idProducto > 0
        ? this.http.get<ProductoResponse>(`${this.apiBase}/productos/${idProducto}`, {
            context: withoutCache()
          }).pipe(timeout(10000))
        : this.http.get<ProductoResponse>(`${this.apiBase}/productos/slug/${encodeURIComponent(slug)}`, {
            context: withoutCache()
          }).pipe(timeout(10000));

      const adicionalesRequest = this.http
        .get<ProductoResponse[]>(`${this.apiBase}/productos-adicionales`, {
          context: withoutCache()
        })
        .pipe(
          timeout(10000),
          catchError(() => of([] as ProductoResponse[]))
        );

      const masPedidosRequest = this.http
        .get<ProductoResponse[]>(`${this.apiBase}/productos?filtro=mas-pedidos`, {
          context: withoutCache()
        })
        .pipe(
          timeout(10000),
          catchError(() => of([] as ProductoResponse[]))
        );

      const [productoRaw, adicionalesRaw, masPedidosRaw] = await Promise.all([
        firstValueFrom(productoRequest),
        firstValueFrom(adicionalesRequest),
        firstValueFrom(masPedidosRequest)
      ]);

      const producto = this.esProductoValido(productoRaw) ? productoRaw : null;
      const adicionales = (adicionalesRaw ?? []).filter((p) => this.esProductoValido(p));

      this.producto = producto;
      this.extras = adicionales
        .map((p) => ({
          idProducto: p.idProducto,
          nombre: p.nombre,
          precio: p.precioBase ?? 0,
          cantidad: 0
        }))
        .sort((a, b) => (a.precio - b.precio) || a.nombre.localeCompare(b.nombre));

      if (!this.producto) {
        this.error = 'No se encontró el producto solicitado.';
        return;
      }

      const idsMasPedidos = new Set(
        (masPedidosRaw ?? [])
          .filter((p) => this.esProductoValido(p))
          .map((p) => p.idProducto)
      );
      this.esMasPedido = idsMasPedidos.has(this.producto.idProducto);

      const slugCanonico = this.toSlug(this.producto.nombre);
      if (slugCanonico && slugCanonico !== this.slugActual) {
        void this.router.navigate(['/producto-detalle', this.producto.idProducto, slugCanonico], { replaceUrl: true });
      }
    } catch {
      this.error = 'No se pudo cargar el detalle del producto.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private toSlug(nombre: string): string {
    return (nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private esProductoValido(payload: unknown): payload is ProductoResponse {
    if (!payload || typeof payload !== 'object') return false;
    const p = payload as Partial<ProductoResponse>;
    return typeof p.idProducto === 'number' && Number.isFinite(p.idProducto) && p.idProducto > 0;
  }
}
