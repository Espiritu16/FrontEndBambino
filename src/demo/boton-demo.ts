import { Component } from '@angular/core';
import { almacenDemo } from './almacen-demo';

/**
 * Único control propio de la demo dentro de la aplicación: devuelve los datos
 * a su estado inicial. El aviso de que los datos son ficticios vive en la
 * pantalla de acceso, por la que pasa todo visitante, para no cargar la interfaz.
 */
@Component({
  selector: 'app-boton-demo',
  standalone: true,
  template: `
    <button type="button" class="boton-demo" (click)="reiniciar()" title="Devuelve los datos de la demo a su estado inicial">
      <i class="bi bi-arrow-counterclockwise"></i>
      <span>Reiniciar datos</span>
    </button>
  `,
  styles: [
    `
      .boton-demo {
        position: fixed;
        right: 1rem;
        /* Por encima del botón flotante de contacto, que ya ocupa la esquina. */
        bottom: 5.5rem;
        z-index: 9999;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 0.85rem;
        border-radius: 9999px;
        border: 1px solid rgb(226 232 240);
        background: rgb(255 255 255 / 0.95);
        color: rgb(71 85 105);
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 6px 18px rgb(15 23 42 / 0.12);
        backdrop-filter: blur(6px);
        transition: background 0.15s ease, color 0.15s ease;
      }

      .boton-demo:hover {
        background: white;
        color: rgb(30 41 59);
      }

      /* El sistema alterna el tema con la clase .dark-theme en el elemento raiz. */
      :host-context(.dark-theme) .boton-demo {
        border-color: rgb(51 65 85);
        background: rgb(30 41 59 / 0.95);
        color: rgb(203 213 225);
      }

      :host-context(.dark-theme) .boton-demo:hover {
        background: rgb(51 65 85);
        color: white;
      }

      @media (max-width: 767px) {
        .boton-demo {
          right: 0.75rem;
          bottom: 5rem;
          padding: 0.4rem 0.6rem;
        }

        .boton-demo span {
          display: none;
        }
      }
    `,
  ],
})
export class BotonDemo {
  reiniciar(): void {
    almacenDemo.reiniciar();
    window.location.reload();
  }
}
