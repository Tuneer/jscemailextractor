import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, BusinessVertical, Merchant } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  user: any;
  businessVerticals: BusinessVertical[] = [];
  merchants: Merchant[] = [];
  loading: boolean = false;
  error: string = '';
  
  stats = {
    totalVerticals: 0,
    activeVerticals: 0,
    totalMerchants: 0,
    activeMerchants: 0
  };

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.adminService.isAuthenticated()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    
    this.user = this.adminService.getUserData();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = '';
    
    // Load business verticals
    this.adminService.getBusinessVerticals().subscribe({
      next: (response) => {
        if (response.success) {
          this.businessVerticals = response.data;
          this.stats.totalVerticals = this.businessVerticals.length;
          this.stats.activeVerticals = this.businessVerticals.filter(v => v.is_active).length;
          
          // Load merchants after verticals
          this.loadMerchants();
        } else {
          this.error = response.message || 'Failed to load business verticals';
          this.loading = false;
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load business verticals';
        this.loading = false;
      }
    });
  }

  loadMerchants(): void {
    this.adminService.getMerchants(100, 0).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.merchants = response.data;
          this.stats.totalMerchants = this.merchants.length;
          this.stats.activeMerchants = this.merchants.filter(m => m.is_active).length;
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

  logout(): void {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }

  goToBusinessVerticals(): void {
    this.router.navigate(['/admin/business-verticals']);
  }

  goToMerchants(): void {
    this.router.navigate(['/admin/merchants']);
  }

  refreshData(): void {
    this.loadDashboardData();
  }
}