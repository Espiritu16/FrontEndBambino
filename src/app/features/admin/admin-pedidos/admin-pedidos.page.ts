import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';

import { AdminPedido } from '../shared/admin-operaciones.models';
import { AdminOperacionesService } from '../shared/admin-operaciones.service';
import { badgeClass, formatDateTime, formatMoney, labelFromEnum, normalizeText } from '../shared/admin-formatters';
import { downloadBlob } from '../shared/admin-file-download.util';
import { scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-pedidos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-pedidos.page.html',
  styleUrl: './admin-pedidos.page.scss'
})
export class AdminPedidosPageComponent implements OnInit {
  private readonly adminService = inject(AdminOperacionesService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected pedidos: AdminPedido[] = [];
  protected loading = false;
  protected error = '';
  protected search = '';
  protected estadoFiltro = '';
  protected modalidadFiltro = '';
  protected comprobanteFiltro = '';
  protected exportingExcel = false;

  ngOnInit(): void {
    void this.loadPedidos();
  }

  protected async loadPedidos(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.pedidos = await firstValueFrom(this.adminService.listarPedidos().pipe(timeout(10000)));
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudieron cargar los pedidos.';
    } finally {
      this.loading = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected get pedidosFiltrados(): AdminPedido[] {
    const query = normalizeText(this.search);
    return this.pedidos
      .filter((pedido) => !this.estadoFiltro || pedido.estadoActual === this.estadoFiltro)
      .filter((pedido) => !this.modalidadFiltro || pedido.modalidad === this.modalidadFiltro)
      .filter((pedido) => !this.comprobanteFiltro || pedido.tipoComprobante === this.comprobanteFiltro)
      .filter((pedido) => {
        if (!query) return true;
        return [
          pedido.idPedido,
          pedido.codigoPedido,
          pedido.estadoActual,
          pedido.modalidad,
          pedido.tipoComprobante,
          pedido.total
        ].some((value) => normalizeText(value).includes(query));
      });
  }

  protected get estados(): string[] {
    return this.uniqueValues(this.pedidos.map((pedido) => pedido.estadoActual));
  }

  protected get modalidades(): string[] {
    return this.uniqueValues(this.pedidos.map((pedido) => pedido.modalidad));
  }

  protected get comprobantes(): string[] {
    return this.uniqueValues(this.pedidos.map((pedido) => pedido.tipoComprobante));
  }

  protected get totalVentas(): number {
    return this.pedidosFiltrados.reduce((sum, pedido) => sum + Number(pedido.total ?? 0), 0);
  }

  protected get ticketPromedio(): number {
    const totalPedidos = this.pedidosFiltrados.length;
    return totalPedidos ? this.totalVentas / totalPedidos : 0;
  }

  protected clearFilters(): void {
    this.search = '';
    this.estadoFiltro = '';
    this.modalidadFiltro = '';
    this.comprobanteFiltro = '';
  }

  protected async exportExcel(): Promise<void> {
    this.exportingExcel = true;
    this.error = '';
    try {
      const excel = await firstValueFrom(this.adminService.exportarPedidosExcel().pipe(timeout(30000)));
      downloadBlob(excel, 'pedidos-admin.xlsx');
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo exportar pedidos en Excel.';
    } finally {
      this.exportingExcel = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected trackByPedido(_: number, pedido: AdminPedido): number {
    return pedido.idPedido;
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
