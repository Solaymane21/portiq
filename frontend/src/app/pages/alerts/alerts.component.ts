import { Component, signal, inject, OnInit, HostListener, DestroyRef, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Subject, interval } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { AlertsService, Alert, SymbolResult } from '../../services/alerts.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PreferencesService } from '../../services/preferences.service';
import { SubscriptionService } from '../../services/subscription.service';
import { NotificationsService } from '../../services/notifications.service';
import { PlanLimitBannerComponent } from '../../components/plan-limit-banner/plan-limit-banner.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, CdkMenuTrigger, CdkMenu, CdkMenuItem, NgClass, PlanLimitBannerComponent],
  templateUrl: './alerts.component.html',
})
export class AlertsComponent implements OnInit {
  
  private alertsService = inject(AlertsService);
  private destroyRef = inject(DestroyRef);
  private preferencesService = inject(PreferencesService)
  subscriptionService = inject(SubscriptionService);
  notifications = inject(NotificationsService)

  // Si el usuario es gratis, solo puede tener 2 alertas
  isAtAlertLimit = computed(() => {
    if (this.subscriptionService.isPremium()) return false;
    return this.alerts().length >= 2;
  });

  // Estados del componente
  alerts   = signal<Alert[]>([]);                
  currentPrices = signal<Record<string, number>>({});
  isLoading  = signal(false);                       
  isCreating  = signal(false);                

  // Estado del modal de crear/editar
  showModal  = signal(false);                      
  editingAlert  = signal<Alert | null>(null);        
  searchQuery = '';                               
  searchResults  = signal<SymbolResult[]>([]);      
  selectedSymbol = signal<SymbolResult | null>(null);
  selectedSymbolPrice = signal<number | null>(null);  
  condition = signal<'above' | 'below'>('above');    
  targetPrice: number | null = null;         
  priceError = signal<string | null>(null);        

  private searchSubject  = new Subject<string>(); 
  private cachedAlerts: Alert[] | null = null;  

  ngOnInit(): void {
    this.loadAlerts();  // Carga las alertas al iniciar

    // Cada 2 minutos, actualiza los precios de los símbolos con alerta
    interval(120_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const current = this.alerts();
        if (current.length) this.loadCurrentPrices(current);
      });

    // Búsqueda de símbolos con debounce (espera 300ms después de cada tecla)
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.alertsService.searchSymbols(query))
    ).subscribe(results => this.searchResults.set(results));
  }

  // Carga las alertas desde el backend
  loadAlerts(): void {
    if (this.cachedAlerts) {
      this.alerts.set(this.cachedAlerts);
      this.alertsService.getAlerts().subscribe({
        next: (data) => {
          this.cachedAlerts = data;
          this.alerts.set(data);
          this.loadCurrentPrices(data);
        },
      });
      return;
    }

    this.isLoading.set(true);
    this.alertsService.getAlerts().subscribe({
      next: (data) => {
        this.cachedAlerts = data;
        this.alerts.set(data);
        this.isLoading.set(false);
        this.loadCurrentPrices(data);
      },
      error: () => this.isLoading.set(false),
    });
  }

  // Obtiene los precios actuales de los símbolos con alerta
  private loadCurrentPrices(alerts: Alert[]): void {
    if (!alerts.length) return;

    // Elimina duplicados (mismo símbolo y tipo)
    const uniquePairs = [...new Map(
      alerts.map(a => [`${a.symbol}:${a.asset_type}`, a])
    ).values()];

    const symbols = uniquePairs.map(a => a.symbol).join(',');
    const assetTypes = uniquePairs.map(a => a.asset_type).join(',');

    this.alertsService.getCurrentPrices(symbols, assetTypes).subscribe(results => {
      const map: Record<string, number> = { ...this.currentPrices() };
      results.forEach((r: any) => { if (r.price) map[r.symbol] = r.price; });
      this.currentPrices.set(map);
    });
  }

  // Cuando el usuario escribe en el buscador
  onSearch(query: string): void {
    if (query.length < 2) { this.searchResults.set([]); return; }
    this.searchSubject.next(query);
  }

  // Selecciona un símbolo de los resultados de búsqueda
  selectSymbol(result: SymbolResult): void {
    this.selectedSymbol.set(result);
    this.searchQuery = result.name;
    this.searchResults.set([]);
    this.priceError.set(null);
    this.targetPrice = null;

    // Obtiene el precio actual del símbolo seleccionado
    this.alertsService.getCurrentPrices(result.symbol, result.asset_type).subscribe(results => {
      const found = results.find((r: any) => r.symbol === result.symbol);
      this.selectedSymbolPrice.set(found?.price ?? null);
    });
  }

  // Valida que el precio objetivo sea correcto (mayor o menor que el actual)
  validatePrice(): boolean {
    const current = this.selectedSymbolPrice();
    const target  = this.targetPrice;
    if (!current || !target) return true;

    if (this.condition() === 'above' && target <= current) {
      this.priceError.set(`El precio debe ser mayor al actual (${current.toLocaleString()}€)`);
      return false;
    }
    if (this.condition() === 'below' && target >= current) {
      this.priceError.set(`El precio debe ser menor al actual (${current.toLocaleString()}€)`);
      return false;
    }
    this.priceError.set(null);
    return true;
  }

  // Abre el modal para crear una nueva alerta
  openCreateModal(): void {
    if (this.isAtAlertLimit()) {
      this.notifications.warning('Has alcanzado el límite de 2 alertas del plan gratuito.');
      return;
    }
    this.editingAlert.set(null);
    this.showModal.set(true);
  }

  // Abre el modal para editar una alerta existente
  openEditModal(alert: Alert): void {
    this.editingAlert.set(alert);
    this.searchQuery = alert.name;
    this.selectedSymbol.set({
      symbol: alert.symbol,
      name:  alert.name,
      asset_type: alert.asset_type,
      api_id: (alert as any).api_id ?? '',
      image_url: (alert as any).image_url ?? '',
    });
    this.condition.set(alert.condition);
    this.targetPrice = alert.target_price;
    this.priceError.set(null);

    this.alertsService.getCurrentPrices(alert.symbol, alert.asset_type).subscribe(results => {
      const found = results.find((r: any) => r.symbol === alert.symbol);
      this.selectedSymbolPrice.set(found?.price ?? null);
    });

    this.showModal.set(true);
  }

  // Guarda la alerta (crea o actualiza)
  saveAlert(): void {
    const sym = this.selectedSymbol();
    if (!sym || !this.targetPrice) return;
    if (!this.validatePrice()) return;

    const editing = this.editingAlert();

    if (!editing && this.isAtAlertLimit()) {
      this.notifications.warning('Has alcanzado el límite de 2 alertas del plan gratuito.');
      this.closeModal();
      return;
    }

    this.isCreating.set(true);

    if (editing) {
      // Actualiza alerta existente
      this.alertsService.updateAlert(editing.id, {
        target_price: this.targetPrice,
        condition:    this.condition(),
      }).subscribe({
        next: (updated) => {
          this.alerts.update(prev => prev.map(a => a.id === updated.id ? updated : a));
          this.cachedAlerts = this.alerts();
          this.closeModal();
          this.isCreating.set(false);
        },
        error: () => this.isCreating.set(false),
      });
    } else {
      // Crea nueva alerta
      this.alertsService.createAlert({
        symbol:       sym.symbol,
        name:         sym.name,
        asset_type:   sym.asset_type,
        api_id:       sym.api_id,
        image_url:    sym.image_url,
        target_price: this.targetPrice,
        condition:    this.condition(),
      }).subscribe({
        next: (alert) => {
          this.alerts.update(prev => [alert, ...prev]);
          this.cachedAlerts = this.alerts();
          this.loadCurrentPrices([alert]);
          this.closeModal();
          this.isCreating.set(false);
          this.subscriptionService.loadPlanLimits();  // Actualiza límites
        },
        error: () => this.isCreating.set(false),
      });
    }
  }

  // Activa o desactiva una alerta (sin borrarla)
  toggleAlert(alert: Alert): void {
    const previous = alert.is_active;
    const newValue = !previous;

    this.alerts.update(prev =>
      prev.map(a => a.id === alert.id ? { ...a, is_active: newValue } : a)
    );

    this.alertsService.updateAlert(alert.id, { is_active: newValue }).subscribe({
      next: (updated) => {
        this.alerts.update(prev => prev.map(a => a.id === updated.id ? updated : a));
        this.cachedAlerts = this.alerts();
      },
      error: () => {
        // Si falla, vuelve al estado anterior
        this.alerts.update(prev =>
          prev.map(a => a.id === alert.id ? { ...a, is_active: previous } : a)
        );
      },
    });
  }

  // Elimina una alerta
  deleteAlert(id: number): void {
    this.alerts.update(prev => prev.filter(a => a.id !== id));
    this.cachedAlerts = this.alerts();

    this.alertsService.deleteAlert(id).subscribe({
      next: () => this.subscriptionService.loadPlanLimits(),  // Actualiza límites
      error: () => this.loadAlerts(),  // Si falla, recarga
    });
  }

  // Cierra el modal y limpia los datos
  closeModal(): void {
    this.showModal.set(false);
    this.editingAlert.set(null);
    this.searchQuery = '';
    this.searchResults.set([]);
    this.selectedSymbol.set(null);
    this.selectedSymbolPrice.set(null);
    this.targetPrice = null;
    this.condition.set('above');
    this.priceError.set(null);
  }

  // Si el usuario hace clic fuera del buscador, cierra los resultados
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) this.searchResults.set([]);
  }

  // No permite números negativos en el campo de precio
  preventNegativeNums(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    if (input.value === '') return;

    if (value < 0) {
      input.value = '0';
      this.targetPrice = 0;
    }
  }

  // Formatea un número como moneda
  format(value: number) {
    return this.preferencesService.formatCurrency(value);
  }
}