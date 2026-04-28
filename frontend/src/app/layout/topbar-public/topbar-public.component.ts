import { Component, inject, signal, HostListener, ElementRef} from '@angular/core';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import {Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-topbar-public',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger],
  templateUrl: './topbar-public.component.html',
  styleUrl: './topbar-public.component.css'
})
export class TopbarPublicComponent {
  private router = inject(Router);

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
