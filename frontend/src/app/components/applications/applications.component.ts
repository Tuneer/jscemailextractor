import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService, MerchantApplication } from '../../services/user.service';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.css']
})
export class ApplicationsComponent implements OnInit {
  merchantId: number = 0;
  merchantName: string = '';
  verticalName: string = '';
  applications: MerchantApplication[] = [];
  loading: boolean = false;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.merchantId = parseInt(params['id']);
      this.merchantName = history.state.merchantName || 'Merchant';
      this.verticalName = history.state.verticalName || 'Business Category';
      this.loadApplications();
    });
  }

  loadApplications(): void {
    this.loading = true;
    this.error = '';
    
    this.userService.getMerchantApplications(this.merchantId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.applications = response.data;
        } else {
          this.error = response.message || 'Failed to load applications';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Failed to load applications';
      }
    });
  }

  launchApplication(application: MerchantApplication): void {
    // Navigate to the application URL
    if (application.application_url) {
      this.router.navigate([application.application_url]);
    } else {
      this.error = 'Application URL not available';
    }
  }

  goBack(): void {
    this.router.navigate(['/merchants', this.merchantId], {
      state: { verticalName: this.verticalName }
    });
  }

  refreshData(): void {
    this.loadApplications();
  }

  getApplicationIcon(appType: string): string {
    const icons: { [key: string]: string } = {
      'email_extractor': '📧',
      'data_processor': '⚙️',
      'report_generator': '📊',
      'custom': '🔧'
    };
    
    return icons[appType] || '📱';
  }
}