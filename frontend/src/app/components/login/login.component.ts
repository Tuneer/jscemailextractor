import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email: string = '';
  otp: string = '';
  step: 'email' | 'otp' = 'email';
  loading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  isAdminLogin: boolean = false;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check if this is admin login
    this.route.queryParams.subscribe(params => {
      this.isAdminLogin = params['admin'] === 'true';
    });
  }

  getLoginTitle(): string {
    return this.isAdminLogin ? 'Admin Login' : 'User Login';
  }

  getLoginSubtitle(): string {
    return this.isAdminLogin ? 'Access administrative dashboard' : 'Access your business applications';
  }

  requestOTP(): void {
    if (!this.email || !this.validateEmail(this.email)) {
      this.showMessage('Please enter a valid email address', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    // Fixed admin login - no OTP required
    if (this.isAdminLogin && this.email === 'admin@jscglobalsolutions.info') {
      this.loading = false;
      this.step = 'otp';
      this.showMessage('Admin credentials accepted. Please enter password.', 'success');
      return;
    }

    // Regular user OTP flow
    this.authService.requestOTP(this.email).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.step = 'otp';
          this.showMessage('OTP sent to your email. Please check your inbox.', 'success');
        } else {
          this.showMessage(response.message || 'Failed to send OTP', 'error');
        }
      },
      error: (error) => {
        this.loading = false;
        this.showMessage(error.error?.message || 'Failed to send OTP. Please try again.', 'error');
      }
    });
  }

  verifyOTP(): void {
    if (this.isAdminLogin && this.email === 'admin@jscglobalsolutions.info') {
      // Admin login with fixed password
      if (this.otp === 'admin123') {
        this.adminService.login('admin', 'admin123').subscribe({
          next: (response) => {
            if (response.success) {
              this.showMessage('Admin login successful! Redirecting...', 'success');
              setTimeout(() => {
                this.router.navigate(['/admin/dashboard']);
              }, 1000);
            } else {
              this.showMessage(response.message || 'Invalid admin credentials', 'error');
            }
          },
          error: (error) => {
            this.showMessage(error.error?.message || 'Admin login failed', 'error');
          }
        });
      } else {
        this.showMessage('Invalid admin password', 'error');
      }
      return;
    }

    // Regular user OTP verification
    if (!this.otp || this.otp.length !== 6) {
      this.showMessage('Please enter a valid 6-digit OTP', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    this.authService.verifyOTP(this.email, this.otp).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.showMessage('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1000);
        } else {
          this.showMessage(response.message || 'Invalid OTP', 'error');
        }
      },
      error: (error) => {
        this.loading = false;
        this.showMessage(error.error?.message || 'Invalid OTP. Please try again.', 'error');
      }
    });
  }

  backToEmail(): void {
    this.step = 'email';
    this.otp = '';
    this.message = '';
  }

  switchToAdmin(): void {
    this.router.navigate(['/login'], { queryParams: { admin: 'true' } });
  }

  switchToUser(): void {
    this.router.navigate(['/login']);
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private showMessage(text: string, type: 'success' | 'error' | 'info'): void {
    this.message = text;
    this.messageType = type;
  }
}