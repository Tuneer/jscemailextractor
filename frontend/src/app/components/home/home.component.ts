import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  userEmail: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.userEmail = this.authService.getUserEmail() || '';
  }

  navigateToFormattedExcel(): void {
    this.router.navigate(['/formatted-excel']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
