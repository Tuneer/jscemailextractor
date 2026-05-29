import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService, EmailWithAttachment } from '../../services/data.service';

@Component({
  selector: 'app-synced-emails',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './synced-emails.html',
  styleUrl: './synced-emails.css',
})
export class SyncedEmails implements OnInit {
  emails: EmailWithAttachment[] = [];
  cronHistory: any[] = [];
  stats: any = null;
  loading: boolean = true;
  error: string = '';

  // Date filter properties
  filterMode: 'single' | 'range' = 'single';
  selectedDate: string = '';
  startDate: string = '';
  endDate: string = '';
  showFilters: boolean = false;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // Set default to today's date
    this.selectedDate = this.getTodayDate();
    this.loadSyncedEmails();
    this.loadCronHistory();
    this.loadStats();
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  loadSyncedEmails(): void {
    this.loading = true;
    this.error = '';
    
    let date: string | undefined;
    let startDt: string | undefined;
    let endDt: string | undefined;

    if (this.filterMode === 'single' && this.selectedDate) {
      date = this.selectedDate;
    } else if (this.filterMode === 'range') {
      if (this.startDate) startDt = this.startDate;
      if (this.endDate) endDt = this.endDate;
    }

    this.dataService.getSyncedEmails(date, startDt, endDt).subscribe({
      next: (response) => {
        if (response.success) {
          this.emails = response.emails;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load synced emails';
        this.loading = false;
        console.error('Error loading synced emails:', err);
      }
    });
  }

  applyFilter(): void {
    this.loadSyncedEmails();
  }

  resetFilter(): void {
    this.filterMode = 'single';
    this.selectedDate = this.getTodayDate();
    this.startDate = '';
    this.endDate = '';
    this.loadSyncedEmails();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onFilterModeChange(): void {
    // Reset values when switching modes
    if (this.filterMode === 'single') {
      this.startDate = '';
      this.endDate = '';
      this.selectedDate = this.getTodayDate();
    } else {
      this.selectedDate = '';
      const today = this.getTodayDate();
      this.startDate = today;
      this.endDate = today;
    }
  }

  loadCronHistory(): void {
    this.dataService.getCronHistory(10).subscribe({
      next: (response) => {
        if (response.success) {
          this.cronHistory = response.history;
        }
      },
      error: (err) => {
        console.error('Error loading cron history:', err);
      }
    });
  }

  loadStats(): void {
    this.dataService.getAutomationStatus().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.stats;
        }
      },
      error: (err) => {
        console.error('Error loading stats:', err);
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(contentType: string, filename: string): string {
    if (contentType?.includes('excel') || filename?.match(/\.xlsx?$/i)) {
      return '📊';
    } else if (contentType?.includes('csv') || filename?.endsWith('.csv')) {
      return '📄';
    } else if (contentType?.includes('pdf')) {
      return '📕';
    }
    return '📎';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status-success';
      case 'failed': return 'status-error';
      case 'running': return 'status-running';
      default: return '';
    }
  }
}
