import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import {
  AdminComprobante,
  AdminPago,
  AdminPedido,
  AuditoriaEvento,
  ConfiguracionGlobal,
  EmpresaAdmin,
  SerieComprobanteAdmin,
  TransicionPedidoAdmin,
  ZonaDelivery
} from './admin-operaciones.models';

@Injectable({ providedIn: 'root' })
export class AdminOperacionesService {
  private readonly authStorageKey = 'bambino_basic_auth';

  constructor(private readonly http: HttpClient) {}

  listarPedidos() {
    return this.http.get<AdminPedido[]>(API_ENDPOINTS.admin.pedidos, { headers: this.authHeaders() });
  }

  exportarPedidosExcel() {
    return this.http.get(`${API_ENDPOINTS.admin.pedidos}/exportar-excel`, {
      headers: this.authHeaders(),
      responseType: 'blob'
    });
  }

  listarPagos() {
    return this.http.get<AdminPago[]>(API_ENDPOINTS.admin.pagos, { headers: this.authHeaders() });
  }

  exportarPagosExcel() {
    return this.http.get(`${API_ENDPOINTS.admin.pagos}/exportar-excel`, {
      headers: this.authHeaders(),
      responseType: 'blob'
    });
  }

  listarComprobantes() {
    return this.http.get<AdminComprobante[]>(API_ENDPOINTS.admin.comprobantes, { headers: this.authHeaders() });
  }

  obtenerComprobantePdf(idComprobante: number) {
    return this.http.get(`${API_ENDPOINTS.admin.comprobantes}/${idComprobante}/pdf`, {
      headers: this.authHeaders(),
      responseType: 'blob'
    });
  }

  enviarComprobanteCorreo(idComprobante: number) {
    return this.http.post<AdminComprobante>(`${API_ENDPOINTS.admin.comprobantes}/${idComprobante}/enviar-correo`, null, {
      headers: this.authHeaders()
    });
  }

  exportarComprobantesExcel() {
    return this.http.get(`${API_ENDPOINTS.admin.comprobantes}/exportar-excel`, {
      headers: this.authHeaders(),
      responseType: 'blob'
    });
  }

  obtenerConfiguracionGlobal() {
    return this.http.get<ConfiguracionGlobal>(`${API_ENDPOINTS.admin.configuracion}/global`, { headers: this.authHeaders() });
  }

  actualizarConfiguracionGlobal(configuracion: ConfiguracionGlobal) {
    const body = {
      moneda: configuracion.moneda,
      igvPorcentaje: configuracion.igvPorcentaje,
      deliveryMontoMinimo: configuracion.deliveryMontoMinimo,
      deliveryTiempoMinMinutos: configuracion.deliveryTiempoMinMinutos,
      deliveryTiempoMaxMinutos: configuracion.deliveryTiempoMaxMinutos,
      timezone: configuracion.timezone
    };
    return this.http.put<ConfiguracionGlobal>(`${API_ENDPOINTS.admin.configuracion}/global`, body, { headers: this.authHeaders() });
  }

  listarZonasDelivery() {
    return this.http.get<ZonaDelivery[]>(`${API_ENDPOINTS.admin.configuracion}/zonas-delivery`, { headers: this.authHeaders() });
  }

  guardarZonaDelivery(zona: ZonaDelivery) {
    const body = {
      nombre: zona.nombre,
      activo: zona.activo,
      tarifaBase: zona.tarifaBase,
      montoMinimo: zona.montoMinimo,
      tiempoEstimadoMinutos: zona.tiempoEstimadoMinutos,
      coberturaDescripcion: zona.coberturaDescripcion,
      mapaEmbedUrl: zona.mapaEmbedUrl,
      latitudCentro: zona.latitudCentro,
      longitudCentro: zona.longitudCentro,
      radioKm: zona.radioKm,
      horaInicioAtencion: zona.horaInicioAtencion,
      horaFinAtencion: zona.horaFinAtencion
    };
    if (zona.idZona) {
      return this.http.put<ZonaDelivery>(`${API_ENDPOINTS.admin.configuracion}/zonas-delivery/${zona.idZona}`, body, { headers: this.authHeaders() });
    }
    return this.http.post<ZonaDelivery>(`${API_ENDPOINTS.admin.configuracion}/zonas-delivery`, body, { headers: this.authHeaders() });
  }

  listarEmpresas() {
    return this.http.get<EmpresaAdmin[]>(`${API_ENDPOINTS.admin.configuracion}/empresas`, { headers: this.authHeaders() });
  }

  listarSeriesComprobante() {
    return this.http.get<SerieComprobanteAdmin[]>(`${API_ENDPOINTS.admin.configuracion}/series-comprobante`, { headers: this.authHeaders() });
  }

  listarTransicionesPedido() {
    return this.http.get<TransicionPedidoAdmin[]>(`${API_ENDPOINTS.admin.configuracion}/transiciones-pedido`, { headers: this.authHeaders() });
  }

  listarAuditoria(filtros: { entidad?: string; accion?: string; actorTipo?: string }) {
    let params = new HttpParams();
    if (filtros.entidad) params = params.set('entidad', filtros.entidad);
    if (filtros.accion) params = params.set('accion', filtros.accion);
    if (filtros.actorTipo) params = params.set('actorTipo', filtros.actorTipo);
    return this.http.get<AuditoriaEvento[]>(`${API_ENDPOINTS.admin.auditoria}/eventos`, { headers: this.authHeaders(), params });
  }

  exportarAuditoriaExcel(filtros: { entidad?: string; accion?: string; actorTipo?: string }) {
    let params = new HttpParams();
    if (filtros.entidad) params = params.set('entidad', filtros.entidad);
    if (filtros.accion) params = params.set('accion', filtros.accion);
    if (filtros.actorTipo) params = params.set('actorTipo', filtros.actorTipo);
    return this.http.get(`${API_ENDPOINTS.admin.auditoria}/eventos/exportar-excel`, {
      headers: this.authHeaders(),
      params,
      responseType: 'blob'
    });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey);
    return token ? new HttpHeaders({ Authorization: `Basic ${token}` }) : new HttpHeaders();
  }
}
