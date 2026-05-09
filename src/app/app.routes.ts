import { Routes } from '@angular/router';

import { AppLayoutComponent } from './core/layout/app-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadChildren: () => import('./features/inicio/inicio.routes').then((m) => m.inicioRoutes) },
      { path: 'login', loadChildren: () => import('./features/login/login.routes').then((m) => m.loginRoutes) },
      { path: 'registro', loadChildren: () => import('./features/registro/registro.routes').then((m) => m.registroRoutes) },
      { path: 'recuperacion-clave', loadChildren: () => import('./features/recuperacion-clave/recuperacion-clave.routes').then((m) => m.recuperacionclaveRoutes) },
      { path: 'carta', loadChildren: () => import('./features/carta/carta.routes').then((m) => m.cartaRoutes) },
      { path: 'ofertas', loadChildren: () => import('./features/ofertas/ofertas.routes').then((m) => m.ofertasRoutes) },
      { path: 'carrito', loadChildren: () => import('./features/carrito/carrito.routes').then((m) => m.carritoRoutes) },
      { path: 'checkout', loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.checkoutRoutes) },
      { path: 'mis-pedidos', loadChildren: () => import('./features/mis-pedidos/mis-pedidos.routes').then((m) => m.mispedidosRoutes) },
      { path: 'detalle-pedido', loadChildren: () => import('./features/detalle-pedido/detalle-pedido.routes').then((m) => m.detallepedidoRoutes) },
      { path: 'perfil', loadChildren: () => import('./features/perfil/perfil.routes').then((m) => m.perfilRoutes) },
      { path: 'direcciones', loadChildren: () => import('./features/direcciones/direcciones.routes').then((m) => m.direccionesRoutes) },
      { path: 'pago-pedido', loadChildren: () => import('./features/pago-pedido/pago-pedido.routes').then((m) => m.pagopedidoRoutes) },
      { path: 'comprobante-pedido', loadChildren: () => import('./features/comprobante-pedido/comprobante-pedido.routes').then((m) => m.comprobantepedidoRoutes) },
      { path: 'cobertura-delivery', loadChildren: () => import('./features/cobertura-delivery/cobertura-delivery.routes').then((m) => m.coberturadeliveryRoutes) },
      { path: 'asistente-chat', loadChildren: () => import('./features/asistente-chat/asistente-chat.routes').then((m) => m.asistentechatRoutes) },
      { path: 'admin-catalogo', loadChildren: () => import('./features/admin-catalogo/admin-catalogo.routes').then((m) => m.admincatalogoRoutes) },
      { path: 'admin-pedidos', loadChildren: () => import('./features/admin-pedidos/admin-pedidos.routes').then((m) => m.adminpedidosRoutes) },
      { path: 'cocina-panel', loadChildren: () => import('./features/cocina-panel/cocina-panel.routes').then((m) => m.cocinapanelRoutes) },
      { path: 'admin-usuarios', loadChildren: () => import('./features/admin-usuarios/admin-usuarios.routes').then((m) => m.adminusuariosRoutes) },
      { path: 'admin-configuracion', loadChildren: () => import('./features/admin-configuracion/admin-configuracion.routes').then((m) => m.adminconfiguracionRoutes) },
      { path: 'admin-auditoria', loadChildren: () => import('./features/admin-auditoria/admin-auditoria.routes').then((m) => m.adminauditoriaRoutes) }
    ]
  },
  { path: '**', redirectTo: 'inicio' }
];
