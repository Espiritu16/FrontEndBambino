import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-pagos-page',
  standalone: true,
  template: `
    <section class="card placeholder">
      <p class="overline">Módulo Admin</p>
      <h2>Pagos</h2>
      <p>Aquí revisarás pagos pendientes/rechazados y acciones de confirmación administrativa.</p>
    </section>
  `,
  styles: `
    :host { display:block; }
    .placeholder { padding: 1.1rem; }
    .overline { margin: 0; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #8d0a0a; font-weight: 700; }
    h2 { margin: .25rem 0 .45rem; font-family: 'Barlow', sans-serif; letter-spacing: .04em; font-size: 2.2rem; color: #8d0a0a; }
    p { margin: 0; color: #475467; }
  `
})
export class AdminPagosPageComponent {}
