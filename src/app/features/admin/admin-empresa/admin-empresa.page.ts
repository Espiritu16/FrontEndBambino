import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom, timeout } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';

type EmpresaResponse = {
  idEmpresa: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccionFiscal: string;
  telefono: string | null;
  correo: string | null;
  latitud?: number | null;
  longitud?: number | null;
  activo: boolean;
};

type ZonaDeliveryResponse = {
  idZona: number;
  nombre: string;
  activo: boolean;
  tarifaBase?: number | null;
  montoMinimo?: number | null;
  tiempoEstimadoMinutos?: number | null;
  coberturaDescripcion?: string | null;
  mapaEmbedUrl?: string | null;
  mapa_embed_url?: string | null;
  latitudCentro: number | null;
  longitudCentro: number | null;
  radioKm?: number | null;
  horaInicioAtencion?: string | null;
  horaFinAtencion?: string | null;
  latitud_centro?: number | null;
  longitud_centro?: number | null;
};

type EmpresaForm = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  telefono: string;
  correo: string;
  latitud: string;
  longitud: string;
  mapaEmbedUrl: string;
  activo: boolean;
};

@Component({
  selector: 'app-admin-empresa-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-empresa.page.html',
  styleUrl: './admin-empresa.page.scss'
})
export class AdminEmpresaPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly apiBase = 'http://localhost:8080/api/admin/configuracion/empresas';
  private readonly zonasApiBase = 'http://localhost:8080/api/admin/configuracion/zonas-delivery';
  private readonly authStorageKey = 'bambino_basic_auth';

  protected loading = false;
  protected savingEmpresa = false;
  protected savingUbicacion = false;
  protected error = '';
  protected editingId: number | null = null;
  protected zonaPrincipalId: number | null = null;
  protected editandoMapaUrl = false;
  protected mapaEmbedUrlDraft = '';
  protected form: EmpresaForm = this.emptyForm();
  protected mapEmbedUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://maps.google.com/maps?q=Lima%20Peru&z=15&output=embed');

  protected get hasEmpresaPrincipal(): boolean {
    return this.editingId !== null;
  }

  protected get saving(): boolean {
    return this.savingEmpresa || this.savingUbicacion;
  }

  ngOnInit(): void {
    void this.loadEmpresaPrincipal();
  }

  protected async loadEmpresaPrincipal(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const empresas = await firstValueFrom(
        this.http.get<EmpresaResponse[]>(this.apiBase, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      const fallback = await this.obtenerDatosFallbackDesdeZona();
      const principal = empresas[0] ?? null;

      if (principal) {
        const latEmpresa = this.toNumberOrNull((principal as any).latitud ?? (principal as any).lat);
        const lngEmpresa = this.toNumberOrNull((principal as any).longitud ?? (principal as any).lng ?? (principal as any).lon);
        const lat = latEmpresa ?? fallback.latitud;
        const lng = lngEmpresa ?? fallback.longitud;

        this.editingId = principal.idEmpresa;
        this.form = {
          ruc: principal.ruc ?? '',
          razonSocial: principal.razonSocial ?? '',
          nombreComercial: principal.nombreComercial ?? '',
          direccionFiscal: principal.direccionFiscal ?? '',
          telefono: principal.telefono ?? '',
          correo: principal.correo ?? '',
          latitud: lat != null ? String(lat) : '',
          longitud: lng != null ? String(lng) : '',
          mapaEmbedUrl: this.formatearEmbedParaCampo(fallback.mapaEmbedUrl),
          activo: principal.activo ?? true
        };
      } else {
        this.editingId = null;
        this.form = {
          ...this.emptyForm(),
          latitud: fallback.latitud != null ? String(fallback.latitud) : '',
          longitud: fallback.longitud != null ? String(fallback.longitud) : '',
          mapaEmbedUrl: this.formatearEmbedParaCampo(fallback.mapaEmbedUrl)
        };
      }

      this.actualizarMapaDesdeFormulario();
    } catch (e: any) {
      this.error = e?.error?.mensaje || 'No se pudo cargar la empresa principal.';
      this.toast.error(this.error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  protected async saveEmpresa(): Promise<void> {
    if (this.savingEmpresa) return;
    if (!this.form.ruc.trim() || !this.form.razonSocial.trim() || !this.form.direccionFiscal.trim()) {
      this.toast.warning('RUC, Razón social y Dirección fiscal son obligatorios.');
      return;
    }

    const payload: any = {
      ruc: this.form.ruc.trim(),
      razonSocial: this.form.razonSocial.trim(),
      nombreComercial: this.nullIfBlank(this.form.nombreComercial),
      direccionFiscal: this.form.direccionFiscal.trim(),
      telefono: this.nullIfBlank(this.form.telefono),
      correo: this.nullIfBlank(this.form.correo),
      activo: this.form.activo
    };

    this.savingEmpresa = true;
    this.error = '';
    try {
      if (this.editingId) {
        await firstValueFrom(
          this.http.put<EmpresaResponse>(`${this.apiBase}/${this.editingId}`, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
        this.toast.success('Información de empresa actualizada correctamente.');
      } else {
        const created = await firstValueFrom(
          this.http.post<EmpresaResponse>(this.apiBase, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
        this.editingId = created.idEmpresa;
        this.toast.success('Empresa principal registrada correctamente.');
      }
      await this.loadEmpresaPrincipal();
    } catch (e: any) {
      const detalle = e?.error?.detalles?.[0]?.mensaje;
      this.error = e?.error?.mensaje || detalle || 'No se pudo guardar la información de empresa.';
      this.toast.error(this.error);
      this.cdr.detectChanges();
    } finally {
      this.savingEmpresa = false;
      this.cdr.detectChanges();
    }
  }

  protected async saveUbicacion(): Promise<void> {
    if (this.savingUbicacion) return;
    if (!this.hasEmpresaPrincipal) {
      this.toast.warning('Primero registra/guarda la empresa principal.');
      return;
    }
    if (!this.validarCoordenadasFormulario()) return;

    const lat = this.parseDecimalOrNull(this.form.latitud);
    const lng = this.parseDecimalOrNull(this.form.longitud);
    if (lat == null || lng == null) {
      this.toast.warning('Ingresa latitud y longitud para guardar ubicación.');
      return;
    }

    this.savingUbicacion = true;
    this.error = '';
    try {
      const zonas = await firstValueFrom(
        this.http.get<ZonaDeliveryResponse[]>(this.zonasApiBase, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      const zonaActual = this.resolveZonaPrincipal(zonas);

      const payload = {
        nombre: zonaActual?.nombre || `EMPRESA_PRINCIPAL_${this.editingId}`,
        activo: zonaActual?.activo ?? true,
        tarifaBase: zonaActual?.tarifaBase ?? 0,
        montoMinimo: zonaActual?.montoMinimo ?? 0,
        tiempoEstimadoMinutos: zonaActual?.tiempoEstimadoMinutos ?? 35,
        coberturaDescripcion: zonaActual?.coberturaDescripcion ?? 'Ubicacion principal de empresa',
        mapaEmbedUrl: this.normalizarMapaEmbedInput(this.editandoMapaUrl ? this.mapaEmbedUrlDraft : this.form.mapaEmbedUrl) || null,
        latitudCentro: lat,
        longitudCentro: lng,
        radioKm: zonaActual?.radioKm ?? 1.00,
        horaInicioAtencion: zonaActual?.horaInicioAtencion ?? null,
        horaFinAtencion: zonaActual?.horaFinAtencion ?? null
      };

      if (zonaActual?.idZona) {
        const updated = await firstValueFrom(
          this.http.put<ZonaDeliveryResponse>(`${this.zonasApiBase}/${zonaActual.idZona}`, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
        this.zonaPrincipalId = updated.idZona;
      } else {
        const created = await firstValueFrom(
          this.http.post<ZonaDeliveryResponse>(this.zonasApiBase, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
        this.zonaPrincipalId = created.idZona;
      }

      this.toast.success('Ubicación de empresa actualizada correctamente.');
      this.editandoMapaUrl = false;
      this.mapaEmbedUrlDraft = '';
      await this.loadEmpresaPrincipal();
    } catch (e: any) {
      const detalle = e?.error?.detalles?.[0]?.mensaje;
      this.error = e?.error?.mensaje || detalle || 'No se pudo guardar la ubicación de empresa.';
      this.toast.error(this.error);
      this.cdr.detectChanges();
    } finally {
      this.savingUbicacion = false;
      this.cdr.detectChanges();
    }
  }

  protected onUbicacionInputChange(): void {
    if (!this.editandoMapaUrl) return;
    this.actualizarMapaDesdeFormulario();
  }

  private actualizarMapaDesdeFormulario(): void {
    const fuente = this.editandoMapaUrl ? this.mapaEmbedUrlDraft : this.form.mapaEmbedUrl;
    const embed = this.normalizarMapaEmbedInput(fuente);
    if (embed) {
      if (this.editandoMapaUrl) {
        this.mapaEmbedUrlDraft = embed;
      } else {
        this.form.mapaEmbedUrl = embed;
      }
      this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embed);
      return;
    }
    const lat = this.parseDecimalOrNull(this.form.latitud);
    const lng = this.parseDecimalOrNull(this.form.longitud);
    if (lat != null && lng != null) {
      this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`
      );
      return;
    }
    this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
  }

  private normalizarMapaEmbedInput(raw: string): string {
    let value = (raw || '').trim();
    if (!value) return '';

    // Limpia comillas externas repetidas: ""..."" o '...'
    value = value.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').trim();
    value = value.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').trim();

    // Caso 1: pegaron el iframe completo, extraer src.
    const iframeSrc = value.match(/<iframe[^>]*\ssrc=(['"])(.*?)\1/i);
    if (iframeSrc?.[2]) {
      return iframeSrc[2].trim();
    }

    // Caso 2: pegaron URL directa.
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return '';
  }

  private formatearEmbedParaCampo(raw: string | null | undefined): string {
    const src = this.normalizarMapaEmbedInput(raw || '');
    if (!src) return '';
    return `<iframe src="${src}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }

  protected iniciarEdicionMapaUrl(): void {
    this.editandoMapaUrl = true;
    this.mapaEmbedUrlDraft = '';
    this.actualizarMapaDesdeFormulario();
  }

  protected cancelarEdicionMapaUrl(): void {
    this.editandoMapaUrl = false;
    this.mapaEmbedUrlDraft = '';
    this.actualizarMapaDesdeFormulario();
  }

  private async obtenerDatosFallbackDesdeZona(): Promise<{ latitud: number | null; longitud: number | null; mapaEmbedUrl: string | null }> {
    try {
      const zonas = await firstValueFrom(
        this.http.get<ZonaDeliveryResponse[]>(this.zonasApiBase, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      const zonaPrincipal = this.resolveZonaPrincipal(zonas);
      if (zonaPrincipal?.idZona) this.zonaPrincipalId = zonaPrincipal.idZona;

      const zonaConCoordenadas = zonas.find((z) => {
        const lat = this.toNumberOrNull((z as any).latitudCentro ?? (z as any).latitud_centro);
        const lng = this.toNumberOrNull((z as any).longitudCentro ?? (z as any).longitud_centro);
        return lat != null && lng != null;
      });

      const zonaRef = zonaPrincipal ?? zonaConCoordenadas ?? zonas.find((z) => z.activo) ?? zonas[0];
      if (!zonaRef) return { latitud: null, longitud: null, mapaEmbedUrl: null };

      return {
        latitud: this.toNumberOrNull((zonaRef as any).latitudCentro ?? (zonaRef as any).latitud_centro),
        longitud: this.toNumberOrNull((zonaRef as any).longitudCentro ?? (zonaRef as any).longitud_centro),
        mapaEmbedUrl: (zonaRef as any).mapaEmbedUrl ?? (zonaRef as any).mapa_embed_url ?? null
      };
    } catch {
      return { latitud: null, longitud: null, mapaEmbedUrl: null };
    }
  }

  private resolveZonaPrincipal(zonas: ZonaDeliveryResponse[]): ZonaDeliveryResponse | null {
    if (!zonas.length) return null;
    if (this.zonaPrincipalId) {
      const byId = zonas.find((z) => z.idZona === this.zonaPrincipalId);
      if (byId) return byId;
    }
    const byNombre = zonas.find((z) => (z.nombre || '').toUpperCase().startsWith('EMPRESA_PRINCIPAL_'));
    if (byNombre) return byNombre;
    return zonas.find((z) => z.activo) ?? zonas[0];
  }

  private validarCoordenadasFormulario(): boolean {
    const latRaw = this.form.latitud.trim();
    const lngRaw = this.form.longitud.trim();
    if (!latRaw && !lngRaw) return true;
    const lat = this.parseDecimalOrNull(latRaw);
    const lng = this.parseDecimalOrNull(lngRaw);
    if (lat == null || lng == null) {
      this.toast.warning('Para ubicación exacta, completa latitud y longitud válidas.');
      return false;
    }
    if (lat < -90 || lat > 90) {
      this.toast.warning('Latitud fuera de rango (-90 a 90).');
      return false;
    }
    if (lng < -180 || lng > 180) {
      this.toast.warning('Longitud fuera de rango (-180 a 180).');
      return false;
    }
    return true;
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey);
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  private nullIfBlank(value: string): string | null {
    const v = value?.trim();
    return v ? v : null;
  }

  private parseDecimalOrNull(value: string): number | null {
    const raw = value?.trim();
    if (!raw) return null;
    const normalized = raw.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(',', '.').trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private emptyForm(): EmpresaForm {
    return {
      ruc: '',
      razonSocial: '',
      nombreComercial: '',
      direccionFiscal: '',
      telefono: '',
      correo: '',
      latitud: '',
      longitud: '',
      mapaEmbedUrl: '',
      activo: true
    };
  }
}
