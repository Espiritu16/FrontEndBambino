import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-comercial-ofertas-page',
  standalone: true,
  template: `
    <section class="admin-module card">
      <p class="overline">Gestión Comercial</p>
      <h2>Ofertas</h2>
      <p>Aquí gestionarás promociones, vigencias y asignación de ofertas a productos específicos.</p>
    </section>
  `,
  styles: `
    :host { display:block; }
    .admin-module { padding: 1.1rem; }
    .overline { margin: 0; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: #8d0a0a; font-weight: 700; }
    h2 { margin: 0.25rem 0 0.45rem; font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; font-size: 2.2rem; color: #8d0a0a; }
    p { margin: 0; color: #475467; }
  `
})
export class AdminComercialOfertasPageComponent {}
