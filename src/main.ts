import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { instalarParcheFetch } from './demo/parche-fetch';

// Sólo en la rama `demo`: desvía también las llamadas hechas con `fetch`.
instalarParcheFetch();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
