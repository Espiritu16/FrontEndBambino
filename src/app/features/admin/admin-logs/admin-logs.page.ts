import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { badgeClass, formatDateTime, labelFromEnum, normalizeText } from '../shared/admin-formatters';
import { AdminOperacionesService } from '../shared/admin-operaciones.service';
import { AdminPageResponse, ErrorLogDetalle, ErrorLogResumen } from '../shared/admin-operaciones.models';

type StatusFilter = '' | 400 | 401 | 403 | 404 | 409 | 422 | 500;

interface ApiErrorBody {
  error?: {
    mensaje?: string;
  };
  message?: string;
}

@Component({
  selector: 'app-admin-logs-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-logs.page.html',
  styleUrl: './admin-logs.page.scss'
})
export class AdminLogsPageComponent implements OnInit {
  private readonly adminService = inject(AdminOperacionesService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected logs: ErrorLogResumen[] = [];
  protected selectedLog: ErrorLogDetalle | null = null;
  protected loading = false;
  protected loadingDetail = false;
  protected error = '';
  protected detailError = '';
  protected search = '';
  protected statusCode: StatusFilter = '';
  protected desde = '';
  protected hasta = '';
  protected ruta = '';
  protected usuarioEmail = '';
  protected exceptionClass = '';
  protected page = 0;
  protected size = 20;
  protected totalElements = 0;
  protected totalPages = 0;

  protected readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 400, label: '400 Bad Request' },
    { value: 401, label: '401 Unauthorized' },
    { value: 403, label: '403 Forbidden' },
    { value: 404, label: '404 Not Found' },
    { value: 409, label: '409 Conflict' },
    { value: 422, label: '422 Negocio' },
    { value: 500, label: '500 Error interno' }
  ];

  ngOnInit(): void {
    void this.loadLogs();
  }

  protected async loadLogs(resetPage = false): Promise<void> {
    if (resetPage) this.page = 0;
    this.loading = true;
    this.error = '';
    try {
      const response = await firstValueFrom(this.adminService.listarLogsErrores({
        statusCode: this.statusCode || null,
        desde: this.toBackendDateTime(this.desde),
        hasta: this.toBackendDateTime(this.hasta),
        ruta: this.ruta.trim(),
        usuarioEmail: this.usuarioEmail.trim(),
        exceptionClass: this.exceptionClass.trim(),
        page: this.page,
        size: this.size
      }).pipe(timeout(10000)));
      this.applyPage(response);
    } catch (error: unknown) {
      this.error = this.errorMessage(error, 'No se pudieron cargar los logs de errores.');
    } finally {
      this.loading = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected async openDetail(log: ErrorLogResumen): Promise<void> {
    this.selectedLog = null;
    this.detailError = '';
    this.loadingDetail = true;
    try {
      this.selectedLog = await firstValueFrom(this.adminService.obtenerLogError(log.idError).pipe(timeout(10000)));
    } catch (error: unknown) {
      this.detailError = this.errorMessage(error, 'No se pudo cargar el detalle del log.');
    } finally {
      this.loadingDetail = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected closeDetail(): void {
    this.selectedLog = null;
    this.detailError = '';
    this.loadingDetail = false;
  }

  protected get logsFiltrados(): ErrorLogResumen[] {
    const query = normalizeText(this.search);
    if (!query) return this.logs;
    return this.logs.filter((log) => [
      log.idError,
      log.statusCode,
      log.error,
      log.mensaje,
      log.ruta,
      log.metodoHttp,
      log.usuarioEmail,
      log.actorTipo,
      log.requestId,
      log.exceptionClass
    ].some((value) => normalizeText(value).includes(query)));
  }

  protected get errores500(): number {
    return this.logs.filter((log) => Number(log.statusCode) >= 500).length;
  }

  protected get erroresCliente(): number {
    return this.logs.filter((log) => Number(log.statusCode) >= 400 && Number(log.statusCode) < 500).length;
  }

  protected get canPrevious(): boolean {
    return this.page > 0 && !this.loading;
  }

  protected get canNext(): boolean {
    return this.totalPages > 0 && this.page < this.totalPages - 1 && !this.loading;
  }

  protected clearFilters(): void {
    this.statusCode = '';
    this.desde = '';
    this.hasta = '';
    this.ruta = '';
    this.usuarioEmail = '';
    this.exceptionClass = '';
    this.search = '';
    void this.loadLogs(true);
  }

  protected previousPage(): void {
    if (!this.canPrevious) return;
    this.page -= 1;
    void this.loadLogs();
  }

  protected nextPage(): void {
    if (!this.canNext) return;
    this.page += 1;
    void this.loadLogs();
  }

  protected date(value: string | null | undefined): string {
    return formatDateTime(value);
  }

  protected label(value: string | null | undefined): string {
    return labelFromEnum(value);
  }

  protected badge(value: string | number | null | undefined): string {
    const status = Number(value);
    if (status >= 500) return 'badge-error';
    if (status === 422) return 'badge-negocio';
    if (status === 401 || status === 403) return 'badge-seguridad';
    if (status >= 400) return 'badge-cliente';
    return badgeClass(String(value ?? 'sin-dato'));
  }

  protected prettyJson(value: string | null | undefined): string {
    if (!value) return '[]';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  protected trackByLog(_: number, log: ErrorLogResumen): number {
    return log.idError;
  }

  private applyPage(response: AdminPageResponse<ErrorLogResumen>): void {
    this.logs = response.content ?? [];
    this.totalElements = response.totalElements ?? 0;
    this.totalPages = response.totalPages ?? 0;
    this.page = response.number ?? this.page;
    this.size = response.size ?? this.size;
  }

  private toBackendDateTime(value: string): string | null {
    return value ? value : null;
  }

  private errorMessage(error: unknown, fallback: string): string {
    const apiError = error as ApiErrorBody;
    return apiError?.error?.mensaje || apiError?.message || fallback;
  }
}
