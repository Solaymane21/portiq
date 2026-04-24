import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { AdminService } from '../../services/admin.service';
import { DatePipe } from '@angular/common';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ MatTableModule, MatPaginatorModule, MatSortModule, DatePipe],
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
      next: (users)=> {
        this.dataSource.data = users;
        if (this.sort) this.dataSource.sort = this.sort;
        if (this.paginator) this.dataSource.paginator = this.paginator;
      },
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
  }

}
