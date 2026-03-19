import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PortfolioComponent } from './pages/portfolio/portfolio.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';
import { InvestorProfileComponent } from './pages/investor-profile/investor-profile.component';
import { RankingComponent } from './pages/ranking/ranking.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

export const routes: Routes = [
    {
        path: 'app',
        component: MainLayoutComponent,
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
        path: '',
        redirectTo: 'app/dashboard',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'app/not-found'
    }
];
