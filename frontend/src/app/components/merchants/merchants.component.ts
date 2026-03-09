import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService, Merchant } from '../../services/user.service';

@Component({
  selector: 'app-merchants',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './merchants.component.html',
  styleUrls: ['./merchants.component.css']
})
export class MerchantsComponent implements OnInit {
  verticalId: number = 0;
  verticalName: string = '';
  merchants: Merchant[] = [];
  loading: boolean = false;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.verticalId = parseInt(params['id']);
      this.verticalName = history.state.verticalName || 'Business Category';
      this.loadMerchants();
    });
  }

  loadMerchants(): void {
    this.loading = true;
    this.error = '';
    
    this.userService.getMerchantsByVertical(this.verticalId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.merchants = response.data;
        } else {
          this.error = response.message || 'Failed to load merchants';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Failed to load merchants';
      }
    });
  }

  selectMerchant(merchant: Merchant): void {
    this.router.navigate(['/applications', merchant.id], {
      state: { 
        merchantName: merchant.business_name,
        verticalName: this.verticalName
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  refreshData(): void {
    this.loadMerchants();
  }
}