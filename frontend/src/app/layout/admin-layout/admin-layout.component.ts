import { Component } from '@angular/core';
import { TopbarAdminComponent } from '../topbar-admin/topbar-admin.component';
import { FooterComponent } from '../footer/footer.component';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-admin-layout',
  imports: [TopbarAdminComponent, FooterComponent, RouterOutlet, ToastComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {

}
