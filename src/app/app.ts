import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHostComponent } from './shared/components/toast-host/toast-host.component';
import { SeoService } from './core/seo/seo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly seoService = inject(SeoService);

  constructor() {
    this.seoService.init();
  }
}
