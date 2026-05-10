import { AfterViewInit, ChangeDetectorRef, Component, NgZone, OnDestroy, inject } from '@angular/core';
import { ToastService } from '../../../shared/services/toast.service';

type LngLat = [number, number];
type Ring = LngLat[];
type PolygonCoords = Ring[];
type MultiPolygonCoords = PolygonCoords[];

type DistritoFeature = {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: PolygonCoords | MultiPolygonCoords;
  };
  properties: {
    NOMBDEP: string;
    NOMBPROV: string;
    NOMBDIST: string;
    UBIGEO: string;
  };
};

type UbicacionRestauranteResponse = {
  idZona: number;
  nombreZona: string;
  latitud: number;
  longitud: number;
};

@Component({
  selector: 'app-cobertura-delivery-page',
  standalone: true,
  templateUrl: './cobertura-delivery.page.html',
  styleUrl: './cobertura-delivery.page.scss'
})
export class CoberturaDeliveryPageComponent implements AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  protected consultandoUbicacion = false;

  private readonly apiBaseUrl = 'https://backendbambino.onrender.com';
  private readonly fallbackRestauranteLat = -12.1847986;
  private readonly fallbackRestauranteLng = -76.998044;
  private map: any;
  private marker: any;
  private restauranteMarker: any;
  private clienteMarker: any;
  private leafletRef: any;
  private featureChorrillos: DistritoFeature | null = null;
  private consultaUbicacionTimeoutId: ReturnType<typeof setTimeout> | null = null;

  async ngAfterViewInit(): Promise<void> {
    const leafletModule: any = await import('leaflet');
    const L = leafletModule?.default ?? leafletModule;
    this.leafletRef = L;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });

    this.map = L.map('cobertura-map', {
      zoomControl: true
    }).setView([-12.1748, -77.0138], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    const geoUrl = new URL('geo/chorrillos.geojson', document.baseURI).toString();
    const featureData = await fetch(geoUrl).then((response) => response.json()) as DistritoFeature;
    this.featureChorrillos = featureData;

    const coberturaChorrillos = L.geoJSON(featureData as GeoJSON.GeoJsonObject, {
      style: {
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.14,
        weight: 3
      }
    }).addTo(this.map);
    coberturaChorrillos.bindPopup('Cobertura Chorrillos');
    this.map.fitBounds(coberturaChorrillos.getBounds(), { padding: [20, 20] });
    await this.colocarMarkerRestaurante(L);

    this.map.on('click', (event: any) => {
      const { lat, lng } = event.latlng;
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      } else {
        this.marker = L.marker([lat, lng]).addTo(this.map);
      }

      const dentroCobertura = this.featureChorrillos
        ? this.estaDentroGeometria(lat, lng, this.featureChorrillos.geometry)
        : false;
      if (dentroCobertura) {
        this.toast.success('Tu punto está dentro de cobertura Chorrillos.');
      } else {
        this.toast.warning('Tu punto está fuera de cobertura Chorrillos.');
      }
    });
  }

  private async colocarMarkerRestaurante(L: any): Promise<void> {
    let lat = this.fallbackRestauranteLat;
    let lng = this.fallbackRestauranteLng;
    let nombreZona = 'Restaurante principal';

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/public/delivery/ubicacion-principal`);
      if (response.ok) {
        const ubicacion = await response.json() as UbicacionRestauranteResponse;
        if (Number.isFinite(ubicacion.latitud) && Number.isFinite(ubicacion.longitud)) {
          lat = ubicacion.latitud;
          lng = ubicacion.longitud;
          nombreZona = ubicacion.nombreZona || nombreZona;
        }
      }
    } catch {
      // fallback a coordenadas base locales
    }

    const redIcon = L.divIcon({
      html: '<span class="restaurante-pin"></span>',
      className: 'restaurante-pin-wrap',
      iconSize: [30, 40],
      iconAnchor: [15, 37]
    });
    this.restauranteMarker = L.marker([lat, lng], { icon: redIcon }).addTo(this.map);
    this.restauranteMarker.bindPopup(`${nombreZona}<br/>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
  }

  protected consultarCoberturaConMiUbicacion(): void {
    if (this.consultandoUbicacion) {
      return;
    }
    if (!navigator.geolocation) {
      this.toast.error('Tu navegador no soporta geolocalización.');
      return;
    }
    if (!this.map || !this.leafletRef) {
      return;
    }

    this.iniciarConsultaUbicacion();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          try {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            this.colocarUbicacionCliente(lat, lng);
          } catch {
            this.toast.error('Se obtuvo tu ubicación, pero no se pudo actualizar el mapa.');
          } finally {
            this.finalizarConsultaUbicacion();
          }
        });
      },
      (error) => {
        this.ngZone.run(() => {
          try {
            if (error.code === error.PERMISSION_DENIED) {
              this.toast.warning('Permiso de ubicación denegado. Habilítalo para consultar cobertura.');
              return;
            }
            this.toast.error('No se pudo obtener tu ubicación actual.');
          } finally {
            this.finalizarConsultaUbicacion();
          }
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }

  private iniciarConsultaUbicacion(): void {
    this.consultandoUbicacion = true;
    this.cdr.detectChanges();
    if (this.consultaUbicacionTimeoutId) {
      clearTimeout(this.consultaUbicacionTimeoutId);
    }
    this.consultaUbicacionTimeoutId = setTimeout(() => {
      this.ngZone.run(() => this.finalizarConsultaUbicacion());
    }, 15000);
  }

  private finalizarConsultaUbicacion(): void {
    this.consultandoUbicacion = false;
    if (this.consultaUbicacionTimeoutId) {
      clearTimeout(this.consultaUbicacionTimeoutId);
      this.consultaUbicacionTimeoutId = null;
    }
    this.cdr.detectChanges();
  }

  private colocarUbicacionCliente(lat: number, lng: number): void {
    const L = this.leafletRef;
    const personIcon = L.divIcon({
      html: '<span class="cliente-pin"><span class="material-symbols-outlined">person_pin_circle</span></span>',
      className: 'cliente-pin-wrap',
      iconSize: [38, 46],
      iconAnchor: [19, 42]
    });

    if (this.marker) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
    if (this.clienteMarker) {
      this.clienteMarker.setLatLng([lat, lng]);
    } else {
      this.clienteMarker = L.marker([lat, lng], { icon: personIcon }).addTo(this.map);
    }

    const dentroCobertura = this.featureChorrillos
      ? this.estaDentroGeometria(lat, lng, this.featureChorrillos.geometry)
      : false;
    if (dentroCobertura) {
      this.toast.success('Tu ubicación actual sí tiene cobertura de delivery.');
    } else {
      this.toast.warning('Tu ubicación actual está fuera de cobertura.');
    }
    this.clienteMarker.bindPopup(`Tu ubicación actual<br/>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`).openPopup();
    this.map.setView([lat, lng], 15);
  }

  private estaDentroGeometria(
    lat: number,
    lng: number,
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: PolygonCoords | MultiPolygonCoords }
  ): boolean {
    if (geometry.type === 'Polygon') {
      return this.estaDentroPolygon(lat, lng, geometry.coordinates as PolygonCoords);
    }
    const multipolygon = geometry.coordinates as MultiPolygonCoords;
    return multipolygon.some((polygon) => this.estaDentroPolygon(lat, lng, polygon));
  }

  private estaDentroPolygon(lat: number, lng: number, polygon: PolygonCoords): boolean {
    if (polygon.length === 0) {
      return false;
    }
    const dentroExterior = this.estaDentroAnillo(lat, lng, polygon[0]);
    if (!dentroExterior) {
      return false;
    }
    for (let i = 1; i < polygon.length; i++) {
      if (this.estaDentroAnillo(lat, lng, polygon[i])) {
        return false;
      }
    }
    return true;
  }

  private estaDentroAnillo(lat: number, lng: number, ring: Ring): boolean {
    let dentro = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = ring[i][1];
      const xi = ring[i][0];
      const yj = ring[j][1];
      const xj = ring[j][0];

      const intersecta = ((yi > lat) !== (yj > lat))
        && (lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi);
      if (intersecta) {
        dentro = !dentro;
      }
    }
    return dentro;
  }

  ngOnDestroy(): void {
    if (this.consultaUbicacionTimeoutId) {
      clearTimeout(this.consultaUbicacionTimeoutId);
      this.consultaUbicacionTimeoutId = null;
    }
    if (this.map) {
      this.map.remove();
    }
  }
}
