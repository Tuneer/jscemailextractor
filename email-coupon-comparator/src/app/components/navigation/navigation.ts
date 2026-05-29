import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.css']
})
export class NavigationComponent {
  isMenuOpen = false;

  navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: '/emails', label: 'Emails', icon: 'bi-envelope-open' },
    { path: '/merchant-upload', label: 'Merchant Upload', icon: 'bi-shop' },
    { path: '/comparison', label: 'Comparison', icon: 'bi-shuffle' },
    { path: '/results', label: 'Results', icon: 'bi-clipboard-data' }
  ];

  constructor(private router: Router) {}

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }
}
