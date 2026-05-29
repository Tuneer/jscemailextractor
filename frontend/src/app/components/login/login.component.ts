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
  password: string = '';
  otp: string = '';
  step: 'email' | 'auth' = 'email';
  loginMode: 'otp' | 'password' = 'otp';
  loading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  isNewUser: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  continueWithEmail(): void {
    if (!this.email || !this.validateEmail(this.email)) {
      this.showMessage('Please enter a valid email address', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    // Check if user exists
    this.authService.checkEmail(this.email).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.isNewUser = !response.user_exists;
          this.step = 'auth';
          
          // Default to OTP mode for new users, password for existing
          this.loginMode = response.user_exists ? 'password' : 'otp';
          
          if (response.user_exists) {
            this.showMessage('Welcome back! Please choose your login method.', 'info');
          } else {
            this.showMessage('New user? Register with OTP to get started.', 'info');
          }
        }
      },
      error: (error) => {
        this.loading = false;
        this.step = 'auth';
        this.loginMode = 'otp';
      }
    });
  }

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
          this.showMessage('OTP sent to your email. Please check your inbox.', 'success');
          // Log dev OTP only in console (not visible in UI)
          if (response.dev_otp) {
            console.log('Dev OTP:', response.dev_otp);
          }
        } else {
          this.showMessage(response.message || 'Failed to send OTP', 'error');
        }
      },
      error: (error) => {
        this.loading = false;
        this.showMessage(error.error?.message || 'Failed to send OTP.', 'error');
      }
    });
  }

  loginWithPassword(): void {
    if (!this.password || this.password.length < 6) {
      this.showMessage('Please enter a valid password (min 6 characters)', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    this.authService.loginWithPassword(this.email, this.password).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.showMessage('Login successful! Redirecting...', 'success');
          
          if (response.user?.role) {
            localStorage.setItem('user_role', response.user.role);
          }
          
          setTimeout(() => {
            if (response.is_admin || response.user?.role === 'super_admin') {
              this.router.navigate(['/admin/dashboard']);
            } else {
              this.router.navigate(['/home']);
            }
          }, 1000);
        } else {
          this.showMessage(response.message || 'Invalid credentials', 'error');
        }
      },
      error: (error) => {
        this.loading = false;
        this.showMessage(error.error?.message || 'Invalid email or password.', 'error');
      }
    });
  }

  verifyOTP(): void {
    if (!this.otp || this.otp.length < 6) {
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
          
          if (response.user?.role) {
            localStorage.setItem('user_role', response.user.role);
          }
          
          setTimeout(() => {
            if (response.is_admin || response.user?.role === 'super_admin') {
              this.router.navigate(['/admin/dashboard']);
            } else {
              this.router.navigate(['/home']);
            }
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
    this.password = '';
    this.message = '';
    this.isNewUser = false;
  }

  toggleLoginMode(): void {
    this.loginMode = this.loginMode === 'otp' ? 'password' : 'otp';
    this.message = '';
    this.otp = '';
    this.password = '';
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
