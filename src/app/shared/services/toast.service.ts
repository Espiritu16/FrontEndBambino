import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
  durationMs: number;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly toastsSubject = new BehaviorSubject<ToastItem[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  success(message: string, durationMs = 3200): void {
    this.push('success', message, durationMs);
  }

  error(message: string, durationMs = 5200): void {
    this.push('error', message, durationMs);
  }

  warning(message: string, durationMs = 4200): void {
    this.push('warning', message, durationMs);
  }

  info(message: string, durationMs = 3600): void {
    this.push('info', message, durationMs);
  }

  remove(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((t) => t.id !== id));
  }

  private push(type: ToastType, message: string, durationMs: number): void {
    const item: ToastItem = {
      id: this.nextId++,
      type,
      message,
      durationMs
    };

    this.toastsSubject.next([...this.toastsSubject.value, item]);

    if (durationMs > 0) {
      setTimeout(() => this.remove(item.id), durationMs);
    }
  }
}
