import { Component } from '@angular/core';
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
export class RegisterComponent {
  // Form fields
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  fullName: string = '';
  phone: string = '';
  
  step: 'register' | 'otp' = 'register';
  otp: string = '';
  loading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  sendOTP(): void {
    if (!this.username.trim()) {
      this.showMessage('Please enter a username', 'error');
      return;
    }
    if (!this.email || !this.validateEmail(this.email)) {
      this.showMessage('Please enter a valid email address', 'error');
      return;
    }
    if (!this.fullName.trim()) {
      this.showMessage('Please enter your full name', 'error');
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.showMessage('Password must be at least 6 characters', 'error');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.showMessage('Passwords do not match', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    this.authService.requestOTP(this.email).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.step = 'otp';
          this.showMessage('OTP sent to your email. Please verify.', 'success');
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

  verifyAndRegister(): void {
    if (!this.otp || this.otp.length < 6) {
      this.showMessage('Please enter the OTP', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    // First verify OTP, then create user with password
    this.authService.verifyOTP(this.email, this.otp).subscribe({
      next: (response) => {
        if (response.success) {
          // OTP verified, now set password
          this.authService.setPassword(this.email, this.username, this.password, this.fullName, this.phone).subscribe({
            next: (res) => {
              this.loading = false;
              if (res.success) {
                this.showMessage('Registration successful! Redirecting...', 'success');
                localStorage.setItem('user_role', 'user');
                setTimeout(() => {
                  this.router.navigate(['/home']);
                }, 1000);
              } else {
                this.showMessage(res.message || 'Failed to set password', 'error');
              }
            },
            error: (err) => {
              this.loading = false;
              this.showMessage(err.error?.message || 'Failed to set password', 'error');
            }
          });
        } else {
          this.loading = false;
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
