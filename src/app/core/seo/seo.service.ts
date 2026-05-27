import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';

type SeoData = {
  title: string;
  description: string;
  indexable: boolean;
};

type RouteSeoConfig = {
  seo: SeoData;
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly siteName = 'Bambino Chicken';
  private readonly siteUrl = 'https://bambino.proyectoutp.com';
  private readonly defaultImage = `${this.siteUrl}/og-bambino-chicken.png`;

  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) {
        return;
      }
      this.applyForUrl(event.urlAfterRedirects || event.url);
    });

    this.applyForUrl(this.router.url || '/inicio');
  }

  private applyForUrl(url: string): void {
    const cleanUrl = this.normalizeUrl(url);
    const seoData = this.resolveSeoData(cleanUrl);
    const absoluteUrl = `${this.siteUrl}${cleanUrl}`;

    this.title.setTitle(seoData.title);
    this.meta.updateTag({ name: 'description', content: seoData.description });
    this.meta.updateTag({ name: 'robots', content: seoData.indexable ? 'index,follow' : 'noindex,nofollow' });

    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: seoData.title });
    this.meta.updateTag({ property: 'og:description', content: seoData.description });
    this.meta.updateTag({ property: 'og:url', content: absoluteUrl });
    this.meta.updateTag({ property: 'og:image', content: this.defaultImage });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: seoData.title });
    this.meta.updateTag({ name: 'twitter:description', content: seoData.description });
    this.meta.updateTag({ name: 'twitter:image', content: this.defaultImage });

    this.setCanonical(absoluteUrl);
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private normalizeUrl(url: string): string {
    const [pathOnly] = (url || '/').split(/[?#]/, 1);
    const trimmed = (pathOnly || '/').trim();
    if (!trimmed || trimmed === '/') {
      return '/inicio';
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  private resolveSeoData(path: string): SeoData {
    const routeData = this.getCurrentRouteData();
    const routeSeo = this.extractSeoData(routeData);
    if (routeSeo) {
      return routeSeo;
    }

    if (path.startsWith('/admin') || this.isPrivatePath(path)) {
      return {
        title: `${this.siteName} | Acceso privado`,
        description: 'Seccion privada de Bambino Chicken.',
        indexable: false
      };
    }

    return {
      title: `${this.siteName} | Inicio`,
      description: 'Bambino Chicken: promociones, carta digital y pedidos online de polleria y delivery.',
      indexable: true
    };
  }

  private isPrivatePath(path: string): boolean {
    const privatePaths = [
      '/login',
      '/registro',
      '/recuperacion-clave',
      '/carrito',
      '/checkout',
      '/mis-pedidos',
      '/detalle-pedido',
      '/perfil',
      '/direcciones',
      '/pago-pedido',
      '/comprobante-pedido',
      '/cocina-panel',
      '/producto-detalle/'
    ];
    return privatePaths.some((privatePath) => path.startsWith(privatePath));
  }

  private getCurrentRouteData(): Record<string, unknown> | undefined {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data;
  }

  private extractSeoData(data: Record<string, unknown> | undefined): SeoData | null {
    const routeConfig = data as RouteSeoConfig | undefined;
    const seo = routeConfig?.seo;
    if (!seo) {
      return null;
    }
    return {
      title: seo.title,
      description: seo.description,
      indexable: seo.indexable
    };
  }
}
