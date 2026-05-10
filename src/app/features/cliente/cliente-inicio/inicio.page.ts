import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { firstValueFrom, timeout } from 'rxjs';

type ConfiguracionMediaResponse = {
  clave: string;
  url: string;
  activa: boolean;
  versionTag?: string | null;
};

@Component({
  selector: 'app-inicio-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio.page.html',
  styleUrl: './inicio.page.scss'
})
export class InicioPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = 'http://localhost:8080/api/public/configuracion/media';
  private readonly heroCacheKey = 'HOME_HERO_BANNER_URL';

  protected heroImageUrl = '';

  ngOnInit(): void {
    this.restoreCachedHeroImage();
    void this.loadHeroImage();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => event.urlAfterRedirects.startsWith('/inicio')),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        void this.loadHeroImage();
      });
  }

  private async loadHeroImage(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<ConfiguracionMediaResponse>(`${this.apiBase}/HOME_HERO_BANNER`).pipe(timeout(10000))
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
}
