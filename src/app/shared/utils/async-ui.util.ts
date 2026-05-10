import { ChangeDetectorRef, NgZone } from '@angular/core';

// Fuerza refresco de vista en el siguiente tick para evitar estados
// de loading que se quedan visualmente congelados hasta interacción.
export function scheduleUiRefresh(zone: NgZone, cdr: ChangeDetectorRef): void {
  setTimeout(() => {
    zone.run(() => {
      cdr.detectChanges();
    });
  });
}

export async function runWithUiRefresh<T>(
  task: () => Promise<T>,
  zone: NgZone,
  cdr: ChangeDetectorRef
): Promise<T> {
  try {
    return await task();
  } finally {
    scheduleUiRefresh(zone, cdr);
  }
}
