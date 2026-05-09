import { Component } from '@angular/core';
type MenuItem = {
  badge?: string;
  name: string;
  description: string;
  price: string;
  tone: 'sky' | 'beige' | 'mint' | 'sand';
  media: 'plate' | 'bowl';
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

@Component({
  selector: 'app-carta-page',
  standalone: true,
  imports: [],
  templateUrl: './carta.page.html',
  styleUrl: './carta.page.scss'
})
export class CartaPageComponent {
  protected readonly categories = [
    'Todo',
    'Pollo a la Brasa',
    'Combos',
    'Mostros',
    'Fusión Oriental',
    'Platos a la Carta',
    'Adicionales'
  ];

  protected readonly sections: MenuSection[] = [
    {
      title: 'Pollo a la Brasa',
      items: [
        {
          name: '1/8 de Pollo',
          description: 'Porción individual con papas fritas y ensalada clásica.',
          price: 'S/ 10.00',
          tone: 'sky',
          media: 'plate'
        },
        {
          badge: 'Popular',
          name: '1/4 de Pollo',
          description: 'Papas fritas + Ensalada clásica + Cremas bambino.',
          price: 'S/ 16.00',
          tone: 'beige',
          media: 'plate'
        },
        {
          name: '1/2 de Pollo',
          description: 'Porción de papas + Ensalada grande + Cremas surtidas.',
          price: 'S/ 30.00',
          tone: 'mint',
          media: 'plate'
        },
        {
          name: '1 Pollo Entero',
          description: 'Familiar: Papas fritas XL + Ensalada XL + Cremas.',
          price: 'S/ 52.00',
          tone: 'sand',
          media: 'plate'
        }
      ]
    },
    {
      title: 'Los Mostros',
      items: [
        {
          name: 'El Mostro',
          description: '1/4 de pollo + Arroz chaufa + Papas fritas crujientes.',
          price: 'S/ 17.00',
          tone: 'sky',
          media: 'bowl'
        },
        {
          name: 'Mostrito',
          description: '1/8 de pollo + Arroz chaufa + Papas fritas clásicas.',
          price: 'S/ 12.00',
          tone: 'beige',
          media: 'bowl'
        },
        {
          name: 'Bambino a lo Pobre',
          description: 'Pollo a la brasa + Huevo + Plátano frito + Papas.',
          price: 'S/ 20.00',
          tone: 'mint',
          media: 'plate'
        }
      ]
    },
    {
      title: 'Fusión Oriental',
      items: [
        {
          name: 'Aeropuerto',
          description: 'Mix de chaufa, tallarín salteado, frejolito chino y verduras.',
          price: 'S/ 13.00',
          tone: 'sky',
          media: 'bowl'
        },
        {
          name: 'Chaufa Especial',
          description: 'Arroz chaufa con trozos de pollo, chancho y langostino.',
          price: 'S/ 15.00',
          tone: 'beige',
          media: 'bowl'
        },
        {
          name: 'Chaufa Amazónico',
          description: 'Chaufa con cecina de la selva y plátano frito.',
          price: 'S/ 18.00',
          tone: 'mint',
          media: 'bowl'
        }
      ]
    },
    {
      title: 'Platos a la Carta',
      items: [
        {
          name: 'Lomo Saltado',
          description: 'Finos cortes de lomo fino, cebolla, tomate y papas.',
          price: 'S/ 23.00',
          tone: 'sand',
          media: 'bowl'
        },
        {
          name: 'Pechuga a lo Pobre',
          description: 'Pechuga a la parrilla con huevo, plátano, arroz y papas.',
          price: 'S/ 18.00',
          tone: 'beige',
          media: 'bowl'
        }
      ]
    }
  ];
}
