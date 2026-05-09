import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-carta-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './carta.page.html',
  styleUrl: './carta.page.scss'
})
export class CartaPageComponent {
  protected readonly categories = ['Todo', 'Pollo a la Brasa', 'Combos'];

  protected readonly dishes = [
    {
      badge: 'Popular',
      name: '1/4 de Pollo',
      description: 'Papas fritas + Ensalada clásica + Cremas bambino.',
      price: 'S/ 16.00',
      tone: 'beige'
    },
    {
      badge: '',
      name: '1/2 de Pollo',
      description: 'Porción de papas + Ensalada grande + Cremas surtidas.',
      price: 'S/ 30.00',
      tone: 'mint'
    }
  ];
}
