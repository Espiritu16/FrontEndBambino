import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';

import { AuditoriaEvento } from '../shared/admin-operaciones.models';
import { AdminOperacionesService } from '../shared/admin-operaciones.service';
import { badgeClass, formatDateTime, labelFromEnum, normalizeText } from '../shared/admin-formatters';
import { downloadBlob } from '../shared/admin-file-download.util';
import { scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-auditoria-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-auditoria.page.html',
  styleUrl: './admin-auditoria.page.scss'
})
export class AdminAuditoriaPageComponent implements OnInit {
  private readonly adminService = inject(AdminOperacionesService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected eventos: AuditoriaEvento[] = [];
  protected loading = false;
  protected error = '';
  protected entidadFiltro = '';
  protected accionFiltro = '';
  protected actorTipoFiltro = '';
  protected search = '';
  protected exportingExcel = false;

  ngOnInit(): void {
    void this.loadEventos();
  }

  protected async loadEventos(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.eventos = await firstValueFrom(this.adminService.listarAuditoria({
        entidad: this.entidadFiltro.trim(),
        accion: this.accionFiltro.trim(),
        actorTipo: this.actorTipoFiltro.trim()
      }).pipe(timeout(10000)));
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudieron cargar los eventos de auditoria.';
    } finally {
      this.loading = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected get eventosFiltrados(): AuditoriaEvento[] {
    const query = normalizeText(this.search);
    if (!query) return this.eventos;
    return this.eventos.filter((evento) => [
      evento.idEvento,
      evento.entidad,
      evento.entidadId,
      evento.accion,
      evento.actorTipo,
      evento.idActor,
      evento.canal,
      evento.metadataJson
    ].some((value) => normalizeText(value).includes(query)));
  }

  protected get entidades(): string[] {
    return this.uniqueValues(this.eventos.map((evento) => evento.entidad));
  }

  protected get acciones(): string[] {
    return this.uniqueValues(this.eventos.map((evento) => evento.accion));
  }

  protected get actorTipos(): string[] {
    return ['ADMIN', 'CLIENTE', 'COCINA'];
  }

  protected clearFilters(): void {
    this.entidadFiltro = '';
    this.accionFiltro = '';
    this.actorTipoFiltro = '';
    this.search = '';
    void this.loadEventos();
  }

  protected aplicarFiltrosBackend(): void {
    void this.loadEventos();
  }

  protected async exportExcel(): Promise<void> {
    this.exportingExcel = true;
    this.error = '';
    try {
      const excel = await firstValueFrom(this.adminService.exportarAuditoriaExcel({
        entidad: this.entidadFiltro.trim(),
        accion: this.accionFiltro.trim(),
        actorTipo: this.actorTipoFiltro.trim()
      }).pipe(timeout(30000)));
      downloadBlob(excel, 'auditoria-admin.xlsx');
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo exportar auditoria en Excel.';
    } finally {
      this.exportingExcel = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected prettyJson(value: string | null): string {
    if (!value) return 'Sin metadata';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
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

  protected trackByEvento(_: number, evento: AuditoriaEvento): number {
    return evento.idEvento;
  }

  private uniqueValues(values: Array<string | null>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  }
}
