import { Component, signal, computed, inject, OnInit, effect, viewChild, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InvestmentService } from '../../../services/investment.service';
import { AssetSearchResult, Investment, InvestmentsResponse } from '../../../models/investment.model';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [ReactiveFormsModule, MatTableModule, MatSortModule, MatPaginatorModule],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.css'
})
export class InvestmentsComponent implements OnInit, OnDestroy {
  // --- 1. DEPENDENCIAS ---
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private investmentService = inject(InvestmentService);

  // --- 2. ESTADO GENERAL Y MÉTRICAS (SIGNALS) ---
  portfolioId = signal<number | null>(null);
  cargando = signal(true);
  nombreCartera = signal('Cargando...');
  valorTotal = signal(0);
  ganancias = signal(0);
  porcentajeGanancias = signal(0);
  totalPosiciones = signal(0);

  // --- 3. CONFIGURACIÓN DE TABLA MATERIAL ---
  dataSource = new MatTableDataSource<Investment>([]);
  paginator = viewChild(MatPaginator);
  sort = viewChild(MatSort);
  columnasDef = [
    { def: 'symbol', title: 'Activo', align: 'left' },
    { def: 'weight', title: 'Peso', align: 'right' },
    { def: 'return_7d', title: '7D retorno', align: 'right' },
    { def: 'value', title: 'Valor', align: 'right' },
    { def: 'quantity', title: 'Acciones', align: 'right' }
  ];
  displayedColumns: string[] = [...this.columnasDef.map(c => c.def), 'opciones'];

  // --- 4. ESTADO DE MODALES Y BÚSQUEDA ---
  modalAbierto = signal(false);
  guardando = signal(false);
  modalModo = signal<'create' | 'buy' | 'sell'>('create');
  modalPaso = signal<'search' | 'details'>('search');

  busqueda = signal('');
  filtroTipo = signal<'all' | 'crypto' | 'stock'>('all');
  buscandoActivos = signal(false);
  resultadosBusquedaOriginales = signal<AssetSearchResult[]>([]);
  
  resultadosFiltrados = computed(() => {
    if (this.filtroTipo() === 'all') return this.resultadosBusquedaOriginales();
    return this.resultadosBusquedaOriginales().filter(a => a.asset_type === this.filtroTipo());
  });

  activoSeleccionado = signal<any>(null);
  inversionSeleccionada = signal<Investment | null>(null);
  buscandoPrecio = signal(false);

  // --- 5. FORMULARIOS Y SUSCRIPCIONES ---
  private searchSubject = new Subject<string>();
  private formSubscription?: Subscription;

  posicionForm: FormGroup = this.fb.group({
    ticker: ['', [Validators.required, Validators.maxLength(10)]],
    name: [''],
    asset_type: ['crypto', Validators.required],
    image_url: [''],
    operated_at: ['', Validators.required],
    quantity: [null, [Validators.required, Validators.min(0.00000001)]],
    price: [null, [Validators.required, Validators.min(0.01)]],
    api_id: [''] 
  });

  // --- 6. CICLO DE VIDA ---
  constructor() {
    effect(() => {
      const pag = this.paginator();
      const srt = this.sort();
      if (pag) this.dataSource.paginator = pag;
      if (srt) this.dataSource.sort = srt;
    });
  }

  ngOnInit() {
    this.inicializarRuta();
    this.inicializarBuscador();
    this.inicializarEscuchaDePrecioHistorico();
  }

  ngOnDestroy() {
    this.formSubscription?.unsubscribe();
  }

  // --- 7. PETICIONES A LA API (LÓGICA PRINCIPAL) ---
  cargarInversiones() {
    const id = this.portfolioId();
    if (!id) return;

    this.cargando.set(true);
    this.investmentService.getInvestments(id).subscribe({
      next: (response: any) => {
        this.nombreCartera.set(response.portfolio_name);
        this.valorTotal.set(response.total_value);
        this.totalPosiciones.set(response.investments.length);
        this.ganancias.set(0);
        this.porcentajeGanancias.set(0);
        this.dataSource.data = response.investments;
        this.cargando.set(false);
      },
      error: (err: any) => {
        console.error('Error cargando inversiones:', err);
        this.cargando.set(false);
      }
    });
  }

  guardarPosicion() {
    if (this.posicionForm.invalid || !this.portfolioId()) return;

    const formValues = this.posicionForm.value;
    this.guardando.set(true);

    if (this.modalModo() === 'create') {
      const payload = {
        symbol: String(formValues.ticker).toUpperCase(),
        name: formValues.name,
        image_url: formValues.image_url,
        asset_type: formValues.asset_type,
        quantity: Number(formValues.quantity),
        avg_buy_price: Number(formValues.price),
        operated_at: formValues.operated_at
      };

      this.investmentService.addInvestment(this.portfolioId()!, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarModal();
          this.cargarInversiones();
        },
        error: (err: any) => {
          console.error('Error guardando posición:', err);
          this.guardando.set(false);
        }
      });
      return;
    }

    const inversion = this.inversionSeleccionada();
    if (!inversion) {
      this.guardando.set(false);
      return;
    }

    const tradePayload = {
      quantity: Number(formValues.quantity),
      price_per_unit: Number(formValues.price),
      operated_at: formValues.operated_at
    };

    const request$ = this.modalModo() === 'buy'
      ? this.investmentService.buyInvestment(this.portfolioId()!, inversion.id, tradePayload)
      : this.investmentService.sellInvestment(this.portfolioId()!, inversion.id, tradePayload);

    request$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.cargarInversiones();
      },
      error: (err: any) => {
        console.error('Error procesando operación:', err);
        this.guardando.set(false);
      }
    });
  }

  // --- 8. MANEJO DEL MODAL Y EVENTOS UI ---
  abrirModalNuevaPosicion() {
    this.prepararModal('create');
  }

  comprarActivo(activo: Investment) {
    this.prepararModal('buy', activo);
  }

  venderActivo(activo: Investment) {
    this.prepararModal('sell', activo);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.guardando.set(false);
    this.buscandoActivos.set(false);
  }

  volverABusqueda() {
    if (this.modalModo() !== 'create') return;
    this.modalPaso.set('search');
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.busqueda.set(value);
    this.buscandoActivos.set(true);
    this.searchSubject.next(value);
  }

  setFiltro(tipo: 'all' | 'crypto' | 'stock') {
    this.filtroTipo.set(tipo);
  }

  seleccionarActivo(activo: any) {
    this.activoSeleccionado.set(activo);
    this.modalPaso.set('details');

    this.posicionForm.patchValue({
      ticker: activo.symbol,
      name: activo.name,
      asset_type: activo.asset_type,
      image_url: activo.image_url ?? '',
      api_id: activo.api_id 
    });

    const currentFecha = this.posicionForm.get('operated_at')?.value;
    if (currentFecha) {
      this.posicionForm.get('operated_at')?.setValue(currentFecha, { emitEvent: true });
    }
  }

  // --- 9. NAVEGACIÓN ---
  irAWallets() {
    this.router.navigate(['/app/wallets']);
  }

  verHistorialTrades() {
    const currentId = this.portfolioId();
    if (currentId !== null) {
      this.router.navigate(['/app/wallets', currentId, 'trades']);
    }
  }

  // --- 10. FUNCIONES ÚTILES PARA EL HTML (PIPES/FORMATTERS) ---
  getInitial(value: string | null | undefined): string {
    return value ? value.charAt(0).toUpperCase() : '';
  }

  formatNumber(value: number | null | undefined, digits: number = 2): string {
    return Number(value ?? 0).toFixed(digits);
  }

  getTextAlignClass(align: string): string {
    return align === 'right' ? '!text-right' : '!text-left';
  }

  getCellClass(colDef: string, value: number | string | null | undefined): string {
    if (colDef === 'return_7d') {
      return Number(value ?? 0) >= 0 ? '!text-green-500 font-medium' : '!text-red-500 font-medium';
    }
    if (colDef === 'value') {
      return '!text-white font-medium';
    }
    if (colDef !== 'symbol') {
      return '!text-neutral-400 font-ibm';
    }
    return '';
  }

  getModalTitle(): string {
    if (this.modalModo() === 'create') return 'Nueva Posición';
    if (this.modalModo() === 'buy') return 'Comprar Activo';
    return 'Vender Activo';
  }

  getModalActionText(): string {
    if (this.guardando()) return 'Guardando...';
    if (this.modalModo() === 'create') return 'Añadir';
    if (this.modalModo() === 'buy') return 'Comprar';
    return 'Vender';
  }

  // --- 11. MÉTODOS PRIVADOS DE INICIALIZACIÓN ---
  private inicializarRuta() {
    this.route.parent?.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.portfolioId.set(Number(id));
        this.cargarInversiones();
      }
    });

    if (!this.portfolioId()) {
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.portfolioId.set(Number(id));
          this.cargarInversiones();
        }
      });
    }
  }

  private inicializarBuscador() {
    this.searchSubject.pipe(
      debounceTime(250), 
      distinctUntilChanged(),
      filter(query => {
        if (query.trim().length < 2) {
          this.resultadosBusquedaOriginales.set([]);
          this.buscandoActivos.set(false);
          return false;
        }
        return true;
      }),
      switchMap(query => {
        this.buscandoActivos.set(true);
        return this.investmentService.searchAssets(query);
      })
    ).subscribe({
      next: (results: any) => {
        this.resultadosBusquedaOriginales.set(results);
        this.buscandoActivos.set(false);
      },
      error: (err: any) => {
        console.error('Error buscando activos:', err);
        this.resultadosBusquedaOriginales.set([]);
        this.buscandoActivos.set(false);
      }
    });
  }

  private inicializarEscuchaDePrecioHistorico() {
  this.formSubscription = this.posicionForm.get('operated_at')?.valueChanges.subscribe(fecha => {
    const apiId = this.posicionForm.get('api_id')?.value;
    const assetType = this.posicionForm.get('asset_type')?.value;

    if (fecha && apiId && assetType) {
      this.buscandoPrecio.set(true);
      
      this.investmentService.getHistoricalPrice(apiId, assetType, fecha).subscribe({
        next: (res: any) => {
          if (res && res.price && res.price > 0) {
            this.posicionForm.patchValue({ price: res.price }, { emitEvent: false });
          } else {
            this.posicionForm.patchValue({ price: null }, { emitEvent: false });
          }
          this.buscandoPrecio.set(false);
        },
        error: (err: any) => {
          console.warn('El servidor no pudo obtener el precio de apertura:', err);
          this.posicionForm.patchValue({ price: null }, { emitEvent: false });
          this.buscandoPrecio.set(false);
        }
      });
    }
  });
}

  private prepararModal(modo: 'create' | 'buy' | 'sell', activo?: Investment) {
    this.modalModo.set(modo);
    this.modalPaso.set(modo === 'create' ? 'search' : 'details');
    
    if (modo === 'create') {
      this.busqueda.set('');
      this.resultadosBusquedaOriginales.set([]);
      this.activoSeleccionado.set(null);
      this.inversionSeleccionada.set(null);
      this.filtroTipo.set('all'); 
    } else if (activo) {
      this.inversionSeleccionada.set(activo);
      this.activoSeleccionado.set({
        symbol: activo.symbol,
        name: activo.name ?? activo.symbol,
        image_url: activo.image_url ?? null,
        asset_type: activo.asset_type ?? 'crypto'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    this.posicionForm.reset({
      ticker: activo?.symbol ?? '',
      name: activo?.name ?? (activo?.symbol ?? ''),
      asset_type: activo?.asset_type ?? 'crypto',
      image_url: activo?.image_url ?? '',
      api_id: activo?.symbol ?? '',
      operated_at: today,
      quantity: null,
      price: null
    });

    this.modalAbierto.set(true);
  }
}