import { Routes } from '@angular/router';

import { AppLayoutComponent } from './core/layout/app-layout.component';
import { adminGuard, authGuard } from './core/guards/session.guards';

const INDEX_FOLLOW = true;
const NOINDEX_NOFOLLOW = false;

export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    data: {
      seo: {
        title: 'Bambino Chicken | Administracion',
        description: 'Seccion privada de administracion.',
        indexable: NOINDEX_NOFOLLOW
      }
    },
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes)
  },
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        data: {
          seo: {
            title: 'Bambino Chicken | Inicio',
            description: 'Bambino Chicken: promociones, carta digital y pedidos online de polleria y delivery.',
            indexable: INDEX_FOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-inicio/inicio.routes').then((m) => m.inicioRoutes)
      },
      {
        path: 'login',
        data: {
          seo: {
            title: 'Bambino Chicken | Iniciar sesion',
            description: 'Acceso de clientes registrados.',
            indexable: NOINDEX_NOFOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-login/login.routes').then((m) => m.loginRoutes)
      },
      {
        path: 'registro',
        data: {
          seo: {
            title: 'Bambino Chicken | Registro',
            description: 'Registro de clientes.',
            indexable: NOINDEX_NOFOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-registro/registro.routes').then((m) => m.registroRoutes)
      },
      {
        path: 'recuperacion-clave',
        data: {
          seo: {
            title: 'Bambino Chicken | Recuperacion de clave',
            description: 'Recuperacion de acceso.',
            indexable: NOINDEX_NOFOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-recuperacion-clave/recuperacion-clave.routes').then((m) => m.recuperacionclaveRoutes)
      },
      {
        path: 'carta',
        data: {
          seo: {
            title: 'Carta | Bambino Chicken',
            description: 'Consulta la carta digital de Bambino Chicken.',
            indexable: INDEX_FOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-carta/carta.routes').then((m) => m.cartaRoutes)
      },
      {
        path: 'promociones',
        data: {
          seo: {
            title: 'Promociones | Bambino Chicken',
            description: 'Descubre promociones y combos disponibles en Bambino Chicken.',
            indexable: INDEX_FOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-ofertas/ofertas.routes').then((m) => m.ofertasRoutes)
      },
      {
        path: 'producto-detalle/:slug',
        data: {
          seo: {
            title: 'Detalle de producto | Bambino Chicken',
            description: 'Detalle de producto del catalogo.',
            indexable: NOINDEX_NOFOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-productodetalle/productodetalle.routes').then((m) => m.productodetalleRoutes)
      },
      {
        path: 'producto-detalle/:idProducto/:slug',
        data: {
          seo: {
            title: 'Detalle de producto | Bambino Chicken',
            description: 'Detalle de producto del catalogo.',
            indexable: NOINDEX_NOFOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-productodetalle/productodetalle.routes').then((m) => m.productodetalleRoutes)
      },
      { path: 'ofertas', pathMatch: 'full', redirectTo: 'promociones' },
      {
        path: 'carrito',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Carrito', description: 'Carrito de compra.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cliente/cliente-carrito/carrito.routes').then((m) => m.carritoRoutes)
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Checkout', description: 'Checkout.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cliente/cliente-checkout/checkout.routes').then((m) => m.checkoutRoutes)
      },
      {
        path: 'mis-pedidos',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Mis pedidos', description: 'Pedidos del cliente.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cliente/cliente-mis-pedidos/mis-pedidos.routes').then((m) => m.mispedidosRoutes)
      },
      {
        path: 'detalle-pedido',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Detalle de pedido', description: 'Detalle de pedido.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cliente/cliente-detalle-pedido/detalle-pedido.routes').then((m) => m.detallepedidoRoutes)
      },
      {
        path: 'perfil',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Perfil', description: 'Perfil del cliente.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cliente/cliente-perfil/perfil.routes').then((m) => m.perfilRoutes)
      },
      {
        path: 'direcciones',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Direcciones', description: 'Direcciones del cliente.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cliente/cliente-direcciones/direcciones.routes').then((m) => m.direccionesRoutes)
      },
      {
        path: 'pago-pedido',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Pago de pedido', description: 'Pago de pedido.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cliente/cliente-pago-pedido/pago-pedido.routes').then((m) => m.pagopedidoRoutes)
      },
      {
        path: 'comprobante-pedido',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Comprobante', description: 'Comprobante de pedido.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cliente/cliente-comprobante-pedido/comprobante-pedido.routes').then((m) => m.comprobantepedidoRoutes)
      },
      {
        path: 'cobertura-delivery',
        data: {
          seo: {
            title: 'Cobertura de delivery | Bambino Chicken',
            description: 'Consulta la cobertura de delivery de Bambino Chicken.',
            indexable: INDEX_FOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-cobertura-delivery/cobertura-delivery.routes').then((m) => m.coberturadeliveryRoutes)
      },
      {
        path: 'nosotros',
        data: {
          seo: {
            title: 'Nosotros | Bambino Chicken',
            description: 'Conoce la mision y vision de Bambino Chicken.',
            indexable: INDEX_FOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-nosotros/nosotros.routes').then((m) => m.nosotrosRoutes)
      },
      {
        path: 'terminos-condiciones',
        data: {
          seo: {
            title: 'Terminos y condiciones | Bambino Chicken',
            description: 'Terminos y condiciones de uso del sitio web de Bambino Chicken.',
            indexable: INDEX_FOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-terminos-condiciones/terminos-condiciones.routes').then((m) => m.terminosCondicionesRoutes)
      },
      {
        path: 'politica-privacidad',
        data: {
          seo: {
            title: 'Politica de privacidad | Bambino Chicken',
            description: 'Politica de privacidad y tratamiento de datos personales.',
            indexable: INDEX_FOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-politica-privacidad/politica-privacidad.routes').then((m) => m.politicaPrivacidadRoutes)
      },
      {
        path: 'libro-reclamaciones',
        data: {
          seo: {
            title: 'Libro de reclamaciones | Bambino Chicken',
            description: 'Registro oficial de reclamos y quejas para clientes.',
            indexable: INDEX_FOLLOW
          }
        },
        loadChildren: () => import('./features/cliente/cliente-libro-reclamaciones/libro-reclamaciones.routes').then((m) => m.libroReclamacionesRoutes)
      },
      { path: 'asistente-chat', pathMatch: 'full', redirectTo: 'nosotros' },
      {
        path: 'cocina-panel',
        canActivate: [authGuard],
        data: { seo: { title: 'Bambino Chicken | Cocina', description: 'Panel interno de cocina.', indexable: NOINDEX_NOFOLLOW } },
        loadChildren: () => import('./features/cocina/cocina-panel/cocina-panel.routes').then((m) => m.cocinapanelRoutes)
      }
    ]
  },
  { path: '**', redirectTo: 'inicio' }
];
