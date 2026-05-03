import { AfterViewInit, Component, inject, OnInit, signal, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { AdminService } from '../../services/admin.service';
import { DatePipe } from '@angular/common';
import { User } from '../../models/user.model';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NotificationsService } from '../../services/notifications.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ MatTableModule, MatPaginatorModule, MatSortModule, DatePipe, CdkMenuTrigger, CdkMenu, CdkMenuItem, MatProgressSpinnerModule, MatFormFieldModule, MatInputModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements AfterViewInit, OnInit {

  //Tabla admin
  displayedColumns = ['usuario', 'email', 'suscripcion', 'estado_suscripcion', 'ultimo_acceso', 'fecha_alta', 'acciones'];

  dataSource = new MatTableDataSource<User>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  adminService = inject(AdminService)
  notificationService = inject(NotificationsService)

  showDeleteModal = signal<boolean>(false)
  showCancelSubscriptionModal = signal<boolean>(false)
  showResumeSubscriptionModal = signal<boolean>(false)
  userSelected = signal<User['id']>(0)
  totalUsers = signal<number>(0);
  loggedToday = signal<number>(0);
  premiumUsers = signal<number>(0);
  totalPortfolios = signal<number>(0);

  ngOnInit(): void {
    this.loadUsers()
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  ngAfterViewInit(): void {

    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }

    this.dataSource.sortingDataAccessor = (item: User, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'suscripcion':
          return item.suscription_type?.toLowerCase() ?? '';
        case 'usuario':
          return item.name?.toLowerCase() ?? '';
        case 'email':
          return item.email?.toLowerCase() ?? '';
        case 'fecha_alta':
          return item.created_at ?? '';
        case 'estado_suscripcion':
          if (item.suscription_type !== 'premium') return '-';
          return item.subscription_cancelled ? 'cancelada' : 'activa';
        case 'ultimo_acceso':
          return item.last_login_at ?? '';
        default:
          return (item as any)[sortHeaderId] ?? '';
        }
      };
  }

  loadUsers(): void{
    this.adminService.getUsers().subscribe({
      next: (res: any)=> {
        this.dataSource.data = res.users;
        this.totalUsers.set(res.totalUsers);
        this.loggedToday.set(res.loggedToday);
        this.premiumUsers.set(res.premiumUsers);
        this.totalPortfolios.set(res.totalPortfolios);

        if (this.sort) this.dataSource.sort = this.sort;
        if (this.paginator) this.dataSource.paginator = this.paginator;
      },
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
  }

  deleteUser() {
    this.adminService.isLoading.set(true)

    this.adminService.deleteUser(this.userSelected()).subscribe({
      next: () => {
        this.adminService.isLoading.set(false)
        this.showDeleteModal.set(false)
        this.notificationService.info(`Usuario eliminado correctamente`);
        this.loadUsers();
      },
      error: (err) => {
        this.adminService.isLoading.set(false)
        console.error(err)
      }
    });
  }

  onDelete(id: User['id']) {
    this.showDeleteModal.set(true)
    this.userSelected.set(id)
  }

  onCancelSubscription(id: User['id']) {
    this.showCancelSubscriptionModal.set(true)
    this.userSelected.set(id)
  }

  cancelSubscription() {
    this.adminService.isLoading.set(true)

    this.adminService.cancelSubscription(this.userSelected()!).subscribe({
      next: (res: any) => {
        this.adminService.isLoading.set(false)
        this.showCancelSubscriptionModal.set(false)
        this.notificationService.info(res.message)
        this.loadUsers();
      },
      error: (err) => {
        this.adminService.isLoading.set(false)
        console.error(err)
      }
    });
  }

  onResumeSubscription(id: User['id']) {
    this.showResumeSubscriptionModal.set(true);
    this.userSelected.set(id);
  }

  resumeSubscription() {
    this.adminService.isLoading.set(true);

    this.adminService.resumeSubscription(this.userSelected()!).subscribe({
      next: (res: any) => {
        this.adminService.isLoading.set(false);
        this.showResumeSubscriptionModal.set(false);
        this.notificationService.success(res.message)
        this.loadUsers();
      },
      error: (err) => {
        this.adminService.isLoading.set(false);
        console.error(err);
      }
    });
  }

}
