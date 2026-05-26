import { NgClass } from '@angular/common';
import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';

import { PlanLimitBannerComponent } from '../../../components/plan-limit-banner/plan-limit-banner.component';
import { Portfolio } from '../../../models/portfolio.model';
import { InvestmentService } from '../../../services/investment.service';
import { NotificationsService } from '../../../services/notifications.service';
import { PortfolioService } from '../../../services/portfolio.service';
import { PreferencesService } from '../../../services/preferences.service';
import { SubscriptionService } from '../../../services/subscription.service';
import { ImportPositionRow, downloadImportTemplate, parsePositionsCsv } from '../wallets-csv';

@Component({
  selector: 'app-portfolios',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, CdkMenuTrigger, CdkMenu, CdkMenuItem, PlanLimitBannerComponent],
  templateUrl: './portfolios.component.html',
  styleUrl: './portfolios.component.css',
})
export class PortfoliosComponent implements OnInit {
  private router = inject(Router);
  private portfolioService = inject(PortfolioService);
  private investmentService = inject(InvestmentService);
  private prefs = inject(PreferencesService);

  subscriptionService = inject(SubscriptionService);
  notifications = inject(NotificationsService);

  // Referencia al input oculto de csv
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
      if (a.is_default && !b.is_default) {
        return -1;
      }

      if (!a.is_default && b.is_default) {
        return 1;
      }

      return a.id - b.id;
    });
  });

  // Modal crear / editar
  isModalOpen = signal(false);
  formMode = signal<'create' | 'edit'>('create');

  portfolioForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(15)]),
    is_default: new FormControl(false),
    is_public: new FormControl(false),
  });

  portfolioIsPublic = toSignal(this.portfolioForm.get('is_public')!.valueChanges, {
    initialValue: false,
  });

  portfolioIsDefault = toSignal(this.portfolioForm.get('is_default')!.valueChanges, {
    initialValue: false,
  });

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
    is_public: new FormControl(false),
  });

  importPortfolioId = new FormControl<number | null>(null, [Validators.required]);

  ngOnInit(): void {
    this.loadPortfolios();
  }

  loadPortfolios(): void {
    this.isLoading.set(true);

    this.portfolioService
      .getPortfolios()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.myPortfolios.set(data as Portfolio[]);
        },
        error: (err) => {
          console.error('Error loading portfolios', err);
        },
      });
  }

  savePortfolio(): void {
    if (this.portfolioForm.invalid) {
      return;
    }

    const selected = this.selectedPortfolio();
    const values = this.portfolioForm.getRawValue();

    const data = {
      name: values.name ?? '',
      is_default: !!values.is_default,
      is_public: !!values.is_public,
    };

    this.isSubmitting.set(true);

    if (this.formMode() === 'create') {
      this.portfolioService
        .createPortfolio(data)
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
          },
        });

      return;
    }

    if (!selected) {
      this.isSubmitting.set(false);
      return;
    }

    this.portfolioService
      .updatePortfolio(selected.id, data)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadPortfolios();
        },
        error: (err) => {
          console.error('Error saving portfolio:', err);
        },
      });
  }

  deletePortfolio(): void {
    const selected = this.selectedPortfolio();

    if (!selected) {
      return;
    }

    this.isSubmitting.set(true);

    this.portfolioService
      .deletePortfolio(selected.id)
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
        },
      });
  }

  goToPortfolio(portfolioId: number): void {
    this.router.navigate(['/app/wallets', portfolioId], {
      state: { returnUrl: this.router.url },
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

  format(value: number): string {
    return this.prefs.formatCurrency(value);
  }

  // Modal crear / editar
  openCreateModal(): void {
    // Validamos el limite antes de abrir el modal
    if (!this.subscriptionService.canCreate('portfolios')) {
      this.notifications.warning('Has alcanzado el límite de carteras. Mejora al Plan Premium.');
      return;
    }

    this.formMode.set('create');
    this.selectedPortfolio.set(null);

    this.portfolioForm.patchValue({
      name: '',
      is_default: false,
      is_public: false,
    });

    this.isModalOpen.set(true);
  }

  openEditModal(portfolio: Portfolio): void {
    this.formMode.set('edit');
    this.selectedPortfolio.set(portfolio);

    this.portfolioForm.patchValue({
      name: portfolio.name,
      is_default: portfolio.is_default,
      is_public: portfolio.is_public,
    });

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedPortfolio.set(null);
  }

  // Modal eliminar
  openDeleteModal(portfolio: Portfolio): void {
    this.selectedPortfolio.set(portfolio);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.selectedPortfolio.set(null);
  }

  // Importar CSV
  openImportModal(): void {
    // Solo premium
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
      is_public: false,
    });
  }

  closeImportModal(): void {
    this.importModalOpen.set(false);
    this.importSubmitting.set(false);

    const input = this.csvFileInput()?.nativeElement;

    if (input) {
      input.value = '';
    }
  }

  triggerCsvSelection(): void {
    const input = this.csvFileInput()?.nativeElement;

    if (input) {
      input.click();
    }
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

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

  downloadTemplate(): void {
    downloadImportTemplate();
  }

  executeImport(): void {
    const rows = this.importRows();

    if (rows.length === 0 || this.importParseError()) {
      return;
    }

    const positions = rows.map((row) => ({
      symbol: row.symbol,
      asset_type: row.asset_type,
      quantity: row.quantity,
      avg_buy_price: row.avg_buy_price,
    }));

    this.importSubmitting.set(true);

    if (this.importTarget() === 'new') {
      if (this.importNewPortfolio.invalid) {
        this.importSubmitting.set(false);
        return;
      }

      const values = this.importNewPortfolio.getRawValue();

      this.portfolioService
        .createPortfolio({
          name: values.name ?? '',
          is_default: !!values.is_default,
          is_public: !!values.is_public,
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
          },
        });

      return;
    }

    const portfolioId = this.importPortfolioId.value;

    if (portfolioId == null) {
      this.importSubmitting.set(false);
      return;
    }

    this.investmentService
      .importPositions(portfolioId, positions)
      .pipe(finalize(() => this.importSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.closeImportModal();
          this.loadPortfolios();
        },
        error: (err) => {
          console.error('Import error:', err);
        },
      });
  }
}