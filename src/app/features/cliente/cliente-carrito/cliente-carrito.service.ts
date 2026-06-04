import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../core/http/api-endpoints';

export interface CarritoItem {
  idCarritoItem: number;
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuentoUnitario: number;
  subtotal: number;
  observacion: string | null;
  imagenUrl: string | null;
}

export interface CarritoResumen {
  idCarrito: number;
  estado: string;
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  costoDelivery: number;
  total: number;
  totalItems: number;
  items: CarritoItem[];
}

export interface CarritoItemAgregarRequest {
  idProducto: number;
  cantidad: number;
  observacion?: string | null;
}

export interface CarritoItemsAgregarRequest {
  items: CarritoItemAgregarRequest[];
}

export interface CarritoItemActualizarRequest {
  cantidad: number;
  observacion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClienteCarritoService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = API_ENDPOINTS.cliente.carrito;
  private readonly authStorageKey = 'bambino_basic_auth';

  obtenerCarrito(): Observable<CarritoResumen> {
    return this.http.get<CarritoResumen>(this.apiBase, { headers: this.authHeaders() });
  }

  agregarItem(request: CarritoItemAgregarRequest): Observable<CarritoResumen> {
    return this.http.post<CarritoResumen>(`${this.apiBase}/items`, request, { headers: this.authHeaders() });
  }

  agregarItems(request: CarritoItemsAgregarRequest): Observable<CarritoResumen> {
    return this.http.post<CarritoResumen>(`${this.apiBase}/items/bulk`, request, { headers: this.authHeaders() });
  }

  actualizarItem(idCarritoItem: number, request: CarritoItemActualizarRequest): Observable<CarritoResumen> {
    return this.http.put<CarritoResumen>(`${this.apiBase}/items/${idCarritoItem}`, request, { headers: this.authHeaders() });
  }

  quitarItem(idCarritoItem: number): Observable<CarritoResumen> {
    return this.http.delete<CarritoResumen>(`${this.apiBase}/items/${idCarritoItem}`, { headers: this.authHeaders() });
  }

  vaciarCarrito(): Observable<CarritoResumen> {
    return this.http.delete<CarritoResumen>(`${this.apiBase}/items`, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey)?.trim() ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }
}
