import { Component, inject } from '@angular/core';
import { CookiesService } from '../../services/cookies.service';

@Component({
  selector: 'app-cookies-banner',
  imports: [],
  templateUrl: './cookies-banner.component.html',
  styleUrl: './cookies-banner.component.css'
})
export class CookiesBannerComponent {
  cookiesService = inject(CookiesService)
}
