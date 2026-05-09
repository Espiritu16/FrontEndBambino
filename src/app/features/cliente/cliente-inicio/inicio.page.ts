import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

type ConfiguracionMediaResponse = {
  clave: string;
  url: string;
  activa: boolean;
};

@Component({
  selector: 'app-inicio-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio.page.html',
  styleUrl: './inicio.page.scss'
})
export class InicioPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:8080/api/public/configuracion/media';

  protected heroImageUrl = '';

  ngOnInit(): void {
    void this.loadHeroImage();
  }

  private async loadHeroImage(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<ConfiguracionMediaResponse>(`${this.apiBase}/HOME_HERO_BANNER`).pipe(timeout(10000))
      );
      this.heroImageUrl = data?.activa ? (data.url?.trim() || '') : '';
    } catch {
      this.heroImageUrl = '';
    }
  }
}
