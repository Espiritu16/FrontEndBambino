import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';

import { API_ENDPOINTS } from '../../../../core/http/api-endpoints';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { matchesSearchQuery } from '../../../../shared/utils/search-match.util';

type EstadoOferta = 'BORRADOR' | 'PROGRAMADA' | 'ACTIVA' | 'INACTIVA' | 'EXPIRADA';
type TipoOferta = 'PORCENTAJE' | 'MONTO_FIJO' | 'PRECIO_ESPECIAL' | 'COMBO';

type OfertaResponse = {
  idOferta: number;
  nombre: string;
  tipo: TipoOferta;
  valorDescuento: number | null;
  precioEspecial: number | null;
  estado: EstadoOferta;
  fechaInicio: string;
  fechaFin: string;
  idsProductos: number[];
};

type ProductoResponse = {
  idProducto: number;
  nombre: string;
  categoriaNombre: string | null;
  precioBase: number;
  visibleWeb: boolean;
  disponible: boolean;
  estado: 'ACTIVO' | 'INACTIVO';
};

type OfertaPayload = {
  nombre: string;
  tipo: TipoOferta;
  valorDescuento: number | null;
  precioEspecial: number | null;
  estado: EstadoOferta;
  fechaInicio: string;
  fechaFin: string;
  idsProductos: number[];
};

type OfertaForm = {
  nombre: string;
  tipo: TipoOferta;
  valorDescuento: number | null;
  precioEspecial: number | null;
  estado: EstadoOferta;
  fechaInicio: string;
  fechaFin: string;
  idsProductos: number[];
};

type OfertaFieldErrors = Partial<Record<'nombre' | 'valorDescuento' | 'precioEspecial' | 'fechaInicio' | 'fechaFin' | 'idsProductos', string>>;

@Component({
  selector: 'app-admin-comercial-ofertas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-comercial-ofertas.page.html',
  styleUrl: './admin-comercial-ofertas.page.scss'
})
export class AdminComercialOfertasPageComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = API_ENDPOINTS.admin.catalogo;
  private readonly authStorageKey = 'bambino_basic_auth';
  private loadingInProgress = false;

  protected ofertas: OfertaResponse[] = [];
  protected productos: ProductoResponse[] = [];
  protected ofertasFiltradas: OfertaResponse[] = [];
  protected productosFiltrados: ProductoResponse[] = [];
  protected loading = false;
  protected saving = false;
  protected error = '';
  protected searchQuery = '';
  protected productSearchQuery = '';
  protected filterEstado: '' | EstadoOferta = '';
  protected showForm = false;
  protected editingId: number | null = null;
  protected form: OfertaForm = this.emptyForm();
  protected fieldErrors: OfertaFieldErrors = {};

  ngOnInit(): void {
    void this.loadAll();
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  protected async loadAll(): Promise<void> {
    if (this.loadingInProgress) return;
    this.loadingInProgress = true;
    this.loading = true;
    this.error = '';
    try {
      await Promise.all([this.loadOfertas(), this.loadProductos()]);
      this.applyFilters();
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo cargar ofertas.';
      this.toast.error(this.error);
    } finally {
      this.loading = false;
      this.loadingInProgress = false;
      this.cdr.detectChanges();
    }
  }

  protected applyFilters(): void {
    const query = this.searchQuery.trim();
    this.ofertasFiltradas = this.ofertas
      .filter((oferta) => !this.filterEstado || oferta.estado === this.filterEstado)
      .filter((oferta) => !query || matchesSearchQuery(query, [
        oferta.nombre,
        oferta.tipo,
        oferta.estado,
        this.productNames(oferta).join(' ')
      ]))
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
  }

  protected applyProductFilter(): void {
    const query = this.productSearchQuery.trim();
    this.productosFiltrados = this.productos
      .filter((producto) => producto.estado === 'ACTIVO')
      .filter((producto) => !query || matchesSearchQuery(query, [
        producto.nombre,
        producto.categoriaNombre ?? '',
        String(producto.precioBase)
      ]));
  }

  protected openCreate(): void {
    this.showForm = true;
    this.editingId = null;
    this.form = this.emptyForm();
    this.fieldErrors = {};
    this.productSearchQuery = '';
    this.applyProductFilter();
    this.lockBodyScroll();
  }

  protected openEdit(oferta: OfertaResponse): void {
    this.showForm = true;
    this.editingId = oferta.idOferta;
    this.form = {
      nombre: oferta.nombre,
      tipo: oferta.tipo,
      valorDescuento: oferta.valorDescuento === null ? null : Number(oferta.valorDescuento),
      precioEspecial: oferta.precioEspecial === null ? null : Number(oferta.precioEspecial),
      estado: oferta.estado,
      fechaInicio: this.toDateTimeLocal(oferta.fechaInicio),
      fechaFin: this.toDateTimeLocal(oferta.fechaFin),
      idsProductos: [...(oferta.idsProductos ?? [])]
    };
    this.fieldErrors = {};
    this.productSearchQuery = '';
    this.applyProductFilter();
    this.lockBodyScroll();
  }

  protected closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = this.emptyForm();
    this.fieldErrors = {};
    this.unlockBodyScroll();
  }

  protected async saveOferta(): Promise<void> {
    if (this.saving) return;
    this.fieldErrors = this.validateForm();
    if (Object.keys(this.fieldErrors).length > 0) {
      this.toast.warning('Revisa los campos de la oferta.');
      return;
    }

    this.saving = true;
    this.error = '';
    try {
      const payload = this.buildPayload();
      if (this.editingId) {
        await firstValueFrom(
          this.http.put(`${this.apiBase}/ofertas/${this.editingId}`, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
      } else {
        await firstValueFrom(
          this.http.post(`${this.apiBase}/ofertas`, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
      }
      await this.loadOfertas();
      this.applyFilters();
      this.closeForm();
      this.toast.success(this.editingId ? 'Oferta actualizada correctamente.' : 'Oferta creada correctamente.');
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo guardar la oferta.';
      this.mapBackendError(this.error);
      this.toast.error(this.error);
    } finally {
      this.saving = false;
    }
  }

  protected async toggleEstado(oferta: OfertaResponse): Promise<void> {
    if (this.saving) return;
    const nextEstado: EstadoOferta = oferta.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA';
    this.saving = true;
    try {
      await firstValueFrom(
        this.http.put(`${this.apiBase}/ofertas/${oferta.idOferta}`, {
          nombre: oferta.nombre,
          tipo: oferta.tipo,
          valorDescuento: oferta.valorDescuento,
          precioEspecial: oferta.precioEspecial,
          estado: nextEstado,
          fechaInicio: oferta.fechaInicio,
          fechaFin: oferta.fechaFin,
          idsProductos: oferta.idsProductos ?? []
        }, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      await this.loadOfertas();
      this.applyFilters();
      this.toast.success(nextEstado === 'ACTIVA' ? 'Oferta activada.' : 'Oferta desactivada.');
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo cambiar el estado de la oferta.';
      this.toast.error(this.error);
    } finally {
      this.saving = false;
    }
  }

  protected onTipoChange(): void {
    this.fieldErrors = {};
    if (this.usesPrecioEspecial()) {
      this.form.valorDescuento = null;
    } else {
      this.form.precioEspecial = null;
    }
  }

  protected usesPrecioEspecial(): boolean {
    return this.form.tipo === 'PRECIO_ESPECIAL' || this.form.tipo === 'COMBO';
  }

  protected toggleProducto(idProducto: number): void {
    this.clearFieldError('idsProductos');
    const ids = new Set(this.form.idsProductos);
    if (ids.has(idProducto)) {
      ids.delete(idProducto);
    } else {
      ids.add(idProducto);
    }
    this.form.idsProductos = Array.from(ids);
  }

  protected isProductoSelected(idProducto: number): boolean {
    return this.form.idsProductos.includes(idProducto);
  }

  protected selectedProductos(): ProductoResponse[] {
    const selected = new Set(this.form.idsProductos);
    return this.productos.filter((producto) => selected.has(producto.idProducto));
  }

  protected productNames(oferta: OfertaResponse): string[] {
    const ids = new Set(oferta.idsProductos ?? []);
    return this.productos.filter((p) => ids.has(p.idProducto)).map((p) => p.nombre);
  }

  protected formatMoney(value: number | null | undefined): string {
    return `S/ ${Number(value ?? 0).toFixed(2)}`;
  }

  protected finalPrice(producto: ProductoResponse): number {
    const base = Number(producto.precioBase ?? 0);
    return Math.max(base - this.discountFor(producto), 0);
  }

  protected discountFor(producto: ProductoResponse): number {
    const base = Number(producto.precioBase ?? 0);
    if (this.form.tipo === 'PORCENTAJE') {
      return Math.min(base, base * (Number(this.form.valorDescuento ?? 0) / 100));
    }
    if (this.form.tipo === 'MONTO_FIJO') {
      return Math.min(base, Number(this.form.valorDescuento ?? 0));
    }
    return Math.min(base, Math.max(base - Number(this.form.precioEspecial ?? base), 0));
  }

  protected clearFieldError(field: keyof OfertaFieldErrors): void {
    delete this.fieldErrors[field];
  }

  protected preventInvalidNumberKey(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  protected sanitizePositiveDecimalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    if (cleaned !== input.value) input.value = cleaned;
  }

  private async loadOfertas(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<OfertaResponse[]>(`${this.apiBase}/ofertas`, { headers: this.authHeaders() }).pipe(timeout(10000))
    );
    this.ofertas = data ?? [];
  }

  private async loadProductos(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<ProductoResponse[]>(`${this.apiBase}/productos`, { headers: this.authHeaders() }).pipe(timeout(10000))
    );
    this.productos = data ?? [];
    this.applyProductFilter();
  }

  private validateForm(): OfertaFieldErrors {
    const errors: OfertaFieldErrors = {};
    if (!this.form.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio.';
    }
    if (!this.form.fechaInicio) {
      errors.fechaInicio = 'La fecha de inicio es obligatoria.';
    }
    if (!this.form.fechaFin) {
      errors.fechaFin = 'La fecha de fin es obligatoria.';
    }
    if (this.form.fechaInicio && this.form.fechaFin && new Date(this.form.fechaFin) <= new Date(this.form.fechaInicio)) {
      errors.fechaFin = 'La fecha fin debe ser posterior al inicio.';
    }
    if (this.form.estado === 'ACTIVA') {
      const now = new Date();
      if (this.form.fechaInicio && new Date(this.form.fechaInicio) > now) {
        errors.fechaInicio = 'Una oferta activa debe iniciar ahora o antes.';
      }
      if (this.form.fechaFin && new Date(this.form.fechaFin) <= now) {
        errors.fechaFin = 'Una oferta activa debe tener fecha fin futura.';
      }
    }
    if (this.form.idsProductos.length === 0) {
      errors.idsProductos = 'Selecciona al menos un producto.';
    }
    if (this.form.tipo === 'PORCENTAJE') {
      const value = Number(this.form.valorDescuento ?? 0);
      if (value <= 0 || value > 100) {
        errors.valorDescuento = 'El porcentaje debe estar entre 0.01 y 100.';
      }
    } else if (this.form.tipo === 'MONTO_FIJO') {
      if (Number(this.form.valorDescuento ?? 0) <= 0) {
        errors.valorDescuento = 'El monto debe ser mayor a 0.';
      }
    } else if (Number(this.form.precioEspecial ?? 0) <= 0) {
      errors.precioEspecial = 'El precio especial debe ser mayor a 0.';
    }
    return errors;
  }

  private buildPayload(): OfertaPayload {
    return {
      nombre: this.form.nombre.trim(),
      tipo: this.form.tipo,
      valorDescuento: this.usesPrecioEspecial() ? null : Number(this.form.valorDescuento),
      precioEspecial: this.usesPrecioEspecial() ? Number(this.form.precioEspecial) : null,
      estado: this.form.estado,
      fechaInicio: this.toBackendDateTime(this.form.fechaInicio),
      fechaFin: this.toBackendDateTime(this.form.fechaFin),
      idsProductos: [...new Set(this.form.idsProductos)]
    };
  }

  private emptyForm(): OfertaForm {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      nombre: '',
      tipo: 'PORCENTAJE',
      valorDescuento: null,
      precioEspecial: null,
      estado: 'ACTIVA',
      fechaInicio: this.toDateTimeLocal(now.toISOString()),
      fechaFin: this.toDateTimeLocal(end.toISOString()),
      idsProductos: []
    };
  }

  private toDateTimeLocal(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  }

  private toBackendDateTime(value: string): string {
    return value.length === 16 ? `${value}:00` : value;
  }

  private mapBackendError(message: string): void {
    const lower = message.toLowerCase();
    if (lower.includes('nombre')) this.fieldErrors.nombre = message;
    if (lower.includes('producto')) this.fieldErrors.idsProductos = message;
    if (lower.includes('porcentaje') || lower.includes('monto')) this.fieldErrors.valorDescuento = message;
    if (lower.includes('precio especial')) this.fieldErrors.precioEspecial = message;
    if (lower.includes('fechainicio') || lower.includes('fecha inicio')) this.fieldErrors.fechaInicio = message;
    if (lower.includes('fechafin') || lower.includes('fecha fin')) this.fieldErrors.fechaFin = message;
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey) ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
  }
}
