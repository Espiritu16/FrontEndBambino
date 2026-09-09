import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { withCacheOptions } from '../../../core/http/cache-context.helpers';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { resolveBackendAssetUrl } from '../../../shared/utils/media-url.util';

type ConfiguracionMediaPublicResponse = {
  clave: string;
  url: string;
  activa: boolean;
};

@Component({
  selector: 'app-carta-page',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent],
  templateUrl: './carta.page.html',
  styleUrl: './carta.page.scss'
})
export class CartaPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = API_ENDPOINTS.public.configuracionMedia;
  private readonly cartaPdfCacheKey = 'bambino_carta_pdf_url';

  protected loading = true;
  protected pdfUrl = '';
  protected viewerUrl: SafeResourceUrl | '' = '';
  protected error = '';

  async ngOnInit(): Promise<void> {
    await this.loadCartaPdf();
  }

  protected async retry(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.pdfUrl = '';
    this.viewerUrl = '';
    await this.loadCartaPdf();
  }

  private async loadCartaPdf(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http
          .get<ConfiguracionMediaPublicResponse>(`${this.apiBase}/CARTA_PDF`, {
            context: withCacheOptions({ tags: ['media', 'menu'], ttlMs: 5 * 60 * 1000 })
          })
          .pipe(timeout(10000))
      );
      this.pdfUrl = data?.activa ? resolveBackendAssetUrl(data.url?.trim() || '') : '';
      if (this.pdfUrl) {
        localStorage.setItem(this.cartaPdfCacheKey, this.pdfUrl);
      }
      if (!this.pdfUrl) {
        this.error = 'No hay PDF de carta configurado.';
      } else {
        this.viewerUrl = this.buildViewerUrl(this.pdfUrl);
      }
    } catch {
      this.pdfUrl = resolveBackendAssetUrl(localStorage.getItem(this.cartaPdfCacheKey)?.trim() || '');
      if (!this.pdfUrl) {
        this.error = 'No se pudo cargar la carta PDF.';
      } else {
        this.viewerUrl = this.buildViewerUrl(this.pdfUrl);
      }
    } finally {
      this.loading = false;
      // Sin zone.js la vista no se entera de que terminó la carga.
      this.cdr.detectChanges();
    }
  }

  private buildViewerUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${url}#toolbar=1&view=FitH`);
  }
}
