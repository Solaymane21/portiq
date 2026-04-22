import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Activo } from '../../../../models/activo.model';

@Component({
  selector: 'app-portfolio-activos-table',
  standalone: true,
  imports: [CommonModule, MatSortModule, MatPaginatorModule],
  templateUrl: './portfolio-activos-table.component.html',
  styleUrl: './portfolio-activos-table.component.css'
})
export class PortfolioActivosTableComponent {
  
  _activosData: Activo[] = [];
  sortedData: Activo[] = [];
  
  // Variables para la paginación
  currentPage = 0;
  pageSize = 5;

  @Input() set activosData(data: Activo[]) {
    this._activosData = data || [];
    this.sortedData = this._activosData.slice();
    this.currentPage = 0; // Reseteamos a página 1 al cargar nuevos datos
  }
  
  @Input() cargando = true;

  @Output() comprar = new EventEmitter<Activo>();
  @Output() vender = new EventEmitter<Activo>();

  // Devuelve los 5 elementos que tocan en la página actual
  get pagedData(): Activo[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.sortedData.slice(startIndex, startIndex + this.pageSize);
  }

  // Cuando se cambia de página en el <mat-paginator>
  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  // Ordenación (aplicable a TODOS los datos antes de paginar)
  sortData(sort: Sort) {
    const data = this._activosData.slice();
    if (!sort.active || sort.direction === '') {
      this.sortedData = data;
    } else {
      this.sortedData = data.sort((a, b) => {
        const isAsc = sort.direction === 'asc';
        switch (sort.active) {
          case 'simbolo': return this.compare(a.simbolo, b.simbolo, isAsc);
          case 'peso': return this.compare(a.peso, b.peso, isAsc);
          case 'retorno7d': return this.compare(a.retorno7d, b.retorno7d, isAsc);
          case 'valor': return this.compare(a.valor, b.valor, isAsc);
          case 'acciones': return this.compare(a.acciones, b.acciones, isAsc);
          default: return 0;
        }
      });
    }
    // Después de ordenar, devolvemos al usuario a la primera página
    this.currentPage = 0;
  }

  compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
}