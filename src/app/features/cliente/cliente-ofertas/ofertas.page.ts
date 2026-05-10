import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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
  templateUrl: './ofertas.page.html',
  styleUrl: './ofertas.page.scss'
})
export class OfertasPageComponent {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = 'http://localhost:8080/api/public/catalogo';
  private readonly tones = ['beige', 'mint', 'sky', 'sand'] as const;

  protected categories: string[] = ['Todo', 'Más pedidos'];
  protected categoryMap = new Map<string, number>();

  protected selectedCategory = 'Todo';
  protected loading = false;
  protected error = '';
  protected allProductos: ProductoResponse[] = [];
  protected masPedidosCache: ProductoResponse[] = [];
  protected masPedidosLoaded = false;
  protected productos: ProductoResponse[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadCategorias();
    await this.loadProductosIniciales();
  }

  protected async onSelectCategory(category: string): Promise<void> {
    if (category === this.selectedCategory && category !== 'Todo') {
      this.selectedCategory = 'Todo';
      this.applyLocalFilter();
      return;
    }
    this.selectedCategory = category;
    if (category === 'Más pedidos') {
      if (this.masPedidosLoaded) {
        this.error = '';
        this.productos = [...this.masPedidosCache];
        return;
      }
      await this.loadMasPedidos();
      return;
    }
    this.error = '';
    this.applyLocalFilter();
  }

  protected badgeFor(index: number): string | undefined {
    if (this.selectedCategory === 'Más pedidos' && index === 0) return 'Más pedido';
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

  private async loadProductosIniciales(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const data = await firstValueFrom(this.http.get<ProductoResponse[]>(`${this.apiBase}/productos`));
      this.allProductos = data ?? [];
      this.applyLocalFilter();
    } catch {
      this.error = 'No se pudo cargar productos.';
      this.allProductos = [];
      this.productos = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private applyLocalFilter(): void {
    if (this.selectedCategory === 'Todo') {
      this.productos = [...this.allProductos];
      return;
    }
    const idCategoria = this.categoryMap.get(this.selectedCategory);
    if (!idCategoria) {
      this.productos = [...this.allProductos];
      return;
    }
    this.productos = this.allProductos.filter((p) => p.idCategoria === idCategoria);
  }

  private async loadMasPedidos(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const data = await firstValueFrom(this.http.get<ProductoResponse[]>(`${this.apiBase}/productos?filtro=mas-pedidos`));
      this.masPedidosCache = data ?? [];
      this.masPedidosLoaded = true;
      this.productos = [...this.masPedidosCache];
    } catch {
      this.error = 'No se pudo cargar productos.';
      this.productos = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadCategorias(): Promise<void> {
    try {
      const categorias = await firstValueFrom(
        this.http.get<CategoriaResponse[]>(`${this.apiBase}/categorias`)
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
    } finally {
      this.cdr.detectChanges();
    }
  }
}
