import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { AdminTable } from '../../models/admin.model';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ CommonModule,MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements AfterViewInit {

  //Tabla admin
  displayedColumns = ['usuario', 'email', 'suscripcion', 'acciones'];
  dataSource = new MatTableDataSource<AdminTable>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
  
      this.dataSource.sortingDataAccessor = (item: AdminTable, sortHeaderId: string) => {
        switch (sortHeaderId) {
          case 'suscripcion':
            return item.suscripcion ? 1 : 0;
          case 'usuario':
            return item.usuario?.toLowerCase() ?? '';
          case 'email':
            return item.email?.toLowerCase() ?? '';
          default:
            return (item as any)[sortHeaderId];
          }
        };
      
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }

    loadUsers(): void{
      this.adminService.getUsers().subscribe({
        next: (users)=> this.dataSource.data= users,
        error: (err) => console.error('Error al cargar usuarios:', err)
      });
    }

}
