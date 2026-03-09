import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  username: string = '';
  password: string = '';
  loading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  login(): void {
    if (!this.username || !this.password) {
      this.showMessage('Please enter both username and password', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    this.adminService.login(this.username, this.password).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.showMessage('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            this.router.navigate(['/admin/dashboard']);
          }, 1000);
        } else {
          this.showMessage(response.message || 'Login failed', 'error');
        }
      },
      error: (error) => {
        this.loading = false;
        this.showMessage(error.error?.message || 'Login failed. Please try again.', 'error');
      }
    });
  }

  private showMessage(text: string, type: 'success' | 'error' | 'info'): void {
    this.message = text;
    this.messageType = type;
  }
}