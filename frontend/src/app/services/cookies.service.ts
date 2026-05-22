import { computed, inject, Injectable, signal } from '@angular/core';
import { PreferencesService } from './preferences.service';

@Injectable({
  providedIn: 'root'
})
export class CookiesService {

  preferencesService = inject(PreferencesService)

  cookiesAllowed = this.preferencesService.cookies
  isLoading = this.preferencesService.isLoading
  isNewUser = signal<boolean>(false);
  
  showBanner = computed(() =>
    !this.isLoading() && (this.cookiesAllowed() === null || this.isNewUser())
  );

  setCookiesPreferences(allow: boolean) {
    this.isNewUser.set(false)
    this.preferencesService.cookies.set(allow);
    this.preferencesService.saveCookies(allow);
  }

}
