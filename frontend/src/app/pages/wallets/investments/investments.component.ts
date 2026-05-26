import { Component, DestroyRef, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';

import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { PreferencesService } from '../../../services/preferences.service';
import { InvestmentService } from '../../../services/investment.service';
import { AssetSearchResult, Investment, InvestmentsResponse, TradeActionPayload, UpsertPositionPayload } from '../../../models/investment.model';
import { buildInvestmentsCsv } from '../wallets-csv';

import { NotificationsService } from '../../../services/notifications.service';
import { SubscriptionService } from '../../../services/subscription.service';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [ReactiveFormsModule, MatTableModule, MatSortModule, MatPaginatorModule, RouterLink],
  templateUrl: './investments.component.html',
  styleUrls: ['./investments.component.css'],
})
export class InvestmentsComponent implements OnInit {
  // Servicios e inyecciones
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private investmentService = inject(InvestmentService);
  private destroyRef = inject(DestroyRef);
  private preferencesService = inject(PreferencesService);
  subscriptionService = inject(SubscriptionService);
  private notifications = inject(NotificationsService);

  isAtAssetLimit = computed(() => {
    if (this.subscriptionService.isPremium()) return false;
    return this.totalPositions() >= 10;
  });

  // Navegación
  portfolioId = signal<number | null>(null);
  returnUrl = '/app/wallets';

  // Estado general de la vista
  isLoading = signal(true);
  portfolioName = signal('Cargando...');
  isReadOnly = signal(false);
  ownerName = signal<string | null>(null);

  // Resumen de la cartera
  totalValue = signal(0);
  totalCost = signal(0);
  totalProfit = signal(0);
  totalProfitPercentage = signal(0);
  totalPositions = signal(0);

  // Tabla
  dataSource = new MatTableDataSource<Investment>([]);
  paginator = viewChild(MatPaginator);
  sort = viewChild(MatSort);
  skeletonItems = Array.from({ length: 5 }, (_, i) => i);

  columns = [
    { def: 'symbol', title: 'Activo', align: 'left' },
    { def: 'weight', title: 'Peso', align: 'left' },
    { def: 'return_7d', title: 'Rendimiento', align: 'left' },
    { def: 'value', title: 'Valor', align: 'left' },
    { def: 'quantity', title: 'Acciones', align: 'left' },
  ];

  visibleColumns = computed(() => {
    const baseColumns = this.columns.map((column) => column.def);
    return this.isReadOnly() ? baseColumns : [...baseColumns, 'actions'];
  });

  // Modal
  isModalOpen = signal(false);
  isSaving = signal(false);
  modalMode = signal<'create' | 'buy' | 'sell'>('create');
  modalStep = signal<'search' | 'details'>('search');

  // Buscador de activos
  searchQuery = signal('');
  assetTypeFilter = signal<'all' | 'crypto' | 'stock'>('all');
  isSearchingAssets = signal(false);
  rawSearchResults = signal<AssetSearchResult[]>([]);
  private readonly assetSearchSubject = new Subject<string>();

  filteredSearchResults = computed(() => {
    if (this.assetTypeFilter() === 'all') {
      return this.rawSearchResults();
    }

    return this.rawSearchResults().filter((asset) => asset.asset_type === this.assetTypeFilter());
  });

  // Activo o inversión seleccionada
  selectedAsset = signal<AssetSearchResult | null>(null);
  selectedInvestment = signal<Investment | null>(null);
  isLoadingHistoricalPrice = signal(false);

  // Formulario
  today = this.getLocalDateString();

  positionForm: FormGroup = this.formBuilder.group({
    ticker: ['', [Validators.required, Validators.maxLength(10)]],
    name: [''],
    asset_type: ['crypto', Validators.required],
    image_url: [''],
    api_id: [''],
    operated_at: ['', Validators.required],
    quantity: [null, [Validators.required, Validators.min(0.00000001)]],
    price: [null, [Validators.required, Validators.min(0.00000001)]],
  });

  constructor() {
    // Configura el sorting personalizado y enlaza paginator/sort cuando estén disponibles
    effect(() => {
      const paginatorRef = this.paginator();
      const sortRef = this.sort();

      this.dataSource.sortingDataAccessor = (item: Investment, property: string) => {
        switch (property) {
          case 'symbol':
            return item.symbol ?? '';
          case 'weight':
            return Number(item.weight ?? 0);
          case 'return_7d':
            return Number(item.pl_percentage ?? 0);
          case 'value':
            return Number(item.value ?? 0);
          case 'quantity':
            return Number(item.quantity ?? 0);
          default:
            return (item as any)[property] ?? '';
        }
      };

      if (paginatorRef) {
        this.dataSource.paginator = paginatorRef;
      }

      if (sortRef) {
        this.dataSource.sort = sortRef;
      }
    });
  }

  ngOnInit(): void {
    // Lee el id de la cartera desde la ruta y carga los datos
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');

        if (!id) {
          return;
        }

        this.portfolioId.set(Number(id));
        this.loadInvestments();
      });

    // Guarda la ruta de vuelta para poder regresar correctamente
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/app/wallets';

    // Inicializa listeners auxiliares
    this.initializeAssetSearch();
    this.initializeOperationDateChanges();
  }

  // Carga las inversiones de la cartera actual
  loadInvestments(): void {
    const portfolioId = this.portfolioId();

    if (!portfolioId) {
      return;
    }

    this.isLoading.set(true);

    this.investmentService
      .getInvestments(portfolioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: InvestmentsResponse) => {
          this.isReadOnly.set(Boolean(response.read_only));
          this.ownerName.set(response.owner_name ?? null);
          this.portfolioName.set(response.portfolio_name);

          const activeInvestments = response.investments.filter(
            (investment) => Number(investment.quantity) > 0
          );

          this.dataSource.data = activeInvestments;
          this.updateSummary(response.total_value, activeInvestments);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading investments:', error);
          this.isReadOnly.set(false);
          this.ownerName.set(null);
          this.dataSource.data = [];
          this.updateSummary(0, []);
          this.isLoading.set(false);
        }
      });
  }

  // Exporta la cartera actual a CSV
  exportCsv(): void {
    // solo premium
    if (!this.subscriptionService.canUseFeature('export')) {
      this.notifications.warning('La exportación CSV requiere el Plan Premium');
      return;
    }

    const portfolioId = this.portfolioId();

    if (!portfolioId || this.isReadOnly()) {
      return;
    }

    const portfolioName = this.portfolioName();
    const csv = buildInvestmentsCsv(portfolioName, this.dataSource.data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const safeName =
      portfolioName.replace(/[^\w\-]+/g, '_').slice(0, 48) || 'portfolio';

    link.href = url;
    link.download = `${safeName}_${portfolioId}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  // Guarda una nueva posición o procesa una compra/venta
  savePosition(): void {
    const portfolioId = this.portfolioId();

    if (!portfolioId || this.positionForm.invalid) {
      return;
    }

    if (this.modalMode() === 'create' && this.isAtAssetLimit()) {
      this.notifications.warning('Has alcanzado el límite de 10 activos del plan gratuito.');
      this.closeModal();
      return;
    }

    const formValue = this.positionForm.value;
    this.isSaving.set(true);

    if (this.modalMode() === 'create') {
      this.createPosition(portfolioId, formValue);
      return;
    }

    this.executeTrade(portfolioId, formValue);
  }

  // Vuelve a la pantalla anterior
  goBack(): void {
    this.router.navigateByUrl(this.returnUrl);
  }

  // Abre el historial de trades de la cartera
  viewTradeHistory(): void {
    const currentPortfolioId = this.portfolioId();

    if (currentPortfolioId === null) {
      return;
    }

    this.router.navigate(['/app/wallets', currentPortfolioId, 'trades'], {
      queryParams: {
        returnUrl: this.router.url,
      },
    });
  }

  // Abre el modal para crear una posición nueva
  openNewPositionModal(): void {
    if (this.isReadOnly()) {
      return;
    }

    if (this.isAtAssetLimit()) {
      this.notifications.warning('Has alcanzado el límite de 10 activos del plan gratuito.');
      return;
    }

    this.prepareModal('create');
  }

  // Abre el modal en modo compra
  buyAsset(investment: Investment): void {
    if (this.isReadOnly()) {
      return;
    }

    this.prepareModal('buy', investment);
  }

  // Abre el modal en modo venta
  sellAsset(investment: Investment): void {
    if (this.isReadOnly()) {
      return;
    }

    this.prepareModal('sell', investment);
  }

  // Cierra el modal y limpia estados temporales
  closeModal(): void {
    this.isModalOpen.set(false);
    this.isSaving.set(false);
    this.isSearchingAssets.set(false);
  }

  // Vuelve al paso de búsqueda dentro del modal
  goBackToSearch(): void {
    if (this.modalMode() !== 'create') {
      return;
    }

    this.modalStep.set('search');
  }

  // Actualiza el texto del buscador y lanza la búsqueda si procede
  onAssetSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    if (value.trim().length < 2) {
      this.isSearchingAssets.set(false);
      this.rawSearchResults.set([]);
      return;
    }

    this.isSearchingAssets.set(true);
    this.assetSearchSubject.next(value);
  }

  // Cambia el filtro de tipo de activo
  setAssetTypeFilter(type: 'all' | 'crypto' | 'stock'): void {
    this.assetTypeFilter.set(type);
  }

  // Guarda el activo seleccionado y rellena el formulario
  selectAsset(asset: AssetSearchResult): void {
    this.selectedAsset.set(asset);
    this.modalStep.set('details');

    this.positionForm.patchValue({
      ticker: asset.symbol,
      name: asset.name,
      asset_type: asset.asset_type,
      image_url: asset.image_url ?? '',
      api_id: asset.symbol ?? '',
    });

    this.loadHistoricalPrice();
  }

  // Evita vender más cantidad de la disponible
  validateMaxSellQuantity(): void {
    const selectedInvestment = this.selectedInvestment();

    if (this.modalMode() !== 'sell' || !selectedInvestment) {
      return;
    }

    const maxQuantity = Number(selectedInvestment.quantity ?? 0);
    const currentQuantity = Number(this.positionForm.get('quantity')?.value ?? 0);

    if (currentQuantity > maxQuantity) {
      this.positionForm.patchValue({ quantity: maxQuantity });
    }
  }

  // Devuelve la inicial del activo si no hay imagen
  getInitial(value: string | null | undefined): string {
    return value ? value.charAt(0).toUpperCase() : '';
  }

  // Formatea números con decimales fijos
  formatNumber(value: number | string | null | undefined, digits = 2): string {
    return Number(value ?? 0).toFixed(digits);
  }

  getAvailableQuantity(): number {
    const investment = this.selectedInvestment();
    return Number(investment?.quantity ?? 0);
  }

  // Formatea un importe usando las preferencias del usuario
  formatCurrency(value: number): string {
    return this.preferencesService.formatCurrency(value);
  }

  // Convierte el valor a número y lo formatea como moneda
  formatValue(value: number | string | null | undefined): string {
    return this.preferencesService.formatCurrency(Number(value ?? 0));
  }

  // Devuelve la clase de alineación para la tabla
  getTextAlignClass(align: string): string {
    return align === 'right' ? '!text-right' : '!text-left';
  }

  // Añade clase extra a ciertas columnas de la tabla
  getCellClass(columnDef: string): string {
    const styledColumns = ['weight', 'value', 'quantity', 'symbol', 'return_7d'];
    return styledColumns.includes(columnDef) ? 'font-ibm' : '';
  }

  // Devuelve el título del modal según el modo actual
  getModalTitle(): string {
    if (this.modalMode() === 'create') return 'Nueva Posición';
    if (this.modalMode() === 'buy') return 'Comprar Activo';
    return 'Vender Activo';
  }

  // Devuelve el texto del botón principal del modal
  getModalActionText(): string {
    if (this.isSaving()) return 'Guardando...';
    if (this.modalMode() === 'create') return 'Añadir';
    if (this.modalMode() === 'buy') return 'Comprar';
    return 'Vender';
  }

  // Recalcula el resumen de la cartera
  private updateSummary(totalValue: number, investments: Investment[]): void {
    let totalCost = 0;
    let totalProfit = 0;

    for (const investment of investments) {
      const quantity = Number(investment.quantity ?? 0);
      const averageBuyPrice = Number(investment.avg_buy_price ?? 0);
      const profitLoss = Number(investment.pl ?? 0);

      totalCost += quantity * averageBuyPrice;
      totalProfit += profitLoss;
    }

    this.totalValue.set(Number(totalValue ?? 0));
    this.totalCost.set(totalCost);
    this.totalProfit.set(totalProfit);
    this.totalPositions.set(investments.length);
    this.totalProfitPercentage.set(totalCost > 0 ? (totalProfit / totalCost) * 100 : 0);
  }

  // Crea una posición nueva en la cartera
  private createPosition(portfolioId: number, formValue: any): void {
    const payload: UpsertPositionPayload = {
      symbol: String(formValue.ticker).toUpperCase(),
      name: formValue.name,
      image_url: formValue.image_url,
      asset_type: formValue.asset_type,
      quantity: Number(formValue.quantity),
      avg_buy_price: Number(formValue.price),
      operated_at: formValue.operated_at,
      api_id: formValue.api_id,
    };

    this.investmentService
      .addInvestment(portfolioId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.notifications.success('Posición creada correctamente.');
          this.loadInvestments();
        },
        error: (error) => {
          console.error('Error saving position:', error);
          this.isSaving.set(false);
        },
      });
  }

  // Procesa una compra o una venta sobre una inversión existente
  private executeTrade(portfolioId: number, formValue: any): void {
    const selectedInvestment = this.selectedInvestment();

    if (!selectedInvestment) {
      this.isSaving.set(false);
      return;
    }

    const tradePayload: TradeActionPayload = {
      quantity: Number(formValue.quantity),
      price_per_unit: Number(formValue.price),
      operated_at: formValue.operated_at,
    };

    const isBuy = this.modalMode() === 'buy';

    const request$ = isBuy
      ? this.investmentService.buyInvestment(
          portfolioId,
          selectedInvestment.id,
          tradePayload
        )
      : this.investmentService.sellInvestment(
          portfolioId,
          selectedInvestment.id,
          tradePayload
        );

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.success(
            isBuy ? 'Compra realizada correctamente.' : 'Venta realizada correctamente.'
          );
          this.isSaving.set(false);
          this.closeModal();
          this.loadInvestments();
        },
        error: (error) => {
          console.error('Error processing trade:', error);
          this.isSaving.set(false);
        },
      });
  }

  // Inicializa el flujo reactivo del buscador de activos
  private initializeAssetSearch(): void {
    this.assetSearchSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        filter((query) => query.trim().length >= 2),
        switchMap((query) => this.investmentService.searchAssets(query)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (results) => {
          this.rawSearchResults.set(results);
          this.isSearchingAssets.set(false);
        },
        error: (error) => {
          console.error('Error searching assets:', error);
          this.rawSearchResults.set([]);
          this.isSearchingAssets.set(false);
        },
      });
  }

  // Escucha cambios en la fecha para recargar el precio histórico
  private initializeOperationDateChanges(): void {
    this.positionForm
      .get('operated_at')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.isModalOpen()) {
          this.loadHistoricalPrice();
        }
      });
  }

  // Carga el precio histórico según activo, tipo y fecha
  private loadHistoricalPrice(): void {
    const apiId = this.positionForm.get('api_id')?.value;
    const assetType = this.positionForm.get('asset_type')?.value;
    const operatedAt = this.positionForm.get('operated_at')?.value;

    if (!apiId || !assetType || !operatedAt) {
      return;
    }

    this.isLoadingHistoricalPrice.set(true);

    this.investmentService
      .getHistoricalPrice(apiId, assetType, operatedAt)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.positionForm.patchValue(
            { price: Number(response.price ?? 0) || null },
            { emitEvent: false }
          );
          this.isLoadingHistoricalPrice.set(false);
        },
        error: (error) => {
          console.error('Error loading historical price:', error);
          this.positionForm.patchValue({ price: null }, { emitEvent: false });
          this.isLoadingHistoricalPrice.set(false);
        },
      });
  }

  // Prepara el modal según la acción que se vaya a realizar
  private prepareModal(mode: 'create' | 'buy' | 'sell', investment?: Investment): void {
    this.modalMode.set(mode);
    this.modalStep.set(mode === 'create' ? 'search' : 'details');

    if (mode === 'create') {
      this.searchQuery.set('');
      this.assetTypeFilter.set('all');
      this.rawSearchResults.set([]);
      this.selectedAsset.set(null);
      this.selectedInvestment.set(null);
    } else if (investment) {
      this.selectedInvestment.set(investment);
      this.selectedAsset.set({
        symbol: investment.symbol,
        name: investment.name ?? investment.symbol,
        image_url: investment.image_url ?? null,
        asset_type: investment.asset_type,
        api_id: investment.symbol,
      });
    }

    this.positionForm.reset(
      {
        ticker: investment?.symbol ?? '',
        name: investment?.name ?? investment?.symbol ?? '',
        asset_type: investment?.asset_type ?? 'crypto',
        image_url: investment?.image_url ?? '',
        api_id: investment?.symbol ?? '',
        operated_at: this.today,
        quantity: null,
        price: null,
      },
      { emitEvent: false }
    );

    this.isModalOpen.set(true);

    if (mode !== 'create') {
      this.loadHistoricalPrice();
    }
  }

  // Devuelve la fecha local en formato YYYY-MM-DD
  private getLocalDateString(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  }
}