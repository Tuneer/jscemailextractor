import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService, BusinessVertical } from '../../services/user.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  user: any;
  businessVerticals: BusinessVertical[] = [];
  loading: boolean = false;
  error: string = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.user = {
      email: this.authService.getUserEmail()
    };
    this.loadBusinessVerticals();
  }

  loadBusinessVerticals(): void {
    this.loading = true;
    this.error = '';
    
    this.userService.getBusinessVerticals().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.businessVerticals = response.data.filter((v: BusinessVertical) => v.is_active);
        } else {
          this.error = response.message || 'Failed to load business verticals';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Failed to load business verticals';
      }
    });
  }

  selectVertical(vertical: BusinessVertical): void {
    this.router.navigate(['/merchants', vertical.id], {
      state: { verticalName: vertical.name }
    });
  }

  getVerticalIcon(verticalName: string): string {
    const icons: { [key: string]: string } = {
      'Salon': '💇',
      'Restaurant': '🍽️',
      'Grocery': '🛒',
      'Liquor': '🍷',
      'Boutique': '👗'
    };
    
    return icons[verticalName] || '🏢';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  refreshData(): void {
    this.loadBusinessVerticals();
  }
}