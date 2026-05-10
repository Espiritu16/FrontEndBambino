import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-planned-feature-modal',
  standalone: true,
  templateUrl: './planned-feature-modal.component.html',
  styleUrl: './planned-feature-modal.component.scss'
})
export class PlannedFeatureModalComponent {
  @Input() title = 'Módulo en desarrollo';
  @Input() message = 'Este módulo está previsto para el 3er avance.';
  @Input() buttonText = 'Entendido';

  @Output() close = new EventEmitter<void>();
}
