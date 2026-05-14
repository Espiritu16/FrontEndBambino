import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { firstValueFrom, timeout } from 'rxjs';
import { withCacheOptions } from '../../../core/http/cache-context.helpers';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PlannedFeatureModalComponent } from '../../../shared/components/planned-feature-modal/planned-feature-modal.component';

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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = 'http://localhost:8080/api/public/configuracion/media';
  private readonly catalogoApiBase = 'http://localhost:8080/api/public/catalogo';
  private readonly heroCacheKey = 'HOME_HERO_BANNER_URL';
  private readonly cartaPdfCacheKey = 'bambino_carta_pdf_url';

  protected heroImageUrl = '';
  protected loadingMasPedidos = false;
  protected promocionesMasPedidos: ProductoResponse[] = [];
  protected masPedidosIds = new Set<number>();
  protected showPlannedFeatureModal = false;

  ngOnInit(): void {
    this.restoreCachedHeroImage();
    void this.loadHeroImage();
    void this.loadPromocionesMasPedidos();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => event.urlAfterRedirects.startsWith('/inicio')),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        void this.loadHeroImage();
        void this.loadPromocionesMasPedidos();
      });
  }

  private async loadPromocionesMasPedidos(): Promise<void> {
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
      this.promocionesMasPedidos = (data ?? []).slice(0, 4);
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
      this.cacheHeroImageUrl(resolvedUrl);
      this.cdr.detectChanges();
    } catch {
      // Mantiene la última imagen válida si hay fallo temporal de red/API.
      this.cdr.detectChanges();
    }
  }

  protected onHeroImageError(): void {
    this.heroImageUrl = '';
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
      targetUrl = data?.activa ? (data.url?.trim() || '') : '';
      if (targetUrl) {
        localStorage.setItem(this.cartaPdfCacheKey, targetUrl);
      }
    } catch {
      targetUrl = localStorage.getItem(this.cartaPdfCacheKey)?.trim() || '';
    }

    if (!targetUrl) {
      return;
    }

    const viewerUrl = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(targetUrl)}`;
    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
  }

  private restoreCachedHeroImage(): void {
    try {
      this.heroImageUrl = localStorage.getItem(this.heroCacheKey)?.trim() || '';
    } catch {
      this.heroImageUrl = '';
    }
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
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    const token = versionTag?.trim() || Date.now().toString();
    return `${url}${separator}cb=${encodeURIComponent(token)}`;
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

  protected onPedirAhoraClick(event: Event): void {
    event.preventDefault();
    this.showPlannedFeatureModal = true;
  }

  protected closePlannedFeatureModal(): void {
    this.showPlannedFeatureModal = false;
  }
}
