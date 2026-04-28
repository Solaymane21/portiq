import { Component } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';
import { FooterComponent } from '../footer/footer.component';
import { NavbarMobileComponent } from '../navbar-mobile/navbar-mobile.component';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-main-layout',
  imports: [SidebarComponent, RouterOutlet, TopbarComponent, FooterComponent, NavbarMobileComponent, ToastComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {

}
