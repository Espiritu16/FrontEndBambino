import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';

import { AdminPago } from '../shared/admin-operaciones.models';
import { AdminOperacionesService } from '../shared/admin-operaciones.service';
import { badgeClass, formatDateTime, formatMoney, labelFromEnum, normalizeText } from '../shared/admin-formatters';
import { downloadBlob } from '../shared/admin-file-download.util';
import { scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-pagos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-pagos.page.html',
  styleUrl: './admin-pagos.page.scss'
})
export class AdminPagosPageComponent implements OnInit {
  private readonly adminService = inject(AdminOperacionesService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected pagos: AdminPago[] = [];
  protected loading = false;
  protected error = '';
  protected search = '';
  protected metodoFiltro = '';
  protected estadoFiltro = '';
  protected exportingExcel = false;

  ngOnInit(): void {
    void this.loadPagos();
  }

  protected async loadPagos(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.pagos = await firstValueFrom(this.adminService.listarPagos().pipe(timeout(10000)));
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudieron cargar los pagos.';
    } finally {
      this.loading = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected get pagosFiltrados(): AdminPago[] {
    const query = normalizeText(this.search);
    return this.pagos
      .filter((pago) => !this.metodoFiltro || pago.metodo === this.metodoFiltro)
      .filter((pago) => !this.estadoFiltro || pago.estado === this.estadoFiltro)
      .filter((pago) => {
        if (!query) return true;
        return [
          pago.idPago,
          pago.idPedido,
          pago.metodo,
          pago.estado,
          pago.proveedor,
          pago.proveedorTxnId,
          pago.monto
        ].some((value) => normalizeText(value).includes(query));
      });
  }

  protected get metodos(): string[] {
    return this.uniqueValues(this.pagos.map((pago) => pago.metodo));
  }

  protected get estados(): string[] {
    return this.uniqueValues(this.pagos.map((pago) => pago.estado));
  }

  protected get totalPagado(): number {
    return this.pagosFiltrados.reduce((sum, pago) => sum + Number(pago.monto ?? 0), 0);
  }

  protected clearFilters(): void {
    this.search = '';
    this.metodoFiltro = '';
    this.estadoFiltro = '';
  }

  protected async exportExcel(): Promise<void> {
    this.exportingExcel = true;
    this.error = '';
    try {
      const excel = await firstValueFrom(this.adminService.exportarPagosExcel().pipe(timeout(30000)));
      downloadBlob(excel, 'pagos-admin.xlsx');
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo exportar pagos en Excel.';
    } finally {
      this.exportingExcel = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected trackByPago(_: number, pago: AdminPago): number {
    return pago.idPago;
  }

  protected money(value: number | null | undefined): string {
    return formatMoney(value);
  }

  protected date(value: string | null | undefined): string {
    return formatDateTime(value);
  }

  protected label(value: string | null | undefined): string {
    return labelFromEnum(value);
  }

  protected badge(value: string | null | undefined): string {
    return badgeClass(value);
  }

  private uniqueValues(values: Array<string | null>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  }
}
