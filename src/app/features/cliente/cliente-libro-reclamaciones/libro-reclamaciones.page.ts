import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom, timeout } from 'rxjs';
import { runWithUiRefresh } from '../../../shared/utils/async-ui.util';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../../shared/services/toast.service';
import { API_BASE_URL } from '../../../core/http/api-endpoints';

type EmpresaResponse = {
  idEmpresa: number;
  ruc: string;
  razonSocial: string;
  direccionFiscal: string;
  telefono?: string | null;
  activo: boolean;
};

type UbicacionPrincipalResponse = {
  idZona: number;
  nombreZona: string;
  latitud: number;
  longitud: number;
  mapaEmbedUrl?: string | null;
};

type PedidoResponse = {
  idPedido: number;
  codigoPedido: string;
  total: number;
  fechaCreacion: string;
};

type PrefillResponse = {
  tipoRegistro: string;
  nombres: string;
  apellidos: string;
  docTipo: string;
  docNumero: string;
  correo: string;
  telefono: string;
};

type ClienteDocumentoResponse = {
  idDocumento: number;
  docTipo: string;
  docNumero: string;
  esPrincipal: boolean;
  activo: boolean;
};

type DireccionResponse = {
  idDireccion: number;
  direccionLinea1: string;
  referencia: string | null;
  esPrincipal: boolean;
  activo: boolean;
};

type LibroReclamoResponse = {
  numeroReclamo: string;
  fechaRegistro: string;
};

@Component({
  selector: 'app-libro-reclamaciones-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './libro-reclamaciones.page.html',
  styleUrl: './libro-reclamaciones.page.scss'
})
export class LibroReclamacionesPageComponent implements OnInit {
  private readonly apiBaseUrl = API_BASE_URL;
  private readonly authStorageKey = 'bambino_basic_auth';
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toastService = inject(ToastService);

  protected loading = false;
  protected sending = false;
  protected error = '';
  protected success = '';
  protected fieldErrors: Record<string, string> = {};

  protected empresaRazonSocial = '-';
  protected empresaRuc = '-';
  protected empresaDireccion = '-';
  protected empresaTelefono = '-';
  protected empresaGoogleMapsEmbedSrc: SafeResourceUrl | null = null;
  protected fechaRegistroTexto = '';

  protected isAuthenticated = false;
  protected misPedidos: PedidoResponse[] = [];
  protected selectedPedidoId = '';
  protected direccionesCliente: DireccionResponse[] = [];
  protected selectedDireccionId = '';
  protected documentTypeOptions: string[] = ['DNI', 'RUC', 'CE', 'OTRO'];
  protected hasLinkedDocuments = false;
  private docNumeroByTipo: Record<string, string> = {};

  protected form = {
    tipoRegistro: 'RECLAMO',
    nombres: '',
    apellidos: '',
    docTipo: 'DNI',
    docNumero: '',
    correo: '',
    telefono: '',
    direccionConsumidor: '',
    codigoPedidoManual: '',
    detalleHechos: '',
    pedidoConsumidor: ''
  };

  ngOnInit(): void {
    void runWithUiRefresh(async () => {
      this.fechaRegistroTexto = this.formatNow();
      this.isAuthenticated = !!localStorage.getItem(this.authStorageKey)?.trim();
      await this.loadInitialData();
    }, this.ngZone, this.cdr);
  }

  protected async submit(): Promise<void> {
    this.error = '';
    this.success = '';
    this.fieldErrors = this.validateForm();
    if (Object.keys(this.fieldErrors).length > 0) {
      this.toastService.warning('Revisa los campos marcados.');
      return;
    }

    this.sending = true;
    try {
      const selectedPedido = this.selectedPedidoId ? this.misPedidos.find((p) => String(p.idPedido) === this.selectedPedidoId) : null;
      const payload = {
        tipoRegistro: this.form.tipoRegistro,
        nombres: this.form.nombres,
        apellidos: this.form.apellidos,
        docTipo: this.form.docTipo,
        docNumero: this.form.docNumero,
        correo: this.form.correo,
        telefono: this.form.telefono || null,
        direccionConsumidor: this.form.direccionConsumidor || null,
        idPedido: selectedPedido?.idPedido ?? null,
        codigoPedido: selectedPedido?.codigoPedido ?? (this.form.codigoPedidoManual.trim() || null),
        fechaConsumo: null,
        montoReclamado: null,
        detalleHechos: this.form.detalleHechos,
        pedidoConsumidor: this.form.pedidoConsumidor
      };

      const url = this.isAuthenticated
        ? `${this.apiBaseUrl}/api/cliente/libro-reclamaciones`
        : `${this.apiBaseUrl}/api/public/libro-reclamaciones`;

      const options = this.isAuthenticated ? { headers: this.authHeaders() } : {};
      const response = await firstValueFrom(
        this.http.post<LibroReclamoResponse>(url, payload, options).pipe(timeout(15000))
      );

      this.success = `Reclamo registrado correctamente. Código: ${response.numeroReclamo}`;
      this.fechaRegistroTexto = this.formatDateTime(response.fechaRegistro) || this.formatNow();
      this.form.detalleHechos = '';
      this.form.pedidoConsumidor = '';
      this.form.codigoPedidoManual = '';
      this.selectedPedidoId = '';
      this.fieldErrors = {};
    } catch (e: any) {
      this.error = e?.error?.mensaje || 'No se pudo registrar el reclamo. Intenta nuevamente.';
    } finally {
      this.sending = false;
    }
  }

  protected hasFieldError(field: string): boolean {
    return !!this.fieldErrors[field];
  }

  private async loadInitialData(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      try {
        const empresas = await firstValueFrom(
          this.http.get<EmpresaResponse[]>(`${this.apiBaseUrl}/api/public/configuracion/empresas`).pipe(timeout(10000))
        );
        const empresa = (empresas ?? []).find((e) => e?.activo) ?? empresas?.[0];
        if (empresa) {
          this.empresaRazonSocial = empresa.razonSocial || '-';
          this.empresaRuc = empresa.ruc || '-';
          this.empresaDireccion = empresa.direccionFiscal || '-';
          this.empresaTelefono = (empresa.telefono ?? '').trim() || '-';
        }
      } catch {
        this.error = 'No se pudo cargar la información de la empresa.';
      }

      try {
        const ubicacion = await firstValueFrom(
          this.http.get<UbicacionPrincipalResponse>(`${this.apiBaseUrl}/api/public/delivery/ubicacion-principal`).pipe(timeout(10000))
        );
        this.empresaGoogleMapsEmbedSrc = this.resolveEmbedSrc(ubicacion?.mapaEmbedUrl ?? null);
      } catch {
        this.empresaGoogleMapsEmbedSrc = null;
      }

      if (this.isAuthenticated) {
        await this.loadPrefillAndOrders();
      }
    } finally {
      this.loading = false;
    }
  }

  private async loadPrefillAndOrders(): Promise<void> {
    try {
      const headers = this.authHeaders();
      const [prefillRes, pedidosRes, documentosRes, direccionesRes] = await Promise.allSettled([
        firstValueFrom(this.http.get<PrefillResponse>(`${this.apiBaseUrl}/api/cliente/libro-reclamaciones/prefill`, { headers }).pipe(timeout(10000))),
        firstValueFrom(this.http.get<PedidoResponse[]>(`${this.apiBaseUrl}/api/cliente/pedidos`, { headers }).pipe(timeout(10000))),
        firstValueFrom(this.http.get<ClienteDocumentoResponse[]>(`${this.apiBaseUrl}/api/cliente/perfil/documentos`, { headers }).pipe(timeout(10000))),
        firstValueFrom(this.http.get<DireccionResponse[]>(`${this.apiBaseUrl}/api/cliente/direcciones`, { headers }).pipe(timeout(10000)))
      ]);

      const prefill = prefillRes.status === 'fulfilled' ? prefillRes.value : null;
      const pedidos = pedidosRes.status === 'fulfilled' ? pedidosRes.value : [];
      const documentos = documentosRes.status === 'fulfilled' ? documentosRes.value : [];
      const direcciones = direccionesRes.status === 'fulfilled' ? direccionesRes.value : [];

      if (prefill) {
        this.form.tipoRegistro = (prefill.tipoRegistro || 'RECLAMO').toUpperCase();
        this.form.nombres = prefill.nombres || '';
        this.form.apellidos = prefill.apellidos || '';
        this.form.correo = prefill.correo || '';
        this.form.telefono = prefill.telefono || '';
      }
      this.misPedidos = pedidos ?? [];
      this.applyDocumentBinding(documentos ?? [], prefill);
      this.applyDireccionesBinding(direcciones ?? []);
    } catch {
      // silencioso para no bloquear formulario
    }
  }

  protected onDocTipoChange(): void {
    if (!this.hasLinkedDocuments) return;
    const key = (this.form.docTipo || '').toUpperCase();
    const numero = this.docNumeroByTipo[key];
    if (numero) {
      this.form.docNumero = numero;
    }
  }

  protected onDireccionChange(): void {
    if (!this.isAuthenticated) return;
    const selected = this.direccionesCliente.find((d) => String(d.idDireccion) === this.selectedDireccionId);
    if (!selected) return;
    const base = (selected.direccionLinea1 || '').trim();
    const ref = (selected.referencia || '').trim();
    this.form.direccionConsumidor = ref ? `${base} - Ref: ${ref}` : base;
  }

  protected pedidoLabel(p: PedidoResponse): string {
    const fecha = this.formatDateTime(p.fechaCreacion);
    return `${p.codigoPedido} · ${fecha} · S/ ${Number(p.total || 0).toFixed(2)}`;
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey)?.trim() ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  private formatNow(): string {
    return this.formatDateTime(new Date().toISOString()) || '';
  }

  private formatDateTime(v: string | null | undefined): string {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private resolveEmbedSrc(embedUrl: string | null): SafeResourceUrl | null {
    const src = (embedUrl ?? '').trim();
    if (!src) return null;
    try {
      const parsed = new URL(src);
      const isGoogleMapsEmbed = parsed.hostname.includes('google.com') && parsed.pathname.includes('/maps/embed');
      if (!isGoogleMapsEmbed) return null;
      return this.sanitizer.bypassSecurityTrustResourceUrl(src);
    } catch {
      return null;
    }
  }

  private applyDocumentBinding(documentos: ClienteDocumentoResponse[], prefill: PrefillResponse | null): void {
    const activos = (documentos ?? [])
      .filter((d) => d?.activo && d.docTipo && d.docNumero)
      .map((d) => ({ tipo: String(d.docTipo).toUpperCase(), numero: String(d.docNumero).trim(), principal: !!d.esPrincipal }))
      .filter((d) => !!d.tipo && !!d.numero);

    if (!activos.length) {
      this.hasLinkedDocuments = false;
      this.documentTypeOptions = ['DNI', 'RUC', 'CE', 'OTRO'];
      this.form.docTipo = (prefill?.docTipo || 'DNI').toUpperCase();
      this.form.docNumero = prefill?.docNumero || '';
      return;
    }

    this.hasLinkedDocuments = true;
    this.docNumeroByTipo = {};
    const orderedTipos: string[] = [];
    for (const item of activos) {
      this.docNumeroByTipo[item.tipo] = item.numero;
      if (!orderedTipos.includes(item.tipo)) {
        orderedTipos.push(item.tipo);
      }
    }
    this.documentTypeOptions = orderedTipos;

    const principal = activos.find((d) => d.principal) ?? activos[0];
    this.form.docTipo = principal.tipo;
    this.form.docNumero = principal.numero;
  }

  private applyDireccionesBinding(direcciones: DireccionResponse[]): void {
    const activas = (direcciones ?? []).filter((d) => d?.activo && d.direccionLinea1);
    this.direccionesCliente = activas;
    if (!activas.length) return;
    const principal = activas.find((d) => d.esPrincipal) ?? activas[0];
    this.selectedDireccionId = String(principal.idDireccion);
    this.onDireccionChange();
  }

  private validateForm(): Record<string, string> {
    const errors: Record<string, string> = {};

    const nombres = this.form.nombres.trim();
    const apellidos = this.form.apellidos.trim();
    const correo = this.form.correo.trim();
    const docTipo = (this.form.docTipo || '').toUpperCase();
    const docNumero = this.form.docNumero.trim();
    const telefono = this.form.telefono.trim();
    const detalle = this.form.detalleHechos.trim();
    const pedidoConsumidor = this.form.pedidoConsumidor.trim();

    if (!nombres) errors['nombres'] = 'Nombres es obligatorio.';
    if (!apellidos) errors['apellidos'] = 'Apellidos es obligatorio.';

    if (!docNumero) {
      errors['docNumero'] = 'N° Documento es obligatorio.';
    } else if (docTipo === 'DNI' && !/^\d{8}$/.test(docNumero)) {
      errors['docNumero'] = 'DNI debe tener 8 dígitos.';
    } else if (docTipo === 'RUC' && !/^\d{11}$/.test(docNumero)) {
      errors['docNumero'] = 'RUC debe tener 11 dígitos.';
    } else if (docTipo === 'CE' && !/^[A-Za-z0-9]{6,20}$/.test(docNumero)) {
      errors['docNumero'] = 'CE inválido.';
    }

    if (!correo) {
      errors['correo'] = 'Correo es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      errors['correo'] = 'Correo inválido.';
    }

    if (telefono && !/^[0-9+\-\s]{7,20}$/.test(telefono)) {
      errors['telefono'] = 'Teléfono inválido.';
    }

    if (!detalle) {
      errors['detalleHechos'] = 'Detalle de los hechos es obligatorio.';
    } else if (detalle.length < 15) {
      errors['detalleHechos'] = 'Ingresa al menos 15 caracteres.';
    }

    if (!pedidoConsumidor) {
      errors['pedidoConsumidor'] = 'Pedido del consumidor es obligatorio.';
    } else if (pedidoConsumidor.length < 10) {
      errors['pedidoConsumidor'] = 'Ingresa al menos 10 caracteres.';
    }

    return errors;
  }
}
