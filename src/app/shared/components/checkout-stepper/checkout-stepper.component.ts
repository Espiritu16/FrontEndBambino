import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type CheckoutStepKey = 'carrito' | 'checkout' | 'pago' | 'confirmacion';

interface CheckoutStep {
  key: CheckoutStepKey;
  label: string;
}

@Component({
  selector: 'app-checkout-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-stepper.component.html',
  styleUrl: './checkout-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutStepperComponent {
  @Input({ required: true }) current: CheckoutStepKey = 'carrito';

  protected readonly steps: CheckoutStep[] = [
    { key: 'carrito', label: 'Carrito' },
    { key: 'checkout', label: 'Checkout' },
    { key: 'pago', label: 'Pago' },
    { key: 'confirmacion', label: 'Confirmación' }
  ];

  protected get currentIndex(): number {
    return Math.max(0, this.steps.findIndex((step) => step.key === this.current));
  }

  protected stateFor(index: number): 'complete' | 'current' | 'pending' {
    if (index < this.currentIndex) return 'complete';
    if (index === this.currentIndex) return 'current';
    return 'pending';
  }
}
