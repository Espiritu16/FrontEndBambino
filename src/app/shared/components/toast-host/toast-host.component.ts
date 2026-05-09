import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-host.component.html',
  styleUrl: './toast-host.component.scss'
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);

  protected readonly iconMap: Record<string, string> = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };

  protected closeToast(id: number): void {
    this.toastService.remove(id);
  }
}
