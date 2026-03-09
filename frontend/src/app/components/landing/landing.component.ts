import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  applications = [
    {
      id: 'tuneer',
      name: 'Email Extractor Application by Tuneer Mahatpure',
      description: 'Professional email extraction and processing solution',
      color: '#667eea',
      icon: '📧'
    },
    {
      id: 'gajendra',
      name: 'Email Extractor Application by Gajendra',
      description: 'Advanced email extraction tools and analytics',
      color: '#28a745',
      icon: '📨'
    },
    {
      id: 'madhu',
      name: 'Email Extractor by Madhu Parmar',
      description: 'Comprehensive email management system',
      color: '#dc3545',
      icon: '📩'
    }
  ];

  trackByAppId(index: number, app: any): string {
    return app.id;
  }

  selectApplication(appId: string): void {
    // Navigate to the respective application login
    switch(appId) {
      case 'tuneer':
        window.location.href = '/login?tuneer';
        break;
      case 'gajendra':
        window.location.href = '/login?gajendra';
        break;
      case 'madhu':
        window.location.href = '/login?madhu';
        break;
      default:
        window.location.href = '/login';
    }
  }
}