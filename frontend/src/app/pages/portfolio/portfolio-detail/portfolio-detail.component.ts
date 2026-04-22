import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Activo } from '../../../models/activo.model';
import { PortfolioStatsComponent } from '../components/portfolio-stats/portfolio-stats.component';
import { PortfolioActivosTableComponent } from '../components/portfolio-activos-table/portfolio-activos-table.component';
import { PortfolioTransactionModalComponent } from '../components/portfolio-transaction-modal/portfolio-transaction-modal.component';

@Component({
  selector: 'app-portfolio-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    PortfolioStatsComponent, 
    PortfolioActivosTableComponent, 
    PortfolioTransactionModalComponent
  ],
  templateUrl: './portfolio-detail.component.html',
  styleUrl: './portfolio-detail.component.css'
})
export class PortfolioDetailComponent implements OnInit {

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private apiUrl = 'http://127.0.0.1:8000/api';

  carteraId: number | null = null;
  cargando = signal(true);

  nombreCartera = signal('');
  valorTotal = signal(0);
  ganancias = signal(0);
  porcentajeGanancias = signal(0);
  totalPosiciones = signal(0);
  activosData = signal<Activo[]>([]);

  mostrarModal = signal(false);
  activoParaTransaccion = signal<Activo | null>(null);
  tipoTransaccion = signal<'buy' | 'sell'>('buy');

  ngOnInit() {
    this.carteraId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarInversiones();
  }

  cargarInversiones() {
    this.cargando.set(true);
    this.http.get<any>(`${this.apiUrl}/portfolios/${this.carteraId}/investments`).subscribe({
      next: (response) => {
        this.nombreCartera.set(response.cartera_name || 'Mi Cartera');
        this.valorTotal.set(response.stats?.valor_total || 0);
        this.ganancias.set(response.stats?.ganancias || 0);
        this.porcentajeGanancias.set(response.stats?.porcentaje || 0);
        
        this.activosData.set(response.data || []);
        this.totalPosiciones.set((response.data || []).length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar inversiones:', err);
        this.cargando.set(false);
      }
    });
  }

  abrirModalNuevaPosicion() {
    this.activoParaTransaccion.set(null);
    this.tipoTransaccion.set('buy');
    this.mostrarModal.set(true);
  }

  abrirModalTransaccion(activo: Activo, tipo: 'buy' | 'sell') {
    this.activoParaTransaccion.set(activo);
    this.tipoTransaccion.set(tipo);
    this.mostrarModal.set(true);
  }
}