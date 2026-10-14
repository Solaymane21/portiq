import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

const color = localStorage.getItem('portiq_color_theme') ?? 'orange';
document.documentElement.setAttribute('data-color', color);

// despierta los servicios de Render (plan gratis) en paralelo al cargar la web
fetch(environment.apiUrl.replace(/\/api$/, '/up')).catch(() => {});
fetch(`${environment.mlUrl}/docs`).catch(() => {});

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
