import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

type ConfiguracionMediaPublicResponse = {
  clave: string;
  url: string;
  activa: boolean;
};

@Component({
  selector: 'app-carta-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './carta.page.html',
  styleUrl: './carta.page.scss'
})
export class CartaPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly apiBase = 'https://backendbambino.onrender.com/api/public/configuracion/media';
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
        this.http.get<ConfiguracionMediaPublicResponse>(`${this.apiBase}/CARTA_PDF`).pipe(timeout(10000))
      );
      this.pdfUrl = data?.activa ? (data.url?.trim() || '') : '';
      if (this.pdfUrl) {
        localStorage.setItem(this.cartaPdfCacheKey, this.pdfUrl);
      }
      if (!this.pdfUrl) {
        this.error = 'No hay PDF de carta configurado.';
      } else {
        this.viewerUrl = this.buildViewerUrl(this.pdfUrl);
      }
    } catch {
      this.pdfUrl = localStorage.getItem(this.cartaPdfCacheKey)?.trim() || '';
      if (!this.pdfUrl) {
        this.error = 'No se pudo cargar la carta PDF.';
      } else {
        this.viewerUrl = this.buildViewerUrl(this.pdfUrl);
      }
    } finally {
      this.loading = false;
    }
  }

  private buildViewerUrl(url: string): SafeResourceUrl {
    const googleViewer = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(googleViewer);
  }
}
