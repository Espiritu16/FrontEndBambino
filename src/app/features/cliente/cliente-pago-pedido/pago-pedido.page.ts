import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CheckoutStepperComponent } from '../../../shared/components/checkout-stepper/checkout-stepper.component';
import { ToastService } from '../../../shared/services/toast.service';
import {
  CulqiPublicConfig,
  CheckoutValidarRequest,
  CheckoutValidarResponse,
  ClienteCheckoutService
} from '../cliente-checkout/cliente-checkout.service';

interface PagoCheckoutDraft {
  checkout: CheckoutValidarRequest;
  validacion: CheckoutValidarResponse;
  createdAt: string;
}

interface CulqiCheckoutInstance {
  culqi?: (result?: CulqiWindowResult) => void;
  token?: {
    id?: string;
  };
  object?: string;
  id?: string;
  error?: CulqiWindowResult['error'];
  close?: () => void;
  open(): void;
}

interface CulqiCheckoutConstructor {
  new(publicKey: string, config: CulqiCheckoutOptions): CulqiCheckoutInstance;
}

interface CulqiCheckoutOptions {
  settings: {
    title: string;
    currency: string;
    amount: number;
    order?: string;
  };
  options?: {
    lang: string;
    installments: boolean;
    modal: boolean;
    paymentMethods: {
      tarjeta: boolean;
      yape: boolean;
      billetera: boolean;
      bancaMovil: boolean;
      agente: boolean;
      cuotealo: boolean;
    };
    paymentMethodsSort: string[];
  };
  appearance?: {
    theme: string;
  };
}

interface CulqiWindowResult {
  object?: string;
  id?: string;
  token?: {
    id?: string;
  };
  error?: {
    user_message?: string;
    merchant_message?: string;
    message?: string;
  };
  close?: () => void;
}

declare global {
  interface Window {
    CulqiCheckout?: CulqiCheckoutConstructor;
    Culqi?: CulqiWindowResult;
  }
}

@Component({
  selector: 'app-pago-pedido-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent, CheckoutStepperComponent],
  templateUrl: './pago-pedido.page.html',
  styleUrl: './pago-pedido.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PagoPedidoPageComponent implements OnInit {
  private readonly checkoutService = inject(ClienteCheckoutService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly checkoutDraftStorageKey = 'bambino_checkout_pago_payload';
  private readonly confirmPaymentTimeoutMs = 20000;
  private culqiCheckout: CulqiCheckoutInstance | null = null;
  private culqiOrderId: string | null = null;

  protected draft: PagoCheckoutDraft | null = null;
  protected culqiConfig: CulqiPublicConfig | null = null;
  protected culqiReady = false;
  protected loading = true;
  protected openingCheckout = false;
  protected submitting = false;
  protected error = '';

  ngOnInit(): void {
    void this.inicializarPago();
  }

  protected async confirmarPago(): Promise<void> {
    if (!this.draft || this.openingCheckout || this.submitting) return;
    if (!this.culqiConfig?.habilitado) {
      this.error = 'Culqi no está configurado para recibir pagos.';
      this.toast.error(this.error);
      this.cdr.markForCheck();
      return;
    }
    if (!this.culqiReady || !window.CulqiCheckout) {
      this.error = 'Culqi todavía se está cargando. Intenta nuevamente.';
      this.toast.error(this.error);
      this.cdr.markForCheck();
      return;
    }

    this.error = '';
    this.openingCheckout = true;
    this.cdr.markForCheck();

    try {
      await this.ensureCulqiOrder();
      window.Culqi = undefined;
      this.obtenerCulqiCheckout().open();
      this.openingCheckout = false;
      this.cdr.markForCheck();
    } catch {
      this.openingCheckout = false;
      this.error = 'No se pudo abrir Culqi. Intenta nuevamente.';
      this.toast.error(this.error);
      this.cdr.markForCheck();
    }
  }

  private obtenerCulqiCheckout(): CulqiCheckoutInstance {
    if (this.culqiCheckout) {
      return this.culqiCheckout;
    }
    if (!this.draft || !this.culqiConfig || !window.CulqiCheckout) {
      throw new Error('culqi checkout no disponible');
    }

    this.culqiCheckout = new window.CulqiCheckout(this.culqiConfig.publicKey, {
      settings: {
        title: 'Bambino Chicken',
        currency: this.culqiConfig.currency,
        amount: this.toCents(this.draft.validacion.total),
        order: this.culqiOrderId ?? undefined
      },
      options: {
        lang: 'es',
        installments: false,
        modal: true,
        paymentMethods: {
          tarjeta: true,
          yape: true,
          billetera: false,
          bancaMovil: false,
          agente: false,
          cuotealo: false
        },
        paymentMethodsSort: ['tarjeta', 'yape']
      },
      appearance: {
        theme: 'default'
      }
    });
    this.culqiCheckout.culqi = (result?: CulqiWindowResult) => {
      void this.procesarResultadoCulqi(result);
    };
    return this.culqiCheckout;
  }

  private async procesarResultadoCulqi(result?: CulqiWindowResult): Promise<void> {
    const culqiResult = result ?? this.culqiCheckout ?? window.Culqi;
    const token = this.extractCulqiToken(culqiResult);
    if (!token) {
      this.submitting = false;
      this.error = culqiResult?.error?.user_message
        ?? culqiResult?.error?.merchant_message
        ?? culqiResult?.error?.message
        ?? 'Culqi no devolvió un token de pago válido.';
      this.toast.error(this.error);
      this.cdr.markForCheck();
      return;
    }

    this.culqiCheckout?.close?.();
    window.Culqi?.close?.();
    await this.confirmarPagoConToken(token);
  }

  private async confirmarPagoConToken(culqiToken: string): Promise<void> {
    if (!this.draft) return;
    this.submitting = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      const response = await firstValueFrom(this.checkoutService.confirmarPagoCheckout({
        ...this.draft.checkout,
        metodo: this.resolveMetodoPago(culqiToken),
        proveedor: 'CULQI',
        idempotencyKey: this.createIdempotencyKey(),
        culqiToken
      }).pipe(timeout(this.confirmPaymentTimeoutMs)));
      sessionStorage.removeItem(this.checkoutDraftStorageKey);
      this.toast.success('Pago confirmado. Pedido creado.');
      await this.router.navigate(['/comprobante-pedido'], { queryParams: { idPedido: response.pedido.idPedido } });
    } catch (error) {
      this.error = this.resolveErrorMessage(error, 'No pudimos confirmar el pago dentro del tiempo esperado. Intenta nuevamente.');
      this.toast.error(this.error);
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  protected volverCheckout(): void {
    void this.router.navigate(['/checkout']);
  }

  protected formatMoney(value: number | null | undefined): string {
    return `S/ ${Number(value ?? 0).toFixed(2)}`;
  }

  private async inicializarPago(): Promise<void> {
    if (!this.loadDraft()) return;

    try {
      this.culqiConfig = await firstValueFrom(this.checkoutService.obtenerConfiguracionCulqi().pipe(timeout(10000)));
      if (!this.culqiConfig.habilitado) {
        this.error = 'Culqi no está configurado para recibir pagos.';
      } else {
        await this.loadCulqiScript(this.culqiConfig.checkoutScriptUrl);
        this.culqiReady = true;
      }
    } catch (error) {
      this.error = this.resolveErrorMessage(error, 'No se pudo cargar la configuración de Culqi.');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private loadDraft(): boolean {
    const raw = sessionStorage.getItem(this.checkoutDraftStorageKey);
    if (!raw) {
      this.error = 'Primero valida tu checkout para continuar al pago.';
      this.loading = false;
      this.cdr.markForCheck();
      return false;
    }
    try {
      this.draft = JSON.parse(raw) as PagoCheckoutDraft;
      return true;
    } catch {
      sessionStorage.removeItem(this.checkoutDraftStorageKey);
      this.error = 'No pudimos recuperar los datos del checkout.';
      this.loading = false;
      this.cdr.markForCheck();
      return false;
    }
  }

  private loadCulqiScript(scriptUrl: string): Promise<void> {
    if (window.CulqiCheckout) {
      return Promise.resolve();
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-bambino-culqi="true"]');
    if (existing) {
      if (existing.dataset['loaded'] === 'true') {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('culqi script error')), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.dataset['bambinoCulqi'] = 'true';
      script.addEventListener('load', () => {
        script.dataset['loaded'] = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('culqi script error')), { once: true });
      document.head.appendChild(script);
    });
  }

  private toCents(value: number): number {
    return Math.round(Number(value ?? 0) * 100);
  }

  private async ensureCulqiOrder(): Promise<void> {
    if (this.culqiOrderId || !this.draft) {
      return;
    }
    const response = await firstValueFrom(
      this.checkoutService.crearOrdenCulqiCheckout(this.draft.checkout).pipe(timeout(10000))
    );
    this.culqiOrderId = response.orderId;
    if (response.currency && this.culqiConfig && response.currency !== this.culqiConfig.currency) {
      this.culqiConfig = { ...this.culqiConfig, currency: response.currency };
    }
  }

  private resolveMetodoPago(culqiToken: string): 'TARJETA' | 'YAPE' {
    return culqiToken.toLowerCase().startsWith('ype_') ? 'YAPE' : 'TARJETA';
  }

  private extractCulqiToken(result: CulqiWindowResult | undefined): string | null {
    const nestedToken = result?.token?.id?.trim();
    if (nestedToken) {
      return nestedToken;
    }
    const directToken = result?.object === 'token' ? result.id?.trim() : null;
    return directToken || null;
  }

  private createIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `checkout-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse || (typeof error === 'object' && error !== null && 'error' in error)) {
      const body = (error as { error?: { mensaje?: string; message?: string; error?: string } | string | null }).error;
      if (typeof body === 'string' && body.trim()) return body.trim();
      if (typeof body === 'object' && body !== null) {
        const message = body.mensaje ?? body.message ?? body.error;
        if (message?.trim()) return message.trim();
      }
    }
    return fallback;
  }
}
