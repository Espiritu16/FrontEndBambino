import { Injectable } from '@angular/core';

type ProductoResponse = {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number | null;
  categoriaNombre: string | null;
  precioBase: number;
  visibleWeb: boolean;
  disponible: boolean;
  estado: string;
  imagenUrl: string | null;
  ordenVisual: number;
  precioFinal?: number | null;
  descuentoAplicado?: number | null;
  ofertaNombre?: string | null;
};

type InicioCacheState = {
  heroImageUrl: string;
  heroFetchedAt: number;
  promocionesMasPedidos: ProductoResponse[];
  masPedidosFetchedAt: number;
};

@Injectable({ providedIn: 'root' })
export class InicioDataCacheService {
  private state: InicioCacheState = {
    heroImageUrl: '',
    heroFetchedAt: 0,
    promocionesMasPedidos: [],
    masPedidosFetchedAt: 0
  };

  private readonly heroTtlMs = 5 * 60 * 1000;
  private readonly masPedidosTtlMs = 10 * 60 * 1000;

  getHeroImageUrl(): string | null {
    if (!this.state.heroImageUrl) return null;
    if (Date.now() - this.state.heroFetchedAt > this.heroTtlMs) return null;
    return this.state.heroImageUrl;
  }

  setHeroImageUrl(url: string): void {
    this.state.heroImageUrl = url;
    this.state.heroFetchedAt = Date.now();
  }

  clearHeroImageUrl(): void {
    this.state.heroImageUrl = '';
    this.state.heroFetchedAt = 0;
  }

  getMasPedidos(): ProductoResponse[] | null {
    if (this.state.promocionesMasPedidos.length === 0) return null;
    if (Date.now() - this.state.masPedidosFetchedAt > this.masPedidosTtlMs) return null;
    return this.state.promocionesMasPedidos;
  }

  setMasPedidos(data: ProductoResponse[]): void {
    this.state.promocionesMasPedidos = data;
    this.state.masPedidosFetchedAt = Date.now();
  }
}
