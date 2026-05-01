import { Component, inject } from '@angular/core';
import { InvestorProfileService } from '../../services/investor-profile.service';

@Component({
  selector: 'app-investor-profile',
  imports: [],
  templateUrl: './investor-profile.component.html',
  styleUrl: './investor-profile.component.css'
})
export class InvestorProfileComponent {
  service = inject(InvestorProfileService)
}
