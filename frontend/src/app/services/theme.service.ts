import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ThemeConfig {
  name: string;
  label: string;
  primaryColor: string;
  primaryDark: string;
  primaryLight: string;
  gradient: string;
  lightBg: string;
  lighterBg: string;
  lightestBg: string;
  shadowLight: string;
  shadowMedium: string;
  shadowStrong: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Predefined themes
  readonly themes: ThemeConfig[] = [
    {
      name: 'orange',
      label: 'Orange',
      primaryColor: '#ff6b35',
      primaryDark: '#f7931e',
      primaryLight: '#ff8555',
      gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
      lightBg: '#fff5f0',
      lighterBg: '#ffe8d9',
      lightestBg: '#fff9f6',
      shadowLight: 'rgba(255, 107, 53, 0.1)',
      shadowMedium: 'rgba(255, 107, 53, 0.2)',
      shadowStrong: 'rgba(255, 107, 53, 0.4)'
    },
    {
      name: 'purple',
      label: 'Purple',
      primaryColor: '#667eea',
      primaryDark: '#764ba2',
      primaryLight: '#7e8ef5',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      lightBg: '#e8eeff',
      lighterBg: '#f0e8ff',
      lightestBg: '#f8f9ff',
      shadowLight: 'rgba(102, 126, 234, 0.1)',
      shadowMedium: 'rgba(102, 126, 234, 0.2)',
      shadowStrong: 'rgba(102, 126, 234, 0.4)'
    },
    {
      name: 'blue',
      label: 'Blue',
      primaryColor: '#0066cc',
      primaryDark: '#0052a3',
      primaryLight: '#3385d6',
      gradient: 'linear-gradient(135deg, #0066cc 0%, #0052a3 100%)',
      lightBg: '#e6f2ff',
      lighterBg: '#cce5ff',
      lightestBg: '#f0f8ff',
      shadowLight: 'rgba(0, 102, 204, 0.1)',
      shadowMedium: 'rgba(0, 102, 204, 0.2)',
      shadowStrong: 'rgba(0, 102, 204, 0.4)'
    },
    {
      name: 'green',
      label: 'Green',
      primaryColor: '#28a745',
      primaryDark: '#1e7e34',
      primaryLight: '#48c464',
      gradient: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
      lightBg: '#e8f5e9',
      lighterBg: '#c8e6c9',
      lightestBg: '#f1f8f4',
      shadowLight: 'rgba(40, 167, 69, 0.1)',
      shadowMedium: 'rgba(40, 167, 69, 0.2)',
      shadowStrong: 'rgba(40, 167, 69, 0.4)'
    },
    {
      name: 'red',
      label: 'Red',
      primaryColor: '#dc3545',
      primaryDark: '#c82333',
      primaryLight: '#e4606d',
      gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
      lightBg: '#ffe6e6',
      lighterBg: '#ffcccc',
      lightestBg: '#fff5f5',
      shadowLight: 'rgba(220, 53, 69, 0.1)',
      shadowMedium: 'rgba(220, 53, 69, 0.2)',
      shadowStrong: 'rgba(220, 53, 69, 0.4)'
    }
  ];

  // Current theme subject
  private currentThemeSubject = new BehaviorSubject<string>('orange');
  public currentTheme$ = this.currentThemeSubject.asObservable();

  constructor() {
    // Load saved theme from localStorage on init
    this.loadSavedTheme();
  }

  /**
   * Apply theme by setting CSS variables
   */
  applyTheme(themeName: string): void {
    const theme = this.themes.find(t => t.name === themeName);
    if (!theme) {
      console.warn(`Theme '${themeName}' not found`);
      return;
    }

    const root = document.documentElement;
    
    // Set all CSS variables
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--primary-dark', theme.primaryDark);
    root.style.setProperty('--primary-light', theme.primaryLight);
    root.style.setProperty('--primary-gradient', theme.gradient);
    root.style.setProperty('--primary-light-bg', theme.lightBg);
    root.style.setProperty('--primary-lighter-bg', theme.lighterBg);
    root.style.setProperty('--primary-lightest-bg', theme.lightestBg);
    root.style.setProperty('--primary-shadow-light', theme.shadowLight);
    root.style.setProperty('--primary-shadow-medium', theme.shadowMedium);
    root.style.setProperty('--primary-shadow-strong', theme.shadowStrong);

    // Save to localStorage
    localStorage.setItem('app-theme', themeName);
    
    // Update subject
    this.currentThemeSubject.next(themeName);
  }

  /**
   * Get current theme configuration
   */
  getCurrentTheme(): ThemeConfig | undefined {
    const themeName = this.currentThemeSubject.value;
    return this.themes.find(t => t.name === themeName);
  }

  /**
   * Get all available themes
   */
  getThemes(): ThemeConfig[] {
    return this.themes;
  }

  /**
   * Load saved theme from localStorage
   */
  private loadSavedTheme(): void {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme && this.themes.some(t => t.name === savedTheme)) {
      this.applyTheme(savedTheme);
    } else {
      // Default to orange theme
      this.applyTheme('orange');
    }
  }

  /**
   * Reset to default theme
   */
  resetToDefault(): void {
    this.applyTheme('orange');
  }
}
