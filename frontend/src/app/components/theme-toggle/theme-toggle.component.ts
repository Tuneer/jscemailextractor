import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeConfig } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.css']
})
export class ThemeToggleComponent implements OnInit {
  themes: ThemeConfig[] = [];
  currentTheme: string = 'orange';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themes = this.themeService.getThemes();
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  /**
   * Switch to a different theme
   */
  switchTheme(themeName: string): void {
    this.themeService.applyTheme(themeName);
  }

  /**
   * Get theme icon based on theme name
   */
  getThemeIcon(themeName: string): string {
    const icons: Record<string, string> = {
      orange: '🍊',
      purple: '🟣',
      blue: '🔵',
      green: '🟢',
      red: '🔴'
    };
    return icons[themeName] || '🎨';
  }

  /**
   * Check if theme is currently active
   */
  isActive(themeName: string): boolean {
    return this.currentTheme === themeName;
  }
}
