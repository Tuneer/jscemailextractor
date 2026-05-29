import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmailService } from '../../services/email.service';
import { MerchantService } from '../../services/merchant.service';
import { EmailWithAttachments } from '../../models/email.model';
import { MerchantData } from '../../models/merchant.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  emailCount = 0;
  attachmentCount = 0;
  currentMerchant: MerchantData | null = null;
  recentEmails: EmailWithAttachments[] = [];
  loading = false;

  quickActions = [
    { 
      label: 'View Emails', 
      path: '/emails', 
      icon: 'bi-envelope-open',
      description: 'Browse synced emails and attachments',
      color: 'primary'
    },
    { 
      label: 'Upload Merchant Data', 
      path: '/merchant-upload', 
      icon: 'bi-shop',
      description: 'Upload items and sales Excel files',
      color: 'success'
    },
    { 
      label: 'Run Comparison', 
      path: '/comparison', 
      icon: 'bi-shuffle',
      description: 'Compare items with coupon attachments',
      color: 'warning'
    },
    { 
      label: 'View Results', 
      path: '/results', 
      icon: 'bi-clipboard-data',
      description: 'See comparison results and export',
      color: 'info'
    }
  ];

  constructor(
    private emailService: EmailService,
    private merchantService: MerchantService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    this.emailService.getEmailsWithAttachments().subscribe({
      next: (response) => {
        if (response.success) {
          this.recentEmails = response.emails.slice(0, 5);
          this.emailCount = response.emails.length;
          this.attachmentCount = response.emails.reduce((count, email) => 
            count + (email.attachments?.length || 0), 0
          );
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    this.currentMerchant = this.merchantService.getCurrentMerchant();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
