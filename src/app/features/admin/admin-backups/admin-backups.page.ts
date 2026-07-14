import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { BackupConfiguracion, BackupHistorial, BackupPreview } from '../shared/admin-operaciones.models';
import { AdminOperacionesService } from '../shared/admin-operaciones.service';
import { downloadBlob } from '../shared/admin-file-download.util';

@Component({
  selector: 'app-admin-backups-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-backups.page.html',
  styleUrl: './admin-backups.page.scss'
})
export class AdminBackupsPageComponent implements OnInit {
  private readonly adminService = inject(AdminOperacionesService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected configuracion: BackupConfiguracion | null = null;
  protected backups: BackupHistorial[] = [];
  protected loading = false;
  protected saving = false;
  protected generating = false;
  protected error = '';
  protected success = '';
  protected preview: BackupPreview | null = null;
  protected previewLoading = false;
  protected previewError = '';

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const [configuracion, backups] = await Promise.all([
        firstValueFrom(this.adminService.obtenerBackupConfiguracion()),
        firstValueFrom(this.adminService.listarBackups())
      ]);
      this.configuracion = configuracion;
      this.backups = backups;
    } catch {
      this.error = 'No se pudo cargar la configuracion de backups.';
    } finally {
      this.loading = false;
      this.syncUi();
    }
  }

  protected async saveConfig(): Promise<void> {
    if (!this.configuracion || this.saving) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    try {
      this.configuracion = await firstValueFrom(this.adminService.actualizarBackupConfiguracion({
        activo: this.configuracion.activo,
        horaEjecucion: this.configuracion.horaEjecucion,
        retencionCantidad: Number(this.configuracion.retencionCantidad),
        rutaDestino: this.configuracion.rutaDestino.trim()
      }));
      this.success = 'Configuracion guardada.';
    } catch {
      this.error = 'No se pudo guardar la configuracion.';
    } finally {
      this.saving = false;
      this.syncUi();
    }
  }

  protected async generateNow(): Promise<void> {
    if (this.generating) return;
    this.generating = true;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.adminService.generarBackup());
      this.success = 'Backup generado correctamente.';
      this.backups = await firstValueFrom(this.adminService.listarBackups());
    } catch {
      this.error = 'No se pudo generar el backup. Revisa que mysqldump este disponible y que la ruta tenga permisos.';
      this.backups = await firstValueFrom(this.adminService.listarBackups()).catch(() => this.backups);
    } finally {
      this.generating = false;
      this.syncUi();
    }
  }

  protected async download(backup: BackupHistorial): Promise<void> {
    if (backup.estado !== 'COMPLETADO') return;
    try {
      const blob = await firstValueFrom(this.adminService.descargarBackup(backup.idBackup));
      downloadBlob(blob, backup.nombreArchivo);
    } catch {
      this.error = 'No se pudo descargar el backup.';
    } finally {
      this.syncUi();
    }
  }

  protected async openPreview(backup: BackupHistorial): Promise<void> {
    if (backup.estado !== 'COMPLETADO') return;
    this.preview = null;
    this.previewError = '';
    this.previewLoading = true;
    try {
      this.preview = await firstValueFrom(this.adminService.obtenerBackupPreview(backup.idBackup));
    } catch {
      this.previewError = 'No se pudo previsualizar el backup.';
    } finally {
      this.previewLoading = false;
      this.syncUi();
    }
  }

  protected closePreview(): void {
    this.preview = null;
    this.previewError = '';
    this.previewLoading = false;
    this.syncUi();
  }

  protected async deleteBackup(backup: BackupHistorial): Promise<void> {
    if (!confirm(`Eliminar ${backup.nombreArchivo}?`)) return;
    this.error = '';
    try {
      await firstValueFrom(this.adminService.eliminarBackup(backup.idBackup));
      this.backups = this.backups.filter((item) => item.idBackup !== backup.idBackup);
      this.success = 'Backup eliminado.';
    } catch {
      this.error = 'No se pudo eliminar el backup.';
    } finally {
      this.syncUi();
    }
  }

  protected statusLabel(status: string): string {
    const labels: Record<string, string> = {
      GENERANDO: 'Generando',
      COMPLETADO: 'Completado',
      ERROR: 'Error'
    };
    return labels[status] ?? status;
  }

  protected triggerLabel(trigger: string): string {
    return trigger === 'AUTOMATICO' ? 'Automatico' : 'Manual';
  }

  protected date(value: string | null): string {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  protected size(bytes: number | null | undefined): string {
    const value = Number(bytes ?? 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected completedBackups(): number {
    return this.backups.filter((backup) => backup.estado === 'COMPLETADO').length;
  }

  protected lastBackup(): BackupHistorial | null {
    return this.backups.find((backup) => backup.estado === 'COMPLETADO') ?? null;
  }

  private syncUi(): void {
    this.ngZone.run(() => this.cdr.detectChanges());
  }
}
