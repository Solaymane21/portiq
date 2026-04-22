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
import { PortfolioComponent } from './pages/portfolio/portfolio-list/portfolio-list.component';
import { PortfolioDetailComponent } from './pages/portfolio/portfolio-detail/portfolio-detail.component';
import { WalletsComponent } from './pages/portfolio2/wallets/wallets.component';
import { InvestmentsComponent } from './pages/portfolio2/investments/investments.component';

export const routes: Routes = [
    {
        path: 'app',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'portfolios',
                component: PortfolioComponent
            },
            { 
                path: 'portfolios/:id', 
                component: PortfolioDetailComponent
            },
            {
                path: 'wallets',
                component: WalletsComponent
            },
            { 
                path: 'wallets/:id', 
                component: InvestmentsComponent
            },
            {
                path: 'favorites',
                component: FavoritesComponent
            },
            {
                path: 'investor-profile',
                component: InvestorProfileComponent
            },
            {
                path: 'ranking',
                component: RankingComponent
            },
            {
                path: 'alerts',
                component: AlertsComponent
            },
            {
                path: 'not-found',
                component: NotFoundComponent
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
                component: LoginComponent
            },
            {
                path: 'register',
                component: RegisterComponent
            },
            {
                path: 'forgot-password',
                component: ForgotPasswordComponent
            },
            {
                path: 'reset-password',
                component: ResetPasswordComponent,
                canActivate: [resetPasswordGuard]
            },
            {
              path: 'callback',
              component: CallbackComponent
            }
        ]
    },
    {
        path: '',
        redirectTo: 'auth/login',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'app/not-found'
    }
];
