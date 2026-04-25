import { AfterViewInit, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { AdminService } from '../../services/admin.service';
import { DatePipe } from '@angular/common';
import { User } from '../../models/user.model';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ MatTableModule, MatPaginatorModule, MatSortModule, DatePipe, CdkMenuTrigger, CdkMenu, CdkMenuItem, MatProgressSpinnerModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements AfterViewInit, OnInit {

  //Tabla admin
  displayedColumns = ['usuario', 'email', 'suscripcion', 'fecha_alta', 'acciones'];

  dataSource = new MatTableDataSource<User>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  adminService = inject(AdminService)
  showLogoutModal = signal<boolean>(false)
  userSelected = signal<User['id']>(0)
  totalUsers = signal<number>(0);
  loggedToday = signal<number>(0);
  premiumUsers = signal<number>(0);
  totalPortfolios = signal<number>(0);

  ngOnInit(): void {
    this.loadUsers()
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
        this.showLogoutModal.set(false)
        this.loadUsers();
      },
      error: (err) => {
        this.adminService.isLoading.set(false)
        console.error(err)
      }
    });
  }

  onDelete(id: User['id']) {
    this.showLogoutModal.set(true)
    this.userSelected.set(id)
  }

}
