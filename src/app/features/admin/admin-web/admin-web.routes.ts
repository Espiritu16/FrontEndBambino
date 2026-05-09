import { Routes } from '@angular/router';
import { AdminWebPageComponent } from './admin-web.page';
import { AdminWebMediaPageComponent } from './admin-web-media/admin-web-media.page';

export const adminwebRoutes: Routes = [
  {
    path: '',
    component: AdminWebPageComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        component: AdminWebMediaPageComponent,
        data: { mediaKey: 'HOME_HERO_BANNER', sectionName: 'Inicio', mediaType: 'IMAGEN' }
      },
      {
        path: 'nosotros',
        component: AdminWebMediaPageComponent,
        data: { mediaKey: 'NOSOTROS_HERO_BANNER', sectionName: 'Nosotros', mediaType: 'IMAGEN' }
      },
      {
        path: 'carta-pdf',
        component: AdminWebMediaPageComponent,
        data: { mediaKey: 'CARTA_PDF', sectionName: 'Carta PDF', mediaType: 'PDF' }
      }
    ]
  }
];
