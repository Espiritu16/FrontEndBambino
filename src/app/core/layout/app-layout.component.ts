import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss'
})
export class AppLayoutComponent {
  protected readonly sections = [
    { path: '/inicio', label: 'Inicio' },
    { path: '/login', label: 'Login' },
    { path: '/registro', label: 'Registro' },
    { path: '/carta', label: 'Carta' },
    { path: '/ofertas', label: 'Ofertas' },
    { path: '/carrito', label: 'Carrito' },
    { path: '/checkout', label: 'Checkout' },
    { path: '/mis-pedidos', label: 'Mis pedidos' },
    { path: '/perfil', label: 'Perfil' },
    { path: '/direcciones', label: 'Direcciones' },
    { path: '/asistente-chat', label: 'Asistente' },
    { path: '/admin-catalogo', label: 'Admin catalogo' },
    { path: '/admin-pedidos', label: 'Admin pedidos' },
    { path: '/cocina-panel', label: 'Cocina' }
  ];
}
