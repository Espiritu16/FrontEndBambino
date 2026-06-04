import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { withoutCache } from '../../../core/http/cache-context.helpers';

export type ModalidadPedido = 'RECOJO' | 'DELIVERY';
export type TipoComprobantePedido = 'BOLETA' | 'FACTURA';

export interface DireccionCliente {
  idDireccion: number;
  direccionLinea1: string;
  referencia: string | null;
  distrito: string | null;
  ciudad: string | null;
  esPrincipal: boolean;
  activo: boolean;
}

export interface DireccionCrearRequest {
  direccionLinea1: string;
  referencia: string | null;
  distrito: string | null;
  ciudad: string;
  latitud: number | null;
  longitud: number | null;
  googlePlaceId: string | null;
  googlePlusCode: string | null;
}

export interface PerfilCliente {
  idCliente: number;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string | null;
  docTipo: string | null;
  docNumero: string | null;
}

export interface DocumentoCliente {
  idDocumento: number;
  docTipo: string;
  docNumero: string;
  esPrincipal: boolean;
  activo: boolean;
}

export interface DocumentoCrearRequest {
  docTipo: 'DNI' | 'RUC' | 'CE';
  docNumero: string;
}

export interface CheckoutValidarRequest {
  modalidad: ModalidadPedido;
  tipoComprobante: TipoComprobantePedido;
  idDireccion: number | null;
  docNumero: string | null;
  razonSocial: string | null;
  direccionFiscal: string | null;
}

export interface CheckoutValidarResponse {
  valido: boolean;
  mensaje: string;
  modalidad: ModalidadPedido;
  tipoComprobante: TipoComprobantePedido;
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  costoDelivery: number;
  total: number;
}

export interface PedidoCrearRequest {
  modalidad: ModalidadPedido;
  tipoComprobante: TipoComprobantePedido;
  idDireccionEntrega: number | null;
  docNumero: string | null;
  razonSocial: string | null;
  direccionFiscal: string | null;
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  total: number;
}

export interface PedidoResponse {
  idPedido: number;
  codigoPedido: string;
  estadoActual: string;
  modalidad: ModalidadPedido;
  tipoComprobante: TipoComprobantePedido;
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  total: number;
  fechaCreacion: string;
}

export type MetodoPagoPedido = 'TARJETA' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'EFECTIVO' | 'OTRO';

export interface PagoCheckoutConfirmarRequest extends CheckoutValidarRequest {
  metodo: MetodoPagoPedido;
  idempotencyKey: string;
  proveedor: string | null;
  culqiToken: string | null;
}

export interface PagoResponse {
  idPago: number;
  idPedido: number;
  metodo: MetodoPagoPedido;
  estado: string;
  monto: number;
  proveedor: string | null;
  proveedorTxnId: string | null;
  idempotencyKey: string;
  urlPago: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface PagoCheckoutResponse {
  pedido: PedidoResponse;
  pago: PagoResponse;
}

export interface PagoCheckoutOrdenResponse {
  orderId: string;
  total: number;
  currency: string;
}

export interface CulqiPublicConfig {
  publicKey: string;
  checkoutScriptUrl: string;
  currency: string;
  habilitado: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClienteCheckoutService {
  private readonly http = inject(HttpClient);
  private readonly authStorageKey = 'bambino_basic_auth';

  obtenerDirecciones(): Observable<DireccionCliente[]> {
    return this.http.get<DireccionCliente[]>(API_ENDPOINTS.cliente.direcciones, { headers: this.authHeaders() });
  }

  registrarDireccion(request: DireccionCrearRequest): Observable<DireccionCliente> {
    return this.http.post<DireccionCliente>(API_ENDPOINTS.cliente.direcciones, request, { headers: this.authHeaders() });
  }

  obtenerPerfil(): Observable<PerfilCliente> {
    return this.http.get<PerfilCliente>(API_ENDPOINTS.cliente.perfil, { headers: this.authHeaders() });
  }

  obtenerDocumentos(): Observable<DocumentoCliente[]> {
    return this.http.get<DocumentoCliente[]>(`${API_ENDPOINTS.cliente.perfil}/documentos`, { headers: this.authHeaders() });
  }

  registrarDocumento(request: DocumentoCrearRequest): Observable<DocumentoCliente> {
    return this.http.post<DocumentoCliente>(`${API_ENDPOINTS.cliente.perfil}/documentos`, request, { headers: this.authHeaders() });
  }

  validarCheckout(request: CheckoutValidarRequest): Observable<CheckoutValidarResponse> {
    return this.http.post<CheckoutValidarResponse>(
      `${API_ENDPOINTS.cliente.carrito}/checkout/validar`,
      request,
      { headers: this.authHeaders() }
    );
  }

  confirmarCheckout(request: CheckoutValidarRequest): Observable<CheckoutValidarResponse> {
    return this.http.patch<CheckoutValidarResponse>(
      `${API_ENDPOINTS.cliente.carrito}/checkout/confirmar`,
      request,
      { headers: this.authHeaders() }
    );
  }

  crearPedido(request: PedidoCrearRequest): Observable<PedidoResponse> {
    return this.http.post<PedidoResponse>(API_ENDPOINTS.cliente.pedidos, request, { headers: this.authHeaders() });
  }

  listarPedidos(): Observable<PedidoResponse[]> {
    return this.http.get<PedidoResponse[]>(API_ENDPOINTS.cliente.pedidos, {
      headers: this.authHeaders(),
      context: withoutCache()
    });
  }

  obtenerPedido(idPedido: number): Observable<PedidoResponse> {
    return this.http.get<PedidoResponse>(`${API_ENDPOINTS.cliente.pedidos}/${idPedido}`, { headers: this.authHeaders() });
  }

  cancelarPedido(idPedido: number, motivo: string): Observable<PedidoResponse> {
    return this.http.patch<PedidoResponse>(
      `${API_ENDPOINTS.cliente.pedidos}/${idPedido}/cancelar`,
      {
        estadoDestino: 'CANCELADO',
        motivo
      },
      { headers: this.authHeaders() }
    );
  }

  confirmarPagoCheckout(request: PagoCheckoutConfirmarRequest): Observable<PagoCheckoutResponse> {
    return this.http.post<PagoCheckoutResponse>(
      `${API_ENDPOINTS.cliente.pagos}/checkout/confirmar`,
      request,
      { headers: this.authHeaders() }
    );
  }

  crearOrdenCulqiCheckout(request: CheckoutValidarRequest): Observable<PagoCheckoutOrdenResponse> {
    return this.http.post<PagoCheckoutOrdenResponse>(
      `${API_ENDPOINTS.cliente.pagos}/checkout/culqi/orden`,
      request,
      { headers: this.authHeaders() }
    );
  }

  obtenerConfiguracionCulqi(): Observable<CulqiPublicConfig> {
    return this.http.get<CulqiPublicConfig>(`${API_ENDPOINTS.public.pagos}/culqi/configuracion`);
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey)?.trim() ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }
}
