import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin, timeout } from 'rxjs';

import {
  ConfiguracionGlobal,
  EmpresaAdmin,
  SerieComprobanteAdmin,
  TransicionPedidoAdmin,
  ZonaDelivery
} from '../shared/admin-operaciones.models';
import { AdminOperacionesService } from '../shared/admin-operaciones.service';
import { formatMoney, labelFromEnum } from '../shared/admin-formatters';
import { scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-configuracion-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-configuracion.page.html',
  styleUrl: './admin-configuracion.page.scss'
})
export class AdminConfiguracionPageComponent implements OnInit {
  private readonly adminService = inject(AdminOperacionesService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected savingGlobal = false;
  protected error = '';
  protected success = '';
  protected activeTab: 'delivery' | 'global' | 'empresas' | 'series' | 'transiciones' = 'delivery';
  protected global: ConfiguracionGlobal | null = null;
  protected zonas: ZonaDelivery[] = [];
  protected empresas: EmpresaAdmin[] = [];
  protected series: SerieComprobanteAdmin[] = [];
  protected transiciones: TransicionPedidoAdmin[] = [];
  protected savingZonaIds = new Set<number | 'new'>();
  protected zonaErrors: Record<string, string> = {};

  ngOnInit(): void {
    void this.loadConfiguracion();
  }

  protected async loadConfiguracion(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.success = '';
    try {
      const data = await firstValueFrom(
        forkJoin({
          global: this.adminService.obtenerConfiguracionGlobal(),
          zonas: this.adminService.listarZonasDelivery(),
          empresas: this.adminService.listarEmpresas(),
          series: this.adminService.listarSeriesComprobante(),
          transiciones: this.adminService.listarTransicionesPedido()
        }).pipe(timeout(15000))
      );
      this.global = data.global;
      this.zonas = data.zonas;
      this.empresas = data.empresas;
      this.series = data.series;
      this.transiciones = data.transiciones;
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo cargar la configuracion.';
    } finally {
      this.loading = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected addZona(): void {
    this.activeTab = 'delivery';
    this.zonas = [
      {
        idZona: null,
        nombre: '',
        activo: true,
        tarifaBase: 0,
        montoMinimo: 0,
        tiempoEstimadoMinutos: 30,
        coberturaDescripcion: '',
        mapaEmbedUrl: '',
        latitudCentro: null,
        longitudCentro: null,
        radioKm: 10,
        horaInicioAtencion: '10:00',
        horaFinAtencion: '23:00'
      },
      ...this.zonas
    ];
  }

  protected async guardarGlobal(): Promise<void> {
    if (!this.global || this.savingGlobal) return;
    const error = this.validarGlobal(this.global);
    if (error) {
      this.error = error;
      return;
    }
    this.savingGlobal = true;
    this.error = '';
    this.success = '';
    try {
      this.global = await firstValueFrom(this.adminService.actualizarConfiguracionGlobal(this.global).pipe(timeout(10000)));
      this.success = 'Configuracion global actualizada.';
    } catch (error: any) {
      this.error = error?.error?.mensaje || error?.message || 'No se pudo guardar la configuracion global.';
    } finally {
      this.savingGlobal = false;
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected async guardarZona(zona: ZonaDelivery): Promise<void> {
    const key = zona.idZona ?? 'new';
    if (this.savingZonaIds.has(key)) return;
    const error = this.validarZona(zona);
    if (error) {
      this.zonaErrors[String(key)] = error;
      return;
    }

    this.savingZonaIds.add(key);
    this.zonaErrors[String(key)] = '';
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.adminService.guardarZonaDelivery(zona).pipe(timeout(10000)));
      this.success = 'Zona delivery guardada. La cobertura nueva queda disponible para pedidos.';
      this.zonas = await firstValueFrom(this.adminService.listarZonasDelivery().pipe(timeout(10000)));
    } catch (error: any) {
      this.zonaErrors[String(key)] = error?.error?.mensaje || error?.message || 'No se pudo guardar la zona delivery.';
    } finally {
      this.savingZonaIds.delete(key);
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected isSavingZona(zona: ZonaDelivery): boolean {
    return this.savingZonaIds.has(zona.idZona ?? 'new');
  }

  protected zonaError(zona: ZonaDelivery): string {
    return this.zonaErrors[String(zona.idZona ?? 'new')] ?? '';
  }

  protected setTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  protected money(value: number | null | undefined): string {
    return formatMoney(value);
  }

  protected label(value: string | null | undefined): string {
    return labelFromEnum(value);
  }

  protected empresaNombre(idEmpresa: number): string {
    const empresa = this.empresas.find((item) => item.idEmpresa === idEmpresa);
    return empresa ? `${empresa.razonSocial} (${empresa.ruc})` : `Empresa #${idEmpresa}`;
  }

  protected trackByZona(index: number, zona: ZonaDelivery): number | string {
    return zona.idZona ?? `new-${index}`;
  }

  protected trackByEmpresa(_: number, empresa: EmpresaAdmin): number {
    return empresa.idEmpresa;
  }

  protected trackBySerie(_: number, serie: SerieComprobanteAdmin): number {
    return serie.idSerie;
  }

  protected trackByTransicion(_: number, transicion: TransicionPedidoAdmin): number {
    return transicion.idTransicion;
  }

  private validarGlobal(global: ConfiguracionGlobal): string {
    if (!global.moneda?.trim()) return 'La moneda es obligatoria.';
    if (Number(global.igvPorcentaje) < 0) return 'El IGV no puede ser negativo.';
    if (Number(global.deliveryMontoMinimo) < 0) return 'El monto minimo delivery no puede ser negativo.';
    if (Number(global.deliveryTiempoMinMinutos) < 1) return 'El tiempo minimo debe ser mayor a 0.';
    if (Number(global.deliveryTiempoMaxMinutos) < Number(global.deliveryTiempoMinMinutos)) return 'El tiempo maximo debe ser mayor o igual al minimo.';
    if (!global.timezone?.trim()) return 'La zona horaria es obligatoria.';
    return '';
  }

  private validarZona(zona: ZonaDelivery): string {
    if (!zona.nombre?.trim()) return 'El nombre de la zona es obligatorio.';
    if (Number(zona.tarifaBase) < 0) return 'La tarifa base no puede ser negativa.';
    if (Number(zona.montoMinimo) < 0) return 'El monto minimo no puede ser negativo.';
    if (Number(zona.tiempoEstimadoMinutos) < 1) return 'El tiempo estimado debe ser mayor a 0.';
    if (Number(zona.radioKm ?? 0) < 0.1) return 'El radio de cobertura debe ser mayor o igual a 0.10 km.';
    return '';
  }
}
