import { computed, inject, Injectable } from '@angular/core';
import { PreferencesService } from './preferences.service';

@Injectable({
  providedIn: 'root'
})
export class CookiesService {

  preferencesService = inject(PreferencesService)

  cookiesAllowed = this.preferencesService.cookies
  isLoading = this.preferencesService.isLoading
  
  showBanner = computed(() => !this.isLoading() && this.cookiesAllowed() === null);

  setCookiesPreferences(allow: boolean) {
    this.preferencesService.cookies.set(allow);
    this.preferencesService.saveCookies(allow);
  }

}
