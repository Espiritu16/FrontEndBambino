import { Routes } from '@angular/router';

import { AppLayoutComponent } from './core/layout/app-layout.component';

export const routes: Routes = [
  { path: 'admin', loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes) },
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadChildren: () => import('./features/cliente/cliente-inicio/inicio.routes').then((m) => m.inicioRoutes) },
      { path: 'login', loadChildren: () => import('./features/cliente/cliente-login/login.routes').then((m) => m.loginRoutes) },
      { path: 'registro', loadChildren: () => import('./features/cliente/cliente-registro/registro.routes').then((m) => m.registroRoutes) },
      { path: 'recuperacion-clave', loadChildren: () => import('./features/cliente/cliente-recuperacion-clave/recuperacion-clave.routes').then((m) => m.recuperacionclaveRoutes) },
      { path: 'carta', loadChildren: () => import('./features/cliente/cliente-carta/carta.routes').then((m) => m.cartaRoutes) },
      { path: 'promociones', loadChildren: () => import('./features/cliente/cliente-ofertas/ofertas.routes').then((m) => m.ofertasRoutes) },
      { path: 'ofertas', pathMatch: 'full', redirectTo: 'promociones' },
      { path: 'carrito', loadChildren: () => import('./features/cliente/cliente-carrito/carrito.routes').then((m) => m.carritoRoutes) },
      { path: 'checkout', loadChildren: () => import('./features/cliente/cliente-checkout/checkout.routes').then((m) => m.checkoutRoutes) },
      { path: 'mis-pedidos', loadChildren: () => import('./features/cliente/cliente-mis-pedidos/mis-pedidos.routes').then((m) => m.mispedidosRoutes) },
      { path: 'detalle-pedido', loadChildren: () => import('./features/cliente/cliente-detalle-pedido/detalle-pedido.routes').then((m) => m.detallepedidoRoutes) },
      { path: 'perfil', loadChildren: () => import('./features/cliente/cliente-perfil/perfil.routes').then((m) => m.perfilRoutes) },
      { path: 'direcciones', loadChildren: () => import('./features/cliente/cliente-direcciones/direcciones.routes').then((m) => m.direccionesRoutes) },
      { path: 'pago-pedido', loadChildren: () => import('./features/cliente/cliente-pago-pedido/pago-pedido.routes').then((m) => m.pagopedidoRoutes) },
      { path: 'comprobante-pedido', loadChildren: () => import('./features/cliente/cliente-comprobante-pedido/comprobante-pedido.routes').then((m) => m.comprobantepedidoRoutes) },
      { path: 'cobertura-delivery', loadChildren: () => import('./features/cliente/cliente-cobertura-delivery/cobertura-delivery.routes').then((m) => m.coberturadeliveryRoutes) },
      { path: 'asistente-chat', loadChildren: () => import('./features/cliente/cliente-asistente-chat/asistente-chat.routes').then((m) => m.asistentechatRoutes) },
      { path: 'cocina-panel', loadChildren: () => import('./features/cocina/cocina-panel/cocina-panel.routes').then((m) => m.cocinapanelRoutes) }
    ]
  },
  { path: '**', redirectTo: 'inicio' }
];
