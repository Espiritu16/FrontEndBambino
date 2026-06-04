import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';

import { AdminComprobante } from '../shared/admin-operaciones.models';
import { AdminOperacionesService } from '../shared/admin-operaciones.service';
import { badgeClass, formatDateTime, formatMoney, labelFromEnum, normalizeText } from '../shared/admin-formatters';
import { downloadBlob } from '../shared/admin-file-download.util';
import { scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-comprobantes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-comprobantes.page.html',
  styleUrl: './admin-comprobantes.page.scss'
})
export class AdminComprobantesPageComponent implements OnInit {
  private readonly adminService = inject(AdminOperacionesService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected comprobantes: AdminComprobante[] = [];
  protected loading = false;
  protected error = '';
  protected search = '';
  protected tipoFiltro = '';
  protected estadoFiltro = '';
  protected pdfLoadingIds = new Set<number>();
  protected emailSendingIds = new Set<number>();
  protected exportingExcel = false;

  ngOnInit(): void {
    void this.loadComprobantes();
  }

  protected async loadComprobantes(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.comprobantes = await firstValueFrom(this.adminService.listarComprobantes().pipe(timeout(10000)));
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudieron cargar los comprobantes.';
    } finally {
      this.loading = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected get comprobantesFiltrados(): AdminComprobante[] {
    const query = normalizeText(this.search);
    return this.comprobantes
      .filter((comprobante) => !this.tipoFiltro || comprobante.tipo === this.tipoFiltro)
      .filter((comprobante) => !this.estadoFiltro || comprobante.estado === this.estadoFiltro)
      .filter((comprobante) => {
        if (!query) return true;
        return [
          comprobante.idComprobante,
          comprobante.idPedido,
          comprobante.numeroCompleto,
          comprobante.tipo,
          comprobante.estado,
          comprobante.docReceptorTipo,
          comprobante.docReceptorNumero,
          comprobante.razonSocialReceptor,
          comprobante.correoEnviado ? 'correo enviado' : 'correo no enviado',
          comprobante.correoDestino,
          comprobante.correoError,
          this.pdfGenerado(comprobante) ? 'pdf generado' : 'pdf pendiente',
          comprobante.total
        ].some((value) => normalizeText(value).includes(query));
      });
  }

  protected get tipos(): string[] {
    return this.uniqueValues(this.comprobantes.map((comprobante) => comprobante.tipo));
  }

  protected get estados(): string[] {
    return this.uniqueValues(this.comprobantes.map((comprobante) => comprobante.estado));
  }

  protected get totalEmitido(): number {
    return this.comprobantesFiltrados.reduce((sum, comprobante) => sum + Number(comprobante.total ?? 0), 0);
  }

  protected get boletas(): number {
    return this.comprobantesFiltrados.filter((comprobante) => normalizeText(comprobante.tipo) === 'boleta').length;
  }

  protected get facturas(): number {
    return this.comprobantesFiltrados.filter((comprobante) => normalizeText(comprobante.tipo) === 'factura').length;
  }

  protected clearFilters(): void {
    this.search = '';
    this.tipoFiltro = '';
    this.estadoFiltro = '';
  }

  protected async openPdf(comprobante: AdminComprobante): Promise<void> {
    this.error = '';
    const popup = window.open('', '_blank');
    if (!popup) {
      this.error = 'El navegador bloqueo la ventana del PDF. Habilita ventanas emergentes para abrirlo.';
      return;
    }
    popup.document.write('<title>Generando PDF</title><p style="font-family:Arial,sans-serif">Generando comprobante...</p>');
    this.pdfLoadingIds.add(comprobante.idComprobante);
    try {
      const pdf = await firstValueFrom(this.adminService.obtenerComprobantePdf(comprobante.idComprobante).pipe(timeout(15000)));
      const pdfUrl = URL.createObjectURL(pdf);
      popup.location.href = pdfUrl;
      this.comprobantes = this.comprobantes.map((item) => {
        if (item.idComprobante !== comprobante.idComprobante || this.pdfGenerado(item)) {
          return item;
        }
        return { ...item, fechaPdfGenerado: new Date().toISOString() };
      });
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (error: any) {
      popup.close();
      this.error = error?.error?.mensaje || error?.message || 'No se pudo generar el PDF del comprobante.';
    } finally {
      this.pdfLoadingIds.delete(comprobante.idComprobante);
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected isPdfLoading(comprobante: AdminComprobante): boolean {
    return this.pdfLoadingIds.has(comprobante.idComprobante);
  }

  protected async sendEmail(comprobante: AdminComprobante): Promise<void> {
    this.error = '';
    this.emailSendingIds.add(comprobante.idComprobante);
    try {
      const actualizado = await firstValueFrom(this.adminService.enviarComprobanteCorreo(comprobante.idComprobante).pipe(timeout(20000)));
      this.comprobantes = this.comprobantes.map((item) => item.idComprobante === actualizado.idComprobante ? actualizado : item);
      if (!actualizado.correoEnviado) {
        this.error = actualizado.correoError || 'No se pudo enviar el comprobante por correo.';
      }
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo enviar el comprobante por correo.';
    } finally {
      this.emailSendingIds.delete(comprobante.idComprobante);
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected isEmailSending(comprobante: AdminComprobante): boolean {
    return this.emailSendingIds.has(comprobante.idComprobante);
  }

  protected async exportExcel(): Promise<void> {
    this.exportingExcel = true;
    this.error = '';
    try {
      const excel = await firstValueFrom(this.adminService.exportarComprobantesExcel().pipe(timeout(30000)));
      downloadBlob(excel, 'comprobantes-admin.xlsx');
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo exportar comprobantes en Excel.';
    } finally {
      this.exportingExcel = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected trackByComprobante(_: number, comprobante: AdminComprobante): number {
    return comprobante.idComprobante;
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

  protected correoEstado(comprobante: AdminComprobante): string {
    return comprobante.correoEnviado ? 'Enviado' : 'No enviado';
  }

  protected correoBadge(comprobante: AdminComprobante): string {
    if (comprobante.correoEnviado) {
      return 'mail-badge--sent';
    }
    return comprobante.correoError ? 'mail-badge--error' : 'mail-badge--pending';
  }

  protected pdfGenerado(comprobante: AdminComprobante): boolean {
    return Boolean(comprobante.fechaPdfGenerado || comprobante.pdfPath || comprobante.pdfToken);
  }

  protected pdfEstado(comprobante: AdminComprobante): string {
    return this.pdfGenerado(comprobante) ? 'PDF generado' : 'PDF pendiente';
  }

  protected pdfBadge(comprobante: AdminComprobante): string {
    return this.pdfGenerado(comprobante) ? 'pdf-badge--ready' : 'pdf-badge--pending';
  }

  private uniqueValues(values: Array<string | null>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  }
}
