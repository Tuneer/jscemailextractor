import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService, BusinessVertical } from '../../services/user.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  userEmail: string = '';
  userRole: string = '';
  businessVerticals: BusinessVertical[] = [];
  loadingVerticals: boolean = false;
  showVerticals: boolean = false;
  isAdmin: boolean = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {
    this.userEmail = this.authService.getUserEmail() || '';
    this.userRole = localStorage.getItem('user_role') || '';
    this.isAdmin = ['admin', 'super_admin'].includes(this.userRole);
  }

  ngOnInit(): void {
    this.loadBusinessVerticals();
  }

  loadBusinessVerticals(): void {
    this.loadingVerticals = true;
    this.userService.getBusinessVerticals().subscribe({
      next: (response) => {
        this.loadingVerticals = false;
        if (response.success) {
          this.businessVerticals = response.data.filter((v: BusinessVertical) => v.is_active);
        }
      },
      error: () => {
        this.loadingVerticals = false;
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

  toggleVerticals(): void {
    this.showVerticals = !this.showVerticals;
  }

  // navigateToFormattedExcel(): void {
  //   this.router.navigate(['/formatted-excel']);
  // }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
