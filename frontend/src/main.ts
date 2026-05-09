import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const color = localStorage.getItem('portiq_color_theme') ?? 'orange';
document.documentElement.setAttribute('data-color', color);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
