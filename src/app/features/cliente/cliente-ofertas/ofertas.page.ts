import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { withCacheOptions } from '../../../core/http/cache-context.helpers';
import { runWithUiRefresh, scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { matchesSearchQuery } from '../../../shared/utils/search-match.util';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { resolveBackendAssetUrl } from '../../../shared/utils/media-url.util';
import { ToastService } from '../../../shared/services/toast.service';
import { ClienteCarritoService } from '../cliente-carrito/cliente-carrito.service';

interface CategoriaResponse {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  ordenVisual: number;
  activa: boolean;
}

interface ProductoResponse {
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
  precioFinal?: number | null;
  descuentoAplicado?: number | null;
  idOfertaActiva?: number | null;
  ofertaNombre?: string | null;
  ofertaTipo?: string | null;
}

@Component({
  selector: 'app-ofertas-page',
  standalone: true,
  imports: [LoadingSpinnerComponent, RouterLink, ConfirmModalComponent],
  templateUrl: './ofertas.page.html',
  styleUrl: './ofertas.page.scss'
})
export class OfertasPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly carritoService = inject(ClienteCarritoService);
  private readonly toast = inject(ToastService);
  private readonly apiBase = API_ENDPOINTS.public.catalogo;
  private readonly authStorageKey = 'bambino_basic_auth';
  private readonly tones = ['beige', 'mint', 'sky', 'sand'] as const;
  @ViewChild('resultsStart') private resultsStartEl?: ElementRef<HTMLElement>;

  protected categories: string[] = ['Todo', 'Más pedidos'];
  protected categoryMap = new Map<string, number>();

  protected selectedCategory = 'Todo';
  protected loading = false;
  protected error = '';
  protected allProductos: ProductoResponse[] = [];
  protected masPedidosCache: ProductoResponse[] = [];
  protected masPedidosIds = new Set<number>();
  protected masPedidosLoaded = false;
  protected productos: ProductoResponse[] = [];
  protected addingProductId: number | null = null;
  protected showLoginRequiredModal = false;
  protected searchQuery = '';
  private pendingFilterFromQuery: string | null = null;

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((params) => {
      this.searchQuery = (params.get('q') ?? '').trim();
      this.pendingFilterFromQuery = (params.get('filtro') ?? params.get('filter') ?? '').trim() || null;
      this.applyLocalFilter();
      this.scheduleScrollToResultsStart();
    });
    await this.loadCategorias();
    await this.loadProductosIniciales();
    this.applyFilterFromQueryParam();
    void this.preloadMasPedidos();
  }

  protected async onSelectCategory(category: string): Promise<void> {
    if (category === this.selectedCategory && category !== 'Todo') {
      this.selectedCategory = 'Todo';
      this.applyLocalFilter();
      this.scheduleScrollToResultsStart();
      return;
    }
    this.selectedCategory = category;
    if (category === 'Más pedidos') {
      if (this.masPedidosLoaded) {
        this.error = '';
        this.productos = [...this.masPedidosCache];
        this.scheduleScrollToResultsStart();
        return;
      }
      await this.loadMasPedidos();
      this.scheduleScrollToResultsStart();
      return;
    }
    this.error = '';
    this.applyLocalFilter();
    this.scheduleScrollToResultsStart();
  }

  protected badgeFor(producto: ProductoResponse): string | undefined {
    if ((producto.descuentoAplicado ?? 0) > 0) return producto.ofertaNombre || 'Oferta';
    if (this.masPedidosIds.has(producto.idProducto)) return 'Más pedido';
    return undefined;
  }

  protected precioVigente(producto: ProductoResponse): number {
    return Number(producto.precioFinal ?? producto.precioBase ?? 0);
  }

  protected tieneOferta(producto: ProductoResponse): boolean {
    return Number(producto.descuentoAplicado ?? 0) > 0 && this.precioVigente(producto) < Number(producto.precioBase ?? 0);
  }

  protected get sectionTitle(): string {
    if (this.selectedCategory === 'Todo') return 'Nuestra carta';
    return this.selectedCategory;
  }

  protected toneFor(index: number): 'sky' | 'beige' | 'mint' | 'sand' {
    return this.tones[index % this.tones.length];
  }

  protected resolveCardImageUrl(rawUrl: string | null): string {
    return resolveBackendAssetUrl(rawUrl);
  }

  protected toSlug(nombre: string): string {
    return (nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  protected async onAgregarClick(event: Event, producto: ProductoResponse): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (this.addingProductId === producto.idProducto) return;

    const token = localStorage.getItem(this.authStorageKey)?.trim();
    if (!token) {
      this.showLoginRequiredModal = true;
      return;
    }

    this.addingProductId = producto.idProducto;

    try {
      await firstValueFrom(this.carritoService.agregarItem({
        idProducto: producto.idProducto,
        cantidad: 1,
        observacion: null
      }).pipe(timeout(10000)));
      this.toast.success('Producto agregado al carrito.');
    } catch {
      this.toast.error('No se pudo agregar el producto al carrito.');
    } finally {
      this.addingProductId = null;
      this.cdr.detectChanges();
    }
  }

  protected closeLoginRequiredModal(): void {
    this.showLoginRequiredModal = false;
  }

  protected confirmLoginRequiredModal(): void {
    this.showLoginRequiredModal = false;
    void this.router.navigate(['/login']);
  }

  private async loadProductosIniciales(): Promise<void> {
    await runWithUiRefresh(async () => {
      this.loading = true;
      this.error = '';
      try {
        const data = await firstValueFrom(
          this.http.get<ProductoResponse[]>(`${this.apiBase}/productos`, {
            context: withCacheOptions({ tags: ['menu', 'promotions'], ttlMs: 3 * 60 * 1000 })
          })
        );
        this.allProductos = data ?? [];
        this.applyLocalFilter();
      } catch {
        this.error = 'No se pudo cargar productos.';
        this.allProductos = [];
        this.productos = [];
      } finally {
        this.loading = false;
      }
    }, this.zone, this.cdr);
  }

  private applyLocalFilter(): void {
    const pool = this.selectedCategory === 'Más pedidos'
      ? this.masPedidosCache
      : this.allProductos;

    const idCategoria = this.categoryMap.get(this.selectedCategory);
    const byCategory = this.selectedCategory !== 'Todo' && this.selectedCategory !== 'Más pedidos' && !!idCategoria
      ? pool.filter((p) => p.idCategoria === idCategoria)
      : pool;

    this.productos = byCategory.filter((p) =>
      matchesSearchQuery(this.searchQuery, [p.nombre, p.descripcion, p.categoriaNombre])
    );
  }

  private async loadMasPedidos(): Promise<void> {
    await runWithUiRefresh(async () => {
      this.loading = true;
      this.error = '';
      try {
        const data = await firstValueFrom(
          this.http.get<ProductoResponse[]>(`${this.apiBase}/productos?filtro=mas-pedidos`, {
            context: withCacheOptions({ tags: ['menu', 'promotions'], ttlMs: 10 * 60 * 1000 })
          })
        );
        this.masPedidosCache = data ?? [];
        this.syncMasPedidosIds();
        this.masPedidosLoaded = true;
        this.applyLocalFilter();
      } catch {
        this.error = 'No se pudo cargar productos.';
        this.productos = [];
      } finally {
        this.loading = false;
      }
    }, this.zone, this.cdr);
  }

  private async preloadMasPedidos(): Promise<void> {
    if (this.masPedidosLoaded) {
      return;
    }

    try {
      const data = await firstValueFrom(
        this.http.get<ProductoResponse[]>(`${this.apiBase}/productos?filtro=mas-pedidos`, {
          context: withCacheOptions({ tags: ['menu', 'promotions'], ttlMs: 10 * 60 * 1000 })
        })
      );
      this.masPedidosCache = data ?? [];
      this.syncMasPedidosIds();
      this.masPedidosLoaded = true;
    } catch {
      // Si falla la precarga, se intentará nuevamente al primer click en "Más pedidos".
    }
  }

  private async loadCategorias(): Promise<void> {
    await runWithUiRefresh(async () => {
      try {
        const categorias = await firstValueFrom(
          this.http.get<CategoriaResponse[]>(`${this.apiBase}/categorias`, {
            context: withCacheOptions({ tags: ['menu'], ttlMs: 5 * 60 * 1000 })
          })
        );
        const nombresOrdenados = (categorias ?? [])
          .filter(c => !!c?.activa)
          .sort((a, b) => (a.ordenVisual ?? 0) - (b.ordenVisual ?? 0))
          .map(c => ({ id: c.idCategoria, nombre: (c.nombre ?? '').trim() }))
          .filter(c => !!c.nombre);

        this.categoryMap.clear();
        for (const c of nombresOrdenados) {
          this.categoryMap.set(c.nombre, c.id);
        }
        this.categories = ['Todo', 'Más pedidos', ...nombresOrdenados.map(c => c.nombre)];
      } catch {
        this.categories = ['Todo', 'Más pedidos'];
        this.categoryMap.clear();
      }
    }, this.zone, this.cdr);
  }

  private scheduleScrollToResultsStart(): void {
    requestAnimationFrame(() => this.scrollToResultsStart());
    scheduleUiRefresh(this.zone, this.cdr);
  }

  private scrollToResultsStart(): void {
    if (!this.resultsStartEl) {
      return;
    }

    const isMobile = window.innerWidth <= 820;
    const topbarHeight = isMobile ? 56 : 78;
    const filtersHeight = isMobile ? 68 : 74;
    const sectionTitleHeight = 90;
    const offset = topbarHeight + filtersHeight + sectionTitleHeight + 10;

    const targetTop = this.resultsStartEl.nativeElement.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }

  private syncMasPedidosIds(): void {
    this.masPedidosIds = new Set(this.masPedidosCache.map((p) => p.idProducto));
  }

  private applyFilterFromQueryParam(): void {
    const target = (this.pendingFilterFromQuery ?? '').trim().toLowerCase();
    if (!target) return;
    const match = this.categories.find((c) => c.trim().toLowerCase() === target);
    if (!match) return;
    this.selectedCategory = match;
    this.applyLocalFilter();
    this.scheduleScrollToResultsStart();
  }
}
