import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { scheduleUiRefresh } from '../../../shared/utils/async-ui.util';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

type AuthYoResponse = {
  usuario?: string;
  nombres?: string;
  apellidos?: string;
};

type DireccionResponse = {
  idDireccion: number;
  direccionLinea1: string;
  referencia: string | null;
  distrito: string | null;
  ciudad: string | null;
  latitud?: number | null;
  longitud?: number | null;
  googlePlaceId?: string | null;
  googlePlusCode?: string | null;
  esPrincipal: boolean;
  activo: boolean;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
};

type DireccionForm = {
  direccionLinea1: string;
  referencia: string;
  distrito: string;
  ciudad: string;
  latitud: string;
  longitud: string;
  googlePlaceId: string;
  googlePlusCode: string;
};

type DireccionErrors = Partial<Record<keyof DireccionForm, string>>;
type LngLat = [number, number];
type Ring = LngLat[];
type PolygonCoords = Ring[];
type MultiPolygonCoords = PolygonCoords[];
type GeoDistritoFeature = {
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: PolygonCoords | MultiPolygonCoords;
  };
};

@Component({
  selector: 'app-direcciones-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './direcciones.page.html',
  styleUrl: './direcciones.page.scss'
})
export class DireccionesPageComponent implements OnInit {
  private readonly apiBaseUrl = 'https://backendbambino.onrender.com';
  private readonly authStorageKey = 'bambino_basic_auth';
  private readonly userNameStorageKey = 'bambino_user_name';
  private readonly userRoleStorageKey = 'bambino_user_role';
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected error = '';
  protected profileName = '';
  protected profileEmail = '';
  protected addressCards: DireccionResponse[] = [];

  protected showAddressForm = false;
  protected savingAddress = false;
  protected editingAddressId: number | null = null;
  protected formTitle = 'Agregar dirección';
  protected formErrors: DireccionErrors = {};
  protected addressForm: DireccionForm = this.emptyForm();
  protected geocodingMessage = '';
  protected geocodingError = '';
  protected coverageError = '';
  protected selectedPointCoverage: 'unknown' | 'inside' | 'outside' = 'unknown';
  protected locatingCurrentPosition = false;
  protected readonly mapElementId = 'direccion-map';
  private leafletRef: any;
  private map: any;
  private mapMarker: any;
  private mapLayer: any;
  private chorrillosFeature: GeoDistritoFeature | null = null;
  private mapReady = false;
  private reverseGeocodeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly defaultLat = -12.1700;
  private readonly defaultLng = -77.0100;

  ngOnInit(): void {
    this.hidratarSidebarDesdeSesion();
    void this.loadAll();
  }

  protected async loadAll(): Promise<void> {
    const loadingStartedAt = Date.now();
    this.loading = true;
    this.error = '';
    scheduleUiRefresh(this.ngZone, this.cdr);
    const headers = this.authHeaders();
    try {
      const authYo = await firstValueFrom(this.http.get<AuthYoResponse>(`${this.apiBaseUrl}/api/auth/yo`, { headers }).pipe(timeout(10000)));
      const fullName = `${authYo.nombres ?? ''} ${authYo.apellidos ?? ''}`.trim();
      this.profileName = fullName || 'Cliente';
      this.profileEmail = authYo.usuario ?? '';
    } catch {
      // Mantener datos de sidebar desde sesión local.
    }

    try {
      const direcciones = await firstValueFrom(this.http.get<DireccionResponse[]>(`${this.apiBaseUrl}/api/cliente/direcciones`, { headers }).pipe(timeout(10000)));
      this.addressCards = (direcciones ?? []).filter((d) => d.activo);
    } catch {
      this.error = 'No se pudo cargar tus direcciones.';
      scheduleUiRefresh(this.ngZone, this.cdr);
    } finally {
      this.loading = false;
      if (Date.now() - loadingStartedAt > 12000 && !this.error) {
        this.error = 'La carga demoró demasiado. Intenta nuevamente.';
      }
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  protected openAddAddressForm(): void {
    this.destroyMap();
    this.showAddressForm = true;
    this.editingAddressId = null;
    this.formTitle = 'Agregar dirección';
    this.formErrors = {};
    this.addressForm = this.emptyForm();
    this.geocodingMessage = '';
    this.geocodingError = '';
    void this.ensureMapReadyAndSync();
  }

  protected openEditAddressForm(address: DireccionResponse): void {
    this.destroyMap();
    this.showAddressForm = true;
    this.editingAddressId = address.idDireccion;
    this.formTitle = 'Editar dirección';
    this.formErrors = {};
    this.addressForm = {
      direccionLinea1: address.direccionLinea1 ?? '',
      referencia: address.referencia ?? '',
      distrito: address.distrito ?? '',
      ciudad: 'Lima',
      latitud: this.toStringValue(address.latitud),
      longitud: this.toStringValue(address.longitud),
      googlePlaceId: address.googlePlaceId ?? '',
      googlePlusCode: address.googlePlusCode ?? ''
    };
    this.geocodingMessage = '';
    this.geocodingError = '';
    void this.ensureMapReadyAndSync();
  }

  protected closeAddressForm(): void {
    if (this.savingAddress) return;
    this.destroyMap();
    this.showAddressForm = false;
    this.formErrors = {};
    this.editingAddressId = null;
    this.addressForm = this.emptyForm();
    this.geocodingMessage = '';
    this.geocodingError = '';
  }

  protected hasFieldError(field: keyof DireccionForm): boolean {
    return Boolean(this.formErrors[field]);
  }

  protected async saveAddress(): Promise<void> {
    if (this.savingAddress) return;
    this.formErrors = this.validateForm();
    if (Object.keys(this.formErrors).length > 0) {
      return;
    }

    const payload = this.buildPayload();
    this.savingAddress = true;
    this.error = '';

    try {
      if (this.editingAddressId === null) {
        await firstValueFrom(
          this.http.post(`${this.apiBaseUrl}/api/cliente/direcciones`, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
      } else {
        await firstValueFrom(
          this.http.put(`${this.apiBaseUrl}/api/cliente/direcciones/${this.editingAddressId}`, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
      }

      this.closeAddressForm();
      await this.loadAll();
    } catch {
      this.error = this.editingAddressId === null
        ? 'No se pudo agregar la dirección.'
        : 'No se pudo editar la dirección.';
    } finally {
      this.savingAddress = false;
    }
  }

  protected async useCurrentLocation(): Promise<void> {
    if (!navigator.geolocation || this.locatingCurrentPosition) return;
    this.locatingCurrentPosition = true;
    this.geocodingError = '';
    this.geocodingMessage = '';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          const lat = Number(position.coords.latitude.toFixed(7));
          const lng = Number(position.coords.longitude.toFixed(7));
          this.applySelectedPoint(lat, lng, true);
          this.locatingCurrentPosition = false;
        });
      },
      () => {
        this.ngZone.run(() => {
          this.locatingCurrentPosition = false;
          this.geocodingError = 'No se pudo obtener tu ubicación actual.';
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  protected async deleteAddress(address: DireccionResponse): Promise<void> {
    if (!window.confirm('¿Eliminar esta dirección?')) return;
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/api/cliente/direcciones/${address.idDireccion}`, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      await this.loadAll();
    } catch {
      this.error = 'No se pudo eliminar la dirección.';
    }
  }

  protected async setPrincipal(address: DireccionResponse): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/api/cliente/direcciones/${address.idDireccion}/principal`, {}, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      await this.loadAll();
    } catch {
      this.error = 'No se pudo marcar dirección principal.';
    }
  }

  protected goToProfile(): void { void this.router.navigate(['/perfil']); }
  protected goToAddresses(): void { void this.router.navigate(['/direcciones']); }
  protected goToSecurity(): void { void this.router.navigate(['/perfil'], { queryParams: { tab: 'seguridad' } }); }
  protected goToOrders(): void { void this.router.navigate(['/mis-pedidos']); }

  protected formatAddressDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  protected logout(): void {
    localStorage.removeItem(this.authStorageKey);
    localStorage.removeItem('bambino_user_name');
    localStorage.removeItem(this.userRoleStorageKey);
    void this.router.navigate(['/inicio']);
  }

  private validateForm(): DireccionErrors {
    const errors: DireccionErrors = {};
    const f = this.addressForm;

    if (!f.direccionLinea1.trim()) {
      errors.direccionLinea1 = 'La dirección es obligatoria.';
    } else if (f.direccionLinea1.trim().length > 220) {
      errors.direccionLinea1 = 'Máximo 220 caracteres.';
    }

    if (f.referencia.trim().length > 220) errors.referencia = 'Máximo 220 caracteres.';
    if (f.distrito.trim().length > 120) errors.distrito = 'Máximo 120 caracteres.';
    if (f.ciudad.trim().length > 120) errors.ciudad = 'Máximo 120 caracteres.';
    if (f.googlePlaceId.trim().length > 120) errors.googlePlaceId = 'Máximo 120 caracteres.';
    if (f.googlePlusCode.trim().length > 40) errors.googlePlusCode = 'Máximo 40 caracteres.';

    const hasLat = f.latitud.trim().length > 0;
    const hasLng = f.longitud.trim().length > 0;

    if (hasLat !== hasLng) {
      errors.latitud = 'Si envías ubicación, debes enviar latitud y longitud.';
      errors.longitud = 'Si envías ubicación, debes enviar latitud y longitud.';
    }

    if (hasLat && hasLng) {
      const lat = Number(f.latitud);
      const lng = Number(f.longitud);

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        errors.latitud = 'Latitud fuera de rango (-90 a 90).';
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        errors.longitud = 'Longitud fuera de rango (-180 a 180).';
      }
    }

    if (f.googlePlaceId.trim() && (!hasLat || !hasLng)) {
      errors.googlePlaceId = 'googlePlaceId requiere coordenadas.';
    }
    if (this.selectedPointCoverage === 'outside') {
      errors.latitud = 'Sin cobertura en esta zona.';
      errors.longitud = 'Sin cobertura en esta zona.';
      this.coverageError = 'Sin cobertura en esta zona. Selecciona un punto dentro de Chorrillos.';
    } else {
      this.coverageError = '';
    }

    return errors;
  }

  private buildPayload() {
    const f = this.addressForm;
    const latitud = f.latitud.trim() ? Number(f.latitud) : null;
    const longitud = f.longitud.trim() ? Number(f.longitud) : null;
    return {
      direccionLinea1: f.direccionLinea1.trim(),
      referencia: f.referencia.trim() || null,
      distrito: f.distrito.trim() || null,
      ciudad: 'Lima',
      latitud,
      longitud,
      googlePlaceId: f.googlePlaceId.trim() || null,
      googlePlusCode: f.googlePlusCode.trim() || null
    };
  }

  private emptyForm(): DireccionForm {
    return {
      direccionLinea1: '',
      referencia: '',
      distrito: 'Chorrillos',
      ciudad: 'Lima',
      latitud: '',
      longitud: '',
      googlePlaceId: '',
      googlePlusCode: ''
    };
  }

  private async ensureMapReadyAndSync(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
    if (!this.showAddressForm) return;
    if (!this.mapReady) {
      await this.initMap();
    }
    this.syncMapFromForm();
  }

  private async initMap(): Promise<void> {
    const mapEl = document.getElementById(this.mapElementId);
    if (!mapEl) return;

    const L = await import('leaflet');
    this.leafletRef = L;

    this.map = L.map(this.mapElementId, { zoomControl: true }).setView([this.defaultLat, this.defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.map.on('click', (event: any) => {
      const { lat, lng } = event.latlng;
      const latFixed = Number(lat.toFixed(7));
      const lngFixed = Number(lng.toFixed(7));
      this.ngZone.run(() => {
        this.applySelectedPoint(latFixed, lngFixed, true);
      });
    });

    this.map.on('moveend', () => {
      const center = this.map.getCenter();
      const latFixed = Number(center.lat.toFixed(7));
      const lngFixed = Number(center.lng.toFixed(7));
      this.ngZone.run(() => {
        this.applySelectedPoint(latFixed, lngFixed, false);
      });
    });

    try {
      const featureData = await fetch('/geo/chorrillos.geojson').then((response) => response.json());
      this.chorrillosFeature = featureData as GeoDistritoFeature;
      this.mapLayer = L.geoJSON(featureData, {
        style: {
          color: '#dc2626',
          fillColor: '#ef4444',
          fillOpacity: 0.12,
          weight: 2.5
        }
      }).addTo(this.map);
      this.map.fitBounds(this.mapLayer.getBounds(), { padding: [20, 20] });
    } catch {
      // Si falla geojson igual queda operativo el mapa.
    }

    this.mapReady = true;
    setTimeout(() => this.map?.invalidateSize(), 120);
  }

  private syncMapFromForm(): void {
    const lat = Number(this.addressForm.latitud);
    const lng = Number(this.addressForm.longitud);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      this.updateMapMarker(lat, lng, true);
      return;
    }
    this.updateMapMarker(this.defaultLat, this.defaultLng, true);
  }

  private applySelectedPoint(lat: number, lng: number, centerMap = false): void {
    const latText = lat.toFixed(7);
    const lngText = lng.toFixed(7);
    this.addressForm.latitud = latText;
    this.addressForm.longitud = lngText;
    this.addressForm.direccionLinea1 = `Punto seleccionado (${latText}, ${lngText})`;
    this.addressForm.googlePlaceId = `COORD:${latText},${lngText}`.slice(0, 120);
    this.addressForm.googlePlusCode = '';
    this.selectedPointCoverage = this.isInsideCoverage(lat, lng) ? 'inside' : 'outside';
    this.coverageError = this.selectedPointCoverage === 'outside'
      ? 'Sin cobertura en esta zona. Selecciona un punto dentro de Chorrillos.'
      : '';
    this.geocodingMessage = `Punto seleccionado: ${latText}, ${lngText}.`;
    this.geocodingError = '';
    this.updateMapMarker(lat, lng, centerMap);
    if (this.selectedPointCoverage === 'inside') {
      this.scheduleReverseGeocode(lat, lng);
    }
    scheduleUiRefresh(this.ngZone, this.cdr);
  }

  protected canSaveAddress(): boolean {
    return !this.savingAddress && this.selectedPointCoverage !== 'outside';
  }

  private scheduleReverseGeocode(lat: number, lng: number): void {
    if (this.reverseGeocodeDebounceTimer) {
      clearTimeout(this.reverseGeocodeDebounceTimer);
      this.reverseGeocodeDebounceTimer = null;
    }
    this.reverseGeocodeDebounceTimer = setTimeout(() => {
      void this.reverseGeocodeAndFill(lat, lng);
    }, 350);
  }

  private updateMapMarker(lat: number, lng: number, centerMap = false): void {
    if (!this.map || !this.leafletRef) return;
    const L = this.leafletRef;
    if (!this.mapMarker) {
      const pinIcon = L.divIcon({
        html: '<span class="address-pin"></span>',
        className: 'address-pin-wrap',
        iconSize: [26, 36],
        iconAnchor: [13, 34]
      });
      this.mapMarker = L.marker([lat, lng], { draggable: false, icon: pinIcon }).addTo(this.map);
    } else {
      this.mapMarker.setLatLng([lat, lng]);
    }
    if (centerMap) {
      this.map.setView([lat, lng], Math.max(this.map.getZoom() ?? 13, 15));
    }
  }

  private async reverseGeocodeAndFill(lat: number, lng: number): Promise<void> {
    this.geocodingError = '';
    this.geocodingMessage = `Punto seleccionado: ${lat.toFixed(6)}, ${lng.toFixed(6)}. Buscando dirección...`;
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&addressdetails=1`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error('No se pudo consultar geocodificación.');
      }
      const data = await response.json() as {
        place_id?: string | number;
        display_name?: string;
        plus_code?: string;
        address?: { suburb?: string; city?: string; town?: string; county?: string; state_district?: string; };
      };

      const display = (data.display_name ?? '').trim();
      if (display) {
        this.addressForm.direccionLinea1 = display.slice(0, 220);
      }
      const distrito = data.address?.suburb ?? data.address?.county ?? data.address?.state_district ?? '';
      if (distrito) this.addressForm.distrito = distrito.slice(0, 120);
      this.addressForm.ciudad = 'Lima';
      this.addressForm.googlePlaceId = data.place_id ? `OSM:${String(data.place_id)}`.slice(0, 120) : '';
      this.addressForm.googlePlusCode = (data.plus_code ?? '').slice(0, 40);
      this.geocodingMessage = 'Dirección actualizada desde el mapa.';
      scheduleUiRefresh(this.ngZone, this.cdr);
    } catch {
      this.geocodingMessage = `Coordenadas guardadas (${lat.toFixed(6)}, ${lng.toFixed(6)}).`;
      this.geocodingError = 'No se pudo consultar dirección automática ahora. Puedes guardar con coordenadas o completar dirección manual.';
      scheduleUiRefresh(this.ngZone, this.cdr);
    }
  }

  private toStringValue(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private isInsideCoverage(lat: number, lng: number): boolean {
    if (!this.chorrillosFeature) return true;
    const geometry = this.chorrillosFeature.geometry;
    if (geometry.type === 'Polygon') {
      return this.isInsidePolygon(lat, lng, geometry.coordinates as PolygonCoords);
    }
    return (geometry.coordinates as MultiPolygonCoords).some((polygon) => this.isInsidePolygon(lat, lng, polygon));
  }

  private isInsidePolygon(lat: number, lng: number, polygon: PolygonCoords): boolean {
    if (polygon.length === 0) return false;
    const insideOuter = this.isInsideRing(lat, lng, polygon[0]);
    if (!insideOuter) return false;
    for (let i = 1; i < polygon.length; i++) {
      if (this.isInsideRing(lat, lng, polygon[i])) return false;
    }
    return true;
  }

  private isInsideRing(lat: number, lng: number, ring: Ring): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = ring[i][1];
      const xi = ring[i][0];
      const yj = ring[j][1];
      const xj = ring[j][0];
      const intersects = ((yi > lat) !== (yj > lat))
        && (lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey)?.trim() ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  private hidratarSidebarDesdeSesion(): void {
    const nombre = localStorage.getItem(this.userNameStorageKey)?.trim();
    if (nombre) {
      this.profileName = nombre;
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private destroyMap(): void {
    if (this.reverseGeocodeDebounceTimer) {
      clearTimeout(this.reverseGeocodeDebounceTimer);
      this.reverseGeocodeDebounceTimer = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.mapMarker = null;
    this.mapLayer = null;
    this.leafletRef = null;
    this.mapReady = false;
  }
}
