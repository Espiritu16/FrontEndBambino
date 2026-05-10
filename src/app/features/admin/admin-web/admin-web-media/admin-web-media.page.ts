import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../../../shared/services/toast.service';

type ConfiguracionMediaResponse = {
  idMedia: number;
  clave: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'IMAGEN' | 'PDF' | 'VIDEO';
  url: string;
  publicId: string | null;
  versionTag: string | null;
  activa: boolean;
};

@Component({
  selector: 'app-admin-web-media-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-web-media.page.html',
  styleUrl: './admin-web-media.page.scss'
})
export class AdminWebMediaPageComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly enforceExactDimensions = false;
  private readonly apiBase = 'https://backendbambino.onrender.com/api/admin/configuracion/media';
  private readonly authStorageKey = 'bambino_basic_auth';

  protected loading = false;
  protected saving = false;
  protected uploading = false;
  protected error = '';
  protected selectedFileName = '';
  protected showImageEditorModal = false;
  protected isInicioSection = false;
  protected pendingImageFile: File | null = null;
  protected localPreviewUrl = '';
  protected pendingImageRemoval = false;
  private originalSnapshot: string | null = null;

  protected sectionName = 'Web';
  protected mediaKey = '';
  protected mediaType: 'IMAGEN' | 'PDF' | 'VIDEO' = 'IMAGEN';

  protected form: ConfiguracionMediaResponse = {
    idMedia: 0,
    clave: '',
    nombre: '',
    descripcion: '',
    tipo: 'IMAGEN',
    url: '',
    publicId: '',
    versionTag: '',
    activa: true
  };

  ngOnInit(): void {
    this.mediaKey = this.route.snapshot.data['mediaKey'] as string;
    this.sectionName = this.route.snapshot.data['sectionName'] as string;
    this.mediaType = this.route.snapshot.data['mediaType'] as 'IMAGEN' | 'PDF' | 'VIDEO';
    this.isInicioSection = this.mediaKey === 'HOME_HERO_BANNER';
    this.form.tipo = this.mediaType;
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.localPreviewUrl) {
      URL.revokeObjectURL(this.localPreviewUrl);
    }
    document.body.style.overflow = '';
  }

  protected async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const data = await firstValueFrom(
        this.http.get<ConfiguracionMediaResponse>(`${this.apiBase}/${this.mediaKey}`, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      this.form = {
        ...data,
        descripcion: data.descripcion ?? '',
        publicId: data.publicId ?? '',
        versionTag: data.versionTag ?? ''
      };
      this.originalSnapshot = this.buildSnapshotFromForm();
    } catch (e: any) {
      this.error = e?.error?.mensaje || 'No se pudo cargar la configuración.';
      this.toast.error(this.error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  protected async save(): Promise<void> {
    if (this.saving || this.uploading) return;
    if (!this.form.nombre.trim()) {
      this.toast.warning('El nombre es obligatorio.');
      return;
    }
    if (!this.pendingImageFile && !this.pendingImageRemoval && this.originalSnapshot === this.buildSnapshotFromForm()) {
      this.toast.info('No hay cambios para guardar.');
      return;
    }
    this.saving = true;
    this.error = '';
    try {
      if (this.pendingImageFile) {
        this.uploading = true;
        const formData = new FormData();
        formData.append('archivo', this.pendingImageFile);
        const uploaded = await firstValueFrom(
          this.http.put<ConfiguracionMediaResponse>(`${this.apiBase}/${this.mediaKey}/archivo`, formData, { headers: this.authHeaders() }).pipe(timeout(30000))
        );
        this.form = { ...uploaded, descripcion: uploaded.descripcion ?? '', publicId: uploaded.publicId ?? '', versionTag: uploaded.versionTag ?? '' };
        this.pendingImageFile = null;
        this.selectedFileName = '';
        this.localPreviewUrl = '';
        this.pendingImageRemoval = false;
        this.closeImageEditorModal();
      }

      if (this.pendingImageRemoval) {
        this.form.url = '';
        this.form.publicId = '';
        this.form.versionTag = '';
      }

      const payload = {
        nombre: this.form.nombre.trim(),
        descripcion: (this.form.descripcion ?? '').trim() || null,
        tipo: this.form.tipo,
        url: this.form.url.trim(),
        publicId: (this.form.publicId ?? '').trim() || null,
        versionTag: (this.form.versionTag ?? '').trim() || null,
        activa: this.form.activa
      };
      const data = await firstValueFrom(
        this.http.put<ConfiguracionMediaResponse>(`${this.apiBase}/${this.mediaKey}`, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      this.form = { ...data, descripcion: data.descripcion ?? '', publicId: data.publicId ?? '', versionTag: data.versionTag ?? '' };
      this.pendingImageRemoval = false;
      this.originalSnapshot = this.buildSnapshotFromForm();
      this.toast.success('Configuración actualizada correctamente.');
    } catch (e: any) {
      this.error = e?.error?.mensaje || 'No se pudo guardar la configuración.';
      this.toast.error(this.error);
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  protected async removeImage(): Promise<void> {
    if (this.saving || this.uploading) return;
    if (this.localPreviewUrl) {
      URL.revokeObjectURL(this.localPreviewUrl);
    }
    this.localPreviewUrl = '';
    this.pendingImageFile = null;
    this.selectedFileName = '';
    this.pendingImageRemoval = true;
    this.form.url = '';
    this.form.publicId = '';
    this.form.versionTag = '';
    this.toast.success('Imagen marcada para quitar. Presiona "Guardar cambios".');
    this.cdr.detectChanges();
  }

  protected async uploadFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }
    if (this.form.tipo === 'PDF' && !this.isPdfFile(file)) {
      this.toast.error('Solo se permiten archivos PDF.');
      input.value = '';
      return;
    }
    this.selectedFileName = file.name;
    try {
      if (this.enforceExactDimensions) {
        await this.ensureImageDimensionsInRange(file, 300, 250, 20);
      }
    } catch (e: any) {
      this.error = e?.message || 'No se pudo validar dimensiones de imagen.';
      this.toast.error(this.error);
      input.value = '';
      this.selectedFileName = '';
      return;
    }
    this.pendingImageFile = file;
    this.pendingImageRemoval = false;
    if (this.localPreviewUrl) {
      URL.revokeObjectURL(this.localPreviewUrl);
    }
    this.localPreviewUrl = URL.createObjectURL(file);
    this.error = '';
    this.toast.success(this.form.tipo === 'PDF'
      ? 'PDF listo para revisar. Presiona "Guardar cambios" para subir.'
      : 'Imagen lista para guardar. Presiona "Guardar cambios".');
    this.closeImageEditorModal();
    this.cdr.detectChanges();
  }

  private async ensureImageDimensionsInRange(file: File, baseWidth: number, baseHeight: number, tolerancePx: number): Promise<void> {
    if (this.form.tipo !== 'IMAGEN') return;
    const dimensions = await this.readImageDimensions(file);
    const minWidthAllowed = baseWidth - tolerancePx;
    const maxWidthAllowed = baseWidth + tolerancePx;
    const minHeightAllowed = baseHeight - tolerancePx;
    const maxHeightAllowed = baseHeight + tolerancePx;
    if (
      dimensions.width < minWidthAllowed ||
      dimensions.width > maxWidthAllowed ||
      dimensions.height < minHeightAllowed ||
      dimensions.height > maxHeightAllowed
    ) {
      throw new Error(
        `La imagen debe estar dentro del rango permitido: ancho ${minWidthAllowed}-${maxWidthAllowed} px y alto ${minHeightAllowed}-${maxHeightAllowed} px y se recibió ${dimensions.width}x${dimensions.height} px.`
      );
    }
  }

  private readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la imagen seleccionada.'));
      };
      img.src = url;
    });
  }

  protected openImageEditorModal(): void {
    this.showImageEditorModal = true;
    document.body.style.overflow = 'hidden';
  }

  protected closeImageEditorModal(): void {
    this.showImageEditorModal = false;
    document.body.style.overflow = '';
  }

  protected get previewImageUrl(): string {
    return this.localPreviewUrl || (this.form.url ?? '');
  }

  protected get isPdfSection(): boolean {
    return this.form.tipo === 'PDF';
  }

  private isPdfFile(file: File): boolean {
    const lowerName = (file.name ?? '').toLowerCase();
    return file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  }
  protected get previewPdfUrl(): SafeResourceUrl | '' {
    const base = this.previewImageUrl;
    if (!base) return '';
    if (base.startsWith('blob:')) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`${base}#toolbar=1&view=FitH`);
    }
    const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(base)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey) ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  private buildSnapshotFromForm(): string {
    return JSON.stringify({
      nombre: this.form.nombre.trim(),
      descripcion: (this.form.descripcion ?? '').trim() || null,
      tipo: this.form.tipo,
      url: (this.form.url ?? '').trim(),
      publicId: (this.form.publicId ?? '').trim() || null,
      versionTag: (this.form.versionTag ?? '').trim() || null,
      activa: this.form.activa
    });
  }
}
