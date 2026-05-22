import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { RedirectMsg } from '../models/redirectMsg.model';
import { catchError, map, of, tap } from 'rxjs';
import { InitialDataService } from './initial-data.service';
import { FavoritesService } from './favorites.service';
import { environment } from '../../environments/environment';
import { PreferencesService } from './preferences.service';
import { CookiesService } from './cookies.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // signals de estado
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false);
  isForgotPassword = signal<boolean>(false);
  msgError = signal<string>('');
  redirectMsg = signal<RedirectMsg>({ msg: '', type: 'info' });
  resetToken = signal<string>('');
  currentUser = signal<User | null>(null);

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private router = inject(Router);
  private initialDataService = inject(InitialDataService)
  private favoritesService = inject(FavoritesService)
  private preferencesService = inject(PreferencesService);
  private cookiesService = inject(CookiesService)

  // signals de los campos del formulario
  username = signal<User['name']>('');
  email = signal<User['email']>('');
  code = signal<string>('');
  password = signal<User['password']>('');
  suscription_type = signal<User['suscription_type']>('free');

  // REGISTRO avanza al siguiente
  next() {
    this.currentStep.update(step => step + 1);
  }

  // REGISTRO retrocede al paso anterior
  back() {
    this.currentStep.update(step => step - 1);
  }

  // REGISTRO paso 1 - envia el codigo de verificacion al email
  onStep1() {
    this.isLoading.set(true);
    this.msgError.set('');

    const type = this.isForgotPassword() ? 'reset' : 'register';

    this.http.post(`${this.apiUrl}/auth/${type}-code`, { email: this.email() })
      .subscribe({
        next: () => {
          this.next();
          this.isLoading.set(false);
        },
        error: (err) => {
          // console.error(err.error.message);
          this.msgError.set(err.error.message);
          this.isLoading.set(false);
        }
      });
  }

  // REGISTRO paso 2 - este metodo puede ser llamado por registro o por forgot password ya que ambos usan el mismo componente para validar el codigo enviado al mail
  onStep2() {
    this.isLoading.set(true);
    this.msgError.set('');

    const type = this.isForgotPassword() ? 'reset' : 'register';

    this.http.post(`${this.apiUrl}/auth/verify-code`, {
      email: this.email(),
      code: this.code(),
      type
    }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);

        if (this.isForgotPassword()) {
          // si es forgot password, guarda el token temporal y redirige al formulario de reset passwordd
          this.resetToken.set(res.reset_token);
          this.router.navigate(['/auth/reset-password']);
        } else {
          // si llega aqui, es que el usuario se esta registrando y continua al siguiente paso
          this.next();
        }
      },
      error: (err: any) => {
        // console.error(err.error.message);
        this.msgError.set(err.error.message);
        this.isLoading.set(false);
      }
    });
  }

  // reenvía el codigo de verificacion segun el si el usuario se esta registrando o si se ha olvidado su contraseña
  onResendCode() {
    const type = this.isForgotPassword() ? 'reset' : 'register';
    return this.http.post(`${this.apiUrl}/auth/resend-code`, { email: this.email(), type });
  }

  // REGISTRO paso 3 - se llama cuando se han validado la contraseña. Se establecen en el ts de register-password
  onStep3() {
    this.msgError.set('');
    this.next();
  }

  // REGISTRO paso 3 - registra el usuario y redirige a checkout de Stripe si eligio premium
  onStep4() {
    this.isLoading.set(true);
    this.msgError.set('');

    this.http.post(`${this.apiUrl}/auth/register`, {
      name:              this.username(),
      email:             this.email(),
      password:          this.password(),
      suscription_type:  'free'
    }).subscribe({
    next: (res: any) => {
      this.saveUserData(res);

      if (res.user.is_new_user) {
        sessionStorage.setItem('portiq_new_user', '1');
        this.cookiesService.isNewUser.set(true);
      }

      this.initialDataService.run().subscribe({
        next: () => {
          if (this.suscription_type() === 'premium') {
            this.http.post(`${this.apiUrl}/subscription/checkout`, {}).subscribe({
              next: (checkout: any) => {
                this.isLoading.set(false);
                window.location.href = checkout.url;
              },
              error: () => {
                this.isLoading.set(false);
                this.router.navigate(['/app/dashboard']);
              }
            });
          } else {
            this.isLoading.set(false);
            this.router.navigate(['/app/dashboard']);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.router.navigate(['/app/dashboard']);
        }
      });
    },
    error: (err) => {
      // console.error(err.message);
      this.isLoading.set(false);
    }
  });
}

  // inicia sesion y redirige segun si el usuario es admin o no
  onLogin() {
    this.isLoading.set(true);
    this.msgError.set('');

    this.http.post(`${this.apiUrl}/auth/login`, {
      email:    this.email(),
      password: this.password()
    }).subscribe({
      next: (res: any) => {
        this.saveUserData(res);
        if(res.user.is_admin) {
          this.router.navigate(['/admin/dashboard'])
        } else {
          this.initialDataService.run().subscribe({
            next: () => this.router.navigate(['/app/dashboard'])
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.msgError.set('Credenciales incorrectas o no existe cuenta en PortIQ.');
        this.isLoading.set(false);
      }
    });
  }

  // cierra sesion y limpia datos locales
  onLogout() {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      next:  () => {
        this.removeUserData();
        this.favoritesService.clearCache();
        this.router.navigate(['/public/home']);
      },
      error: () => {
        this.removeUserData();
        this.router.navigate(['/public/home']);
      }
    });
  }

  // redirige a google para iniciar sesion con oauth
  onLoginWithGoogle() {
    this.http.get(`${this.apiUrl}/auth/google/redirect`).subscribe({
      next:  (res: any) => {
        window.location.href = res.redirect_url;
      },
      // error: (err: any) => { console.error(err); }
    });
  }

  // establace la nueva contrasena si "ha olvidado su contraseña" y envia la nueva contraseña junto al token temporal de reseteo
  onResetPassword(newPassword: string) {
    this.isLoading.set(true);
    this.msgError.set('');
    this.redirectMsg.set({ msg: '', type: 'info' });

    this.http.post(`${this.apiUrl}/auth/reset-password`, {
      email:                 this.email(),
      reset_token:           this.resetToken(),
      password:              newPassword,
      password_confirmation: newPassword
    }).subscribe({
      next: (res: any) => {
        this.resetToken.set('');
        this.isLoading.set(false);
        this.redirectMsg.set({ msg: res.message, type: 'success' });
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.msgError.set(err.error.message);
        this.isLoading.set(false);
      }
    });
  }

  // comprueba si existe un token de reseteo activo
  hasResetToken(): boolean {
    return !!this.resetToken();
  }

  // guarda token y datos del usuario en localstorage y actualiza el signal
  saveUserData(res: any) {
    localStorage.setItem('token', res.token);
    this.currentUser.set(res.user);
  }

  // elimina token y datos del usuario de localstorage y limpia el signal
  removeUserData() {
    this.preferencesService.clearLocalStorage()
    localStorage.removeItem('token');
    this.currentUser.set(null);
  }

  // actualiza los datos del usuario en localstorage y en el signal
  updateLocalUser(user: any) {
    this.currentUser.set(user);
  }

  // refresca los datos del usuario desde el api y actualiza el signal
  refreshUser() {
    return this.http.get<User>(`${this.apiUrl}/user`).pipe(
      tap(user => this.currentUser.set(user)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      })
    );
  }

  isAdmin() {
    return this.http.get<{ is_admin: boolean }>(`${this.apiUrl}/user`).pipe(
      map(user => user.is_admin === true),
      catchError(() => of(false))
    );
  }

  isPremium() {
    return this.http.get(`${this.apiUrl}/user`).pipe(
      map((user: any) => user.suscription_type === 'premium'),
      catchError(() => of(false))
    )
  }

}
