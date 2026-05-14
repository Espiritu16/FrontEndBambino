import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PlannedFeatureModalComponent } from '../../../shared/components/planned-feature-modal/planned-feature-modal.component';
import { withCacheOptions } from '../../../core/http/cache-context.helpers';
import { runWithUiRefresh, scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { matchesSearchQuery } from '../../../shared/utils/search-match.util';

type CategoriaResponse = {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  ordenVisual: number;
  activa: boolean;
};

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

@Component({
  selector: 'app-ofertas-page',
  standalone: true,
  imports: [LoadingSpinnerComponent, RouterLink, PlannedFeatureModalComponent],
  templateUrl: './ofertas.page.html',
  styleUrl: './ofertas.page.scss'
})
export class OfertasPageComponent {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly apiBase = 'http://localhost:8080/api/public/catalogo';
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
  protected showPlannedFeatureModal = false;
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
    if (this.masPedidosIds.has(producto.idProducto)) return 'Más pedido';
    return undefined;
  }

  protected get sectionTitle(): string {
    if (this.selectedCategory === 'Todo') return 'Nuestra carta';
    return this.selectedCategory;
  }

  protected toneFor(index: number): 'sky' | 'beige' | 'mint' | 'sand' {
    return this.tones[index % this.tones.length];
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
      const transform = 'f_auto,q_auto:good,dpr_auto,c_fill,g_auto,w_1000,h_620';
      parsed.pathname = `${prefix}${marker}${transform}/${suffix}`;
      return parsed.toString();
    } catch {
      return source;
    }
  }

  protected toSlug(nombre: string): string {
    return (nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  protected onAgregarClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.showPlannedFeatureModal = true;
  }

  protected closePlannedFeatureModal(): void {
    this.showPlannedFeatureModal = false;
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
