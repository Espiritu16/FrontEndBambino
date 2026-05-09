import { Routes } from '@angular/router';

import { AdminCatalogoPageComponent } from './admin-catalogo.page';
import { AdminComercialProductosPageComponent } from './admin-comercial-productos/admin-comercial-productos.page';
import { AdminComercialOfertasPageComponent } from './admin-comercial-ofertas/admin-comercial-ofertas.page';

export const admincatalogoRoutes: Routes = [
  {
    path: '',
    component: AdminCatalogoPageComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'productos' },
      { path: 'productos', component: AdminComercialProductosPageComponent },
      { path: 'ofertas', component: AdminComercialOfertasPageComponent }
    ]
  }
];
