import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  email: string = '';
  username: string = '';
  password: string = '';
  otp: string = '';
  step: 'register' | 'otp' = 'register';
  loading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  register(): void {
    if (!this.email || !this.username || !this.password) {
      this.showMessage('Please fill in all required fields', 'error');
      return;
    }

    if (!this.validateEmail(this.email)) {
      this.showMessage('Please enter a valid email address', 'error');
      return;
    }

    if (this.password.length < 6) {
      this.showMessage('Password must be at least 6 characters long', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    // For now, we'll just request an OTP for registration
    // In a real system, you'd have a separate registration endpoint
    this.authService.requestOTP(this.email).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.step = 'otp';
          this.showMessage('Registration OTP sent to your email. Please check your inbox.', 'success');
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

    // Verify the OTP and complete registration
    this.authService.verifyOTP(this.email, this.otp).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.showMessage('Registration successful! Redirecting...', 'success');
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
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

  backToRegister(): void {
    this.step = 'register';
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