import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  effect,
  viewChild,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InvestmentService } from '../../../services/investment.service';
import { AssetSearchResult, Investment } from '../../../models/investment.model';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { buildInvestmentsCsv } from '../wallets-csv';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [ReactiveFormsModule, MatTableModule, MatSortModule, MatPaginatorModule],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.css'
})
export class InvestmentsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private investmentService = inject(InvestmentService);
  private destroyRef = inject(DestroyRef);

  portfolioId = signal<number | null>(null);
  cargando = signal(true);
  nombreCartera = signal('Cargando...');
  valorTotal = signal(0);
  ganancias = signal(0);
  porcentajeGanancias = signal(0);
  totalPosiciones = signal(0);
  soloLectura = signal(false);
  ownerName = signal<string | null>(null);

  dataSource = new MatTableDataSource<Investment>([]);
  paginator = viewChild(MatPaginator);
  sort = viewChild(MatSort);

  columnasDef = [
    { def: 'symbol', title: 'Activo', align: 'left' },
    { def: 'weight', title: 'Peso', align: 'left' },
    { def: 'return_7d', title: '7D retorno', align: 'left' },
    { def: 'value', title: 'Valor', align: 'left' },
    { def: 'quantity', title: 'Acciones', align: 'left' }
  ];

  columnasVisibles = computed(() => {
    const base = this.columnasDef.map((c) => c.def);
    return this.soloLectura() ? base : [...base, 'opciones'];
  });

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
    return this.resultadosBusquedaOriginales().filter((a) => a.asset_type === this.filtroTipo());
  });

  activoSeleccionado = signal<AssetSearchResult | null>(null);
  inversionSeleccionada = signal<Investment | null>(null);
  buscandoPrecio = signal(false);

  private searchSubject = new Subject<string>();

  posicionForm: FormGroup = this.fb.group({
    ticker: ['', [Validators.required, Validators.maxLength(10)]],
    name: [''],
    asset_type: ['crypto', Validators.required],
    image_url: [''],
    operated_at: ['', Validators.required],
    quantity: [null, [Validators.required, Validators.min(0.00000001)]],
    price: [null, Validators.required],
    api_id: ['']
  });

  constructor() {
    effect(() => {
      const pag = this.paginator();
      const srt = this.sort();
      if (pag) this.dataSource.paginator = pag;
      if (srt) this.dataSource.sort = srt;
    });
  }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.portfolioId.set(Number(id));
        this.cargarInversiones();
      }
    });

    this.inicializarBuscador();
    this.posicionForm
      .get('operated_at')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((fecha) => {
        const apiId = this.posicionForm.get('api_id')?.value;
        const assetType = this.posicionForm.get('asset_type')?.value;

        if (fecha && apiId && assetType) {
          this.buscandoPrecio.set(true);
          this.investmentService.getHistoricalPrice(apiId, assetType, fecha).subscribe({
            next: (res: { price?: number }) => {
              if (res?.price && res.price > 0) {
                this.posicionForm.patchValue({ price: res.price }, { emitEvent: false });
              } else {
                this.posicionForm.patchValue({ price: null }, { emitEvent: false });
              }
              this.buscandoPrecio.set(false);
            },
            error: () => {
              this.posicionForm.patchValue({ price: null }, { emitEvent: false });
              this.buscandoPrecio.set(false);
            }
          });
        }
      });
  }

  validarCantidadMaxima() {
    if (this.modalModo() === 'sell' && this.inversionSeleccionada()) {
      const maxQ = this.inversionSeleccionada()!.quantity;
      const currentQ = this.posicionForm.get('quantity')?.value;
      if (currentQ > maxQ) {
        this.posicionForm.patchValue({ quantity: maxQ });
      }
    }
  }

  cargarInversiones() {
    const id = this.portfolioId();
    if (!id) return;

    this.cargando.set(true);
    this.investmentService.getInvestments(id).subscribe({
      next: (response) => {
        this.soloLectura.set(Boolean(response.read_only));
        this.ownerName.set(response.owner_name ?? null);
        this.nombreCartera.set(response.portfolio_name);
        this.valorTotal.set(response.total_value);

        const inversionesActivas = response.investments.filter((inv) => inv.quantity > 0);
        this.totalPosiciones.set(inversionesActivas.length);
        this.ganancias.set(0);
        this.porcentajeGanancias.set(0);
        this.dataSource.data = inversionesActivas;
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando inversiones:', err);
        this.soloLectura.set(false);
        this.ownerName.set(null);
        this.cargando.set(false);
      }
    });
  }

  exportarCsv() {
    const id = this.portfolioId();
    if (!id || this.soloLectura()) return;

    const name = this.nombreCartera();
    const csv = buildInvestmentsCsv(name, this.dataSource.data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = name.replace(/[^\w\-]+/g, '_').slice(0, 48) || 'cartera';
    a.href = url;
    a.download = `${safe}_${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        error: (err) => {
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

    const request$ =
      this.modalModo() === 'buy'
        ? this.investmentService.buyInvestment(this.portfolioId()!, inversion.id, tradePayload)
        : this.investmentService.sellInvestment(this.portfolioId()!, inversion.id, tradePayload);

    request$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.cargarInversiones();
      },
      error: (err) => {
        console.error('Error procesando operación:', err);
        this.guardando.set(false);
      }
    });
  }

  abrirModalNuevaPosicion() {
    if (this.soloLectura()) return;
    this.prepararModal('create');
  }

  comprarActivo(activo: Investment) {
    if (this.soloLectura()) return;
    this.prepararModal('buy', activo);
  }

  venderActivo(activo: Investment) {
    if (this.soloLectura()) return;
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

  seleccionarActivo(activo: AssetSearchResult) {
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

  irAWallets() {
    this.router.navigate(['/app/wallets']);
  }

  verHistorialTrades() {
    const currentId = this.portfolioId();
    if (currentId !== null) {
      this.router.navigate(['/app/wallets', currentId, 'trades']);
    }
  }

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
      return Number(value ?? 0) >= 0 ? '!text-green-500 font-ibm' : '!text-red-500 font-ibm';
    }
    if (colDef === 'weight' || colDef === 'value') {
      return '!text-orange-500 font-medium font-ibm';
    }
    if (colDef === 'symbol' || colDef === 'quantity') {
      return '!text-white font-ibm';
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

  private inicializarBuscador() {
    this.searchSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        filter((query) => {
          if (query.trim().length < 2) {
            this.resultadosBusquedaOriginales.set([]);
            this.buscandoActivos.set(false);
            return false;
          }
          return true;
        }),
        switchMap((query) => {
          this.buscandoActivos.set(true);
          return this.investmentService.searchAssets(query);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (results) => {
          this.resultadosBusquedaOriginales.set(results);
          this.buscandoActivos.set(false);
        },
        error: (err) => {
          console.error('Error buscando activos:', err);
          this.resultadosBusquedaOriginales.set([]);
          this.buscandoActivos.set(false);
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
        asset_type: (activo.asset_type ?? 'crypto') as 'stock' | 'crypto',
        api_id: activo.api_id
      });
    }

    const today = new Date().toISOString().split('T')[0];
    this.posicionForm.reset(
      {
        ticker: activo?.symbol ?? '',
        name: activo?.name ?? (activo?.symbol ?? ''),
        asset_type: activo?.asset_type ?? 'crypto',
        image_url: activo?.image_url ?? '',
        api_id: activo?.api_id ?? '',
        operated_at: today,
        quantity: null,
        price: null
      },
      { emitEvent: false }
    );

    queueMicrotask(() => {
      const apiId = this.posicionForm.get('api_id')?.value;
      const assetType = this.posicionForm.get('asset_type')?.value;
      const fecha = this.posicionForm.get('operated_at')?.value;

      if (apiId && assetType && fecha) {
        this.investmentService.getHistoricalPrice(apiId, assetType, fecha).subscribe({
          next: (res: { price?: number }) => {
            if (res?.price && res.price > 0) {
              this.posicionForm.patchValue({ price: res.price }, { emitEvent: false });
            } else {
              this.posicionForm.patchValue({ price: null }, { emitEvent: false });
            }
          },
          error: () => {
            this.posicionForm.patchValue({ price: null }, { emitEvent: false });
          }
        });
      }
    });

    this.modalAbierto.set(true);
  }
}
