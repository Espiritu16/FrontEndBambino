import { Routes } from '@angular/router';

import { AdminLayoutPageComponent } from './admin-layout/admin-layout.page';
import { AdminDashboardPageComponent } from './admin-dashboard/admin-dashboard.page';
import { AdminPagosPageComponent } from './admin-pagos/admin-pagos.page';
import { AdminComprobantesPageComponent } from './admin-comprobantes/admin-comprobantes.page';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutPageComponent,
    children: [
      { path: '', component: AdminDashboardPageComponent },
      { path: 'comercial', loadChildren: () => import('./admin-comercial/admin-catalogo.routes').then((m) => m.admincatalogoRoutes) },
      { path: 'web', loadChildren: () => import('./admin-web/admin-web.routes').then((m) => m.adminwebRoutes) },
      { path: 'pedidos', loadChildren: () => import('./admin-pedidos/admin-pedidos.routes').then((m) => m.adminpedidosRoutes) },
      { path: 'pagos', component: AdminPagosPageComponent },
      { path: 'comprobantes', component: AdminComprobantesPageComponent },
      { path: 'empresa', loadChildren: () => import('./admin-empresa/admin-empresa.routes').then((m) => m.adminempresaRoutes) },
      { path: 'configuracion', loadChildren: () => import('./admin-configuracion/admin-configuracion.routes').then((m) => m.adminconfiguracionRoutes) },
      { path: 'usuarios', loadChildren: () => import('./admin-usuarios/admin-usuarios.routes').then((m) => m.adminusuariosRoutes) },
      { path: 'logs', loadChildren: () => import('./admin-logs/admin-logs.routes').then((m) => m.adminlogsRoutes) },
      { path: 'auditoria', loadChildren: () => import('./admin-auditoria/admin-auditoria.routes').then((m) => m.adminauditoriaRoutes) }
    ]
  }
];
