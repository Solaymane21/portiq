import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';
import { InvestorProfileComponent } from './pages/investor-profile/investor-profile.component';
import { RankingComponent } from './pages/ranking/ranking.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { resetPasswordGuard } from './guards/reset-password.guard';
import { CallbackComponent } from './pages/auth/callback/callback.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { AdminComponent } from './pages/admin/admin.component';
import { InvestmentsComponent } from './pages/wallets/investments/investments.component';
import { PortfoliosComponent } from './pages/wallets/portfolios/portfolios.component';
import { adminGuard } from './guards/admin.guard';
import { SettingsComponent } from './pages/settings/settings.component';
import { TradesComponent } from './pages/wallets/trades/trades.component';
import { SymbolDetailComponent } from './pages/symbol-detail/symbol-detail.component';
import { PublicLayoutComponent } from './layout/public-layout/public-layout.component';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
    {
        path: 'app',
        component: MainLayoutComponent,
        data: { title: 'Dashboard' },
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                component: DashboardComponent,
                data: { title: 'Dashboard' }
            },
            {
                path: 'wallets',
                component: PortfoliosComponent,
                data: { title: 'Carteras' }
            },
            {
                path: 'wallets/:id',
                component: InvestmentsComponent,
                data: { title: 'Carteras' }
            },
            {   path: 'wallets/:id/trades',
                component: TradesComponent,
                data: { title: 'Transacciones' }
            },
            {
                path: 'favorites',
                component: FavoritesComponent,
                data: { title: 'Favoritos' }
            },
            {
                path: 'investor-profile',
                component: InvestorProfileComponent,
                data: { title: 'Perfil de inversor' }
            },
            {
                path: 'ranking',
                component: RankingComponent,
                data: { title: 'Clasificación' }
            },
            {
                path: 'alerts',
                component: AlertsComponent,
                data: { title: 'Alertas' }
            },
            {
                path: 'not-found',
                component: NotFoundComponent
            },
            {
                path: 'settings',
                component: SettingsComponent,
                data: { title: 'Ajustes' }
            }
        ]
    },
    {
        path: 'auth',
        component: AuthLayoutComponent,
        canActivate: [guestGuard],
        children: [
            {
                path: 'login',
                component: LoginComponent,
                data: { title: 'Inicio de sesión' }
            },
            {
                path: 'register',
                component: RegisterComponent,
                data: { title: 'Registro' }
            },
            {
                path: 'forgot-password',
                component: ForgotPasswordComponent,
                data: { title: 'Contraseña olvidada' }
            },
            {
                path: 'reset-password',
                component: ResetPasswordComponent,
                canActivate: [resetPasswordGuard],
                data: { title: 'Establecer nueva contraseña' }
            },
            {
              path: 'callback',
              component: CallbackComponent,
                data: { title: 'Redirigiendo' }
            }
        ]
    },
    {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [adminGuard],
        children: [
            {
                path: 'dashboard',
                component: AdminComponent,
                data: { title: 'Panel de administrador' }
            }
        ]
    },
    {
        path: 'public',
        component: PublicLayoutComponent,
        children: [
            {
                path: 'home',
                component: HomeComponent,
                data: { title: 'Inicio' }
            },
            {
                path: 'symbol/:symbol',
                component: SymbolDetailComponent,
                data: { title: 'Precio  de activos' }
            }
        ]
    },
    {
        path: '',
        redirectTo: 'public/home',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'app/not-found'
    }
];
