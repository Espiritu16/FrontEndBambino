import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CheckoutStepperComponent } from '../../../shared/components/checkout-stepper/checkout-stepper.component';
import { ToastService } from '../../../shared/services/toast.service';
import { CarritoItem, CarritoResumen, ClienteCarritoService } from '../cliente-carrito/cliente-carrito.service';
import {
  DireccionCrearRequest,
  CheckoutValidarRequest,
  CheckoutValidarResponse,
  ClienteCheckoutService,
  DireccionCliente,
  DocumentoCliente,
  ModalidadPedido,
  PerfilCliente,
  TipoComprobantePedido
} from './cliente-checkout.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingSpinnerComponent, CheckoutStepperComponent],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  private readonly checkoutDraftStorageKey = 'bambino_checkout_pago_payload';
  private readonly carritoService = inject(ClienteCarritoService);
  private readonly checkoutService = inject(ClienteCheckoutService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  protected readonly mapElementId = 'checkout-direccion-map';
  private leafletRef: any;
  private map: any;
  private mapMarker: any;
  private mapLayer: any;
  private mapReady = false;
  private reverseGeocodeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private chorrillosFeature: GeoDistritoFeature | null = null;
  private readonly defaultLat = -12.1700;
  private readonly defaultLng = -77.0100;

  protected carrito: CarritoResumen | null = null;
  protected direcciones: DireccionCliente[] = [];
  protected perfil: PerfilCliente | null = null;
  protected documentos: DocumentoCliente[] = [];
  protected validacion: CheckoutValidarResponse | null = null;
  protected loading = true;
  protected validating = false;
  protected submitting = false;
  protected registeringRuc = false;
  protected savingAddress = false;
  protected checkoutValidado = false;
  protected error = '';
  protected formError = '';
  protected addressError = '';
  protected geocodingMessage = '';
  protected geocodingError = '';
  protected coverageError = '';
  protected selectedPointCoverage: 'unknown' | 'inside' | 'outside' = 'unknown';
  protected locatingCurrentPosition = false;
  protected rucRegistroNumero = '';
  protected addressErrors: Partial<Record<keyof CheckoutAddressForm, string>> = {};
  protected addressForm: CheckoutAddressForm = this.emptyAddressForm();
  protected form: {
    modalidad: ModalidadPedido;
    tipoComprobante: TipoComprobantePedido;
    idDireccion: number | null;
    docNumero: string;
  } = {
    modalidad: 'RECOJO',
    tipoComprobante: 'BOLETA',
    idDireccion: null,
    docNumero: ''
  };

  ngOnInit(): void {
    this.cargarCheckout();
  }

  protected get items(): CarritoItem[] {
    return this.carrito?.items ?? [];
  }

  protected get hasItems(): boolean {
    return this.items.length > 0;
  }

  protected get resumen(): CarritoResumen | CheckoutValidarResponse | null {
    return this.validacion ?? this.carrito;
  }

  protected get documentoBoleta(): DocumentoCliente | null {
    return this.findDocumento('DNI') ?? this.findDocumento('RUC') ?? this.documentoDesdePerfil(['DNI', 'RUC']);
  }

  protected get documentoFactura(): DocumentoCliente | null {
    return this.findDocumento('RUC') ?? this.documentoDesdePerfil(['RUC']);
  }

  protected get requiereRegistroRuc(): boolean {
    return this.form.tipoComprobante === 'FACTURA' && !this.documentoFactura;
  }

  protected get canCreatePedido(): boolean {
    return this.checkoutValidado && !this.validating && !this.submitting;
  }

  protected cargarCheckout(): void {
    this.loading = true;
    this.error = '';
    this.carritoService.obtenerCarrito()
      .pipe(timeout(10000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (carrito) => {
          this.carrito = carrito;
          try {
            const [direcciones, perfil, documentos] = await Promise.all([
              firstValueFrom(this.checkoutService.obtenerDirecciones().pipe(timeout(10000))),
              firstValueFrom(this.checkoutService.obtenerPerfil().pipe(timeout(10000))),
              firstValueFrom(this.checkoutService.obtenerDocumentos().pipe(timeout(10000)))
            ]);
            this.direcciones = direcciones
              .filter((d) => d.activo);
            this.perfil = perfil;
            this.documentos = documentos.filter((d) => d.activo);
            this.form.idDireccion = this.direcciones.find((d) => d.esPrincipal)?.idDireccion ?? this.direcciones[0]?.idDireccion ?? null;
            this.hidratarDocumentoComprobante();
          } catch {
            this.direcciones = [];
            this.perfil = null;
            this.documentos = [];
          } finally {
            this.loading = false;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.error = 'No se pudo cargar el checkout.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  protected async onCheckoutOptionChange(): Promise<void> {
    this.invalidateCheckoutValidation();
    if (this.form.modalidad === 'RECOJO') {
      this.form.idDireccion = null;
    } else if (!this.form.idDireccion) {
      this.form.idDireccion = this.direcciones.find((d) => d.esPrincipal)?.idDireccion ?? this.direcciones[0]?.idDireccion ?? null;
    }
    this.hidratarDocumentoComprobante();
    if (this.form.modalidad === 'DELIVERY' && this.direcciones.length === 0) {
      void this.ensureMapReadyAndSync();
    } else {
      this.destroyMap();
    }
  }

  protected onCheckoutDataChange(): void {
    this.invalidateCheckoutValidation();
  }

  protected async registrarRucFactura(): Promise<void> {
    const docNumero = this.rucRegistroNumero.trim();
    this.formError = '';
    if (!/^\d{11}$/.test(docNumero)) {
      this.formError = 'Ingresa un RUC válido de 11 dígitos.';
      return;
    }

    this.registeringRuc = true;
    try {
      const documento = await firstValueFrom(
        this.checkoutService.registrarDocumento({ docTipo: 'RUC', docNumero }).pipe(timeout(10000))
      );
      this.documentos = [...this.documentos.filter((d) => d.docTipo.toUpperCase() !== 'RUC'), documento];
      this.form.docNumero = documento.docNumero;
      this.rucRegistroNumero = '';
      this.invalidateCheckoutValidation();
      this.toast.success('RUC registrado para tu factura.');
    } catch {
      this.formError = 'No se pudo registrar el RUC. Revisa que no exista en tu perfil.';
      this.toast.error(this.formError);
    } finally {
      this.registeringRuc = false;
      this.cdr.markForCheck();
    }
  }

  protected hasAddressFieldError(field: keyof CheckoutAddressForm): boolean {
    return Boolean(this.addressErrors[field]);
  }

  protected onAddressFormChange(): void {
    this.addressError = '';
    this.addressErrors = {};
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
          this.cdr.markForCheck();
        });
      },
      () => {
        this.ngZone.run(() => {
          this.locatingCurrentPosition = false;
          this.geocodingError = 'No se pudo obtener tu ubicación actual.';
          this.cdr.markForCheck();
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  protected async registrarDireccionCheckout(): Promise<void> {
    if (this.savingAddress) return;

    this.addressError = '';
    this.addressErrors = this.validateAddressForm();
    if (Object.keys(this.addressErrors).length > 0) {
      return;
    }

    this.savingAddress = true;
    try {
      const direccion = await firstValueFrom(
        this.checkoutService.registrarDireccion(this.buildAddressPayload()).pipe(timeout(10000))
      );
      this.direcciones = [...this.direcciones.filter((d) => d.idDireccion !== direccion.idDireccion), direccion]
        .filter((d) => d.activo);
      this.form.modalidad = 'DELIVERY';
      this.form.idDireccion = direccion.idDireccion;
      this.addressForm = this.emptyAddressForm();
      this.selectedPointCoverage = 'unknown';
      this.geocodingMessage = '';
      this.geocodingError = '';
      this.coverageError = '';
      this.destroyMap();
      this.invalidateCheckoutValidation();
      this.toast.success('Dirección agregada para delivery.');
    } catch (error) {
      this.addressError = this.resolveErrorMessage(error, 'No se pudo agregar la dirección. Intenta nuevamente.');
      this.toast.error(this.addressError);
    } finally {
      this.savingAddress = false;
      this.cdr.markForCheck();
    }
  }

  protected async validarPedido(): Promise<void> {
    if (!this.validateForm()) return;
    this.validating = true;
    this.error = '';
    try {
      const validacion = await firstValueFrom(this.checkoutService.validarCheckout(this.buildCheckoutPayload()).pipe(timeout(10000)));
      this.validacion = validacion;
      this.checkoutValidado = validacion.valido === true;
      if (!this.checkoutValidado) {
        this.formError = validacion.mensaje || 'El checkout no pudo validarse.';
        return;
      }
      this.toast.success('Checkout validado.');
    } catch (error) {
      this.validacion = null;
      this.checkoutValidado = false;
      this.error = this.resolveErrorMessage(error, 'No se pudo validar el checkout. Revisa dirección, documento y cobertura.');
      this.toast.error(this.error);
    } finally {
      this.validating = false;
      this.cdr.markForCheck();
    }
  }

  protected async confirmarPedido(): Promise<void> {
    if (!this.validateForm()) return;
    if (!this.checkoutValidado || !this.validacion) {
      this.formError = 'Valida el checkout antes de crear el pedido.';
      return;
    }
    this.submitting = true;
    this.error = '';
    this.formError = '';

    try {
      const payload = this.buildCheckoutPayload();
      const validacion = await firstValueFrom(this.checkoutService.validarCheckout(payload).pipe(timeout(10000)));
      this.validacion = validacion;
      await firstValueFrom(this.checkoutService.confirmarCheckout(payload).pipe(timeout(10000)));
      sessionStorage.setItem(this.checkoutDraftStorageKey, JSON.stringify({
        checkout: payload,
        validacion,
        createdAt: new Date().toISOString()
      }));

      this.toast.success('Checkout listo para pago.');
      await this.router.navigate(['/pago-pedido']);
    } catch (error) {
      this.error = this.resolveErrorMessage(error, 'No se pudo continuar al pago. Intenta nuevamente.');
      this.toast.error(this.error);
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  protected formatMoney(value: number | null | undefined): string {
    return `S/ ${Number(value ?? 0).toFixed(2)}`;
  }

  private validateForm(): boolean {
    this.formError = '';
    if (!this.hasItems) {
      this.formError = 'Tu carrito está vacío.';
      return false;
    }

    if (this.form.modalidad === 'DELIVERY' && !this.form.idDireccion) {
      this.formError = 'Selecciona una dirección para delivery.';
      return false;
    }

    const docNumero = this.form.docNumero.trim();
    if (this.form.tipoComprobante === 'BOLETA' && !/^\d{8,11}$/.test(docNumero)) {
      this.formError = 'Completa tu DNI o RUC en el perfil para emitir la boleta.';
      return false;
    }

    if (this.form.tipoComprobante === 'FACTURA') {
      if (!/^\d{11}$/.test(docNumero)) {
        this.formError = 'Registra un RUC de 11 dígitos para emitir factura.';
        return false;
      }
    }

    return true;
  }

  private hidratarDocumentoComprobante(): void {
    const documento = this.form.tipoComprobante === 'FACTURA' ? this.documentoFactura : this.documentoBoleta;
    this.form.docNumero = documento?.docNumero ?? '';
  }

  private invalidateCheckoutValidation(): void {
    this.validacion = null;
    this.checkoutValidado = false;
    this.formError = '';
  }

  private validateAddressForm(): Partial<Record<keyof CheckoutAddressForm, string>> {
    const errors: Partial<Record<keyof CheckoutAddressForm, string>> = {};
    const form = this.addressForm;

    if (!form.direccionLinea1.trim()) {
      errors.direccionLinea1 = 'La dirección es obligatoria.';
    } else if (form.direccionLinea1.trim().length > 220) {
      errors.direccionLinea1 = 'Máximo 220 caracteres.';
    }

    if (form.referencia.trim().length > 220) {
      errors.referencia = 'Máximo 220 caracteres.';
    }

    if (form.distrito.trim().length > 120) {
      errors.distrito = 'Máximo 120 caracteres.';
    }

    if (form.ciudad.trim().length > 120) {
      errors.ciudad = 'Máximo 120 caracteres.';
    }

    const hasLat = form.latitud.trim().length > 0;
    const hasLng = form.longitud.trim().length > 0;
    if (hasLat !== hasLng) {
      errors.latitud = 'Selecciona un punto en el mapa.';
      errors.longitud = 'Selecciona un punto en el mapa.';
    }

    if (!hasLat || !hasLng) {
      errors.latitud = 'Selecciona un punto exacto de entrega en el mapa.';
      errors.longitud = 'Selecciona un punto exacto de entrega en el mapa.';
    } else {
      const lat = Number(form.latitud);
      const lng = Number(form.longitud);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        errors.latitud = 'Latitud fuera de rango (-90 a 90).';
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        errors.longitud = 'Longitud fuera de rango (-180 a 180).';
      }
    }

    if (form.googlePlaceId.trim() && (!hasLat || !hasLng)) {
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

  private buildAddressPayload(): DireccionCrearRequest {
    const form = this.addressForm;
    const latitud = form.latitud.trim() ? Number(form.latitud) : null;
    const longitud = form.longitud.trim() ? Number(form.longitud) : null;
    return {
      direccionLinea1: form.direccionLinea1.trim(),
      referencia: form.referencia.trim() || null,
      distrito: form.distrito.trim() || null,
      ciudad: form.ciudad.trim() || 'Lima',
      latitud,
      longitud,
      googlePlaceId: form.googlePlaceId.trim() || null,
      googlePlusCode: form.googlePlusCode.trim() || null
    };
  }

  private emptyAddressForm(): CheckoutAddressForm {
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
    if (this.form.modalidad !== 'DELIVERY' || this.direcciones.length > 0) return;
    if (!this.mapReady) {
      await this.initMap();
    }
    this.syncMapFromForm();
  }

  private async initMap(): Promise<void> {
    const mapEl = document.getElementById(this.mapElementId);
    if (!mapEl) return;

    const leafletModule: any = await import('leaflet');
    const L = leafletModule?.default ?? leafletModule;
    this.leafletRef = L;

    this.map = L.map(this.mapElementId, { zoomControl: true }).setView([this.defaultLat, this.defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.map.on('click', (event: any) => {
      const { lat, lng } = event.latlng;
      this.ngZone.run(() => this.applySelectedPoint(Number(lat.toFixed(7)), Number(lng.toFixed(7)), true));
    });

    this.map.on('moveend', () => {
      const center = this.map.getCenter();
      this.ngZone.run(() => this.applySelectedPoint(Number(center.lat.toFixed(7)), Number(center.lng.toFixed(7)), false));
    });

    try {
      const geoUrl = new URL('geo/chorrillos.geojson', document.baseURI).toString();
      const featureData = await fetch(geoUrl).then((response) => response.json());
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
      // Si falla el geojson, el mapa queda operativo y la cobertura se valida en backend al checkout.
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
    this.addressErrors = {};
    this.updateMapMarker(lat, lng, centerMap);
    if (this.selectedPointCoverage === 'inside') {
      this.scheduleReverseGeocode(lat, lng);
    }
    this.cdr.markForCheck();
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
      this.cdr.markForCheck();
    } catch {
      this.geocodingMessage = `Coordenadas guardadas (${lat.toFixed(6)}, ${lng.toFixed(6)}).`;
      this.geocodingError = 'No se pudo consultar dirección automática ahora. Puedes guardar con coordenadas o completar dirección manual.';
      this.cdr.markForCheck();
    }
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

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse || (typeof error === 'object' && error !== null && 'error' in error)) {
      const body = (error as { error?: { mensaje?: string; message?: string; error?: string } | string | null }).error;
      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }
      if (typeof body === 'object' && body !== null) {
        const message = body.mensaje ?? body.message ?? body.error;
        if (message?.trim()) {
          return message.trim();
        }
      }
    }
    return fallback;
  }

  private findDocumento(docTipo: string): DocumentoCliente | null {
    const tipo = docTipo.toUpperCase();
    return this.documentos.find((d) => d.activo && d.docTipo.toUpperCase() === tipo) ?? null;
  }

  private documentoDesdePerfil(docTipos: string[]): DocumentoCliente | null {
    const docTipo = (this.perfil?.docTipo ?? '').toUpperCase();
    const docNumero = (this.perfil?.docNumero ?? '').trim();
    if (!docNumero || !docTipos.includes(docTipo)) {
      return null;
    }
    return {
      idDocumento: 0,
      docTipo,
      docNumero,
      esPrincipal: true,
      activo: true
    };
  }

  private buildCheckoutPayload(): CheckoutValidarRequest {
    return {
      modalidad: this.form.modalidad,
      tipoComprobante: this.form.tipoComprobante,
      idDireccion: this.form.modalidad === 'DELIVERY' ? this.form.idDireccion : null,
      docNumero: this.form.docNumero.trim(),
      razonSocial: null,
      direccionFiscal: null
    };
  }
}

type CheckoutAddressForm = {
  direccionLinea1: string;
  referencia: string;
  distrito: string;
  ciudad: string;
  latitud: string;
  longitud: string;
  googlePlaceId: string;
  googlePlusCode: string;
};

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
