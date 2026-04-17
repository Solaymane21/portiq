import { Component, signal, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Activo {
  id: number;
  simbolo: string;
  nombre?: string;
  image_url?: string;
  peso: number;
  retorno7d: number;
  valor: number;
  acciones: number; 
  avg_buy_price: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  thumb?: string;
}

@Component({
  selector: 'app-portfolio-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './portfolio-detail.component.html',
  styleUrl: './portfolio-detail.component.css'
})
export class PortfolioDetailComponent implements OnInit, AfterViewInit, OnDestroy {

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private apiUrl = 'http://127.0.0.1:8000/api'; 
  
  carteraId: number | null = null;
  cargando = signal<boolean>(true);

  nombreCartera = signal('');
  valorTotal = signal(0);
  ganancias = signal(0);
  porcentajeGanancias = signal(0);
  totalPosiciones = signal(0);

  dataSource = new MatTableDataSource<Activo>([]);
  activos$!: Observable<any>;
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // --- MODALES Y WIZARD ---
  mostrarModal = signal(false);
  wizardStep = signal<1 | 2>(1);
  
  searchQuery = signal('');
  isSearching = signal(false);
  searchResults = signal<SearchResult[]>([]);
  activoSeleccionado = signal<SearchResult | null>(null);
  filtroActivo = signal<'all' | 'crypto' | 'stock'>('all');

  transaccionTipo = signal<'buy' | 'sell'>('buy');
  formulario = signal({ simbolo: '', quantity: 0, avg_buy_price: 0, fecha: this.fechaHoy() });
  isFetchingPrice = signal(false);

  ngOnInit() {
    this.carteraId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarInversiones();
    this.activos$ = this.dataSource.connect();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    if (this.dataSource) this.dataSource.disconnect();
  }

  fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  cargarInversiones() {
    this.cargando.set(true);
    this.http.get<any>(`${this.apiUrl}/portfolios/${this.carteraId}/investments`).subscribe({
      next: (response) => {
        this.nombreCartera.set(response.cartera_name || 'Mi Cartera');
        this.valorTotal.set(response.stats?.valor_total || 0);
        this.ganancias.set(response.stats?.ganancias || 0);
        this.porcentajeGanancias.set(response.stats?.porcentaje || 0);
        
        this.dataSource.data = response.data || [];
        this.totalPosiciones.set((response.data || []).length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar inversiones:', err);
        this.cargando.set(false);
      }
    });
  }

  actualizarBusqueda(q: string) {
    this.searchQuery.set(q);
  }

  cambiarFiltro(filtro: 'all' | 'crypto' | 'stock') {
    this.filtroActivo.set(filtro);
    if (this.searchQuery().trim().length >= 2) {
      this.buscarActivos();
    }
  }

  buscarActivos() {
    const query = this.searchQuery().trim();
    if (query.length < 2) return;

    this.isSearching.set(true);
    this.searchResults.set([]);

    const requests: Observable<SearchResult[]>[] = [];

    if (this.filtroActivo() === 'all' || this.filtroActivo() === 'crypto') {
      const cg$ = this.http.get<any>(`https://api.coingecko.com/api/v3/search?query=${query}`).pipe(
        map(res => res.coins.slice(0, 4).map((c: any) => ({
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          type: 'crypto',
          thumb: c.large || c.thumb 
        }))),
        catchError(() => of([]))
      );
      requests.push(cg$);
    }

    if (this.filtroActivo() === 'all' || this.filtroActivo() === 'stock') {
      const td$ = this.http.get<any>(`https://api.twelvedata.com/symbol_search?symbol=${query}`).pipe(
        map(res => (res.data || []).slice(0, 4).map((s: any) => ({
          symbol: s.symbol,
          name: s.instrument_name,
          type: 'stock',
          thumb: `https://ui-avatars.com/api/?name=${s.symbol}&background=171717&color=f97316&rounded=true&bold=true`
        }))),
        catchError(() => of([]))
      );
      requests.push(td$);
    }

    forkJoin(requests).subscribe(results => {
      this.searchResults.set(results.flat());
      this.isSearching.set(false);
    });
  }

  seleccionarParaComprarVender(resultado: SearchResult) {
    this.activoSeleccionado.set(resultado);
    this.transaccionTipo.set('buy');
    this.formulario.set({ simbolo: resultado.symbol, quantity: 0, avg_buy_price: 0, fecha: this.fechaHoy() });
    this.wizardStep.set(2);
    this.obtenerPrecioHistorico();
  }

  abrirModalNuevaPosicion() {
    this.wizardStep.set(1);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.activoSeleccionado.set(null);
    this.formulario.set({ simbolo: '', quantity: 0, avg_buy_price: 0, fecha: this.fechaHoy() });
    this.mostrarModal.set(true);
  }

  abrirModalTransaccion(activo: Activo, tipo: 'buy' | 'sell') {
    this.activoSeleccionado.set({ 
      symbol: activo.simbolo, 
      name: activo.nombre || activo.simbolo, 
      type: 'stock', 
      thumb: activo.image_url 
    });
    this.transaccionTipo.set(tipo);
    this.formulario.set({ simbolo: activo.simbolo, quantity: 0, avg_buy_price: 0, fecha: this.fechaHoy() });
    this.wizardStep.set(2);
    this.obtenerPrecioHistorico(); 
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  actualizarCantidad(q: number) {
    this.formulario.update(f => ({ ...f, quantity: q }));
  }

  actualizarPrecio(p: number) {
    this.formulario.update(f => ({ ...f, avg_buy_price: p }));
  }

  actualizarFecha(f: string) {
    this.formulario.update(form => ({ ...form, fecha: f }));
    this.obtenerPrecioHistorico();
  }

  cambiarTipoTransaccion(tipo: 'buy' | 'sell') {
    this.transaccionTipo.set(tipo);
  }

  volverBuscador() {
    this.wizardStep.set(1);
  }

  obtenerPrecioHistorico() {
    const form = this.formulario();
    if (!form.simbolo || !form.fecha) return;

    this.isFetchingPrice.set(true);

    // TODO: REEMPLAZAR ESTO CON TU LLAMADA REAL A LA API
    setTimeout(() => {
      const precioSimulado = (Math.random() * 500) + 10;
      this.formulario.update(f => ({ ...f, avg_buy_price: parseFloat(precioSimulado.toFixed(2)) }));
      this.isFetchingPrice.set(false);
    }, 800);
  }

  guardarTransaccion() {
    const payload = {
      simbolo: this.activoSeleccionado()?.symbol || this.formulario().simbolo,
      nombre: this.activoSeleccionado()?.name || null,
      image_url: this.activoSeleccionado()?.thumb || null, 
      type: this.transaccionTipo(),
      quantity: Number(this.formulario().quantity),
      price: Number(this.formulario().avg_buy_price)
    };

    this.http.post(`${this.apiUrl}/portfolios/${this.carteraId}/investments`, payload).subscribe({
      next: () => {
        this.cargarInversiones();
        this.cerrarModal();
      },
      error: (err) => {
        console.error('Error al guardar transacción:', err);
      }
    });
  }
}