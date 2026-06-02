import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CheckoutStepperComponent } from '../../../shared/components/checkout-stepper/checkout-stepper.component';
import { ToastService } from '../../../shared/services/toast.service';
import { CarritoItem, CarritoResumen, ClienteCarritoService } from '../cliente-carrito/cliente-carrito.service';
import {
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
export class CheckoutPageComponent implements OnInit {
  private readonly checkoutDraftStorageKey = 'bambino_checkout_pago_payload';
  private readonly carritoService = inject(ClienteCarritoService);
  private readonly checkoutService = inject(ClienteCheckoutService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected carrito: CarritoResumen | null = null;
  protected direcciones: DireccionCliente[] = [];
  protected perfil: PerfilCliente | null = null;
  protected documentos: DocumentoCliente[] = [];
  protected validacion: CheckoutValidarResponse | null = null;
  protected loading = true;
  protected validating = false;
  protected submitting = false;
  protected registeringRuc = false;
  protected checkoutValidado = false;
  protected error = '';
  protected formError = '';
  protected rucRegistroNumero = '';
  protected form: {
    modalidad: ModalidadPedido;
    tipoComprobante: TipoComprobantePedido;
    idDireccion: number | null;
    docNumero: string;
    razonSocial: string;
    direccionFiscal: string;
  } = {
    modalidad: 'RECOJO',
    tipoComprobante: 'BOLETA',
    idDireccion: null,
    docNumero: '',
    razonSocial: '',
    direccionFiscal: ''
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
      if (!this.form.razonSocial.trim() || !this.form.direccionFiscal.trim()) {
        this.formError = 'Completa razón social y dirección fiscal para la factura.';
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
    const isFactura = this.form.tipoComprobante === 'FACTURA';
    return {
      modalidad: this.form.modalidad,
      tipoComprobante: this.form.tipoComprobante,
      idDireccion: this.form.modalidad === 'DELIVERY' ? this.form.idDireccion : null,
      docNumero: this.form.docNumero.trim(),
      razonSocial: isFactura ? this.form.razonSocial.trim() : null,
      direccionFiscal: isFactura ? this.form.direccionFiscal.trim() : null
    };
  }
}
