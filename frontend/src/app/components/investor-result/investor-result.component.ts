import {
  Component, Input, Output, EventEmitter,
  OnInit, inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexChart, ApexNonAxisChartSeries, ApexPlotOptions,
  ApexDataLabels, ApexLegend, ApexTooltip, ApexAxisChartSeries,
  ApexXAxis, ApexYAxis, ApexStroke, ApexFill, ApexGrid
} from 'ng-apexcharts';
import { ProfileResult } from '../../services/investor-profile.service';
import { PreferencesService } from '../../services/preferences.service';

interface RadialOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  colors: string[];
  labels: string[];
  legend: ApexLegend;
  tooltip: ApexTooltip;
}

interface BarOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  colors: string[];
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  fill: ApexFill;
  grid: ApexGrid;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
}

@Component({
  selector: 'app-investor-result',
  imports: [NgApexchartsModule, RouterLink, NgClass],
  templateUrl: './investor-result.component.html',
  styleUrl: './investor-result.component.css'
})
export class InvestorResultComponent implements OnInit {

  @Input() result!: ProfileResult;
  @Output() retake = new EventEmitter<void>();

  private platformId      = inject(PLATFORM_ID);
  preferencesService      = inject(PreferencesService);
  isBrowser               = false;

  readonly profileConfig: Record<string, {
    bgClass: string;
    textClass: string;
    borderClass: string;
    tagline: string;
  }> = {
    conservador: {
      bgClass:     'bg-emerald-500/10',
      textClass:   'text-emerald-500',
      borderClass: 'border-emerald-500/30',
      tagline:     'Seguridad ante todo',
    },
    moderado: {
      bgClass:     'bg-blue-600/10 dark:bg-blue-500/10',
      textClass:   'text-blue-600 dark:text-blue-400',
      borderClass: 'border-blue-500/30',
      tagline:     'Equilibrio entre riesgo y rentabilidad',
    },
    agresivo: {
      bgClass:     'bg-red-500/10',
      textClass:   'text-red-500',
      borderClass: 'border-red-500/30',
      tagline:     'Máximo crecimiento, alto riesgo',
    }
  };

  get config() { return this.profileConfig[this.result.profile]; }

  get chartColor(): string {
    return this.preferencesService.colorHex();
  }

  get scorePercent(): number {
    return Math.round((this.result.score / this.result.max_score) * 100);
  }

  get confidencePercent(): number {
    return this.result.ml_confidence
      ? Math.round(this.result.ml_confidence * 100)
      : 0;
  }

  readonly questionLabels = [
    'Edad', 'Ingresos', 'Experiencia', 'Reacción',
    'Objetivo', 'Horizonte', 'Ahorro', 'Instrumentos', 'Estilo'
  ];

  radialOptions!: RadialOptions;
  barOptions!: BarOptions;

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.buildRadialChart();
      this.buildBarChart();
    }
  }

  private isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  private buildRadialChart(): void {
    const dark  = this.isDark();
    const color = this.chartColor;

    this.radialOptions = {
      series: [this.scorePercent],
      chart: {
        type: 'radialBar',
        height: 260,
        background: 'transparent',
        toolbar: { show: false },
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: { size: '62%' },
          track: {
            background: dark ? '#262626' : '#e4e4e7',
            strokeWidth: '100%',
          },
          dataLabels: {
            name: {
              offsetY: -10,
              fontSize: '13px',
              color: dark ? '#a3a3a3' : '#71717a',
              fontFamily: 'IBM Plex Sans, sans-serif',
            },
            value: {
              offsetY: 10,
              fontSize: '32px',
              fontWeight: 700,
              color: color,
              fontFamily: 'IBM Plex Sans, sans-serif',
              formatter: (val: number): string => `${Math.round(val)}%`,
            },
          },
        },
      },
      dataLabels: { enabled: false },
      colors: [color],
      labels: ['Puntuación'],
      legend: { show: false },
      tooltip: { enabled: false },
    };
  }

  private buildBarChart(): void {
    const dark  = this.isDark();
    const color = this.chartColor;

    this.barOptions = {
      series: [{ name: 'Tu respuesta', data: this.result.answers ?? [] }],
      chart: {
        type: 'bar',
        height: 220,
        background: 'transparent',
        toolbar: { show: false },
      },
      colors: [color],
      plotOptions: {
        bar: { borderRadius: 5, columnWidth: '55%' }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: this.questionLabels,
        labels: {
          style: {
            fontSize: '11px',
            colors: dark ? '#a3a3a3' : '#71717a',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        max: 3,
        tickAmount: 3,
        labels: {
          style: {
            fontSize: '11px',
            colors: dark ? '#a3a3a3' : '#71717a',
            fontFamily: 'IBM Plex Sans, sans-serif',
          },
          formatter: (val: number): string =>
            (['Bajo', 'Medio-bajo', 'Medio-alto', 'Alto'])[Math.round(val)] ?? ''
        }
      },
      stroke: { show: true, width: 0 },
      fill: { opacity: 0.85 },
      grid: {
        borderColor: dark ? '#262626' : '#e4e4e7',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      tooltip: {
        theme: dark ? 'dark' : 'light',
        y: {
          formatter: (val: number): string =>
            (['Bajo', 'Medio-bajo', 'Medio-alto', 'Alto'])[Math.round(val)] ?? String(val)
        }
      },
    };
  }
}