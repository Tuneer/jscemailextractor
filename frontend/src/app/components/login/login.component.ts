import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  otp: string = '';
  step: 'email' | 'otp' = 'email';
  loading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  requestOTP(): void {
    if (!this.email || !this.validateEmail(this.email)) {
      this.showMessage('Please enter a valid email address', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

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
            this.router.navigate(['/home']);
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

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private showMessage(text: string, type: 'success' | 'error' | 'info'): void {
    this.message = text;
    this.messageType = type;
  }
}
