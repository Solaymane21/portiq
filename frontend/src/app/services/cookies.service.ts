import { computed, inject, Injectable, signal } from '@angular/core';
import { PreferencesService } from './preferences.service';

@Injectable({
  providedIn: 'root'
})
export class CookiesService {

  preferencesService = inject(PreferencesService)

  cookiesAllowed = this.preferencesService.cookies
  isLoading = this.preferencesService.isLoading
  isNewUser = signal<boolean>(sessionStorage.getItem('portiq_new_user') === '1');
  
  showBanner = computed(() =>
    !this.isLoading() && (this.cookiesAllowed() === null || this.isNewUser())
  );

  setCookiesPreferences(allow: boolean) {
    this.isNewUser.set(false)
    sessionStorage.removeItem('portiq_new_user')
    this.preferencesService.cookies.set(allow);
    this.preferencesService.saveCookies(allow);
  }

}
