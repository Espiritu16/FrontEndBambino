import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-comprobantes-page',
  standalone: true,
  template: `
    <section class="card placeholder">
      <p class="overline">Módulo Admin</p>
      <h2>Comprobantes</h2>
      <p>Aquí consultarás comprobantes emitidos y acciones de reenvío/corrección permitidas.</p>
    </section>
  `,
  styles: `
    :host { display:block; }
    .placeholder { padding: 1.1rem; }
    .overline { margin: 0; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #8d0a0a; font-weight: 700; }
    h2 { margin: .25rem 0 .45rem; font-family: 'Bebas Neue', sans-serif; letter-spacing: .04em; font-size: 2.2rem; color: #8d0a0a; }
    p { margin: 0; color: #475467; }
  `
})
export class AdminComprobantesPageComponent {}
