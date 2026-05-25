import { Component, signal, OnInit, inject, viewChild, ElementRef, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, finalize } from 'rxjs/operators';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';

import { PortfolioService } from '../../../services/portfolio.service';
import { InvestmentService } from '../../../services/investment.service';
import { PreferencesService } from '../../../services/preferences.service';
import { Portfolio } from '../../../models/portfolio.model';
import { ImportPositionRow, parsePositionsCsv, downloadImportTemplate } from '../wallets-csv';
import { SubscriptionService } from '../../../services/subscription.service';
import { NotificationsService } from '../../../services/notifications.service';
import { PlanLimitBannerComponent } from '../../../components/plan-limit-banner/plan-limit-banner.component';

@Component({
  selector: 'app-portfolios',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, CdkMenuTrigger, CdkMenu, CdkMenuItem, PlanLimitBannerComponent],
  templateUrl: './portfolios.component.html',
  styleUrl: './portfolios.component.css'
})
export class PortfoliosComponent implements OnInit {

  // Servicios
  private router = inject(Router);
  private portfolioService = inject(PortfolioService);
  private investmentService = inject(InvestmentService);
  private prefs = inject(PreferencesService);
  subscriptionService = inject(SubscriptionService);
  notifications = inject(NotificationsService)

  // Referencias del HTML
  csvFileInput = viewChild<ElementRef<HTMLInputElement>>('csvFileInput');

  // Estado general
  isLoading = signal(true);
  isSubmitting = signal(false);
  emptyHover = signal(false);
  skeletonItems = Array(6);

  myPortfolios = signal<Portfolio[]>([]);
  selectedPortfolio = signal<Portfolio | null>(null);

  sortedPortfolios = computed(() => {
    return [...this.myPortfolios()].sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.id - b.id;
    });
  });

  // Modal crear / editar
  isModalOpen = signal(false);
  formMode = signal<'create' | 'edit'>('create');

  portfolioForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(15)]),
    is_default: new FormControl(false),
    is_public: new FormControl(false)
  });

  portfolioIsPublic = toSignal(
    this.portfolioForm.get('is_public')!.valueChanges,
    { initialValue: false }
  );

  portfolioIsDefault = toSignal(
    this.portfolioForm.get('is_default')!.valueChanges,
    { initialValue: false }
  );

  // Modal eliminar
  isDeleteModalOpen = signal(false);

  // Modal importar CSV
  importModalOpen = signal(false);
  importSubmitting = signal(false);
  importTarget = signal<'existing' | 'new'>('existing');
  importRows = signal<ImportPositionRow[]>([]);
  importParseError = signal<string | null>(null);
  importFileName = signal<string | null>(null);

  importNewPortfolio = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(15)]),
    is_default: new FormControl(false),
    is_public: new FormControl(false)
  });

  importPortfolioId = new FormControl<number | null>(null, [Validators.required]);

  // Lifecycle
  ngOnInit() {
    this.loadPortfolios();
  }

  // CARTERAS

  loadPortfolios() {
    this.isLoading.set(true);

    this.portfolioService.getPortfolios()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.myPortfolios.set(data as Portfolio[]);
        },
        error: (err) => {
          console.error('Error loading portfolios', err);
        }
      });
  }

  savePortfolio() {
    if (this.portfolioForm.invalid) return;

    const selected = this.selectedPortfolio();

    const data = {
      name: this.portfolioForm.value.name ?? '',
      is_default: !!this.portfolioForm.value.is_default,
      is_public: !!this.portfolioForm.value.is_public
    };

    this.isSubmitting.set(true);

    if (this.formMode() === 'create') {
      this.portfolioService.createPortfolio(data)
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: () => {
            this.closeModal();
            this.loadPortfolios();
            this.notifications.success('Cartera creada.');
            this.subscriptionService.loadPlanLimits();
          },
          error: (err) => {
            console.error('Error saving portfolio:', err);
          }
        });

      return;
    }

    if (!selected) {
      this.isSubmitting.set(false);
      return;
    }

    this.portfolioService.updatePortfolio(selected.id, data)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadPortfolios();
        },
        error: (err) => {
          console.error('Error saving portfolio:', err);
        }
      });
  }

  deletePortfolio() {
    const selected = this.selectedPortfolio();
    if (!selected) return;

    this.isSubmitting.set(true);

    this.portfolioService.deletePortfolio(selected.id)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadPortfolios();
          this.notifications.info('Cartera eliminada.');
          this.subscriptionService.loadPlanLimits();
        },
        error: (err) => {
          console.error('Error deleting portfolio:', err);
        }
      });
  }

  goToPortfolio(portfolioId: number) {
    this.router.navigate(['/app/wallets', portfolioId], {
      state: { returnUrl: this.router.url }
    });
  }

  getGridClass(): string {
    const total = this.sortedPortfolios().length;

    if (total === 1) {
      return 'grid-cols-1';
    }

    if (total === 2) {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
    }

    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  }

  format(value: number) {
    return this.prefs.formatCurrency(value);
  }

  // MODAL CREAR / EDITAR

  openCreateModal() {
    // verificar límite antes de abrir el modal
    if (!this.subscriptionService.canCreate('portfolios')) {
      this.notifications.warning(
        'Has alcanzado el límite de carteras. Mejora al Plan Premium.'
      );
      return;
    }

    this.formMode.set('create');
    this.selectedPortfolio.set(null);

    this.portfolioForm.patchValue({
      name: '',
      is_default: false,
      is_public: false
    });

    this.isModalOpen.set(true);
  }

  openEditModal(portfolio: Portfolio) {
    this.formMode.set('edit');
    this.selectedPortfolio.set(portfolio);

    this.portfolioForm.patchValue({
      name: portfolio.name,
      is_default: portfolio.is_default,
      is_public: portfolio.is_public
    });

    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPortfolio.set(null);
  }

  // MODAL ELIMINAR

  openDeleteModal(portfolio: Portfolio) {
    this.selectedPortfolio.set(portfolio);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.selectedPortfolio.set(null);
  }

  // IMPORTAR CSV

  openImportModal() {
    // solo premium
    if (!this.subscriptionService.canUseFeature('import')) {
      this.notifications.warning('La importación CSV requiere el Plan Premium');
      return;
    }

    this.importModalOpen.set(true);
    this.importRows.set([]);
    this.importParseError.set(null);
    this.importFileName.set(null);
    this.importSubmitting.set(false);

    if (this.myPortfolios().length > 0) {
      this.importTarget.set('existing');
      this.importPortfolioId.setValue(this.myPortfolios()[0].id);
    } else {
      this.importTarget.set('new');
      this.importPortfolioId.setValue(null);
    }

    this.importNewPortfolio.reset({
      name: '',
      is_default: false,
      is_public: false
    });
  }

  closeImportModal() {
    this.importModalOpen.set(false);
    this.importSubmitting.set(false);

    const input = this.csvFileInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  triggerCsvSelection() {
    const input = this.csvFileInput()?.nativeElement;
    if (input) {
      input.click();
    }
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.importFileName.set(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parsePositionsCsv(text);

      if (parsed.error) {
        this.importParseError.set(parsed.error);
        this.importRows.set([]);
        return;
      }

      this.importParseError.set(null);
      this.importRows.set(parsed.rows);
    };

    reader.readAsText(file, 'UTF-8');
  }

  downloadTemplate() {
    downloadImportTemplate();
  }

  executeImport() {
    const rows = this.importRows();

    if (rows.length === 0) return;
    if (this.importParseError()) return;

    const positions = rows.map((row) => {
      return {
        symbol: row.symbol,
        asset_type: row.asset_type,
        quantity: row.quantity,
        avg_buy_price: row.avg_buy_price
      };
    });

    this.importSubmitting.set(true);

    if (this.importTarget() === 'new') {
      if (this.importNewPortfolio.invalid) {
        this.importSubmitting.set(false);
        return;
      }

      const values = this.importNewPortfolio.getRawValue();

      this.portfolioService.createPortfolio({
        name: values.name ?? '',
        is_default: !!values.is_default,
        is_public: !!values.is_public
      })
      .pipe(
        switchMap((response: any) => {
          return this.investmentService.importPositions(response.portfolio.id, positions);
        }),
        finalize(() => this.importSubmitting.set(false))
      )
      .subscribe({
        next: () => {
          this.closeImportModal();
          this.loadPortfolios();
        },
        error: (err) => {
          console.error('Import error:', err);
        }
      });

      return;
    }

    const portfolioId = this.importPortfolioId.value;

    if (portfolioId == null) {
      this.importSubmitting.set(false);
      return;
    }

    this.investmentService.importPositions(portfolioId, positions)
      .pipe(finalize(() => this.importSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.closeImportModal();
          this.loadPortfolios();
        },
        error: (err) => {
          console.error('Import error:', err);
        }
      });
  }

}