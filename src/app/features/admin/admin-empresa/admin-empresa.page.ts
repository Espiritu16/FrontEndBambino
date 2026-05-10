import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  activo: boolean;
};

type EmpresaForm = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  telefono: string;
  correo: string;
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
  private readonly apiBase = 'https://backendbambino.onrender.com/api/admin/configuracion/empresas';
  private readonly authStorageKey = 'bambino_basic_auth';

  protected loading = false;
  protected saving = false;
  protected error = '';

  protected empresas: EmpresaResponse[] = [];
  protected showForm = false;
  protected editingId: number | null = null;

  protected form: EmpresaForm = this.emptyForm();
  protected get hasEmpresaPrincipal(): boolean {
    return this.empresas.length > 0;
  }

  ngOnInit(): void {
    void this.loadEmpresas();
  }

  protected async loadEmpresas(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const data = await firstValueFrom(
        this.http.get<EmpresaResponse[]>(this.apiBase, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      this.empresas = data;
    } catch (e: any) {
      this.error = e?.error?.mensaje || 'No se pudo cargar empresas.';
      this.toast.error(this.error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  protected openCreate(): void {
    if (this.hasEmpresaPrincipal) {
      this.toast.warning('Solo se permite una empresa principal. Edita la existente.');
      return;
    }
    this.editingId = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  protected openEdit(item: EmpresaResponse): void {
    this.editingId = item.idEmpresa;
    this.form = {
      ruc: item.ruc ?? '',
      razonSocial: item.razonSocial ?? '',
      nombreComercial: item.nombreComercial ?? '',
      direccionFiscal: item.direccionFiscal ?? '',
      telefono: item.telefono ?? '',
      correo: item.correo ?? '',
      activo: item.activo ?? true
    };
    this.showForm = true;
  }

  protected closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = this.emptyForm();
  }

  protected async save(): Promise<void> {
    if (this.saving) return;
    if (!this.form.ruc.trim() || !this.form.razonSocial.trim() || !this.form.direccionFiscal.trim()) {
      this.toast.warning('RUC, Razón social y Dirección fiscal son obligatorios.');
      return;
    }

    const payload = {
      ruc: this.form.ruc.trim(),
      razonSocial: this.form.razonSocial.trim(),
      nombreComercial: this.nullIfBlank(this.form.nombreComercial),
      direccionFiscal: this.form.direccionFiscal.trim(),
      telefono: this.nullIfBlank(this.form.telefono),
      correo: this.nullIfBlank(this.form.correo),
      activo: this.form.activo
    };

    this.saving = true;
    this.error = '';
    try {
      if (this.editingId) {
        await firstValueFrom(
          this.http.put<EmpresaResponse>(`${this.apiBase}/${this.editingId}`, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
        this.toast.success('Empresa actualizada correctamente.');
      } else {
        await firstValueFrom(
          this.http.post<EmpresaResponse>(this.apiBase, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
        this.toast.success('Empresa creada correctamente.');
      }
      this.closeForm();
      await this.loadEmpresas();
    } catch (e: any) {
      const detalle = e?.error?.detalles?.[0]?.mensaje;
      this.error = e?.error?.mensaje || detalle || 'No se pudo guardar la empresa.';
      this.toast.error(this.error);
      this.cdr.detectChanges();
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey);
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  private nullIfBlank(value: string): string | null {
    const v = value.trim();
    return v ? v : null;
  }

  private emptyForm(): EmpresaForm {
    return {
      ruc: '',
      razonSocial: '',
      nombreComercial: '',
      direccionFiscal: '',
      telefono: '',
      correo: '',
      activo: true
    };
  }
}
