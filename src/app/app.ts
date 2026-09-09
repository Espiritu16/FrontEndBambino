import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHostComponent } from './shared/components/toast-host/toast-host.component';
import { SeoService } from './core/seo/seo.service';
import { BotonDemo } from '../demo/boton-demo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent, BotonDemo],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly seoService = inject(SeoService);

  constructor() {
    this.seoService.init();
  }
}
