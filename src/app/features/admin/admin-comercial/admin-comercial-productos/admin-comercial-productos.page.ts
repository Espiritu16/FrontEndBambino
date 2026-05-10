import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { matchesSearchQuery } from '../../../../shared/utils/search-match.util';
import { ToastService } from '../../../../shared/services/toast.service';

type EstadoProducto = 'ACTIVO' | 'INACTIVO';

type CategoriaResponse = {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  ordenVisual: number;
  activa: boolean;
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
  estado: EstadoProducto;
  imagenUrl: string | null;
  ordenVisual: number;
};

type ProductoPayload = {
  nombre: string;
  descripcion: string | null;
  idCategoria: number | null;
  precioBase: number | null;
  visibleWeb: boolean;
  disponible: boolean;
  estado: EstadoProducto;
  imagenUrl: string | null;
  ordenVisual: number;
};

type CategoriaPayload = {
  nombre: string;
  descripcion: string | null;
  ordenVisual: number;
  activa: boolean;
};

type ImagenUploadResponse = {
  url: string;
};

@Component({
  selector: 'app-admin-comercial-productos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-comercial-productos.page.html',
  styleUrl: './admin-comercial-productos.page.scss'
})
export class AdminComercialProductosPageComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly enforceExactDimensions = false;
  private readonly apiBase = 'https://backendbambino.onrender.com/api/admin/catalogo';
  private readonly authStorageKey = 'bambino_basic_auth';
  private loadingInProgress = false;

  protected categorias: CategoriaResponse[] = [];
  protected productos: ProductoResponse[] = [];
  protected productosFiltrados: ProductoResponse[] = [];

  protected filterCategoria: number | null = null;
  protected filterEstado: '' | EstadoProducto = '';
  protected searchQuery = '';

  protected loading = false;
  protected saving = false;
  protected uploadingImage = false;
  protected categorySaving = false;
  protected error = '';

  protected showForm = false;
  protected editingId: number | null = null;
  protected showProductOrderModal = false;
  protected productOrderSaving = false;
  protected productOrderDraft: ProductoResponse[] = [];
  private dragProductIndex: number | null = null;
  private editingProductSnapshot: ProductoPayload | null = null;
  protected productFieldErrors: { nombre?: string; descripcion?: string; idCategoria?: string; precioBase?: string; ordenVisual?: string; imagenUrl?: string } = {};
  protected showCategoryForm = false;
  protected showCategoriesManager = false;
  protected showCategoryOrderModal = false;
  protected categoryOrderSaving = false;
  protected orderDraft: CategoriaResponse[] = [];
  private dragIndex: number | null = null;
  protected editingCategoryId: number | null = null;
  private editingCategorySnapshot: CategoriaPayload | null = null;
  protected categoryFieldErrors: { nombre?: string; ordenVisual?: string } = {};

  protected form: ProductoPayload = this.emptyForm();
  protected categoryForm: CategoriaPayload = this.emptyCategoryForm();
  protected selectedImageName = '';

  protected get categoriasActivas(): CategoriaResponse[] {
    return this.categorias.filter((cat) => cat.activa);
  }

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
      await this.loadProductos();
      this.loading = false;
      try {
        await this.loadCategorias();
      } catch {
        this.error = 'No se pudo cargar categorías.';
        this.toast.warning(this.error);
      }
    } catch {
      this.error = 'No se pudo cargar productos.';
      this.toast.error(this.error);
    } finally {
      this.loading = false;
      this.loadingInProgress = false;
      this.applyClientFilters();
      this.cdr.detectChanges();
    }
  }

  protected async applyFilters(): Promise<void> {
    await this.loadProductos();
    this.applyClientFilters();
    this.cdr.detectChanges();
  }

  protected onSearchChange(): void {
    this.applyClientFilters();
  }

  protected openCreate(): void {
    this.showForm = true;
    this.lockBodyScroll();
    this.editingId = null;
    this.form = this.emptyForm();
    this.form.ordenVisual = this.nextProductoOrdenVisual();
    this.syncVisibleWebWithEstado();
    this.editingProductSnapshot = null;
    this.productFieldErrors = {};
    this.selectedImageName = '';
  }

  protected openProductOrderModal(): void {
    this.showProductOrderModal = true;
    this.lockBodyScroll();
    this.productOrderDraft = [...this.productos].sort((a, b) => (a.ordenVisual ?? 0) - (b.ordenVisual ?? 0));
  }

  protected closeProductOrderModal(): void {
    this.showProductOrderModal = false;
    this.productOrderSaving = false;
    this.productOrderDraft = [];
    this.dragProductIndex = null;
    this.refreshBodyScrollLock();
  }

  protected onProductOrderDragStart(index: number): void {
    this.dragProductIndex = index;
  }

  protected onProductOrderDrop(targetIndex: number): void {
    if (this.dragProductIndex === null || this.dragProductIndex === targetIndex) return;
    const items = [...this.productOrderDraft];
    const [moved] = items.splice(this.dragProductIndex, 1);
    items.splice(targetIndex, 0, moved);
    this.productOrderDraft = items;
    this.dragProductIndex = null;
  }

  protected onProductOrderContainerDragOver(event: DragEvent): void {
    event.preventDefault();
    const container = event.currentTarget as HTMLElement | null;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const edge = 56;
    const speed = 18;
    if (y < edge) {
      container.scrollTop -= speed;
    } else if (y > rect.height - edge) {
      container.scrollTop += speed;
    }
  }

  protected async saveProductOrder(): Promise<void> {
    if (this.productOrderSaving) return;
    if (this.productOrderDraft.length === 0) {
      this.toast.warning('No hay productos para ordenar.');
      return;
    }
    this.productOrderSaving = true;
    this.error = '';
    try {
      const idsProductos = this.productOrderDraft.map((p) => p.idProducto);
      await firstValueFrom(
        this.http.put(`${this.apiBase}/productos/orden`, { idsProductos }, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      await this.loadProductos();
      this.applyClientFilters();
      this.closeProductOrderModal();
      this.toast.success('Orden de productos actualizado correctamente.');
    } catch (e: any) {
      this.error = e?.error?.mensaje || e?.message || 'No se pudo guardar el orden de productos.';
      this.toast.error(this.error);
    } finally {
      this.productOrderSaving = false;
    }
  }

  protected openEdit(item: ProductoResponse): void {
    this.showForm = true;
    this.editingId = item.idProducto;
    this.form = {
      nombre: item.nombre,
      descripcion: item.descripcion,
      idCategoria: item.idCategoria,
      precioBase: Number(item.precioBase),
      visibleWeb: item.estado === 'ACTIVO',
      disponible: item.disponible,
      estado: item.estado,
      imagenUrl: item.imagenUrl,
      ordenVisual: item.ordenVisual
    };
    this.syncVisibleWebWithEstado();
    this.editingProductSnapshot = { ...this.form };
    this.productFieldErrors = {};
    this.selectedImageName = '';
  }

  protected closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = this.emptyForm();
    this.editingProductSnapshot = null;
    this.productFieldErrors = {};
    this.selectedImageName = '';
    this.refreshBodyScrollLock();
  }

  protected openCreateCategory(): void {
    this.showCategoryForm = true;
    this.lockBodyScroll();
    this.editingCategoryId = null;
    this.categoryForm = this.emptyCategoryForm();
    this.categoryForm.ordenVisual = this.nextCategoriaOrdenVisual();
    this.editingCategorySnapshot = null;
    this.categoryFieldErrors = {};
  }

  protected closeCategoryForm(): void {
    this.showCategoryForm = false;
    this.editingCategoryId = null;
    this.categoryForm = this.emptyCategoryForm();
    this.editingCategorySnapshot = null;
    this.categoryFieldErrors = {};
    this.refreshBodyScrollLock();
  }

  protected openCategoriesManager(): void {
    this.showCategoriesManager = true;
    this.lockBodyScroll();
    this.showCategoryForm = false;
    this.editingCategoryId = null;
  }

  protected closeCategoriesManager(): void {
    this.showCategoriesManager = false;
    this.closeCategoryForm();
    this.closeCategoryOrderModal();
    this.refreshBodyScrollLock();
  }

  protected openCategoryOrderModal(): void {
    this.showCategoryOrderModal = true;
    this.lockBodyScroll();
    this.orderDraft = [...this.categorias].sort((a, b) => (a.ordenVisual ?? 0) - (b.ordenVisual ?? 0));
  }

  protected closeCategoryOrderModal(): void {
    this.showCategoryOrderModal = false;
    this.categoryOrderSaving = false;
    this.orderDraft = [];
    this.dragIndex = null;
    this.refreshBodyScrollLock();
  }

  protected onOrderDragStart(index: number): void {
    this.dragIndex = index;
  }

  protected onOrderDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onOrderDrop(targetIndex: number): void {
    if (this.dragIndex === null || this.dragIndex === targetIndex) return;
    const items = [...this.orderDraft];
    const [moved] = items.splice(this.dragIndex, 1);
    items.splice(targetIndex, 0, moved);
    this.orderDraft = items;
    this.dragIndex = null;
  }

  protected async saveCategoryOrder(): Promise<void> {
    if (this.categoryOrderSaving) return;
    if (this.orderDraft.length === 0) {
      this.toast.warning('No hay categorías para ordenar.');
      return;
    }
    this.categoryOrderSaving = true;
    this.error = '';
    try {
      const idsCategorias = this.orderDraft.map((c) => c.idCategoria);
      await firstValueFrom(
        this.http.put(`${this.apiBase}/categorias/orden`, { idsCategorias }, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      await this.loadCategorias();
      this.closeCategoryOrderModal();
      this.toast.success('Orden de categorías actualizado correctamente.');
    } catch (e: any) {
      this.error = e?.error?.mensaje || e?.message || 'No se pudo guardar el orden de categorías.';
      this.toast.error(this.error);
    } finally {
      this.categoryOrderSaving = false;
    }
  }

  protected openEditCategory(cat: CategoriaResponse): void {
    this.showCategoryForm = true;
    this.editingCategoryId = cat.idCategoria;
    this.categoryForm = {
      nombre: cat.nombre ?? '',
      descripcion: cat.descripcion ?? '',
      ordenVisual: cat.ordenVisual ?? 1,
      activa: !!cat.activa
    };
    this.editingCategorySnapshot = { ...this.categoryForm };
    this.categoryFieldErrors = {};
  }

  protected async toggleCategoriaActiva(cat: CategoriaResponse): Promise<void> {
    if (this.categorySaving) return;
    this.categorySaving = true;
    this.error = '';
    try {
      await firstValueFrom(this.http.put(`${this.apiBase}/categorias/${cat.idCategoria}`, {
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        ordenVisual: cat.ordenVisual,
        activa: !cat.activa
      }, { headers: this.authHeaders() }).pipe(timeout(10000)));
      await this.loadCategorias();
    } catch (e: any) {
      this.error = e?.error?.mensaje || 'No se pudo actualizar la categoría.';
      this.toast.error(this.error);
    } finally {
      this.categorySaving = false;
    }
  }

  protected async saveCategory(): Promise<void> {
    if (this.categorySaving) return;
    this.categoryFieldErrors = {};
    const nombreNormalizado = this.categoryForm.nombre.trim();
    if (!nombreNormalizado) {
      this.error = 'El nombre de categoría es obligatorio.';
      this.categoryFieldErrors.nombre = this.error;
      this.toast.warning(this.error);
      return;
    }
    if (this.categoryForm.ordenVisual <= 0) {
      this.error = 'El orden visual de categoría debe ser mayor a 0.';
      this.categoryFieldErrors.ordenVisual = this.error;
      this.toast.warning(this.error);
      return;
    }
    const nombreDuplicado = this.categorias.some((cat) =>
      cat.idCategoria !== this.editingCategoryId &&
      (cat.nombre ?? '').trim().toLowerCase() === nombreNormalizado.toLowerCase()
    );
    if (nombreDuplicado) {
      this.error = 'Ya existe una categoría con ese nombre.';
      this.categoryFieldErrors.nombre = this.error;
      this.toast.warning(this.error);
      return;
    }
    const ordenDuplicado = this.categorias.some((cat) =>
      cat.idCategoria !== this.editingCategoryId &&
      cat.ordenVisual === this.categoryForm.ordenVisual
    );
    if (ordenDuplicado) {
      this.error = 'Ya existe una categoría con ese orden visual.';
      this.categoryFieldErrors.ordenVisual = this.error;
      this.toast.warning(this.error);
      return;
    }
    if (this.editingCategoryId && this.editingCategorySnapshot) {
      const sinCambios =
        this.editingCategorySnapshot.nombre.trim().toLowerCase() === nombreNormalizado.toLowerCase() &&
        (this.editingCategorySnapshot.descripcion ?? '') === (this.categoryForm.descripcion ?? '') &&
        this.editingCategorySnapshot.ordenVisual === this.categoryForm.ordenVisual &&
        this.editingCategorySnapshot.activa === this.categoryForm.activa;
      if (sinCambios) {
        this.error = 'No se detectaron cambios para guardar.';
        this.toast.warning(this.error);
        return;
      }
    }

    this.categorySaving = true;
    this.error = '';
    try {
      this.categoryForm.nombre = nombreNormalizado;
      if (this.editingCategoryId) {
        await firstValueFrom(
          this.http.put(`${this.apiBase}/categorias/${this.editingCategoryId}`, this.categoryForm, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
      } else {
        await firstValueFrom(
          this.http.post(`${this.apiBase}/categorias`, this.categoryForm, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
      }
      await this.loadCategorias();
      this.closeCategoryForm();
      this.toast.success(this.editingCategoryId ? 'Categoría actualizada correctamente.' : 'Categoría creada correctamente.');
    } catch (e: any) {
      this.error = e?.error?.mensaje || e?.message || 'No se pudo guardar la categoría.';
      const mensaje = `${this.error}`.toLowerCase();
      if (mensaje.includes('nombre')) this.categoryFieldErrors.nombre = this.error;
      if (mensaje.includes('orden visual')) this.categoryFieldErrors.ordenVisual = this.error;
      this.toast.error(this.error);
    } finally {
      this.categorySaving = false;
    }
  }

  protected clearCategoryFieldError(field: 'nombre' | 'ordenVisual'): void {
    delete this.categoryFieldErrors[field];
  }

  protected async saveProducto(): Promise<void> {
    if (this.saving || this.uploadingImage) return;
    this.productFieldErrors = {};
    const nombreNormalizado = this.form.nombre.trim();
    if (!nombreNormalizado) {
      this.error = 'El nombre es obligatorio.';
      this.productFieldErrors.nombre = this.error;
      this.toast.warning(this.error);
      return;
    }
    if (this.form.idCategoria === null || this.form.idCategoria === undefined) {
      this.error = 'La categoría es obligatoria.';
      this.productFieldErrors.idCategoria = this.error;
      this.toast.warning(this.error);
      return;
    }
    if (this.form.precioBase === null || this.form.precioBase === undefined || this.form.precioBase <= 0) {
      this.error = 'El precio base es obligatorio y debe ser mayor a 0.';
      this.productFieldErrors.precioBase = this.error;
      this.toast.warning(this.error);
      return;
    }
    if (this.form.ordenVisual <= 0) {
      this.error = 'El orden visual debe ser mayor a 0.';
      this.productFieldErrors.ordenVisual = this.error;
      this.toast.warning(this.error);
      return;
    }
    const descripcionNormalizada = (this.form.descripcion ?? '').trim();
    if (!descripcionNormalizada) {
      this.error = 'La descripción es obligatoria.';
      this.productFieldErrors.descripcion = this.error;
      this.toast.warning(this.error);
      return;
    }
    const nombreDuplicado = this.productos.some((p) =>
      p.idProducto !== this.editingId &&
      (p.nombre ?? '').trim().toLowerCase() === nombreNormalizado.toLowerCase()
    );
    if (nombreDuplicado) {
      this.error = 'Ya existe un producto con ese nombre.';
      this.productFieldErrors.nombre = this.error;
      this.toast.warning(this.error);
      return;
    }
    const ordenDuplicado = this.productos.some((p) =>
      p.idProducto !== this.editingId &&
      p.ordenVisual === this.form.ordenVisual
    );
    if (ordenDuplicado) {
      this.error = 'Ya existe un producto con ese orden visual.';
      this.productFieldErrors.ordenVisual = this.error;
      this.toast.warning(this.error);
      return;
    }
    const imagenUrlNormalizada = (this.form.imagenUrl ?? '').trim();
    if (imagenUrlNormalizada && !this.isValidHttpUrl(imagenUrlNormalizada)) {
      this.error = 'La imagen URL debe ser una URL válida (http/https).';
      this.productFieldErrors.imagenUrl = this.error;
      this.toast.warning(this.error);
      return;
    }

    if (this.editingId && this.editingProductSnapshot) {
      const sinCambios =
        this.editingProductSnapshot.nombre.trim().toLowerCase() === nombreNormalizado.toLowerCase() &&
        (this.editingProductSnapshot.descripcion ?? '').trim() === descripcionNormalizada &&
        this.editingProductSnapshot.idCategoria === this.form.idCategoria &&
        this.editingProductSnapshot.precioBase === this.form.precioBase &&
        this.editingProductSnapshot.visibleWeb === this.form.visibleWeb &&
        this.editingProductSnapshot.disponible === this.form.disponible &&
        this.editingProductSnapshot.estado === this.form.estado &&
        (this.editingProductSnapshot.imagenUrl ?? '').trim() === imagenUrlNormalizada &&
        this.editingProductSnapshot.ordenVisual === this.form.ordenVisual;
      if (sinCambios) {
        this.error = 'No se detectaron cambios para guardar.';
        this.toast.warning(this.error);
        return;
      }
    }

    this.form.nombre = nombreNormalizado;
    this.form.imagenUrl = imagenUrlNormalizada;
    this.form.descripcion = descripcionNormalizada;
      if (this.form.imagenUrl === '') {
      this.form.imagenUrl = null;
    }

    this.saving = true;
    this.error = '';
    try {
      if (this.editingId) {
        await firstValueFrom(
          this.http.put(`${this.apiBase}/productos/${this.editingId}`, this.form, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
      } else {
        await firstValueFrom(
          this.http.post(`${this.apiBase}/productos`, this.form, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
      }
      this.closeForm();
      await this.loadProductos();
      this.toast.success(this.editingId ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.');
    } catch (e: any) {
      this.error = e?.error?.mensaje || e?.message || 'No se pudo guardar el producto.';
      const mensaje = `${this.error}`.toLowerCase();
      if (mensaje.includes('nombre')) this.productFieldErrors.nombre = this.error;
      if (mensaje.includes('descripcion')) this.productFieldErrors.descripcion = this.error;
      if (mensaje.includes('categoria')) this.productFieldErrors.idCategoria = this.error;
      if (mensaje.includes('orden visual')) this.productFieldErrors.ordenVisual = this.error;
      if (mensaje.includes('precio')) this.productFieldErrors.precioBase = this.error;
      if (mensaje.includes('imagenurl') || mensaje.includes('imagen url')) this.productFieldErrors.imagenUrl = this.error;
      this.toast.error(this.error);
    } finally {
      this.saving = false;
    }
  }

  protected clearProductFieldError(field: 'nombre' | 'descripcion' | 'idCategoria' | 'precioBase' | 'ordenVisual' | 'imagenUrl'): void {
    delete this.productFieldErrors[field];
  }

  protected async onImageFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.selectedImageName = '';
      return;
    }
    this.selectedImageName = file.name;
    this.uploadingImage = true;
    this.clearProductFieldError('imagenUrl');
    this.error = '';

    try {
      if (this.enforceExactDimensions) {
        await this.ensureImageDimensionsInRange(file, 300, 250, 20);
      }
      const formData = new FormData();
      formData.append('archivo', file);
      const response = await firstValueFrom(
        this.http.post<ImagenUploadResponse>(`${this.apiBase}/productos/imagen`, formData, { headers: this.authHeaders() }).pipe(timeout(20000))
      );
      this.form.imagenUrl = response?.url?.trim() || '';
      if (!this.form.imagenUrl) {
        throw new Error('No se recibió URL de imagen.');
      }
      this.toast.success('Imagen subida correctamente.');
    } catch (e: any) {
      this.error = e?.error?.mensaje || e?.message || 'No se pudo subir la imagen.';
      this.productFieldErrors.imagenUrl = this.error;
      this.toast.error(this.error);
      this.form.imagenUrl = '';
      this.selectedImageName = '';
      input.value = '';
    } finally {
      this.uploadingImage = false;
    }
  }

  private async ensureImageDimensionsInRange(file: File, baseWidth: number, baseHeight: number, tolerancePx: number): Promise<void> {
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

  protected preventInvalidNumberKey(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  protected sanitizePositiveDecimalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (!value) return;
    const cleaned = value
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1');
    if (cleaned !== value) {
      input.value = cleaned;
    }
  }

  protected sanitizePositiveIntegerInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (!value) return;
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned !== value) {
      input.value = cleaned;
    }
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  protected onEstadoProductoChange(): void {
    this.syncVisibleWebWithEstado();
  }

  private async loadCategorias(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<CategoriaResponse[]>(`${this.apiBase}/categorias`, { headers: this.authHeaders() }).pipe(timeout(10000))
    );
    this.categorias = data ?? [];
  }

  private async loadProductos(): Promise<void> {
    const params: string[] = [];
    if (this.filterCategoria !== null) params.push(`idCategoria=${this.filterCategoria}`);
    if (this.filterEstado) params.push(`estado=${this.filterEstado}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    const data = await firstValueFrom(
      this.http.get<ProductoResponse[]>(`${this.apiBase}/productos${qs}`, { headers: this.authHeaders() }).pipe(timeout(10000))
    );
    this.productos = data ?? [];
    this.applyClientFilters();
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey) ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  private emptyForm(): ProductoPayload {
    return {
      nombre: '',
      descripcion: '',
      idCategoria: null,
      precioBase: null,
      visibleWeb: true,
      disponible: true,
      estado: 'ACTIVO',
      imagenUrl: '',
      ordenVisual: 1
    };
  }

  private syncVisibleWebWithEstado(): void {
    this.form.visibleWeb = this.form.estado === 'ACTIVO';
  }

  private nextProductoOrdenVisual(): number {
    const maxOrden = this.productos.reduce((max, p) => Math.max(max, p.ordenVisual ?? 0), 0);
    return maxOrden + 1;
  }

  private nextCategoriaOrdenVisual(): number {
    const maxOrden = this.categorias.reduce((max, c) => Math.max(max, c.ordenVisual ?? 0), 0);
    return maxOrden + 1;
  }

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
  }

  private refreshBodyScrollLock(): void {
    const anyModalOpen =
      this.showForm ||
      this.showCategoriesManager ||
      this.showCategoryForm ||
      this.showCategoryOrderModal ||
      this.showProductOrderModal;
    if (anyModalOpen) {
      this.lockBodyScroll();
    } else {
      this.unlockBodyScroll();
    }
  }

  private emptyCategoryForm(): CategoriaPayload {
    return {
      nombre: '',
      descripcion: '',
      ordenVisual: 1,
      activa: true
    };
  }

  private applyClientFilters(): void {
    const q = this.searchQuery;
    if (!q) {
      this.productosFiltrados = [...this.productos];
      return;
    }
    this.productosFiltrados = this.productos.filter((p) => {
      return matchesSearchQuery(q, [p.nombre, p.categoriaNombre, p.estado]);
    });
  }
}
