import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { withCacheOptions } from '../../../core/http/cache-context.helpers';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PlannedFeatureModalComponent } from '../../../shared/components/planned-feature-modal/planned-feature-modal.component';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { resolveBackendAssetUrl } from '../../../shared/utils/media-url.util';
import { InicioDataCacheService } from './inicio-data-cache.service';

type ConfiguracionMediaResponse = {
  clave: string;
  url: string;
  activa: boolean;
  versionTag?: string | null;
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
  selector: 'app-inicio-page',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, PlannedFeatureModalComponent],
  templateUrl: './inicio.page.html',
  styleUrl: './inicio.page.scss'
})
export class InicioPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly inicioCache = inject(InicioDataCacheService);
  private readonly apiBase = API_ENDPOINTS.public.configuracionMedia;
  private readonly catalogoApiBase = API_ENDPOINTS.public.catalogo;
  private readonly heroCacheKey = 'HOME_HERO_BANNER_URL';
  private readonly cartaPdfCacheKey = 'bambino_carta_pdf_url';

  protected heroImageUrl = '';
  protected loadingMasPedidos = false;
  protected promocionesMasPedidos: ProductoResponse[] = [];
  protected masPedidosIds = new Set<number>();
  protected showPlannedFeatureModal = false;

  ngOnInit(): void {
    this.restoreCachedHeroImage();
    this.restoreCachedMasPedidos();
    void this.loadHeroImage();
    void this.loadPromocionesMasPedidos();
  }

  private async loadPromocionesMasPedidos(): Promise<void> {
    const cached = this.inicioCache.getMasPedidos();
    if (cached) {
      this.promocionesMasPedidos = cached.slice(0, 3);
      this.masPedidosIds = new Set(this.promocionesMasPedidos.map((p) => p.idProducto));
      this.loadingMasPedidos = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingMasPedidos = true;
    this.cdr.detectChanges();
    try {
      const data = await firstValueFrom(
        this.http
          .get<ProductoResponse[]>(`${this.catalogoApiBase}/productos?filtro=mas-pedidos`, {
            context: withCacheOptions({ tags: ['menu', 'promotions'], ttlMs: 10 * 60 * 1000 })
          })
          .pipe(timeout(10000))
      );
      this.promocionesMasPedidos = (data ?? []).slice(0, 3);
      this.inicioCache.setMasPedidos(this.promocionesMasPedidos);
      this.masPedidosIds = new Set(this.promocionesMasPedidos.map((p) => p.idProducto));
      this.cdr.detectChanges();
    } catch {
      this.promocionesMasPedidos = [];
      this.masPedidosIds.clear();
    } finally {
      this.loadingMasPedidos = false;
      this.cdr.detectChanges();
    }
  }

  private async loadHeroImage(): Promise<void> {
    const cachedHero = this.inicioCache.getHeroImageUrl();
    if (cachedHero) {
      this.heroImageUrl = cachedHero;
      this.cdr.detectChanges();
      return;
    }

    try {
      const data = await firstValueFrom(
        this.http
          .get<ConfiguracionMediaResponse>(`${this.apiBase}/HOME_HERO_BANNER`, {
            context: withCacheOptions({ tags: ['media'], ttlMs: 5 * 60 * 1000 })
          })
          .pipe(timeout(10000))
      );
      const resolvedUrl = data?.activa ? this.buildRenderableUrl(data.url?.trim() || '', data.versionTag ?? null) : '';
      this.heroImageUrl = resolvedUrl;
      if (resolvedUrl) {
        this.inicioCache.setHeroImageUrl(resolvedUrl);
      }
      this.cacheHeroImageUrl(resolvedUrl);
      this.cdr.detectChanges();
    } catch {
      // Mantiene la última imagen válida si hay fallo temporal de red/API.
      this.cdr.detectChanges();
    }
  }

  protected onHeroImageError(): void {
    this.heroImageUrl = '';
    this.inicioCache.clearHeroImageUrl();
    this.cacheHeroImageUrl('');
    this.cdr.detectChanges();
  }

  protected async openCartaPdf(event?: Event): Promise<void> {
    event?.preventDefault();
    let targetUrl = '';
    try {
      const data = await firstValueFrom(
        this.http
          .get<ConfiguracionMediaResponse>(`${this.apiBase}/CARTA_PDF`, {
            context: withCacheOptions({ tags: ['media'], ttlMs: 5 * 60 * 1000 })
          })
          .pipe(timeout(10000))
      );
      targetUrl = data?.activa ? resolveBackendAssetUrl(data.url?.trim() || '') : '';
      if (targetUrl) {
        localStorage.setItem(this.cartaPdfCacheKey, targetUrl);
      }
    } catch {
      targetUrl = resolveBackendAssetUrl(localStorage.getItem(this.cartaPdfCacheKey)?.trim() || '');
    }

    if (!targetUrl) {
      return;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  private restoreCachedHeroImage(): void {
    const cachedHero = this.inicioCache.getHeroImageUrl();
    if (cachedHero) {
      this.heroImageUrl = cachedHero;
      return;
    }
    try {
      this.heroImageUrl = localStorage.getItem(this.heroCacheKey)?.trim() || '';
      if (this.heroImageUrl) {
        this.inicioCache.setHeroImageUrl(this.heroImageUrl);
      }
    } catch {
      this.heroImageUrl = '';
    }
  }

  private restoreCachedMasPedidos(): void {
    const cached = this.inicioCache.getMasPedidos();
    if (!cached) return;
    this.promocionesMasPedidos = cached.slice(0, 3);
    this.masPedidosIds = new Set(this.promocionesMasPedidos.map((p) => p.idProducto));
    this.loadingMasPedidos = false;
  }

  private cacheHeroImageUrl(value: string): void {
    try {
      if (value) {
        localStorage.setItem(this.heroCacheKey, value);
      } else {
        localStorage.removeItem(this.heroCacheKey);
      }
    } catch {
      // Ignora errores de storage en entornos restringidos.
    }
  }

  private buildRenderableUrl(url: string, versionTag: string | null): string {
    const resolved = resolveBackendAssetUrl(url);
    if (!resolved) return '';
    const token = versionTag?.trim() || '';
    if (!token) {
      return resolved;
    }
    const separator = resolved.includes('?') ? '&' : '?';
    return `${resolved}${separator}cb=${encodeURIComponent(token)}`;
  }

  protected toSlug(nombre: string): string {
    return (nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  protected isMasPedido(idProducto: number): boolean {
    return this.masPedidosIds.has(idProducto);
  }

  protected resolveCardImageUrl(rawUrl: string | null): string {
    return resolveBackendAssetUrl(rawUrl);
  }

  protected onPedirAhoraClick(event: Event): void {
    event.preventDefault();
    this.showPlannedFeatureModal = true;
  }

  protected closePlannedFeatureModal(): void {
    this.showPlannedFeatureModal = false;
  }
}
